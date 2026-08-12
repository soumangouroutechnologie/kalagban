"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Store, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Search, 
  FolderOpen, 
  ArrowLeft, 
  Package, 
  Calendar, 
  Tag, 
  DollarSign, 
  Layers, 
  AlertTriangle, 
  Loader2, 
  Check, 
  Eye, 
  ExternalLink,
  Sparkles,
  ChevronRight,
  Filter
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface ShopItem {
  id: string;
  name: string;
  logo_url?: string | null;
  description?: string | null;
  status: string;
  created_at: string;
  pendingCount?: number;
  totalCount?: number;
}

interface ProductMedia {
  url: string;
}

interface ProductItem {
  id: string;
  shop_id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  price: number;
  old_price?: number | null;
  stock_quantity: number;
  sku?: string | null;
  status: string;
  moderation_status: "pending_review" | "approved" | "rejected";
  rejection_reason?: string | null;
  created_at: string;
  reviewed_at?: string | null;
  product_media?: ProductMedia[];
}

export default function ProductsModerationPage() {
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [products, setProducts] = useState<ProductItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedShopId, setSelectedShopId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"pending" | "approved" | "rejected" | "all">("pending");

  // Moderation Action States
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [rejectModalProduct, setRejectModalProduct] = useState<ProductItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [customReason, setCustomReason] = useState("");
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const fetchModerationData = async () => {
    try {
      // 1. Fetch all shops
      const { data: shopsData } = await supabase
        .from("shops")
        .select("*")
        .order("name", { ascending: true });

      // 2. Fetch all products with media
      const { data: prodsData } = await supabase
        .from("products")
        .select("*, product_media(url)")
        .order("created_at", { ascending: false });

      if (prodsData) {
        setProducts(prodsData as ProductItem[]);
      }

      if (shopsData && prodsData) {
        const enrichedShops: ShopItem[] = shopsData.map((shop) => {
          const shopProds = prodsData.filter((p) => p.shop_id === shop.id);
          const pending = shopProds.filter(
            (p) => p.moderation_status === "pending_review" || !p.moderation_status
          ).length;
          return {
            ...shop,
            pendingCount: pending,
            totalCount: shopProds.length,
          };
        });

        // Sort: shops with pending products first
        enrichedShops.sort((a, b) => (b.pendingCount || 0) - (a.pendingCount || 0));
        setShops(enrichedShops);
      }
    } catch (err) {
      console.error("Error fetching moderation data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchModerationData();

    // Supabase Realtime Listener on products
    const channel = supabase
      .channel("admin_moderation_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        fetchModerationData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Quick preset rejection reasons
  const presetReasons = [
    "Image floue, de mauvaise qualité ou non représentative",
    "Prix anormal, incohérent ou non conforme",
    "Description incomplète ou trompeuse",
    "Catégorie ou sous-catégorie inadaptée",
    "Article interdit ou non conforme aux règles Kalagban",
  ];

  // Action: Approve Product
  const handleApproveProduct = async (product: ProductItem) => {
    setProcessingId(product.id);
    try {
      // 1. Update product in DB
      const { error: prodErr } = await supabase
        .from("products")
        .update({
          moderation_status: "approved",
          status: "active",
          rejection_reason: null,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", product.id);

      if (prodErr) throw prodErr;

      // 2. Send Realtime Notification to Seller
      await supabase.from("seller_notifications").insert({
        shop_id: product.shop_id,
        product_id: product.id,
        title: "🎉 Produit Approuvé & En Ligne !",
        message: `Votre article "${product.title}" a été validé par l'équipe de modération et est désormais visible par tous les acheteurs.`,
        type: "product_approved",
      });

      await fetchModerationData();
    } catch (err) {
      console.error("Error approving product:", err);
      alert("Erreur lors de la validation du produit.");
    } finally {
      setProcessingId(null);
    }
  };

  // Action: Open Reject Modal
  const handleOpenRejectModal = (product: ProductItem) => {
    setRejectModalProduct(product);
    setRejectionReason(presetReasons[0]);
    setCustomReason("");
  };

  // Action: Confirm Reject
  const handleConfirmReject = async () => {
    if (!rejectModalProduct) return;
    const finalReason = customReason.trim() || rejectionReason;
    if (!finalReason) {
      alert("Veuillez indiquer un motif de refus.");
      return;
    }

    setProcessingId(rejectModalProduct.id);
    try {
      // 1. Update product in DB
      const { error: prodErr } = await supabase
        .from("products")
        .update({
          moderation_status: "rejected",
          status: "draft",
          rejection_reason: finalReason,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", rejectModalProduct.id);

      if (prodErr) throw prodErr;

      // 2. Send Realtime Notification to Seller
      await supabase.from("seller_notifications").insert({
        shop_id: rejectModalProduct.shop_id,
        product_id: rejectModalProduct.id,
        title: "⚠️ Article Rejeté par la Modération",
        message: `Votre article "${rejectModalProduct.title}" a été refusé. Motif : ${finalReason}. Vous pouvez le modifier pour le soumettre à nouveau.`,
        type: "product_rejected",
      });

      setRejectModalProduct(null);
      await fetchModerationData();
    } catch (err) {
      console.error("Error rejecting product:", err);
      alert("Erreur lors du rejet du produit.");
    } finally {
      setProcessingId(null);
    }
  };

  // Active Shop & Products
  const selectedShop = shops.find((s) => s.id === selectedShopId);
  const selectedShopProducts = products.filter((p) => p.shop_id === selectedShopId);

  // Filtered Products inside selected shop
  const displayedProducts = selectedShopProducts.filter((p) => {
    if (activeTab === "pending") return p.moderation_status === "pending_review" || !p.moderation_status;
    if (activeTab === "approved") return p.moderation_status === "approved";
    if (activeTab === "rejected") return p.moderation_status === "rejected";
    return true;
  });

  // Global Pending Count across all shops
  const totalPendingAll = products.filter(
    (p) => p.moderation_status === "pending_review" || !p.moderation_status
  ).length;

  const filteredShops = shops.filter((s) => {
    return s.name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8 text-gray-900">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <ShieldCheck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight flex items-center gap-2">
              Modération des Produits Vendeurs
              {totalPendingAll > 0 && (
                <span className="bg-amber-500 text-white text-xs font-black px-2.5 py-0.5 rounded-full animate-pulse">
                  {totalPendingAll} en attente
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-500 font-medium">
              Espace de contrôle qualité, validation et suivi en temps réel des articles soumis
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 px-4 py-2 rounded-2xl text-xs font-bold border border-emerald-100">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
          <span>Synchronisation Supabase Realtime active</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center bg-white rounded-3xl border border-gray-100 shadow-xs">
          <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
          <p className="text-gray-500 text-xs font-bold">Chargement des dossiers de boutiques...</p>
        </div>
      ) : selectedShopId && selectedShop ? (
        /* ========================================================================= */
        /* VUE 2 : DÉTAIL DES PRODUITS DE LA BOUTIQUE SÉLECTIONNÉE                   */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Breadcrumb & Navigation */}
          <div className="flex items-center justify-between bg-white p-4 sm:p-5 rounded-3xl border border-gray-100 shadow-xs">
            <button
              onClick={() => setSelectedShopId(null)}
              className="flex items-center gap-2 text-xs font-black text-indigo-600 hover:text-indigo-800 bg-indigo-50 px-4 py-2.5 rounded-2xl transition-all cursor-pointer"
            >
              <ArrowLeft size={16} />
              <span>Retour à tous les dossiers boutiques</span>
            </button>

            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-black text-sm overflow-hidden shrink-0 border border-purple-200">
                {selectedShop.logo_url ? (
                  <img src={selectedShop.logo_url} alt={selectedShop.name} className="w-full h-full object-cover" />
                ) : (
                  selectedShop.name.charAt(0).toUpperCase()
                )}
              </div>
              <div>
                <h2 className="text-sm font-black text-gray-900">{selectedShop.name}</h2>
                <span className="text-[10px] font-bold text-gray-500 block">
                  {selectedShopProducts.length} article(s) au catalogue
                </span>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap items-center gap-2 bg-white p-2.5 rounded-2xl border border-gray-100 shadow-xs">
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "pending"
                  ? "bg-amber-500 text-white shadow-md shadow-amber-500/30"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Clock size={14} />
              <span>En Attente de Validation</span>
              <span className="bg-white/30 text-white px-2 py-0.5 rounded-full text-[10px]">
                {selectedShopProducts.filter((p) => p.moderation_status === "pending_review" || !p.moderation_status).length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("approved")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "approved"
                  ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <CheckCircle2 size={14} />
              <span>Approuvés &amp; En Ligne</span>
              <span className="bg-emerald-700/50 text-white px-2 py-0.5 rounded-full text-[10px]">
                {selectedShopProducts.filter((p) => p.moderation_status === "approved").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("rejected")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "rejected"
                  ? "bg-red-600 text-white shadow-md shadow-red-600/30"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <XCircle size={14} />
              <span>Rejetés / À Corriger</span>
              <span className="bg-red-700/50 text-white px-2 py-0.5 rounded-full text-[10px]">
                {selectedShopProducts.filter((p) => p.moderation_status === "rejected").length}
              </span>
            </button>

            <button
              onClick={() => setActiveTab("all")}
              className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center gap-2 ${
                activeTab === "all"
                  ? "bg-slate-900 text-white shadow-md shadow-slate-900/30"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              <Layers size={14} />
              <span>Tous ({selectedShopProducts.length})</span>
            </button>
          </div>

          {/* Products List */}
          {displayedProducts.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-3">
              <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-2xl flex items-center justify-center mx-auto">
                <Package size={24} />
              </div>
              <h3 className="text-sm font-bold text-gray-900">Aucun produit dans cette catégorie</h3>
              <p className="text-xs text-gray-500">Tous les produits soumis sont traités ou aucun n&apos;a été posté pour le moment.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {displayedProducts.map((product) => {
                const mediaUrls = product.product_media?.map((m) => m.url) || [];
                const firstImage = mediaUrls[0] || "/placeholder-product.png";
                const isPending = product.moderation_status === "pending_review" || !product.moderation_status;
                const isApproved = product.moderation_status === "approved";
                const isRejected = product.moderation_status === "rejected";

                return (
                  <div
                    key={product.id}
                    className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col justify-between hover:shadow-md transition-shadow"
                  >
                    <div>
                      {/* Product Header Card with Image & Core details */}
                      <div className="p-5 flex gap-4">
                        {/* Image Preview Thumbnail */}
                        <div
                          onClick={() => setPreviewImage(firstImage)}
                          className="w-28 h-28 sm:w-32 sm:h-32 rounded-2xl bg-slate-100 overflow-hidden shrink-0 relative group cursor-pointer border border-gray-200"
                        >
                          <img
                            src={firstImage}
                            alt={product.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                            <Eye size={20} />
                          </div>
                          {mediaUrls.length > 1 && (
                            <span className="absolute bottom-1.5 right-1.5 bg-black/70 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
                              +{mediaUrls.length - 1}
                            </span>
                          )}
                        </div>

                        {/* Text Infos */}
                        <div className="flex-1 min-w-0 space-y-1.5">
                          <div className="flex items-center justify-between gap-2">
                            <span className="bg-slate-100 text-slate-700 text-[10px] font-black px-2.5 py-1 rounded-lg uppercase tracking-wider">
                              {product.category || "Général"}
                            </span>
                            
                            {/* Moderation Status Pill */}
                            {isPending && (
                              <span className="bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <Clock size={10} /> En attente
                              </span>
                            )}
                            {isApproved && (
                              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <CheckCircle2 size={10} /> Approuvé
                              </span>
                            )}
                            {isRejected && (
                              <span className="bg-red-50 text-red-700 border border-red-200 text-[10px] font-black px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                <XCircle size={10} /> Rejeté
                              </span>
                            )}
                          </div>

                          <h3 className="font-extrabold text-sm sm:text-base text-gray-900 line-clamp-2">
                            {product.title}
                          </h3>

                          <div className="flex items-baseline gap-2 pt-0.5">
                            <span className="text-base sm:text-lg font-black text-gray-900">
                              {product.price.toLocaleString()} FCFA
                            </span>
                            {product.old_price && (
                              <span className="text-xs font-bold text-gray-400 line-through">
                                {product.old_price.toLocaleString()} FCFA
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 text-[11px] font-bold text-gray-500 pt-1">
                            <span>📦 Stock : <strong className="text-gray-800">{product.stock_quantity}</strong></span>
                            {product.sku && <span>SKU : <strong className="text-gray-800">{product.sku}</strong></span>}
                          </div>
                        </div>
                      </div>

                      {/* Description Box */}
                      <div className="px-5 pb-3">
                        <div className="bg-slate-50 p-3 rounded-2xl text-xs text-gray-600 font-medium line-clamp-3">
                          {product.description || "Aucune description détaillée fournie."}
                        </div>
                      </div>

                      {/* Rejection Alert if rejected */}
                      {isRejected && product.rejection_reason && (
                        <div className="px-5 pb-3">
                          <div className="bg-red-50 border border-red-200 p-3 rounded-2xl text-xs text-red-700 space-y-1">
                            <span className="font-black flex items-center gap-1">
                              <AlertTriangle size={14} /> Motif du refus notifié au vendeur :
                            </span>
                            <p className="font-medium text-[11px]">{product.rejection_reason}</p>
                          </div>
                        </div>
                      )}

                      {/* Submission Date & Timestamp */}
                      <div className="px-5 py-2 border-t border-gray-50 flex items-center justify-between text-[10px] font-bold text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar size={12} /> Soumis le {new Date(product.created_at).toLocaleDateString("fr-FR")} à {new Date(product.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                        {product.reviewed_at && (
                          <span className="text-gray-500">
                            Examiné le {new Date(product.reviewed_at).toLocaleDateString("fr-FR")}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Action Bar (Approve / Reject) */}
                    <div className="p-4 bg-slate-50/70 border-t border-gray-100 flex items-center gap-3">
                      <button
                        onClick={() => handleApproveProduct(product)}
                        disabled={processingId === product.id || isApproved}
                        className={`flex-1 py-3 px-4 rounded-2xl font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                          isApproved
                            ? "bg-emerald-100 text-emerald-800 cursor-default opacity-80"
                            : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-600/20"
                        } disabled:opacity-50`}
                      >
                        {processingId === product.id ? (
                          <Loader2 size={16} className="animate-spin" />
                        ) : (
                          <Check size={16} />
                        )}
                        <span>{isApproved ? "Produit Validé & En Ligne" : "✅ Valider & Publier"}</span>
                      </button>

                      <button
                        onClick={() => handleOpenRejectModal(product)}
                        disabled={processingId === product.id}
                        className="py-3 px-4 rounded-2xl font-bold text-xs bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                      >
                        <XCircle size={16} />
                        <span>{isRejected ? "Modifier Motif" : "Rejeter"}</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* ========================================================================= */
        /* VUE 1 : DOSSIERS / CARDS PAR BOUTIQUE                                     */
        /* ========================================================================= */
        <div className="space-y-6">
          {/* Search bar */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-3">
            <Search size={18} className="text-gray-400 ml-2" />
            <input
              type="text"
              placeholder="Rechercher une boutique partenaire par nom..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs font-semibold text-gray-800 placeholder-gray-400 outline-none bg-transparent"
            />
          </div>

          {/* Boutique Cards Grid */}
          {filteredShops.length === 0 ? (
            <div className="bg-white rounded-3xl p-16 text-center border border-gray-100 shadow-xs space-y-3">
              <Store size={32} className="text-gray-400 mx-auto" />
              <h3 className="text-sm font-bold text-gray-900">Aucune boutique trouvée</h3>
              <p className="text-xs text-gray-500">Aucune boutique ne correspond à votre recherche.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredShops.map((shop) => {
                const hasPending = (shop.pendingCount || 0) > 0;

                return (
                  <div
                    key={shop.id}
                    onClick={() => {
                      setSelectedShopId(shop.id);
                      setActiveTab(hasPending ? "pending" : "all");
                    }}
                    className={`bg-white rounded-3xl border transition-all p-6 space-y-5 cursor-pointer group hover:shadow-xl hover:-translate-y-1 relative overflow-hidden ${
                      hasPending
                        ? "border-amber-300 shadow-amber-500/5 bg-linear-to-br from-white to-amber-50/20"
                        : "border-gray-100 shadow-xs hover:border-indigo-200"
                    }`}
                  >
                    {/* Top Status Ribbon if pending */}
                    {hasPending && (
                      <div className="absolute top-0 right-0 bg-amber-500 text-white text-[10px] font-black px-3 py-1 rounded-bl-2xl shadow-sm flex items-center gap-1">
                        <Clock size={10} /> {shop.pendingCount} en attente
                      </div>
                    )}

                    {/* Shop Header */}
                    <div className="flex items-center gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black text-xl overflow-hidden shrink-0 border border-indigo-100 group-hover:scale-105 transition-transform shadow-xs">
                        {shop.logo_url ? (
                          <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                        ) : (
                          shop.name.charAt(0).toUpperCase()
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <h3 className="font-extrabold text-base text-gray-900 group-hover:text-indigo-600 transition-colors truncate">
                          {shop.name}
                        </h3>
                        <span className="text-[11px] font-bold text-gray-400 block mt-0.5">
                          Inscrite le {new Date(shop.created_at).toLocaleDateString("fr-FR")}
                        </span>
                      </div>
                    </div>

                    {/* Counters Block */}
                    <div className="grid grid-cols-2 gap-3 pt-2">
                      <div className="bg-slate-50 p-3 rounded-2xl text-center">
                        <span className="text-[10px] font-bold text-gray-500 uppercase block">Total Articles</span>
                        <span className="text-lg font-black text-gray-900">{shop.totalCount || 0}</span>
                      </div>

                      <div className={`p-3 rounded-2xl text-center ${hasPending ? "bg-amber-50 text-amber-800" : "bg-emerald-50 text-emerald-800"}`}>
                        <span className="text-[10px] font-bold uppercase block opacity-80">En Attente</span>
                        <span className="text-lg font-black">{shop.pendingCount || 0}</span>
                      </div>
                    </div>

                    {/* Action Button */}
                    <div className="pt-2">
                      <div className={`w-full py-3 px-4 rounded-2xl text-xs font-black flex items-center justify-center gap-2 transition-all ${
                        hasPending
                          ? "bg-amber-500 group-hover:bg-amber-600 text-white shadow-md shadow-amber-500/25"
                          : "bg-slate-900 group-hover:bg-indigo-600 text-white shadow-md shadow-slate-900/10"
                      }`}>
                        <FolderOpen size={16} />
                        <span>Ouvrir le dossier boutique</span>
                        <ChevronRight size={16} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 1 : MOTIF DE REJET D'UN PRODUIT                                     */}
      {/* ========================================================================= */}
      {rejectModalProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5 text-red-600 font-black text-base">
                <XCircle size={22} />
                <span>Rejeter l&apos;article soumis</span>
              </div>
              <button
                onClick={() => setRejectModalProduct(null)}
                className="p-1 rounded-xl text-gray-400 hover:text-gray-600 hover:bg-gray-100 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="bg-slate-50 p-4 rounded-2xl space-y-1">
              <span className="text-xs font-bold text-gray-500 block">Article concerné :</span>
              <p className="text-sm font-extrabold text-gray-900">{rejectModalProduct.title}</p>
            </div>

            {/* Presets reasons */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-gray-700 block">
                Sélectionnez un motif de refus fréquent :
              </label>
              <div className="space-y-1.5">
                {presetReasons.map((reason, idx) => (
                  <label
                    key={idx}
                    onClick={() => {
                      setRejectionReason(reason);
                      setCustomReason("");
                    }}
                    className={`flex items-center gap-2.5 p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      rejectionReason === reason && !customReason
                        ? "border-red-500 bg-red-50 text-red-800"
                        : "border-gray-200 hover:bg-gray-50 text-gray-700"
                    }`}
                  >
                    <input
                      type="radio"
                      name="presetReason"
                      checked={rejectionReason === reason && !customReason}
                      onChange={() => {}}
                      className="accent-red-600"
                    />
                    <span>{reason}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Custom Reason */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-gray-700 block">
                Ou rédigez une remarque personnalisée pour le vendeur :
              </label>
              <textarea
                rows={3}
                placeholder="Ex: Merci d'ajouter une photo sur fond clair et de corriger le prix unitaire..."
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-2xl p-3.5 text-xs font-medium outline-none focus:border-red-500 focus:bg-white text-gray-900 transition-all resize-none"
              />
            </div>

            {/* Buttons */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalProduct(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={handleConfirmReject}
                disabled={processingId === rejectModalProduct.id}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-extrabold py-3 rounded-2xl text-xs shadow-md shadow-red-600/30 transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {processingId === rejectModalProduct.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <XCircle size={16} />
                )}
                <span>Confirmer le Rejet</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2 : APERÇU PHOTO GRAND FORMAT                                      */}
      {/* ========================================================================= */}
      {previewImage && (
        <div 
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-fade-in cursor-zoom-out"
        >
          <div className="relative max-w-2xl max-h-[85vh] rounded-3xl overflow-hidden shadow-2xl border border-white/20 bg-slate-900">
            <img src={previewImage} alt="Aperçu Grand Format" className="w-full h-full object-contain" />
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 bg-black/60 text-white w-9 h-9 rounded-full flex items-center justify-center hover:bg-black font-bold text-sm cursor-pointer"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
