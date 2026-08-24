"use client";

import React, { useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { 
  Banknote, 
  X, 
  Send, 
  Loader2, 
  Smartphone,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

const emptySubscribe = () => () => {};

interface PayoutRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  availableBalance: number;
  defaultProvider?: string;
  defaultPhone?: string;
  onSuccess: () => void;
}

export default function PayoutRequestModal({
  isOpen,
  onClose,
  shopId,
  shopName,
  availableBalance,
  defaultProvider = "Wave",
  defaultPhone = "",
  onSuccess
}: PayoutRequestModalProps) {
  const { toast } = useToast();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [amount, setAmount] = useState<string>("");
  const [paymentMethod, setPaymentMethod] = useState<string>(defaultProvider || "Wave");
  const [payoutPhone, setPayoutPhone] = useState<string>(defaultPhone || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !isClient) return null;

  const minPayout = 5000; // 5 000 FCFA minimum

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const numAmount = parseFloat(amount);

    if (isNaN(numAmount) || numAmount < minPayout) {
      toast.warning(`Le montant minimum de retrait est de ${minPayout.toLocaleString("fr-FR")} FCFA.`);
      return;
    }

    if (numAmount > availableBalance) {
      toast.error(`Le montant demandé dépasse votre solde disponible (${availableBalance.toLocaleString("fr-FR")} FCFA).`);
      return;
    }

    if (!payoutPhone.trim()) {
      toast.warning("Veuillez renseigner le numéro Mobile Money bénéficiaire.");
      return;
    }

    setIsSubmitting(true);
    try {
      const reference = `PAY-${Date.now().toString(36).toUpperCase()}`;

      const { error } = await supabase.from("payouts").insert({
        shop_id: shopId,
        amount: numAmount,
        payment_method: `${paymentMethod} (${payoutPhone.trim()})`,
        reference_code: reference,
        status: "pending"
      });

      if (error) throw error;

      // Notify Admin Back-Office
      try {
        await supabase.from("admin_notifications").insert({
          title: "💰 Nouvelle Demande de Virement",
          message: `La boutique "${shopName || "Marchand"}" demande un virement de ${numAmount.toLocaleString("fr-FR")} FCFA via ${paymentMethod} (${payoutPhone.trim()}).`,
          target_group: "admins",
          notification_type: "info"
        });
      } catch (notifErr) {
        console.warn("Could not insert admin notification:", notifErr);
      }

      toast.success(
        `Votre demande de virement de ${numAmount.toLocaleString("fr-FR")} FCFA a été enregistrée avec succès !`,
        "Demande transmise"
      );
      
      onSuccess();
      onClose();

    } catch (err: unknown) {
      console.error("Payout error:", err);
      const msg = err instanceof Error ? err.message : "Erreur lors de la demande";
      toast.error(msg, "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalContent = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 overflow-hidden flex flex-col my-auto">
        
        {/* Header */}
        <div className="px-6 py-5 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
              <Banknote size={20} />
            </div>
            <div>
              <h3 className="text-base font-black">Demande de Virement</h3>
              <p className="text-xs text-gray-400 font-medium">Boutique &ldquo;{shopName || "Partenaire"}&rdquo; • Reversement</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          {/* Balance card */}
          <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center justify-between">
            <div>
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-900">
                Solde Disponible au Retrait
              </span>
              <p className="text-xl font-black text-emerald-950 mt-0.5">
                {availableBalance.toLocaleString("fr-FR")} <span className="text-xs text-emerald-700">FCFA</span>
              </p>
            </div>
            <button
              type="button"
              onClick={() => setAmount(availableBalance.toString())}
              className="text-[11px] font-extrabold text-emerald-700 bg-emerald-100 hover:bg-emerald-200 px-3 py-1.5 rounded-xl transition-all cursor-pointer"
            >
              Tout retirer
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Montant à virer (FCFA) *
            </label>
            <input
              type="number"
              required
              min={minPayout}
              max={availableBalance}
              placeholder={`Min. ${minPayout.toLocaleString()} FCFA`}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:outline-hidden focus:border-indigo-500"
            />
            <p className="text-[10px] text-gray-400 mt-1">Montant minimum requis : 5 000 FCFA</p>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Opérateur Mobile Money *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-800 focus:outline-hidden focus:border-indigo-500"
            >
              <option value="Wave">🌊 Wave (0% frais)</option>
              <option value="Orange Money">🍊 Orange Money</option>
              <option value="MTN Mobile Money">🟡 MTN Mobile Money</option>
              <option value="Moov Money">🔵 Moov Money</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Numéro de réception du virement *
            </label>
            <div className="relative">
              <Smartphone size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="tel"
                required
                placeholder="Ex: 0700000000"
                value={payoutPhone}
                onChange={(e) => setPayoutPhone(e.target.value)}
                className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-900 focus:outline-hidden focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Validation Notice */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-start gap-2.5 text-[11px] text-slate-700 leading-relaxed font-medium">
            <Info size={16} className="text-slate-500 shrink-0 mt-0.5" />
            <span>
              Les demandes de virement sont contrôlées par notre service financier avant d&apos;être exécutées sur votre compte Mobile Money.
            </span>
          </div>

          <div className="pt-2 flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-bold transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting || availableBalance < minPayout}
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Traitement...
                </>
              ) : (
                <>
                  <Send size={15} />
                  Valider la demande
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
