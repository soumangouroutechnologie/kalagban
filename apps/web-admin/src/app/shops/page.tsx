"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Store, 
  CheckCircle2, 
  Ban, 
  Trash2, 
  Search, 
  Loader2, 
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  Clock,
  AlertTriangle,
  FileText,
  Download,
  Eye,
  X,
  Phone,
  User,
  MapPin,
  Camera,
  Check,
  AlertCircle,
  FileCheck2,
  Printer
} from "lucide-react";

interface KycRecord {
  id: string;
  shop_id: string;
  seller_name: string;
  id_type: string;
  id_number: string;
  id_card_front_url: string;
  id_card_back_url?: string | null;
  seller_photo_url: string;
  primary_phone: string;
  secondary_phone?: string | null;
  store_address: string;
  store_photos?: string[];
  location_description?: string | null;
  signature_url: string;
  status: string;
  admin_notes?: string | null;
  submitted_at: string;
}

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  status?: string;
  created_at?: string;
  owner_id?: string;
  is_verified?: boolean;
  kyc_deadline?: string;
  kyc_status?: string;
  kyc?: KycRecord | null;
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // KYC Audit Modal
  const [selectedShop, setSelectedShop] = useState<ShopItem | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isRejecting, setIsRejecting] = useState(false);
  const [isProcessingKyc, setIsProcessingKyc] = useState(false);
  const [deleteConfirmShop, setDeleteConfirmShop] = useState<ShopItem | null>(null);

  const fetchShops = async () => {
    try {
      // 1. Fetch shops
      const { data: shopsData, error } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !shopsData) throw error;

      // 2. Fetch all KYC records
      const { data: kycData } = await supabase
        .from("seller_certifications")
        .select("*")
        .order("created_at", { ascending: false });

      const kycMap = new Map<string, KycRecord>();
      if (kycData) {
        kycData.forEach((k: any) => {
          if (!kycMap.has(k.shop_id)) {
            kycMap.set(k.shop_id, k as KycRecord);
          }
        });
      }

      const formatted: ShopItem[] = shopsData.map((s: any) => ({
        ...s,
        kyc: kycMap.get(s.id) || null
      }));

      setShops(formatted);
    } catch (err) {
      console.error("Error fetching shops:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();

    const channelId = `admin_shops_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "shops" }, () => fetchShops())
      .on("postgres_changes", { event: "*", schema: "public", table: "seller_certifications" }, () => fetchShops())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateShopStatus = async (shopId: string, newStatus: string) => {
    setUpdatingId(shopId);

    try {
      const { error } = await supabase
        .from("shops")
        .update({ status: newStatus })
        .eq("id", shopId);

      if (error) throw error;

      setShops(shops.map(s => s.id === shopId ? { ...s, status: newStatus } : s));
    } catch (err) {
      console.error("Error updating shop status:", err);
      alert("Erreur lors de la mise à jour de la boutique.");
    } finally {
      setUpdatingId(null);
    }
  };

  // Validate KYC & Grant Certified Badge
  const handleApproveKyc = async (shop: ShopItem) => {
    if (!shop.kyc) return;
    setIsProcessingKyc(true);

    try {
      const now = new Date().toISOString();

      // 1. Update KYC table
      await supabase
        .from("seller_certifications")
        .update({
          status: "approved",
          reviewed_at: now,
          admin_notes: "Dossier vérifié et validé par le service Conformité."
        })
        .eq("id", shop.kyc.id);

      // 2. Update shop table
      await supabase
        .from("shops")
        .update({
          is_verified: true,
          verified_at: now,
          kyc_status: "approved",
          status: "active"
        })
        .eq("id", shop.id);

      // 3. Notify seller
      await supabase.from("seller_notifications").insert({
        shop_id: shop.id,
        title: "🛡️ Félicitations ! Votre Boutique est Certifiée",
        message: "Votre dossier d'identification a été validé avec succès. Le Badge 'Vendeur Certifié Kalagban' est désormais actif sur votre profil et vos articles.",
        type: "kyc_approved"
      });

      alert(`✅ La boutique "${shop.name}" a été certifiée avec succès ! Le badge officiel est activé.`);
      setSelectedShop(null);
      fetchShops();

    } catch (err) {
      console.error("Error approving KYC:", err);
      alert("Erreur lors de l'approbation du dossier.");
    } finally {
      setIsProcessingKyc(false);
    }
  };

  // Reject KYC with reason
  const handleRejectKyc = async (shop: ShopItem) => {
    if (!shop.kyc || !rejectionReason.trim()) {
      alert("Veuillez préciser le motif du rejet.");
      return;
    }

    setIsProcessingKyc(true);

    try {
      const now = new Date().toISOString();

      await supabase
        .from("seller_certifications")
        .update({
          status: "rejected",
          reviewed_at: now,
          admin_notes: rejectionReason
        })
        .eq("id", shop.kyc.id);

      await supabase
        .from("shops")
        .update({
          is_verified: false,
          kyc_status: "rejected"
        })
        .eq("id", shop.id);

      await supabase.from("seller_notifications").insert({
        shop_id: shop.id,
        title: "❌ Dossier de Certification Non Conforme",
        message: `Votre dossier n'a pas pu être validé. Motif : "${rejectionReason}". Veuillez corriger vos pièces sur votre espace vendeur.`,
        type: "kyc_rejected"
      });

      alert(`Dossier rejeté. Le vendeur "${shop.name}" a été notifié du motif.`);
      setIsRejecting(false);
      setRejectionReason("");
      setSelectedShop(null);
      fetchShops();

    } catch (err) {
      console.error("Error rejecting KYC:", err);
      alert("Erreur lors du rejet du dossier.");
    } finally {
      setIsProcessingKyc(false);
    }
  };

  // Delete Seller Account if deadline exceeded or fraud
  const handleDeleteShopAccount = async (shop: ShopItem) => {
    setIsProcessingKyc(true);

    try {
      // 1. Delete shop from database
      const { error } = await supabase
        .from("shops")
        .delete()
        .eq("id", shop.id);

      if (error) throw error;

      alert(`🗑️ La boutique "${shop.name}" et son compte vendeur ont été supprimés définitivement.`);
      setDeleteConfirmShop(null);
      setSelectedShop(null);
      fetchShops();

    } catch (err: unknown) {
      console.error("Error deleting shop:", err);
      const msg = err instanceof Error ? err.message : "Erreur de suppression";
      alert("Erreur lors de la suppression : " + msg);
    } finally {
      setIsProcessingKyc(false);
    }
  };

  // Trigger Print to PDF for the official KYC Dossier
  const handlePrintPdf = () => {
    window.print();
  };

  // Filter logic
  const filteredShops = shops.filter((shop) => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shop.description && shop.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (shop.kyc?.seller_name && shop.kyc.seller_name.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (!matchesSearch) return false;

    if (filterStatus === "all") return true;
    if (filterStatus === "verified") return shop.is_verified || shop.kyc?.status === "approved";
    if (filterStatus === "pending_kyc") return shop.kyc?.status === "pending" || shop.kyc_status === "pending";
    if (filterStatus === "expired_kyc") {
      const deadline = new Date(shop.kyc_deadline || shop.created_at || Date.now()).getTime() + (5 * 24 * 3600 * 1000);
      const isExpired = Date.now() > deadline;
      return isExpired && !shop.is_verified && (!shop.kyc || shop.kyc.status === "rejected");
    }
    if (filterStatus === "suspended") return shop.status === "suspended";
    return true;
  });

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black shadow-inner shrink-0">
            <Store size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-full">
                Service Conformité &amp; Audit
              </span>
            </div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-0.5">Modération &amp; Certification des Boutiques</h1>
            <p className="text-xs text-gray-500 font-medium">Validation des pièces d&apos;identité, photos des locaux, signatures et attribution des badges officiels.</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col lg:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom de boutique ou gérant..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-medium outline-none focus:border-indigo-600 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full lg:w-auto pb-1">
          {[
            { id: "all", label: "Toutes les boutiques" },
            { id: "pending_kyc", label: "Dossiers à Vérifier ⏳" },
            { id: "verified", label: "Certifiées 🛡️" },
            { id: "expired_kyc", label: "Délai 5j Dépassé ⚠️" },
            { id: "suspended", label: "Suspendues 🔴" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Shops List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des boutiques et dossiers KYC...</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium text-xs">
            Aucune boutique trouvée pour ce filtre.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredShops.map((shop) => {
              const isCertified = shop.is_verified || shop.kyc?.status === "approved";
              const isPendingKyc = shop.kyc?.status === "pending" || shop.kyc_status === "pending";
              const isRejectedKyc = shop.kyc?.status === "rejected";
              
              const createdAt = new Date(shop.created_at || Date.now()).getTime();
              const deadline = shop.kyc_deadline ? new Date(shop.kyc_deadline).getTime() : createdAt + (5 * 24 * 3600 * 1000);
              const isExpiredWithoutKyc = Date.now() > deadline && !isCertified && !isPendingKyc;

              return (
                <div key={shop.id} className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                  
                  {/* Left: Shop Logo & Details */}
                  <div className="flex items-start sm:items-center gap-4">
                    <div className="w-16 h-16 bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-black text-2xl shadow-md">
                      {shop.logo_url ? (
                        <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        shop.name.charAt(0).toUpperCase()
                      )}
                    </div>

                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-extrabold text-base text-gray-900">{shop.name}</h3>
                        
                        {/* Badges */}
                        {isCertified ? (
                          <span className="bg-emerald-50 text-emerald-700 font-black px-2.5 py-0.5 rounded-full border border-emerald-200 text-[10px] flex items-center gap-1 shadow-2xs">
                            <ShieldCheck size={13} className="text-emerald-600" /> Vendeur Certifié 🛡️
                          </span>
                        ) : isPendingKyc ? (
                          <span className="bg-amber-50 text-amber-900 font-black px-2.5 py-0.5 rounded-full border border-amber-200 text-[10px] flex items-center gap-1 animate-pulse">
                            <Clock size={13} className="text-amber-600" /> Dossier Reçu (À vérifier) ⏳
                          </span>
                        ) : isExpiredWithoutKyc ? (
                          <span className="bg-rose-50 text-rose-700 font-black px-2.5 py-0.5 rounded-full border border-rose-200 text-[10px] flex items-center gap-1">
                            <AlertTriangle size={13} className="text-rose-600" /> Délai 5j Dépassé ⚠️
                          </span>
                        ) : isRejectedKyc ? (
                          <span className="bg-red-50 text-red-700 font-black px-2.5 py-0.5 rounded-full border border-red-200 text-[10px]">
                            Dossier Rejeté ❌
                          </span>
                        ) : (
                          <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            Dossier Non Soumis (Timer 5j)
                          </span>
                        )}

                        {shop.status === "suspended" && (
                          <span className="bg-rose-100 text-rose-900 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                            Suspendue 🔴
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-gray-500 font-medium line-clamp-1">
                        {shop.description || "Aucune description renseignée."}
                      </p>

                      {shop.kyc && (
                        <p className="text-[11px] text-indigo-700 font-bold flex items-center gap-1.5 pt-0.5">
                          <User size={12} /> Gérant : {shop.kyc.seller_name} ({shop.kyc.primary_phone})
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    
                    {/* Button: Open KYC Audit Modal */}
                    {shop.kyc ? (
                      <button
                        onClick={() => setSelectedShop(shop)}
                        className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-black text-xs px-4 py-2.5 rounded-xl border border-indigo-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                      >
                        <FileCheck2 size={15} /> Examiner Dossier KYC
                      </button>
                    ) : (
                      <span className="text-[11px] text-gray-400 font-medium italic px-2">
                        Aucun document
                      </span>
                    )}

                    {/* Quick Suspend / Activate button */}
                    {shop.status === "suspended" ? (
                      <button
                        onClick={() => handleUpdateShopStatus(shop.id, "active")}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors shadow-2xs"
                      >
                        <CheckCircle2 size={14} /> Réactiver
                      </button>
                    ) : (
                      <button
                        onClick={() => handleUpdateShopStatus(shop.id, "suspended")}
                        className="bg-gray-100 hover:bg-amber-50 text-gray-700 hover:text-amber-900 font-bold text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1 cursor-pointer transition-colors"
                      >
                        <Ban size={14} /> Suspendre
                      </button>
                    )}

                    {/* Delete account button (Admin right if deadline exceeded) */}
                    <button
                      onClick={() => setDeleteConfirmShop(shop)}
                      className="p-2.5 rounded-xl bg-gray-50 hover:bg-rose-50 text-gray-400 hover:text-rose-600 transition-colors cursor-pointer"
                      title="Supprimer définitivement le compte vendeur"
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

      {/* ================= MODAL D'AUDIT KYC & EXPORT PDF ================= */}
      {selectedShop && selectedShop.kyc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          
          {/* Strict Print CSS Isolation to print ONLY the official document */}
          <style jsx global>{`
            @media print {
              body * {
                visibility: hidden !important;
              }
              #printable-admin-kyc-dossier, #printable-admin-kyc-dossier * {
                visibility: visible !important;
              }
              #printable-admin-kyc-dossier {
                position: absolute !important;
                left: 0 !important;
                top: 0 !important;
                width: 100% !important;
                margin: 0 !important;
                padding: 24px !important;
                background: white !important;
                color: #0f172a !important;
                box-shadow: none !important;
                border: none !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}</style>

          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar">
            
            {/* Top Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center justify-between no-print">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner">
                  <ShieldCheck size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md">
                      Dossier de Certification Vendeur
                    </span>
                    <span className="text-xs font-bold text-gray-400">
                      Boutique : {selectedShop.name}
                    </span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Audit &amp; Pièces Justificatives</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintPdf}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Imprimer ou enregistrer en PDF"
                >
                  <Printer size={15} /> Télécharger PDF
                </button>

                <button 
                  onClick={() => { setSelectedShop(null); setIsRejecting(false); }}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* PRINTABLE DOSSIER CONTENT */}
            <div id="printable-admin-kyc-dossier" className="p-6 sm:p-8 space-y-6">
              
              {/* Official Kalagban Header for PDF Print */}
              <div className="border-b-2 border-indigo-600 pb-4 mb-4 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-black text-indigo-950 tracking-tight">KALAGBAN MARKETPLACE</h1>
                    <span className="bg-indigo-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-md">
                      DOSSIER OFFICIEL KYC
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 font-bold uppercase tracking-wider mt-0.5">
                    Service Conformité &amp; Certification des Marchands
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-black text-gray-900">CERTIFICAT D&apos;AUDIT VENDEUR</p>
                  <p className="text-[10px] text-gray-400 font-mono">Date : {new Date(selectedShop.kyc.submitted_at).toLocaleDateString('fr-FR')}</p>
                  <p className="text-[10px] text-indigo-700 font-bold">Boutique : {selectedShop.name}</p>
                </div>
              </div>

              {/* Status Banner */}
              <div className={`p-4.5 rounded-2xl border flex items-center justify-between gap-4 ${
                selectedShop.kyc.status === "approved"
                  ? "bg-emerald-50 border-emerald-200 text-emerald-950"
                  : selectedShop.kyc.status === "rejected"
                  ? "bg-rose-50 border-rose-200 text-rose-950"
                  : "bg-amber-50 border-amber-200 text-amber-950"
              }`}>
                <div className="flex items-center gap-3">
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shrink-0 ${
                    selectedShop.kyc.status === "approved" ? "bg-emerald-600" : selectedShop.kyc.status === "rejected" ? "bg-rose-600" : "bg-amber-500"
                  }`}>
                    {selectedShop.kyc.status === "approved" ? <Check size={20} /> : <Clock size={20} />}
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm">
                      Statut : {selectedShop.kyc.status === "approved" ? "Validé & Certifié 🛡️" : selectedShop.kyc.status === "rejected" ? "Dossier Rejeté ❌" : "En cours d'examen ⏳"}
                    </h4>
                    <p className="text-xs opacity-80">
                      Soumis le {new Date(selectedShop.kyc.submitted_at).toLocaleString('fr-FR')}
                    </p>
                  </div>
                </div>

                {selectedShop.kyc.admin_notes && (
                  <p className="text-xs font-semibold max-w-xs text-right">
                    Note : &quot;{selectedShop.kyc.admin_notes}&quot;
                  </p>
                )}
              </div>

              {/* Section 1: Informations Personnelles du Gérant */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-gray-100 space-y-4">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2 border-b border-gray-200/60 pb-2">
                  <User size={15} className="text-indigo-600" />
                  1. Responsable Légal &amp; Coordonnées
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Nom &amp; Prénom</span>
                    <p className="text-sm font-black text-gray-900">{selectedShop.kyc.seller_name}</p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Type &amp; N° de Pièce</span>
                    <p className="text-sm font-extrabold text-gray-900 uppercase">
                      {selectedShop.kyc.id_type} : <span className="font-mono text-indigo-700">{selectedShop.kyc.id_number}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp Principal</span>
                    <p className="text-sm font-black text-emerald-700">{selectedShop.kyc.primary_phone}</p>
                  </div>

                  {selectedShop.kyc.secondary_phone && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Numéro Secondaire</span>
                      <p className="text-sm font-bold text-gray-700">{selectedShop.kyc.secondary_phone}</p>
                    </div>
                  )}

                  <div className="sm:col-span-2">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Adresse Boutique Physique</span>
                    <p className="text-sm font-bold text-gray-800">{selectedShop.kyc.store_address}</p>
                  </div>
                </div>

                {selectedShop.kyc.location_description && (
                  <div className="pt-2 border-t border-gray-200/50">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Repères Géographiques</span>
                    <p className="text-xs font-medium text-gray-600">{selectedShop.kyc.location_description}</p>
                  </div>
                )}
              </div>

              {/* Section 2: Pièces d'Identité & Photo Gérant */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                  <Camera size={15} className="text-indigo-600" />
                  2. Pièces Justificatives (Documents d&apos;Identité)
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Photo Portrait */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black text-gray-600 uppercase mb-2">Photo Portrait Gérant</span>
                    <img
                      src={selectedShop.kyc.seller_photo_url}
                      alt="Portrait"
                      className="w-full h-40 object-cover rounded-xl border border-gray-100"
                    />
                    <a
                      href={selectedShop.kyc.seller_photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="no-print mt-2 text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Ouvrir en grand
                    </a>
                  </div>

                  {/* CNI Recto */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col items-center text-center">
                    <span className="text-[10px] font-black text-gray-600 uppercase mb-2">Pièce d&apos;Identité (Recto)</span>
                    {selectedShop.kyc.id_card_front_url.endsWith(".pdf") ? (
                      <div className="w-full h-40 rounded-xl bg-indigo-50/50 flex flex-col items-center justify-center text-indigo-600 gap-1.5 p-2">
                        <FileText size={40} />
                        <span className="text-xs font-bold">Document PDF</span>
                      </div>
                    ) : (
                      <img
                        src={selectedShop.kyc.id_card_front_url}
                        alt="ID Recto"
                        className="w-full h-40 object-cover rounded-xl border border-gray-100"
                      />
                    )}
                    <a
                      href={selectedShop.kyc.id_card_front_url}
                      target="_blank"
                      rel="noreferrer"
                      className="no-print mt-2 text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <ExternalLink size={11} /> Ouvrir / Télécharger
                    </a>
                  </div>

                  {/* CNI Verso (Si présent) */}
                  {selectedShop.kyc.id_card_back_url && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-3 flex flex-col items-center text-center">
                      <span className="text-[10px] font-black text-gray-600 uppercase mb-2">Pièce d&apos;Identité (Verso)</span>
                      {selectedShop.kyc.id_card_back_url.endsWith(".pdf") ? (
                        <div className="w-full h-40 rounded-xl bg-indigo-50/50 flex flex-col items-center justify-center text-indigo-600 gap-1.5 p-2">
                          <FileText size={40} />
                          <span className="text-xs font-bold">Document PDF</span>
                        </div>
                      ) : (
                        <img
                          src={selectedShop.kyc.id_card_back_url}
                          alt="ID Verso"
                          className="w-full h-40 object-cover rounded-xl border border-gray-100"
                        />
                      )}
                      <a
                        href={selectedShop.kyc.id_card_back_url}
                        target="_blank"
                        rel="noreferrer"
                        className="no-print mt-2 text-[10px] font-bold text-indigo-600 hover:underline flex items-center gap-1"
                      >
                        <ExternalLink size={11} /> Ouvrir / Télécharger
                      </a>
                    </div>
                  )}
                </div>
              </div>

              {/* Section 3: Photos de la Boutique Physique */}
              {selectedShop.kyc.store_photos && selectedShop.kyc.store_photos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider flex items-center gap-2">
                    <Store size={15} className="text-indigo-600" />
                    3. Visuels de la Boutique Physique / Atelier
                  </h4>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {selectedShop.kyc.store_photos.map((url: string, idx: number) => (
                      <div key={idx} className="bg-white rounded-xl border border-gray-200 p-2 overflow-hidden shadow-2xs flex flex-col items-center">
                        <img src={url} alt={`Local ${idx + 1}`} className="w-full h-24 object-cover rounded-lg" />
                        <a href={url} target="_blank" rel="noreferrer" className="no-print text-[9px] font-bold text-indigo-600 mt-1 hover:underline">
                          Voir photo {idx + 1}
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Section 4: Signature Numérique Manuscrite */}
              <div className="bg-slate-50/70 p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-6">
                <div className="space-y-1">
                  <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                    4. Signature Numérique &amp; Accord Légal
                  </h4>
                  <p className="text-xs text-gray-500 font-medium">
                    Signature apposée par <strong>{selectedShop.kyc.seller_name}</strong> lors de la soumission.
                  </p>
                  <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-md inline-block mt-1">
                    ✓ Charte de conformité Kalagban acceptée
                  </span>
                </div>

                <div className="bg-white border-2 border-dashed border-indigo-200 rounded-xl p-3 shadow-inner text-center">
                  <img
                    src={selectedShop.kyc.signature_url}
                    alt="Signature"
                    className="h-16 max-w-50 object-contain mx-auto"
                  />
                  <span className="text-[9px] text-gray-400 font-mono">Certificat Numérique Kalagban</span>
                </div>
              </div>

              {/* Rejection Motif Input Form */}
              {isRejecting && (
                <div className="no-print bg-rose-50 border border-rose-200 rounded-2xl p-5 space-y-3 animate-in fade-in">
                  <h4 className="text-xs font-black text-rose-950 uppercase tracking-wider flex items-center gap-1.5">
                    <AlertCircle size={15} className="text-rose-600" />
                    Préciser le motif de non-conformité
                  </h4>
                  <textarea
                    rows={3}
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    placeholder="ex: CNI illisible, manque le verso ou photos de boutique floues..."
                    className="w-full bg-white border border-rose-200 rounded-xl p-3 text-xs font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRejecting(false)}
                      className="px-4 py-2 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs"
                    >
                      Annuler
                    </button>
                    <button
                      type="button"
                      onClick={() => handleRejectKyc(selectedShop)}
                      disabled={isProcessingKyc || !rejectionReason.trim()}
                      className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-colors shadow-sm"
                    >
                      {isProcessingKyc ? "Rejet en cours..." : "Confirmer le Rejet"}
                    </button>
                  </div>
                </div>
              )}

            </div>

            {/* Bottom Modal Actions (Hidden in Print) */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 no-print">
              <button
                type="button"
                onClick={() => setSelectedShop(null)}
                className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Fermer
              </button>

              <div className="flex items-center gap-2">
                {!isRejecting && (
                  <button
                    type="button"
                    onClick={() => setIsRejecting(true)}
                    className="px-5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs border border-rose-200 transition-colors"
                  >
                    Rejeter avec motif
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleApproveKyc(selectedShop)}
                  disabled={isProcessingKyc || selectedShop.kyc.status === "approved"}
                  className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs transition-all shadow-md shadow-emerald-600/25 flex items-center gap-1.5 cursor-pointer"
                >
                  {isProcessingKyc ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={16} />}
                  <span>{selectedShop.kyc.status === "approved" ? "Déjà Certifiée ✓" : "Valider & Attribuer le Badge Certifié 🛡️"}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirmShop && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 size={30} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                Supprimer définitivement cette boutique ?
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Êtes-vous sûr de vouloir supprimer définitivement la boutique <strong>&quot;{deleteConfirmShop.name}&quot;</strong> et son compte vendeur ? Cette action est irréversible et supprimera l&apos;ensemble de ses produits et accès.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmShop(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteShopAccount(deleteConfirmShop)}
                disabled={isProcessingKyc}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-lg shadow-rose-600/25 flex items-center justify-center gap-1.5"
              >
                {isProcessingKyc ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={15} />}
                <span>Supprimer Définitivement</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
