import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAuth } from '../../context/auth-context';
import { supabase } from '../../lib/supabase';
import {
  Store,
  Sparkles,
  TrendingUp,
  Package,
  Eye,
  AlertTriangle,
  Plus,
  ArrowRight,
  Bell,
  Clock,
  ShieldCheck,
  CheckCircle2,
  FileCheck,
} from 'lucide-react-native';
import { SellerNotificationsModal } from '../../components/notifications/SellerNotificationsModal';
import SellerKycModal from '../../components/verification/SellerKycModal';

interface DashboardProduct {
  id: string;
  title: string;
  price: number;
  stock_quantity: number;
  category: string;
  product_media?: { url: string }[];
}

interface DashboardOrder {
  id: string;
  total_amount: number;
  status: string;
  customer_name: string;
  created_at: string;
}

interface ActiveCampaignInfo {
  id: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  banner_url?: string;
  slug?: string;
  theme_color?: string;
}

interface KycData {
  id?: string;
  status?: 'pending' | 'approved' | 'rejected' | 'none';
  business_type?: string;
}

export default function SellerDashboardScreen() {
  const router = useRouter();
  const { shop, user, loading: authLoading } = useAuth();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);

  const [kycInfo, setKycInfo] = useState<KycData | null>(null);
  const [isVerified, setIsVerified] = useState(false);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/(auth)/login');
    }
  }, [user, authLoading, router]);

  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    productViews: 0,
    outOfStockCount: 0,
    pendingOrdersCount: 0,
  });

  const [recentProducts, setRecentProducts] = useState<DashboardProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<DashboardOrder[]>([]);
  const [activeCampaigns, setActiveCampaigns] = useState<ActiveCampaignInfo[]>([]);
  const [myParticipatingCount, setMyParticipatingCount] = useState<number>(0);

  const fetchDashboardData = useCallback(async () => {
    try {
      let targetShopId = shop?.id || user?.id;
      if (!targetShopId) {
        const { data: { session } } = await supabase.auth.getSession();
        targetShopId = session?.user?.id;
      }
      if (!targetShopId) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // 1. Fetch KYC Certification status & Shop info
      const { data: shopRecord } = await supabase
        .from('shops')
        .select('is_verified')
        .eq('id', targetShopId)
        .maybeSingle();

      const { data: kycRecord } = await supabase
        .from('seller_certifications')
        .select('*')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const verified = !!shopRecord?.is_verified || kycRecord?.status === 'approved';
      setIsVerified(verified);
      setKycInfo(kycRecord as KycData || null);

      // 2. Fetch Orders for this shop (Excluding cancelled orders from revenue)
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, subtotal, status, customer_name, created_at')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false });

      if (orders) {
        let revenue = 0;
        let validOrdersCount = 0;
        let pending = 0;

        orders.forEach((o) => {
          if (o.status !== 'cancelled') {
            revenue += Number(o.subtotal || o.total_amount || 0);
            validOrdersCount++;
          }
          if (o.status === 'pending' || o.status === 'processing') {
            pending++;
          }
        });

        setStats((prev) => ({
          ...prev,
          totalRevenue: revenue,
          totalOrders: validOrdersCount,
          pendingOrdersCount: pending,
        }));
        setRecentOrders(orders.slice(0, 3) as DashboardOrder[]);
      }

      // 3. Fetch Products for this shop
      const { data: prods } = await supabase
        .from('products')
        .select('id, title, price, stock_quantity, category, product_media(url)')
        .eq('shop_id', targetShopId)
        .order('created_at', { ascending: false });

      if (prods) {
        const outOfStock = prods.filter((p) => Number(p.stock_quantity) <= 0).length;
        setStats((prev) => ({
          ...prev,
          outOfStockCount: outOfStock,
        }));
        setRecentProducts(prods.slice(0, 4) as DashboardProduct[]);

        // 4. Fetch Active Marketing Campaigns & Participating Products
        const { data: activeCamps } = await supabase
          .from('promotional_campaigns')
          .select('id, title, subtitle, badge_text, banner_url, slug, theme_color')
          .eq('status', 'active')
          .limit(3);

        if (activeCamps && activeCamps.length > 0 && prods.length > 0) {
          const prodIds = prods.map((p) => p.id);
          const { data: cpData } = await supabase
            .from('campaign_products')
            .select('id, product_id')
            .in('product_id', prodIds);

          setMyParticipatingCount(cpData?.length || 0);
          setActiveCampaigns(activeCamps);
        } else {
          setActiveCampaigns(activeCamps || []);
          setMyParticipatingCount(0);
        }
      }
    } catch (err) {
      console.error('Error fetching seller dashboard:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [shop?.id, user?.id]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <View style={styles.container}>
      {/* Top Navigation Bar */}
      <View style={styles.topHeader}>
        <View style={styles.shopIdentityGroup}>
          <View style={styles.shopAvatarBox}>
            {shop?.logo_url ? (
              <Image source={{ uri: shop.logo_url }} style={styles.shopAvatarImage} />
            ) : (
              <Store size={22} color="#4F46E5" />
            )}
          </View>
          <View>
            <View style={styles.badgeIdentityRow}>
              <Text style={styles.shopWelcomeLabel}>VENDEUR</Text>
              {isVerified && (
                <View style={styles.verifiedMiniBadge}>
                  <CheckCircle2 size={10} color="#16A34A" />
                  <Text style={styles.verifiedMiniText}>Certifié</Text>
                </View>
              )}
            </View>
            <Text style={styles.shopNameText}>{shop?.name || 'Ma Boutique'}</Text>
          </View>
        </View>

        <TouchableOpacity
          style={styles.iconCircleButton}
          onPress={() => setIsNotificationsOpen(true)}
          activeOpacity={0.7}
        >
          <Bell size={20} color="#334155" />
          {unreadNotifCount > 0 && (
            <View style={styles.notifBadge}>
              <Text style={styles.notifBadgeText}>
                {unreadNotifCount > 9 ? '9+' : unreadNotifCount}
              </Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4F46E5" />
        }
      >
        {/* ============================================================ */}
        {/* BLOC 1 : Bannière de Certification KYC (Image 3)             */}
        {/* ============================================================ */}
        {isVerified ? (
          <View style={styles.kycVerifiedBanner}>
            <View style={styles.kycIconBoxVerified}>
              <ShieldCheck size={22} color="#16A34A" />
            </View>
            <View style={styles.kycTextContainer}>
              <View style={styles.kycTagRow}>
                <View style={styles.kycStatusPillVerified}>
                  <Text style={styles.kycStatusPillTextVerified}>OFFICIEL</Text>
                </View>
                <Text style={styles.kycBadgeActiveText}>Badge Officiel Activé</Text>
              </View>
              <Text style={styles.kycTitleVerified}>Boutique Officiellement Certifiée Kalagban 🛡️</Text>
              <Text style={styles.kycDescVerified}>
                Vos documents sont validés par la Conformité. Vos clients commandent en toute confiance.
              </Text>

              <TouchableOpacity
                style={styles.kycActionButtonVerified}
                onPress={() => setIsKycModalOpen(true)}
                activeOpacity={0.8}
              >
                <FileCheck size={14} color="#15803D" />
                <Text style={styles.kycActionButtonTextVerified}>Voir mon dossier KYC</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : kycInfo?.status === 'pending' ? (
          <View style={styles.kycPendingBanner}>
            <View style={styles.kycIconBoxPending}>
              <Clock size={22} color="#D97706" />
            </View>
            <View style={styles.kycTextContainer}>
              <View style={styles.kycTagRow}>
                <View style={styles.kycStatusPillPending}>
                  <Text style={styles.kycStatusPillTextPending}>EN EXAMEN</Text>
                </View>
                <Text style={styles.kycTimePendingText}>Validation sous 24h à 48h</Text>
              </View>
              <Text style={styles.kycTitlePending}>Dossier de Certification en Cours ⏳</Text>
              <Text style={styles.kycDescPending}>
                Vos pièces sont en cours de vérification. Vous recevrez une alerte dès l&apos;activation.
              </Text>

              <TouchableOpacity
                style={styles.kycActionButtonPending}
                onPress={() => setIsKycModalOpen(true)}
                activeOpacity={0.8}
              >
                <Clock size={14} color="#B45309" />
                <Text style={styles.kycActionButtonTextPending}>Consulter mon dossier</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.kycActionBanner}>
            <View style={styles.kycIconBoxAction}>
              <FileCheck size={22} color="#6366F1" />
            </View>
            <View style={styles.kycTextContainer}>
              <View style={styles.kycTagRow}>
                <View style={styles.kycStatusPillAction}>
                  <Text style={styles.kycStatusPillTextAction}>CERTIFICATION</Text>
                </View>
                <Text style={styles.kycTimeActionText}>Délai : 5 jours</Text>
              </View>
              <Text style={styles.kycTitleAction}>Obtenez votre Badge &apos;Vendeur Certifié&apos; 🛡️</Text>
              <Text style={styles.kycDescAction}>
                Déposez vos pièces d&apos;identité et photos de boutique pour booster vos ventes.
              </Text>

              <TouchableOpacity
                style={styles.kycActionButtonAction}
                onPress={() => setIsKycModalOpen(true)}
                activeOpacity={0.8}
              >
                <ShieldCheck size={14} color="#4338CA" />
                <Text style={styles.kycActionButtonTextAction}>Déposer mon dossier KYC</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* ============================================================ */}
        {/* BLOC 2 : Hero Banner avec Image & Slider (Image 3)          */}
        {/* ============================================================ */}
        <View style={styles.heroBannerWrapper}>
          <Image
            source={require('../../../assets/images/imgslide1.jpg')}
            style={styles.heroBannerBackground}
            resizeMode="cover"
          />
          <View style={styles.heroBannerOverlay} />

          <View style={styles.heroBannerContent}>
            <View style={styles.onlineBadge}>
              <View style={styles.onlineDot} />
              <Text style={styles.onlineBadgeText}>VOTRE BOUTIQUE EST EN LIGNE</Text>
            </View>

            <Text style={styles.heroTitle}>Développez votre audience avec Kalagban ✨</Text>
            <Text style={styles.heroSubtitle}>
              Consultez vos statistiques en temps réel, gérez vos stocks et expédiez vos commandes rapidement.
            </Text>

            <TouchableOpacity
              style={styles.heroCTAButton}
              onPress={() => router.push('/product-editor')}
              activeOpacity={0.85}
            >
              <Text style={styles.heroCTAButtonText}>Créer un produit</Text>
              <ArrowRight size={16} color="#0F172A" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Aperçu de la Boutique - KPI Grid */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Aperçu de la boutique</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/stats')}>
            <Text style={styles.seeMoreLink}>Voir les détails</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.kpiGrid}>
          {/* Card 1: Ventes générées */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EEF2FF' }]}>
              <TrendingUp size={20} color="#4F46E5" />
            </View>
            <Text style={styles.kpiLabel}>Ventes générées</Text>
            <Text style={styles.kpiValue} numberOfLines={1}>
              {stats.totalRevenue.toLocaleString('fr-FR')} FCFA
            </Text>
          </View>

          {/* Card 2: Commandes */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#F0FDF4' }]}>
              <Package size={20} color="#16A34A" />
            </View>
            <Text style={styles.kpiLabel}>Commandes</Text>
            <Text style={styles.kpiValue}>{stats.totalOrders}</Text>
          </View>

          {/* Card 3: Vues produits (30j) */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#EFF6FF' }]}>
              <Eye size={20} color="#2563EB" />
            </View>
            <Text style={styles.kpiLabel}>Vues produits (30j)</Text>
            <Text style={styles.kpiValue}>{stats.productViews}</Text>
          </View>

          {/* Card 4: En rupture */}
          <View style={styles.kpiCard}>
            <View style={[styles.kpiIconBox, { backgroundColor: '#FEF2F2' }]}>
              <AlertTriangle size={20} color="#DC2626" />
            </View>
            <Text style={styles.kpiLabel}>En rupture</Text>
            <Text style={styles.kpiValue}>{stats.outOfStockCount}</Text>
          </View>
        </View>

        {/* Campagnes & Événements Kalagban Card */}
        {activeCampaigns.length > 0 && (
          <View style={styles.campaignsCard}>
            <View style={styles.campaignsCardHeader}>
              <View style={styles.campaignsHeaderLeft}>
                <Sparkles size={18} color="#EA580C" />
                <Text style={styles.campaignsCardTitle} numberOfLines={1}>
                  Événements Promo en Direct
                </Text>
              </View>
              <View style={[styles.campaignsCountBadge, myParticipatingCount > 0 && styles.campaignsCountBadgeActive]}>
                <Text style={[styles.campaignsCountText, myParticipatingCount > 0 && styles.campaignsCountTextActive]}>
                  {myParticipatingCount > 0
                    ? `🔥 ${myParticipatingCount} produit${myParticipatingCount > 1 ? 's' : ''} en promo`
                    : 'Campagnes Actives'}
                </Text>
              </View>
            </View>

            <View style={styles.campaignsList}>
              {activeCampaigns.map((c) => (
                <View key={c.id} style={styles.campaignItemRow}>
                  {c.banner_url ? (
                    <Image source={{ uri: c.banner_url }} style={styles.campaignThumbImage} resizeMode="cover" />
                  ) : (
                    <View style={[styles.campaignThumbPlaceholder, { backgroundColor: c.theme_color || '#EA580C' }]}>
                      <Sparkles size={16} color="#FFFFFF" />
                    </View>
                  )}
                  <View style={styles.campaignInfoCol}>
                    <Text style={styles.campaignItemTitle} numberOfLines={1}>{c.title}</Text>
                    {c.subtitle ? (
                      <Text style={styles.campaignItemSubtitle} numberOfLines={1}>{c.subtitle}</Text>
                    ) : null}
                    <View style={styles.campaignBadgePill}>
                      <Text style={styles.campaignBadgePillText}>{c.badge_text || 'OFFRE SPÉCIALE'}</Text>
                    </View>
                  </View>
                  <View style={styles.campaignLivePill}>
                    <View style={styles.liveGreenDot} />
                    <Text style={styles.liveGreenText}>Actif</Text>
                  </View>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Commandes Récentes Urgent Block */}
        <View style={styles.recentOrdersCard}>
          <View style={styles.recentOrdersHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Clock size={18} color="#4F46E5" />
              <Text style={styles.recentOrdersTitle}>Commandes Récentes</Text>
            </View>
            <TouchableOpacity onPress={() => router.push('/(tabs)/orders')}>
              <Text style={styles.seeMoreLink}>Tout voir</Text>
            </TouchableOpacity>
          </View>

          {recentOrders.length === 0 ? (
            <View style={styles.emptyOrdersSubBox}>
              <Text style={styles.emptyText}>Aucune commande récente pour le moment.</Text>
            </View>
          ) : (
            recentOrders.map((ord) => (
              <View key={ord.id} style={styles.orderRowItem}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.orderCustomerText}>{ord.customer_name || 'Client Kalagban'}</Text>
                  <Text style={styles.orderDateText}>
                    {new Date(ord.created_at).toLocaleDateString('fr-FR')}
                  </Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={styles.orderAmountText}>
                    {Number(ord.total_amount).toLocaleString('fr-FR')} FCFA
                  </Text>
                  <View style={[
                    styles.statusBadge,
                    ord.status === 'delivered' ? styles.statusBadgeDelivered :
                    ord.status === 'cancelled' ? styles.statusBadgeCancelled : styles.statusBadgePending
                  ]}>
                    <Text style={[
                      styles.statusBadgeText,
                      ord.status === 'delivered' ? styles.statusBadgeTextDelivered :
                      ord.status === 'cancelled' ? styles.statusBadgeTextCancelled : styles.statusBadgeTextPending
                    ]}>
                      {ord.status}
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}

          <TouchableOpacity
            style={styles.processOrdersBtn}
            onPress={() => router.push('/(tabs)/orders')}
            activeOpacity={0.85}
          >
            <Text style={styles.processOrdersBtnText}>Traiter les commandes</Text>
            <ArrowRight size={16} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Produits Récemment Ajoutés */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Produits récemment ajoutés</Text>
          <TouchableOpacity onPress={() => router.push('/(tabs)/products')}>
            <Text style={styles.seeMoreLink}>Voir tout le catalogue</Text>
          </TouchableOpacity>
        </View>

        {recentProducts.length === 0 ? (
          <View style={styles.emptyProductsCard}>
            <View style={styles.emptyIconCircle}>
              <Package size={32} color="#64748B" />
            </View>
            <Text style={styles.emptyProductsTitle}>Aucun produit</Text>
            <Text style={styles.emptyProductsSubtitle}>
              Vous n&apos;avez pas encore de produits dans votre boutique. Lancez-vous !
            </Text>
            <TouchableOpacity
              style={styles.addProductBtn}
              onPress={() => router.push('/product-editor')}
              activeOpacity={0.85}
            >
              <Plus size={18} color="#FFFFFF" />
              <Text style={styles.addProductBtnText}>Ajouter un produit</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {recentProducts.map((item) => {
              const rawUrl = item.product_media?.[0]?.url;
              const imgUrl = rawUrl && (rawUrl.startsWith('http://') || rawUrl.startsWith('https://') || rawUrl.startsWith('data:image')) ? rawUrl : null;
              return (
                <View key={item.id} style={styles.productCardItem}>
                  {imgUrl ? (
                    <Image source={{ uri: imgUrl }} style={styles.productImage} />
                  ) : (
                    <View style={styles.productImagePlaceholder}>
                      <Package size={24} color="#94A3B8" />
                    </View>
                  )}
                  <View style={styles.productCardBody}>
                    <Text style={styles.productCategory}>{item.category || 'Général'}</Text>
                    <Text style={styles.productTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    <Text style={styles.productPrice}>
                      {Number(item.price).toLocaleString('fr-FR')} FCFA
                    </Text>
                    <View style={styles.stockBadge}>
                      <Text style={styles.stockBadgeText}>
                        Stock: {item.stock_quantity}
                      </Text>
                    </View>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* Notifications Modal Component */}
      <SellerNotificationsModal
        visible={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        shopId={shop?.id || user?.id}
        onUnreadCountChange={setUnreadNotifCount}
      />

      {/* KYC Certification Modal */}
      <SellerKycModal
        visible={isKycModalOpen}
        onClose={() => setIsKycModalOpen(false)}
        shopName={shop?.name || ''}
        kycInfo={kycInfo as any}
        isVerified={isVerified}
        onRefresh={fetchDashboardData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  topHeader: {
    paddingTop: Platform.OS === 'ios' ? 54 : 42,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#FFFFFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  shopIdentityGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  shopAvatarBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: '#EEF2FF',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  shopAvatarImage: {
    width: 44,
    height: 44,
    borderRadius: 14,
  },
  badgeIdentityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  shopWelcomeLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#4F46E5',
    letterSpacing: 1,
  },
  verifiedMiniBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
    gap: 3,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  verifiedMiniText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#16A34A',
  },
  shopNameText: {
    fontSize: 16,
    fontWeight: '900',
    color: '#0F172A',
  },
  iconCircleButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: '#F1F5F9',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  notifBadge: {
    position: 'absolute',
    top: -2,
    right: -2,
    backgroundColor: '#EF4444',
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    paddingHorizontal: 4,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  notifBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },

  /* KYC Banners */
  kycVerifiedBanner: {
    flexDirection: 'row',
    backgroundColor: '#F0FDF4',
    borderWidth: 1.5,
    borderColor: '#86EFAC',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    alignItems: 'flex-start',
  },
  kycIconBoxVerified: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#DCFCE7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycPendingBanner: {
    flexDirection: 'row',
    backgroundColor: '#FFFBEB',
    borderWidth: 1.5,
    borderColor: '#FDE68A',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    alignItems: 'flex-start',
  },
  kycIconBoxPending: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#FEF3C7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycActionBanner: {
    flexDirection: 'row',
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#C7D2FE',
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
    gap: 14,
    alignItems: 'flex-start',
  },
  kycIconBoxAction: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: '#E0E7FF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  kycTextContainer: {
    flex: 1,
  },
  kycTagRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  kycStatusPillVerified: {
    backgroundColor: '#16A34A',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kycStatusPillTextVerified: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  kycBadgeActiveText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#15803D',
  },
  kycTitleVerified: {
    fontSize: 14,
    fontWeight: '800',
    color: '#14532D',
    marginBottom: 2,
  },
  kycDescVerified: {
    fontSize: 12,
    color: '#166534',
    lineHeight: 17,
  },
  kycActionButtonVerified: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#BBF7D0',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  kycActionButtonTextVerified: {
    fontSize: 12,
    fontWeight: '800',
    color: '#15803D',
  },
  kycActionButtonPending: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#FDE68A',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  kycActionButtonTextPending: {
    fontSize: 12,
    fontWeight: '800',
    color: '#B45309',
  },
  kycActionButtonAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#C7D2FE',
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 10,
    marginTop: 10,
    alignSelf: 'flex-start',
  },
  kycActionButtonTextAction: {
    fontSize: 12,
    fontWeight: '800',
    color: '#4338CA',
  },
  kycStatusPillPending: {
    backgroundColor: '#D97706',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kycStatusPillTextPending: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  kycTimePendingText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#B45309',
  },
  kycTitlePending: {
    fontSize: 14,
    fontWeight: '800',
    color: '#78350F',
    marginBottom: 2,
  },
  kycDescPending: {
    fontSize: 12,
    color: '#92400E',
    lineHeight: 17,
  },
  kycStatusPillAction: {
    backgroundColor: '#4F46E5',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  kycStatusPillTextAction: {
    fontSize: 9,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.5,
  },
  kycTimeActionText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#4338CA',
  },
  kycTitleAction: {
    fontSize: 14,
    fontWeight: '800',
    color: '#1E1B4B',
    marginBottom: 2,
  },
  kycDescAction: {
    fontSize: 12,
    color: '#3730A3',
    lineHeight: 17,
  },

  /* Hero Banner with African Woman Image & Gradient */
  heroBannerWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: 24,
    shadowColor: '#1E1B4B',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 14,
    elevation: 8,
  },
  heroBannerBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
  },
  heroBannerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.78)',
  },
  heroBannerContent: {
    padding: 22,
    zIndex: 2,
  },
  onlineBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#22C55E',
  },
  onlineBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 1,
  },
  heroTitle: {
    fontSize: 21,
    fontWeight: '900',
    color: '#FFFFFF',
    marginBottom: 8,
    lineHeight: 27,
  },
  heroSubtitle: {
    fontSize: 13,
    color: '#E2E8F0',
    lineHeight: 19,
    marginBottom: 18,
  },
  heroCTAButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 14,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  heroCTAButtonText: {
    color: '#0F172A',
    fontWeight: '800',
    fontSize: 14,
  },

  /* Section Header */
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#0F172A',
  },
  seeMoreLink: {
    fontSize: 13,
    fontWeight: '700',
    color: '#4F46E5',
  },

  /* KPI Grid */
  kpiGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  kpiCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  kpiIconBox: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  kpiLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '600',
    marginBottom: 4,
  },
  kpiValue: {
    fontSize: 18,
    fontWeight: '900',
    color: '#0F172A',
  },

  /* Campaigns Banner */
  campaignsCard: {
    backgroundColor: '#FFF7ED',
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.5,
    borderColor: '#FFEDD5',
    marginBottom: 24,
    shadowColor: '#EA580C',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  campaignsCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 8,
  },
  campaignsHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    minWidth: 0,
  },
  campaignsCardTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#9A3412',
    flexShrink: 1,
  },
  campaignsCountBadge: {
    backgroundColor: '#FFEDD5',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDBA74',
    flexShrink: 0,
  },
  campaignsCountBadgeActive: {
    backgroundColor: '#EA580C',
    borderColor: '#C2410C',
  },
  campaignsCountText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#C2410C',
  },
  campaignsCountTextActive: {
    color: '#FFFFFF',
  },
  campaignsList: {
    gap: 10,
  },
  campaignItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 10,
    gap: 12,
    borderWidth: 1,
    borderColor: '#FED7AA',
  },
  campaignThumbImage: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: '#F1F5F9',
  },
  campaignThumbPlaceholder: {
    width: 48,
    height: 48,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  campaignInfoCol: {
    flex: 1,
    minWidth: 0,
  },
  campaignItemTitle: {
    fontSize: 13,
    fontWeight: '800',
    color: '#0F172A',
    marginBottom: 2,
  },
  campaignItemSubtitle: {
    fontSize: 11,
    color: '#64748B',
    marginBottom: 4,
  },
  campaignBadgePill: {
    alignSelf: 'flex-start',
    backgroundColor: '#FEF3C7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  campaignBadgePillText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#B45309',
    letterSpacing: 0.5,
  },
  campaignLivePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    backgroundColor: '#F0FDF4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#BBF7D0',
  },
  liveGreenDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#16A34A',
  },
  liveGreenText: {
    fontSize: 11,
    fontWeight: '800',
    color: '#16A34A',
  },

  /* Recent Orders Card */
  recentOrdersCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 18,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  recentOrdersHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  recentOrdersTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#0F172A',
  },
  emptyOrdersSubBox: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: '#94A3B8',
  },
  orderRowItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
  },
  orderCustomerText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1E293B',
  },
  orderDateText: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  orderAmountText: {
    fontSize: 14,
    fontWeight: '800',
    color: '#0F172A',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  statusBadgePending: {
    backgroundColor: '#FEF3C7',
  },
  statusBadgeDelivered: {
    backgroundColor: '#DCFCE7',
  },
  statusBadgeCancelled: {
    backgroundColor: '#FEE2E2',
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  statusBadgeTextPending: {
    color: '#D97706',
  },
  statusBadgeTextDelivered: {
    color: '#16A34A',
  },
  statusBadgeTextCancelled: {
    color: '#DC2626',
  },
  processOrdersBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 14,
    borderRadius: 14,
    gap: 8,
    marginTop: 16,
  },
  processOrdersBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 14,
  },

  /* Empty Products Card */
  emptyProductsCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 32,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F1F5F9',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  emptyProductsTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#1E293B',
    marginBottom: 4,
  },
  emptyProductsSubtitle: {
    fontSize: 13,
    color: '#64748B',
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  addProductBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#4F46E5',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 6,
  },
  addProductBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },

  /* Products Grid */
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  productCardItem: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#F1F5F9',
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  productImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F1F5F9',
  },
  productImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: '#F8FAFC',
    alignItems: 'center',
    justifyContent: 'center',
  },
  productCardBody: {
    padding: 12,
  },
  productCategory: {
    fontSize: 10,
    fontWeight: '700',
    color: '#64748B',
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  productTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: '#4F46E5',
    marginBottom: 6,
  },
  stockBadge: {
    alignSelf: 'flex-start',
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  stockBadgeText: {
    fontSize: 10,
    color: '#475569',
    fontWeight: '600',
  },
});
