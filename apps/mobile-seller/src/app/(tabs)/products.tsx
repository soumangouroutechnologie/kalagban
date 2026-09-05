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
  moderation_status?: "pending_review" | "approved" | "rejected";
  rejection_reason?: string | null;
  product_media?: { url: string }[];
}

interface ProductPromoInfo {
  campaign_title: string;
  discount_percentage: number;
  special_price?: number;
  stock_allocated: number;
}

export default function SellerProductsScreen() {
  const router = useRouter();
  const { shop, user } = useAuth();

  const [products, setProducts] = useState<ProductItem[]>([]);
  const [productPromos, setProductPromos] = useState<Map<string, ProductPromoInfo>>(new Map());
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [moderationTab, setModerationTab] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const categoriesList = ['all', 'Électronique', 'Mode', 'Maison', 'Beauté & Santé', 'Accessoires'];

  const pendingCount = products.filter(p => p.moderation_status === 'pending_review').length;
  const approvedCount = products.filter(p => p.moderation_status === 'approved' || (!p.moderation_status && p.status === 'active')).length;
  const rejectedCount = products.filter(p => p.moderation_status === 'rejected').length;

  const fetchProducts = async () => {
    try {
      let targetShopId = shop?.id || user?.id;
      if (!targetShopId) {
        const { data: { session } } = await supabase.auth.getSession();
        targetShopId = session?.user?.id;
      }
      if (!targetShopId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const { data, error } = await supabase
        .from('products')
        .select('id, title, description, price, old_price, stock_quantity, category, status, moderation_status, rejection_reason, product_media(url)')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setProducts(data as ProductItem[]);
      }

      // Fetch Active Promotional Campaigns linked to these products
      const { data: promoData } = await supabase
        .from('campaign_products')
        .select(`
          product_id,
          discount_percentage,
          special_price,
          stock_allocated,
          promotional_campaigns ( title, status )
        `);

      const promoMap = new Map<string, ProductPromoInfo>();
      if (promoData) {
        promoData.forEach((item: any) => {
          if (item.promotional_campaigns?.status === 'active') {
            promoMap.set(item.product_id, {
              campaign_title: item.promotional_campaigns.title,
              discount_percentage: Number(item.discount_percentage) || 20,
              special_price: item.special_price ? Number(item.special_price) : undefined,
              stock_allocated: Number(item.stock_allocated) || 50,
            });
          }
        });
      }
      setProductPromos(promoMap);

    } catch (err) {
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts();

    const channel = supabase
      .channel("mobile_seller_products_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchProducts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_products" }, () => {
        fetchProducts();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "promotional_campaigns" }, () => {
        fetchProducts();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    
    let matchesMod = true;
    if (moderationTab === 'pending') matchesMod = p.moderation_status === 'pending_review';
    else if (moderationTab === 'approved') matchesMod = p.moderation_status === 'approved' || (!p.moderation_status && p.status === 'active');
    else if (moderationTab === 'rejected') matchesMod = p.moderation_status === 'rejected';

    return matchesSearch && matchesCat && matchesMod;
  });

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Mes Produits</Text>
          <Text style={styles.subtitle}>Gérez votre inventaire et suivez la modération.</Text>
        </View>

        <TouchableOpacity
          style={styles.newProductBtn}
          onPress={() => router.push('/product-editor')}
          activeOpacity={0.85}
        >
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.newProductBtnText}>Ajouter</Text>
        </TouchableOpacity>
      </View>

      {/* Moderation Status Tabs */}
      <View style={styles.modTabsContainer}>
        <TouchableOpacity
          style={[styles.modTab, moderationTab === 'all' && styles.activeModTab]}
          onPress={() => setModerationTab('all')}
        >
          <Text style={[styles.modTabText, moderationTab === 'all' && styles.activeModTabText]}>
            Tous ({products.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modTab, moderationTab === 'pending' && styles.activePendingTab]}
          onPress={() => setModerationTab('pending')}
        >
          <Text style={[styles.modTabText, moderationTab === 'pending' && styles.activePendingTabText]}>
            ⏳ En attente ({pendingCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modTab, moderationTab === 'approved' && styles.activeApprovedTab]}
          onPress={() => setModerationTab('approved')}
        >
          <Text style={[styles.modTabText, moderationTab === 'approved' && styles.activeApprovedTabText]}>
            🟢 En ligne ({approvedCount})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.modTab, moderationTab === 'rejected' && styles.activeRejectedTab]}
          onPress={() => setModerationTab('rejected')}
        >
          <Text style={[styles.modTabText, moderationTab === 'rejected' && styles.activeRejectedTabText]}>
            ❌ Refusés ({rejectedCount})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher un produit..."
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
                {cat === 'all' ? 'Toutes catégories' : cat}
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
              const rawUrl = p.product_media?.[0]?.url;
              const imgUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:image')) ? rawUrl : null;
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
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 2 }}>
                      <Text style={styles.categoryBadge}>{p.category || 'Général'}</Text>
                      {p.moderation_status === 'pending_review' ? (
                        <View style={styles.moderationPendingBadge}>
                          <Text style={styles.moderationPendingText}>⏳ En attente</Text>
                        </View>
                      ) : p.moderation_status === 'rejected' ? (
                        <View style={styles.moderationRejectedBadge}>
                          <Text style={styles.moderationRejectedText}>❌ Rejeté</Text>
                        </View>
                      ) : (
                        <View style={styles.moderationApprovedBadge}>
                          <Text style={styles.moderationApprovedText}>🟢 En ligne</Text>
                        </View>
                      )}
                    </View>

                    <Text style={styles.productTitle} numberOfLines={1}>{p.title}</Text>
                    
                    {/* Active Promo Campaign Badge */}
                    {productPromos.has(p.id) && (() => {
                      const promo = productPromos.get(p.id)!;
                      return (
                        <View style={styles.promoBadgeContainer}>
                          <View style={styles.promoTagBadge}>
                            <Text style={styles.promoTagText} numberOfLines={1}>
                              🔥 {promo.campaign_title} (-{promo.discount_percentage}%)
                            </Text>
                          </View>
                          {promo.special_price ? (
                            <Text style={styles.promoPriceDetail}>
                              Prix Promo Mobile : {Number(promo.special_price).toLocaleString('fr-FR')} F
                            </Text>
                          ) : null}
                        </View>
                      );
                    })()}

                    <View style={styles.priceRow}>
                      {productPromos.has(p.id) ? (
                        <>
                          <Text style={[styles.productPrice, { color: '#EA580C', fontWeight: '900' }]}>
                            {Number(productPromos.get(p.id)!.special_price || Math.round(Number(p.price) * (1 - productPromos.get(p.id)!.discount_percentage / 100))).toLocaleString('fr-FR')} FCFA
                          </Text>
                          <Text style={styles.productOldPrice}>
                            {Number(p.price).toLocaleString('fr-FR')} FCFA
                          </Text>
                        </>
                      ) : (
                        <>
                          <Text style={styles.productPrice}>
                            {Number(p.price).toLocaleString('fr-FR')} FCFA
                          </Text>
                          {!!p.old_price && (
                            <Text style={styles.productOldPrice}>
                              {Number(p.old_price).toLocaleString('fr-FR')} FCFA
                            </Text>
                          )}
                        </>
                      )}
                    </View>

                    {p.moderation_status === 'rejected' && !!p.rejection_reason && (
                      <Text style={styles.rejectionReasonText} numberOfLines={1}>
                        Motif : {p.rejection_reason}
                      </Text>
                    )}

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
  modTabsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingTop: 12,
    gap: 8,
    flexWrap: 'wrap',
  },
  modTab: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  activeModTab: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  activePendingTab: {
    backgroundColor: '#D97706',
    borderColor: '#D97706',
  },
  activeApprovedTab: {
    backgroundColor: '#16A34A',
    borderColor: '#16A34A',
  },
  activeRejectedTab: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  modTabText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  activeModTabText: {
    color: '#FFFFFF',
  },
  activePendingTabText: {
    color: '#FFFFFF',
  },
  activeApprovedTabText: {
    color: '#FFFFFF',
  },
  activeRejectedTabText: {
    color: '#FFFFFF',
  },
  searchSection: {
    paddingHorizontal: 20,
    paddingTop: 12,
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
  productPriceWithPromo: {
    color: '#EA580C',
  },
  promoBadgeContainer: {
    marginVertical: 3,
    gap: 2,
  },
  promoTagBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  promoTagText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#C2410C',
  },
  promoPriceDetail: {
    fontSize: 10,
    fontWeight: '800',
    color: '#EA580C',
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
  moderationPendingBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  moderationPendingText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
  },
  moderationApprovedBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  moderationApprovedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#047857',
  },
  moderationRejectedBadge: {
    backgroundColor: '#FEF2F2',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  moderationRejectedText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B91C1C',
  },
  rejectionReasonText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#DC2626',
    marginTop: 2,
  },
});
