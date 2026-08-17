import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  Alert,
  Linking,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Search,
  ShoppingBag,
  MapPin,
  Sparkles,
  Store,
  ChevronRight,
  Plus,
  Check,
  Tag,
  TrendingUp,
  Heart,
  Megaphone,
  User,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';
import { useFavorites } from '@/context/favorites-context';
import { PARENT_CATEGORIES } from '@/constants/categories';

const { width } = Dimensions.get('window');

interface ProductItem {
  id: string;
  shop_id: string;
  shop_name?: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  old_price?: number;
  stock_quantity: number;
  image_url: string;
}

interface PromoBannerConfig {
  enabled?: boolean;
  ad_type?: string;
  badge?: string;
  price_tag?: string;
  title?: string;
  subtitle?: string;
  image_url?: string;
  target_url?: string;
}

export default function MarketplaceHomeScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { addToCart, totalItems } = useCart();
  const { isFavorite, toggleFavorite, favorites } = useFavorites();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedParentCat, setSelectedParentCat] = useState<string | null>(null);
  const [selectedSubCat, setSelectedSubCat] = useState<string>('all');
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  // Dynamic Admin CMS States
  const [topBanner, setTopBanner] = useState({
    enabled: true,
    text: "Bienvenue sur Kalagban — La Marketplace n°1 des vendeurs vérifiés !",
    bg_color: "#6d28d9",
    text_color: "#ffffff",
  });

  const [flashSaleConfig, setFlashSaleConfig] = useState({
    enabled: true,
    title: "VENTES FLASH DU MOMENT",
    subtitle: "Offres exclusives limitées dans le temps !",
  });
  const [timeLeft, setTimeLeft] = useState({ hours: 12, minutes: 0, seconds: 0 });
  const [activeFlashSale, setActiveFlashSale] = useState<any>(null);

  const [adBanner, setAdBanner] = useState<PromoBannerConfig>({
    enabled: true,
    badge: 'PUBLICITÉ SPÉCIALE',
    title: 'Offres & Sécurité Kalagban',
    subtitle: 'Achetez en toute confiance auprès de vendeurs vérifiés à Abidjan.',
    image_url: '',
    target_url: '/explore',
  });

  // Countdown timer for Flash Sales
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    fetchProducts();
    fetchAdBanner();

    const channelName = 'public_mobile_cms_' + Math.random().toString(36).substring(7);
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'site_settings' },
        () => {
          fetchAdBanner();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'flash_sales' },
        () => {
          fetchAdBanner();
        }
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'promotional_banners' },
        () => {
          fetchAdBanner();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchAdBanner = async () => {
    try {
      // 1. Fetch site_settings configured in web-admin CMS
      const { data: settingsData } = await supabase.from('site_settings').select('key, value');
      if (settingsData) {
        settingsData.forEach((row) => {
          if (row.key === 'top_banner' && row.value) {
            setTopBanner(row.value as any);
          }
          if (row.key === 'flash_sale_timer' && row.value) {
            setFlashSaleConfig(row.value as any);
          }
          if (row.key === 'promo_banner' && row.value) {
            const val = row.value as PromoBannerConfig;
            if (val.title) setAdBanner(val);
          }
        });
      }

      // 2. Fetch Active Flash Sale campaign
      const { data: flashData } = await supabase
        .from('flash_sales')
        .select('*')
        .eq('status', 'active')
        .gt('end_time', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (flashData) {
        setActiveFlashSale(flashData);
        const end = new Date(flashData.end_time).getTime();
        const now = new Date().getTime();
        const diffMs = Math.max(0, end - now);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }

      // 3. Fallback to promotional_banners table if no promo_banner
      const { data: bData } = await supabase
        .from('promotional_banners')
        .select('*')
        .eq('is_active', true)
        .order('id', { ascending: false })
        .limit(1);

      if (bData && bData.length > 0 && !adBanner.image_url) {
        const first = bData[0];
        setAdBanner({
          enabled: true,
          badge: first.badge_text || 'PUBLICITÉ',
          title: first.title || 'Offre Pub',
          subtitle: first.subtitle || '',
          image_url: first.image_url || '',
          target_url: first.target_url || '/explore',
        });
      }
    } catch (e) {
      console.log('Error fetching ad banner for mobile:', e);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: dbProducts, error } = await supabase
        .from('products')
        .select(`
          id,
          shop_id,
          title,
          description,
          category,
          price,
          old_price,
          stock_quantity,
          shops ( name ),
          product_media ( url )
        `)
        .eq('status', 'active');

      if (!error && dbProducts) {
        const formatted: ProductItem[] = dbProducts.map((p: any) => ({
          id: p.id,
          shop_id: p.shop_id,
          shop_name: p.shops?.name || 'Boutique Partenaire',
          title: p.title,
          description: p.description,
          category: p.category || '',
          price: Number(p.price),
          old_price: p.old_price ? Number(p.old_price) : undefined,
          stock_quantity: p.stock_quantity || 0,
          image_url:
            p.product_media && p.product_media.length > 0
              ? p.product_media[0].url
              : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
        }));
        setProducts(formatted);
      } else {
        setProducts([]);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = (product: ProductItem) => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      old_price: product.old_price,
      image_url: product.image_url,
      shop_id: product.shop_id,
      shop_name: product.shop_name,
    });

    setAddedNotice(product.title);
    setTimeout(() => {
      setAddedNotice(null);
    }, 2000);
  };

  const handleToggleFav = async (product: ProductItem) => {
    const res = await toggleFavorite({
      id: product.id,
      title: product.title,
      price: product.price,
      old_price: product.old_price,
      image_url: product.image_url,
      shop_name: product.shop_name,
    });

    if (res.requiresAuth) {
      Alert.alert(
        'Connexion requise',
        'Vous devez être inscrit ou connecté à votre compte Kalagban pour ajouter des produits à vos favoris.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/favorites') },
        ]
      );
    }
  };

  const handleAdPress = () => {
    if (adBanner.target_url) {
      if (adBanner.target_url.startsWith('http')) {
        Linking.openURL(adBanner.target_url);
      } else if (adBanner.target_url.startsWith('/')) {
        router.push(adBanner.target_url as any);
      } else {
        router.push('/explore');
      }
    } else {
      router.push('/explore');
    }
  };

  const activeParent = PARENT_CATEGORIES.find((c) => c.id === selectedParentCat);

  const filteredProducts = products.filter((item) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      item.title.toLowerCase().includes(q) ||
      (item.description && item.description.toLowerCase().includes(q)) ||
      (item.shop_name && item.shop_name.toLowerCase().includes(q)) ||
      (item.category && item.category.toLowerCase().includes(q));

    if (q) {
      return matchesSearch;
    }

    const itemCat = (item.category || '').toLowerCase();

    let matchesCat = true;
    if (selectedParentCat) {
      if (selectedSubCat !== 'all') {
        matchesCat = itemCat.includes(selectedSubCat.toLowerCase()) || itemCat.includes(selectedSubCat.replace(/-/g, ' '));
      } else {
        matchesCat = itemCat.includes(selectedParentCat.toLowerCase());
      }
    }

    return matchesSearch && matchesCat;
  });

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  const getBannerImageSource = (url?: string) => {
    if (!url) {
      return require('@/assets/images/promo_banner_tech.png');
    }
    if (url.startsWith('http') || url.startsWith('data:')) {
      return { uri: url };
    }
    if (url === '/1.png') return require('@/assets/images/categories/1.png');
    if (url === '/2.png') return require('@/assets/images/categories/2.png');
    if (url === '/3.png') return require('@/assets/images/categories/3.png');
    if (url === '/4.png') return require('@/assets/images/categories/4.png');
    
    return require('@/assets/images/promo_banner_tech.png');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#F8FAFC" />

      {/* Added to cart Toast */}
      {addedNotice && (
        <View style={styles.toastNotice}>
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.toastText} numberOfLines={1}>
            Ajouté au panier : {addedNotice}
          </Text>
        </View>
      )}

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <View style={styles.brandRow}>
          <View style={styles.logoBadge}>
            <Text style={styles.logoLetter}>K</Text>
          </View>
          <View>
            <Text style={styles.brandName}>Kalagban</Text>
            <View style={styles.locationPill}>
              <MapPin size={10} color="#10B981" />
              <Text style={styles.locationText}>Abidjan, Côte d'Ivoire</Text>
            </View>
          </View>
        </View>

        {/* Header Actions (Profile & Cart) */}
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => router.push('/profile')}
            activeOpacity={0.8}
          >
            <User size={20} color="#0F172A" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/cart')}
            activeOpacity={0.8}
          >
            <ShoppingBag size={22} color="#0F172A" />
            {totalItems > 0 && (
              <View style={styles.cartBadge}>
                <Text style={styles.cartBadgeText}>{totalItems}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* DYNAMIC TOP ANNOUNCEMENT BANNER FROM CMS */}
      {topBanner.enabled !== false && topBanner.text ? (
        <View style={[styles.topBannerBar, { backgroundColor: topBanner.bg_color || '#6d28d9' }]}>
          <Sparkles size={12} color={topBanner.text_color || '#FFFFFF'} />
          <Text style={[styles.topBannerText, { color: topBanner.text_color || '#FFFFFF' }]} numberOfLines={1}>
            {topBanner.text}
          </Text>
        </View>
      ) : null}

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 76 + bottomPadding }]}>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <Search size={20} color="#64748B" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit, une catégorie..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={18} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        {searchQuery.trim().length > 0 && (
          <View style={styles.searchActiveBanner}>
            <View style={{ flex: 1 }}>
              <Text style={styles.searchActiveTitle}>Résultats de recherche</Text>
              <Text style={styles.searchActiveSub}>
                {filteredProducts.length} article{filteredProducts.length > 1 ? 's' : ''} trouvé{filteredProducts.length > 1 ? 's' : ''} pour &quot;{searchQuery}&quot;
              </Text>
            </View>
            <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.searchClearBtn}>
              <Text style={styles.searchClearText}>Effacer</Text>
              <X size={14} color="#DC2626" />
            </TouchableOpacity>
          </View>
        )}

        {/* DYNAMIC VENTES FLASH SECTION WITH COUNTDOWN TIMER */}
        {flashSaleConfig.enabled !== false && (
          <View style={styles.flashSaleBox}>
            <TouchableOpacity 
              style={styles.flashHeaderRow}
              onPress={() => router.push('/flash-sales' as any)}
              activeOpacity={0.8}
            >
              <View style={styles.flashTitleContainer}>
                <Sparkles size={16} color="#DC2626" />
                <Text style={styles.flashMainTitle}>{flashSaleConfig.title || "VENTES FLASH"}</Text>
                <ChevronRight size={16} color="#DC2626" />
              </View>

              {/* Countdown Timer Display */}
              <View style={styles.timerBadgeContainer}>
                <View style={styles.timerDigitBox}>
                  <Text style={styles.timerDigitText}>{String(timeLeft.hours).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerDigitBox}>
                  <Text style={styles.timerDigitText}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
                </View>
                <Text style={styles.timerSeparator}>:</Text>
                <View style={styles.timerDigitBox}>
                  <Text style={styles.timerDigitText}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
                </View>
              </View>
            </TouchableOpacity>

            <Text style={styles.flashSubtitleText}>
              {flashSaleConfig.subtitle || "Profitez des réductions avant la fin du compte à rebours !"}
            </Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.flashScrollList}>
              {(products.filter(p => (p.old_price && p.old_price > p.price) || p.stock_quantity <= 5).length > 0
                ? products.filter(p => (p.old_price && p.old_price > p.price) || p.stock_quantity <= 5)
                : products.slice(0, 4)
              ).map((p) => {
                const discountPercent = p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 20;
                return (
                  <TouchableOpacity
                    key={p.id}
                    style={styles.flashCard}
                    onPress={() => router.push(`/product/${p.id}` as any)}
                    activeOpacity={0.9}
                  >
                    <View style={styles.flashImageWrapper}>
                      <Image source={{ uri: p.image_url }} style={styles.flashImage} />
                      <View style={styles.flashDiscountBadge}>
                        <Text style={styles.flashDiscountText}>-{discountPercent}%</Text>
                      </View>
                    </View>

                    <Text style={styles.flashCardTitle} numberOfLines={1}>{p.title}</Text>
                    <View style={styles.flashPriceRow}>
                      <Text style={styles.flashPriceText}>{p.price.toLocaleString('fr-FR')} F</Text>
                      {p.old_price ? (
                        <Text style={styles.flashOldPriceText}>{p.old_price.toLocaleString('fr-FR')} F</Text>
                      ) : null}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* Parent Categories Grid */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Catégories Principales</Text>
          {selectedParentCat && (
            <TouchableOpacity onPress={() => { setSelectedParentCat(null); setSelectedSubCat('all'); }}>
              <Text style={styles.resetCatText}>Voir tout</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.parentCategoryRow}>
          {PARENT_CATEGORIES.map((cat) => {
            const isSelected = selectedParentCat === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                style={[styles.parentCatCard, isSelected && styles.parentCatCardSelected]}
                onPress={() => {
                  router.push(`/category/${cat.id}` as any);
                }}
                activeOpacity={0.85}
              >
                <View style={[styles.avatarCircle, isSelected && styles.avatarCircleSelected]}>
                  <Image source={cat.image} style={styles.catAvatarImage} />
                </View>
                <Text style={[styles.parentCatLabel, isSelected && styles.parentCatLabelSelected]}>
                  {cat.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Sub-categories row if a parent category is selected */}
        {activeParent && (
          <View style={styles.subCatContainer}>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.subCatScroll}>
              <TouchableOpacity
                style={[styles.subCatChip, selectedSubCat === 'all' && styles.subCatChipSelected]}
                onPress={() => setSelectedSubCat('all')}
              >
                <Text style={[styles.subCatText, selectedSubCat === 'all' && styles.subCatTextSelected]}>
                  Tout dans {activeParent.label}
                </Text>
              </TouchableOpacity>

              {activeParent.subCategories.map((sub) => {
                const isSubSel = selectedSubCat === sub.id;
                return (
                  <TouchableOpacity
                    key={sub.id}
                    style={[styles.subCatChip, isSubSel && styles.subCatChipSelected]}
                    onPress={() => setSelectedSubCat(sub.id)}
                  >
                    <Text style={[styles.subCatText, isSubSel && styles.subCatTextSelected]}>
                      {sub.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* DYNAMIC ADMIN ADVERTISING BANNER (DIV PUBLICITAIRE PILOTÉE PAR L'ADMIN) */}
        {adBanner.enabled !== false && (
          (adBanner.ad_type === 'full_image' || (adBanner.image_url && adBanner.ad_type !== 'standard')) ? (
            <TouchableOpacity
              style={styles.fullImageBannerCard}
              onPress={handleAdPress}
              activeOpacity={0.9}
            >
              <Image source={getBannerImageSource(adBanner.image_url)} style={styles.fullImageBanner} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              style={styles.promoBanner}
              onPress={handleAdPress}
              activeOpacity={0.9}
            >
              {adBanner.image_url ? (
                <Image source={getBannerImageSource(adBanner.image_url)} style={styles.adBannerImage} />
              ) : null}

              <View style={styles.promoContent}>
                <View style={styles.promoBadge}>
                  <Megaphone size={12} color="#92400E" />
                  <Text style={styles.promoBadgeText}>
                    {adBanner.badge || adBanner.price_tag || 'PUBLICITÉ'}
                  </Text>
                </View>

                <Text style={styles.promoTitle}>
                  {adBanner.title || 'Publicité Spéciale Admin'}
                </Text>
                
                {adBanner.subtitle ? (
                  <Text style={styles.promoSub}>{adBanner.subtitle}</Text>
                ) : null}

                <View style={styles.promoButton}>
                  <Text style={styles.promoButtonText}>En savoir plus</Text>
                  <ChevronRight size={14} color="#FFFFFF" />
                </View>
              </View>
            </TouchableOpacity>
          )
        )}

        {/* Products Grid Section */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <TrendingUp size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Produits Disponibles</Text>
          </View>
          <Text style={styles.productCountText}>{filteredProducts.length} articles</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Chargement de la Marketplace...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyBox}>
            <Tag size={40} color="#94A3B8" />
            <Text style={styles.emptyTitle}>Aucun produit disponible</Text>
            <Text style={styles.emptySub}>
              Aucun produit actif pour cette catégorie dans la base de données.
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((item) => {
              const fav = isFavorite(item.id);
              return (
                <View key={item.id} style={styles.productCard}>
                  {/* Image */}
                  <TouchableOpacity
                    activeOpacity={0.9}
                    onPress={() => router.push(`/product/${item.id}`)}
                  >
                    <Image source={{ uri: item.image_url }} style={styles.productImage} />
                    
                    {item.old_price && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>
                          -{Math.round(((item.old_price - item.price) / item.old_price) * 100)}%
                        </Text>
                      </View>
                    )}

                    {/* Heart Favorite Button */}
                    <TouchableOpacity
                      style={styles.favToggleBtn}
                      onPress={() => handleToggleFav(item)}
                      activeOpacity={0.8}
                    >
                      <Heart
                        size={16}
                        color={fav ? '#EF4444' : '#64748B'}
                        fill={fav ? '#EF4444' : 'transparent'}
                      />
                    </TouchableOpacity>
                  </TouchableOpacity>

                  {/* Info */}
                  <View style={styles.productInfo}>
                    <Text style={styles.shopName} numberOfLines={1}>
                      {item.shop_name}
                    </Text>

                    <TouchableOpacity onPress={() => router.push(`/product/${item.id}`)}>
                      <Text style={styles.productTitle} numberOfLines={2}>
                        {item.title}
                      </Text>
                    </TouchableOpacity>

                    <View style={styles.priceRow}>
                      <View>
                        <Text style={styles.priceText}>{formatPrice(item.price)}</Text>
                        {item.old_price && (
                          <Text style={styles.oldPriceText}>{formatPrice(item.old_price)}</Text>
                        )}
                      </View>

                      <TouchableOpacity
                        style={styles.addCartBtn}
                        onPress={() => handleAddToCart(item)}
                        activeOpacity={0.8}
                      >
                        <Plus size={18} color="#FFFFFF" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Bottom Floating Nav Bar */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPadding, height: 56 + bottomPadding }]}>
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/')}>
          <Store size={22} color="#4F46E5" />
          <Text style={[styles.navLabel, { color: '#4F46E5' }]}>Accueil</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/explore')}>
          <Store size={22} color="#64748B" />
          <Text style={styles.navLabel}>Boutiques</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/cart')}>
          <View>
            <ShoppingBag size={22} color="#64748B" />
            {totalItems > 0 && (
              <View style={styles.navCartBadge}>
                <Text style={styles.navCartText}>{totalItems}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navLabel}>Panier</Text>
        </TouchableOpacity>

        {/* Favorites Button in place of Commander */}
        <TouchableOpacity style={styles.navItem} onPress={() => router.push('/favorites')}>
          <View>
            <Heart size={22} color="#64748B" />
            {favorites.length > 0 && (
              <View style={styles.navFavBadge}>
                <Text style={styles.navCartText}>{favorites.length}</Text>
              </View>
            )}
          </View>
          <Text style={styles.navLabel}>Favoris</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  toastNotice: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    zIndex: 999,
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  logoBadge: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoLetter: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 20,
  },
  brandName: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  locationPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  profileButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#EF4444',
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    paddingBottom: 90,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  searchActiveBanner: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  searchActiveTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  searchActiveSub: {
    fontSize: 11,
    color: '#4F46E5',
    fontWeight: '600',
    marginTop: 1,
  },
  searchClearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  searchClearText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginTop: 20,
    marginBottom: 12,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  resetCatText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  parentCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  parentCatCard: {
    alignItems: 'center',
    width: (width - 64) / 4,
    gap: 6,
  },
  parentCatCardSelected: {
    transform: [{ scale: 1.05 }],
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#E2E8F0',
    backgroundColor: '#FFFFFF',
  },
  avatarCircleSelected: {
    borderColor: '#4F46E5',
    borderWidth: 3,
  },
  catAvatarImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  parentCatLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: '#334155',
    textAlign: 'center',
  },
  parentCatLabelSelected: {
    color: '#4F46E5',
  },
  subCatContainer: {
    marginTop: 8,
    marginBottom: 4,
  },
  subCatScroll: {
    paddingHorizontal: 20,
    gap: 8,
  },
  subCatChip: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  subCatChipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  subCatText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  subCatTextSelected: {
    color: '#FFFFFF',
  },
  fullImageBannerCard: {
    marginHorizontal: 20,
    marginTop: 16,
    borderRadius: 24,
    overflow: 'hidden',
    height: 150,
    backgroundColor: '#0F172A',
    elevation: 3,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  fullImageBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  promoBanner: {
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: '#4F46E5',
    borderRadius: 24,
    padding: 20,
    overflow: 'hidden',
    position: 'relative',
  },
  adBannerImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    opacity: 0.25,
    resizeMode: 'cover',
  },
  promoContent: {
    gap: 8,
    zIndex: 2,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '900',
  },
  promoSub: {
    color: '#C7D2FE',
    fontSize: 12,
    fontWeight: '500',
  },
  promoButton: {
    backgroundColor: '#4338CA',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    marginTop: 6,
  },
  promoButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  productCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
  },
  loadingBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
  },
  emptyBox: {
    padding: 40,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 12,
    color: '#64748B',
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 16,
    gap: 12,
  },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginBottom: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    elevation: 2,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: '#F1F5F9',
  },
  discountBadge: {
    position: 'absolute',
    top: 8,
    left: 8,
    backgroundColor: '#EF4444',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  favToggleBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  productInfo: {
    padding: 12,
    gap: 4,
  },
  shopName: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 18,
    height: 36,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  priceText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  oldPriceText: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  addCartBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingBottom: 10,
  },
  navItem: {
    alignItems: 'center',
    gap: 3,
  },
  navLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  navCartBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navFavBadge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: '#4F46E5',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navCartText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  topBannerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  topBannerText: {
    fontSize: 11,
    fontWeight: '800',
  },
  flashSaleBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 20,
    padding: 14,
    marginVertical: 10,
    borderWidth: 1,
    borderColor: '#FEE2E2',
    gap: 8,
  },
  flashHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  flashTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  flashMainTitle: {
    fontSize: 14,
    fontWeight: '900',
    color: '#991B1B',
    letterSpacing: 0.5,
  },
  timerBadgeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  timerDigitBox: {
    backgroundColor: '#1E1B4B',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 6,
  },
  timerDigitText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  timerSeparator: {
    fontSize: 12,
    fontWeight: '900',
    color: '#991B1B',
  },
  flashSubtitleText: {
    fontSize: 11,
    color: '#7F1D1D',
    fontWeight: '500',
  },
  flashScrollList: {
    gap: 10,
    paddingTop: 4,
  },
  flashCard: {
    width: 130,
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
    gap: 4,
  },
  flashImageWrapper: {
    width: '100%',
    height: 90,
    borderRadius: 10,
    overflow: 'hidden',
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  flashImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  flashDiscountBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  flashDiscountText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  flashCardTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: '#1E293B',
  },
  flashPriceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  flashPriceText: {
    fontSize: 12,
    fontWeight: '900',
    color: '#DC2626',
  },
  flashOldPriceText: {
    fontSize: 9,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
});
