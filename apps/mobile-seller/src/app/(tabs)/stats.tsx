import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Image,
} from 'react-native';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import {
  TrendingUp,
  DollarSign,
  Package,
  Users,
  Star,
  Rocket,
  Wallet,
  Clock,
  CheckCircle2,
  ArrowUp,
  Banknote,
  Sparkles,
} from 'lucide-react-native';

interface TopProductItem {
  id: string;
  name: string;
  price: string;
  sales: number;
  image?: string;
}

export default function SellerStatsScreen() {
  const { shop, user } = useAuth();

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Wallet
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);

  // KPIs
  const [periodEarnings, setPeriodEarnings] = useState(0);
  const [periodItemsSold, setPeriodItemsSold] = useState(0);
  const [visitorsCount, setVisitorsCount] = useState(0);

  // Top Products
  const [topProducts, setTopProducts] = useState<TopProductItem[]>([]);

  const fetchStats = useCallback(async () => {
    try {
      let targetShopId = shop?.id || user?.id;
      if (!targetShopId) {
        const { data: { session } } = await supabase.auth.getSession();
        targetShopId = session?.user?.id;
      }
      if (!targetShopId) return;

      // 1. Fetch Orders for this shop
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, subtotal, status, created_at')
        .eq('shop_id', targetShopId);

      // Determine date cutoff based on period
      let startDate: Date | null = null;
      const now = new Date();
      if (period === 'today') {
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      } else if (period === 'week') {
        const day = now.getDay();
        const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
        startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0);
      } else if (period === 'month') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      }

      let totalSalesInPeriod = 0;
      let deliveredGross = 0;
      let inTransitGross = 0;
      const periodOrderIds: string[] = [];

      if (orders) {
        orders.forEach((o) => {
          if (o.status !== 'cancelled') {
            const amount = Number(o.subtotal || o.total_amount || 0);
            const orderDate = new Date(o.created_at);

            // Wallet calculation (lifetime)
            if (o.status === 'delivered' || o.status === 'picked_up') {
              deliveredGross += amount;
            } else {
              inTransitGross += amount;
            }

            // Period KPIs calculation
            if (!startDate || orderDate >= startDate) {
              totalSalesInPeriod += amount;
              periodOrderIds.push(o.id);
            }
          }
        });
      }

      setPeriodEarnings(totalSalesInPeriod);

      // 2. Fetch Payouts to subtract from available balance
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('amount, status')
        .eq('shop_id', targetShopId);

      let paidOutAmount = 0;
      if (payoutsData) {
        payoutsData.forEach((p) => {
          if (p.status === 'processed' || p.status === 'pending') {
            paidOutAmount += Number(p.amount || 0);
          }
        });
      }

      // Net calculations (5% Kalagban commission)
      const commissionRate = 0.05;
      const netDelivered = Math.round(deliveredGross * (1 - commissionRate));
      const calcAvailable = Math.max(0, netDelivered - paidOutAmount);
      const calcPending = Math.round(inTransitGross * (1 - commissionRate));

      setAvailableBalance(calcAvailable);
      setPendingBalance(calcPending);

      // 3. Fetch Order Items for the selected period to calculate items sold & top products
      let totalItems = 0;
      const productSalesMap: Record<string, number> = {};

      if (periodOrderIds.length > 0) {
        const { data: orderItems } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .in('order_id', periodOrderIds);

        if (orderItems) {
          orderItems.forEach((item) => {
            const q = Number(item.quantity) || 1;
            totalItems += q;
            productSalesMap[item.product_id] = (productSalesMap[item.product_id] || 0) + q;
          });
        }
      }

      setPeriodItemsSold(totalItems);

      // Top Products details
      const topIds = Object.keys(productSalesMap)
        .sort((a, b) => productSalesMap[b] - productSalesMap[a])
        .slice(0, 5);

      if (topIds.length > 0) {
        const { data: productsData } = await supabase
          .from('products')
          .select('id, title, price, image_url, product_media(url)')
          .in('id', topIds);

        if (productsData) {
          const formatted: TopProductItem[] = productsData.map((p: any) => ({
            id: p.id,
            name: p.title,
            price: `${Number(p.price || 0).toLocaleString('fr-FR')} FCFA`,
            sales: productSalesMap[p.id] || 0,
            image: p.image_url || (p.product_media && p.product_media.length > 0 ? p.product_media[0].url : undefined),
          })).sort((a, b) => b.sales - a.sales);

          setTopProducts(formatted);
        } else {
          setTopProducts([]);
        }
      } else {
        setTopProducts([]);
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shop, user, period]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchStats();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TrendingUp size={24} color="#4F46E5" />
          <Text style={styles.title}>Mes Résultats &amp; Portefeuille</Text>
        </View>
        <Text style={styles.subtitle}>Suivi en direct de votre activité et de vos gains.</Text>

        {/* Time Period Selector Chips */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodChip, period === 'today' && styles.activePeriodChip]}
            onPress={() => setPeriod('today')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodChipText, period === 'today' && styles.activePeriodChipText]}>
              Aujourd&apos;hui
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodChip, period === 'week' && styles.activePeriodChip]}
            onPress={() => setPeriod('week')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodChipText, period === 'week' && styles.activePeriodChipText]}>
              Cette semaine
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodChip, period === 'month' && styles.activePeriodChip]}
            onPress={() => setPeriod('month')}
            activeOpacity={0.8}
          >
            <Text style={[styles.periodChipText, period === 'month' && styles.activePeriodChipText]}>
              Ce mois-ci
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* SECTION PORTEFEUILLE VENDEUR */}
        <View style={styles.walletCard}>
          <View style={styles.walletHeaderRow}>
            <View style={styles.walletIconCircle}>
              <Wallet size={18} color="#A5B4FC" />
            </View>
            <Text style={styles.walletHeaderText}>PORTEFEUILLE VENDEUR KALAGBAN</Text>
          </View>

          <View style={styles.walletMainRow}>
            <View style={styles.walletBalanceBlock}>
              <Text style={styles.walletBalanceLabel}>Solde Disponible au Retrait</Text>
              <Text style={styles.walletBalanceValue}>
                {availableBalance.toLocaleString('fr-FR')}{' '}
                <Text style={styles.walletCurrency}>FCFA</Text>
              </Text>
            </View>

            <View style={styles.walletPendingDivider} />

            <View style={styles.walletPendingBlock}>
              <Text style={styles.walletPendingLabel}>En cours (Livraison)</Text>
              <Text style={styles.walletPendingValue}>
                {pendingBalance.toLocaleString('fr-FR')}{' '}
                <Text style={styles.walletPendingCurrency}>FCFA</Text>
              </Text>
            </View>
          </View>

          <Text style={styles.walletNotice}>
            * Vos gains sont débloqués dès que le client récupère son colis au Point Relais. Commission Kalagban déduite : 5%.
          </Text>
        </View>

        {/* Metric Cards Grid */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Chiffre d'Affaires Brut */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#ECFDF5' }]}>
              <Banknote size={26} color="#10B981" />
            </View>
            <Text style={styles.metricValue}>
              {periodEarnings.toLocaleString('fr-FR')} FCFA
            </Text>
            <Text style={styles.metricLabel}>Chiffre d&apos;Affaires Brut</Text>
            <View style={styles.trendBadge}>
              <Text style={[styles.trendBadgeText, periodEarnings > 0 ? styles.trendUpText : null]}>
                {periodEarnings > 0 ? '↗ En hausse' : 'Stable'}
              </Text>
            </View>
          </View>

          {/* Card 2: Articles vendus */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <Package size={26} color="#4F46E5" />
            </View>
            <Text style={styles.metricValue}>{periodItemsSold}</Text>
            <Text style={styles.metricLabel}>Articles vendus</Text>
            <View style={styles.trendBadge}>
              <Text style={[styles.trendBadgeText, periodItemsSold > 0 ? styles.trendUpText : null]}>
                {periodItemsSold > 0 ? '↗ En hausse' : 'Stable'}
              </Text>
            </View>
          </View>

          {/* Card 3: Visiteurs */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0F9FF' }]}>
              <Users size={26} color="#0284C7" />
            </View>
            <Text style={styles.metricValue}>{visitorsCount}</Text>
            <Text style={styles.metricLabel}>Visiteurs boutique</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendBadgeText}>Stable</Text>
            </View>
          </View>
        </View>

        {/* Articles les plus vendus */}
        <View style={styles.topProductsCard}>
          <View style={styles.topProductsHeader}>
            <Star size={18} color="#D97706" />
            <Text style={styles.topProductsTitle}>Articles les plus vendus</Text>
          </View>

          {topProducts.length > 0 ? (
            <View style={styles.topProductsList}>
              {topProducts.map((prod, index) => (
                <View key={prod.id || index} style={styles.topProductRow}>
                  <View style={styles.topProductImageWrapper}>
                    {prod.image ? (
                      <Image source={{ uri: prod.image }} style={styles.topProductImage} />
                    ) : (
                      <View style={styles.topProductImagePlaceholder}>
                        <Package size={20} color="#94A3B8" />
                      </View>
                    )}
                  </View>
                  <View style={styles.topProductInfo}>
                    <Text style={styles.topProductName} numberOfLines={1}>
                      {prod.name}
                    </Text>
                    <Text style={styles.topProductPrice}>{prod.price}</Text>
                  </View>
                  <View style={styles.salesBadge}>
                    <Text style={styles.salesBadgeText}>{prod.sales} vendus</Text>
                  </View>
                </View>
              ))}
            </View>
          ) : (
            <View style={styles.emptyTopProductsBox}>
              <Text style={styles.emptyTopProductsText}>
                Aucun article vendu sur cette période.
              </Text>
            </View>
          )}
        </View>

        {/* Encouragement Footer Banner */}
        <View style={styles.rocketBanner}>
          <Rocket size={24} color="#4F46E5" style={{ marginRight: 10 }} />
          <Text style={styles.rocketBannerText}>
            🚀 Partagez vos articles sur WhatsApp et les réseaux sociaux pour faire décoller vos ventes !
          </Text>
        </View>
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 14,
    fontWeight: '500',
  },
  periodRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 14,
    padding: 4,
  },
  periodChip: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 10,
  },
  activePeriodChip: {
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOpacity: 0.25,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 2,
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activePeriodChipText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  /* Wallet Card */
  walletCard: {
    backgroundColor: '#0F172A',
    borderRadius: 24,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#1E293B',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowOffset: { width: 0, height: 6 },
    shadowRadius: 10,
    elevation: 4,
  },
  walletHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  walletIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: 'rgba(99, 102, 241, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  walletHeaderText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#A5B4FC',
    letterSpacing: 0.8,
  },
  walletMainRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
  },
  walletBalanceBlock: {
    flex: 1.2,
  },
  walletBalanceLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  walletBalanceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#34D399',
  },
  walletCurrency: {
    fontSize: 13,
    fontWeight: '700',
    color: '#A7F3D0',
  },
  walletPendingDivider: {
    width: 1,
    height: 38,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    marginHorizontal: 12,
  },
  walletPendingBlock: {
    flex: 1,
  },
  walletPendingLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginBottom: 2,
  },
  walletPendingValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FBBF24',
  },
  walletPendingCurrency: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FDE68A',
  },
  walletNotice: {
    fontSize: 10,
    color: '#64748B',
    lineHeight: 14,
  },
  /* Metrics Grid */
  metricsGrid: {
    gap: 12,
    marginBottom: 16,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 1,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  metricValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 3,
  },
  metricLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  trendBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  trendUpText: {
    color: '#16A34A',
  },
  /* Top Products */
  topProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 16,
  },
  topProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  topProductsTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  topProductsList: {
    gap: 10,
  },
  topProductRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8FAFC',
    borderRadius: 14,
    padding: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  topProductImageWrapper: {
    width: 44,
    height: 44,
    borderRadius: 10,
    overflow: 'hidden',
    backgroundColor: '#E2E8F0',
    marginRight: 10,
  },
  topProductImage: {
    width: '100%',
    height: '100%',
  },
  topProductImagePlaceholder: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topProductInfo: {
    flex: 1,
  },
  topProductName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 2,
  },
  topProductPrice: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
  salesBadge: {
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  salesBadgeText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#15803D',
  },
  emptyTopProductsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTopProductsText: {
    fontSize: 13,
    color: '#94A3B8',
    fontWeight: '500',
  },
  rocketBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    padding: 16,
    borderRadius: 18,
  },
  rocketBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
    color: '#3730A3',
    lineHeight: 17,
  },
});
