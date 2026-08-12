"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { DollarSign, TrendingUp, CreditCard, ArrowDownRight, Loader2, Sparkles } from "lucide-react";

export default function AdminFinancePage() {
  const [loading, setLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalSales: 0,
    commissionEarnings: 0, // 5% marketplace commission
    vendorPayoutsDue: 0, // 95% due to vendors
  });

  const fetchFinanceMetrics = async () => {
    try {
      const { data: orders } = await supabase
        .from("orders")
        .select("total_amount");

      if (orders) {
        const total = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        const commission = Math.round(total * 0.05); // 5% Kalagban commission
        const payouts = total - commission;

        setFinanceData({
          totalSales: total,
          commissionEarnings: commission,
          vendorPayoutsDue: payouts,
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
            <p className="text-xs text-gray-500 font-medium">Gestion du Chiffre d&apos;Affaires, commissions et versements vendeurs</p>
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
          <p className="text-[11px] font-bold text-gray-400">Total brut des transactions</p>
        </div>

        {/* Kalagban Commission (5%) */}
        <div className="bg-white p-6 rounded-3xl border border-emerald-100 shadow-xs space-y-3 relative overflow-hidden">
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Commissions Kalagban (5%)</span>
          <h3 className="text-2xl font-black text-emerald-600">
            {financeData.commissionEarnings.toLocaleString()} <span className="text-xs font-bold text-emerald-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
            <Sparkles size={12} /> Revenu net plateforme
          </p>
        </div>

        {/* Vendor Payouts (95%) */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-3">
          <span className="text-xs font-bold text-indigo-700 uppercase tracking-wider">Versements Vendeurs (95%)</span>
          <h3 className="text-2xl font-black text-indigo-600">
            {financeData.vendorPayoutsDue.toLocaleString()} <span className="text-xs font-bold text-indigo-400">FCFA</span>
          </h3>
          <p className="text-[11px] font-bold text-indigo-600">À reverser aux boutiques</p>
        </div>

      </div>

    </main>
  );
}
