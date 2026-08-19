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
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Package,
  Clock,
  MapPin,
  ChevronRight,
  ShieldCheck,
  KeyRound,
  CheckCircle2,
  ShoppingBag,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';

interface OrderItem {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  pickup_otp?: string;
  relay_point_name?: string;
  commune?: string;
  created_at: string;
  items_summary?: string;
}

export default function OrderHistoryScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      let query = supabase.from('orders').select('*').order('created_at', { ascending: false });

      if (session?.user) {
        query = query.or(`customer_id.eq.${session.user.id},customer_email.eq.${session.user.email}`);
      } else {
        // If not logged in, limit 5 recent
        query = query.limit(5);
      }

      const { data, error } = await query;
      if (!error && data) {
        const formatted: OrderItem[] = data.map((o: any) => ({
          ...o,
          pickup_otp: o.pickup_code || o.pickup_otp,
        }));
        setOrders(formatted);
      } else {
        setOrders([]);
      }
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (amount: number) => {
    return (amount || 0).toLocaleString('fr-FR') + ' FCFA';
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ready_for_pickup':
        return { label: 'Prêt au Point Relais', bg: '#ECFDF5', text: '#047857' };
      case 'delivered':
        return { label: 'Livré / Retiré', bg: '#F1F5F9', text: '#475569' };
      case 'cancelled':
        return { label: 'Annulé', bg: '#FEE2E2', text: '#B91C1C' };
      default:
        return { label: 'En cours de préparation', bg: '#FEF3C7', text: '#B45309' };
    }
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => {
          if (router.canGoBack()) router.back();
          else router.replace('/');
        }}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Mes Commandes &amp; Codes OTP</Text>

        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Chargement de vos commandes...</Text>
        </View>
      ) : orders.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.packageCircle}>
            <Package size={44} color="#94A3B8" />
          </View>
          <Text style={styles.emptyTitle}>Aucune commande trouvée</Text>
          <Text style={styles.emptySub}>
            Vous n'avez pas encore passé de commande sur Kalagban.
          </Text>

          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => {
              if (router.canGoBack()) router.back();
              else router.replace('/');
            }}
            activeOpacity={0.85}
          >
            <ShoppingBag size={16} color="#FFFFFF" />
            <Text style={styles.exploreBtnText}>Explorer la Marketplace</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
          {orders.map((order) => {
            const badge = getStatusBadge(order.status);
            return (
              <TouchableOpacity
                key={order.id}
                style={styles.orderCard}
                onPress={() => router.push(`/orders/${order.id}` as any)}
                activeOpacity={0.85}
              >
                <View style={styles.orderHeader}>
                  <View>
                    <Text style={styles.orderNum}>Commande #{order.order_number || order.id.substring(0, 8)}</Text>
                    <View style={styles.dateRow}>
                      <Clock size={11} color="#64748B" />
                      <Text style={styles.dateText}>{formatDate(order.created_at)}</Text>
                    </View>
                  </View>

                  <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                    <Text style={[styles.statusText, { color: badge.text }]}>{badge.label}</Text>
                  </View>
                </View>

                {order.pickup_otp ? (
                  <View style={styles.otpBanner}>
                    <KeyRound size={16} color="#D97706" />
                    <Text style={styles.otpBannerLabel}>Code OTP Retrait :</Text>
                    <Text style={styles.otpBannerCode}>{order.pickup_otp}</Text>
                  </View>
                ) : null}

                {order.relay_point_name || order.commune ? (
                  <View style={styles.relayRow}>
                    <MapPin size={14} color="#6366F1" />
                    <Text style={styles.relayText}>
                      Point Relais : {order.relay_point_name || 'Sélectionné'} ({order.commune || 'Abidjan'})
                    </Text>
                  </View>
                ) : null}

                <View style={styles.orderFooter}>
                  <Text style={styles.totalPrice}>{formatPrice(order.total_amount)}</Text>
                  <View style={styles.detailBtn}>
                    <Text style={styles.detailBtnText}>Voir le reçu</Text>
                    <ChevronRight size={14} color="#4F46E5" />
                  </View>
                </View>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
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
  loadingBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 13,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  packageCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
  },
  exploreBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  scrollContent: {
    padding: 20,
    gap: 14,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  orderHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  orderNum: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
    color: '#64748B',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '800',
  },
  otpBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    gap: 6,
  },
  otpBannerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#92400E',
  },
  otpBannerCode: {
    fontSize: 15,
    fontWeight: '900',
    color: '#B45309',
    letterSpacing: 2,
    fontFamily: 'monospace',
  },
  relayRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  relayText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
    marginTop: 2,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  detailBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  detailBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4F46E5',
  },
});
