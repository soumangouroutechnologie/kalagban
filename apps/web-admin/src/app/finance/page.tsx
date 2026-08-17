"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, TrendingUp, CreditCard, ArrowDownRight, Loader2, Sparkles, Receipt } from "lucide-react";
import { calculateApplicationFee } from "@/lib/fee";

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalSales: 0,
    applicationFeeEarnings: 0, // Sum of exact application fees
    vendorPayoutsDue: 0, // Sum of product subtotals for sellers
  });

  const fetchFinanceMetrics = async () => {
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount, subtotal, application_fee, shipping_fee, status");

      if (orders) {
        let total = 0;
        let fees = 0;
        let vendorSubtotals = 0;

        orders.forEach(o => {
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
          }
        });

        setFinanceData({
          totalSales: total,
          applicationFeeEarnings: fees,
          vendorPayoutsDue: vendorSubtotals,
        });
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
      .channel("admin_finance_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchFinanceMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
            <DollarSign size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Comptabilité &amp; Finances</h1>
            <p className="text-xs text-gray-500 font-medium">Gestion du Chiffre d&apos;Affaires, frais d&apos;application plateforme et versements vendeurs</p>
          </div>
        </div>
      </div>

      {/* Finance Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        
        {/* Total Sales */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Volume Total des Ventes</span>
          <h3 className="text-2xl font-black text-gray-900">
            {financeData.totalSales.toLocaleString()} <span className="text-xs font-bold text-gray-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-gray-400">Total brut payé par les acheteurs</p>
        </div>

        {/* Kalagban Application Fees */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-3 relative overflow-hidden">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Frais d&apos;Application Kalagban</span>
          <h3 className="text-2xl font-black text-emerald-600">
            {financeData.applicationFeeEarnings.toLocaleString()} <span className="text-xs font-bold text-emerald-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <Sparkles size={12} /> Revenu net plateforme (Barème officiel)
          </p>
        </div>

        {/* Vendor Payouts */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Part Vendeurs (Sous-total Ventes)</span>
          <h3 className="text-2xl font-black text-indigo-600">
            {financeData.vendorPayoutsDue.toLocaleString()} <span className="text-xs font-bold text-indigo-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-indigo-600">Montant total net dû aux boutiques</p>
        </div>

      </div>

    </main>
  );
}
