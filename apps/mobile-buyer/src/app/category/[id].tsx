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
  Alert,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  Search,
  ShoppingBag,
  Heart,
  Plus,
  Check,
  ChevronRight,
  Sparkles,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';
import { useFavorites } from '@/context/favorites-context';

const { width } = Dimensions.get('window');

interface SubCategory {
  id: string;
  label: string;
}

interface ParentCategoryConfig {
  id: string;
  label: string;
  image: string;
  subCategories: SubCategory[];
}

const PARENT_CATEGORIES: ParentCategoryConfig[] = [
  {
    id: 'femme',
    label: 'Mode Femme',
    image: '/1.png',
    subCategories: [
      { id: 'vetements-femmes', label: 'Vêtements' },
      { id: 'chaussures-femmes', label: 'Chaussures' },
      { id: 'accessoires-femmes', label: 'Accessoires' },
      { id: 'beaute-et-soins-femmes', label: 'Beauté & Soins' },
    ],
  },
  {
    id: 'homme',
    label: 'Mode Homme',
    image: '/2.png',
    subCategories: [
      { id: 'vetements-hommes', label: 'Vêtements' },
      { id: 'chaussures-hommes', label: 'Chaussures' },
      { id: 'accessoires-hommes', label: 'Accessoires' },
      { id: 'beaute-et-soins-hommes', label: 'Beauté & Soins' },
    ],
  },
  {
    id: 'enfants',
    label: 'Enfants',
    image: '/3.png',
    subCategories: [
      { id: 'vetements-enfants', label: 'Vêtements' },
      { id: 'chaussures-enfants', label: 'Chaussures' },
      { id: 'accessoires-enfants', label: 'Accessoires' },
      { id: 'beaute-et-soins-enfants', label: 'Beauté & Soins' },
    ],
  },
  {
    id: 'deco-maison',
    label: 'Deco & Maison',
    image: '/4.png',
    subCategories: [
      { id: 'cuisine', label: 'Cuisine' },
      { id: 'salon', label: 'Salon' },
      { id: 'veranda', label: 'Veranda' },
      { id: 'balcon', label: 'Balcon' },
    ],
  },
];

interface ProductItem {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  old_price?: number;
  stock_quantity?: number;
  image_url: string;
  shop_name?: string;
  shop_id?: string;
}

