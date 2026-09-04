"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  DollarSign, 
  Loader2, 
  Sparkles, 
  Receipt,
  Sliders,
} from "lucide-react";
import { calculateApplicationFee } from "@/lib/fee";

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
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalSales: 0,
    applicationFeeEarnings: 0,
    vendorPayoutsDue: 0,
    relayCommissionsDue: 0,
  });

  const [payouts, setPayouts] = useState<PayoutItem[]>([]);
  const [processingPayoutId, setProcessingPayoutId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    let isCancelled = false;

    const loadFinanceData = async () => {
      try {
        const { data: orders } = await supabase
          .from("orders")
          .select("id, total_amount, subtotal, application_fee, shipping_fee, status, delivery_type");

        if (isCancelled) return;

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

        const { data: payoutData } = await supabase
          .from("payouts")
          .select("*, shops(name)")
          .order("created_at", { ascending: false })
          .limit(20);

        if (isCancelled) return;

        if (payoutData) {
          const formatted: PayoutItem[] = payoutData.map((p: Record<string, unknown> & { id: string; shop_id: string; amount: number; status: "pending" | "processed" | "failed"; payment_method: string; created_at: string; reference_code?: string; shops?: { name?: string } | null }) => ({
            id: p.id,
            shop_id: p.shop_id,
            shop_name: p.shops?.name || "Boutique Partenaire",
            amount: p.amount,
            status: p.status,
            payment_method: p.payment_method,
            reference_code: p.reference_code,
            created_at: p.created_at,
          }));
          setPayouts(formatted);
        }
      } catch (err) {
        console.error("Error fetching finance metrics:", err);
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    };

    void loadFinanceData();

    const channel = supabase
      .channel("admin_finance_realtime_full")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        setRefreshTrigger((prev) => prev + 1);
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => {
        setRefreshTrigger((prev) => prev + 1);
      })
      .subscribe();

    return () => {
      isCancelled = true;
      supabase.removeChannel(channel);
    };
  }, [refreshTrigger]);

  const handleApprovePayout = async (payoutId: string) => {
    setProcessingPayoutId(payoutId);
    try {
      const timestamp = String(new Date().getTime()).slice(-6);
      const ref = `WAVE-PAY-${timestamp}`;
      await supabase
        .from("payouts")
        .update({
          status: "processed",
          reference_code: ref,
          processed_at: new Date().toISOString(),
        })
        .eq("id", payoutId);

      setRefreshTrigger((prev) => prev + 1);
    } catch (err) {
      console.error("Error approving payout:", err);
    } finally {
      setProcessingPayoutId(null);
    }
  };

  const [isExporting, setIsExporting] = useState(false);

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, created_at, customer_name, customer_phone, subtotal, application_fee, shipping_fee, total_amount, status, delivery_type, relay_status")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (!orders || orders.length === 0) {
        alert("Aucune donnée de commande à exporter.");
        return;
      }

      const headers = [
        "N° Commande",
        "Date de Création",
        "Nom Client",
        "Téléphone",
        "Sous-Total Articles (FCFA)",
        "Commission Plateforme (FCFA)",
        "Frais de Livraison (FCFA)",
        "Total Réglé (FCFA)",
        "Statut Commande",
        "Mode de Livraison",
        "Statut Relais"
      ];

      const csvRows = [headers.join(";")];

      orders.forEach((o) => {
        const row = [
          o.id.slice(0, 8).toUpperCase(),
          new Date(o.created_at).toLocaleString("fr-FR"),
          `"${(o.customer_name || "").replace(/"/g, '""')}"`,
          `"${(o.customer_phone || "").replace(/"/g, '""')}"`,
          o.subtotal || 0,
          o.application_fee || 0,
          o.shipping_fee || 0,
          o.total_amount || 0,
          o.status || "",
          o.delivery_type === "pickup_point" ? "Point Relais" : "Domicile",
          o.relay_status || ""
        ];
        csvRows.push(row.join(";"));
      });

      const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + encodeURIComponent(csvRows.join("\n"));
      const downloadAnchor = document.createElement("a");
      downloadAnchor.setAttribute("href", csvContent);
      downloadAnchor.setAttribute("download", `kalagban_comptabilite_export_${new Date().toISOString().slice(0, 10)}.csv`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      document.body.removeChild(downloadAnchor);
    } catch (err) {
      console.error("Erreur lors de l'export CSV:", err);
      alert("Erreur lors de la génération du fichier CSV.");
    } finally {
      setIsExporting(false);
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

        <div className="flex items-center gap-3">
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer disabled:opacity-50"
          >
            {isExporting ? <Loader2 size={16} className="animate-spin" /> : <Receipt size={16} />}
            <span>{isExporting ? "Export en cours..." : "Exporter CSV Comptabilité"}</span>
          </button>

          <Link
            href="/finance/pricing"
            className="bg-slate-900 hover:bg-black text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer"
          >
            <Sliders size={16} /> Configurer Tarifs &amp; Commissions
          </Link>
        </div>
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
