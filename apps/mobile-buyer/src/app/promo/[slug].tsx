import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Animated,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Plus,
  Sparkles,
  Clock,
  Flame,
  Tag,
  Share2,
  Check,
  ChevronRight,
  Zap,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';
import { getSafeImageUrl, DEFAULT_BANNER_FALLBACK } from '@/lib/image-utils';

const { width } = Dimensions.get('window');

interface CampaignData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  banner_url?: string;
  theme_color?: string;
  countdown_end?: string;
  status: string;
}

interface CampaignProduct {
  id: string;
  title: string;
  category?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  stock_allocated: number;
  stock_sold: number;
  image_url: string;
  vendor_name?: string;
}

export default function DynamicPromoCampaignScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 32 : 12);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 16 : 10);

  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const { addToCart, totalItems } = useCart();

  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [products, setProducts] = useState<CampaignProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const loadCampaign = async () => {
    if (!slug) return;
    try {
      // 1. Fetch campaign details
      const { data: campaignData, error: campaignError } = await supabase
        .from('promotional_campaigns')
        .select('*')
        .eq('slug', slug)
        .maybeSingle();

      let currentCampaign: CampaignData | null = campaignData;
      let campaignEnded = false;

      if (!currentCampaign || currentCampaign.status === 'ended') {
        campaignEnded = true;
        const formattedTitle = slug
          .replace(/-/g, ' ')
          .replace(/\b\w/g, (c) => c.toUpperCase());

        currentCampaign = {
          id: currentCampaign?.id || `ended-${slug}`,
          slug: slug,
          title: currentCampaign?.title || `Campagne ${formattedTitle}`,
          subtitle: "Cette offre promotionnelle a pris fin. Découvrez nos autres articles du moment ci-dessous !",
          badge_text: 'OFFRE TERMINÉE',
          theme_color: '#475569',
          countdown_end: undefined,
          status: 'ended',
        };
      }

      setCampaign(currentCampaign);

      // 2. Fetch linked campaign products or fallback
      const { data: linkedProducts, error: lpError } = await supabase
        .from('campaign_products')
        .select(`
          discount_percentage,
          special_price,
          stock_allocated,
          stock_sold,
          products (
            id,
            title,
            category,
            price,
            images,
            image_url,
            product_media ( url ),
            shops ( name )
          )
        `)
        .eq('campaign_id', currentCampaign.id)
        .order('position', { ascending: true });

      if (!lpError && linkedProducts && linkedProducts.length > 0) {
        const mapped: CampaignProduct[] = linkedProducts
          .filter((item: any) => item.products)
          .map((item: any) => {
            const p = item.products;
            const original = Number(p.price) || 0;
            const discount = Number(item.discount_percentage) || 20;
            const finalPrice = item.special_price
              ? Number(item.special_price)
              : Math.round(original * (1 - discount / 100));

            const rawImg = p.product_media?.[0]?.url || p.image_url || p.images?.[0];

            return {
              id: p.id,
              title: p.title || 'Article Spécial',
              category: p.category || 'Promo',
              price: finalPrice,
              original_price: original > finalPrice ? original : Math.round(finalPrice * 1.3),
              discount_percentage: discount,
              stock_allocated: Number(item.stock_allocated) || 50,
              stock_sold: Number(item.stock_sold) || 0,
              image_url: getSafeImageUrl(rawImg),
              vendor_name: p.shops?.name,
            };
          });
        setProducts(mapped);
      } else {
        // Fallback: fetch active catalog products
        const { data: generalProducts } = await supabase
          .from('products')
          .select('id, title, category, price, images, image_url, product_media(url), shops(name)')
          .eq('status', 'active')
          .limit(20);

        if (generalProducts && generalProducts.length > 0) {
          const fallbackMapped: CampaignProduct[] = generalProducts.map((p: any, idx: number) => {
            const original = Number(p.price) || 25000;
            const discount = 15 + (idx % 4) * 10;
            const finalPrice = Math.round(original * (1 - discount / 100));
            const rawImg = p.product_media?.[0]?.url || p.image_url || p.images?.[0];

            return {
              id: p.id,
              title: p.title || 'Produit Spécial',
              category: p.category || 'Général',
              price: finalPrice,
              original_price: original,
              discount_percentage: discount,
              stock_allocated: 40,
              stock_sold: 5 + idx,
              image_url: getSafeImageUrl(rawImg),
              vendor_name: p.shops?.name,
            };
          });
          setProducts(fallbackMapped);
        }
      }
    } catch (err) {
      console.error('Erreur chargement campagne dynamique:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadCampaign();
  }, [slug]);

  // Realtime Countdown Engine
  useEffect(() => {
    if (!campaign?.countdown_end) return;

    const interval = setInterval(() => {
      const target = new Date(campaign.countdown_end!).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign?.countdown_end]);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ['all', ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (selectedCategory === 'all') return products;
    return products.filter((p) => p.category === selectedCategory);
  }, [products, selectedCategory]);

  const themeColor = campaign?.theme_color || '#E65100';

  const handleAddToCart = (product: CampaignProduct) => {
    addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        images: [product.image_url],
        shop_id: '',
      } as any,
      1
    );

    setAddedItemNotice(product.id);
    setTimeout(() => {
      setAddedItemNotice(null);
    }, 1800);
  };

  return (
    <SafeAreaView style={[styles.container, { paddingTop: topPadding }]}>
      <StatusBar barStyle="light-content" backgroundColor="#0F172A" />

      {/* Top Navbar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.navIconBtn}
          accessibilityLabel="Retour"
        >
          <ArrowLeft size={22} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.navTitleContainer}>
          <Text style={styles.navTitle} numberOfLines={1}>
            {campaign?.title || 'Campagne Spéciale'}
          </Text>
        </View>

        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={styles.navIconBtn}
          accessibilityLabel="Panier"
        >
          <ShoppingBag size={22} color="#FFFFFF" />
          {totalItems > 0 && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>{totalItems > 99 ? '99+' : totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={[styles.scrollContent, { paddingBottom: bottomPadding + 30 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              loadCampaign();
            }}
            colors={[themeColor]}
          />
        }
      >
        {loading ? (
          /* SKELETON SHIMMER LOADER (Fidèle à Jumia) */
          <View style={styles.skeletonContainer}>
            <View style={styles.skeletonBanner} />
            <View style={styles.skeletonTimer} />
            <View style={styles.skeletonTabs}>
              <View style={styles.skeletonTab} />
              <View style={styles.skeletonTab} />
              <View style={styles.skeletonTab} />
            </View>
            <View style={styles.skeletonGrid}>
              {[1, 2, 3, 4].map((k) => (
                <View key={k} style={styles.skeletonCard}>
                  <View style={styles.skeletonImage} />
                  <View style={styles.skeletonLineShort} />
                  <View style={styles.skeletonLineLong} />
                </View>
              ))}
            </View>
          </View>
        ) : (
          <>
            {/* HERO BANNER SECTION */}
            <View style={[styles.heroCard, { backgroundColor: themeColor }]}>
              {campaign?.banner_url ? (
                <Image
                  source={{ uri: getSafeImageUrl(campaign.banner_url, DEFAULT_BANNER_FALLBACK) }}
                  style={styles.heroImage}
                  resizeMode="cover"
                />
              ) : null}

              <View style={styles.heroOverlay}>
                <View style={styles.heroBadgeRow}>
                  <View style={styles.promoTag}>
                    <Sparkles size={12} color="#FFFFFF" />
                    <Text style={styles.promoTagText}>
                      {campaign?.badge_text || 'OFFRE LIMITÉE'}
                    </Text>
                  </View>
                  <View style={styles.liveIndicator}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>EN DIRECT</Text>
                  </View>
                </View>

                <Text style={styles.heroHeading}>{campaign?.title}</Text>
                {campaign?.subtitle ? (
                  <Text style={styles.heroSub}>{campaign.subtitle}</Text>
                ) : null}
              </View>
            </View>

            {/* COUNTDOWN TIMER BAR */}
            <View style={styles.countdownBar}>
              <View style={styles.countdownHeader}>
                <Clock size={16} color={campaign?.status === 'ended' ? "#64748B" : "#DC2626"} />
                <Text style={[styles.countdownTitle, campaign?.status === 'ended' && { color: "#64748B" }]}>
                  {campaign?.status === 'ended' ? "Statut de l'offre :" : "Temps restant :"}
                </Text>
              </View>
              {campaign?.status === 'ended' ? (
                <View style={[styles.digitBox, { paddingHorizontal: 12, backgroundColor: '#F1F5F9' }]}>
                  <Text style={[styles.digitNumber, { fontSize: 11, color: '#64748B' }]}>Offre Clôturée</Text>
                </View>
              ) : (
                <View style={styles.timerDigitsRow}>
                  {timeLeft.days > 0 && (
                    <>
                      <View style={styles.digitBox}>
                        <Text style={styles.digitNumber}>
                          {String(timeLeft.days).padStart(2, '0')}
                        </Text>
                        <Text style={styles.digitUnit}>j</Text>
                      </View>
                      <Text style={styles.digitSep}>:</Text>
                    </>
                  )}
                  <View style={styles.digitBox}>
                    <Text style={styles.digitNumber}>
                      {String(timeLeft.hours).padStart(2, '0')}
                    </Text>
                    <Text style={styles.digitUnit}>h</Text>
                  </View>
                  <Text style={styles.digitSep}>:</Text>
                  <View style={styles.digitBox}>
                    <Text style={styles.digitNumber}>
                      {String(timeLeft.minutes).padStart(2, '0')}
                    </Text>
                    <Text style={styles.digitUnit}>m</Text>
                  </View>
                  <Text style={styles.digitSep}>:</Text>
                  <View style={styles.digitBoxHighlight}>
                    <Text style={styles.digitNumberHighlight}>
                      {String(timeLeft.seconds).padStart(2, '0')}
                    </Text>
                    <Text style={styles.digitUnitHighlight}>s</Text>
                  </View>
                </View>
              )}
            </View>

            {/* CATEGORY TABS HORIZONTAL SCROLLER */}
            {categories.length > 2 && (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.tabsContainer}
              >
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const label =
                    cat === 'all'
                      ? '✨ Tout voir'
                      : cat.charAt(0).toUpperCase() + cat.slice(1);

                  return (
                    <TouchableOpacity
                      key={cat}
                      style={[
                        styles.categoryTab,
                        isSelected && { backgroundColor: themeColor, borderColor: themeColor },
                      ]}
                      onPress={() => setSelectedCategory(cat)}
                    >
                      <Text
                        style={[
                          styles.categoryTabText,
                          isSelected && { color: '#FFFFFF', fontWeight: '800' },
                        ]}
                      >
                        {label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            )}

            {/* PRODUCTS GRID */}
            <View style={styles.productsHeader}>
              <Text style={styles.productsCountText}>
                {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''} en promotion
              </Text>
            </View>

            {filteredProducts.length === 0 ? (
              <View style={styles.emptyState}>
                <Tag size={40} color="#94A3B8" />
                <Text style={styles.emptyStateTitle}>Aucun article dans cette sélection</Text>
                <Text style={styles.emptyStateSub}>
                  Revenez à "Tout voir" pour découvrir l'ensemble des kits.
                </Text>
              </View>
            ) : (
              <View style={styles.productsGrid}>
                {filteredProducts.map((item) => {
                  const remaining = Math.max(1, item.stock_allocated - item.stock_sold);
                  const progressPct = Math.min(
                    100,
                    Math.round((item.stock_sold / item.stock_allocated) * 100)
                  );
                  const isJustAdded = addedItemNotice === item.id;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      style={styles.productCard}
                      activeOpacity={0.88}
                      onPress={() => router.push(`/product/${item.id}`)}
                    >
                      {/* Image Thumbnail */}
                      <View style={styles.cardImageWrapper}>
                        <Image
                          source={{ uri: item.image_url }}
                          style={styles.cardImage}
                          resizeMode="cover"
                        />
                        {/* Discount Badge */}
                        {item.discount_percentage ? (
                          <View style={styles.discountBadge}>
                            <Text style={styles.discountBadgeText}>
                              -{item.discount_percentage}%
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      {/* Content */}
                      <View style={styles.cardDetails}>
                        <Text style={styles.cardTitle} numberOfLines={2}>
                          {item.title}
                        </Text>

                        {/* Prices */}
                        <View style={styles.priceRow}>
                          <Text style={[styles.mainPrice, { color: themeColor }]}>
                            {Number(item.price).toLocaleString()} GNF
                          </Text>
                          {item.original_price && item.original_price > item.price ? (
                            <Text style={styles.strikePrice}>
                              {Number(item.original_price).toLocaleString()}
                            </Text>
                          ) : null}
                        </View>

                        {/* Stock Progress Bar (Style Jumia) */}
                        <View style={styles.stockProgressContainer}>
                          <View style={styles.stockProgressBarBg}>
                            <View
                              style={[
                                styles.stockProgressBarFill,
                                { width: `${progressPct}%`, backgroundColor: '#F59E0B' },
                              ]}
                            />
                          </View>
                          <Text style={styles.stockText}>
                            {remaining} article{remaining > 1 ? 's' : ''} restant{remaining > 1 ? 's' : ''}
                          </Text>
                        </View>

                        {/* Action Button */}
                        <TouchableOpacity
                          style={[
                            styles.cardActionBtn,
                            isJustAdded ? styles.cardActionBtnSuccess : { backgroundColor: '#0F172A' },
                          ]}
                          onPress={() => handleAddToCart(item)}
                        >
                          {isJustAdded ? (
                            <>
                              <Check size={14} color="#FFFFFF" />
                              <Text style={styles.cardActionText}>Ajouté !</Text>
                            </>
                          ) : (
                            <>
                              <Plus size={14} color="#FFFFFF" />
                              <Text style={styles.cardActionText}>Acheter</Text>
                            </>
                          )}
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  navBar: {
    backgroundColor: '#0F172A',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  navIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  navTitleContainer: {
    flex: 1,
    marginHorizontal: 10,
    alignItems: 'center',
  },
  navTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    borderRadius: 9,
    minWidth: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    paddingHorizontal: 12,
    paddingTop: 12,
  },
  heroCard: {
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 12,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    minHeight: 140,
  },
  heroImage: {
    ...StyleSheet.absoluteFill,
    width: '100%',
    height: '100%',
    opacity: 0.25,
  },
  heroOverlay: {
    padding: 16,
  },
  heroBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  promoTag: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 5,
  },
  promoTagText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22C55E',
  },
  liveText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
  },
  heroHeading: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: '900',
    lineHeight: 26,
  },
  heroSub: {
    color: '#F8FAFC',
    fontSize: 13,
    marginTop: 4,
    opacity: 0.9,
  },
  countdownBar: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  countdownHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  countdownTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  timerDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  digitBox: {
    backgroundColor: '#0F172A',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  digitNumber: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  digitUnit: {
    color: '#94A3B8',
    fontSize: 10,
    fontWeight: '600',
  },
  digitBoxHighlight: {
    backgroundColor: '#DC2626',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 2,
  },
  digitNumberHighlight: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  digitUnitHighlight: {
    color: '#FEE2E2',
    fontSize: 10,
    fontWeight: '600',
  },
  digitSep: {
    fontSize: 14,
    fontWeight: '900',
    color: '#64748B',
  },
  tabsContainer: {
    paddingVertical: 4,
    gap: 8,
    marginBottom: 12,
  },
  categoryTab: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryTabText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569',
  },
  productsHeader: {
    marginBottom: 8,
    paddingHorizontal: 2,
  },
  productsCountText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 32) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 5,
  },
  cardImageWrapper: {
    width: '100%',
    height: 145,
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  cardImage: {
    width: '100%',
    height: '100%',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  cardDetails: {
    padding: 10,
  },
  cardTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1E293B',
    height: 36,
    lineHeight: 18,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginVertical: 4,
  },
  mainPrice: {
    fontSize: 14,
    fontWeight: '800',
  },
  strikePrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  stockProgressContainer: {
    marginVertical: 4,
  },
  stockProgressBarBg: {
    height: 5,
    backgroundColor: '#F1F5F9',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockProgressBarFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockText: {
    fontSize: 10,
    color: '#92400E',
    fontWeight: '600',
    marginTop: 3,
  },
  cardActionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 7,
    borderRadius: 8,
    gap: 4,
    marginTop: 6,
  },
  cardActionBtnSuccess: {
    backgroundColor: '#16A34A',
  },
  cardActionText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
    gap: 8,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  emptyStateSub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    maxWidth: 250,
  },
  /* SKELETON STYLES */
  skeletonContainer: {
    gap: 12,
  },
  skeletonBanner: {
    width: '100%',
    height: 140,
    backgroundColor: '#E2E8F0',
    borderRadius: 16,
  },
  skeletonTimer: {
    width: '100%',
    height: 44,
    backgroundColor: '#E2E8F0',
    borderRadius: 12,
  },
  skeletonTabs: {
    flexDirection: 'row',
    gap: 8,
  },
  skeletonTab: {
    width: 90,
    height: 34,
    backgroundColor: '#E2E8F0',
    borderRadius: 17,
  },
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  skeletonCard: {
    width: (width - 32) / 2,
    height: 240,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    marginBottom: 12,
    padding: 10,
    gap: 8,
  },
  skeletonImage: {
    width: '100%',
    height: 130,
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
  },
  skeletonLineShort: {
    width: '60%',
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
  skeletonLineLong: {
    width: '90%',
    height: 14,
    backgroundColor: '#E2E8F0',
    borderRadius: 4,
  },
});
