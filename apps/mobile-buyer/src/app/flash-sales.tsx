import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ChevronLeft, Sparkles, ShoppingBag, Check, Tag } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/context/cart-context';

const { width } = Dimensions.get('window');

interface FlashProduct {
  id: string;
  shop_id: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  old_price?: number;
  stock_quantity: number;
  image_url: string;
}

export default function FlashSalesScreen() {
  const insets = useSafeAreaInsets();
  const topPadding = Math.max(insets.top, Platform.OS === 'android' ? 36 : 14);
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 8);

  const router = useRouter();
  const { addToCart, totalItems } = useCart();

  const [products, setProducts] = useState<FlashProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [addedNotice, setAddedNotice] = useState<string | null>(null);

  const [timeLeft, setTimeLeft] = useState({ hours: 48, minutes: 0, seconds: 0 });
  const [flashSaleConfig, setFlashSaleConfig] = useState({
    title: "MEGA VENTES FLASH ABIDJAN",
    subtitle: "Profitez des plus fortes réductions sur les articles certifiés !",
  });

  useEffect(() => {
    fetchFlashData();

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: 59, seconds: 59 };
        if (prev.hours > 0) return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        return { hours: 0, minutes: 0, seconds: 0 };
      });
    }, 1000);

    const channel = supabase
      .channel('mobile_flash_sales_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'flash_sales' }, () => fetchFlashData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => fetchFlashData())
      .subscribe();

    return () => {
      clearInterval(timer);
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchFlashData = async () => {
    setLoading(true);
    try {
      // 1. Fetch active Flash Sale campaign
      const { data: campaign } = await supabase
        .from('flash_sales')
        .select('*')
        .eq('status', 'active')
        .gt('end_time', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (campaign) {
        setFlashSaleConfig({
          title: campaign.title || "VENTES FLASH EXCLUSIVES",
          subtitle: "Réductions exceptionnelles limitées dans le temps !"
        });

        const end = new Date(campaign.end_time).getTime();
        const now = new Date().getTime();
        const diffMs = Math.max(0, end - now);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }

      // 2. Fetch Flash Sale products (products with old_price > price)
      const { data: dbProducts } = await supabase
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
          product_media ( url )
        `)
        .eq('status', 'active');

      if (dbProducts) {
        const formatted: FlashProduct[] = dbProducts
          .filter((p: any) => (p.old_price && p.old_price > p.price) || p.stock_quantity <= 8)
          .map((p: any) => ({
            id: p.id,
            shop_id: p.shop_id,
            title: p.title,
            description: p.description,
            category: p.category || 'Général',
            price: Number(p.price),
            old_price: p.old_price ? Number(p.old_price) : Number(p.price) * 1.3,
            stock_quantity: p.stock_quantity || 5,
            image_url: p.product_media && p.product_media.length > 0 ? p.product_media[0].url : '/cousel1.jpg',
          }));

        setProducts(formatted);
      }
    } catch (err) {
      console.log('Error fetching mobile flash sales:', err);
    } finally {
      setLoading(false);
    }
  };

  const categories = ['all', 'High-Tech', 'Femme', 'Homme', 'Déco & Maison'];

  const filteredProducts = products.filter((p) => {
    if (selectedCategory === 'all') return true;
    return (p.category || '').toLowerCase().includes(selectedCategory.toLowerCase());
  });

  const handleAddToCart = (product: FlashProduct) => {
    if (product.stock_quantity <= 0) return;
    addToCart({
      id: product.id,
      shop_id: product.shop_id,
      title: product.title,
      price: product.price,
      old_price: product.old_price,
      image_url: product.image_url,
      max_stock: product.stock_quantity,
    });
    setAddedNotice(product.title);
    setTimeout(() => setAddedNotice(null), 2500);
  };

  const getImageSource = (url: string) => {
    if (url.startsWith('http') || url.startsWith('data:')) return { uri: url };
    if (url === '/cousel1.jpg' || url === '/1.png') return require('@/assets/images/categories/1.png');
    if (url === '/carousel2.jpg' || url === '/2.png') return require('@/assets/images/categories/2.png');
    if (url === '/carousel3.jpg' || url === '/3.png') return require('@/assets/images/categories/3.png');
    return require('@/assets/images/promo_banner_tech.png');
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="light-content" backgroundColor="#DC2626" />

      {addedNotice && (
        <View style={styles.toastNotice}>
          <Check size={16} color="#FFFFFF" />
          <Text style={styles.toastText} numberOfLines={1}>Ajouté au panier : {addedNotice}</Text>
        </View>
      )}

      {/* Top Red Header */}
      <View style={[styles.topHeader, { paddingTop: topPadding + 6 }]}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ChevronLeft size={24} color="#FFFFFF" />
        </TouchableOpacity>

        <View style={styles.titleContainer}>
          <Sparkles size={18} color="#FEF08A" />
          <Text style={styles.headerTitle}>Ventes Flash Kalagban</Text>
        </View>

        <TouchableOpacity style={styles.cartButton} onPress={() => router.push('/cart')}>
          <ShoppingBag size={22} color="#FFFFFF" />
          {totalItems > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{totalItems}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.scrollContent, { paddingBottom: 40 + bottomPadding }]}>
        {/* Countdown Banner Box */}
        <View style={styles.timerCard}>
          <Text style={styles.timerCardTitle}>{flashSaleConfig.title}</Text>
          <Text style={styles.timerCardSubtitle}>{flashSaleConfig.subtitle}</Text>

          <View style={styles.timerDigitsRow}>
            <View style={styles.digitBox}>
              <Text style={styles.digitNumber}>{String(timeLeft.hours).padStart(2, '0')}</Text>
              <Text style={styles.digitLabel}>HEURES</Text>
            </View>
            <Text style={styles.digitColon}>:</Text>
            <View style={styles.digitBox}>
              <Text style={styles.digitNumber}>{String(timeLeft.minutes).padStart(2, '0')}</Text>
              <Text style={styles.digitLabel}>MINUTES</Text>
            </View>
            <Text style={styles.digitColon}>:</Text>
            <View style={styles.digitBox}>
              <Text style={styles.digitNumber}>{String(timeLeft.seconds).padStart(2, '0')}</Text>
              <Text style={styles.digitLabel}>SECONDES</Text>
            </View>
          </View>
        </View>

        {/* Category Filters */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.categoryScroll}>
          {categories.map((cat) => (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipSelected]}
              onPress={() => setSelectedCategory(cat)}
            >
              <Text style={[styles.categoryChipText, selectedCategory === cat && styles.categoryChipTextSelected]}>
                {cat === 'all' ? 'Toutes les ventes flash' : cat}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {loading ? (
          <View style={styles.loaderContainer}>
            <ActivityIndicator size="large" color="#DC2626" />
            <Text style={styles.loadingText}>Chargement des offres flash...</Text>
          </View>
        ) : filteredProducts.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Tag size={40} color="#CBD5E1" />
            <Text style={styles.emptyText}>Aucune offre disponible dans cette catégorie pour le moment.</Text>
          </View>
        ) : (
          /* Products Grid */
          <View style={styles.productGrid}>
            {filteredProducts.map((p) => {
              const discount = p.old_price ? Math.round(((p.old_price - p.price) / p.old_price) * 100) : 25;
              return (
                <View key={p.id} style={styles.productCard}>
                  <View style={styles.imageWrapper}>
                    <Image source={getImageSource(p.image_url)} style={styles.productImage} />
                    <View style={styles.discountBadge}>
                      <Text style={styles.discountBadgeText}>-{discount}%</Text>
                    </View>
                  </View>

                  <View style={styles.cardContent}>
                    <Text style={styles.productTitle} numberOfLines={2}>{p.title}</Text>
                    
                    <View style={styles.priceRow}>
                      <Text style={styles.currentPrice}>{p.price.toLocaleString('fr-FR')} F</Text>
                      {p.old_price ? (
                        <Text style={styles.oldPrice}>{p.old_price.toLocaleString('fr-FR')} F</Text>
                      ) : null}
                    </View>

                    {/* Stock status indicator */}
                    <View style={styles.stockBarBg}>
                      <View style={[styles.stockBarFill, { width: `${Math.min(100, (p.stock_quantity / 15) * 100)}%` }]} />
                    </View>
                    <Text style={styles.stockText}>Plus que {p.stock_quantity} disponible(s)</Text>

                    <TouchableOpacity style={styles.buyBtn} onPress={() => handleAddToCart(p)}>
                      <ShoppingBag size={14} color="#FFFFFF" />
                      <Text style={styles.buyBtnText}>Ajouter</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  toastNotice: {
    position: 'absolute',
    top: 50,
    left: 20,
    right: 20,
    backgroundColor: '#10B981',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    zIndex: 99,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 6,
  },
  toastText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    flex: 1,
  },
  topHeader: {
    backgroundColor: '#DC2626',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  cartButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#FFFFFF',
    borderRadius: 9,
    width: 18,
    height: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cartBadgeText: {
    color: '#DC2626',
    fontSize: 10,
    fontWeight: '900',
  },
  scrollContent: {
    padding: 16,
    gap: 16,
  },
  timerCard: {
    backgroundColor: '#991B1B',
    borderRadius: 20,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  timerCardTitle: {
    color: '#FEF08A',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  timerCardSubtitle: {
    color: '#FEE2E2',
    fontSize: 11,
    fontWeight: '500',
    textAlign: 'center',
  },
  timerDigitsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 6,
  },
  digitBox: {
    backgroundColor: '#1E1B4B',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    minWidth: 54,
  },
  digitNumber: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
  digitLabel: {
    color: '#A5B4FC',
    fontSize: 8,
    fontWeight: '800',
    marginTop: 2,
  },
  digitColon: {
    color: '#FEF08A',
    fontSize: 20,
    fontWeight: '900',
  },
  categoryScroll: {
    gap: 8,
  },
  categoryChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  categoryChipSelected: {
    backgroundColor: '#DC2626',
    borderColor: '#DC2626',
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#475569',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  loaderContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },
  emptyText: {
    fontSize: 12,
    color: '#94A3B8',
    textAlign: 'center',
  },
  productGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    justifyContent: 'space-between',
  },
  productCard: {
    width: (width - 44) / 2,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  imageWrapper: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8FAFC',
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  discountBadge: {
    position: 'absolute',
    top: 6,
    left: 6,
    backgroundColor: '#DC2626',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  discountBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  cardContent: {
    padding: 10,
    gap: 6,
  },
  productTitle: {
    fontSize: 12,
    fontWeight: '800',
    color: '#0F172A',
    lineHeight: 16,
    height: 32,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  currentPrice: {
    fontSize: 13,
    fontWeight: '900',
    color: '#DC2626',
  },
  oldPrice: {
    fontSize: 10,
    color: '#94A3B8',
    textDecorationLine: 'line-through',
  },
  stockBarBg: {
    height: 4,
    backgroundColor: '#F1F5F9',
    borderRadius: 2,
    overflow: 'hidden',
    marginTop: 2,
  },
  stockBarFill: {
    height: '100%',
    backgroundColor: '#DC2626',
  },
  stockText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#64748B',
  },
  buyBtn: {
    backgroundColor: '#DC2626',
    borderRadius: 10,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 4,
  },
  buyBtnText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '800',
  },
});
