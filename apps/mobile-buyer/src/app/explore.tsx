import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Image,
  TextInput,
  Dimensions,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  Store,
  ShieldCheck,
  ArrowLeft,
  Search,
  ShoppingBag,
  Heart,
  TrendingUp,
  Check,
  Megaphone,
  X,
  SlidersHorizontal,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';
import { useFavorites } from '@/context/favorites-context';

const { width } = Dimensions.get('window');

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
}

interface Product {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  old_price?: number;
  stock_quantity?: number;
  image_url: string;
  shop_id?: string;
  shop_name?: string;
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

export default function ExploreScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const [adBanner, setAdBanner] = useState<PromoBannerConfig>({
    enabled: true,
    badge: 'PUBLICITÉ SPÉCIALE',
    title: 'Offres & Sécurité Kalagban',
    subtitle: 'Achetez en toute confiance auprès de vendeurs vérifiés à Abidjan.',
    image_url: '/promo_banner_tech.png',
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Shops
      const { data: shopsData } = await supabase
        .from('shops')
        .select('id, name, description, logo_url')
        .order('name', { ascending: true });

      if (shopsData) {
        setShops(shopsData);
      }

      const { data: productsData, error: prodErr } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          category,
          price,
          old_price,
          shop_id,
          status,
          moderation_status,
          shops ( id, name ),
          product_media ( url )
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!prodErr && productsData) {
        const approvedOnly = productsData.filter((p: any) => {
          const isPending = p.moderation_status === "pending_review" || p.moderation_status === "pending";
          const isRejected = p.moderation_status === "rejected";
          const isApproved = p.moderation_status === "approved" || (!p.moderation_status && p.status === "active");
          return p.status === "active" && isApproved && !isPending && !isRejected;
        });

        const formatted: Product[] = approvedOnly.map((p: any) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category || '',
          price: Number(p.price),
          old_price: p.old_price ? Number(p.old_price) : undefined,
          shop_id: p.shop_id,
          shop_name: p.shops?.name || 'Boutique Partenaire',
          image_url:
            p.product_media && p.product_media.length > 0
              ? p.product_media[0].url
              : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
        }));
        setProducts(formatted);
      } else {
        setProducts([]);
      }

      // 3. Fetch CMS Promo Banner
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('key, value')
        .eq('key', 'promo_banner')
        .single();

      if (settingsData && settingsData.value) {
        setAdBanner(settingsData.value as PromoBannerConfig);
      }
    } catch {
      // Error fallback
    } finally {
      setLoading(false);
    }
  };

  const getBannerImageSource = (url?: string) => {
    if (!url) return require('@/assets/images/promo_banner_tech.png');
    if (url.startsWith('http') || url.startsWith('data:')) return { uri: url };
    return require('@/assets/images/promo_banner_tech.png');
  };

  const selectedShop = shops.find((s) => s.id === selectedShopId);

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.description && shop.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredProducts = products.filter((prod) => {
    // 1. Match selected shop filter
    if (selectedShopId) {
      const matchShop =
        prod.shop_id === selectedShopId ||
        (selectedShop && prod.shop_name?.toLowerCase() === selectedShop.name.toLowerCase());
      if (!matchShop) return false;
    }

    // 2. Match Search Query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = prod.title.toLowerCase().includes(q);
      const matchDesc = prod.description ? prod.description.toLowerCase().includes(q) : false;
      const matchCat = prod.category ? prod.category.toLowerCase().includes(q) : false;
      const matchShop = prod.shop_name ? prod.shop_name.toLowerCase().includes(q) : false;
      return matchTitle || matchDesc || matchCat || matchShop;
    }

    return true;
  });

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  const handleAddToCart = (product: Product) => {
    if (product.stock_quantity !== undefined && product.stock_quantity <= 0) return;
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      old_price: product.old_price,
      image_url: product.image_url,
      shop_id: product.shop_id || 'shop_1',
      shop_name: product.shop_name || 'Boutique Partenaire',
      max_stock: product.stock_quantity,
    });
    setAddedNotice(product.title);
    setTimeout(() => setAddedNotice(null), 2500);
  };

  const handleSelectShop = (shopId: string) => {
    if (selectedShopId === shopId) {
      setSelectedShopId(null);
    } else {
      setSelectedShopId(shopId);
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Added Toast */}
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
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Boutiques &amp; Produits</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomPadding }]}
      >
        {/* Search Input with Clear Button */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une boutique ou un produit..."
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

        {/* 1. ECRAN / BANNIÈRE DE PUB ADMIN EN HAUT */}
        {adBanner.enabled !== false && (
          adBanner.ad_type === 'full_image' || (adBanner.image_url && adBanner.ad_type !== 'standard') ? (
            <View style={styles.fullImageBannerCard}>
              <Image source={getBannerImageSource(adBanner.image_url)} style={styles.fullImageBanner} />
            </View>
          ) : (
            <View style={styles.promoBannerCard}>
              {adBanner.image_url ? (
                <Image source={getBannerImageSource(adBanner.image_url)} style={styles.promoBgImage} />
              ) : null}
              <View style={styles.promoBadge}>
                <Megaphone size={12} color="#92400E" />
                <Text style={styles.promoBadgeText}>{adBanner.badge || adBanner.price_tag || 'OFFRE SPÉCIALE'}</Text>
              </View>
              <Text style={styles.promoTitle}>{adBanner.title || 'Boutiques Vérifiées Kalagban'}</Text>
              {adBanner.subtitle ? <Text style={styles.promoSub}>{adBanner.subtitle}</Text> : null}
            </View>
          )
        )}

        {/* 2. ESPACE BOUTIQUES EN GRILLE 2 COLONNES CÔTE À CÔTE */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <Store size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Commerçants Vérifiés</Text>
          </View>
          <Text style={styles.countText}>{filteredShops.length} boutiques</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Chargement des boutiques...</Text>
          </View>
        ) : filteredShops.length === 0 ? (
          <View style={styles.emptyShopsBox}>
            <Store size={32} color="#94A3B8" />
            <Text style={styles.emptyProductsText}>Aucune boutique trouvée.</Text>
          </View>
        ) : (
          <View style={styles.shopsGrid}>
            {filteredShops.map((shop) => {
              const isSelected = selectedShopId === shop.id;
              const shopProductCount = products.filter(
                (p) => p.shop_id === shop.id || p.shop_name?.toLowerCase() === shop.name.toLowerCase()
              ).length;

              return (
                <TouchableOpacity
                  key={shop.id}
                  style={[styles.shopGridCard, isSelected && styles.shopGridCardSelected]}
                  onPress={() => handleSelectShop(shop.id)}
                  activeOpacity={0.85}
                >
                  <View style={styles.shopLogoRow}>
                    <Image
                      source={{
                        uri:
                          shop.logo_url ||
                          'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&auto=format&fit=crop&q=80',
                      }}
                      style={styles.shopCardLogo}
                    />
                    <View style={styles.verifiedBadge}>
                      <ShieldCheck size={14} color="#10B981" />
                    </View>
                  </View>

                  <View style={styles.shopCardBody}>
                    <Text style={styles.shopGridTitle} numberOfLines={1}>
                      {shop.name}
                    </Text>
                    <Text style={styles.shopGridDesc} numberOfLines={2}>
                      {shop.description || 'Boutique certifiée sur Kalagban'}
                    </Text>

                    <View style={[styles.shopActionBadge, isSelected && styles.shopActionBadgeSelected]}>
                      <Text style={[styles.shopActionText, isSelected && styles.shopActionTextSelected]}>
                        {isSelected ? '✓ Boutique active' : `${shopProductCount} article${shopProductCount > 1 ? 's' : ''}`}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* ACTIVE FILTER BANNER IF A SHOP IS SELECTED */}
        {selectedShop && (
          <View style={styles.activeFilterBanner}>
            <View style={styles.activeFilterLeft}>
              <Store size={16} color="#4F46E5" />
              <View style={{ flex: 1 }}>
                <Text style={styles.activeFilterLabel}>Filtre boutique actif :</Text>
                <Text style={styles.activeFilterShopName} numberOfLines={1}>
                  {selectedShop.name}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              style={styles.resetFilterBtn}
              onPress={() => setSelectedShopId(null)}
              activeOpacity={0.8}
            >
              <Text style={styles.resetFilterText}>Voir tout</Text>
              <X size={14} color="#EF4444" />
            </TouchableOpacity>
          </View>
        )}

        {/* 3. ESPACE PRODUITS FILTRÉS OU GLOBAUX */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <TrendingUp size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>
              {selectedShop ? `Produits de ${selectedShop.name}` : 'Tous les Produits des Boutiques'}
            </Text>
          </View>
          <Text style={styles.countText}>{filteredProducts.length} articles</Text>
        </View>

        {loading ? (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#4F46E5" />
            <Text style={styles.loadingText}>Chargement des articles...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyProductsBox}>
            <ShoppingBag size={40} color="#94A3B8" />
            <Text style={styles.emptyProductsText}>
              {selectedShop
                ? `Aucun produit disponible pour ${selectedShop.name}.`
                : 'Aucun produit correspondant à votre recherche.'}
            </Text>
            {selectedShop && (
              <TouchableOpacity
                style={styles.emptyResetBtn}
                onPress={() => setSelectedShopId(null)}
              >
                <Text style={styles.emptyResetText}>Afficher tous les produits</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => {
              const fav = isFavorite(product.id);
              return (
                <TouchableOpacity
                  key={product.id}
                  style={styles.productCard}
                  onPress={() => router.push(`/product/${product.id}` as any)}
                  activeOpacity={0.9}
                >
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: product.image_url }} style={styles.productImage} />
                    <TouchableOpacity
                      style={[styles.favBtn, fav && styles.favBtnActive]}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        toggleFavorite({
                          id: product.id,
                          title: product.title,
                          price: product.price,
                          old_price: product.old_price,
                          image_url: product.image_url,
                          shop_name: product.shop_name,
                        });
                      }}
                      activeOpacity={0.8}
                    >
                      <Heart size={16} color={fav ? '#EF4444' : '#64748B'} fill={fav ? '#EF4444' : 'none'} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productDetails}>
                    <Text style={styles.shopLabel} numberOfLines={1}>
                      {product.shop_name || 'Boutique Kalagban'}
                    </Text>
                    <Text style={styles.productTitle} numberOfLines={2}>
                      {product.title}
                    </Text>
                    <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>
                    {product.old_price ? (
                      <Text style={styles.productOldPrice}>{formatPrice(product.old_price)}</Text>
                    ) : null}

                    <TouchableOpacity
                      style={styles.addToCartBtn}
                      onPress={(e) => {
                        e.stopPropagation?.();
                        handleAddToCart(product);
                      }}
                      activeOpacity={0.85}
                    >
                      <ShoppingBag size={14} color="#FFFFFF" />
                      <Text style={styles.addToCartText}>Au panier</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>
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
    backgroundColor: '#10B981',
    borderRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
    elevation: 10,
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '800',
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
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    paddingVertical: 16,
    gap: 18,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  fullImageBannerCard: {
    marginHorizontal: 20,
    borderRadius: 20,
    overflow: 'hidden',
    height: 140,
    backgroundColor: '#0F172A',
    elevation: 3,
  },
  fullImageBanner: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  promoBannerCard: {
    marginHorizontal: 20,
    backgroundColor: '#4F46E5',
    borderRadius: 20,
    padding: 16,
    gap: 6,
    overflow: 'hidden',
  },
  promoBgImage: {
    ...StyleSheet.absoluteFill,
    opacity: 0.2,
  },
  promoBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FEF3C7',
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  promoBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#92400E',
  },
  promoTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  promoSub: {
    fontSize: 12,
    color: '#E0E7FF',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
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
    flex: 1,
  },
  countText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  loadingBox: {
    padding: 30,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
  },
  shopsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    gap: 12,
  },
  shopGridCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1.5,
    borderColor: '#F1F5F9',
    gap: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  shopGridCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#F5F3FF',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.15,
  },
  shopLogoRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  shopCardLogo: {
    width: 52,
    height: 52,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  verifiedBadge: {
    backgroundColor: '#ECFDF5',
    padding: 4,
    borderRadius: 8,
  },
  shopCardBody: {
    gap: 4,
  },
  shopGridTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  shopGridDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 15,
  },
  shopActionBadge: {
    marginTop: 6,
    backgroundColor: '#F1F5F9',
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignItems: 'center',
  },
  shopActionBadgeSelected: {
    backgroundColor: '#4F46E5',
  },
  shopActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  shopActionTextSelected: {
    color: '#FFFFFF',
  },
  activeFilterBanner: {
    marginHorizontal: 20,
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
  activeFilterLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  activeFilterLabel: {
    fontSize: 10,
    fontWeight: '700',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  activeFilterShopName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1E1B4B',
  },
  resetFilterBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#FEE2E2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
  },
  resetFilterText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#DC2626',
  },
  emptyShopsBox: {
    padding: 30,
    alignItems: 'center',
    gap: 8,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
    gap: 12,
  },
  productCard: {
    width: (width - 52) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  imageContainer: {
    height: 140,
    position: 'relative',
    backgroundColor: '#F8FAFC',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  favBtn: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  favBtnActive: {
    backgroundColor: '#FEE2E2',
  },
  productDetails: {
    padding: 12,
    gap: 4,
  },
  shopLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#6366F1',
    textTransform: 'uppercase',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    height: 36,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
    marginTop: 2,
  },
  productOldPrice: {
    fontSize: 11,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  addToCartBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 6,
  },
  addToCartText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 12,
  },
  emptyProductsBox: {
    padding: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyProductsText: {
    color: '#64748B',
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  emptyResetBtn: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 12,
    marginTop: 8,
  },
  emptyResetText: {
    color: '#4F46E5',
    fontWeight: '800',
    fontSize: 12,
  },
});
