"use client";

import { useState, useEffect } from "react";
import { Wallet, ArrowDownRight, CheckCircle2, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PayoutRecord {
  id: string;
  amount: string;
  provider: string;
  phone: string;
  status: string;
  date: string;
  ref: string;
}

export default function RelayEarningsPage() {
  const [amount, setAmount] = useState("");
  const [provider, setProvider] = useState("Wave");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [relayPointId, setRelayPointId] = useState<string | null>(null);

  const [availableBalance, setAvailableBalance] = useState(0);
  const [totalWithdrawn, setTotalWithdrawn] = useState(0);
  const [payouts, setPayouts] = useState<PayoutRecord[]>([]);

  const fetchEarningsData = async () => {
    const relayCode = localStorage.getItem("kalagban_relay_code");
    
    // Find pickup_point id
    let pId = null;
    if (relayCode) {
      const { data: pt } = await supabase
        .from("pickup_points")
        .select("id")
        .eq("code", relayCode)
        .maybeSingle();
      if (pt) {
        pId = pt.id;
        setRelayPointId(pt.id);
      }
    }

    // 1. Calculate earned commissions from relay_logs
    const { data: logs } = await supabase
      .from("relay_logs")
      .select("commission_earned, action_type")
      .eq("action_type", "pickup");

    const totalEarned = (logs || []).reduce((acc, l) => acc + (Number(l.commission_earned) || 300), 0);

    // 2. Fetch payouts
    const { data: payoutsData } = await supabase
      .from("relay_payouts")
      .select("*")
      .order("created_at", { ascending: false });

    if (payoutsData && payoutsData.length > 0) {
      const processedSum = payoutsData
        .filter(p => p.status === "processed")
        .reduce((acc, p) => acc + Number(p.amount), 0);
      const pendingSum = payoutsData
        .filter(p => p.status === "pending")
        .reduce((acc, p) => acc + Number(p.amount), 0);

      setTotalWithdrawn(processedSum);
      setAvailableBalance(Math.max(0, totalEarned - processedSum - pendingSum));

      setPayouts(payoutsData.map(p => ({
        id: p.id.slice(0, 8).toUpperCase(),
        amount: `${Number(p.amount).toLocaleString()} FCFA`,
        provider: p.payment_method || "Wave",
        phone: p.reference_code || "--",
        status: p.status,
        date: new Date(p.created_at).toLocaleDateString("fr-FR"),
        ref: p.status === "processed" ? "Virement Effectué" : "En cours d'approbation Admin"
      })));
    } else {
      setAvailableBalance(totalEarned);
      setPayouts([]);
    }
  };

  useEffect(() => {
    fetchEarningsData();
  }, []);

  const handleRequestPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    const reqAmount = Number(amount);
    if (!reqAmount || reqAmount <= 0) return;
    if (reqAmount > availableBalance) {
      alert("Le montant demandé dépasse votre solde disponible.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMsg("");

    try {
      if (relayPointId) {
        await supabase.from("relay_payouts").insert({
          pickup_point_id: relayPointId,
          amount: reqAmount,
          status: "pending",
          payment_method: provider,
          reference_code: phone,
        });

        await supabase.from("relay_notifications").insert({
          pickup_point_id: relayPointId,
          title: "Demande de Retrait Enregistrée",
          message: `Votre demande de virement de ${reqAmount.toLocaleString()} FCFA via ${provider} (${phone}) est en cours de traitement par l'Administration.`,
          type: "payout"
        });
      }

      setSuccessMsg(`Demande de retrait de ${reqAmount.toLocaleString()} FCFA transmise avec succès à l'Administration Kalagban.`);
      setAmount("");
      setPhone("");
      await fetchEarningsData();
    } catch (err) {
      console.error("Payout error:", err);
      alert("Erreur lors de la demande de virement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div>
        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Commissions & Versements Mobile Money</h1>
        <p className="text-gray-500 text-xs font-medium mt-1">Gérez vos revenus de garde et de remise de colis en point relais.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Solde Disponible à Retirer</p>
          <h3 className="text-3xl font-black text-emerald-600 mt-2">{availableBalance.toLocaleString()} FCFA</h3>
          <p className="text-xs text-gray-500 font-medium mt-2">Calculé sur vos remises validées par Code OTP</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Total Déjà Retiré</p>
          <h3 className="text-3xl font-black text-gray-900 mt-2">{totalWithdrawn.toLocaleString()} FCFA</h3>
          <p className="text-xs text-gray-500 font-medium mt-2">Versements Mobile Money effectués avec succès</p>
        </div>

        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Taux de Commission Relais</p>
          <h3 className="text-3xl font-black text-indigo-600 mt-2">300 FCFA <span className="text-xs font-normal text-gray-500">/ colis</span></h3>
          <p className="text-xs text-gray-500 font-medium mt-2">Règlement direct par l'Admin Kalagban</p>
        </div>
      </div>

      {/* Form Request Payout */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-xs space-y-6">
        <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
          <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-gray-900 text-base">Demander un Retrait de Commission</h3>
            <p className="text-xs text-gray-500 font-medium">Transférer votre solde directement sur votre compte Mobile Money</p>
          </div>
        </div>

        {successMsg && (
          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleRequestPayout} className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Montant à Retirer (FCFA)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="ex: 15000"
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl p-3.5 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-all"
              required
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">Moyen de Paiement</label>
            <select
              value={provider}
              onChange={(e) => setProvider(e.target.value)}
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl p-3.5 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-all"
            >
              <option value="Wave">Wave Côte d'Ivoire</option>
              <option value="Orange Money">Orange Money</option>
              <option value="MTN MoMo">MTN Mobile Money</option>
              <option value="Moov Money">Moov Money</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">N° Téléphone du Compte</label>
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+225 07..."
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl p-3.5 font-mono font-bold text-sm focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-all"
              required
            />
          </div>

          <div className="md:col-span-3 pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="py-3.5 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>{isSubmitting ? "Soumission en cours..." : "Soumettre la Demande de Retrait"}</span>
            </button>
          </div>
        </form>
      </div>

      {/* History Table */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs space-y-4">
        <h3 className="font-extrabold text-gray-900 text-base">Historique des Retraits Effectués</h3>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">N° Demande</th>
                <th className="px-4 py-3.5">Montant</th>
                <th className="px-4 py-3.5">Moyen & Téléphone</th>
                <th className="px-4 py-3.5">Statut Admin</th>
                <th className="px-4 py-3.5 rounded-r-xl text-right">Référence Transaction</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payouts.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-gray-400 font-medium text-xs">
                    Aucune demande de retrait effectuée pour le moment.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-4 font-mono font-black text-indigo-600">{p.id}</td>
                    <td className="px-4 py-4 font-bold text-gray-900">{p.amount}</td>
                    <td className="px-4 py-4 text-xs">
                      <span className="text-gray-900 font-bold">{p.provider}</span>
                      <span className="text-gray-500 block font-mono mt-0.5">{p.phone}</span>
                    </td>
                    <td className="px-4 py-4">
                      {p.status === "processed" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Payé par Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          En Attente d'Approbation
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right font-mono text-xs text-gray-500">{p.ref}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
