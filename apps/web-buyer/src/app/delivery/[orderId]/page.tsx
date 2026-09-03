"use client";

import React, { useState, useEffect, use } from "react";
import { 
  Package, 
  MapPin, 
  Phone, 
  Store, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Send, 
  Lock, 
  ExternalLink,
  ShieldCheck,
  Truck,
  ArrowRight
} from "lucide-react";

interface DeliveryCourseData {
  id: string;
  orderCode: string;
  customerName: string;
  customerPhone?: string;
  customerEmail?: string;
  shippingAddress: string;
  totalAmount: number;
  status: string;
  deliveryType?: string;
  createdAt: string;
  shop?: {
    id: string;
    name: string;
    payout_phone?: string;
  };
  items?: Array<{
    id: string;
    quantity: number;
    unit_price: number;
    products?: {
      title: string;
    };
  }>;
  assignment?: {
    id: string;
    status: string;
    assigned_at: string;
    couriers?: {
      id: string;
      full_name: string;
      phone: string;
      vehicle_type: string;
      license_plate?: string;
    };
  } | null;
}

export default function CourierDeliveryPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = use(params);

  const [course, setCourse] = useState<DeliveryCourseData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // OTP Verification State
  const [otpInput, setOtpInput] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [verifyError, setVerifyError] = useState("");

  // Seller Pickup State
  const [isConfirmingPickup, setIsConfirmingPickup] = useState(false);
  const [pickupSuccess, setPickupSuccess] = useState(false);
  const [pickupError, setPickupError] = useState("");

  const handleConfirmPickup = async () => {
    setIsConfirmingPickup(true);
    setPickupError("");

    try {
      const res = await fetch("/api/delivery/pickup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          courierId: course?.assignment?.couriers?.id || null
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setPickupError(data.error || "Impossible de valider la prise en charge.");
        return;
      }

      setPickupSuccess(true);
      setCourse((prev) => prev ? { 
        ...prev, 
        status: "in_transit",
        assignment: prev.assignment ? { ...prev.assignment, status: "in_transit" } : prev.assignment 
      } : prev);
    } catch (err: unknown) {
      console.error("Erreur lors de la prise en charge:", err);
      setPickupError("Erreur réseau lors de la validation de prise en charge.");
    } finally {
      setIsConfirmingPickup(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadCourse = async () => {
      try {
        const res = await fetch(`/api/delivery/info?orderId=${encodeURIComponent(orderId)}`);
        const data = await res.json();

        if (!isMounted) return;

        if (!res.ok || !data.success) {
          setErrorMsg(data.error || "Impossible de charger la feuille de route de livraison.");
          return;
        }

        setCourse(data.order);
        if (data.order.status === "delivered") {
          setVerifySuccess(true);
        }
      } catch (err: unknown) {
        if (!isMounted) return;
        console.error("Erreur de chargement de la course:", err);
        setErrorMsg("Erreur de connexion au serveur.");
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    loadCourse();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpInput.trim()) {
      setVerifyError("Veuillez saisir le code OTP donné par le client.");
      return;
    }

    setIsVerifying(true);
    setVerifyError("");

    try {
      const res = await fetch("/api/delivery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          otp: otpInput.trim(),
          courierId: course?.assignment?.couriers?.id || null
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setVerifyError(data.error || "Code OTP incorrect.");
        setIsVerifying(false);
        return;
      }

      setVerifySuccess(true);
      setCourse((prev) => prev ? { ...prev, status: "delivered" } : prev);
    } catch (err) {
      console.error("Erreur lors de la validation OTP:", err);
      setVerifyError("Erreur de connexion réseau lors de la validation.");
    } finally {
      setIsVerifying(false);
    }
  };

  // Helper WhatsApp Client
  const getClientWhatsappUrl = () => {
    if (!course) return "#";
    const phone = (course.customerPhone || "").replace(/[^0-9]/g, "");
    const cleanPhone = phone.startsWith("225") ? phone : `225${phone}`;
    const text = encodeURIComponent(
      `Bonjour ${course.customerName || "client(e)"} 👋, je suis votre livreur KALAGBAN pour la commande #${course.orderCode}.\n\nPouvez-vous me partager votre position géographique WhatsApp exacte pour que je vous apporte votre colis ? Merci !`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  // Helper WhatsApp Vendeur
  const getShopWhatsappUrl = () => {
    if (!course?.shop?.payout_phone) return "#";
    const phone = course.shop.payout_phone.replace(/[^0-9]/g, "");
    const cleanPhone = phone.startsWith("225") ? phone : `225${phone}`;
    const text = encodeURIComponent(
      `Bonjour ${course.shop.name}, je suis le coursier KALAGBAN en charge de la commande #${course.orderCode}. Je suis en route pour récupérer le colis.`
    );
    return `https://wa.me/${cleanPhone}?text=${text}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <Loader2 className="w-12 h-12 text-amber-400 animate-spin mb-4" />
        <p className="text-slate-300 font-semibold text-lg">Chargement de la feuille de course...</p>
      </div>
    );
  }

  if (errorMsg || !course) {
    return (
      <div className="min-h-screen bg-slate-900 text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 bg-red-500/20 text-red-400 rounded-full flex items-center justify-center mb-4 border border-red-500/30">
          <AlertCircle size={36} />
        </div>
        <h1 className="text-2xl font-black mb-2">Course introuvable</h1>
        <p className="text-slate-400 max-w-sm mb-6">{errorMsg || "Ce lien de livraison n'est pas valide ou a expiré."}</p>
        <button 
          onClick={() => {
            setLoading(true);
            setErrorMsg("");
            fetch(`/api/delivery/info?orderId=${encodeURIComponent(orderId)}`)
              .then(r => r.json())
              .then(data => {
                if (data.success) setCourse(data.order);
                else setErrorMsg(data.error || "Erreur de chargement.");
              })
              .catch(() => setErrorMsg("Erreur de connexion."))
              .finally(() => setLoading(false));
          }} 
          className="bg-slate-800 hover:bg-slate-700 text-white font-bold px-6 py-3 rounded-xl border border-slate-700 transition"
        >
          Réessayer
        </button>
      </div>
    );
  }

  const isPickedUp = course.status === "in_transit" || course.status === "delivered" || course.assignment?.status === "in_transit" || course.assignment?.status === "delivered" || pickupSuccess;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* HEADER APP-LIKE */}
      <header className="bg-slate-900/90 backdrop-blur border-b border-slate-800 sticky top-0 z-50 px-4 py-3.5">
        <div className="max-w-md mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
              <Truck size={20} className="text-white" />
            </div>
            <div>
              <span className="text-xs font-black text-amber-400 uppercase tracking-wider block">KALAGBAN EXPRESS</span>
              <span className="text-sm font-bold text-white">Feuille de Course Livreur</span>
            </div>
          </div>
          <span className="text-xs font-mono font-bold bg-slate-800 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-700">
            {course.orderCode}
          </span>
        </div>
      </header>

      {/* CONTENT */}
      <main className="flex-1 max-w-md w-full mx-auto p-4 space-y-4 pb-12">
        
        {/* STATUS BANNER */}
        {verifySuccess || course.status === "delivered" ? (
          <div className="bg-linear-to-br from-emerald-950/80 via-emerald-900/60 to-slate-900 border-2 border-emerald-500/50 rounded-3xl p-6 text-center shadow-2xl space-y-4">
            <div className="w-16 h-16 bg-emerald-500 text-white rounded-full flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30">
              <CheckCircle2 size={36} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-3 py-1 rounded-full inline-block">
                🔒 COURSE TERMINÉE &amp; VERROUILLÉE
              </span>
              <h2 className="text-xl font-black text-white leading-snug pt-1">
                Course terminée, le client a validé le colis envoyé par le livreur
              </h2>
              <p className="text-xs text-emerald-200/80 font-medium max-w-xs mx-auto">
                Ce lien de livraison a été clôturé suite à la validation du Code OTP secret. Aucune modification ultérieure n&apos;est possible.
              </p>
            </div>

            {/* AUDIT DETAILS SUMMARY */}
            <div className="bg-slate-950/80 rounded-2xl p-4 text-left border border-emerald-500/20 space-y-2.5 text-xs">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-bold uppercase">Réf. Commande :</span>
                <span className="font-mono font-extrabold text-amber-400">#{course.orderCode}</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-bold uppercase">Destinataire :</span>
                <span className="font-bold text-slate-200">{course.customerName || "Client"} ({course.customerPhone || "N/A"})</span>
              </div>

              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400 font-bold uppercase">Adresse livrée :</span>
                <span className="font-medium text-slate-300 text-right max-w-50 truncate">{course.shippingAddress}</span>
              </div>

              {course.assignment?.couriers && (
                <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                  <span className="text-slate-400 font-bold uppercase">Livreur :</span>
                  <span className="font-bold text-emerald-300">{course.assignment.couriers.full_name} ({course.assignment.couriers.vehicle_type?.toUpperCase() || "MOTO"})</span>
                </div>
              )}

              <div className="flex justify-between items-center pt-1 text-[11px] text-emerald-400 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} />
                  Validation OTP Certifiée
                </span>
                <span>Archivé Logistique ✓</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-5">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-black uppercase tracking-wider text-slate-400">Statut de la Course</span>
              <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-3 py-1 rounded-full animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                En cours de livraison
              </span>
            </div>
            <p className="text-sm text-slate-300">
              Rendez-vous à l&apos;adresse du client, remettez le colis et demandez son <strong>code OTP secret</strong> pour valider.
            </p>
          </div>
        )}

        {/* 1. RETRAIT VENDEUR */}
        <section className={`bg-slate-900 border rounded-3xl p-5 space-y-3.5 transition-all ${
          isPickedUp ? "border-emerald-500/30 bg-slate-900/60" : "border-amber-500/50 ring-2 ring-amber-500/20 shadow-xl"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
              <Store size={16} />
              <span>1. Point de Retrait (Boutique Marchande)</span>
            </div>
            {isPickedUp && (
              <span className="inline-flex items-center gap-1 text-[11px] font-extrabold text-emerald-400 bg-emerald-950/60 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                <CheckCircle2 size={12} /> Colis Récupéré ✓
              </span>
            )}
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-3.5 border border-slate-800/60">
            <h3 className="font-bold text-base text-white">{course.shop?.name || "Boutique Partenaire"}</h3>
            {course.shop?.payout_phone && (
              <p className="text-xs text-slate-400 mt-0.5">Contact : {course.shop.payout_phone}</p>
            )}
          </div>

          {course.shop?.payout_phone && (
            <div className="grid grid-cols-2 gap-2 pt-1">
              <a
                href={`tel:${course.shop.payout_phone}`}
                className="flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs py-2.5 rounded-xl border border-slate-700 transition"
              >
                <Phone size={14} className="text-amber-400" />
                Appeler Vendeur
              </a>
              <a
                href={getShopWhatsappUrl()}
                target="_blank"
                rel="noreferrer"
                className="flex items-center justify-center gap-2 bg-emerald-700/30 hover:bg-emerald-700/40 text-emerald-300 font-bold text-xs py-2.5 rounded-xl border border-emerald-600/30 transition"
              >
                <Send size={14} />
                WhatsApp Vendeur
              </a>
            </div>
          )}

          {/* BOUTON CLÉ : CONFIRMER RÉCUPÉRATION CHEZ LE VENDEUR */}
          {!isPickedUp && course.status !== "delivered" && (
            <div className="pt-2">
              {pickupError && (
                <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-2.5 mb-2 text-center">
                  <p className="text-xs font-bold text-red-300">{pickupError}</p>
                </div>
              )}
              <button
                type="button"
                onClick={handleConfirmPickup}
                disabled={isConfirmingPickup}
                className="w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-3.5 px-4 rounded-2xl shadow-xl shadow-amber-500/25 transition transform active:scale-95 text-sm cursor-pointer disabled:opacity-50"
              >
                {isConfirmingPickup ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    <span>Confirmation en cours...</span>
                  </>
                ) : (
                  <>
                    <Package size={18} />
                    <span>J&apos;ai récupéré le colis chez le vendeur</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          )}
        </section>

        {/* 2. DESTINATION CLIENT */}
        <section className={`bg-slate-900 border rounded-3xl p-5 space-y-3.5 transition-all ${
          isPickedUp ? "border-indigo-500/50 shadow-xl ring-2 ring-indigo-500/20" : "border-slate-800 opacity-60"
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider">
              <MapPin size={16} />
              <span>2. Destination &amp; Client</span>
            </div>
            {!isPickedUp && (
              <span className="text-[10px] font-bold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                En attente du retrait boutique
              </span>
            )}
          </div>

          <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/60 space-y-2">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs text-slate-400 uppercase font-bold block">Nom du destinataire</span>
                <span className="font-extrabold text-white text-base">{course.customerName || "Client"}</span>
              </div>
              {course.customerPhone && (
                <span className="text-xs font-mono font-bold bg-slate-800 text-indigo-300 px-2.5 py-1 rounded-lg">
                  {course.customerPhone}
                </span>
              )}
            </div>

            <div>
              <span className="text-xs text-slate-400 uppercase font-bold block">Adresse &amp; Repères indiqués</span>
              <p className="text-sm font-semibold text-amber-200 mt-0.5 bg-amber-950/30 p-2.5 rounded-xl border border-amber-800/30">
                📍 {course.shippingAddress || "Abidjan (Adresse non spécifiée)"}
              </p>
            </div>
          </div>

          {/* BOUTON CLÉ : DEMANDER POSITION WHATSAPP */}
          {course.customerPhone && (
            <a
              href={getClientWhatsappUrl()}
              target="_blank"
              rel="noreferrer"
              className={`w-full flex items-center justify-center gap-2.5 bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-lg shadow-emerald-600/30 transition transform active:scale-95 text-sm ${
                !isPickedUp ? "pointer-events-none opacity-50" : ""
              }`}
            >
              <Send size={18} />
              <span>Demander la Position GPS sur WhatsApp</span>
              <ExternalLink size={14} className="opacity-70" />
            </a>
          )}
        </section>

        {/* 3. ARTICLES DU COLIS */}
        {course.items && course.items.length > 0 && (
          <section className="bg-slate-900 border border-slate-800 rounded-3xl p-5 space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-2">
                <Package size={16} className="text-amber-400" />
                Contenu du Colis ({course.items.length})
              </span>
              <span className="text-amber-400 font-extrabold">{course.totalAmount.toLocaleString("fr-FR")} FCFA</span>
            </div>

            <div className="space-y-2">
              {course.items.map((item) => (
                <div key={item.id} className="flex items-center justify-between bg-slate-950/40 p-2.5 rounded-xl text-xs">
                  <span className="font-medium text-slate-200 line-clamp-1">{item.products?.title || "Article"}</span>
                  <span className="font-bold text-slate-400 ml-2">x{item.quantity}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 4. VALIDATION PAR CODE OTP */}
        {course.status !== "delivered" && !verifySuccess && (
          <section className="bg-linear-to-b from-slate-900 to-slate-950 border-2 border-amber-500/40 rounded-3xl p-6 shadow-xl space-y-4">
            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-full flex items-center justify-center mx-auto mb-2 border border-amber-500/30">
                <Lock size={24} />
              </div>
              <h3 className="text-lg font-black text-white">Validation de Remise (Code OTP)</h3>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                Demandez au client le <strong>code à 4 chiffres</strong> affiché sur son reçu de commande.
              </p>
            </div>

            <form onSubmit={handleVerifyOtp} className="space-y-3.5">
              <div>
                <input
                  type="text"
                  maxLength={6}
                  value={otpInput}
                  onChange={(e) => {
                    setOtpInput(e.target.value.replace(/[^0-9]/g, ""));
                    setVerifyError("");
                  }}
                  placeholder="Ex: 7429"
                  className="w-full text-center text-3xl font-mono font-black tracking-widest bg-slate-950 text-amber-400 border-2 border-slate-700 focus:border-amber-400 rounded-2xl py-3.5 px-4 outline-none transition placeholder:text-slate-700 placeholder:text-xl"
                  autoComplete="off"
                />
              </div>

              {verifyError && (
                <div className="bg-red-950/60 border border-red-800/60 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-red-300">{verifyError}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={isVerifying || !otpInput.trim()}
                className="w-full flex items-center justify-center gap-2 bg-linear-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition transform active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {isVerifying ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    <span>Validation en cours...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck size={20} />
                    <span>Confirmer la Livraison</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </section>
        )}

      </main>
    </div>
  );
}
