import React, { useState, useEffect, useRef } from 'react';
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
  Modal,
  Animated,
  PanResponder,
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
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw as ResetZoom,
  X,
} from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';
import { getSafeImageUrl, DEFAULT_PRODUCT_FALLBACK } from '@/lib/image-utils';

const { width, height } = Dimensions.get('window');

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
  images: string[];
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
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
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
          status,
          moderation_status,
          shops ( name ),
          product_media ( url, position )
        `)
        .eq('id', productId)
        .single();

      if (error || !data || data.status !== 'active' || data.moderation_status === 'rejected') {
        Alert.alert('Article Indisponible', 'Ce produit est en cours de modération ou n\'est plus disponible.');
        router.back();
        return;
      }

      const mediaList = data.product_media && (data.product_media as any[]).length > 0
        ? [...(data.product_media as any[])]
            .sort((a, b) => (a.position || 0) - (b.position || 0))
            .map((m) => getSafeImageUrl(m.url))
        : [DEFAULT_PRODUCT_FALLBACK];

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
          images: mediaList,
        });
        setSelectedImageIndex(0);
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
    const availableStock = (product.stock_quantity !== undefined && product.stock_quantity !== null)
      ? Number(product.stock_quantity)
      : 99;
    const cappedQty = Math.min(quantity, Math.max(1, availableStock));

    addToCart(
      {
        id: product.id,
        title: product.title,
        price: product.price,
        old_price: product.old_price,
        image_url: product.images[0] || DEFAULT_PRODUCT_FALLBACK,
        shop_id: product.shop_id,
        shop_name: product.shop_name,
        max_stock: availableStock,
        selected_variant: { Taille: selectedSize },
      },
      cappedQty
    );
    setAddedNotice(true);
    setTimeout(() => setAddedNotice(false), 2000);
  };

  const handleBuyNow = () => {
    handleAddToCart();
    setTimeout(() => {
      router.push('/checkout');
    }, 50);
  };

  const formatPrice = (amount: number) => {
    return amount.toLocaleString('fr-FR') + ' FCFA';
  };

  // Zoom Modal State & 2D Pan Gestures
  const [isZoomOpen, setIsZoomOpen] = useState(false);
  const [zoomScale, setZoomScale] = useState(1);
  const pan = useRef(new Animated.ValueXY({ x: 0, y: 0 })).current;

  const resetPan = () => {
    pan.setValue({ x: 0, y: 0 });
    pan.setOffset({ x: 0, y: 0 });
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(prev + 0.5, 4.0));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => {
      const next = Math.max(prev - 0.5, 1);
      if (next <= 1) resetPan();
      return next;
    });
  };

  const handleResetZoom = () => {
    setZoomScale(1);
    resetPan();
  };

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => {
        return Math.abs(gestureState.dx) > 3 || Math.abs(gestureState.dy) > 3;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value || 0,
          y: (pan.y as any)._value || 0,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], {
        useNativeDriver: false,
      }),
      onPanResponderRelease: (_, gestureState) => {
        pan.flattenOffset();
        if (zoomScale <= 1) {
          if (gestureState.dx < -50 && selectedImageIndex < (product?.images?.length || 1) - 1) {
            setSelectedImageIndex((idx) => idx + 1);
          } else if (gestureState.dx > 50 && selectedImageIndex > 0) {
            setSelectedImageIndex((idx) => idx - 1);
          }
          Animated.spring(pan, {
            toValue: { x: 0, y: 0 },
            useNativeDriver: false,
          }).start();
        } else {
          const maxDragX = (width * (zoomScale - 1)) / 2 + 60;
          const maxDragY = (height * 0.65 * (zoomScale - 1)) / 2 + 60;
          let currentX = (pan.x as any)._value || 0;
          let currentY = (pan.y as any)._value || 0;

          if (Math.abs(currentX) > maxDragX) currentX = Math.sign(currentX) * maxDragX;
          if (Math.abs(currentY) > maxDragY) currentY = Math.sign(currentY) * maxDragY;

          Animated.spring(pan, {
            toValue: { x: currentX, y: currentY },
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  if (loading) {
    return (
      <SafeAreaView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#4F46E5" />
        <Text style={styles.loadingText}>Chargement du produit...</Text>
      </SafeAreaView>
    );
  }

  if (!product) {
    return (
      <SafeAreaView style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Produit introuvable</Text>
        <TouchableOpacity style={styles.backHomeBtn} onPress={() => router.back()}>
          <Text style={styles.backHomeText}>Retour</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const currentImage = product.images[selectedImageIndex] || product.images[0] || DEFAULT_PRODUCT_FALLBACK;

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />

      {/* Header Bar */}
      <View style={[styles.header, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.iconBtn} onPress={() => router.back()}>
          <ArrowLeft size={22} color="#0F172A" />
        </TouchableOpacity>

        <Text style={styles.headerTitle} numberOfLines={1}>
          {product.category || 'Détails du Produit'}
        </Text>

        <TouchableOpacity style={styles.iconBtn} onPress={() => router.push('/cart')}>
          <ShoppingBag size={22} color="#0F172A" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 90 + bottomPadding }]}>
        {/* Main Product Image with Tap to Zoom */}
        <TouchableOpacity
          style={styles.imageContainer}
          activeOpacity={0.95}
          onPress={() => {
            setZoomScale(1);
            setIsZoomOpen(true);
          }}
        >
          <Image
            source={{ uri: currentImage }}
            style={styles.mainImage}
            resizeMode="cover"
          />

          {/* Floating Tap to Zoom Badge */}
          <View style={styles.zoomHintBadge}>
            <Maximize2 size={13} color="#FFFFFF" />
            <Text style={styles.zoomHintText}>Toucher pour zoomer</Text>
          </View>

          {product.old_price && (
            <View style={styles.discountBadge}>
              <Text style={styles.discountText}>
                -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}% DE RÉDUCTION
              </Text>
            </View>
          )}

          {product.images.length > 1 && (
            <View style={styles.imageCounter}>
              <Text style={styles.imageCounterText}>
                {selectedImageIndex + 1} / {product.images.length}
              </Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Thumbnails Gallery */}
        {product.images.length > 1 && (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.thumbnailsContainer}
          >
            {product.images.map((imgUri, idx) => {
              const isSelected = selectedImageIndex === idx;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.thumbnailWrap, isSelected && styles.thumbnailWrapActive]}
                  onPress={() => setSelectedImageIndex(idx)}
                  activeOpacity={0.8}
                >
                  <Image source={{ uri: imgUri }} style={styles.thumbnailImg} />
                  {idx === 0 && (
                    <View style={styles.primaryBadge}>
                      <Star size={8} color="#FFFFFF" fill="#FFFFFF" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

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
            <View style={styles.qtyRow}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.max(1, q - 1))}
              >
                <Minus size={16} color="#0F172A" />
              </TouchableOpacity>
              <Text style={styles.qtyVal}>{quantity}</Text>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => setQuantity((q) => Math.min(product.stock_quantity, q + 1))}
              >
                <Plus size={16} color="#0F172A" />
              </TouchableOpacity>

              <Text style={styles.stockNotice}>
                {product.stock_quantity > 0
                  ? `(${product.stock_quantity} disponibles en stock)`
                  : 'Rupture de stock temporaire'}
              </Text>
            </View>
          </View>

          {/* Description */}
          {product.description ? (
            <View style={styles.sectionBlock}>
        <Text style={styles.sectionTitle}>Description du produit</Text>
              <Text style={styles.descriptionText}>{product.description}</Text>
            </View>
          ) : null}
        </View>
      </ScrollView>

      {/* Bottom Sticky Action Bar */}
      <View style={[styles.bottomBar, { paddingBottom: bottomPadding + 6 }]}>
        <TouchableOpacity
          style={styles.addCartBtn}
          onPress={handleAddToCart}
          activeOpacity={0.85}
        >
          {addedNotice ? (
            <Check size={20} color="#4F46E5" />
          ) : (
            <ShoppingBag size={20} color="#4F46E5" />
          )}
          <Text style={styles.addCartText}>
            {addedNotice ? 'Ajouté !' : 'Au Panier'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.buyNowBtn}
          onPress={handleBuyNow}
          activeOpacity={0.85}
        >
          <Text style={styles.buyNowText}>Acheter Maintenant</Text>
        </TouchableOpacity>
      </View>

      {/* Interactive Fullscreen Zoom Modal */}
      <Modal
        visible={isZoomOpen}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setIsZoomOpen(false)}
      >
        <SafeAreaView style={styles.zoomModalBackdrop}>
          <StatusBar barStyle="light-content" backgroundColor="#0B0F19" />

          {/* Modal Top Bar */}
          <View style={[styles.zoomHeader, { paddingTop: topPadding + 6 }]}>
            <TouchableOpacity
              style={styles.zoomCloseBtn}
              onPress={() => setIsZoomOpen(false)}
              activeOpacity={0.8}
            >
              <X size={22} color="#FFFFFF" />
            </TouchableOpacity>

            <View style={styles.zoomCounterBadge}>
              <Text style={styles.zoomCounterText}>
                {selectedImageIndex + 1} / {product.images.length}
              </Text>
            </View>

            {/* Zoom Controls */}
            <View style={styles.zoomControlsGroup}>
              <TouchableOpacity
                style={styles.zoomControlBtn}
                onPress={handleZoomOut}
                disabled={zoomScale <= 1}
                activeOpacity={0.7}
              >
                <ZoomOut size={18} color={zoomScale <= 1 ? '#64748B' : '#FFFFFF'} />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomScalePill}
                onPress={handleResetZoom}
                activeOpacity={0.7}
              >
                <Text style={styles.zoomScaleText}>{Math.round(zoomScale * 100)}%</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.zoomControlBtn}
                onPress={handleZoomIn}
                disabled={zoomScale >= 3.5}
                activeOpacity={0.7}
              >
                <ZoomIn size={18} color={zoomScale >= 3.5 ? '#64748B' : '#FFFFFF'} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Center Scaled & Draggable Image Area */}
          <View style={styles.zoomCenterContainer}>
            <Animated.View
              {...panResponder.panHandlers}
              style={[
                styles.zoomDraggableWrapper,
                {
                  transform: [
                    { translateX: pan.x },
                    { translateY: pan.y },
                    { scale: zoomScale },
                  ],
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={1}
                onPress={() => {
                  if (zoomScale > 1) {
                    handleResetZoom();
                  } else {
                    setZoomScale(2);
                  }
                }}
              >
                <Image
                  source={{ uri: currentImage }}
                  style={styles.zoomedImage}
                  resizeMode="contain"
                />
              </TouchableOpacity>
            </Animated.View>
          </View>

          {/* Bottom Thumbnails Strip in Zoom Mode */}
          {product.images.length > 1 && (
            <View style={[styles.zoomBottomStrip, { paddingBottom: bottomPadding + 10 }]}>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.zoomThumbnailsList}
              >
                {product.images.map((imgUri, idx) => {
                  const isSelected = selectedImageIndex === idx;
                  return (
                    <TouchableOpacity
                      key={idx}
                      style={[
                        styles.zoomThumbWrap,
                        isSelected && styles.zoomThumbWrapActive,
                      ]}
                      onPress={() => {
                        setSelectedImageIndex(idx);
                        setZoomScale(1);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image source={{ uri: imgUri }} style={styles.zoomThumbImg} />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#FFFFFF',
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
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  cartBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    paddingHorizontal: 5,
    paddingVertical: 1,
    minWidth: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: width,
    height: width * 0.95,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  mainImage: {
    width: '100%',
    height: '100%',
  },
  zoomHintBadge: {
    position: 'absolute',
    bottom: 12,
    left: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.75)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  zoomHintText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  discountBadge: {
    position: 'absolute',
    top: 14,
    left: 14,
    backgroundColor: '#EF4444',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '900',
  },
  imageCounter: {
    position: 'absolute',
    bottom: 12,
    right: 14,
    backgroundColor: 'rgba(15, 23, 42, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '700',
  },
  thumbnailsContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  thumbnailWrap: {
    width: 60,
    height: 60,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: '#F1F5F9',
    position: 'relative',
  },
  thumbnailWrapActive: {
    borderColor: '#4F46E5',
  },
  thumbnailImg: {
    width: '100%',
    height: '100%',
  },
  primaryBadge: {
    position: 'absolute',
    top: 3,
    right: 3,
    backgroundColor: '#4F46E5',
    borderRadius: 6,
    padding: 2,
  },
  detailsContainer: {
    padding: 18,
    gap: 16,
  },
  shopBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F8FAFC',
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  shopIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: '#EEF2FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  shopName: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
  },
  shopVerified: {
    fontSize: 11,
    color: '#64748B',
    fontWeight: '500',
  },
  productTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#0F172A',
    lineHeight: 26,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 10,
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
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    paddingVertical: 4,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  featureText: {
    fontSize: 12,
    color: '#334155',
    fontWeight: '600',
  },
  sectionBlock: {
    gap: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#F8FAFC',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  sizeRow: {
    flexDirection: 'row',
    gap: 10,
  },
  sizeChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sizeChipSelected: {
    backgroundColor: '#4F46E5',
    borderColor: '#4F46E5',
  },
  sizeText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#475569',
  },
  sizeTextSelected: {
    color: '#FFFFFF',
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  qtyBtn: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  qtyVal: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
    minWidth: 20,
    textAlign: 'center',
  },
  stockNotice: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  descriptionText: {
    fontSize: 14,
    color: '#475569',
    lineHeight: 22,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingHorizontal: 16,
    paddingTop: 12,
    flexDirection: 'row',
    gap: 12,
  },
  addCartBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    height: 50,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  addCartText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#4F46E5',
  },
  buyNowBtn: {
    flex: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    height: 50,
    borderRadius: 14,
    backgroundColor: '#4F46E5',
    shadowColor: '#4F46E5',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  buyNowText: {
    fontSize: 14,
    fontWeight: '900',
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    color: '#64748B',
    fontSize: 14,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    gap: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0F172A',
  },
  backHomeBtn: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#4F46E5',
    borderRadius: 12,
  },
  backHomeText: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  // Zoom Modal Styles
  zoomModalBackdrop: {
    flex: 1,
    backgroundColor: '#0B0F19',
    justifyContent: 'space-between',
  },
  zoomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 12,
    zIndex: 10,
  },
  zoomCloseBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomCounterBadge: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
  },
  zoomCounterText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  zoomControlsGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderRadius: 14,
    paddingHorizontal: 4,
    paddingVertical: 2,
    gap: 4,
  },
  zoomControlBtn: {
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomScalePill: {
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  zoomScaleText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
  zoomCenterContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  zoomDraggableWrapper: {
    width: width,
    height: height * 0.65,
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomedImage: {
    width: width,
    height: height * 0.65,
  },
  zoomBottomStrip: {
    backgroundColor: 'rgba(11, 15, 25, 0.95)',
    paddingTop: 12,
  },
  zoomThumbnailsList: {
    paddingHorizontal: 16,
    gap: 10,
  },
  zoomThumbWrap: {
    width: 54,
    height: 54,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: 'transparent',
    overflow: 'hidden',
    backgroundColor: '#1E293B',
  },
  zoomThumbWrapActive: {
    borderColor: '#6366F1',
  },
  zoomThumbImg: {
    width: '100%',
    height: '100%',
  },
});
