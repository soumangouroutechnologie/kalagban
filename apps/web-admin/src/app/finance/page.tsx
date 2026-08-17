"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  DollarSign, 
  TrendingUp, 
  CreditCard, 
  ArrowDownRight, 
  Loader2, 
  Sparkles, 
  Receipt,
  Sliders,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Filter,
  Search,
  ExternalLink,
  ShieldCheck
} from "lucide-react";
import { calculateApplicationFee } from "@/lib/fee";
import { useAdminAuth } from "@/lib/rbac";

interface PayoutItem {
  id: string;
  shop_id: string;
  shop_name?: string;
  amount: number;
  status: "pending" | "processed" | "failed";
  payment_method: string;
  reference_code?: string;
  created_at: string;
}

export default function AdminFinancePage() {
  const { hasPermission, isSuperAdmin } = useAdminAuth();

  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalSales: 0,
    applicationFeeEarnings: 0,
    vendorPayoutsDue: 0,
    relayCommissionsDue: 0,
  });

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);

  const fetchFinanceMetrics = async () => {
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total_amount, subtotal, application_fee, shipping_fee, status, delivery_type");

      if (orders) {
        let total = 0;
        let fees = 0;
        let vendorSubtotals = 0;
        let relayComms = 0;

        orders.forEach((o) => {
          if (o.status !== "cancelled") {
            const orderTotal = Number(o.total_amount) || 0;
            let orderSubtotal = o.subtotal !== null && o.subtotal !== undefined ? Number(o.subtotal) : null;
            let orderFee = o.application_fee !== null && o.application_fee !== undefined ? Number(o.application_fee) : null;

            if (orderSubtotal === null || orderFee === null) {
              const calc = calculateApplicationFee(orderTotal);
              orderSubtotal = calc.subtotal;
              orderFee = calc.applicationFee;
            }

            total += orderTotal;
            fees += orderFee;
            vendorSubtotals += orderSubtotal;

            if (o.delivery_type === "pickup_point") {
              relayComms += 300;
            }
          }
        });

        setFinanceData({
          totalSales: total,
          applicationFeeEarnings: fees,
          vendorPayoutsDue: vendorSubtotals,
          relayCommissionsDue: relayComms,
        });
      }

      // Fetch Payouts
      const { data: payoutData } = await supabase
        .from("payouts")
        .select("*, shops(name)")
        .order("created_at", { ascending: false })
        .limit(20);

      if (payoutData) {
        const formatted: PayoutItem[] = payoutData.map((p: any) => ({
          ...p,
          shop_name: p.shops?.name || "Boutique Partenaire",
        }));
        setPayouts(formatted);
      }
    } catch (err) {
      console.error("Error fetching finance metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFinanceMetrics();

    const channel = supabase
      .channel("admin_finance_realtime_full")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchFinanceMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => fetchFinanceMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleApprovePayout = async (payoutId: string) => {
    setProcessingPayoutId(payoutId);
    try {
      const ref = `WAVE-PAY-${Date.now().toString().slice(-6)}`;
      await supabase
        .from("payouts")
        .update({
          status: "processed",
          reference_code: ref,
          processed_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      fetchFinanceMetrics();
    } catch (err) {
      console.error("Error approving payout:", err);
    } finally {
      setProcessingPayoutId(null);
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Comptabilité &amp; Trésorerie</h1>
            <p className="text-xs text-gray-500 font-medium">
              Chiffre d&apos;affaires, frais d&apos;application Kalagban, commissions et reversements vendeurs
            </p>
          </div>
        </div>

        <Link
          href="/finance/pricing"
          className="bg-slate-900 hover:bg-black text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
        >
          <Sliders size={16} /> Configurer Tarifs &amp; Commissions
        </Link>
      </div>

      {/* Finance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Sales (GMV) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-2">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Volume Brut des Ventes (GMV)</span>
          <h3 className="text-2xl font-black text-gray-900">
            {financeData.totalSales.toLocaleString()} <span className="text-xs font-bold text-gray-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-gray-400">Paiements encaissés</p>
        </div>

        {/* Kalagban Application Fees */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-2 relative overflow-hidden">
          <span className="text-[10px] font-black text-emerald-700 uppercase tracking-wider">Frais d&apos;Application Kalagban</span>
          <h3 className="text-2xl font-black text-emerald-600">
            {financeData.applicationFeeEarnings.toLocaleString()} <span className="text-xs font-bold text-emerald-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <Sparkles size={12} /> Revenu net plateforme
          </p>
        </div>

        {/* Vendor Payouts Due */}
        <div className="bg-white p-6 rounded-3xl border border-indigo-100 shadow-xs space-y-2">
          <span className="text-[10px] font-black text-indigo-700 uppercase tracking-wider">Part Vendeurs (Sous-Total)</span>
          <h3 className="text-2xl font-black text-indigo-600">
            {financeData.vendorPayoutsDue.toLocaleString()} <span className="text-xs font-bold text-indigo-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-indigo-500">Montant net dû aux créateurs</p>
        </div>

        {/* Relay Commissions Due */}
        <div className="bg-white p-6 rounded-3xl border border-orange-100 shadow-xs space-y-2">
          <span className="text-[10px] font-black text-orange-700 uppercase tracking-wider">Commissions Points Relais</span>
          <h3 className="text-2xl font-black text-orange-600">
            {financeData.relayCommissionsDue.toLocaleString()} <span className="text-xs font-bold text-orange-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-orange-500">Forfait 300 FCFA / colis</p>
        </div>
      </div>

      {/* Payouts Requests Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-extrabold text-base text-gray-900">Demandes de Reversement Vendeurs (Payouts)</h2>
            <p className="text-xs text-gray-500">Validation et règlement des soldes marchands</p>
          </div>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <Loader2 className="animate-spin text-emerald-600 w-8 h-8" />
          </div>
        ) : payouts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-5">Boutique Marchande</th>
                  <th className="py-3 px-5">Montant Demandé</th>
                  <th className="py-3 px-5">Moyen de Paiement</th>
                  <th className="py-3 px-5">Statut</th>
                  <th className="py-3 px-5 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {payouts.map((payout) => (
                  <tr key={payout.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-5">
                      <p className="font-bold text-gray-900">{payout.shop_name}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(payout.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </td>
                    <td className="py-3.5 px-5 font-black text-gray-900 text-sm">
                      {payout.amount.toLocaleString()} FCFA
                    </td>
                    <td className="py-3.5 px-5 font-bold text-gray-700">
                      {payout.payment_method}
                      {payout.reference_code && (
                        <span className="block text-[10px] font-mono text-gray-400">{payout.reference_code}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-5">
                      {payout.status === "processed" ? (
                        <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200">
                          Réglé ✅
                        </span>
                      ) : payout.status === "failed" ? (
                        <span className="bg-red-50 text-red-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-red-200">
                          Échoué ❌
                        </span>
                      ) : (
                        <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-amber-200 animate-pulse">
                          En Attente ⏳
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-5 text-center">
                      {payout.status === "pending" && (
                        <button
                          disabled={processingPayoutId === payout.id}
                          onClick={() => handleApprovePayout(payout.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          {processingPayoutId === payout.id ? "Traitement..." : "Valider Virement"}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="py-10 text-center text-xs text-gray-400 font-bold">
            Aucune demande de virement en attente actuellement.
          </div>
        )}
      </div>
    </main>
  );
}