export default function CategoryJumiaStyleScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { addToCart, totalItems } = useCart();
  const { isFavorite, toggleFavorite } = useFavorites();

  const [activeParentId, setActiveParentId] = useState<string>((id || 'femme').toLowerCase());
  const [selectedSubId, setSelectedSubId] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const activeParent = PARENT_CATEGORIES.find((p) => p.id === activeParentId) || PARENT_CATEGORIES[0];

  useEffect(() => {
    if (id) {
      setActiveParentId(id.toLowerCase());
      setSelectedSubId('all');
    }
  }, [id]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          title,
          description,
          category,
          price,
          old_price,
          stock_quantity,
          status,
          shop_id,
          product_media (url),
          shops (name)
        `)
        .eq('status', 'active')
        .order('created_at', { ascending: false });

      if (!error && data) {
        const formatted: ProductItem[] = data.map((item: any) => ({
          id: item.id,
          title: item.title,
          description: item.description,
          category: item.category,
          price: Number(item.price),
          old_price: item.old_price ? Number(item.old_price) : undefined,
          stock_quantity: Number(item.stock_quantity ?? 0),
          image_url: item.product_media && item.product_media.length > 0 ? item.product_media[0].url : '',
          shop_name: item.shops?.name || 'Vendeur Certifié',
          shop_id: item.shop_id,
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

  const handleAddToCart = (prod: ProductItem) => {
    if (prod.stock_quantity && prod.stock_quantity <= 0) return;
    addToCart({
      id: prod.id,
      title: prod.title,
      price: prod.price,
      old_price: prod.old_price,
      image_url: prod.image_url,
      shop_id: prod.shop_id || '',
      shop_name: prod.shop_name,
      max_stock: prod.stock_quantity,
    });
    setAddedNotice(prod.title);
    setTimeout(() => setAddedNotice(null), 2000);
  };

  const handleToggleFav = async (prod: ProductItem) => {
    const res = await toggleFavorite({
      id: prod.id,
      title: prod.title,
      price: prod.price,
      old_price: prod.old_price,
      image_url: prod.image_url,
      shop_name: prod.shop_name,
    });
    if (res.requiresAuth) {
      Alert.alert(
        'Connexion requise',
        'Connectez-vous pour ajouter des produits à vos favoris.',
        [
          { text: 'Annuler', style: 'cancel' },
          { text: 'Se connecter', onPress: () => router.push('/favorites') },
        ]
      );
    }
  };

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  // Filter products for active parent & selected subcategory
  const filteredProducts = products.filter((p) => {
    const q = searchQuery.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.shop_name && p.shop_name.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));

    if (q) {
      return matchesSearch;
    }

    const prodCat = (p.category || '').toLowerCase();
    const subIds = activeParent.subCategories.map((s) => s.id.toLowerCase());

    let matchesCat = false;
    if (selectedSubId !== 'all') {
      matchesCat = prodCat.includes(selectedSubId.toLowerCase()) || prodCat.includes(selectedSubId.replace(/-/g, ' '));
    } else {
      matchesCat =
        prodCat.includes(activeParent.id) ||
        subIds.some((sId) => prodCat.includes(sId));
    }

    return matchesSearch && matchesCat;
  });

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Toast Notice */}
      {addedNotice && (
        <View style={styles.toastNotice}>
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.toastText} numberOfLines={1}>
            Ajouté au panier : {addedNotice}
          </Text>
        </View>
      )}

      {/* Top Header Bar with Search */}
      <View style={[styles.headerBar, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/');
          }}
        >
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <View style={styles.searchBox}>
          <Search size={16} color="#94A3B8" />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher sur Kalagban"
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <X size={16} color="#94A3B8" />
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity
          style={styles.cartBtn}
          onPress={() => router.push('/cart')}
        >
          <ShoppingBag size={20} color="#0F172A" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* 2-COLUMN SPLIT CONTAINER (JUMIA STYLE SIDEBAR + MAIN AREA) */}
      <View style={styles.splitContainer}>
        
        {/* LEFT VERTICAL SIDEBAR (Parent & Sub Categories) */}
        <View style={styles.leftSidebar}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 30 }}>
            {PARENT_CATEGORIES.map((parent) => {
              const isParentActive = parent.id === activeParentId;

              return (
                <View key={parent.id} style={styles.parentSection}>
                  <TouchableOpacity
                    style={[
                      styles.parentTab,
                      isParentActive && styles.parentTabActive,
                    ]}
                    onPress={() => {
                      setActiveParentId(parent.id);
                      setSelectedSubId('all');
                    }}
                    activeOpacity={0.8}
                  >
                    {isParentActive && <View style={styles.activeIndicator} />}
                    <Text
                      style={[
                        styles.parentTabText,
                        isParentActive && styles.parentTabTextActive,
                      ]}
                      numberOfLines={2}
                    >
                      {parent.label}
                    </Text>
                  </TouchableOpacity>

                  {/* Render subcategories if parent is active */}
                  {isParentActive && (
                    <View style={styles.subList}>
                      <TouchableOpacity
                        style={[
                          styles.subTab,
                          selectedSubId === 'all' && styles.subTabActive,
                        ]}
                        onPress={() => setSelectedSubId('all')}
                      >
                        <Text
                          style={[
                            styles.subTabText,
                            selectedSubId === 'all' && styles.subTabTextActive,
                          ]}
                        >
                          • Tous
                        </Text>
                      </TouchableOpacity>

                      {parent.subCategories.map((sub) => {
                        const isSubActive = selectedSubId === sub.id;
                        return (
                          <TouchableOpacity
                            key={sub.id}
                            style={[
                              styles.subTab,
                              isSubActive && styles.subTabActive,
                            ]}
                            onPress={() => setSelectedSubId(sub.id)}
                          >
                            <Text
                              style={[
                                styles.subTabText,
                                isSubActive && styles.subTabTextActive,
                              ]}
                              numberOfLines={2}
                            >
                              • {sub.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* RIGHT MAIN CONTENT AREA (Products Grid & Sub-Category Banners) */}
        <View style={styles.rightContent}>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.rightScroll}>
            {/* Top Sub-category Banner Card */}
            <TouchableOpacity
              style={styles.allProductsBanner}
              onPress={() => setSelectedSubId('all')}
              activeOpacity={0.85}
            >
              <View>
                <Text style={styles.allProductsTitle}>{activeParent.label}</Text>
                <Text style={styles.allProductsSub}>
                  {selectedSubId === 'all'
                    ? 'Tous les articles'
                    : activeParent.subCategories.find((s) => s.id === selectedSubId)?.label || 'Sélection'}
                </Text>
              </View>
              <ChevronRight size={18} color="#4F46E5" />
            </TouchableOpacity>

            {loading ? (
              <View style={styles.loadingBox}>
                <ActivityIndicator size="large" color="#4F46E5" />
                <Text style={styles.loadingText}>Chargement...</Text>
              </View>
            ) : filteredProducts.length === 0 ? (
              <View style={styles.emptyBox}>
                <ShoppingBag size={36} color="#CBD5E1" />
                <Text style={styles.emptyTitle}>Aucun produit trouvés</Text>
                <Text style={styles.emptySub}>
                  Aucun article n'est disponible dans cette sous-catégorie.
                </Text>
              </View>
            ) : (
              <View style={styles.grid}>
                {filteredProducts.map((prod) => {
                  const isFav = isFavorite(prod.id);
                  return (
                    <TouchableOpacity
                      key={prod.id}
                      style={styles.card}
                      onPress={() => router.push(`/product/${prod.id}` as any)}
                      activeOpacity={0.9}
                    >
                      <View style={styles.imageBox}>
                        {prod.image_url ? (
                          <Image source={{ uri: prod.image_url }} style={styles.cardImg} resizeMode="cover" />
                        ) : (
                          <View style={styles.imgPlaceholder}>
                            <ShoppingBag size={24} color="#CBD5E1" />
                          </View>
                        )}

                        <TouchableOpacity
                          style={styles.favBtn}
                          onPress={() => handleToggleFav(prod)}
                        >
                          <Heart size={14} color={isFav ? '#EF4444' : '#64748B'} fill={isFav ? '#EF4444' : 'none'} />
                        </TouchableOpacity>
                      </View>

                      <View style={styles.cardBody}>
                        <Text style={styles.cardShop} numberOfLines={1}>{prod.shop_name}</Text>
                        <Text style={styles.cardTitle} numberOfLines={2}>{prod.title}</Text>

                        <View style={styles.priceRow}>
                          <Text style={styles.cardPrice}>{formatPrice(prod.price)}</Text>
                          <TouchableOpacity
                            style={styles.addCartBtn}
                            onPress={() => handleAddToCart(prod)}
                          >
                            <Plus size={14} color="#FFFFFF" />
                          </TouchableOpacity>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </ScrollView>
        </View>

      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  toastNotice: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 999,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  headerBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    gap: 10,
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 20,
    paddingHorizontal: 12,
    height: 40,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 13,
    color: '#0F172A',
  },
  cartBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  splitContainer: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
  },
  leftSidebar: {
    width: '28%',
    backgroundColor: '#F1F5F9',
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  parentSection: {
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  parentTab: {
    paddingVertical: 12,
    paddingHorizontal: 8,
    position: 'relative',
    backgroundColor: '#F1F5F9',
  },
  parentTabActive: {
    backgroundColor: '#FFFFFF',
  },
  activeIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: '#4F46E5',
  },
  parentTabText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#475569',
  },
  parentTabTextActive: {
    fontSize: 11,
    fontWeight: '900',
    color: '#4F46E5',
  },
  subList: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 4,
    paddingLeft: 4,
  },
  subTab: {
    paddingVertical: 6,
    paddingHorizontal: 6,
  },
  subTabActive: {
    backgroundColor: '#EEF2FF',
    borderRadius: 6,
  },
  subTabText: {
    fontSize: 10,
    color: '#64748B',
    fontWeight: '500',
  },
  subTabTextActive: {
    fontSize: 10,
    color: '#4F46E5',
    fontWeight: '800',
  },
  rightContent: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  rightScroll: {
    padding: 8,
    gap: 8,
  },
  allProductsBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    padding: 10,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  allProductsTitle: {
    fontSize: 13,
    fontWeight: '900',
    color: '#4F46E5',
  },
  allProductsSub: {
    fontSize: 10,
    color: '#6366F1',
    fontWeight: '600',
  },
  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
  },
  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 10,
    color: '#64748B',
    textAlign: 'center',
    paddingHorizontal: 16,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    rowGap: 8,
  },
  card: {
    width: '48.5%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  imageBox: {
    width: '100%',
    aspectRatio: 1,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  cardImg: {
    width: '100%',
    height: '100%',
  },
  imgPlaceholder: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favBtn: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 1,
  },
  cardBody: {
    padding: 6,
    gap: 2,
  },
  cardShop: {
    fontSize: 8.5,
    color: '#4F46E5',
    fontWeight: '800',
  },
  cardTitle: {
    fontSize: 10.5,
    fontWeight: '700',
    color: '#0F172A',
    lineHeight: 14,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 3,
  },
  cardPrice: {
    fontSize: 11,
    fontWeight: '900',
    color: '#0F172A',
  },
  addCartBtn: {
    width: 24,
    height: 24,
    borderRadius: 6,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
