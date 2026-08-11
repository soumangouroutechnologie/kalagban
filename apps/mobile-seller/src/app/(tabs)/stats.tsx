import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
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
  Award,
} from 'lucide-react-native';

export default function SellerStatsScreen() {
  const { shop, user } = useAuth();

  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('week');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [analytics, setAnalytics] = useState({
    totalEarnings: 0,
    itemsSold: 0,
    visitorsCount: 124,
  });

  const fetchAnalytics = async () => {
    try {
      const targetShopId = shop?.id || user?.id;
      if (!targetShopId) return;

      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, created_at, order_items(quantity)')
        .eq('shop_id', targetShopId);

      if (orders) {
        const total = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        let itemsCount = 0;
        orders.forEach(o => {
          if (Array.isArray(o.order_items)) {
            o.order_items.forEach((item: any) => {
              itemsCount += Number(item.quantity) || 1;
            });
          }
        });

        setAnalytics(prev => ({
          ...prev,
          totalEarnings: total,
          itemsSold: itemsCount || orders.length,
        }));
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [shop, user, period]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTitleRow}>
          <TrendingUp size={24} color="#4F46E5" />
          <Text style={styles.title}>Mes Résultats</Text>
        </View>
        <Text style={styles.subtitle}>Résumé de votre activité sur la période sélectionnée.</Text>

        {/* Time Period Selector Chips */}
        <View style={styles.periodRow}>
          <TouchableOpacity
            style={[styles.periodChip, period === 'today' && styles.activePeriodChip]}
            onPress={() => setPeriod('today')}
          >
            <Text style={[styles.periodChipText, period === 'today' && styles.activePeriodChipText]}>
              Aujourd'hui
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodChip, period === 'week' && styles.activePeriodChip]}
            onPress={() => setPeriod('week')}
          >
            <Text style={[styles.periodChipText, period === 'week' && styles.activePeriodChipText]}>
              Cette semaine
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.periodChip, period === 'month' && styles.activePeriodChip]}
            onPress={() => setPeriod('month')}
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
        {/* Metric Cards Grid (Matching captured Image 2) */}
        <View style={styles.metricsGrid}>
          {/* Card 1: Argent gagné */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#EEF2FF' }]}>
              <DollarSign size={24} color="#4F46E5" />
            </View>
            <Text style={styles.metricValue}>
              {analytics.totalEarnings.toLocaleString('fr-FR')} FCFA
            </Text>
            <Text style={styles.metricLabel}>Argent gagné</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendBadgeText}>Stable</Text>
            </View>
          </View>

          {/* Card 2: Articles vendus */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#F0FDF4' }]}>
              <Package size={24} color="#16A34A" />
            </View>
            <Text style={styles.metricValue}>{analytics.itemsSold}</Text>
            <Text style={styles.metricLabel}>Articles vendus</Text>
            <View style={styles.trendBadge}>
              <Text style={styles.trendBadgeText}>Stable</Text>
            </View>
          </View>

          {/* Card 3: Visiteurs */}
          <View style={styles.metricCard}>
            <View style={[styles.iconCircle, { backgroundColor: '#EFF6FF' }]}>
              <Users size={24} color="#2563EB" />
            </View>
            <Text style={styles.metricValue}>{analytics.visitorsCount}</Text>
            <Text style={styles.metricLabel}>Visiteurs</Text>
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

          <View style={styles.emptyTopProductsBox}>
            <Text style={styles.emptyTopProductsText}>
              Aucun article vendu sur cette période.
            </Text>
          </View>
        </View>

        {/* Encouragement Footer Banner (Matching captured web interface) */}
        <View style={styles.rocketBanner}>
          <Rocket size={24} color="#4F46E5" style={{ marginRight: 10 }} />
          <Text style={styles.rocketBannerText}>
            🚀 C'est le moment de vous lancer ! Partagez votre boutique pour réaliser vos premières ventes.
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
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 14,
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
  },
  periodChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  activePeriodChipText: {
    color: '#FFFFFF',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  metricsGrid: {
    gap: 12,
    marginBottom: 20,
  },
  metricCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 24,
    fontWeight: '900',
    color: '#0F172A',
    marginBottom: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  trendBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  trendBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#475569',
  },
  topProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginBottom: 20,
  },
  topProductsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
  },
  topProductsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyTopProductsBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyTopProductsText: {
    fontSize: 13,
    color: '#94A3B8',
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
    fontSize: 13,
    fontWeight: '700',
    color: '#3730A3',
    lineHeight: 18,
  },
});
