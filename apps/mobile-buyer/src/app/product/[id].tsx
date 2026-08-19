import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  ArrowLeft,
  ShoppingBag,
  Store,
  ShieldCheck,
  Star,
  Check,
  Plus,
  Minus,
  Truck,
  RotateCcw,
  Sparkles,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';

const { width } = Dimensions.get('window');

interface ProductDetail {
  id: string;
  shop_id: string;
  shop_name: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  old_price?: number;
  stock_quantity: number;
  image_url: string;
}

export default function ProductDetailScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { addToCart, totalItems } = useCart();

  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedSize, setSelectedSize] = useState('M');
  const [addedNotice, setAddedNotice] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProductDetail(id);
    }
  }, [id]);

  const fetchProductDetail = async (productId: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          shop_id,
          title,
          description,
          category,
          price,
          old_price,
          stock_quantity,
          shops ( name ),
          product_media ( url )
        `)
        .eq('id', productId)
        .single();

      if (error || !data || (data as any).status !== 'active' || (data as any).moderation_status === 'rejected' || (data as any).moderation_status === 'pending_review') {
        Alert.alert('Article Indisponible', 'Ce produit est en cours de modération ou n\'est plus disponible.');
        router.back();
        return;
      }

      if (data) {
        setProduct({
          id: data.id,
          shop_id: data.shop_id,
          shop_name: (data as any).shops?.name || 'Boutique Partenaire',
          title: data.title,
          description: data.description,
          category: data.category,
          price: Number(data.price),
          old_price: data.old_price ? Number(data.old_price) : undefined,
          stock_quantity: data.stock_quantity || 0,
          image_url:
            (data as any).product_media && (data as any).product_media.length > 0
              ? (data as any).product_media[0].url
              : 'https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=500&auto=format&fit=crop&q=80',
        });
      } else {
        setProduct(null);
      }
    } catch {
      setProduct(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddToCart = () => {
    if (!product) return;
    const cappedQty = Math.min(quantity, product.stock_quantity);
    if (cappedQty <= 0) return;

    addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        old_price: product.old_price,
        image_url: product.image_url,
        shop_id: product.shop_id,
        shop_name: product.shop_name,
        max_stock: product.stock_quantity,
        selected_variant: { Taille: selectedSize },
      },
      cappedQty
    );
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    router.push('/checkout');
  };

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Chargement du produit...</Text>
      </SafeAreaView>
    );
  }

  if (!product) return null;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          Fiche Produit
        </Text>

        <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart')}>
          <ShoppingBag size={22} color="#0F172A" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + bottomPadding }]}>
        {/* Main Product Image */}
        <View style={styles.imageContainer}>
          <Image source={{ uri: product.image_url }} style={styles.mainImage} />

          {product.old_price && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}% DE RÉDUCTION
              </Text>
            </View>
          )}
        </View>

        {/* Info Content */}
        <View style={styles.detailsContainer}>
          {/* Shop Card Header */}
          <View style={styles.shopBar}>
            <View style={styles.shopIcon}>
              <Store size={18} color="#4F46E5" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.shopName}>{product.shop_name}</Text>
              <Text style={styles.shopVerified}>Vendeur Vérifié Kalagban • Abidjan</Text>
            </View>
            <ShieldCheck size={20} color="#10B981" />
          </View>

          {/* Title & Price */}
          <Text style={styles.productTitle}>{product.title}</Text>

          <View style={styles.priceContainer}>
            <Text style={styles.currentPrice}>{formatPrice(product.price)}</Text>
            {product.old_price && (
              <Text style={styles.oldPrice}>{formatPrice(product.old_price)}</Text>
            )}
          </View>

          {/* Stock & Guaranty Info */}
          <View style={styles.featuresRow}>
            <View style={styles.featureItem}>
              <Truck size={16} color="#10B981" />
              <Text style={styles.featureText}>Retrait Point Relais (500 FCFA)</Text>
            </View>
            <View style={styles.featureItem}>
              <RotateCcw size={16} color="#4F46E5" />
              <Text style={styles.featureText}>Retrait sécurisé avec Code OTP</Text>
            </View>
          </View>

          {/* Variants Selector */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Taille disponible</Text>
            <View style={styles.sizeRow}>
              {['S', 'M', 'L', 'XL', 'XXL'].map((size) => {
                const isSelected = selectedSize === size;
                return (
                  <TouchableOpacity
                    key={size}
                    style={[styles.sizeChip, isSelected && styles.sizeChipSelected]}
                    onPress={() => setSelectedSize(size)}
                  >
                    <Text style={[styles.sizeText, isSelected && styles.sizeTextSelected]}>
                      {size}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Quantity Selector */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Quantité</Text>
            <View style={styles.quantityRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity(Math.max(1, quantity - 1))}
              >
                <Minus size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.qtyText}>{quantity}</Text>
              <TouchableOpacity
                style={[styles.qtyBtn, (product.stock_quantity <= 0 || quantity >= product.stock_quantity) && { opacity: 0.3 }]}
                disabled={product.stock_quantity <= 0 || quantity >= product.stock_quantity}
                onPress={() => setQuantity(Math.min(quantity + 1, product.stock_quantity))}
              >
                <Plus size={18} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.stockText}>({product.stock_quantity} en stock)</Text>
            </View>
          </View>

          {/* Description */}
          <View style={styles.sectionBlock}>
            <Text style={styles.sectionTitle}>Description du produit</Text>
            <Text style={styles.descriptionText}>
              {product.description ||
                'Produit authentique commercialisé par une boutique partenaire vérifiée sur la marketplace Kalagban.'}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Bottom Floating Action Bar */}
      <View style={[styles.bottomActionBar, { paddingBottom: bottomPadding, height: 72 + bottomPadding }]}>
        <TouchableOpacity
          style={[styles.addToCartButton, addedNotice && styles.addToCartNotice]}
          onPress={handleAddToCart}
          activeOpacity={0.8}
        >
          {addedNotice ? (
            <>
              <Check size={20} color="#FFFFFF" />
              <Text style={styles.btnText}>Ajouté au panier !</Text>
            </>
          ) : (
            <>
              <ShoppingBag size={20} color="#4F46E5" />
              <Text style={styles.addCartText}>Ajouter</Text>
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={styles.buyNowButton} onPress={handleBuyNow} activeOpacity={0.85}>
          <Text style={styles.buyNowText}>Acheter Maintenant</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
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
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  cartBadge: {
    position: 'absolute',
    top: 2,
    right: 2,
    backgroundColor: '#EF4444',
    width: 16,
    height: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '900',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  imageContainer: {
    width: width,
    height: 320,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#EF4444',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  detailsContainer: {
    padding: 20,
    gap: 16,
  },
  shopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  shopIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  shopVerified: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '600',
  },
  productTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 28,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 12,
  },
  currentPrice: {
    fontSize: 24,
    fontWeight: '900',
    color: '#4F46E5',
  },
  oldPrice: {
    fontSize: 16,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
    fontWeight: '600',
  },
  featuresRow: {
    gap: 8,
    backgroundColor: '#F0FDF4',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#166534',
  },
  sectionBlock: {
    gap: 10,
    paddingTop: 8,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#0F172A',
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeChip: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sizeChipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  sizeText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#475569',
  },
  sizeTextSelected: {
    color: '#FFFFFF',
  },
  quantityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  qtyBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  stockText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  bottomActionBar: {
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
    gap: 12,
  },
  addToCartButton: {
    flex: 1,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  addToCartNotice: {
    backgroundColor: '#10B981',
    borderColor: '#10B981',
  },
  addCartText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  btnText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  buyNowButton: {
    flex: 1.5,
    height: 52,
    borderRadius: 16,
    backgroundColor: '#4F46E5',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyNowText: {
    fontSize: 15,
    fontWeight: '900',
    color: '#FFFFFF',
  },
});
