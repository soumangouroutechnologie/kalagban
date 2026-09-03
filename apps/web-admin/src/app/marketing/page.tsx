"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Check
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
  title: string;
  description: string;
  target_audience: string;
  channel: string;
  status: "draft" | "scheduled" | "active" | "completed" | "paused";
  impressions_count: number;
  clicks_count: number;
  conversions_count: number;
  starts_at: string;
  ends_at?: string;
  created_at: string;
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

export default function MarketingPage() {
  const { toast, confirm } = useToast();

  const [activeTab, setActiveTab] = useState<"coupons" | "loyalty" | "campaigns">("coupons");

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

  const [newCampaign, setNewCampaign] = useState({
    title: "",
    description: "",
    target_audience: "all" as "all" | "buyers" | "sellers" | "vip_buyers",
    channel: "push_and_banner" as "banner" | "push_notification" | "push_and_banner",
    starts_at: "",
    ends_at: "",
  });

  const openAddCouponModal = () => {
    const today = new Date();
    const in30Days = new Date(today.getTime() + 30 * 86400000);
    setNewCoupon((prev) => ({
      ...prev,
      expires_at: in30Days.toISOString().split("T")[0],
    }));
    setShowAddCouponModal(true);
  };

  const openAddCampaignModal = () => {
    const today = new Date();
    const in15Days = new Date(today.getTime() + 15 * 86400000);
    setNewCampaign((prev) => ({
      ...prev,
      starts_at: today.toISOString().split("T")[0],
      ends_at: in15Days.toISOString().split("T")[0],
    }));
    setShowAddCampaignModal(true);
  };

  const fetchMarketingData = useCallback(async () => {
    try {
      // 1. Fetch Coupons
      const { data: coupData } = await supabase
        .from("marketing_coupons")
        .select("*")
        .order("created_at", { ascending: false });
      setCoupons(coupData || []);

      // 2. Fetch Total savings from coupon_redemptions
      const { data: redemptions } = await supabase
        .from("coupon_redemptions")
        .select("discount_applied");
      if (redemptions) {
        const sum = redemptions.reduce((acc, curr) => acc + (Number(curr.discount_applied) || 0), 0);
        setTotalCouponSavings(sum);
      }

      // 3. Fetch Campaigns
      const { data: campData } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false });
      setCampaigns(campData || []);

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

      // 6. Fetch Burned Points (negative transactions)
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
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_campaigns" }, () => fetchMarketingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_accounts" }, () => fetchMarketingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "loyalty_transactions" }, () => fetchMarketingData())
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
  const handleDeleteCoupon = async (coupon: Coupon) => {
    const ok = await confirm({
      title: `Supprimer le code ${coupon.code} ?`,
      message: "Cette action supprimera définitivement le coupon. Les commandes passées conserveront leur historique.",
      confirmText: "Oui, supprimer",
      cancelText: "Annuler",
      type: "danger"
    });

    if (!ok) return;

    try {
      const { error } = await supabase.from("marketing_coupons").delete().eq("id", coupon.id);
      if (error) throw error;
      toast.success(`Le coupon ${coupon.code} a été supprimé.`);
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
        .update({
          points_per_1000_cfa: loyaltySettings.points_per_1000_cfa,
          point_value_cfa: loyaltySettings.point_value_cfa,
          min_points_to_redeem: loyaltySettings.min_points_to_redeem,
          max_discount_pct: loyaltySettings.max_discount_pct,
          referral_reward_referrer: loyaltySettings.referral_reward_referrer,
          referral_reward_referred: loyaltySettings.referral_reward_referred,
          updated_at: new Date().toISOString(),
        })
        .eq("id", loyaltySettings.id);

      if (error) throw error;
      toast.success("Barème de fidélité et parrainage mis à jour avec succès !", "Configuration Enregistrée");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la sauvegarde des paramètres.";
      toast.error(msg);
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Manual Loyalty Adjustment (Geste Commercial)
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
      // Find profile by email
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

  // Handle Create Campaign
  const handleCreateCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (!newCampaign.title.trim()) {
        toast.error("Le titre de la campagne est obligatoire.");
        return;
      }

      const { error } = await supabase.from("marketing_campaigns").insert({
        title: newCampaign.title.trim(),
        description: newCampaign.description.trim(),
        target_audience: newCampaign.target_audience,
        channel: newCampaign.channel,
        status: "active",
        starts_at: new Date(newCampaign.starts_at).toISOString(),
        ends_at: newCampaign.ends_at ? new Date(newCampaign.ends_at).toISOString() : null,
      });

      if (error) throw error;
      toast.success(`La campagne "${newCampaign.title}" a été activée !`, "Campagne Lancée");
      setShowAddCampaignModal(false);
      fetchMarketingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur lors de la création de la campagne.";
      toast.error(msg);
    }
  };

  const filteredCoupons = coupons.filter(c => 
    c.code.toLowerCase().includes(searchFilter.toLowerCase())
  );

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-linear-to-br from-pink-500 to-rose-600 text-white rounded-2xl flex items-center justify-center font-black shadow-md shadow-pink-500/20">
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Marketing, Fidélisation &amp; Coupons</h1>
            <p className="text-xs text-gray-500 font-medium">
              Acquisition client, bons d&apos;achat, programme Kalagban Club et parrainage
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "loyalty" ? (
            <button
              onClick={() => setShowAdjustmentModal(true)}
              className="bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-amber-600/20 transition-all"
            >
              <Gift size={16} /> Geste Commercial / Crédit
            </button>
          ) : activeTab === "campaigns" ? (
            <button
              onClick={openAddCampaignModal}
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
            >
              <Plus size={16} /> Créer une Campagne
            </button>
          ) : (
            <button
              onClick={openAddCouponModal}
              className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-600/20 transition-all"
            >
              <Plus size={16} /> Créer un Code Promo
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto custom-scrollbar">
        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "coupons"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Ticket size={16} /> Codes Promo &amp; Bons d&apos;Achat ({coupons.length})
        </button>

        <button
          onClick={() => setActiveTab("loyalty")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "loyalty"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Award size={16} /> Club Fidélité &amp; Parrainage ({loyaltyAccountsCount})
        </button>

        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "campaigns"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Megaphone size={16} /> Campagnes &amp; Bannières ({campaigns.length})
        </button>
      </div>

      {/* ======================================================== */}
      {/* TAB 1: COUPONS */}
      {/* ======================================================== */}
      {activeTab === "coupons" && (
        <div className="space-y-6">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Codes Actifs</span>
              <p className="text-2xl font-black text-gray-900">
                {coupons.filter(c => c.is_active).length} <span className="text-xs font-bold text-gray-400">/ {coupons.length}</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-bold">Prêts à l&apos;emploi au checkout</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Utilisations Cumulées</span>
              <p className="text-2xl font-black text-indigo-600">
                {coupons.reduce((acc, c) => acc + (c.used_count || 0), 0).toLocaleString("fr-FR")}
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Commandes validées avec coupon</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Économies Accordées</span>
              <p className="text-2xl font-black text-pink-600">
                {totalCouponSavings.toLocaleString("fr-FR")} <span className="text-xs">FCFA</span>
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Pouvoir d&apos;achat offert aux clients</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
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
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl border border-gray-100">
            <Search size={16} className="text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un code réduction (ex: BIENVENUE, PROMO10)..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="w-full text-xs font-bold text-gray-800 placeholder:text-gray-400 outline-hidden bg-transparent"
            />
          </div>

          {/* Coupon Grid */}
          {filteredCoupons.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-gray-50/60 rounded-3xl border border-dashed border-gray-200">
              <Ticket className="mx-auto text-gray-300 w-12 h-12" />
              <p className="text-sm font-extrabold text-gray-700">Aucun code promo correspondant</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Créez des codes promotionnels pour stimuler les ventes et fidéliser vos acheteurs.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredCoupons.map((coupon) => {
                const isExpired = new Date(coupon.expires_at) < new Date();
                const usagePercent = Math.min(100, Math.round(((coupon.used_count || 0) / (coupon.usage_limit || 1)) * 100));

                return (
                  <div key={coupon.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
                    <div className="space-y-3">
                      <div className="flex items-start justify-between">
                        <span className="font-mono font-black text-base px-3 py-1 bg-pink-50 text-pink-700 rounded-xl border border-pink-200">
                          {coupon.code}
                        </span>

                        <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isExpired 
                            ? "bg-red-50 text-red-700 border border-red-200" 
                            : coupon.is_active 
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                              : "bg-gray-100 text-gray-500"
                        }`}>
                          {isExpired ? "Expiré ⏳" : coupon.is_active ? "Actif 🟢" : "Désactivé ⚪"}
                        </span>
                      </div>

                      <div className="space-y-1">
                        <div className="text-2xl font-black text-gray-900">
                          {coupon.discount_type === "percentage" ? `-${coupon.discount_value}%` : `-${coupon.discount_value.toLocaleString("fr-FR")} FCFA`}
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          Dès {coupon.min_order_amount.toLocaleString("fr-FR")} FCFA d&apos;achat
                          {coupon.max_discount_amount && (
                            <span className="block text-[10px] text-gray-400">Plafond : {coupon.max_discount_amount.toLocaleString("fr-FR")} FCFA</span>
                          )}
                        </p>
                      </div>

                      {/* Usage Progress */}
                      <div className="space-y-1">
                        <div className="flex justify-between text-xs font-bold text-gray-600">
                          <span>Utilisations :</span>
                          <span className="font-mono text-gray-900">{coupon.used_count || 0} / {coupon.usage_limit}</span>
                        </div>
                        <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all ${usagePercent >= 90 ? "bg-red-500" : "bg-pink-500"}`} 
                            style={{ width: `${usagePercent}%` }}
                          ></div>
                        </div>
                      </div>

                      <div className="bg-gray-50 p-3 rounded-2xl text-[11px] text-gray-500 flex justify-between">
                        <span>Expire le :</span>
                        <span className="font-bold text-gray-700">
                          {new Date(coupon.expires_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                      <button
                        onClick={() => handleToggleCoupon(coupon)}
                        className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                          coupon.is_active ? "bg-amber-50 text-amber-700 hover:bg-amber-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        }`}
                      >
                        {coupon.is_active ? "Mettre en pause" : "Activer"}
                      </button>

                      <button
                        onClick={() => handleDeleteCoupon(coupon)}
                        className="text-xs font-bold text-red-600 hover:bg-red-50 p-2 rounded-xl transition-colors cursor-pointer"
                        title="Supprimer le coupon"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 2: LOYALTY & REFERRALS (KALAGBAN CLUB) */}
      {/* ======================================================== */}
      {activeTab === "loyalty" && (
        <div className="space-y-8 animate-in fade-in">
          {/* KPI CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Adhérents au Club</span>
              <p className="text-2xl font-black text-amber-600 font-mono">
                {loyaltyAccountsCount.toLocaleString("fr-FR")}
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Acheteurs avec compte fidélité</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Points en Circulation</span>
              <p className="text-2xl font-black text-indigo-600 font-mono">
                {totalCirculatingPoints.toLocaleString("fr-FR")} <span className="text-xs">pts</span>
              </p>
              <span className="text-[11px] text-emerald-600 font-bold">
                Valeur : {(totalCirculatingPoints * loyaltySettings.point_value_cfa).toLocaleString("fr-FR")} FCFA
              </span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Points Brûlés (Burn Rate)</span>
              <p className="text-2xl font-black text-emerald-600 font-mono">
                {totalBurnedPoints.toLocaleString("fr-FR")} <span className="text-xs">pts</span>
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Convertis en réductions réelles</span>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black uppercase text-gray-400">Parrainages Initiés</span>
              <p className="text-2xl font-black text-pink-600 font-mono">
                {recentReferrals.length}
              </p>
              <span className="text-[11px] text-gray-500 font-medium">Filleuls invités par des clients</span>
            </div>
          </div>

          {/* DYNAMIC SETTINGS FORM */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-black">
                <Sliders size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Paramétrage du Barème de Fidélité</h3>
                <p className="text-xs text-gray-500 font-medium">Modifiez les règles de conversion des points et récompenses sans recompiler l&apos;application</p>
              </div>
            </div>

            <form onSubmit={handleSaveLoyaltySettings} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    Points gagnés par tranche de 1 000 FCFA
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={loyaltySettings.points_per_1000_cfa}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, points_per_1000_cfa: parseInt(e.target.value) || 10 })}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Ex: 10 points = 10 pts offerts par tranche de 1 000 FCFA dépensés</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    Valeur d&apos;un point au paiement (FCFA)
                  </label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={loyaltySettings.point_value_cfa}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, point_value_cfa: parseFloat(e.target.value) || 5 })}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Ex: 5 FCFA = 100 points déduisent 500 FCFA du panier</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    Seuil minimum pour utiliser ses points
                  </label>
                  <input
                    type="number"
                    required
                    min={10}
                    value={loyaltySettings.min_points_to_redeem}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, min_points_to_redeem: parseInt(e.target.value) || 100 })}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Nombre minimum de points requis pour afficher l&apos;option au checkout</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    Plafond max de réduction panier (%)
                  </label>
                  <input
                    type="number"
                    required
                    min={5}
                    max={100}
                    value={loyaltySettings.max_discount_pct}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, max_discount_pct: parseInt(e.target.value) || 30 })}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Pourcentage maximum du total du panier payable avec des points (ex: 30%)</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    Bonus au Parrain (1ère commande)
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={loyaltySettings.referral_reward_referrer}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, referral_reward_referrer: parseInt(e.target.value) || 500 })}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Points crédités au parrain dès que son filleul finalise son premier achat</p>
                </div>

                <div>
                  <label className="block text-xs font-black text-gray-700 mb-1.5">
                    Bonus de Bienvenue au Filleul
                  </label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={loyaltySettings.referral_reward_referred}
                    onChange={(e) => setLoyaltySettings({ ...loyaltySettings, referral_reward_referred: parseInt(e.target.value) || 250 })}
                    className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold font-mono"
                  />
                  <p className="text-[11px] text-gray-400 mt-1">Points offerts au nouveau client qui s&apos;est inscrit avec un code parrain</p>
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-gray-100">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-2xl shadow-md shadow-amber-600/20 transition-all cursor-pointer flex items-center gap-2"
                >
                  <Check size={16} />
                  {isSavingSettings ? "Enregistrement..." : "Mettre à jour les paramètres du Club"}
                </button>
              </div>
            </form>
          </div>

          {/* RECENT CLUB TRANSACTIONS */}
          <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs space-y-4">
            <h3 className="text-lg font-black text-gray-900">Dernières Opérations de Points de Fidélité</h3>

            {recentTransactions.length === 0 ? (
              <p className="text-xs text-gray-400 py-6 text-center">Aucune transaction de fidélité enregistrée pour l&apos;instant.</p>
            ) : (
              <div className="overflow-x-auto custom-scrollbar">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 font-extrabold text-[10px] uppercase tracking-wider">
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Client ID</th>
                      <th className="pb-3">Type</th>
                      <th className="pb-3">Description</th>
                      <th className="pb-3 text-right">Points</th>
                      <th className="pb-3 text-right">Solde Après</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {recentTransactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="py-3 text-gray-500 font-medium">
                          {new Date(tx.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                        </td>
                        <td className="py-3 font-mono font-bold text-gray-700">
                          {tx.user_id ? `${tx.user_id.slice(0, 8)}...` : "—"}
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            tx.points > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
                          }`}>
                            {tx.transaction_type}
                          </span>
                        </td>
                        <td className="py-3 text-gray-800 font-medium">{tx.description}</td>
                        <td className={`py-3 text-right font-black font-mono ${tx.points > 0 ? `+${tx.points}` : tx.points}`}>
                          {tx.points > 0 ? `+${tx.points}` : tx.points} pts
                        </td>
                        <td className="py-3 text-right text-gray-700 font-bold font-mono">
                          {tx.balance_after} pts
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* TAB 3: CAMPAIGNS */}
      {/* ======================================================== */}
      {activeTab === "campaigns" && (
        <div className="space-y-6 animate-in fade-in">
          {campaigns.length === 0 ? (
            <div className="py-16 text-center space-y-3 bg-gray-50/60 rounded-3xl border border-dashed border-gray-200">
              <Megaphone className="mx-auto text-gray-300 w-12 h-12" />
              <p className="text-sm font-extrabold text-gray-700">Aucune campagne en cours</p>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Planifiez des campagnes marketing ciblées pour booster la notoriété et les conversions.
              </p>
              <button
                onClick={openAddCampaignModal}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                + Créer une première campagne
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {campaigns.map((camp) => (
                <div key={camp.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                        {camp.channel}
                      </span>
                      <h3 className="font-extrabold text-base text-gray-900 mt-1">{camp.title}</h3>
                      <p className="text-xs text-gray-500 mt-0.5">{camp.description}</p>
                    </div>
                    <span className="bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full text-xs font-black border border-emerald-200">
                      {camp.status === "active" ? "En Cours 🟢" : camp.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Impressions Vues</span>
                      <p className="text-xl font-black text-gray-900 mt-1">{(camp.impressions_count || 0).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Clics Générés</span>
                      <p className="text-xl font-black text-indigo-600 mt-1">{(camp.clicks_count || 0).toLocaleString("fr-FR")}</p>
                    </div>
                    <div className="bg-gray-50 p-4 rounded-2xl">
                      <span className="text-[10px] font-black text-gray-400 uppercase">Commandes Finalisées</span>
                      <p className="text-xl font-black text-emerald-600 mt-1">{(camp.conversions_count || 0).toLocaleString("fr-FR")}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: ADD COUPON */}
      {/* ======================================================== */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Nouveau Code Promo</h3>
              <button onClick={() => setShowAddCouponModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Code Réduction</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: BIENVENUE20"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Type de Remise</label>
                  <select
                    value={newCoupon.discount_type}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCoupon({ ...newCoupon, discount_type: e.target.value as "percentage" | "fixed_amount" })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
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
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Panier Minimum (FCFA)</label>
                  <input
                    type="number"
                    required
                    min={0}
                    value={newCoupon.min_order_amount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, min_order_amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Plafond Max Remise (FCFA)</label>
                  <input
                    type="number"
                    placeholder="Optionnel"
                    value={newCoupon.max_discount_amount || ""}
                    onChange={(e) => setNewCoupon({ ...newCoupon, max_discount_amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Limite d&apos;utilisations</label>
                  <input
                    type="number"
                    required
                    min={1}
                    value={newCoupon.usage_limit}
                    onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: parseInt(e.target.value) || 100 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Date d&apos;Expiration</label>
                  <input
                    type="date"
                    required
                    value={newCoupon.expires_at}
                    onChange={(e) => setNewCoupon({ ...newCoupon, expires_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white font-bold text-xs hover:bg-pink-700 shadow-md cursor-pointer"
                >
                  Créer le Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: MANUAL GESTE COMMERCIAL / ADJUSTMENT */}
      {/* ======================================================== */}
      {showAdjustmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900 flex items-center gap-2">
                <Gift size={20} className="text-amber-600" />
                Geste Commercial (Points)
              </h3>
              <button onClick={() => setShowAdjustmentModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleManualAdjustment} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Email du Client</label>
                <input
                  type="email"
                  required
                  placeholder="client@gmail.com"
                  value={adjustmentTargetEmail}
                  onChange={(e) => setAdjustmentTargetEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-emerald-600"
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
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium resize-none"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustmentModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isProcessingAdjustment}
                  className="flex-1 py-2.5 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 shadow-md cursor-pointer disabled:opacity-50"
                >
                  {isProcessingAdjustment ? "Attribution..." : "Créditer les Points"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: ADD CAMPAIGN */}
      {/* ======================================================== */}
      {showAddCampaignModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Nouvelle Campagne Marketing</h3>
              <button onClick={() => setShowAddCampaignModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCampaign} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Titre de la Campagne</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rentrée Scolaire 2026"
                  value={newCampaign.title}
                  onChange={(e) => setNewCampaign({ ...newCampaign, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Description / Objectif</label>
                <textarea
                  rows={2}
                  placeholder="Ex: Promotions flash sur les fournitures et électronique..."
                  value={newCampaign.description}
                  onChange={(e) => setNewCampaign({ ...newCampaign, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Audience Cible</label>
                  <select
                    value={newCampaign.target_audience}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCampaign({ ...newCampaign, target_audience: e.target.value as "all" | "buyers" | "sellers" | "vip_buyers" })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  >
                    <option value="all">Tous les utilisateurs</option>
                    <option value="buyers">Acheteurs uniquement</option>
                    <option value="sellers">Vendeurs uniquement</option>
                    <option value="vip_buyers">Membres VIP Platine</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Canal de Diffusion</label>
                  <select
                    value={newCampaign.channel}
                    onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setNewCampaign({ ...newCampaign, channel: e.target.value as "banner" | "push_notification" | "push_and_banner" })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  >
                    <option value="push_and_banner">Bannière + Push</option>
                    <option value="banner">Bannière Web/Mobile</option>
                    <option value="push_notification">Notification Push</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Date de Début</label>
                  <input
                    type="date"
                    required
                    value={newCampaign.starts_at}
                    onChange={(e) => setNewCampaign({ ...newCampaign, starts_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Date de Fin</label>
                  <input
                    type="date"
                    value={newCampaign.ends_at}
                    onChange={(e) => setNewCampaign({ ...newCampaign, ends_at: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs"
                  />
                </div>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCampaignModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  Activer la Campagne
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
