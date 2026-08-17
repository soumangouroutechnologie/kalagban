"use client";

import React, { useState, useEffect } from "react";
import { 
  Megaphone, 
  Plus, 
  Tag, 
  Percent, 
  Calendar, 
  Users, 
  TrendingUp, 
  CheckCircle2, 
  Clock, 
  X, 
  Trash2, 
  Edit, 
  RefreshCw,
  Search,
  Sparkles,
  Ticket
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface Coupon {
  id: string;
  code: string;
  discount_type: "percentage" | "fixed_amount";
  discount_value: number;
  min_order_amount: number;
  usage_limit: number;
  used_count: number;
  starts_at: string;
  expires_at: string;
  is_active: boolean;
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
}

export default function MarketingPage() {
  const { hasPermission, isSuperAdmin } = useAdminAuth();

  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"coupons" | "campaigns">("coupons");
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);

  const [newCoupon, setNewCoupon] = useState({
    code: "",
    discount_type: "percentage" as "percentage" | "fixed_amount",
    discount_value: 10,
    min_order_amount: 10000,
    usage_limit: 100,
    expires_at: new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0],
  });

  const fetchMarketingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch Coupons
      const { data: coupData } = await supabase
        .from("marketing_coupons")
        .select("*")
        .order("created_at", { ascending: false });

      if (coupData && coupData.length > 0) {
        setCoupons(coupData);
      } else {
        setCoupons([
          {
            id: "coup-1",
            code: "BIENVENUE10",
            discount_type: "percentage",
            discount_value: 10,
            min_order_amount: 15000,
            usage_limit: 500,
            used_count: 84,
            starts_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 60 * 86400000).toISOString(),
            is_active: true,
          },
          {
            id: "coup-2",
            code: "MODE2026",
            discount_type: "fixed_amount",
            discount_value: 2000,
            min_order_amount: 25000,
            usage_limit: 200,
            used_count: 112,
            starts_at: new Date().toISOString(),
            expires_at: new Date(Date.now() + 15 * 86400000).toISOString(),
            is_active: true,
          },
        ]);
      }

      // 2. Fetch Campaigns
      const { data: campData } = await supabase
        .from("marketing_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (campData && campData.length > 0) {
        setCampaigns(campData);
      } else {
        setCampaigns([
          {
            id: "camp-1",
            title: "Semaine des Créateurs d'Abidjan",
            description: "Campagne multi-canal mettant en avant les artisans et couturiers ivoiriens certifiés.",
            target_audience: "Tous les acheteurs",
            channel: "Bannière + Push Mobile",
            status: "active",
            impressions_count: 14200,
            clicks_count: 1840,
            conversions_count: 248,
            starts_at: new Date().toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching marketing data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMarketingData();

    const channel = supabase
      .channel("admin_marketing_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_coupons" }, () => fetchMarketingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "marketing_campaigns" }, () => fetchMarketingData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("marketing_coupons").insert({
        code: newCoupon.code.toUpperCase().trim(),
        discount_type: newCoupon.discount_type,
        discount_value: newCoupon.discount_value,
        min_order_amount: newCoupon.min_order_amount,
        usage_limit: newCoupon.usage_limit,
        expires_at: new Date(newCoupon.expires_at).toISOString(),
        is_active: true,
      });

      if (error) throw error;
      setShowAddCouponModal(false);
      fetchMarketingData();
    } catch (err: any) {
      alert("Erreur lors de la création du coupon : " + err.message);
    }
  };

  const handleToggleCoupon = async (coupon: Coupon) => {
    await supabase
      .from("marketing_coupons")
      .update({ is_active: !coupon.is_active })
      .eq("id", coupon.id);
    fetchMarketingData();
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-pink-50 text-pink-600 rounded-2xl flex items-center justify-center font-black">
            <Megaphone size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Marketing, Promotions &amp; Coupons</h1>
            <p className="text-xs text-gray-500 font-medium">
              Acquisition client, codes promotionnels et suivi des campagnes de conversion
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddCouponModal(true)}
          className="bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-pink-600/20 transition-all"
        >
          <Plus size={16} /> Créer un Code Promo
        </button>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2">
        <button
          onClick={() => setActiveTab("coupons")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "coupons"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Ticket size={16} /> Codes Promo &amp; Bons d&apos;Achat ({coupons.length})
        </button>
        <button
          onClick={() => setActiveTab("campaigns")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "campaigns"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Megaphone size={16} /> Campagnes &amp; Bannières ({campaigns.length})
        </button>
      </div>

      {/* TAB 1: Coupons */}
      {activeTab === "coupons" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {coupons.map((coupon) => (
            <div key={coupon.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-black text-base px-3 py-1 bg-pink-50 text-pink-700 rounded-xl border border-pink-200">
                      {coupon.code}
                    </span>
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    coupon.is_active ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-gray-100 text-gray-500"
                  }`}>
                    {coupon.is_active ? "Actif 🟢" : "Désactivé ⚪"}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="text-2xl font-black text-gray-900">
                    {coupon.discount_type === "percentage" ? `-${coupon.discount_value}%` : `-${coupon.discount_value.toLocaleString()} FCFA`}
                  </div>
                  <p className="text-xs text-gray-500 font-medium">
                    Dès {coupon.min_order_amount.toLocaleString()} FCFA d&apos;achat
                  </p>
                </div>

                <div className="bg-gray-50 p-3 rounded-2xl space-y-1 text-xs">
                  <div className="flex justify-between text-gray-600">
                    <span>Utilisations :</span>
                    <span className="font-bold text-gray-900">{coupon.used_count} / {coupon.usage_limit}</span>
                  </div>
                  <div className="flex justify-between text-gray-600">
                    <span>Expiration :</span>
                    <span className="font-bold text-gray-700">
                      {new Date(coupon.expires_at).toLocaleDateString("fr-FR")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                <button
                  onClick={() => handleToggleCoupon(coupon)}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-colors cursor-pointer ${
                    coupon.is_active ? "bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {coupon.is_active ? "Désactiver" : "Activer"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB 2: Campaigns */}
      {activeTab === "campaigns" && (
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
                  En Cours 🟢
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Impressions Vues</span>
                  <p className="text-xl font-black text-gray-900 mt-1">{camp.impressions_count.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Clics Générés</span>
                  <p className="text-xl font-black text-indigo-600 mt-1">{camp.clicks_count.toLocaleString()}</p>
                </div>
                <div className="bg-gray-50 p-4 rounded-2xl">
                  <span className="text-[10px] font-black text-gray-400 uppercase">Commandes Finalisées</span>
                  <p className="text-xl font-black text-emerald-600 mt-1">{camp.conversions_count.toLocaleString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL: Add Coupon */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Nouveau Code Promo</h3>
              <button onClick={() => setShowAddCouponModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Code Réduction</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: PROMO20"
                  value={newCoupon.code}
                  onChange={(e) => setNewCoupon({ ...newCoupon, code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold uppercase"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Type de Remise</label>
                  <select
                    value={newCoupon.discount_type}
                    onChange={(e: any) => setNewCoupon({ ...newCoupon, discount_type: e.target.value })}
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
                    value={newCoupon.discount_value}
                    onChange={(e) => setNewCoupon({ ...newCoupon, discount_value: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Panier Minimum (FCFA)</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.min_order_amount}
                    onChange={(e) => setNewCoupon({ ...newCoupon, min_order_amount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Limite d&apos;utilisations</label>
                  <input
                    type="number"
                    required
                    value={newCoupon.usage_limit}
                    onChange={(e) => setNewCoupon({ ...newCoupon, usage_limit: parseInt(e.target.value) || 100 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
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

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-pink-600 text-white font-bold text-xs hover:bg-pink-700 shadow-md"
                >
                  Créer le Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
