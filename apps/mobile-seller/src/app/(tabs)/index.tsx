import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import {
  Store,
  Sparkles,
  TrendingUp,
  Package,
  Eye,
  AlertTriangle,
  Plus,
  ArrowRight,
  Bell,
  Search,
  CheckCircle2,
  Clock,
} from 'lucide-react-native';

interface DashboardProduct {
  id: string;
  title: string;
  price: number;
  stock_quantity: number;
  category: string;
  product_media?: { url: string }[];
}

interface DashboardOrder {
  id: string;
  total_amount: number;
  status: string;
  customer_name: string;
  created_at: string;
}

export default function SellerDashboardScreen() {
  const router = useRouter();
  const { shop, user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, authLoading]);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    productViews: 0,
    outOfStockCount: 0,
    pendingOrdersCount: 0,
  });

  const [recentProducts, setRecentProducts] = useState<DashboardProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);

  const fetchDashboardData = async () => {
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

      // 1. Fetch Orders for this shop
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, status, customer_name, created_at')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false });

      if (orders) {
        const revenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const pending = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
        setStats(prev => ({
          ...prev,
          totalRevenue: revenue,
          totalOrders: orders.length,
          pendingOrdersCount: pending,
        }));
        setRecentOrders(orders.slice(0, 3) as DashboardOrder[]);
      }

      // 2. Fetch Products for this shop
      const { data: prods } = await supabase
        .from('products')
        .select('id, title, price, stock_quantity, category, product_media(url)')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false });

      if (prods) {
        const outOfStock = prods.filter(p => Number(p.stock_quantity) <= 0).length;
        setStats(prev => ({
          ...prev,
          outOfStockCount: outOfStock,
        }));
        setRecentProducts(prods.slice(0, 4) as DashboardProduct[]);
      }
    } catch (err) {
      console.error('Error fetching seller dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [shop, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topHeader}>
        <View style={styles.shopIdentityGroup}>
          <View style={styles.shopAvatarBox}>
            {shop?.logo_url ? (
              <Image source={{ uri: shop.logo_url }} style={styles.shopAvatarImage} />
            ) : (
              <Store size={22} color="#4F46E5" />
            )}
          </View>
          <View>
            <Text style={styles.shopWelcomeLabel}>VENDEUR</Text>
            <Text style={styles.shopNameText}>{shop?.name || 'Ma Boutique'}</Text>
          </View>
        </View>

        <TouchableOpacity style={styles.iconCircleButton}>
          <Bell size={20} color="#334155" />
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* Promotional Hero Banner (Matching captured web dashboard) */}
        <View style={styles.heroBanner}>
          <View style={styles.onlineBadge}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineBadgeText}>VOTRE BOUTIQUE EST EN LIGNE</Text>
          </View>

          <Text style={styles.heroTitle}>Développez votre audience avec Kalagban ✨</Text>
          <Text style={styles.heroSubtitle}>
            Consultez vos statistiques en temps réel, gérez vos stocks et expédiez vos commandes rapidement.
          </Text>

          <TouchableOpacity
            style={styles.heroCTAButton}
            onPress={() => router.push('/product-editor')}
            activeOpacity={0.85}
          >
            <Text style={styles.heroCTAButtonText}>Créer un produit</Text>
            <ArrowRight size={16} color="#4F46E5" />
          </TouchableOpacity>
        </View>

        {/* Aperçu de la Boutique - KPI Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Aperçu de la boutique</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/stats')}>
            <Text style={styles.seeMoreLink}>Voir les détails</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiGrid}>
          {/* Card 1: Ventes générées */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
              <TrendingUp size={20} color="#4F46E5" />
            </View>
            <Text style={styles.kpiLabel}>Ventes générées</Text>
            <Text style={styles.kpiValue}>
              {stats.totalRevenue.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>

          {/* Card 2: Commandes */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Package size={20} color="#16A34A" />
            </View>
            <Text style={styles.kpiLabel}>Commandes</Text>
            <Text style={styles.kpiValue}>{stats.totalOrders}</Text>
          </View>

          {/* Card 3: Vues produits (30j) */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Eye size={20} color="#2563EB" />
            </View>
            <Text style={styles.kpiLabel}>Vues produits (30j)</Text>
            <Text style={styles.kpiValue}>{stats.productViews}</Text>
          </View>

          {/* Card 4: En rupture */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={20} color="#DC2626" />
            </View>
            <Text style={styles.kpiLabel}>En rupture</Text>
            <Text style={styles.kpiValue}>{stats.outOfStockCount}</Text>
          </View>
        </View>

        {/* Commandes Récentes Urgent Block */}
        <View style={styles.recentOrdersCard}>
          <View style={styles.recentOrdersHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#4F46E5" />
              <Text style={styles.recentOrdersTitle}>Commandes Récentes</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.seeMoreLink}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyOrdersSubBox}>
              <Text style={styles.emptyText}>Aucune commande récente pour le moment.</Text>
            </View>
          ) : (
            recentOrders.map(ord => (
              <View key={ord.id} style={styles.orderRowItem}>
                <View>
                  <Text style={styles.orderCustomerText}>{ord.customer_name || 'Client Kalagban'}</Text>
                  <Text style={styles.orderDateText}>
                    {new Date(ord.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderAmountText}>
                    {Number(ord.total_amount).toLocaleString('fr-FR')} FCFA
                  </Text>
                  <View style={styles.statusBadge}>
                    <Text style={styles.statusBadgeText}>{ord.status}</Text>
                  </View>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.processOrdersBtn}
            onPress={() => router.push('/(tabs)/orders')}
            activeOpacity={0.85}
          >
            <Text style={styles.processOrdersBtnText}>Traiter les commandes</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Produits Récemment Ajoutés */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Produits récemment ajoutés</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/products')}>
            <Text style={styles.seeMoreLink}>Voir tout le catalogue</Text>
          </TouchableOpacity>
        </View>

        {recentProducts.length === 0 ? (
          <View style={styles.emptyProductsCard}>
            <View style={styles.emptyIconCircle}>
              <Package size={32} color="#64748B" />
            </View>
            <Text style={styles.emptyProductsTitle}>Aucun produit</Text>
            <Text style={styles.emptyProductsSubtitle}>
              Vous n'avez pas encore de produits dans votre boutique. Lancez-vous !
            </Text>
            <TouchableOpacity
              style={styles.addProductBtn}
              onPress={() => router.push('/product-editor')}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addProductBtnText}>Ajouter un produit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {recentProducts.map(item => {
              const rawUrl = item.product_media?.[0]?.url;
              const imgUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:image')) ? rawUrl : null;
              return (
                <View key={item.id} style={styles.productCardItem}>
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Package size={24} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.productCardBody}>
                    <Text style={styles.productCategory}>{item.category || 'Général'}</Text>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.productPrice}>
                      {Number(item.price).toLocaleString('fr-FR')} FCFA
                    </Text>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>
                        Stock: {item.stock_quantity}
                      </Text>
                    </View>
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
  topHeader: {
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
  shopIdentityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  shopAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  shopWelcomeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 1,
  },
  shopNameText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  iconCircleButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  heroBanner: {
    backgroundColor: '#1E1B4B',
    borderRadius: 24,
    padding: 20,
    marginBottom: 24,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 6,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    gap: 6,
    marginBottom: 12,
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineBadgeText: {
    color: '#E0E7FF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.8,
  },
  heroTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    lineHeight: 28,
    marginBottom: 8,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#C7D2FE',
    lineHeight: 18,
    marginBottom: 18,
  },
  heroCTAButton: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-start',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  heroCTAButtonText: {
    color: '#4F46E5',
    fontSize: 14,
    fontWeight: '800',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeMoreLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  kpiLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  recentOrdersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 24,
  },
  recentOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recentOrdersTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyOrdersSubBox: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  orderRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderCustomerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  orderAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  statusBadge: {
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 2,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#D97706',
  },
  processOrdersBtn: {
    backgroundColor: '#4F46E5',
    height: 46,
    borderRadius: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    marginTop: 14,
  },
  processOrdersBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  emptyProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  emptyIconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyProductsSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  addProductBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addProductBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCardItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F1F5F9',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  productCardBody: {
    padding: 10,
  },
  productCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginVertical: 2,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4F46E5',
  },
  stockBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  stockBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#475569',
  },
});
