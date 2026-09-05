"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { 
  Megaphone, 
  Plus, 
  X, 
  Trash2, 
  Search, 
  Ticket, 
  Award, 
  Gift, 
  Sliders, 
  Check,
  Sparkles,
  Copy,
  UploadCloud,
  Radio,
  Package
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  min_order_amount: number;
  max_discount_amount?: number;
  usage_limit: number;
  used_count: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
  created_at: string;
}

interface Campaign {
  id: string;
  slug?: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  banner_url?: string;
  theme_color?: string;
  countdown_end?: string;
  description?: string;
  target_audience?: string;
  channel?: string;
  status: "draft" | "scheduled" | "active" | "completed" | "paused" | "ended";
  impressions_count?: number;
  clicks_count?: number;
  conversions_count?: number;
  is_featured_home?: boolean;
  starts_at?: string;
  ends_at?: string;
  created_at: string;
}

interface ProductOption {
  id: string;
  title: string;
  description?: string;
  price: number;
  old_price?: number;
  images?: string[];
  product_media?: { url: string }[];
  image_url?: string;
  category?: string;
  category_id?: string;
  stock_quantity?: number;
  stock?: number;
}

interface SelectedCampaignProduct {
  product_id: string;
  title: string;
  price: number;
  discount_percentage: number;
  special_price?: number;
  stock_allocated: number;
  available_stock?: number;
  image_url?: string;
}

interface LoyaltySettings {
  id: number;
  points_per_1000_cfa: number;
  point_value_cfa: number;
  min_points_to_redeem: number;
  max_discount_pct: number;
  referral_reward_referrer: number;
  referral_reward_referred: number;
}

interface LoyaltyTx {
  id: string;
  user_id: string;
  points: number;
  transaction_type: string;
  description: string;
  balance_after: number;
  created_at: string;
}

interface ReferralRow {
  id: string;
  referrer_id: string;
  referred_id: string;
  referral_code: string;
  status: string;
  reward_points_referrer: number;
  created_at: string;
}

const THEME_COLORS = [
  { label: "Orange Kalagban", hex: "#E65100", bgClass: "bg-[#E65100]" },
  { label: "Rouge Flash", hex: "#DC2626", bgClass: "bg-red-600" },
  { label: "Violet Tech", hex: "#4F46E5", bgClass: "bg-indigo-600" },
  { label: "Vert Émeraude", hex: "#059669", bgClass: "bg-emerald-600" },
  { label: "Ardoise Sombre", hex: "#0F172A", bgClass: "bg-slate-900" },
];

