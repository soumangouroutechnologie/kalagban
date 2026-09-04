import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  ActivityIndicator, 
  SafeAreaView, 
  Alert, 
  Platform,
  Linking,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, CheckCircle2, KeyRound, Package, Home, XCircle, Truck, MessageCircle, PhoneCall, Send, MapPin, ExternalLink } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import OrderStatusTimeline from '@/components/OrderStatusTimeline';

interface OrderDetail {
  id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  subtotal?: number;
  application_fee?: number;
  shipping_fee?: number;
  status: string;
  created_at: string;
  delivery_type?: string;
  pickup_code?: string;
  relay_status?: string;
  shipping_address?: string;
  shop_id?: string;
}

export default function OrderDetailsReceiptScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [courier, setCourier] = useState<{ id: string; full_name: string; phone: string; vehicle_type?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = () => {
    if (!order) return;
    Alert.alert(
      "Annuler la commande",
      "Êtes-vous sûr de vouloir annuler cette commande ? Les articles seront remis en stock.",
      [
        { text: "Non, conserver", style: "cancel" },
        { 
          text: "Oui, annuler", 
          style: "destructive",
          onPress: async () => {
            setIsCancelling(true);
            try {
              // 1. Fetch items to restore stock
              const { data: items } = await supabase
                .from('order_items')
                .select('product_id, quantity')
                .eq('order_id', order.id);

              // 2. Update status
              const { error: updateErr } = await supabase
                .from('orders')
                .update({ status: 'cancelled' })
                .eq('id', order.id);

              if (updateErr) throw updateErr;

              // 3. Restore stock
              if (items) {
                for (const item of items) {
                  if (item.product_id && item.quantity > 0) {
                    const { data: prod } = await supabase
                      .from('products')
                      .select('stock_quantity')
                      .eq('id', item.product_id)
                      .single();
                    if (prod) {
                      await supabase
                        .from('products')
                        .update({ stock_quantity: Number(prod.stock_quantity || 0) + Number(item.quantity) })
                        .eq('id', item.product_id);
                    }
                  }
                }
              }

              // 4. Notify Seller
              if (order.shop_id) {
                try {
                  await supabase.from('seller_notifications').insert({
                    shop_id: order.shop_id,
                    title: "Commande Annulée par le Client ❌",
                    message: `La commande #${order.id.slice(0, 8).toUpperCase()} a été annulée par l'acheteur.`,
                    type: "order",
                  });
                } catch (notifErr) {
                  console.warn("Notification error:", notifErr);
                }
              }

              setOrder(prev => prev ? { ...prev, status: 'cancelled' } : null);
              Alert.alert("Succès", "Votre commande a été annulée.");
            } catch (err: any) {
              Alert.alert("Erreur", err.message || "Impossible d'annuler la commande.");
            } finally {
              setIsCancelling(false);
            }
          }
        }
      ]
    );
  };

  useEffect(() => {
    const fetchOrder = async () => {
      if (!id) return;
      
      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (data) {
        setOrder(data);

        // Fetch assigned courier if any
        const { data: assignData } = await supabase
          .from('courier_assignments')
          .select(`
            id,
            status,
            couriers (
              id,
              full_name,
              phone,
              vehicle_type
            )
          `)
          .eq('order_id', id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (assignData?.couriers) {
          setCourier(assignData.couriers as any);
        }
      }
      setIsLoading(false);
    };

    fetchOrder();
  }, [id]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#4F46E5" />
          <Text style={styles.loadingText}>Chargement de votre reçu...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!order) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.notFoundContainer}>
          <Text style={styles.notFoundTitle}>Commande introuvable</Text>
          <TouchableOpacity style={styles.homeBtn} onPress={() => router.push('/')}>
            <Text style={styles.homeBtnText}>Retourner à l'accueil</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      
      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.topBarTitle}>Reçu & Suivi Commande</Text>
        <TouchableOpacity style={styles.backButton} onPress={() => router.push('/')}>
          <Home size={20} color="#0F172A" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        
        {/* Main Success Hero Card */}
        <View style={styles.successCard}>
          <View style={styles.checkCircle}>
            <CheckCircle2 size={40} color="#10B981" />
          </View>

          <View style={styles.statusBadge}>
            <Text style={styles.statusBadgeText}>COMMANDE CONFIRMÉE</Text>
          </View>

          <Text style={styles.successTitle}>Merci pour votre commande ! 🎉</Text>
          
          <View style={styles.refBox}>
            <Text style={styles.refLabel}>RÉFÉRENCE :</Text>
            <Text style={styles.refCode}>#{order.id.slice(0, 8).toUpperCase()}</Text>
          </View>

          {/* OTP Code Box (Point Relais ou Domicile) */}
          {Boolean(order.pickup_code) && (
            <View style={[styles.otpCard, order.delivery_type === 'home' && { backgroundColor: '#EEF2FF', borderColor: '#C7D2FE' }]}>
              <View style={styles.otpCardHeader}>
                <KeyRound size={16} color={order.delivery_type === 'home' ? '#4338CA' : '#0F172A'} />
                <Text style={[styles.otpCardLabel, order.delivery_type === 'home' && { color: '#3730A3' }]}>
                  {order.delivery_type === 'home' 
                    ? 'CODE SECRET DE REMISE À DOMICILE' 
                    : 'CODE DE SÉCURITÉ OTP (RETRAIT POINT RELAIS)'}
                </Text>
              </View>
              <Text style={[styles.otpCardCode, order.delivery_type === 'home' && { color: '#312E81' }]}>
                {order.pickup_code}
              </Text>
              <Text style={[styles.otpCardDesc, order.delivery_type === 'home' && { color: '#4338CA' }]}>
                {order.delivery_type === 'home'
                  ? 'Communiquez ce code au livreur UNIQUEMENT au moment où vous recevez votre colis.'
                  : 'Présentez ce code de sécurité au gérant du Point Relais pour récupérer votre colis.'}
              </Text>
            </View>
          )}

          {/* Shipping Address Box */}
          {order.shipping_address && (
            <View style={styles.addressBox}>
              <Text style={styles.addressLabel}>DESTINATION DE LIVRAISON :</Text>
              <Text style={styles.addressText}>{order.shipping_address}</Text>
            </View>
          )}

          {/* Home Delivery Courier & WhatsApp GPS Sharing Card */}
          {(order.delivery_type === 'home_delivery' || order.delivery_type === 'home') && order.status !== 'delivered' && order.status !== 'cancelled' && (
            <View style={styles.courierCard}>
              <View style={styles.courierHeader}>
                <View style={styles.courierIconWrap}>
                  <Truck size={18} color="#16A34A" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.courierTitle}>
                    {courier ? 'Livreur KALAGBAN en route' : 'Livraison à Domicile Directe'}
                  </Text>
                  <Text style={styles.courierSub}>
                    {courier ? `${courier.full_name} (${courier.phone})` : 'Prise en charge par le service logistique'}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                style={styles.whatsappLocationBtn}
                onPress={() => {
                  const targetPhone = (courier?.phone || '2252520006161').replace(/[^0-9]/g, '');
                  const cleanPhone = targetPhone.startsWith('225') ? targetPhone : `225${targetPhone}`;
                  const orderCode = order.id.slice(0, 8).toUpperCase();
                  const text = encodeURIComponent(
                    `Bonjour 👋,\nJe souhaite vous partager ma position géographique WhatsApp pour la livraison de ma commande #${orderCode}.\nDestinataire : ${order.customer_name || 'Client'}\nAdresse : ${order.shipping_address || 'Abidjan'}\nMerci !`
                  );
                  Linking.openURL(`https://wa.me/${cleanPhone}?text=${text}`).catch(() => {
                    Alert.alert('WhatsApp', `Veuillez envoyer votre localisation au +${cleanPhone}.`);
                  });
                }}
                activeOpacity={0.85}
              >
                <MessageCircle size={18} color="#FFFFFF" />
                <Text style={styles.whatsappLocationBtnText}>📍 Partager ma localisation WhatsApp</Text>
                <ExternalLink size={14} color="rgba(255,255,255,0.7)" />
              </TouchableOpacity>
            </View>
          )}

        </View>

        {/* Animated Jumia-Style OrderStatusTimeline Component */}
        <OrderStatusTimeline
          orderStatus={order.status}
          relayStatus={order.relay_status}
          deliveryType={order.delivery_type}
          pickupCode={order.pickup_code}
          createdAt={order.created_at}
        />

        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Sous-total articles :</Text>
            <Text style={styles.summaryValue}>
              {Number(order.subtotal || (Number(order.total_amount) - Number(order.application_fee || 0) - Number(order.shipping_fee || 0))).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>

          {Number(order.application_fee) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Frais d&apos;application :</Text>
              <Text style={[styles.summaryValue, { color: '#4F46E5' }]}>
                +{Number(order.application_fee).toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}

          {Number(order.shipping_fee) > 0 && (
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Frais de livraison :</Text>
              <Text style={[styles.summaryValue, { color: '#10B981' }]}>
                +{Number(order.shipping_fee).toLocaleString('fr-FR')} FCFA
              </Text>
            </View>
          )}

          <View style={{ height: 1, backgroundColor: '#F1F5F9', marginVertical: 8 }} />

          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, { fontWeight: '900', color: '#0F172A' }]}>Total Réglé :</Text>
            <Text style={[styles.summaryValue, { fontWeight: '900', color: '#4F46E5', fontSize: 16 }]}>
              {Number(order.total_amount).toLocaleString('fr-FR')} FCFA
            </Text>
          </View>
        </View>

        {(order.status === 'pending' || order.status === 'pending_payment') ? (
          <TouchableOpacity 
            style={styles.cancelBtn} 
            onPress={handleCancelOrder}
            disabled={isCancelling}
            activeOpacity={0.85}
          >
            {isCancelling ? (
              <ActivityIndicator size="small" color="#DC2626" />
            ) : (
              <XCircle size={16} color="#DC2626" />
            )}
            <Text style={styles.cancelBtnText}>Annuler cette commande</Text>
          </TouchableOpacity>
        ) : null}

      </ScrollView>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#64748B',
  },
  notFoundContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 16,
  },
  notFoundTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  homeBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 14,
  },
  homeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
  },
  topBar: {
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
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 16,
  },
  successCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 32,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 12,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
  },
  checkCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#ECFDF5',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 4,
    borderColor: '#D1FAE5',
  },
  statusBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#047857',
    letterSpacing: 0.5,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    textAlign: 'center',
  },
  refBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  refLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#64748B',
  },
  refCode: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4F46E5',
    fontFamily: 'Platform',
  },
  otpCard: {
    width: '100%',
    backgroundColor: '#F59E0B',
    borderRadius: 24,
    padding: 20,
    alignItems: 'center',
    gap: 6,
    marginTop: 8,
    shadowColor: '#F59E0B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  otpCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  otpCardLabel: {
    fontSize: 10,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 0.5,
  },
  otpCardCode: {
    fontSize: 38,
    fontWeight: '900',
    color: '#0F172A',
    letterSpacing: 8,
    fontFamily: 'Platform',
  },
  otpCardDesc: {
    fontSize: 11,
    fontWeight: '700',
    color: '#0F172A',
    textAlign: 'center',
  },
  addressBox: {
    width: '100%',
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    gap: 4,
  },
  addressLabel: {
    fontSize: 9,
    fontWeight: '900',
    color: '#64748B',
    letterSpacing: 0.5,
  },
  addressText: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  courierCard: {
    width: '100%',
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
    gap: 12,
  },
  courierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  courierIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  courierTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#166534',
  },
  courierSub: {
    fontSize: 11,
    color: '#15803D',
    marginTop: 1,
  },
  whatsappLocationBtn: {
    backgroundColor: '#16A34A',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#16A34A',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 3,
  },
  whatsappLocationBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
  },
  cancelBtn: {
    marginTop: 16,
    marginBottom: 24,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  cancelBtnText: {
    color: '#DC2626',
    fontWeight: '800',
    fontSize: 13,
  },
});
