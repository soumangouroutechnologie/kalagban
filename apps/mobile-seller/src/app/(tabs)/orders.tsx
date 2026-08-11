import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import {
  ShoppingBag,
  Search,
  Truck,
  CheckCircle2,
  Clock,
  XCircle,
  MapPin,
  Phone,
  User as UserIcon,
} from 'lucide-react-native';

interface OrderItem {
  id: string;
  customer_name: string;
  customer_phone?: string;
  shipping_address?: string;
  total_amount: number;
  status: 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  created_at: string;
  delivery_type?: string;
  pickup_code?: string;
}

export default function SellerOrdersScreen() {
  const { shop, user } = useAuth();

  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const fetchOrders = async () => {
    try {
      const targetShopId = shop?.id || user?.id;
      if (!targetShopId) return;

      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setOrders(data as OrderItem[]);
      }
    } catch (err) {
      console.error('Error fetching seller orders:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [shop, user]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };

  const handleUpdateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (!error) {
        Alert.alert('Statut mis à jour !', `La commande est maintenant "${newStatus}".`);
        fetchOrders();
      } else {
        Alert.alert('Erreur', 'Impossible de mettre à jour le statut.');
      }
    } catch (err) {
      console.error('Error updating order:', err);
    }
  };

  const pendingCount = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;

  const filteredOrders = orders.filter(o => {
    const matchesSearch =
      o.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (o.customer_phone && o.customer_phone.includes(searchQuery));

    const matchesStatus = statusFilter === 'all' || o.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return { label: 'En attente', bg: '#FEF3C7', color: '#D97706' };
      case 'processing':
        return { label: 'En préparation', bg: '#E0F2FE', color: '#0284C7' };
      case 'shipped':
        return { label: 'Expédiée', bg: '#EEF2FF', color: '#4F46E5' };
      case 'delivered':
        return { label: 'Livrée', bg: '#DCFCE7', color: '#16A34A' };
      case 'cancelled':
        return { label: 'Annulée', bg: '#FEE2E2', color: '#DC2626' };
      default:
        return { label: status, bg: '#F1F5F9', color: '#475569' };
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Commandes</Text>
          <Text style={styles.subtitle}>
            Vous avez <Text style={{ fontWeight: '800', color: '#4F46E5' }}>{pendingCount} commandes</Text> en attente d'expédition.
          </Text>
        </View>
      </View>

      {/* Status Filter Tabs */}
      <View style={styles.filterTabsWrapper}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterTabsRow}>
          {[
            { key: 'all', label: 'Toutes' },
            { key: 'pending', label: 'En attente' },
            { key: 'shipped', label: 'Expédiées' },
            { key: 'delivered', label: 'Livrées' },
            { key: 'cancelled', label: 'Annulées' },
          ].map(tab => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabButton, statusFilter === tab.key && styles.activeTabButton]}
              onPress={() => setStatusFilter(tab.key)}
            >
              <Text style={[styles.tabButtonText, statusFilter === tab.key && styles.activeTabButtonText]}>
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Input */}
      <View style={styles.searchSection}>
        <View style={styles.searchBox}>
          <Search size={18} color="#64748B" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher par ID, nom client, téléphone..."
            placeholderTextColor="#94A3B8"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Orders List */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {loading ? (
          <ActivityIndicator size="large" color="#4F46E5" style={{ marginTop: 40 }} />
        ) : filteredOrders.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <ShoppingBag size={36} color="#64748B" />
            </View>
            <Text style={styles.emptyTitle}>Aucune commande trouvée</Text>
            <Text style={styles.emptySubtitle}>
              Il n'y a aucune commande correspondant à ce filtre pour le moment.
            </Text>
          </View>
        ) : (
          <View style={styles.ordersList}>
            {filteredOrders.map(ord => {
              const badge = getStatusBadge(ord.status);
              return (
                <View key={ord.id} style={styles.orderCard}>
                  {/* Order Header */}
                  <View style={styles.orderCardHeader}>
                    <View style={styles.orderIdGroup}>
                      <ShoppingBag size={18} color="#4F46E5" />
                      <Text style={styles.orderIdText}>#{ord.id.substring(0, 8)}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: badge.bg }]}>
                      <Text style={[styles.statusBadgeText, { color: badge.color }]}>
                        {badge.label}
                      </Text>
                    </View>
                  </View>

                  {/* Order Body Details */}
                  <View style={styles.orderBody}>
                    <View style={styles.infoRow}>
                      <UserIcon size={16} color="#64748B" />
                      <Text style={styles.infoText}>{ord.customer_name || 'Client Kalagban'}</Text>
                    </View>

                    {!!ord.customer_phone && (
                      <View style={styles.infoRow}>
                        <Phone size={16} color="#64748B" />
                        <Text style={styles.infoText}>{ord.customer_phone}</Text>
                      </View>
                    )}

                    {!!ord.shipping_address && (
                      <View style={styles.infoRow}>
                        <MapPin size={16} color="#64748B" />
                        <Text style={styles.infoText} numberOfLines={2}>
                          {typeof ord.shipping_address === 'string'
                            ? ord.shipping_address
                            : JSON.stringify(ord.shipping_address)}
                        </Text>
                      </View>
                    )}

                    <View style={styles.priceRow}>
                      <Text style={styles.totalLabel}>Total Commande :</Text>
                      <Text style={styles.totalValue}>
                        {Number(ord.total_amount).toLocaleString('fr-FR')} FCFA
                      </Text>
                    </View>
                  </View>

                  {/* Order Actions */}
                  <View style={styles.orderFooterActions}>
                    {ord.status === 'pending' && (
                      <TouchableOpacity
                        style={styles.actionBtnPrimary}
                        onPress={() => handleUpdateOrderStatus(ord.id, 'shipped')}
                      >
                        <Truck size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnPrimaryText}>Marquer Expédiée</Text>
                      </TouchableOpacity>
                    )}

                    {ord.status === 'shipped' && (
                      <TouchableOpacity
                        style={[styles.actionBtnPrimary, { backgroundColor: '#16A34A' }]}
                        onPress={() => handleUpdateOrderStatus(ord.id, 'delivered')}
                      >
                        <CheckCircle2 size={16} color="#FFFFFF" />
                        <Text style={styles.actionBtnPrimaryText}>Marquer Livrée</Text>
                      </TouchableOpacity>
                    )}
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
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  title: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748B',
    marginTop: 2,
  },
  filterTabsWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  filterTabsRow: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 8,
  },
  tabButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
  },
  activeTabButton: {
    backgroundColor: '#4F46E5',
  },
  tabButtonText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  activeTabButtonText: {
    color: '#FFFFFF',
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
  },
  ordersList: {
    gap: 14,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  orderIdGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  orderIdText: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: '800',
  },
  orderBody: {
    paddingVertical: 12,
    gap: 6,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: '#334155',
    fontWeight: '600',
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  totalLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: '#64748B',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '900',
    color: '#4F46E5',
  },
  orderFooterActions: {
    paddingTop: 8,
  },
  actionBtnPrimary: {
    backgroundColor: '#4F46E5',
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionBtnPrimaryText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '800',
  },
});