export default function MarketingPage() {
  const router = useRouter();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<"coupons" | "loyalty" | "campaigns">("campaigns");

  // Data states
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [totalCouponSavings, setTotalCouponSavings] = useState(0);

  // Loyalty states
  const [loyaltySettings, setLoyaltySettings] = useState<LoyaltySettings>({
    id: 1,
    points_per_1000_cfa: 10,
    point_value_cfa: 5,
    min_points_to_redeem: 100,
    max_discount_pct: 30,
    referral_reward_referrer: 500,
    referral_reward_referred: 250,
  });
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [loyaltyAccountsCount, setLoyaltyAccountsCount] = useState(0);
  const [totalCirculatingPoints, setTotalCirculatingPoints] = useState(0);
  const [totalBurnedPoints, setTotalBurnedPoints] = useState(0);
  const [recentTransactions, setRecentTransactions] = useState<LoyaltyTx[]>([]);
  const [recentReferrals, setRecentReferrals] = useState<ReferralRow[]>([]);

  // Manual Adjustment Modal / Form
  const [showAdjustmentModal, setShowAdjustmentModal] = useState(false);
  const [adjustmentTargetEmail, setAdjustmentTargetEmail] = useState("");
  const [adjustmentPoints, setAdjustmentPoints] = useState(100);
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [isProcessingAdjustment, setIsProcessingAdjustment] = useState(false);

  // Modals state
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [showAddCampaignModal, setShowAddCampaignModal] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed_amount",
    discount_value: 10,
    min_order_amount: 5000,
    max_discount_amount: 10000,
    usage_limit: 100,
    expires_at: "",
  });

  // Dynamic SDUI Promo Campaign Form
  const [newPromoCampaign, setNewPromoCampaign] = useState({
    title: "",
    slug: "",
    subtitle: "",
    badge_text: "JUSQU'À -40%",
    theme_color: "#E65100",
    banner_url: "",
    countdown_end: "",
    status: "active" as "active" | "draft" | "ended",
    is_featured_home: true,
  });

  const [selectedProducts, setSelectedProducts] = useState<SelectedCampaignProduct[]>([]);
  const [catalogProducts, setCatalogProducts] = useState<ProductOption[]>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [productSearchTerm, setProductSearchTerm] = useState("");
  const [globalDiscountPct, setGlobalDiscountPct] = useState(25);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const bannerFileRef = useRef<HTMLInputElement>(null);
  const [isSubmittingCampaign, setIsSubmittingCampaign] = useState(false);

  // Helper slug generator
  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  };

  // Helper get product image
  const getProductImage = (p: ProductOption | SelectedCampaignProduct) => {
    if ("image_url" in p && p.image_url) return p.image_url;
    if ("images" in p && Array.isArray(p.images) && p.images.length > 0) return p.images[0];
    if ("product_media" in p && Array.isArray(p.product_media) && p.product_media.length > 0) return p.product_media[0].url;
    return "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600&auto=format&fit=crop&q=80";
  };

  const openAddCouponModal = () => {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000);
    setNewCoupon((prev) => ({
      ...prev,
      expires_at: in30Days.toISOString().split("T")[0],
    }));
    setShowAddCouponModal(true);
  };

  // Fetch catalog products with dynamic query & search
  const fetchCatalogProducts = useCallback(async (term = "") => {
    setLoadingCatalog(true);
    try {
      let query = supabase
        .from("products")
        .select("*, product_media(url)")
        .order("created_at", { ascending: false })
        .limit(60);

      if (term.trim()) {
        const clean = term.trim();
        query = query.or(`title.ilike.%${clean}%,description.ilike.%${clean}%,category.ilike.%${clean}%`);
      }

      const { data, error } = await query;
      if (!error && data && data.length > 0) {
        setCatalogProducts(data as unknown as ProductOption[]);
      } else {
        // Fallback simple query
        const { data: fallbackData } = await supabase
          .from("products")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(60);

        if (fallbackData) {
          if (term.trim()) {
            const lower = term.toLowerCase();
            const filtered = fallbackData.filter((p: { title?: string; description?: string; category?: string }) => 
              (p.title && p.title.toLowerCase().includes(lower)) ||
              (p.description && p.description.toLowerCase().includes(lower)) ||
              (p.category && p.category.toLowerCase().includes(lower))
            );
            setCatalogProducts(filtered as unknown as ProductOption[]);
          } else {
            setCatalogProducts(fallbackData as unknown as ProductOption[]);
          }
        }
      }
    } catch (err) {
      console.error("Erreur chargement catalogue:", err);
    } finally {
      setLoadingCatalog(false);
    }
  }, []);

  const setDurationPreset = (days: number) => {
    const d = new Date(Date.now() + days * 86400000);
    setNewPromoCampaign((prev) => ({
      ...prev,
      countdown_end: d.toISOString().slice(0, 16),
    }));
  };

  const openAddCampaignModal = async () => {
    const today = new Date();
    const in7Days = new Date(today.getTime() + 7 * 86400000);
    setNewPromoCampaign({
      title: "",
      slug: "",
      subtitle: "",
      badge_text: "JUSQU'À -40%",
      theme_color: "#E65100",
      banner_url: "",
      countdown_end: in7Days.toISOString().slice(0, 16),
      status: "active",
      is_featured_home: true,
    });
    setSelectedProducts([]);
    setProductSearchTerm("");
    setShowAddCampaignModal(true);

    // Initial load of products
    fetchCatalogProducts("");
  };

  // Debounced search on typing
  useEffect(() => {
    if (!showAddCampaignModal) return;
    const timer = setTimeout(() => {
      fetchCatalogProducts(productSearchTerm);
    }, 250);
    return () => clearTimeout(timer);
  }, [productSearchTerm, showAddCampaignModal, fetchCatalogProducts]);

  const fetchMarketingData = useCallback(async () => {
    try {
      // 1. Fetch Coupons
      const { data: coupData } = await supabase
        .from("marketing_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      setCoupons(coupData || []);

      // 2. Fetch Total savings
      const { data: redemptions } = await supabase
        .from("coupon_redemptions")
        .select("discount_applied");
      if (redemptions) {
        const sum = redemptions.reduce((acc, curr) => acc + (Number(curr.discount_applied) || 0), 0);
        setTotalCouponSavings(sum);
      }

      // 3. Fetch Promotional Campaigns (SDUI)
      const { data: promoData } = await supabase
        .from("promotional_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (promoData && promoData.length > 0) {
        setCampaigns(promoData);
      } else {
        // Fallback to marketing_campaigns if promotional_campaigns is empty
        const { data: campData } = await supabase
          .from("marketing_campaigns")
          .select("*")
          .order("created_at", { ascending: false });
        setCampaigns(campData || []);
      }

      // 4. Fetch Loyalty Settings
      const { data: settsData } = await supabase
        .from("loyalty_settings")
        .select("*")
        .single();
      if (settsData) {
        setLoyaltySettings({
          id: settsData.id,
          points_per_1000_cfa: Number(settsData.points_per_1000_cfa) || 10,
          point_value_cfa: Number(settsData.point_value_cfa) || 5,
          min_points_to_redeem: Number(settsData.min_points_to_redeem) || 100,
          max_discount_pct: Number(settsData.max_discount_pct) || 30,
          referral_reward_referrer: Number(settsData.referral_reward_referrer) || 500,
          referral_reward_referred: Number(settsData.referral_reward_referred) || 250,
        });
      }

      // 5. Fetch Loyalty Stats
      const { data: accounts, count: accCount } = await supabase
        .from("loyalty_accounts")
        .select("points_balance", { count: "exact" });
      setLoyaltyAccountsCount(accCount || 0);

      if (accounts) {
        const circulating = accounts.reduce((acc, a) => acc + (a.points_balance || 0), 0);
        setTotalCirculatingPoints(circulating);
      }

      // 6. Fetch Burned Points
      const { data: txs } = await supabase
        .from("loyalty_transactions")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(15);
      setRecentTransactions(txs || []);

      const { data: burnedTxs } = await supabase
        .from("loyalty_transactions")
        .select("points")
        .lt("points", 0);
      if (burnedTxs) {
        const burned = burnedTxs.reduce((acc, t) => acc + Math.abs(t.points || 0), 0);
        setTotalBurnedPoints(burned);
      }

      // 7. Fetch Recent Referrals
      const { data: refs } = await supabase
        .from("referrals")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);
      setRecentReferrals(refs || []);

    } catch (err) {
      console.error("Error fetching marketing data:", err);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchMarketingData();

    const channel = supabase
      .channel("admin_marketing_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_coupons" }, () => fetchMarketingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "promotional_campaigns" }, () => fetchMarketingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_campaigns" }, () => fetchMarketingData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchMarketingData]);

  // Handle Create Coupon
  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const cleanCode = newCoupon.code.toUpperCase().trim();
      if (!cleanCode) {
        toast.error("Le code réduction est obligatoire.");
        return;
      }

      const { error } = await supabase.from("marketing_coupons").insert({
        code: cleanCode,
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_order_amount: newCoupon.min_order_amount,
        max_discount_amount: newCoupon.discount_type === "percentage" ? newCoupon.max_discount_amount : null,
        usage_limit: newCoupon.usage_limit,
        expires_at: new Date(newCoupon.expires_at).toISOString(),
        is_active: true,
      });

      if (error) throw error;
      toast.success(`Le code promo ${cleanCode} a été créé avec succès !`, "Code Promo Activé");
      setShowAddCouponModal(false);
      fetchMarketingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création du coupon.";
      toast.error(msg);
    }
  };

  // Toggle Coupon Active Status
  const handleToggleCoupon = async (coupon: Coupon) => {
    try {
      const { error } = await supabase
        .from("marketing_coupons")
        .update({ is_active: !coupon.is_active })
        .eq("id", coupon.id);
      if (error) throw error;
      toast.info(`Code ${coupon.code} ${!coupon.is_active ? "activé" : "désactivé"}.`);
      fetchMarketingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de mise à jour.";
      toast.error(msg);
    }
  };

  // Delete Coupon
  const handleDeleteCoupon = async (id: string, code: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer le code promo "${code}" ?`)) return;
    try {
      const { error } = await supabase.from("marketing_coupons").delete().eq("id", id);
      if (error) throw error;
      toast.success(`Code promo ${code} supprimé.`);
      fetchMarketingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression.";
      toast.error(msg);
    }
  };

  // Save Loyalty Settings
  const handleSaveLoyaltySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    try {
      const { error } = await supabase
        .from("loyalty_settings")
        .upsert({
          id: loyaltySettings.id || 1,
          points_per_1000_cfa: loyaltySettings.points_per_1000_cfa,
          point_value_cfa: loyaltySettings.point_value_cfa,
          min_points_to_redeem: loyaltySettings.min_points_to_redeem,
          max_discount_pct: loyaltySettings.max_discount_pct,
          referral_reward_referrer: loyaltySettings.referral_reward_referrer,
          referral_reward_referred: loyaltySettings.referral_reward_referred,
        });

      if (error) throw error;
      toast.success("Barèmes du Kalagban Club enregistrés avec succès !", "Fidélité Mise à Jour");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de sauvegarde.";
      toast.error(msg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Manual adjustment of points
  const handleManualAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustmentTargetEmail.trim()) {
      toast.error("Veuillez renseigner l'email du client.");
      return;
    }
    if (!adjustmentReason.trim()) {
      toast.error("Un motif d'audit est obligatoire pour la traçabilité comptable.");
      return;
    }

    setIsProcessingAdjustment(true);
    try {
      const { data: profileData, error: profErr } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("email", adjustmentTargetEmail.trim().toLowerCase())
        .maybeSingle();

      if (profErr || !profileData) {
        toast.error("Aucun compte client trouvé avec cette adresse email.");
        return;
      }

      const { data: rpcRes, error: rpcErr } = await supabase.rpc("fn_credit_loyalty_points", {
        p_user_id: profileData.id,
        p_points: adjustmentPoints,
        p_order_id: null,
        p_type: "admin_adjustment",
        p_reason: `Geste Admin : ${adjustmentReason.trim()}`
      });

      if (rpcErr) throw rpcErr;

      toast.success(
        `${adjustmentPoints} points crédités à ${profileData.full_name || "Client"}. Nouveau solde : ${rpcRes?.new_balance} pts.`,
        "Ajustement Réussi"
      );
      setShowAdjustmentModal(false);
      setAdjustmentTargetEmail("");
      setAdjustmentReason("");
      setAdjustmentPoints(100);
      fetchMarketingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de l'ajustement.";
      toast.error(msg);
    } finally {
      setIsProcessingAdjustment(false);
    }
  };

  // Handle Banner Upload
  const handleUploadBanner = async (file: File) => {
    setUploadingBanner(true);
    try {
      const fileExt = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const fileName = `campaign_${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      let bucketName = "notification-banners";
      let uploadRes = await supabase.storage.from(bucketName).upload(filePath, file, {
        cacheControl: "3600",
        upsert: true,
      });

      if (uploadRes.error) {
        bucketName = "cms_assets";
        uploadRes = await supabase.storage.from(bucketName).upload(filePath, file, {
          cacheControl: "3600",
          upsert: true,
        });
      }

      if (uploadRes.error) throw uploadRes.error;

      const { data } = supabase.storage.from(bucketName).getPublicUrl(filePath);
      if (data?.publicUrl) {
        setNewPromoCampaign((prev) => ({ ...prev, banner_url: data.publicUrl }));
        toast.success("Affiche promotionnelle téléversée avec succès !");
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur upload d'image.";
      toast.error(msg);
    } finally {
      setUploadingBanner(false);
    }
  };

  // Toggle select product
  const toggleSelectProduct = (prod: ProductOption) => {
    const exists = selectedProducts.find((p) => p.product_id === prod.id);
    if (exists) {
      setSelectedProducts(selectedProducts.filter((p) => p.product_id !== prod.id));
    } else {
      const discount = globalDiscountPct || 25;
      const originalPrice = Number(prod.price) || 0;
      const specialPrice = Math.round(originalPrice * (1 - discount / 100));
      const actualStock = Number(prod.stock_quantity ?? prod.stock ?? 10);

      setSelectedProducts([
        ...selectedProducts,
        {
          product_id: prod.id,
          title: prod.title,
          price: originalPrice,
          discount_percentage: discount,
          special_price: specialPrice,
          stock_allocated: Math.max(1, actualStock),
          available_stock: actualStock,
          image_url: getProductImage(prod),
        },
      ]);
    }
  };

  // Update specific product discount in grid
  const updateProductDiscount = (productId: string, discount: number) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          const cleanPct = Math.max(1, Math.min(99, discount));
          const calculatedPrice = Math.round(item.price * (1 - cleanPct / 100));
          return {
            ...item,
            discount_percentage: cleanPct,
            special_price: calculatedPrice,
          };
        }
        return item;
      })
    );
  };

  // Update specific product stock quota in grid
  const updateProductStock = (productId: string, stock: number) => {
    setSelectedProducts((prev) =>
      prev.map((item) => {
        if (item.product_id === productId) {
          return {
            ...item,
            stock_allocated: Math.max(1, stock),
          };
        }
        return item;
      })
    );
  };

  // Apply bulk discount to all selected products
  const applyBulkDiscount = () => {
    if (selectedProducts.length === 0) return;
    const cleanPct = Math.max(1, Math.min(99, globalDiscountPct));
    setSelectedProducts((prev) =>
      prev.map((item) => ({
        ...item,
        discount_percentage: cleanPct,
        special_price: Math.round(item.price * (1 - cleanPct / 100)),
      }))
    );
    toast.success(`Remise de -${cleanPct}% appliquée à tous les ${selectedProducts.length} articles !`);
  };

  // Save Promo Campaign
  const handleCreatePromoCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPromoCampaign.title.trim()) {
      toast.error("Le titre de la campagne est obligatoire.");
      return;
    }

    const finalSlug = slugify(newPromoCampaign.slug || newPromoCampaign.title);
    if (!finalSlug) {
      toast.error("Le slug de redirection est invalide.");
      return;
    }

    setIsSubmittingCampaign(true);
    try {
      // 1. Insert into promotional_campaigns
      const { data: createdCamp, error: campErr } = await supabase
        .from("promotional_campaigns")
        .upsert({
          slug: finalSlug,
          title: newPromoCampaign.title.trim(),
          subtitle: newPromoCampaign.subtitle.trim(),
          badge_text: newPromoCampaign.badge_text.trim(),
          banner_url: newPromoCampaign.banner_url || null,
          theme_color: newPromoCampaign.theme_color || "#E65100",
          countdown_end: newPromoCampaign.countdown_end ? new Date(newPromoCampaign.countdown_end).toISOString() : null,
          status: newPromoCampaign.status,
          is_featured_home: newPromoCampaign.is_featured_home,
        })
        .select()
        .single();

      if (campErr) throw campErr;

      // 2. Insert linked products if any
      if (selectedProducts.length > 0 && createdCamp?.id) {
        const payload = selectedProducts.map((p, idx) => ({
          campaign_id: createdCamp.id,
          product_id: p.product_id,
          discount_percentage: p.discount_percentage,
          special_price: p.special_price || Math.round(p.price * (1 - p.discount_percentage / 100)),
          stock_allocated: p.stock_allocated,
          stock_sold: 0,
          position: idx + 1,
        }));

        await supabase.from("campaign_products").delete().eq("campaign_id", createdCamp.id);
        await supabase.from("campaign_products").insert(payload);

        // Dispatch notifications to vendors
        try {
          const prodIds = selectedProducts.map((p) => p.product_id);
          const { data: prodsWithShop } = await supabase
            .from("products")
            .select("id, title, shop_id")
            .in("id", prodIds);

          if (prodsWithShop && prodsWithShop.length > 0) {
            const notifs = prodsWithShop
              .filter((p) => p.shop_id)
              .map((p) => ({
                seller_id: p.shop_id,
                title: "🎉 Produit en Campagne Promo !",
                message: `Votre produit "${p.title}" a été sélectionné pour la campagne promotionnelle "${newPromoCampaign.title}".`,
                type: "marketing_promo",
                reference_id: `campaign_${createdCamp.id}`,
                is_read: false,
              }));

            if (notifs.length > 0) {
              await supabase.from("seller_notifications").insert(notifs);
            }
          }
        } catch (notifErr) {
          console.warn("Could not dispatch seller promo notifications:", notifErr);
        }
      }

      toast.success(
        `La campagne "${newPromoCampaign.title}" avec ${selectedProducts.length} produits est en ligne sur /promo/${finalSlug} !`,
        "Campagne SDUI Publiée"
      );
      setShowAddCampaignModal(false);
      fetchMarketingData();
    } catch (err: unknown) {
      console.error("Erreur création campagne promo:", err);
      const postgrestErr = err as { message?: string; details?: string; hint?: string };
      const msg = postgrestErr?.message || (err instanceof Error ? err.message : "Erreur lors de la création de la campagne.");
      toast.error(msg, "Échec de Publication");
    } finally {
      setIsSubmittingCampaign(false);
    }
  };

  // Toggle Campaign Active Status
  const handleTogglePromoCampaign = async (camp: Campaign) => {
    try {
      const nextStatus = camp.status === "active" ? "ended" : "active";
      const { error } = await supabase
        .from("promotional_campaigns")
        .update({ status: nextStatus })
        .eq("id", camp.id);

      if (error) throw error;
      toast.info(`Campagne "${camp.title}" ${nextStatus === "active" ? "activée" : "désactivée"}.`);
      fetchMarketingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur de mise à jour.";
      toast.error(msg);
    }
  };

  // Delete Campaign
  const handleDeletePromoCampaign = async (id: string, title: string) => {
    if (!window.confirm(`Voulez-vous vraiment supprimer la campagne "${title}" ?`)) return;
    try {
      const { error } = await supabase.from("promotional_campaigns").delete().eq("id", id);
      if (error) throw error;
      toast.success(`Campagne "${title}" supprimée.`);
      fetchMarketingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la suppression.";
      toast.error(msg);
    }
  };

  // Copy mobile link to clipboard
  const handleCopyLink = (slug?: string) => {
    if (!slug) return;
    const url = `/promo/${slug}`;
    navigator.clipboard.writeText(url);
    toast.success(`Lien copié : ${url}`, "Prêt pour les notifications");
  };

  // Broadcast campaign to push notifications
  const handleBroadcastPush = (camp: Campaign) => {
    const slug = camp.slug || slugify(camp.title);
    const query = new URLSearchParams({
      campaign_slug: slug,
      title: camp.title,
      message: camp.subtitle || "Découvrez nos offres exceptionnelles et réductions exclusives !",
      image: camp.banner_url || "",
      url: `/promo/${slug}`,
    });
    router.push(`/notifications?${query.toString()}`);
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <main className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 sm:w-12 sm:h-12 bg-linear-to-br from-pink-500 to-rose-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md shadow-pink-500/20 shrink-0">
            <Megaphone size={22} className="sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">Marketing &amp; Campagnes Promo</h1>
            <p className="text-[11px] sm:text-xs text-gray-500 font-medium">
              Gestionnaire d&apos;événements promotionnels dynamiques (Server-Driven UI), bons d&apos;achat et fidélité.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {activeTab === "loyalty" ? (
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="w-full sm:w-auto bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-600/20 transition-all text-center"
            >
              <Gift size={16} /> Geste Commercial / Crédit
            </button>
          ) : activeTab === "campaigns" ? (
            <button
              onClick={openAddCampaignModal}
              className="w-full sm:w-auto bg-linear-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white font-bold text-xs px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-orange-600/20 transition-all active:scale-[0.98] text-center"
            >
              <Plus size={16} /> + Nouvelle Campagne Promo (SDUI)
            </button>
          ) : (
            <button
              onClick={openAddCouponModal}
              className="w-full sm:w-auto bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl sm:rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-600/20 transition-all text-center"
            >
              <Plus size={16} /> Créer un Code Promo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "campaigns"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Sparkles size={15} className="text-amber-400" /> Campagnes &amp; Pages Promo ({campaigns.length})
        </button>

        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "coupons"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Ticket size={15} /> Codes Promo &amp; Bons d&apos;Achat ({coupons.length})
        </button>

        <button
          onClick={() => setActiveTab("loyalty")}
          className={`px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl sm:rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap shrink-0 ${
            activeTab === "loyalty"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Award size={15} /> Club Fidélité &amp; Parrainage ({loyaltyAccountsCount})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: CAMPAIGNS (SERVER-DRIVEN UI) */}
      {/* ======================================================== */}
      {activeTab === "campaigns" && (
        <div className="space-y-6 animate-in fade-in">
          {/* Banner Promo explanation */}
          <div className="bg-linear-to-r from-slate-900 via-slate-800 to-indigo-950 p-5 sm:p-6 rounded-2xl sm:rounded-3xl text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border border-slate-700 shadow-lg">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full bg-orange-500/30 text-orange-400 text-[10px] font-black uppercase tracking-wider border border-orange-500/40">
                  ⚡ Moteur Server-Driven UI
                </span>
                <span className="text-xs text-gray-300">Zéro recompilation mobile</span>
              </div>
              <h2 className="text-base sm:text-lg font-black tracking-tight">Créez des pages d&apos;événements promotionnels en 2 minutes</h2>
              <p className="text-xs text-slate-300 max-w-2xl">
                Ajoutez un compte à rebours, une affiche personnalisée et vos kits de produits. Les applications mobiles et web se mettent à jour instantanément sans passer par les stores.
              </p>
            </div>
            <button
              onClick={openAddCampaignModal}
              className="w-full sm:w-auto px-4 py-2.5 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-2 shrink-0"
            >
              <Plus size={16} /> + Créer un Événement
            </button>
          </div>

          {campaigns.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-gray-50/60 rounded-3xl border border-dashed border-gray-200">
              <Megaphone className="mx-auto text-gray-300 w-12 h-12" />
              <p className="text-sm font-extrabold text-gray-700">Aucune campagne promotionnelle créée</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Créez une première campagne (ex: Rentrée Scolaire, Ventes Flash du Week-end, Spécial Tabaski).
              </p>
              <button
                onClick={openAddCampaignModal}
                className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                + Créer une première campagne
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {campaigns.map((camp) => {
                const slug = camp.slug || slugify(camp.title);
                const isActive = camp.status === "active";
                const isEnded = camp.status === "ended";

                return (
                  <div 
                    key={camp.id} 
                    className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-sm overflow-hidden flex flex-col justify-between hover:shadow-md transition-all"
                  >
                    {/* Top Hero Banner */}
                    <div 
                      className="h-32 w-full relative p-4 flex flex-col justify-between text-white"
                      style={{ backgroundColor: camp.theme_color || "#E65100" }}
                    >
                      {camp.banner_url ? (
                        <Image
                          src={camp.banner_url}
                          alt={camp.title}
                          fill
                          className="object-cover opacity-30"
                          unoptimized
                        />
                      ) : null}

                      <div className="flex items-center justify-between z-10">
                        <span className="px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-black uppercase tracking-wider">
                          {camp.badge_text || "OFFRE SPÉCIALE"}
                        </span>
                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                          isActive && !isEnded ? "bg-emerald-500 text-white" : "bg-gray-500 text-white"
                        }`}>
                          {isEnded ? "Terminée 🛑" : isActive ? "En Direct 🟢" : "Brouillon ⚪"}
                        </span>
                      </div>

                      <div className="z-10">
                        <h3 className="font-black text-lg leading-tight line-clamp-1">{camp.title}</h3>
                        <p className="text-xs text-white/90 line-clamp-1 mt-0.5">{camp.subtitle || "Offre limitée Kalagban"}</p>
                      </div>
                    </div>

                    {/* Body */}
                    <div className="p-4 sm:p-5 space-y-4 flex-1">
                      {/* Deep Link & Countdown */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                        <div className="bg-gray-50 p-2.5 rounded-xl">
                          <span className="text-[10px] font-black text-gray-400 uppercase block">Lien Mobile &amp; Web</span>
                          <span className="font-mono font-bold text-indigo-600 truncate block mt-0.5">/promo/{slug}</span>
                        </div>
                        <div className="bg-gray-50 p-2.5 rounded-xl">
                          <span className="text-[10px] font-black text-gray-400 uppercase block">Compte à Rebours</span>
                          <span className="font-bold text-gray-800 truncate block mt-0.5">
                            {camp.countdown_end 
                              ? new Date(camp.countdown_end).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })
                              : "Illimité ⏳"}
                          </span>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2 flex-wrap">
                        <div className="flex items-center gap-2 flex-wrap">
                          <button
                            onClick={() => handleCopyLink(slug)}
                            className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                            title="Copier le lien"
                          >
                            <Copy size={13} /> Copier Lien
                          </button>

                          <button
                            onClick={() => handleBroadcastPush(camp)}
                            className="px-3 py-1.5 bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                          >
                            <Radio size={13} /> Diffuser en Push 🚀
                          </button>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleTogglePromoCampaign(camp)}
                            className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                              isActive ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                            }`}
                          >
                            {isActive ? "Pause" : "Activer"}
                          </button>
                          <button
                            onClick={() => handleDeletePromoCampaign(camp.id, camp.title)}
                            className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                            title="Supprimer la campagne"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: COUPONS */}
      {/* ======================================================== */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Codes Actifs</span>
              <p className="text-2xl font-black text-gray-900">
                {coupons.filter(c => c.is_active).length} <span className="text-xs font-bold text-gray-400">/ {coupons.length}</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-bold">Prêts à l&apos;emploi au checkout</span>
            </div>

            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Utilisations Cumulées</span>
              <p className="text-2xl font-black text-indigo-600">
                {coupons.reduce((acc, c) => acc + (c.used_count || 0), 0).toLocaleString("fr-FR")}
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Commandes validées avec coupon</span>
            </div>

            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Économies Accordées</span>
              <p className="text-2xl font-black text-pink-600">
                {totalCouponSavings.toLocaleString("fr-FR")} <span className="text-xs">FCFA</span>
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Pouvoir d&apos;achat offert aux clients</span>
            </div>

            <div className="bg-white p-5 rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Panier Min Moyen</span>
              <p className="text-2xl font-black text-gray-900">
                {coupons.length > 0 
                  ? Math.round(coupons.reduce((acc, c) => acc + (c.min_order_amount || 0), 0) / coupons.length).toLocaleString("fr-FR")
                  : 0} <span className="text-xs">FCFA</span>
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Seuil de rentabilité fixé</span>
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 bg-white p-3 rounded-2xl border border-gray-100 shadow-xs">
            <Search size={16} className="text-gray-400 ml-2" />
            <input
              type="text"
              placeholder="Rechercher un code réduction (ex: PROMO20)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs font-medium focus:outline-hidden bg-transparent"
            />
          </div>

          {/* Coupons Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left text-xs min-w-160">
                <thead className="bg-gray-50/80 text-gray-400 font-black uppercase text-[10px] border-b border-gray-100">
                  <tr>
                    <th className="p-4">Code Réduction</th>
                    <th className="p-4">Type &amp; Remise</th>
                    <th className="p-4">Conditions</th>
                    <th className="p-4">Utilisations</th>
                    <th className="p-4">Expiration</th>
                    <th className="p-4">Statut</th>
                    <th className="p-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                {filteredCoupons.map((coupon) => (
                  <tr key={coupon.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="p-4">
                      <span className="font-mono font-black text-xs px-2.5 py-1 rounded-lg bg-pink-50 text-pink-700 border border-pink-100">
                        {coupon.code}
                      </span>
                    </td>
                    <td className="p-4 font-bold text-gray-900">
                      {coupon.discount_type === "percentage" ? `${coupon.discount_value}%` : `${coupon.discount_value.toLocaleString("fr-FR")} FCFA`}
                    </td>
                    <td className="p-4 text-gray-600">
                      Min: {coupon.min_order_amount.toLocaleString("fr-FR")} FCFA
                      {coupon.max_discount_amount ? ` (Plafond: ${coupon.max_discount_amount.toLocaleString("fr-FR")} FCFA)` : ""}
                    </td>
                    <td className="p-4">
                      <span className="font-bold text-gray-900">{coupon.used_count || 0}</span> / {coupon.usage_limit}
                    </td>
                    <td className="p-4 text-gray-500">
                      {new Date(coupon.expires_at).toLocaleDateString("fr-FR")}
                    </td>
                    <td className="p-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black ${
                        coupon.is_active ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-500"
                      }`}>
                        {coupon.is_active ? "Actif" : "Désactivé"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => handleToggleCoupon(coupon)}
                          className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors cursor-pointer"
                        >
                          {coupon.is_active ? "Désactiver" : "Activer"}
                        </button>
                        <button
                          onClick={() => handleDeleteCoupon(coupon.id, coupon.code)}
                          className="p-1 text-gray-400 hover:text-red-600 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: LOYALTY */}
      {/* ======================================================== */}
      {activeTab === "loyalty" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Comptes Membres</span>
              <p className="text-2xl font-black text-gray-900">{loyaltyAccountsCount}</p>
              <span className="text-[11px] text-gray-500 font-medium">Clients inscrits au Club</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Points en Circulation</span>
              <p className="text-2xl font-black text-amber-600">
                {totalCirculatingPoints.toLocaleString("fr-FR")} <span className="text-xs">pts</span>
              </p>
              <span className="text-[11px] text-gray-500 font-medium">
                Équivaut à {(totalCirculatingPoints * loyaltySettings.point_value_cfa).toLocaleString("fr-FR")} FCFA
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Points Utilisés (Brûlés)</span>
              <p className="text-2xl font-black text-emerald-600">
                {totalBurnedPoints.toLocaleString("fr-FR")} <span className="text-xs">pts</span>
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Convertis en réductions réelles</span>
            </div>
          </div>

          {/* Loyalty Settings Form */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-4">
            <h2 className="font-black text-lg text-gray-900 flex items-center gap-2">
              <Sliders size={20} className="text-amber-600" />
              Barèmes &amp; Règles du Kalagban Club
            </h2>

            <form onSubmit={handleSaveLoyaltySettings} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Gain par tranche de 1 000 FCFA</label>
                  <input
                    type="number"
                    min={1}
                    value={loyaltySettings.points_per_1000_cfa}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, points_per_1000_cfa: parseInt(e.target.value) || 10 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Valeur de 1 point (FCFA)</label>
                  <input
                    type="number"
                    min={1}
                    value={loyaltySettings.point_value_cfa}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, point_value_cfa: parseInt(e.target.value) || 5 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Seuil min de conversion (pts)</label>
                  <input
                    type="number"
                    min={1}
                    value={loyaltySettings.min_points_to_redeem}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, min_points_to_redeem: parseInt(e.target.value) || 100 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isSavingSettings ? "Enregistrement..." : "Sauvegarder les Barèmes"}
                </button>
              </div>
            </form>
          </div>

          {/* Recent Loyalty Transactions & Referrals */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Transactions */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <Award size={16} className="text-amber-600" />
                Dernières Transactions Points ({recentTransactions.length})
              </h3>
              {recentTransactions.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Aucune transaction enregistrée.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recentTransactions.map((tx) => (
                    <div key={tx.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-bold text-gray-800">{tx.description}</p>
                        <p className="text-[10px] text-gray-400">{new Date(tx.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <span className={`font-black font-mono ${tx.points > 0 ? "text-emerald-600" : "text-red-600"}`}>
                        {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Referrals */}
            <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
              <h3 className="font-black text-sm text-gray-900 flex items-center gap-2">
                <Gift size={16} className="text-pink-600" />
                Derniers Parrainages ({recentReferrals.length})
              </h3>
              {recentReferrals.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-6">Aucun parrainage enregistré.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {recentReferrals.map((ref) => (
                    <div key={ref.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between text-xs">
                      <div>
                        <p className="font-mono font-bold text-gray-800">Code : {ref.referral_code}</p>
                        <p className="text-[10px] text-gray-400">{new Date(ref.created_at).toLocaleDateString("fr-FR")}</p>
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700">
                        {ref.status || "Validé"} (+{ref.reward_points_referrer} pts)
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: CREATE SDUI PROMO CAMPAIGN */}
      {/* ======================================================== */}
      {showAddCampaignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-3xl w-full max-h-[94vh] sm:max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 shrink-0 bg-white">
              <div className="flex items-center gap-2.5 sm:gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl sm:rounded-2xl bg-orange-100 text-orange-600 flex items-center justify-center font-black shrink-0 shadow-xs">
                  <Sparkles size={18} className="sm:w-5 sm:h-5" />
                </div>
                <div>
                  <h3 className="font-black text-sm sm:text-base text-gray-900 leading-tight">Nouvelle Campagne Promotionnelle (SDUI)</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500">Mise à jour en direct sur mobile sans recompilation</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAddCampaignModal(false)} 
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleCreatePromoCampaign} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-5 custom-scrollbar">
                {/* Title & Slug */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Titre de l&apos;Événement *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Spécial Rentrée Scolaire 2026"
                      value={newPromoCampaign.title}
                      onChange={(e) => {
                        const t = e.target.value;
                        setNewPromoCampaign({
                          ...newPromoCampaign,
                          title: t,
                          slug: slugify(t),
                        });
                      }}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Identifiant URL (Slug) *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-2.5 text-xs text-gray-400 font-mono">/promo/</span>
                      <input
                        type="text"
                        required
                        value={newPromoCampaign.slug}
                        onChange={(e) => setNewPromoCampaign({ ...newPromoCampaign, slug: slugify(e.target.value) })}
                        className="w-full pl-18 pr-3 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-indigo-600 focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Subtitle & Badge */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Accroche / Sous-titre</label>
                    <input
                      type="text"
                      placeholder="Ex: Jusqu'à -40% sur tous les kits et fournitures"
                      value={newPromoCampaign.subtitle}
                      onChange={(e) => setNewPromoCampaign({ ...newPromoCampaign, subtitle: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Badge Promo</label>
                    <input
                      type="text"
                      placeholder="JUSQU'À -40%"
                      value={newPromoCampaign.badge_text}
                      onChange={(e) => setNewPromoCampaign({ ...newPromoCampaign, badge_text: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold uppercase focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Theme Color & Countdown */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1.5">Couleur du Thème Graphique</label>
                    <div className="flex items-center gap-2 flex-wrap">
                      {THEME_COLORS.map((c) => (
                        <button
                          key={c.hex}
                          type="button"
                          onClick={() => setNewPromoCampaign({ ...newPromoCampaign, theme_color: c.hex })}
                          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full ${c.bgClass} flex items-center justify-center cursor-pointer transition-transform ${
                            newPromoCampaign.theme_color === c.hex ? "ring-2 ring-offset-2 ring-slate-900 scale-110 shadow-xs" : "hover:scale-105"
                          }`}
                          title={c.label}
                        >
                          {newPromoCampaign.theme_color === c.hex && <Check size={14} className="text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="flex flex-wrap items-center justify-between gap-1 mb-1">
                      <label className="text-[11px] font-bold text-gray-700">Compte à Rebours (Fin de Promo)</label>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => setDurationPreset(1)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-[9px] font-bold text-gray-600 cursor-pointer transition-colors"
                        >
                          24h
                        </button>
                        <button
                          type="button"
                          onClick={() => setDurationPreset(3)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-[9px] font-bold text-gray-600 cursor-pointer transition-colors"
                        >
                          3j
                        </button>
                        <button
                          type="button"
                          onClick={() => setDurationPreset(7)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-[9px] font-bold text-gray-600 cursor-pointer transition-colors"
                        >
                          7j
                        </button>
                        <button
                          type="button"
                          onClick={() => setDurationPreset(15)}
                          className="px-1.5 py-0.5 rounded bg-gray-100 hover:bg-orange-100 hover:text-orange-700 text-[9px] font-bold text-gray-600 cursor-pointer transition-colors"
                        >
                          15j
                        </button>
                      </div>
                    </div>
                    <input
                      type="datetime-local"
                      value={newPromoCampaign.countdown_end}
                      onChange={(e) => setNewPromoCampaign({ ...newPromoCampaign, countdown_end: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Banner Upload */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Affiche / Bannière Promo (1200x500 ou 500x500)</label>
                  <div className="flex items-center gap-3">
                    <div 
                      onClick={() => bannerFileRef.current?.click()}
                      className="flex-1 p-3 border-2 border-dashed border-gray-200 hover:border-orange-500 rounded-2xl flex items-center justify-center gap-2 cursor-pointer bg-gray-50 hover:bg-orange-50/50 transition-colors"
                    >
                      <UploadCloud size={18} className="text-orange-600 shrink-0" />
                      <span className="text-xs font-bold text-gray-700 text-center">
                        {uploadingBanner ? "Téléversement en cours..." : "Glisser ou Choisir une Affiche"}
                      </span>
                    </div>
                    <input
                      ref={bannerFileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0];
                        if (f) handleUploadBanner(f);
                      }}
                    />
                  </div>

                  {newPromoCampaign.banner_url && (
                    <div className="mt-2 relative h-24 sm:h-28 w-full rounded-xl overflow-hidden border border-gray-200 shadow-2xs">
                      <Image
                        src={newPromoCampaign.banner_url}
                        alt="Preview"
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    </div>
                  )}
                </div>

                {/* SECTION 1: CATALOGUE SELECTION */}
                <div className="space-y-2.5 border-t border-gray-100 pt-4">
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                      <Package size={15} className="text-orange-600" />
                      1. Sélectionner les Produits du Catalogue
                    </label>
                    <span className="text-[10px] sm:text-[11px] text-gray-500 font-medium">
                      {catalogProducts.length} produit{catalogProducts.length > 1 ? "s" : ""} disponible{catalogProducts.length > 1 ? "s" : ""}
                    </span>
                  </div>

                  {/* Search Bar */}
                  <div className="relative">
                    <Search size={15} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher un produit par titre ou catégorie (ex: meuble, sac, kit, cahier, téléphone)..."
                      value={productSearchTerm}
                      onChange={(e) => setProductSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-hidden focus:border-orange-500 focus:bg-white transition-all"
                    />
                    {productSearchTerm.trim() && (
                      <button
                        type="button"
                        onClick={() => setProductSearchTerm("")}
                        className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600 cursor-pointer"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Catalog List */}
                  <div className="max-h-48 sm:max-h-56 overflow-y-auto border border-gray-200 rounded-2xl p-2 space-y-1.5 bg-gray-50/50 custom-scrollbar">
                    {loadingCatalog ? (
                      <div className="text-center py-6 space-y-1">
                        <div className="w-5 h-5 border-2 border-orange-600 border-t-transparent rounded-full animate-spin mx-auto" />
                        <p className="text-[11px] text-gray-400 font-medium">Recherche dans la base de données...</p>
                      </div>
                    ) : catalogProducts.length === 0 ? (
                      <div className="text-center py-6 text-gray-400 space-y-1">
                        <p className="text-xs font-bold text-gray-600">Aucun produit trouvé pour &quot;{productSearchTerm}&quot;</p>
                        <p className="text-[10px]">Vérifiez l&apos;orthographe ou essayez un mot plus général.</p>
                      </div>
                    ) : (
                      catalogProducts.map((prod) => {
                        const isSelected = selectedProducts.some((p) => p.product_id === prod.id);
                        const imgUrl = getProductImage(prod);

                        return (
                          <div
                            key={prod.id}
                            onClick={() => toggleSelectProduct(prod)}
                            className={`p-2.5 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs cursor-pointer transition-all ${
                              isSelected
                                ? "bg-orange-100/70 border border-orange-300 text-orange-950 shadow-2xs"
                                : "bg-white hover:bg-orange-50/50 border border-gray-100"
                            }`}
                          >
                            <div className="flex items-center gap-3 overflow-hidden min-w-0">
                              <div className="w-10 h-10 rounded-lg overflow-hidden bg-gray-100 relative shrink-0 border border-gray-200">
                                <Image
                                  src={imgUrl}
                                  alt={prod.title}
                                  fill
                                  className="object-cover"
                                  unoptimized
                                />
                              </div>
                              <div className="truncate min-w-0">
                                <p className="font-bold text-gray-900 truncate">{prod.title}</p>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className="text-[10px] text-gray-500 font-medium truncate">
                                    Catégorie : {prod.category || prod.category_id || "Général"}
                                  </span>
                                  <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold shrink-0">
                                    Stock : {prod.stock_quantity ?? prod.stock ?? 0}
                                  </span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-1 sm:pt-0 border-t sm:border-t-0 border-gray-100">
                              <span className="font-extrabold text-gray-900">
                                {Number(prod.price).toLocaleString()} FCFA
                              </span>
                              <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 ${
                                isSelected
                                  ? "bg-orange-600 text-white"
                                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                              }`}>
                                {isSelected ? (
                                  <>
                                    <Check size={12} /> Ajouté
                                  </>
                                ) : (
                                  <>
                                    <Plus size={12} /> Ajouter
                                  </>
                                )}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                {/* SECTION 2: GRID LAYOUT */}
                <div className="space-y-2.5 border-t border-gray-100 pt-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <label className="text-xs font-black text-gray-900 flex items-center gap-1.5">
                        <Sparkles size={15} className="text-amber-500" />
                        2. Disposition de la Grille Promo ({selectedProducts.length} articles)
                      </label>
                      <p className="text-[10px] text-gray-500">
                        Voici les cartes de produits qui composeront la grille dans l&apos;application mobile.
                      </p>
                    </div>

                    {selectedProducts.length > 0 && (
                      <div className="flex items-center gap-1.5 bg-gray-50 p-1.5 rounded-xl border border-gray-200 self-start sm:self-auto flex-wrap">
                        <span className="text-[10px] font-bold text-gray-600">Remise globale :</span>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min={1}
                            max={99}
                            value={globalDiscountPct}
                            onChange={(e) => setGlobalDiscountPct(parseInt(e.target.value) || 20)}
                            className="w-12 px-1.5 py-0.5 rounded-lg bg-white border border-gray-300 text-[11px] font-bold text-center"
                          />
                          <span className="text-[11px] font-bold">%</span>
                        </div>
                        <button
                          type="button"
                          onClick={applyBulkDiscount}
                          className="px-2 py-1 bg-slate-900 text-white rounded-lg text-[10px] font-bold hover:bg-slate-800 cursor-pointer"
                        >
                          Appliquer à tous
                        </button>
                      </div>
                    )}
                  </div>

                  {selectedProducts.length === 0 ? (
                    <div className="p-6 border-2 border-dashed border-gray-200 rounded-2xl text-center space-y-1 bg-gray-50/40">
                      <p className="text-xs font-bold text-gray-600">Aucun produit dans la grille pour le moment</p>
                      <p className="text-[11px] text-gray-400">
                        Cliquez sur &quot;+ Ajouter&quot; dans la liste du catalogue ci-dessus pour composer votre sélection.
                      </p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-56 sm:max-h-64 overflow-y-auto p-1 custom-scrollbar">
                      {selectedProducts.map((sp) => (
                        <div
                          key={sp.product_id}
                          className="p-3 bg-white border border-gray-200 rounded-2xl shadow-2xs space-y-2 relative"
                        >
                          <div className="flex items-start gap-2.5">
                            <div className="w-12 h-12 rounded-xl bg-gray-100 overflow-hidden relative shrink-0 border border-gray-100">
                              <Image
                                src={sp.image_url || "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=600"}
                                alt={sp.title}
                                fill
                                className="object-cover"
                                unoptimized
                              />
                            </div>
                            <div className="flex-1 min-w-0 pr-6">
                              <p className="font-bold text-xs text-gray-900 truncate">{sp.title}</p>
                              <p className="text-[11px] text-gray-400 line-through">
                                {Number(sp.price).toLocaleString()} FCFA
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedProducts(selectedProducts.filter((p) => p.product_id !== sp.product_id))}
                              className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-600 p-1 rounded-md hover:bg-red-50 cursor-pointer"
                              title="Retirer de la grille"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>

                          <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100 text-[10px]">
                            <div>
                              <label className="text-gray-500 font-bold block mb-0.5">Remise (%)</label>
                              <div className="flex items-center gap-1">
                                <input
                                  type="number"
                                  min={1}
                                  max={99}
                                  value={sp.discount_percentage}
                                  onChange={(e) => updateProductDiscount(sp.product_id, parseInt(e.target.value) || 1)}
                                  className="w-full px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 font-bold text-orange-600"
                                />
                              </div>
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-0.5">
                                <label className="text-gray-500 font-bold block">Stock Quota</label>
                                {sp.available_stock !== undefined && (
                                  <span className="text-[9px] text-emerald-600 font-bold">Dispo: {sp.available_stock}</span>
                                )}
                              </div>
                              <input
                                type="number"
                                min={1}
                                value={sp.stock_allocated}
                                onChange={(e) => updateProductStock(sp.product_id, parseInt(e.target.value) || 1)}
                                className="w-full px-2 py-1 rounded-lg bg-gray-50 border border-gray-200 font-bold"
                              />
                            </div>
                          </div>

                          <div className="bg-orange-50/80 p-2 rounded-xl flex items-center justify-between text-xs">
                            <span className="text-[10px] font-bold text-orange-900">Prix Promo Mobile :</span>
                            <span className="font-black text-orange-600">
                              {Number(sp.special_price).toLocaleString()} FCFA
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Pinned Modal Footer */}
              <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 shrink-0 bg-gray-50/70">
                <button
                  type="button"
                  onClick={() => setShowAddCampaignModal(false)}
                  className="w-full sm:w-1/3 py-2.5 sm:py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer transition-colors text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCampaign || selectedProducts.length === 0}
                  className="w-full sm:w-2/3 py-2.5 sm:py-3 rounded-xl bg-linear-to-r from-orange-600 to-amber-600 text-white font-bold text-xs hover:from-orange-700 hover:to-amber-700 shadow-md cursor-pointer disabled:opacity-50 transition-all text-center flex items-center justify-center gap-2"
                >
                  {isSubmittingCampaign ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Publication en cours...
                    </>
                  ) : (
                    `🚀 Publier la Grille (${selectedProducts.length} articles)`
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: ADD COUPON */}
      {/* ======================================================== */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 shrink-0 bg-white">
              <h3 className="font-black text-base sm:text-lg text-gray-900">Nouveau Code Promo</h3>
              <button 
                onClick={() => setShowAddCouponModal(false)} 
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Code Réduction</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: BIENVENUE20"
                    value={newCoupon.code}
                    onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold uppercase focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Type de Remise</label>
                    <select
                      value={newCoupon.discount_type}
                      onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as "percentage" | "fixed_amount" })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                    >
                      <option value="percentage">Pourcentage (%)</option>
                      <option value="fixed_amount">Montant Fixe (FCFA)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Valeur</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newCoupon.discount_value}
                      onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Panier Minimum (FCFA)</label>
                    <input
                      type="number"
                      required
                      min={0}
                      value={newCoupon.min_order_amount}
                      onChange={(e) => setNewCoupon({ ...newCoupon, min_order_amount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Plafond Max Remise (FCFA)</label>
                    <input
                      type="number"
                      placeholder="Optionnel"
                      value={newCoupon.max_discount_amount || ""}
                      onChange={(e) => setNewCoupon({ ...newCoupon, max_discount_amount: parseInt(e.target.value) || 0 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Limite d&apos;utilisations</label>
                    <input
                      type="number"
                      required
                      min={1}
                      value={newCoupon.usage_limit}
                      onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: parseInt(e.target.value) || 100 })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">Date d&apos;Expiration</label>
                    <input
                      type="date"
                      required
                      value={newCoupon.expires_at}
                      onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-pink-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 shrink-0 bg-gray-50/70">
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(false)}
                  className="w-full sm:w-1/2 py-2.5 sm:py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer transition-colors text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="w-full sm:w-1/2 py-2.5 sm:py-3 rounded-xl bg-pink-600 text-white font-bold text-xs hover:bg-pink-700 shadow-md cursor-pointer transition-all text-center"
                >
                  Créer le Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: MANUAL ADJUSTMENT */}
      {/* ======================================================== */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-hidden animate-in fade-in">
          <div className="bg-white rounded-2xl sm:rounded-3xl max-w-md w-full max-h-[92vh] sm:max-h-[88vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden">
            <div className="flex items-center justify-between border-b border-gray-100 p-4 sm:p-6 shrink-0 bg-white">
              <h3 className="font-black text-base sm:text-lg text-gray-900 flex items-center gap-2">
                <Gift size={20} className="text-amber-600" />
                Geste Commercial (Points)
              </h3>
              <button 
                onClick={() => setShowAdjustmentModal(false)} 
                className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleManualAdjustment} className="flex-1 flex flex-col overflow-hidden min-h-0">
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3.5 custom-scrollbar">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Email du Client</label>
                  <input
                    type="email"
                    required
                    placeholder="client@gmail.com"
                    value={adjustmentTargetEmail}
                    onChange={(e) => setAdjustmentTargetEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-hidden focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Points à créditer (+)</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={adjustmentPoints}
                    onChange={(e) => setAdjustmentPoints(parseInt(e.target.value) || 0)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-emerald-600 focus:outline-hidden focus:border-amber-500 focus:bg-white transition-all"
                  />
                  <p className="text-[10px] text-gray-400 mt-1">
                    Équivaut à {(adjustmentPoints * loyaltySettings.point_value_cfa).toLocaleString("fr-FR")} FCFA de pouvoir d&apos;achat.
                  </p>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Motif d&apos;Audit Obligatoire</label>
                  <textarea
                    required
                    rows={2}
                    placeholder="Ex: Dédommagement retard de livraison commande #8204"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium resize-none focus:outline-hidden focus:border-amber-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div className="p-4 sm:p-6 border-t border-gray-100 flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3 shrink-0 bg-gray-50/70">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="w-full sm:w-1/2 py-2.5 sm:py-3 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-100 cursor-pointer transition-colors text-center"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAdjustment}
                  className="w-full sm:w-1/2 py-2.5 sm:py-3 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-md cursor-pointer disabled:opacity-50 transition-all text-center"
                >
                  {isProcessingAdjustment ? "Attribution..." : "Créditer les Points"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
