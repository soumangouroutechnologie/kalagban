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
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
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
            className="w-8 h-8 rounded-full bg-slate-800 hover:bg-slate-700 flex items-center justify-center text-slate-400 hover:text-white transition"
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
            <label className="block text-xs font-black uppercase tracking-wider text-slate-700">
              Sélectionner le Livreur Disponible
            </label>
            
            {loadingCouriers ? (
              <div className="flex items-center justify-center p-6 bg-slate-50 rounded-2xl border border-slate-100">
                <Loader2 className="w-6 h-6 text-indigo-600 animate-spin mr-2" />
                <span className="text-xs font-bold text-slate-500">Chargement de la flotte de livreurs...</span>
              </div>
            ) : couriers.length === 0 ? (
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-center space-y-1">
                <p className="text-xs font-bold text-amber-800">Aucun livreur enregistré dans la base.</p>
                <p className="text-xs text-amber-600">Enregistrez d&apos;abord des livreurs dans l&apos;onglet Flotte de Livreurs.</p>
              </div>
            ) : (
              <select
                value={selectedCourierId}
                onChange={(e) => setSelectedCourierId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 focus:border-indigo-600 focus:bg-white text-slate-900 text-sm font-semibold rounded-2xl py-3 px-4 outline-none transition"
              >
                {couriers.map((courier) => (
                  <option key={courier.id} value={courier.id}>
                    {courier.full_name} ({courier.vehicle_type?.toUpperCase() || "MOTO"}) - {courier.phone} {courier.preferred_zone ? `[${courier.preferred_zone}]` : ""} - ({courier.status === "available" ? "Disponible 🟢" : "En course 🟠"})
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* PRÉVISUALISATION MESSAGE WHATSAPP */}
          {selectedCourier && (
            <div className="bg-emerald-50/70 border border-emerald-200 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-emerald-800 uppercase tracking-wider">
                <Send size={14} />
                <span>Message WhatsApp envoyé au Livreur</span>
              </div>
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
            className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-100 transition"
          >
            Annuler
          </button>
          
          <button
            type="button"
            onClick={handleConfirmAssignment}
            disabled={isSubmitting || !selectedCourierId}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-600/20 transition transform active:scale-95 disabled:opacity-50"
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Assignation en cours...</span>
              </>
            ) : (
              <>
                <Send size={16} />
                <span>Confirmer & Notifier sur WhatsApp</span>
              </>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}
