import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Image,
  ActivityIndicator,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import {
  Package,
  Plus,
  Search,
  Filter,
  Trash2,
  Edit3,
  Check,
  AlertCircle,
} from 'lucide-react-native';

interface ProductItem {
  id: string;
  title: string;
  description?: string;
  price: number;
  old_price?: number;
  stock_quantity: number;
  category: string;
  status?: string;
  product_media?: { url: string }[];
}

export default function SellerProductsScreen() {
  const router = useRouter();
  const { shop, user } = useAuth();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categoriesList = ['all', 'Électronique', 'Mode', 'Maison', 'Beauté & Santé', 'Accessoires'];

  const fetchProducts = async () => {
    try {
      const targetShopId = shop?.id || user?.id;
      if (!targetShopId) return;

      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, old_price, stock_quantity, category, status, product_media(url)')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data as ProductItem[]);
      }
    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [shop, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchProducts();
  };

  const handleDeleteProduct = (productId: string, title: string) => {
    Alert.alert(
      'Supprimer cet article ?',
      `Êtes-vous sûr de vouloir supprimer "${title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            await supabase.from('products').delete().eq('id', productId);
            fetchProducts();
          },
        },
      ]
    );
  };

  const filteredProducts = products.filter(p => {
    const matchesSearch =
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
    return matchesSearch && matchesCat;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mes Produits</Text>
          <Text style={styles.subtitle}>Gérez votre inventaire et ajoutez de nouveaux articles.</Text>
        </View>

        <TouchableOpacity
          style={styles.newProductBtn}
          onPress={() => router.push('/product-editor')}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.newProductBtnText}>Nouveau Produit</Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit (nom, catégorie)..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        {/* Categories horizontal filter */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoriesScroll}
        >
          {categoriesList.map(cat => (
            <TouchableOpacity
              key={cat}
              style={[
                styles.categoryChip,
                selectedCategory === cat && styles.activeCategoryChip,
              ]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text
                style={[
                  styles.categoryChipText,
                  selectedCategory === cat && styles.activeCategoryChipText,
                ]}
              >
                {cat === 'all' ? 'Toutes les catégories' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Products List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Package size={36} color="#64748B" />
            </View>
            <Text style={styles.emptyTitle}>Aucun produit trouvé</Text>
            <Text style={styles.emptySubtitle}>
              {searchQuery
                ? 'Aucun résultat ne correspond à votre recherche.'
                : 'Votre catalogue est actuellement vide.'}
            </Text>
            <TouchableOpacity
              style={styles.emptyAddBtn}
              onPress={() => router.push('/product-editor')}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.emptyAddBtnText}>Ajouter mon premier produit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productList}>
            {filteredProducts.map(p => {
              const imgUrl = p.product_media?.[0]?.url;
              return (
                <View key={p.id} style={styles.productCard}>
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Package size={28} color="#94A3B8" />
                    </View>
                  )}

                  <View style={styles.productDetails}>
                    <Text style={styles.categoryBadge}>{p.category || 'Général'}</Text>
                    <Text style={styles.productTitle}>{p.title}</Text>
                    
                    <View style={styles.priceRow}>
                      <Text style={styles.productPrice}>
                        {Number(p.price).toLocaleString('fr-FR')} FCFA
                      </Text>
                      {!!p.old_price && (
                        <Text style={styles.productOldPrice}>
                          {Number(p.old_price).toLocaleString('fr-FR')} FCFA
                        </Text>
                      )}
                    </View>

                    <View style={styles.stockRow}>
                      <View
                        style={[
                          styles.stockDot,
                          { backgroundColor: Number(p.stock_quantity) > 0 ? '#22C55E' : '#EF4444' },
                        ]}
                      />
                      <Text style={styles.stockText}>
                        {Number(p.stock_quantity) > 0
                          ? `En stock (${p.stock_quantity})`
                          : 'Rupture de stock'}
                      </Text>
                    </View>
                  </View>

                  {/* Actions (Edit / Delete) */}
                  <View style={styles.actionButtonsCol}>
                    <TouchableOpacity
                      style={styles.iconBtn}
                      onPress={() =>
                        router.push({
                          pathname: '/product-editor',
                          params: { id: p.id },
                        } as any)
                      }
                    >
                      <Edit3 size={18} color="#4F46E5" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.iconBtn, { backgroundColor: '#FEF2F2' }]}
                      onPress={() => handleDeleteProduct(p.id, p.title)}
                    >
                      <Trash2 size={18} color="#DC2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  newProductBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  newProductBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingHorizontal: 12,
    height: 46,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: '#0F172A',
  },
  categoriesScroll: {
    paddingVertical: 12,
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
  },
  activeCategoryChip: {
    backgroundColor: '#4F46E5',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  activeCategoryChipText: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  emptyContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    padding: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 20,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyAddBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  emptyAddBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  productList: {
    gap: 12,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
  },
  productImage: {
    width: 74,
    height: 74,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  productImagePlaceholder: {
    width: 74,
    height: 74,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productDetails: {
    flex: 1,
    marginLeft: 12,
  },
  categoryBadge: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  productTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4F46E5',
  },
  productOldPrice: {
    fontSize: 12,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  stockRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  stockDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#64748B',
  },
  actionButtonsCol: {
    gap: 8,
    marginLeft: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
