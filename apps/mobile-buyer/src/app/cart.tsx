import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import {
  ArrowLeft,
  Trash2,
  Plus,
  Minus,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  MapPin,
  Sparkles,
} from 'lucide-react-native';
import { useCart } from '@/context/cart-context';
import { calculateApplicationFee } from '@/lib/fee';

export default function CartScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { items, updateQuantity, removeFromCart, clearCart, totalAmount, totalItems } = useCart();

  const deliveryFee = items.length > 0 ? 500 : 0; // 500 FCFA Point Relais
  const feeCalc = calculateApplicationFee(totalAmount, deliveryFee);

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>Mon Panier ({totalItems})</Text>

        {items.length > 0 ? (
          <TouchableOpacity onPress={clearCart} activeOpacity={0.7}>
            <Text style={styles.clearText}>Vider</Text>
          </TouchableOpacity>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>

      {items.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <ShoppingBag size={48} color="#4F46E5" />
          </View>
          <Text style={styles.emptyTitle}>Votre panier est vide</Text>
          <Text style={styles.emptySub}>
            Explorez notre sélection de produits vendus par des commerçants locaux à Abidjan.
          </Text>
          <TouchableOpacity
            style={styles.exploreBtn}
            onPress={() => {
              if (router.canGoBack()) {
                router.back();
              } else {
                router.replace('/');
              }
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.exploreBtnText}>Découvrir la Marketplace</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      ) : (
        <>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + bottomPadding }]}>
            {/* Cart Items List */}
            <View style={styles.itemsList}>
              {items.map((item) => (
                <View key={item.id} style={styles.itemCard}>
                  <Image source={{ uri: item.image_url }} style={styles.itemImage} />

                  <View style={styles.itemDetails}>
                    <View style={styles.itemHeaderRow}>
                      <Text style={styles.itemShop}>{item.shop_name || 'Boutique Kalagban'}</Text>
                      <TouchableOpacity
                        onPress={() => removeFromCart(item.id)}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Trash2 size={16} color="#EF4444" />
                      </TouchableOpacity>
                    </View>

                    <Text style={styles.itemTitle} numberOfLines={2}>
                      {item.title}
                    </Text>

                    <Text style={styles.itemPrice}>{formatPrice(item.price)}</Text>

                    {/* Quantity controls */}
                    <View style={styles.qtyRow}>
                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, item.quantity - 1)}
                      >
                        <Minus size={14} color="#0F172A" />
                      </TouchableOpacity>

                      <Text style={styles.qtyVal}>{item.quantity}</Text>

                      <TouchableOpacity
                        style={styles.qtyBtn}
                        onPress={() => updateQuantity(item.id, item.quantity + 1)}
                      >
                        <Plus size={14} color="#0F172A" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>

            {/* Delivery Info Banner */}
            <View style={styles.deliveryCard}>
              <View style={styles.deliveryHeader}>
                <MapPin size={18} color="#10B981" />
                <Text style={styles.deliveryTitle}>Livraison en Point Relais Kalagban</Text>
              </View>
              <Text style={styles.deliverySub}>
                Retrait disponible dans plus de 50 points relais sécurisés à Abidjan avec votre code OTP.
              </Text>
            </View>

            {/* Price Summary Card */}
            <View style={styles.summaryCard}>
              <Text style={styles.summaryTitle}>Récapitulatif de la commande</Text>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Sous-total ({totalItems} articles)</Text>
                <Text style={styles.summaryValue}>{formatPrice(feeCalc.subtotal)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Frais d&apos;application</Text>
                <Text style={[styles.summaryValue, { color: '#4F46E5' }]}>+{formatPrice(feeCalc.applicationFee)}</Text>
              </View>

              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Livraison Point Relais</Text>
                <Text style={styles.summaryValue}>{formatPrice(deliveryFee)}</Text>
              </View>

              <View style={styles.divider} />

              <View style={styles.summaryRowTotal}>
                <Text style={styles.totalLabel}>Total Général</Text>
                <Text style={styles.totalValue}>{formatPrice(feeCalc.total)}</Text>
              </View>
            </View>
          </ScrollView>

          {/* Checkout Footer Button */}
          <View style={[styles.footerBar, { paddingBottom: bottomPadding, height: 72 + bottomPadding }]}>
            <View style={{ flex: 1 }}>
              <Text style={styles.footerLabel}>Total à payer</Text>
              <Text style={styles.footerTotal}>{formatPrice(feeCalc.total)}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutBtn}
              onPress={() => router.push('/checkout')}
              activeOpacity={0.85}
            >
              <Text style={styles.checkoutBtnText}>Passer la commande</Text>
              <ArrowRight size={18} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </>
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
  clearText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#EF4444',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
    gap: 12,
  },
  emptyIconCircle: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
  },
  emptySub: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 20,
  },
  exploreBtn: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  exploreBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 110,
    gap: 16,
  },
  itemsList: {
    gap: 12,
  },
  itemCard: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  itemImage: {
    width: 84,
    height: 84,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  itemShop: {
    fontSize: 11,
    fontWeight: '700',
    color: '#6366F1',
  },
  itemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#0F172A',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
    minWidth: 16,
    textAlign: 'center',
  },
  deliveryCard: {
    backgroundColor: '#F0FDF4',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    gap: 6,
  },
  deliveryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  deliveryTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: '#166534',
  },
  deliverySub: {
    fontSize: 12,
    color: '#15803D',
    lineHeight: 18,
  },
  summaryCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    gap: 10,
  },
  summaryTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 4,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 13,
    color: '#64748B',
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
  },
  divider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 4,
  },
  summaryRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '900',
    color: '#0F172A',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#4F46E5',
  },
  footerBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },
  footerLabel: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  footerTotal: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },
  checkoutBtn: {
    flex: 1.5,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  checkoutBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
