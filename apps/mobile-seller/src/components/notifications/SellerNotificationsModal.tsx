import React, { useState, useEffect, useCallback } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import {
  Bell,
  X,
  ShoppingBag,
  AlertTriangle,
  Sparkles,
  CheckCheck,
  ChevronRight,
  Clock,
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';

export interface MobileSellerNotification {
  id: string;
  type: 'order' | 'alert' | 'promo' | 'system';
  title: string;
  message: string;
  time: string;
  unread: boolean;
  orderId?: string;
  productId?: string;
}

interface SellerNotificationsModalProps {
  visible: boolean;
  onClose: () => void;
  shopId?: string;
  onUnreadCountChange?: (count: number) => void;
}

export const SellerNotificationsModal: React.FC<SellerNotificationsModalProps> = ({
  visible,
  onClose,
  shopId,
  onUnreadCountChange,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<MobileSellerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async () => {
    if (!shopId) return;

    try {
      const items: MobileSellerNotification[] = [];

      // 1. Fetch from seller_notifications table
      const { data: dbNotifs } = await supabase
        .from('seller_notifications')
        .select('*')
        .eq('shop_id', shopId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (dbNotifs && dbNotifs.length > 0) {
        dbNotifs.forEach((n) => {
          items.push({
            id: n.id,
            type: n.type === 'alert' ? 'alert' : n.type === 'promo' ? 'promo' : 'order',
            title: n.title || 'Notification',
            message: n.message || '',
            time: new Date(n.created_at).toLocaleDateString('fr-FR', {
              day: 'numeric',
              month: 'short',
              hour: '2-digit',
              minute: '2-digit',
            }),
            unread: !n.is_read,
          });
        });
      }

      // 2. Fetch pending orders (Nouvelles commandes en attente)
      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id, customer_name, total_amount, created_at')
        .eq('shop_id', shopId)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(10);

      if (pendingOrders && pendingOrders.length > 0) {
        pendingOrders.forEach((o) => {
          if (!items.some((i) => i.id === `order_${o.id}`)) {
            items.push({
              id: `order_${o.id}`,
              type: 'order',
              title: `Nouvelle commande à préparer`,
              message: `Client : ${o.customer_name || 'Client Kalagban'} • Total : ${Number(o.total_amount || 0).toLocaleString('fr-FR')} FCFA`,
              time: new Date(o.created_at).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }),
              unread: true,
              orderId: o.id,
            });
          }
        });
      }

      // 3. Fetch out of stock products
      const { data: outOfStockProds } = await supabase
        .from('products')
        .select('id, title')
        .eq('shop_id', shopId)
        .lte('stock_quantity', 0)
        .limit(5);

      if (outOfStockProds && outOfStockProds.length > 0) {
        outOfStockProds.forEach((p) => {
          items.push({
            id: `stock_${p.id}`,
            type: 'alert',
            title: `Alerte stock épuisé`,
            message: `Le produit "${p.title}" est en rupture de stock. Réapprovisionnez-le pour ne pas perdre de ventes.`,
            time: 'Alerte stock',
            unread: true,
            productId: p.id,
          });
        });
      }

      setNotifications(items);
      const unreadCount = items.filter((i) => i.unread).length;
      if (onUnreadCountChange) {
        onUnreadCountChange(unreadCount);
      }
    } catch (err) {
      console.error('Erreur chargement notifications mobile:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shopId, onUnreadCountChange]);

  useEffect(() => {
    if (visible) {
      fetchNotifications();
    }
  }, [visible, fetchNotifications]);

  // Realtime subscription for notifications & orders
  useEffect(() => {
    if (!shopId) return;

    const channel = supabase
      .channel(`seller_notifs_${shopId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'seller_notifications', filter: `shop_id=eq.${shopId}` }, () => {
        fetchNotifications();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders', filter: `shop_id=eq.${shopId}` }, () => {
        fetchNotifications();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [shopId, fetchNotifications]);

  const handleMarkAllAsRead = async () => {
    if (!shopId) return;
    try {
      await supabase
        .from('seller_notifications')
        .update({ is_read: true })
        .eq('shop_id', shopId);

      setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err) {
      console.error('Erreur marquer tout comme lu:', err);
    }
  };

  const handleNotificationPress = (item: MobileSellerNotification) => {
    onClose();
    if (item.orderId || item.type === 'order') {
      router.push('/(tabs)/orders');
    } else if (item.productId || item.type === 'alert') {
      router.push('/(tabs)/products');
    }
  };

  const getIcon = (type: MobileSellerNotification['type']) => {
    switch (type) {
      case 'order':
        return <ShoppingBag size={20} color="#4F46E5" />;
      case 'alert':
        return <AlertTriangle size={20} color="#DC2626" />;
      case 'promo':
        return <Sparkles size={20} color="#EA580C" />;
      default:
        return <Bell size={20} color="#4F46E5" />;
    }
  };

  const getIconBg = (type: MobileSellerNotification['type']) => {
    switch (type) {
      case 'order':
        return '#EEF2FF';
      case 'alert':
        return '#FEF2F2';
      case 'promo':
        return '#FFF7ED';
      default:
        return '#EEF2FF';
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerTitleRow}>
              <View style={styles.bellIconCircle}>
                <Bell size={20} color="#4F46E5" />
              </View>
              <View>
                <Text style={styles.title}>Centre de Notifications</Text>
                <Text style={styles.subtitle}>
                  {notifications.filter((n) => n.unread).length} non lue(s)
                </Text>
              </View>
            </View>

            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <X size={20} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Quick Action Bar */}
          {notifications.some((n) => n.unread) && (
            <View style={styles.quickActionBar}>
              <TouchableOpacity style={styles.markReadBtn} onPress={handleMarkAllAsRead}>
                <CheckCheck size={16} color="#4F46E5" />
                <Text style={styles.markReadBtnText}>Tout marquer comme lu</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Notifications List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#4F46E5" />
              <Text style={styles.loadingText}>Chargement des notifications...</Text>
            </View>
          ) : notifications.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Bell size={36} color="#94A3B8" />
              </View>
              <Text style={styles.emptyTitle}>Aucune notification</Text>
              <Text style={styles.emptySubtitle}>
                Vous serez notifié dès qu&apos;une nouvelle commande ou une alerte importante arrive.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.listScroll}
              contentContainerStyle={styles.listContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchNotifications(); }} tintColor="#4F46E5" />
              }
            >
              {notifications.map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.notificationCard, item.unread && styles.notificationCardUnread]}
                  onPress={() => handleNotificationPress(item)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.itemIconCircle, { backgroundColor: getIconBg(item.type) }]}>
                    {getIcon(item.type)}
                  </View>

                  <View style={styles.itemContent}>
                    <View style={styles.itemTitleRow}>
                      <Text style={[styles.itemTitle, item.unread && styles.itemTitleUnread]} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.unread && <View style={styles.unreadDot} />}
                    </View>
                    <Text style={styles.itemMessage} numberOfLines={2}>
                      {item.message}
                    </Text>
                    <View style={styles.itemTimeRow}>
                      <Clock size={12} color="#94A3B8" />
                      <Text style={styles.itemTime}>{item.time}</Text>
                    </View>
                  </View>

                  <ChevronRight size={18} color="#CBD5E1" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    minHeight: '60%',
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  headerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bellIconCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  subtitle: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginTop: 2,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#F8FAFC',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  markReadBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  markReadBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },
  loadingContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: '#64748B',
  },
  emptyContainer: {
    paddingVertical: 60,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 19,
  },
  listScroll: {
    flex: 1,
  },
  listContent: {
    padding: 16,
    gap: 10,
  },
  notificationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
  },
  notificationCardUnread: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E0E7FF',
  },
  itemIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  itemContent: {
    flex: 1,
  },
  itemTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 3,
  },
  itemTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
  },
  itemTitleUnread: {
    fontWeight: '800',
    color: '#0F172A',
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#4F46E5',
  },
  itemMessage: {
    fontSize: 12,
    color: '#64748B',
    lineHeight: 17,
    marginBottom: 4,
  },
  itemTimeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  itemTime: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '500',
  },
});
