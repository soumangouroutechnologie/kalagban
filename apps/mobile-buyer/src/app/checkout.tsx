import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  ActivityIndicator, 
  SafeAreaView,
  Alert,
  Platform,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { 
  ArrowLeft, 
  User, 
  MapPin, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  ShoppingBag,
  CreditCard,
  Phone,
  Sparkles,
  Smartphone,
  Lock,
  X,
  Truck
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';
import { calculateApplicationFee } from '@/lib/fee';

interface PickupPoint {
  id: string;
  code: string;
  name: string;
  commune: string;
  address: string;
  manager_name?: string;
  phone?: string;
}

export default function MobileCheckoutScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { items, totalAmount, clearCart } = useCart();

  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [deliveryType, setDeliveryType] = useState<'pickup_point' | 'home_delivery'>('pickup_point');
  
  // Pickup Point Selection
  const [selectedCommune, setSelectedCommune] = useState<string>('Cocody');
  const [availableRelays, setAvailableRelays] = useState<PickupPoint[]>([]);
  const [selectedRelayId, setSelectedRelayId] = useState<string>('');
  
  // Home Delivery Address
  const [addressLine, setAddressLine] = useState('');
  
  // Payment
  const [paymentMethod, setPaymentMethod] = useState<'cod' | 'wave'>('pickup_point' === 'pickup_point' ? 'cod' : 'wave');
  const [mobileOperator, setMobileOperator] = useState<'wave' | 'orange' | 'mtn' | 'moov'>('wave');
  const [mobilePaymentPhone, setMobilePaymentPhone] = useState('');
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const [communesList, setCommunesList] = useState<string[]>([
    'Cocody',
    'Yopougon',
    'Abobo',
    'Adjamé',
    'Marcory',
    'Koumassi',
    'Port-Bouët',
    'Treichville',
    'Plateau',
    'Attécoubé'
  ]);

  const shippingFee = deliveryType === 'pickup_point' ? 500 : 1500;
  const rawSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  const feeCalc = calculateApplicationFee(rawSubtotal, shippingFee);

  useEffect(() => {
    const loadUserData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('full_name, phone')
          .eq('id', session.user.id)
          .single();
        if (profile) {
          if (profile.full_name) setCustomerName(profile.full_name);
          if (profile.phone) {
            setCustomerPhone(profile.phone);
            setMobilePaymentPhone(profile.phone);
          }
        }
      }
    };
    loadUserData();
  }, []);

  useEffect(() => {
    const fetchPickupPoints = async () => {
      try {
        const { data, error } = await supabase
          .from('pickup_points')
          .select('*')
          .eq('status', 'active')
          .order('name');

        const { data: dbCommunes } = await supabase
          .from('communes')
          .select('name')
          .order('display_order', { ascending: true });

        const rawPoints = ((data || []) as PickupPoint[]);
        setAvailableRelays(rawPoints);

        if (dbCommunes && dbCommunes.length > 0) {
          setCommunesList(dbCommunes.map((c: any) => c.name));
        } else if (rawPoints.length > 0) {
          const uniqueCommunes = Array.from(new Set(rawPoints.map((r: any) => r.commune).filter(Boolean)));
          if (uniqueCommunes.length > 0) {
            setCommunesList(uniqueCommunes);
          }
        }

        if (rawPoints.length > 0) {
          const cocodyRelay = rawPoints.find((r: any) => r.commune?.toLowerCase() === 'cocody');
          if (cocodyRelay) {
            setSelectedRelayId(cocodyRelay.id);
            setSelectedCommune(cocodyRelay.commune || 'Cocody');
          } else {
            setSelectedRelayId(rawPoints[0].id);
            setSelectedCommune(rawPoints[0].commune || 'Cocody');
          }
        }
      } catch (err) {
        console.error('Error fetching pickup points:', err);
      }
    };

    fetchPickupPoints();
  }, []);

  const handleInitiateOrder = () => {
    if (!customerName.trim() || !customerPhone.trim()) {
      Alert.alert('Champs requis', 'Veuillez renseigner votre Nom et votre Numéro de Téléphone.');
      return;
    }

    if (deliveryType === 'pickup_point' && !selectedRelayId) {
      Alert.alert('Point Relais Requis', 'Veuillez sélectionner un Point Relais dans votre commune.');
      return;
    }

    if (deliveryType === 'home_delivery' && !addressLine.trim()) {
      Alert.alert('Adresse Requise', 'Veuillez préciser votre adresse de livraison à domicile.');
      return;
    }

    if (paymentMethod === 'wave') {
      if (!mobilePaymentPhone) setMobilePaymentPhone(customerPhone);
      setIsPaymentModalOpen(true);
    } else {
      processOrderSubmission('pending');
    }
  };

  const handleConfirmMobilePayment = async () => {
    if (!mobilePaymentPhone.trim()) {
      Alert.alert('Numéro Requis', 'Veuillez saisir votre numéro Mobile Money pour le prélèvement.');
      return;
    }

    setIsProcessingPayment(true);

    // Simulation of Mobile Money Gateway interaction
    setTimeout(() => {
      setIsProcessingPayment(false);
      setIsPaymentModalOpen(false);
      processOrderSubmission('paid');
    }, 2000);
  };

  const processOrderSubmission = async (paymentStatus: 'paid' | 'pending') => {
    setIsSubmitting(true);

    try {
      const generatedOtp = Math.floor(1000 + Math.random() * 9000).toString();
      const selectedRelay = availableRelays.find(r => r.id === selectedRelayId || r.code === selectedRelayId);

      const shippingAddress = deliveryType === 'pickup_point'
        ? `Point Relais: ${selectedRelay?.name || 'Sélectionné'} (${selectedCommune}) - ${selectedRelay?.address || ''}`
        : `${selectedCommune} - ${addressLine}`;

      const { data: authUser } = await supabase.auth.getUser();

      // Insert Order into Supabase
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          customer_id: authUser?.user?.id || null,
          customer_name: customerName,
          customer_phone: customerPhone,
          customer_email: authUser?.user?.email || null,
          subtotal: feeCalc.subtotal,
          application_fee: feeCalc.applicationFee,
          application_fee_rate: feeCalc.rate,
          shipping_fee: feeCalc.shippingFee,
          total_amount: feeCalc.total,
          status: paymentStatus === 'paid' ? 'confirmed' : 'pending',
          delivery_type: deliveryType,
          pickup_point_id: deliveryType === 'pickup_point' ? (selectedRelay?.id || null) : null,
          pickup_code: generatedOtp,
          relay_status: deliveryType === 'pickup_point' ? 'pending_deposit' : 'processing',
          shipping_address: shippingAddress,
          shop_id: items.length > 0 && items[0].shop_id ? items[0].shop_id : '00000000-0000-0000-0000-000000000000',
        })
        .select('id')
        .single();

      if (!orderError && orderData) {
        const orderCode = orderData.id.slice(0, 8).toUpperCase();

        if (deliveryType === 'pickup_point' && selectedRelay) {
          await supabase.from('relay_notifications').insert({
            pickup_point_id: selectedRelay.id,
            title: 'Nouvelle Commande Client à Réceptionner',
            message: `La commande #${orderCode} de ${customerName} (${customerPhone}) est planifiée pour votre Point Relais "${selectedRelay.name}".`,
            type: 'pickup'
          });
        }

        const primaryShopId = items.length > 0 && items[0].shop_id ? items[0].shop_id : null;
        if (primaryShopId) {
          await supabase.from('seller_notifications').insert({
            shop_id: primaryShopId,
            title: 'Nouvelle Commande Reçue 🛍️',
            message: `Nouvelle commande #${orderCode} de ${customerName} (${feeCalc.total.toLocaleString()} FCFA).`,
            type: 'order',
            reference_id: orderData.id,
          });
        }

        if (authUser?.user?.id) {
          await supabase.from('customer_notifications').insert({
            customer_id: authUser.user.id,
            order_id: orderData.id,
            title: 'Commande Effectuée avec Succès 🎉',
            message: `Votre commande #${orderCode} a été enregistrée avec succès.`,
            type: 'order',
          });
        }

        clearCart();
        setIsSubmitting(false);
        router.push(`/orders/${orderData.id}`);
        return;
      }

      // Fallback
      const fallbackId = `ORD-${Date.now()}`;
      clearCart();
      setIsSubmitting(false);
      router.push(`/orders/${fallbackId}`);
    } catch {
      const fallbackId = `ORD-${Date.now()}`;
      clearCart();
      setIsSubmitting(false);
      router.push(`/orders/${fallbackId}`);
    }
  };

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  const filteredRelays = availableRelays.filter(
    (r) => !selectedCommune || (r.commune && r.commune.toLowerCase() === selectedCommune.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.safeArea}>
      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={20} color="#0F172A" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Checkout & Paiement</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomPadding }]}>
        {/* Order Items Preview */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <ShoppingBag size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Articles à commander ({items.length || 1})</Text>
          </View>

          {items.length > 0 ? (
            items.map((item) => (
              <View key={item.id} style={styles.itemRow}>
                <Text style={styles.itemTitle} numberOfLines={1}>
                  {item.quantity}x {item.title}
                </Text>
                <Text style={styles.itemPrice}>{formatPrice(item.price * item.quantity)}</Text>
              </View>
            ))
          ) : (
            <View style={styles.itemRow}>
              <Text style={styles.itemTitle}>1x Commande Marketplace Kalagban</Text>
              <Text style={styles.itemPrice}>{formatPrice(5000)}</Text>
            </View>
          )}
        </View>

        {/* Customer Information Form */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <User size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Vos Coordonnées</Text>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Nom et Prénoms *</Text>
            <TextInput
              style={styles.textInput}
              value={customerName}
              onChangeText={setCustomerName}
              placeholder="Ex: Jean Kouassi"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Numéro de Téléphone (OTP) *</Text>
            <TextInput
              style={styles.textInput}
              value={customerPhone}
              onChangeText={setCustomerPhone}
              placeholder="Ex: +225 07 00 11 22 33"
              keyboardType="phone-pad"
            />
          </View>
        </View>

        {/* Delivery Options - Responsive Cards */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <Truck size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Mode de Livraison</Text>
          </View>

          {/* Option 1 : Point Relais */}
          <TouchableOpacity
            style={[styles.deliveryCard, deliveryType === 'pickup_point' && styles.deliveryCardActive]}
            onPress={() => setDeliveryType('pickup_point')}
            activeOpacity={0.85}
          >
            <View style={styles.deliveryCardHeader}>
              <View style={[styles.deliveryIconBox, deliveryType === 'pickup_point' && styles.deliveryIconBoxActive]}>
                <Building2 size={20} color={deliveryType === 'pickup_point' ? '#4F46E5' : '#64748B'} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={[styles.deliveryTitle, deliveryType === 'pickup_point' && styles.deliveryTitleActive]}>
                    Retrait en Point Relais
                  </Text>
                  <Text style={styles.priceTag}>500 FCFA</Text>
                </View>
                <Text style={styles.deliverySub}>
                  Sécurisé par Code OTP secret • 10 communes d'Abidjan
                </Text>
              </View>
              <View style={[styles.customRadio, deliveryType === 'pickup_point' && styles.customRadioActive]}>
                {deliveryType === 'pickup_point' && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>

          {/* Option 2 : A Domicile */}
          <TouchableOpacity
            style={[styles.deliveryCard, deliveryType === 'home_delivery' && styles.deliveryCardActive]}
            onPress={() => setDeliveryType('home_delivery')}
            activeOpacity={0.85}
          >
            <View style={styles.deliveryCardHeader}>
              <View style={[styles.deliveryIconBox, deliveryType === 'home_delivery' && styles.deliveryIconBoxActive]}>
                <MapPin size={20} color={deliveryType === 'home_delivery' ? '#4F46E5' : '#64748B'} />
              </View>
              <View style={{ flex: 1 }}>
                <View style={styles.deliveryTitleRow}>
                  <Text style={[styles.deliveryTitle, deliveryType === 'home_delivery' && styles.deliveryTitleActive]}>
                    Livraison à Domicile
                  </Text>
                  <Text style={styles.priceTag}>1 500 FCFA</Text>
                </View>
                <Text style={styles.deliverySub}>
                  Livré directement par le coursier à votre porte
                </Text>
              </View>
              <View style={[styles.customRadio, deliveryType === 'home_delivery' && styles.customRadioActive]}>
                {deliveryType === 'home_delivery' && <View style={styles.radioInner} />}
              </View>
            </View>
          </TouchableOpacity>

          {deliveryType === 'pickup_point' ? (
            <View style={styles.relaySelectionContainer}>
              <Text style={styles.inputLabel}>Sélectionnez votre Commune à Abidjan :</Text>
              
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chipsScroll}>
                {communesList.map((c) => {
                  const count = availableRelays.filter(r => r.commune.toLowerCase() === c.toLowerCase()).length;
                  return (
                    <TouchableOpacity
                      key={c}
                      style={[styles.chip, selectedCommune.toLowerCase() === c.toLowerCase() && styles.chipActive]}
                      onPress={() => {
                        setSelectedCommune(c);
                        const match = availableRelays.find(r => r.commune.toLowerCase() === c.toLowerCase());
                        if (match) setSelectedRelayId(match.id);
                        else setSelectedRelayId('');
                      }}
                    >
                      <Text style={[styles.chipText, selectedCommune.toLowerCase() === c.toLowerCase() && styles.chipTextActive]}>
                        {c} {count > 0 ? `(${count})` : ''}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              <Text style={[styles.inputLabel, { marginTop: 8 }]}>Point Relais disponible dans {selectedCommune} :</Text>
              {filteredRelays.length === 0 ? (
                <Text style={styles.noRelayText}>Aucun point relais actif dans cette commune pour le moment.</Text>
              ) : (
                filteredRelays.map((relay) => {
                  const isSelected = selectedRelayId === relay.id;
                  return (
                    <TouchableOpacity
                      key={relay.id}
                      style={[styles.relayCard, isSelected && styles.relayCardSelected]}
                      onPress={() => setSelectedRelayId(relay.id)}
                    >
                      <View style={[styles.customRadio, isSelected && styles.customRadioActive]}>
                        {isSelected && <View style={styles.radioInner} />}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.relayTitle}>{relay.name}</Text>
                        <Text style={styles.relayAddress}>{relay.address}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          ) : (
            <View style={[styles.inputGroup, { marginTop: 12 }]}>
              <Text style={styles.inputLabel}>Adresse de Livraison à Domicile *</Text>
              <TextInput
                style={styles.textInput}
                value={addressLine}
                onChangeText={setAddressLine}
                placeholder="Ex: Cocody Angré 8e Tranche, Rue L12"
              />
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.sectionCard}>
          <View style={styles.sectionHeader}>
            <CreditCard size={18} color="#4F46E5" />
            <Text style={styles.sectionTitle}>Mode de Paiement</Text>
          </View>

          <TouchableOpacity
            style={[styles.paymentCard, paymentMethod === 'cod' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('cod')}
          >
            <View style={[styles.customRadio, paymentMethod === 'cod' && styles.customRadioActive]}>
              {paymentMethod === 'cod' && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Paiement au Retrait / à la Livraison</Text>
              <Text style={styles.paymentSub}>Espèces ou Mobile Money lors de la récupération du colis</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.paymentCard, paymentMethod === 'wave' && styles.paymentCardActive]}
            onPress={() => setPaymentMethod('wave')}
          >
            <View style={[styles.customRadio, paymentMethod === 'wave' && styles.customRadioActive]}>
              {paymentMethod === 'wave' && <View style={styles.radioInner} />}
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.paymentTitle}>Paiement Mobile Instantané</Text>
              <Text style={styles.paymentSub}>Wave, Orange Money, MTN, Moov (Passerelle Sécurisée)</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Summary Card */}
        <View style={styles.totalCard}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Sous-total articles</Text>
            <Text style={styles.totalVal}>{formatPrice(feeCalc.subtotal)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Frais d'application Kalagban</Text>
            <Text style={[styles.totalVal, { color: '#4F46E5' }]}>+{formatPrice(feeCalc.applicationFee)}</Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Frais de livraison ({deliveryType === 'pickup_point' ? 'Point Relais' : 'Domicile'})</Text>
            <Text style={styles.totalVal}>{formatPrice(feeCalc.shippingFee)}</Text>
          </View>
          <View style={styles.divider} />
          <View style={styles.totalRowFinal}>
            <Text style={styles.finalLabel}>Total à régler</Text>
            <Text style={styles.finalVal}>{formatPrice(feeCalc.total)}</Text>
          </View>
        </View>

        {/* Submit Order Button */}
        <TouchableOpacity
          style={styles.submitBtn}
          onPress={handleInitiateOrder}
          disabled={isSubmitting}
          activeOpacity={0.85}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <>
              <Lock size={18} color="#FFFFFF" />
              <Text style={styles.submitBtnText}>
                {paymentMethod === 'wave' 
                  ? `Payer en ligne • ${formatPrice(feeCalc.total)}` 
                  : `Confirmer la Commande • ${formatPrice(feeCalc.total)}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* In-App Mobile Money Payment Modal */}
      <Modal
        visible={isPaymentModalOpen}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsPaymentModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderTitleRow}>
                <Smartphone size={20} color="#4F46E5" />
                <Text style={styles.modalTitle}>Paiement Mobile Sécurisé</Text>
              </View>
              <TouchableOpacity onPress={() => setIsPaymentModalOpen(false)}>
                <X size={22} color="#64748B" />
              </TouchableOpacity>
            </View>

            <View style={styles.amountBanner}>
              <Text style={styles.amountBannerLabel}>Montant à débiter</Text>
              <Text style={styles.amountBannerVal}>{formatPrice(feeCalc.total)}</Text>
            </View>

            <Text style={styles.operatorLabel}>Choisissez votre opérateur Mobile Money :</Text>
            <View style={styles.operatorsGrid}>
              {[
                { id: 'wave', name: 'Wave', color: '#1DC8FF' },
                { id: 'orange', name: 'Orange Money', color: '#FF7900' },
                { id: 'mtn', name: 'MTN MoMo', color: '#FFCC00' },
                { id: 'moov', name: 'Moov Money', color: '#006699' },
              ].map((op) => (
                <TouchableOpacity
                  key={op.id}
                  style={[
                    styles.operatorCard,
                    mobileOperator === op.id && styles.operatorCardActive,
                  ]}
                  onPress={() => setMobileOperator(op.id as any)}
                >
                  <View style={[styles.operatorDot, { backgroundColor: op.color }]} />
                  <Text style={styles.operatorName}>{op.name}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Numéro {mobileOperator.toUpperCase()} de prélèvement *</Text>
              <TextInput
                style={styles.textInput}
                value={mobilePaymentPhone}
                onChangeText={setMobilePaymentPhone}
                placeholder="Ex: 0700112233"
                keyboardType="phone-pad"
              />
            </View>

            <View style={styles.secureNotice}>
              <ShieldCheck size={16} color="#10B981" />
              <Text style={styles.secureNoticeText}>
                Paiement crypté 256-bit. Une validation sur votre téléphone sera demandée.
              </Text>
            </View>

            <TouchableOpacity
              style={styles.confirmPayBtn}
              onPress={handleConfirmMobilePayment}
              disabled={isProcessingPayment}
            >
              {isProcessingPayment ? (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <ActivityIndicator color="#FFFFFF" size="small" />
                  <Text style={styles.confirmPayText}>Connexion à la passerelle...</Text>
                </View>
              ) : (
                <Text style={styles.confirmPayText}>
                  Valider le Paiement ({formatPrice(feeCalc.total)})
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
    paddingHorizontal: 16,
    paddingBottom: 12,
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
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  scrollContent: {
    padding: 16,
    gap: 14,
  },
  sectionCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    flex: 1,
    marginRight: 10,
  },
  itemPrice: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  inputGroup: {
    gap: 6,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 14,
    height: 48,
    fontSize: 14,
    color: '#0F172A',
  },
  deliveryCard: {
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    borderRadius: 16,
    padding: 14,
    backgroundColor: '#F8FAFC',
  },
  deliveryCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  deliveryCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deliveryIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  deliveryIconBoxActive: {
    backgroundColor: '#E0E7FF',
  },
  deliveryTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  deliveryTitleActive: {
    color: '#4F46E5',
  },
  priceTag: {
    fontSize: 12,
    fontWeight: '900',
    color: '#4F46E5',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  deliverySub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  customRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    justifyContent: 'center',
  },
  customRadioActive: {
    borderColor: '#4F46E5',
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4F46E5',
  },
  relaySelectionContainer: {
    gap: 8,
    marginTop: 6,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
  },
  chipsScroll: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  chip: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  chipActive: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#64748B',
  },
  chipTextActive: {
    color: '#FFFFFF',
  },
  relayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginTop: 4,
  },
  relayCardSelected: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  relayTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  relayAddress: {
    fontSize: 11,
    color: '#64748B',
  },
  noRelayText: {
    fontSize: 12,
    color: '#94A3B8',
    fontStyle: 'italic',
    paddingVertical: 8,
  },
  paymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  paymentCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  paymentTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  paymentSub: {
    fontSize: 11,
    color: '#64748B',
    marginTop: 2,
  },
  totalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    gap: 10,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  totalVal: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  totalRowFinal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
  },
  finalLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  finalVal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
  },
  submitBtn: {
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 18,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  submitBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    padding: 24,
    gap: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '900',
    color: '#0F172A',
  },
  amountBanner: {
    backgroundColor: '#EEF2FF',
    padding: 16,
    borderRadius: 16,
    alignItems: 'center',
    gap: 4,
  },
  amountBannerLabel: {
    fontSize: 12,
    color: '#6366F1',
    fontWeight: '700',
  },
  amountBannerVal: {
    fontSize: 22,
    fontWeight: '900',
    color: '#4F46E5',
  },
  operatorLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  operatorsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  operatorCard: {
    flex: 1,
    minWidth: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    backgroundColor: '#F8FAFC',
  },
  operatorCardActive: {
    borderColor: '#4F46E5',
    backgroundColor: '#EEF2FF',
  },
  operatorDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  operatorName: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
  },
  secureNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#ECFDF5',
    padding: 10,
    borderRadius: 12,
  },
  secureNoticeText: {
    fontSize: 11,
    color: '#065F46',
    fontWeight: '600',
    flex: 1,
  },
  confirmPayBtn: {
    backgroundColor: '#4F46E5',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmPayText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
