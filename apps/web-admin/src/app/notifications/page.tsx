"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Send, 
  Users, 
  Store, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  X, 
  Plus, 
  RefreshCw,
  Sparkles,
  Smartphone,
  Search,
  Check,
  AlertCircle,
  Megaphone,
  Headphones,
  UserCheck,
  Radio
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface PushCampaign {
  id: string;
  title: string;
  message: string;
  target_type: "all" | "all_buyers" | "all_sellers" | "specific_buyer" | "specific_seller";
  target_id?: string;
  target_name?: string;
  notification_type: "promo" | "info" | "alert" | "support" | "system";
  sent_by: string;
  recipients_count: number;
  delivered_count: number;
  failed_count: number;
  status: string;
  url_redirect?: string;
  created_at: string;
}

interface SearchableUser {
  id: string;
  full_name: string;
  phone?: string;
  email?: string;
  role?: string;
  expo_push_token?: string;
}

interface SearchableShop {
  id: string;
  name: string;
  owner_id: string;
  owner_name?: string;
}

export default function NotificationsPage() {
  const { user } = useAdminAuth();

  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target_type: "all_buyers" as "all" | "all_buyers" | "all_sellers" | "specific_buyer" | "specific_seller",
    target_id: "",
    target_name: "",
    notification_type: "promo" as "promo" | "info" | "alert" | "support" | "system",
    url_redirect: "",
    sent_by_role: "marketing",
  });

  // Target search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingTargets, setSearchingTargets] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<SearchableUser[]>([]);
  const [shopSearchResults, setShopSearchResults] = useState<SearchableShop[]>([]);

  const fetchCampaigns = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("push_campaigns")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCampaigns(data);
      } else {
        setCampaigns([]);
      }
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaigns();

    const channel = supabase
      .channel("push_campaigns_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "push_campaigns" }, () => fetchCampaigns())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Search users or shops when specific target selected
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.length < 2) {
      setUserSearchResults([]);
      setShopSearchResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setSearchingTargets(true);
      try {
        if (formData.target_type === "specific_buyer") {
          const { data } = await supabase
            .from("profiles")
            .select("id, full_name, phone, email, role, expo_push_token")
            .or(`full_name.ilike.%${searchQuery}%,email.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
            .limit(8);
          setUserSearchResults(data || []);
        } else if (formData.target_type === "specific_seller") {
          const { data } = await supabase
            .from("shops")
            .select("id, name, owner_id")
            .ilike("name", `%${searchQuery}%`)
            .limit(8);
          setShopSearchResults(data || []);
        }
      } catch (err) {
        console.warn("Search target error:", err);
      } finally {
        setSearchingTargets(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, formData.target_type]);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setSendSuccess(null);
    setSendError(null);

    try {
      const adminName = user?.full_name || "Admin Kalagban";

      const res = await fetch("/api/notifications/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          sent_by: adminName,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Échec lors de l'envoi de la notification.");
      }

      setSendSuccess(
        `Notification diffusée avec succès ! (${data.delivered_count} push délivrés sur ${data.recipients_total} destinataires)`
      );

      setTimeout(() => {
        setShowSendModal(false);
        setSendSuccess(null);
        setFormData({
          title: "",
          message: "",
          target_type: "all_buyers",
          target_id: "",
          target_name: "",
          notification_type: "promo",
          url_redirect: "",
          sent_by_role: "marketing",
        });
        setSearchQuery("");
      }, 1800);

      fetchCampaigns();
    } catch (err: any) {
      setSendError(err?.message || "Une erreur est survenue.");
    } finally {
      setSending(false);
    }
  };

  // Stats
  const totalSent = campaigns.reduce((acc, c) => acc + (c.delivered_count || 0), 0);
  const totalCampaigns = campaigns.length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight flex items-center gap-2.5">
            <Radio className="w-7 h-7 text-indigo-600 animate-pulse" />
            Centre Push & Notifications
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Diffusion de notifications push natives et alertes in-app pour l&apos;Admin, le Marketing et le Support Client.
          </p>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-[0.98]"
        >
          <Plus className="w-4 h-4" />
          Créer une Diffusion Push
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Campagnes Diffusées</p>
            <p className="text-2xl font-black text-gray-900 mt-1">{totalCampaigns}</p>
          </div>
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
            <Megaphone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Notifications Push Délivrées</p>
            <p className="text-2xl font-black text-emerald-600 mt-1">{totalSent.toLocaleString("fr-FR")}</p>
          </div>
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
            <Smartphone className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-gray-100 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Cibles & Équipes</p>
            <p className="text-sm font-bold text-gray-800 mt-1">Marketing • Support • Admin</p>
          </div>
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center">
            <Headphones className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Campaigns Table */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-base font-bold text-gray-900 flex items-center gap-2">
            <Clock className="w-4 h-4 text-gray-500" />
            Historique des Campagnes & Messages
          </h2>
          <button
            onClick={fetchCampaigns}
            disabled={loading}
            className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50/80 text-gray-500 text-xs uppercase font-semibold border-b border-gray-100">
              <tr>
                <th className="px-6 py-3">Titre & Message</th>
                <th className="px-6 py-3">Cible</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Délivrés</th>
                <th className="px-6 py-3">Auteur</th>
                <th className="px-6 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    Chargement de l&apos;historique...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                    <Megaphone className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    Aucune notification envoyée pour le moment.
                  </td>
                </tr>
              ) : (
                campaigns.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{c.title}</div>
                      <div className="text-xs text-gray-500 max-w-sm truncate mt-0.5">{c.message}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700">
                        {c.target_type === "all" && <Users className="w-3 h-3 text-indigo-600" />}
                        {c.target_type === "all_buyers" && <UserCheck className="w-3 h-3 text-blue-600" />}
                        {c.target_type === "all_sellers" && <Store className="w-3 h-3 text-amber-600" />}
                        {c.target_type === "specific_buyer" && <UserCheck className="w-3 h-3 text-purple-600" />}
                        {c.target_type === "specific_seller" && <Store className="w-3 h-3 text-emerald-600" />}
                        {c.target_name || c.target_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold uppercase ${
                        c.notification_type === "promo" ? "bg-purple-50 text-purple-700" :
                        c.notification_type === "alert" ? "bg-red-50 text-red-700" :
                        c.notification_type === "support" ? "bg-blue-50 text-blue-700" :
                        "bg-gray-100 text-gray-700"
                      }`}>
                        {c.notification_type}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="font-semibold text-gray-900">{c.delivered_count}</span>
                        <span className="text-xs text-gray-400">/ {c.recipients_count}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-600 font-medium">
                      {c.sent_by}
                    </td>
                    <td className="px-6 py-4 text-xs text-gray-400 whitespace-nowrap">
                      {new Date(c.created_at).toLocaleString("fr-FR", {
                        day: "2-digit",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 animate-in fade-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-gray-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  <Megaphone className="w-5 h-5 text-indigo-600" />
                  Diffuser une Notification Push
                </h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Alertez instantanément vos utilisateurs sur mobile et web.
                </p>
              </div>
              <button
                onClick={() => setShowSendModal(false)}
                className="p-2 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="p-6 space-y-5">
              {sendSuccess && (
                <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                  <p className="font-semibold">{sendSuccess}</p>
                </div>
              )}

              {sendError && (
                <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm flex items-center gap-3">
                  <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <p className="font-semibold">{sendError}</p>
                </div>
              )}

              {/* Rôle émetteur */}
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sent_by_role: "marketing", notification_type: "promo" })}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    formData.sent_by_role === "marketing"
                      ? "border-purple-600 bg-purple-50 text-purple-700 ring-2 ring-purple-600/20"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-purple-600" />
                  Marketing
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sent_by_role: "support", notification_type: "support" })}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    formData.sent_by_role === "support"
                      ? "border-blue-600 bg-blue-50 text-blue-700 ring-2 ring-blue-600/20"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <Headphones className="w-4 h-4 text-blue-600" />
                  Support Client
                </button>
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, sent_by_role: "admin", notification_type: "info" })}
                  className={`p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition-all ${
                    formData.sent_by_role === "admin"
                      ? "border-indigo-600 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-600/20"
                      : "border-gray-200 hover:bg-gray-50 text-gray-600"
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Administration
                </button>
              </div>

              {/* Sélection de la cible */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-2">
                  Destinataires Ciblés
                </label>
                <select
                  value={formData.target_type}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      target_type: e.target.value as any,
                      target_id: "",
                      target_name: "",
                    });
                    setSearchQuery("");
                  }}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                >
                  <option value="all_buyers">🛍️ Tous les Clients (Acheteurs)</option>
                  <option value="all_sellers">🏪 Tous les Vendeurs (Boutiques)</option>
                  <option value="all">🌍 Tout le monde (Clients + Vendeurs)</option>
                  <option value="specific_buyer">👤 Un Client Spécifique</option>
                  <option value="specific_seller">🏬 Un Vendeur Spécifique</option>
                </select>
              </div>

              {/* Recherche si cible spécifique */}
              {(formData.target_type === "specific_buyer" || formData.target_type === "specific_seller") && (
                <div className="p-4 bg-indigo-50/50 rounded-2xl border border-indigo-100 space-y-3">
                  <label className="block text-xs font-bold text-indigo-900 uppercase">
                    {formData.target_type === "specific_buyer" ? "Rechercher le client :" : "Rechercher la boutique :"}
                  </label>

                  <div className="relative">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder={formData.target_type === "specific_buyer" ? "Nom, email ou téléphone du client..." : "Nom de la boutique..."}
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {formData.target_name && (
                    <div className="p-2.5 bg-white rounded-xl border border-emerald-200 text-emerald-800 text-xs font-semibold flex items-center justify-between">
                      <span>Cible sélectionnée : <strong>{formData.target_name}</strong></span>
                      <Check className="w-4 h-4 text-emerald-600" />
                    </div>
                  )}

                  {searchingTargets && (
                    <p className="text-xs text-indigo-600 flex items-center gap-1">
                      <RefreshCw className="w-3 h-3 animate-spin" /> Recherche en cours...
                    </p>
                  )}

                  {userSearchResults.length > 0 && formData.target_type === "specific_buyer" && (
                    <div className="bg-white rounded-xl border border-gray-200 divide-y max-h-40 overflow-y-auto shadow-sm">
                      {userSearchResults.map((u) => (
                        <button
                          key={u.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              target_id: u.id,
                              target_name: `${u.full_name} (${u.phone || u.email || "Client"})`,
                            });
                            setUserSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between"
                        >
                          <div>
                            <p className="font-bold text-gray-900">{u.full_name}</p>
                            <p className="text-gray-500">{u.phone || u.email}</p>
                          </div>
                          {u.expo_push_token ? (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-50 text-emerald-600 rounded">
                              Push Actif
                            </span>
                          ) : (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded">
                              In-App
                            </span>
                          )}
                        </button>
                      ))}
                    </div>
                  )}

                  {shopSearchResults.length > 0 && formData.target_type === "specific_seller" && (
                    <div className="bg-white rounded-xl border border-gray-200 divide-y max-h-40 overflow-y-auto shadow-sm">
                      {shopSearchResults.map((s) => (
                        <button
                          key={s.id}
                          type="button"
                          onClick={() => {
                            setFormData({
                              ...formData,
                              target_id: s.owner_id || s.id,
                              target_name: `Boutique : ${s.name}`,
                            });
                            setShopSearchResults([]);
                          }}
                          className="w-full text-left px-3 py-2 text-xs hover:bg-indigo-50 flex items-center justify-between"
                        >
                          <p className="font-bold text-gray-900">{s.name}</p>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-50 text-amber-700 rounded">
                            Vendeur
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Titre & Message */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Titre de la Notification Push *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 🔥 Vente Flash : -30% sur tous les Rayons !"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Corps du Message *
                  </label>
                  <textarea
                    required
                    rows={3}
                    placeholder="Ex: Profitez dès maintenant des promotions exceptionnelles sur Kalagban. Livraison garantie !"
                    value={formData.message}
                    onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                    Lien de redirection / Page cible (optionnel)
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: /flash-sales ou /orders/XXX"
                    value={formData.url_redirect}
                    onChange={(e) => setFormData({ ...formData, url_redirect: e.target.value })}
                    className="w-full px-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Aperçu en direct Smartphone */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    Aperçu Notification Android & iOS
                  </span>
                  <span>Maintenant</span>
                </div>
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-3 border border-slate-700/60 shadow-lg">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center text-[10px] font-black">
                      K
                    </div>
                    <span className="text-xs font-bold text-slate-200">Kalagban</span>
                  </div>
                  <p className="text-xs font-bold text-white">
                    {formData.title || "Titre de votre notification"}
                  </p>
                  <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                    {formData.message || "Le texte complet de votre message apparaîtra ici."}
                  </p>
                </div>
              </div>

              {/* Bouton d'action */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="px-4 py-2.5 border border-gray-200 text-gray-600 text-sm font-semibold rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sending || (formData.target_type.startsWith("specific") && !formData.target_id)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
                >
                  {sending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Diffuser Immédiatement
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
