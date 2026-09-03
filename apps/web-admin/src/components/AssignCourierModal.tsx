"use client";

import React, { useState, useEffect } from "react";
import { 
  X, 
  Truck, 
  Send, 
  Loader2 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface CourierOption {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  license_plate?: string | null;
  preferred_zone?: string | null;
  status: string;
  rating?: number;
  total_deliveries?: number;
}

interface AssignCourierModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: {
    id: string;
    customer_name?: string;
    customer_phone?: string;
    shipping_address?: string | { city?: string; address_line?: string; full_name?: string; phone?: string };
    total_amount?: number;
    shops?: {
      name: string;
      payout_phone?: string;
    };
  } | null;
  onAssignedSuccess: () => void;
}

export default function AssignCourierModal({
  isOpen,
  onClose,
  order,
  onAssignedSuccess
}: AssignCourierModalProps) {
  const [couriers, setCouriers] = useState<CourierOption[]>([]);
  const [loadingCouriers, setLoadingCouriers] = useState(false);
  const [selectedCourierId, setSelectedCourierId] = useState("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Load couriers
  useEffect(() => {
    if (!isOpen) return;

    const fetchCouriers = async () => {
      setLoadingCouriers(true);
      try {
        const { data, error } = await supabase
          .from("couriers")
          .select("id, full_name, phone, vehicle_type, license_plate, preferred_zone, status, rating, total_deliveries")
          .order("full_name", { ascending: true });

        if (!error && data) {
          setCouriers(data);
          const available = data.find(c => c.status === "available");
          if (available) {
            setSelectedCourierId(available.id);
          } else if (data.length > 0) {
            setSelectedCourierId(data[0].id);
          }
        }
      } catch (err) {
        console.error("Erreur chargement livreurs:", err);
      } finally {
        setLoadingCouriers(false);
      }
    };

    fetchCouriers();
  }, [isOpen]);

  if (!isOpen || !order) return null;

  const orderCode = `KB-${order.id.slice(0, 8).toUpperCase()}`;
  const addressStr = typeof order.shipping_address === "string" 
    ? order.shipping_address 
    : order.shipping_address?.address_line || "Abidjan";

  const selectedCourier = couriers.find(c => c.id === selectedCourierId);

  // Generate WhatsApp Message Template
  const generateWhatsAppMessage = () => {
    const courierName = selectedCourier?.full_name || "Livreur";
    const deliveryUrl = `https://www.kalagban.com/delivery/${order.id}`;
    
    return `🛵 *MISSION DE LIVRAISON KALAGBAN EXPRESS*\n\n` +
      `Bonjour ${courierName},\n` +
      `Une nouvelle course de livraison à domicile vous est assignée :\n\n` +
      `📦 *Commande :* #${orderCode}\n` +
      `🏪 *Retrait Boutique :* ${order.shops?.name || "Boutique Partenaire"} (${order.shops?.payout_phone || "Contact Boutique"})\n` +
      `👤 *Destinataire :* ${order.customer_name || "Client"}\n` +
      `📍 *Adresse / Repère :* ${addressStr}\n` +
      `📞 *Contact Client :* ${order.customer_phone || "--"}\n\n` +
      `👉 *Cliquez sur votre lien pour démarrer la course et valider le code OTP :*\n` +
      `${deliveryUrl}\n\n` +
      `_SOUMANGOUROU TECHNOLOGIE - Plateforme KALAGBAN_`;
  };

  const handleOpenConfirm = () => {
    if (!selectedCourierId) {
      setErrorMsg("Veuillez sélectionner un livreur.");
      return;
    }
    setErrorMsg("");
    setShowConfirmDialog(true);
  };

  const handleConfirmAssignment = async () => {
    if (!selectedCourierId) {
      setErrorMsg("Veuillez sélectionner un livreur.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg("");

    try {
      const now = new Date().toISOString();

      // 1. Enregistrer ou mettre à jour dans courier_assignments
      const { error: assignErr } = await supabase
        .from("courier_assignments")
        .insert({
          courier_id: selectedCourierId,
          order_id: order.id,
          origin_address: order.shops?.name || "Boutique Partenaire",
          destination_address: addressStr,
          status: "assigned",
          notes: notes.trim() || null,
          assigned_at: now
        });

      if (assignErr) {
        console.warn("Avertissement insertion courier_assignments:", assignErr);
      }

      // 2. Mettre à jour le statut du livreur
      await supabase
        .from("couriers")
        .update({ status: "on_delivery" })
        .eq("id", selectedCourierId);

      // 3. Mettre à jour la commande
      await supabase
        .from("orders")
        .update({
          status: "processing",
          relay_status: "in_transit"
        })
        .eq("id", order.id);

      // 4. Notification en direct pour le client
      try {
        const { data: orderData } = await supabase
          .from("orders")
          .select("customer_id")
          .eq("id", order.id)
          .single();

        if (orderData?.customer_id) {
          await supabase.from("customer_notifications").insert({
            customer_id: orderData.customer_id,
            order_id: order.id,
            title: "Livreur Assigné à votre Commande 🛵",
            message: `Votre livreur ${selectedCourier?.full_name} (${selectedCourier?.phone}) a été assigné pour votre livraison à domicile.`,
            type: "delivery"
          });
        }
      } catch (notifErr) {
        console.warn("Avertissement notification client:", notifErr);
      }

      // 5. Ouvrir WhatsApp avec le message officiel pour le livreur
      if (selectedCourier?.phone) {
        const phoneClean = selectedCourier.phone.replace(/[^0-9]/g, "");
        const waPhone = phoneClean.startsWith("225") ? phoneClean : `225${phoneClean}`;
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(generateWhatsAppMessage())}`;
        window.open(waUrl, "_blank");
      }

      setShowConfirmDialog(false);
      onAssignedSuccess();
      onClose();
    } catch (err: unknown) {
      console.error("Erreur lors de l'assignation:", err);
      setErrorMsg("Erreur lors de l'enregistrement de l'assignation.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] relative">
        
        {/* HEADER */}
        <div className="bg-slate-900 text-white p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Truck size={22} />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight">Assigner un Livreur (Dispatch Manuel)</h2>
              <p className="text-xs text-slate-400 font-medium">Commande #{orderCode}</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* BODY */}
        <div className="p-6 overflow-y-auto space-y-5">
          
          {/* RECAP COMMANDE */}
          <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-500 uppercase tracking-wider">Détails de la Livraison</span>
              <span className="font-extrabold text-indigo-600 font-mono">
                {(order.total_amount || 0).toLocaleString("fr-FR")} FCFA
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                <span className="font-bold text-slate-400 block uppercase">Client</span>
                <p className="font-extrabold text-slate-900">{order.customer_name || "Client"}</p>
                <p className="text-slate-600 font-mono">{order.customer_phone || "Pas de numéro"}</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200/60 space-y-1">
                <span className="font-bold text-slate-400 block uppercase">Boutique</span>
                <p className="font-extrabold text-slate-900">{order.shops?.name || "Boutique Partenaire"}</p>
                <p className="text-slate-600 font-mono">{order.shops?.payout_phone || "--"}</p>
              </div>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200/60">
              <span className="font-bold text-slate-400 block text-xs uppercase mb-1">Destination & Repère</span>
              <p className="text-xs font-semibold text-slate-800">
                📍 {addressStr}
              </p>
            </div>
          </div>

          {/* SÉLECTION DU LIVREUR */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-700 uppercase">
              Sélectionner le Coursier Disponible *
            </label>

            {loadingCouriers ? (
              <div className="p-6 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 size={16} className="animate-spin text-indigo-600" />
                Chargement des coursiers...
              </div>
            ) : couriers.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                Aucun livreur enregistré. Veuillez d&apos;abord enregistrer des livreurs dans l&apos;onglet <strong>Gestion des Livreurs</strong>.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {couriers.map((c) => {
                  const isSelected = c.id === selectedCourierId;
                  const isAvailable = c.status === "available";

                  return (
                    <div
                      key={c.id}
                      onClick={() => setSelectedCourierId(c.id)}
                      className={`p-3 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition ${
                        isSelected
                          ? "border-indigo-600 bg-indigo-50/50 shadow-xs"
                          : "border-slate-200 hover:border-slate-300 bg-white"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-slate-900">{c.full_name}</span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                            {c.vehicle_type}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-500 font-mono">{c.phone} • {c.preferred_zone || "Abidjan"}</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isAvailable ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}>
                          {isAvailable ? "Disponible" : "Occupé"}
                        </span>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                          isSelected ? "border-indigo-600 bg-indigo-600 text-white" : "border-slate-300"
                        }`}>
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-white"></span>}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* APERÇU MESSAGE WHATSAPP */}
          {selectedCourier && (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80 space-y-2">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <Send size={13} className="text-emerald-600" />
                Aperçu de la Feuille de Route WhatsApp
              </span>
              <pre className="bg-white/80 p-3 rounded-xl border border-emerald-100 text-xs font-sans text-slate-700 whitespace-pre-wrap leading-relaxed">
                {generateWhatsAppMessage()}
              </pre>
            </div>
          )}

          {/* NOTES FACULTATIVES */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-500 uppercase">
              Instructions Spéciales pour le Livreur (Facultatif)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Ex: Colis fragile, contacter la cliente 10min avant..."
              className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 text-slate-900 text-xs rounded-xl py-2.5 px-3.5 outline-none transition"
            />
          </div>

          {errorMsg && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
              <p className="text-xs font-bold text-red-600">{errorMsg}</p>
            </div>
          )}
        </div>

        {/* FOOTER */}
        <div className="bg-slate-50 p-4 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition cursor-pointer"
          >
            Annuler
          </button>
          
          <button
            type="button"
            onClick={handleOpenConfirm}
            disabled={isSubmitting || !selectedCourierId}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            <Send size={16} />
            <span>Assigner &amp; Notifier sur WhatsApp</span>
          </button>
        </div>

        {/* POPUP DE CONFIRMATION DE SÉCURITÉ */}
        {showConfirmDialog && selectedCourier && (
          <div className="absolute inset-0 z-60 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-gray-100 text-center space-y-5">
              <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner border border-emerald-200">
                <Truck size={28} />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-base font-black text-gray-900">
                  Confirmer l&apos;assignation du livreur ?
                </h3>
                <p className="text-xs text-gray-500 font-medium">
                  Voulez-vous confier la commande <strong>#{orderCode}</strong> à :
                </p>
                <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-left space-y-1 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-black text-slate-900">{selectedCourier.full_name}</span>
                    <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 uppercase">
                      {selectedCourier.vehicle_type}
                    </span>
                  </div>
                  <p className="text-xs font-mono text-slate-600">📞 {selectedCourier.phone}</p>
                  <p className="text-[11px] text-slate-500">📍 Zone : {selectedCourier.preferred_zone || "Abidjan"}</p>
                </div>
              </div>

              <div className="flex items-center gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowConfirmDialog(false)}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition cursor-pointer"
                >
                  Modifier
                </button>
                <button
                  type="button"
                  onClick={handleConfirmAssignment}
                  disabled={isSubmitting}
                  className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/25 transition cursor-pointer flex items-center justify-center gap-1.5"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      <span>Validation...</span>
                    </>
                  ) : (
                    <span>Oui, Assigner 🚀</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
