"use client";

import React, { useState, useEffect, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { 
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
  Radio,
  UploadCloud,
  Trash2,
  Smile,
  Tag
} from "lucide-react";
import Image from "next/image";
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
  image_url?: string;
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

type TargetType = "all" | "all_buyers" | "all_sellers" | "specific_buyer" | "specific_seller";

const QUICK_EMOJIS = ["🔥", "📦", "🎁", "⚡", "🎉", "🚀", "🔔", "🛍️", "📢", "🚚", "🏷️", "✨", "💎", "⏳"];

function NotificationsPageContent() {
  const { user } = useAdminAuth();
  const searchParams = useSearchParams();

  const [campaigns, setCampaigns] = useState<PushCampaign[]>([]);
  const [availableCampaigns, setAvailableCampaigns] = useState<{ id: string; slug: string; title: string; subtitle?: string; banner_url?: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendSuccess, setSendSuccess] = useState<string | null>(null);
  const [sendError, setSendError] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    target_type: "all_buyers" as TargetType,
    target_id: "",
    target_name: "",
    notification_type: "promo" as "promo" | "info" | "alert" | "support" | "system",
    url_redirect: "",
    image_url: "",
    sent_by_role: "marketing",
  });

  // Image Upload state
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Target search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchingTargets, setSearchingTargets] = useState(false);
  const [userSearchResults, setUserSearchResults] = useState<SearchableUser[]>([]);
  const [shopSearchResults, setShopSearchResults] = useState<SearchableShop[]>([]);

  const fetchCampaigns = useCallback(async () => {
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

      // Also fetch active promotional campaigns
      const { data: promoData } = await supabase
        .from("promotional_campaigns")
        .select("id, slug, title, subtitle, banner_url")
        .eq("status", "active")
        .order("created_at", { ascending: false });
      if (promoData) setAvailableCampaigns(promoData);
    } catch (err) {
      console.error("Error fetching campaigns:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initFetch = async () => {
      try {
        const { data, error } = await supabase
          .from("push_campaigns")
          .select("*")
          .order("created_at", { ascending: false });

        if (isMounted) {
          if (!error && data) {
            setCampaigns(data);
          } else {
            setCampaigns([]);
          }
          setLoading(false);
        }

        const { data: promoData } = await supabase
          .from("promotional_campaigns")
          .select("id, slug, title, subtitle, banner_url")
          .eq("status", "active")
          .order("created_at", { ascending: false });
        if (isMounted && promoData) setAvailableCampaigns(promoData);
      } catch (err) {
        if (isMounted) {
          console.error("Error fetching campaigns:", err);
          setLoading(false);
        }
      }
    };

    initFetch();

    // Check incoming query params from marketing tab
    if (searchParams) {
      const titleParam = searchParams.get("title");
      const msgParam = searchParams.get("message");
      const imgParam = searchParams.get("image");
      const urlParam = searchParams.get("url");

      if (titleParam || urlParam) {
        setFormData((prev) => ({
          ...prev,
          title: titleParam || prev.title,
          message: msgParam || prev.message,
          image_url: imgParam || prev.image_url,
          url_redirect: urlParam || prev.url_redirect,
          notification_type: "promo",
          sent_by_role: "marketing",
        }));
        setShowSendModal(true);
      }
    }

    const channel = supabase
      .channel("push_campaigns_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "push_campaigns" }, () => {
        initFetch();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "promotional_campaigns" }, () => {
        initFetch();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  // Search users or shops when specific target selected
  useEffect(() => {
    let isMounted = true;

    const timer = setTimeout(async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        if (isMounted) {
          setUserSearchResults([]);
          setShopSearchResults([]);
        }
        return;
      }

      if (isMounted) setSearchingTargets(true);
      try {
        if (formData.target_type === "specific_buyer") {
          const { data } = await supabase
            .from("profiles")
            .select("id, full_name, phone, role, expo_push_token")
            .or(`full_name.ilike.%${searchQuery}%,phone.ilike.%${searchQuery}%`)
            .limit(8);
          if (isMounted) setUserSearchResults(data || []);
        } else if (formData.target_type === "specific_seller") {
          const { data } = await supabase
            .from("shops")
            .select("id, name, owner_id")
            .ilike("name", `%${searchQuery}%`)
            .limit(8);
          if (isMounted) setShopSearchResults(data || []);
        }
      } catch (err) {
        console.warn("Search target error:", err);
      } finally {
        if (isMounted) setSearchingTargets(false);
      }
    }, 300);

    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [searchQuery, formData.target_type]);

  // Handle Image Upload to Supabase Storage
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setSendError("L'image ne doit pas dépasser 5 Mo.");
      return;
    }

    setUploadingImage(true);
    setSendError(null);

    try {
      const fileExt = file.name.split(".").pop() || "jpg";
      const fileName = `banner_${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
      const filePath = `campaigns/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("notification-banners")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        // Fallback to cms_assets if notification-banners doesn't exist yet
        const { error: fallbackError } = await supabase.storage
          .from("cms_assets")
          .upload(filePath, file, {
            cacheControl: "3600",
            upsert: false,
          });

        if (fallbackError) {
          throw uploadError;
        }

        const { data: publicUrlData } = supabase.storage
          .from("cms_assets")
          .getPublicUrl(filePath);

        setFormData((prev) => ({ ...prev, image_url: publicUrlData.publicUrl }));
      } else {
        const { data: publicUrlData } = supabase.storage
          .from("notification-banners")
          .getPublicUrl(filePath);

        setFormData((prev) => ({ ...prev, image_url: publicUrlData.publicUrl }));
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Échec du téléchargement de l'image.";
      setSendError(`Erreur upload image : ${msg}`);
    } finally {
      setUploadingImage(false);
    }
  };

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
          image_url: "",
          sent_by_role: "marketing",
        });
        setSearchQuery("");
      }, 1800);

      fetchCampaigns();
    } catch (err: unknown) {
      const errorMessage = err instanceof Error ? err.message : "Une erreur est survenue.";
      setSendError(errorMessage);
    } finally {
      setSending(false);
    }
  };

  // Append emoji helper
  const addEmoji = (field: "title" | "message", emoji: string) => {
    if (field === "title") {
      if (formData.title.length + emoji.length <= 200) {
        setFormData((prev) => ({ ...prev, title: prev.title + emoji }));
      }
    } else {
      if (formData.message.length + emoji.length <= 500) {
        setFormData((prev) => ({ ...prev, message: prev.message + emoji }));
      }
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
            Diffusion de notifications push natives et alertes in-app avec bannières 500x500 pour le Marketing, le Support et l&apos;Admin.
          </p>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold rounded-xl shadow-md hover:from-indigo-700 hover:to-purple-700 transition-all active:scale-[0.98]"
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
                <th className="px-6 py-3">Illustration</th>
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
                  <td colSpan={7} className="px-6 py-10 text-center text-gray-400">
                    <RefreshCw className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
                    Chargement de l&apos;historique...
                  </td>
                </tr>
              ) : campaigns.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-400">
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
                      {c.image_url ? (
                        <div className="w-10 h-10 rounded-lg overflow-hidden border border-gray-200 relative bg-gray-50">
                          <Image
                            src={c.image_url}
                            alt="Banner"
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">Sans image</span>
                      )}
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
                  Alertez instantanément vos utilisateurs avec texte, emojis et image 500x500.
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
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <p className="font-semibold">{sendSuccess}</p>
                </div>
              )}

              {/* Sélecteur de Campagne Active (Server-Driven UI) */}
              {availableCampaigns.length > 0 && (
                <div className="bg-linear-to-r from-orange-50 to-amber-50 border border-orange-200 p-3.5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-orange-600 shrink-0" />
                    <div>
                      <p className="text-xs font-black text-orange-950">Lier à une Campagne Active (SDUI) :</p>
                      <p className="text-[10px] text-orange-700">Pré-remplit le titre, l&apos;image 500x500 et la redirection /promo/...</p>
                    </div>
                  </div>
                  <select
                    onChange={(e) => {
                      const camp = availableCampaigns.find((c) => c.slug === e.target.value);
                      if (camp) {
                        setFormData((prev) => ({
                          ...prev,
                          title: camp.title,
                          message: camp.subtitle || prev.message || "Découvrez nos offres spéciales !",
                          image_url: camp.banner_url || prev.image_url,
                          url_redirect: `/promo/${camp.slug}`,
                          notification_type: "promo",
                          sent_by_role: "marketing",
                        }));
                      }
                    }}
                    className="text-xs font-bold bg-white border border-orange-300 rounded-xl px-3 py-1.5 text-gray-800 focus:outline-hidden cursor-pointer shadow-2xs"
                  >
                    <option value="">-- Choisir une campagne --</option>
                    {availableCampaigns.map((c) => (
                      <option key={c.id} value={c.slug}>
                        {c.title}
                      </option>
                    ))}
                  </select>
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
                      target_type: e.target.value as TargetType,
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

              {/* Titre avec Emojis et Limite 200 caractères */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Titre de la Notification Push *
                  </label>
                  <span className={`text-[11px] font-semibold ${formData.title.length >= 190 ? "text-red-500" : "text-gray-400"}`}>
                    {formData.title.length} / 200
                  </span>
                </div>
                <input
                  type="text"
                  required
                  maxLength={200}
                  placeholder="Ex: 🔥 Vente Flash : -30% sur tous les Rayons !"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
                />
                {/* Barre rapide d'Emojis */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                    <Smile className="w-3.5 h-3.5" /> Emojis :
                  </span>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      onClick={() => addEmoji("title", emoji)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-indigo-100 rounded-lg transition-colors shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Corps du Message avec Emojis et Limite 500 caractères */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-gray-700 uppercase">
                    Corps du Message (Texte) *
                  </label>
                  <span className={`text-[11px] font-semibold ${formData.message.length >= 480 ? "text-red-500" : "text-gray-400"}`}>
                    {formData.message.length} / 500
                  </span>
                </div>
                <textarea
                  required
                  rows={3}
                  maxLength={500}
                  placeholder="Ex: Profitez dès maintenant des promotions exceptionnelles sur Kalagban. Livraison garantie !"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
                />
                {/* Barre rapide d'Emojis pour le message */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  <span className="text-[11px] font-bold text-gray-400 flex items-center gap-1 shrink-0">
                    <Smile className="w-3.5 h-3.5" /> Emojis :
                  </span>
                  {QUICK_EMOJIS.map((emoji) => (
                    <button
                      key={`msg-${emoji}`}
                      type="button"
                      onClick={() => addEmoji("message", emoji)}
                      className="px-2 py-1 text-xs bg-gray-100 hover:bg-purple-100 rounded-lg transition-colors shrink-0"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>

              {/* Upload Image / Illustration (Recommandé 500x500) */}
              <div>
                <label className="block text-xs font-bold text-gray-700 uppercase mb-1.5">
                  Illustration / Bannière Push (Optionnel - Recommandé : 500 x 500 px)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {formData.image_url ? (
                  <div className="p-3 bg-gray-50 rounded-2xl border border-gray-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 rounded-xl overflow-hidden relative border border-gray-200 bg-white">
                        <Image
                          src={formData.image_url}
                          alt="Banner Preview"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-gray-900 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Image 500x500 liée
                        </p>
                        <p className="text-[11px] text-gray-500 truncate max-w-xs">{formData.image_url}</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image_url: "" }))}
                      className="p-2 text-red-500 hover:bg-red-50 rounded-xl transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-gray-200 hover:border-indigo-400 bg-gray-50/50 hover:bg-indigo-50/30 rounded-2xl p-4 text-center cursor-pointer transition-all"
                  >
                    {uploadingImage ? (
                      <div className="flex items-center justify-center gap-2 text-xs font-semibold text-indigo-600 py-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Téléchargement de l&apos;image en cours...
                      </div>
                    ) : (
                      <div className="flex flex-col items-center gap-1 py-1">
                        <UploadCloud className="w-6 h-6 text-indigo-500" />
                        <p className="text-xs font-bold text-gray-700">
                          Cliquez pour ajouter une image (500x500 px carré)
                        </p>
                        <p className="text-[10px] text-gray-400">PNG, JPG, WEBP jusqu&apos;à 5 Mo</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Lien de redirection */}
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

              {/* Aperçu en direct Smartphone (avec Image 500x500) */}
              <div className="p-4 bg-slate-900 rounded-2xl text-white space-y-2">
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold uppercase tracking-wider">
                  <span className="flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-indigo-400" />
                    Aperçu Notification Android & iOS
                  </span>
                  <span>Maintenant</span>
                </div>
                <div className="bg-slate-800/90 backdrop-blur rounded-xl p-3 border border-slate-700/60 shadow-lg">
                  <div className="flex items-center gap-2 mb-1.5">
                    <div className="w-4 h-4 rounded bg-purple-600 flex items-center justify-center text-[10px] font-black">
                      K
                    </div>
                    <span className="text-xs font-bold text-slate-200">Kalagban</span>
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="flex-1">
                      <p className="text-xs font-bold text-white">
                        {formData.title || "Titre de votre notification"}
                      </p>
                      <p className="text-xs text-slate-300 mt-0.5 line-clamp-2">
                        {formData.message || "Le texte complet de votre message apparaîtra ici."}
                      </p>
                    </div>
                    {formData.image_url ? (
                      <div className="w-12 h-12 rounded-lg overflow-hidden shrink-0 border border-slate-600 relative bg-slate-700">
                        <Image
                          src={formData.image_url}
                          alt="Push Thumbnail"
                          fill
                          className="object-cover"
                          unoptimized
                        />
                      </div>
                    ) : null}
                  </div>
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
                  disabled={sending || uploadingImage || (formData.target_type.startsWith("specific") && !formData.target_id)}
                  className="inline-flex items-center gap-2 px-6 py-2.5 bg-linear-to-r from-indigo-600 to-purple-600 text-white text-sm font-bold rounded-xl shadow-lg hover:from-indigo-700 hover:to-purple-700 transition-all disabled:opacity-50"
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

export default function NotificationsPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-gray-400">Chargement du centre de notifications...</div>}>
      <NotificationsPageContent />
    </Suspense>
  );
}
