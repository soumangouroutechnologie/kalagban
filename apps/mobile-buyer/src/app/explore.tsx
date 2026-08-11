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
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Store,
  ShieldCheck,
  ArrowLeft,
  ChevronRight,
  Search,
  ShoppingBag,
  Sparkles,
  Heart,
  TrendingUp,
  Check,
  Megaphone,
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
  price: number;
  old_price?: number;
  image_url: string;
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
  const router = useRouter();
  const { addToCart } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [shops, setShops] = useState<ShopItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
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
        .select('id, name, description, logo_url');

      if (shopsData) {
        setShops(shopsData);
      }

      // 2. Fetch Products across all shops
      const { data: productsData } = await supabase
        .from('products')
        .select('id, title, description, price, old_price, image_url, shop_name')
        .limit(20);

      if (productsData) {
        setProducts(productsData);
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

  const filteredShops = shops.filter(
    (shop) =>
      shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (shop.description && shop.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const filteredProducts = products.filter(
    (prod) =>
      prod.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (prod.description && prod.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  const handleAddToCart = (product: Product) => {
    addToCart({
      id: product.id,
      title: product.title,
      price: product.price,
      old_price: product.old_price,
      image_url: product.image_url,
      shop_id: 'shop_1',
      shop_name: product.shop_name || 'Boutique Partenaire',
    });
    setAddedNotice(product.title);
    setTimeout(() => setAddedNotice(null), 2500);
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
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Boutiques &amp; Produits</Text>

        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher une boutique ou un produit..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* 1. ECRAN / BANNIÈRE DE PUB ADMIN EN HAUT */}
        {adBanner.enabled !== false && (
          (adBanner.ad_type === 'full_image' || (adBanner.image_url && adBanner.ad_type !== 'standard')) ? (
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

        {/* 2. ESPACE BOUTIQUES EN CARTES */}
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
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.shopsHorizontalScroll}>
            {filteredShops.map((shop) => (
              <View key={shop.id} style={styles.shopGridCard}>
                <Image
                  source={{
                    uri:
                      shop.logo_url ||
                      'https://images.unsplash.com/photo-1595777457583-95e059d581b8?w=200&auto=format&fit=crop&q=80',
                  }}
                  style={styles.shopCardLogo}
                />
                <View style={styles.shopCardBody}>
                  <View style={styles.shopTitleRow}>
                    <Text style={styles.shopGridTitle} numberOfLines={1}>{shop.name}</Text>
                    <ShieldCheck size={16} color="#10B981" />
                  </View>
                  <Text style={styles.shopGridDesc} numberOfLines={2}>
                    {shop.description || 'Vendeur certifié sur la Marketplace Kalagban.'}
                  </Text>
                </View>
              </View>
            ))}
          </ScrollView>
        )}

        {/* 3. ESPACE PRODUITS SANS CATÉGORIES STRICTES */}
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <TrendingUp size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Tous les Produits des Boutiques</Text>
          </View>
          <Text style={styles.countText}>{filteredProducts.length} articles</Text>
        </View>

        {filteredProducts.length === 0 ? (
          <View style={styles.emptyProductsBox}>
            <ShoppingBag size={40} color="#94A3B8" />
            <Text style={styles.emptyProductsText}>Aucun produit correspondant.</Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product) => {
              const fav = isFavorite(product.id);
              return (
                <View key={product.id} style={styles.productCard}>
                  <View style={styles.imageContainer}>
                    <Image source={{ uri: product.image_url }} style={styles.productImage} />
                    <TouchableOpacity
                      style={[styles.favBtn, fav && styles.favBtnActive]}
                      onPress={() =>
                        toggleFavorite({
                          id: product.id,
                          title: product.title,
                          price: product.price,
                          old_price: product.old_price,
                          image_url: product.image_url,
                          shop_name: product.shop_name,
                        })
                      }
                      activeOpacity={0.8}
                    >
                      <Heart size={16} color={fav ? '#EF4444' : '#64748B'} fill={fav ? '#EF4444' : 'none'} />
                    </TouchableOpacity>
                  </View>

                  <View style={styles.productDetails}>
                    <Text style={styles.shopLabel}>{product.shop_name || 'Boutique Kalagban'}</Text>
                    <Text style={styles.productTitle} numberOfLines={2}>{product.title}</Text>
                    <Text style={styles.productPrice}>{formatPrice(product.price)}</Text>

                    <TouchableOpacity
                      style={styles.addToCartBtn}
                      onPress={() => handleAddToCart(product)}
                      activeOpacity={0.85}
                    >
                      <ShoppingBag size={14} color="#FFFFFF" />
                      <Text style={styles.addToCartText}>Au panier</Text>
                    </TouchableOpacity>
                  </View>
                </View>
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
  shopsHorizontalScroll: {
    paddingHorizontal: 20,
    gap: 12,
  },
  shopGridCard: {
    width: 200,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  shopCardLogo: {
    width: 60,
    height: 60,
    borderRadius: 16,
    backgroundColor: '#F1F5F9',
  },
  shopCardBody: {
    gap: 4,
  },
  shopTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  shopGridTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
  },
  shopGridDesc: {
    fontSize: 11,
    color: '#64748B',
    lineHeight: 16,
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
    marginVertical: 2,
  },
  addToCartBtn: {
    backgroundColor: '#4F46E5',
    borderRadius: 12,
    height: 36,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
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
  },
});
