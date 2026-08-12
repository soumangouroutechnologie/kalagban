"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  DollarSign, 
  Package, 
  Store, 
  Users, 
  Palette, 
  UserPlus, 
  ShieldCheck, 
  TrendingUp, 
  Loader2, 
  ArrowUpRight,
  Sparkles
} from "lucide-react";

interface OrderSummary {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address?: { full_name?: string; city?: string };
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeShops: 0,
    totalBuyers: 0,
  });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardMetrics = async () => {
    try {
      // 1. Orders & Revenue
      const { data: orders } = await supabase
        .from("orders")
        .select("id, total_amount, status, created_at, shipping_address")
        .order("created_at", { ascending: false });

      if (orders) {
        const revenue = orders.reduce((sum, o) => sum + (Number(o.total_amount) || 0), 0);
        setStats(prev => ({
          ...prev,
          totalRevenue: revenue,
          totalOrders: orders.length,
        }));
        setRecentOrders(orders.slice(0, 5) as OrderSummary[]);
      }

      // 2. Shops
      const { data: shops } = await supabase
        .from("shops")
        .select("id")
        .eq("status", "active");

      if (shops) {
        setStats(prev => ({ ...prev, activeShops: shops.length }));
      }

      // 3. Profiles / Buyers
      const { data: profiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("role", "buyer");

      if (profiles) {
        setStats(prev => ({ ...prev, totalBuyers: profiles.length }));
      }

    } catch (err) {
      console.error("Error fetching admin dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardMetrics();

    // Supabase Live Realtime Subscription
    const channel = supabase
      .channel("admin_dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "shops" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchDashboardMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      
      {/* Top Banner */}
      <div className="bg-linear-to-r from-indigo-900 via-slate-900 to-purple-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-800/50">
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 font-extrabold text-xs px-3 py-1 rounded-full border border-indigo-400/30">
            <Sparkles size={12} /> Bienvenue sur le Back-Office Kalagban
          </span>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
            Tableau de Bord Administrateur
          </h1>
          <p className="text-sm text-slate-300 font-medium leading-relaxed">
            Supervision globale, gestion de l&apos;équipe, modération des boutiques et édition visuelle en temps réel.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 shrink-0">
          <Link
            href="/cms"
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
          >
            <Palette size={16} /> Éditeur Visuel CMS
          </Link>
        </div>
      </div>

      {/* Overview Stat Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Stat 1: Total Revenue */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Chiffre d&apos;Affaires</span>
            <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center font-black">
              <DollarSign size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.totalRevenue.toLocaleString()} <span className="text-xs font-bold text-gray-400">FCFA</span>
            </h3>
            <p className="text-[11px] font-bold text-emerald-600 flex items-center gap-1 mt-1">
              <TrendingUp size={12} /> Volume total des ventes
            </p>
          </div>
        </div>

        {/* Stat 2: Orders Count */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Commandes Client</span>
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black">
              <Package size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.totalOrders} <span className="text-xs font-bold text-gray-400">commande(s)</span>
            </h3>
            <p className="text-[11px] font-bold text-indigo-600 mt-1">
              Supervision inter-boutiques
            </p>
          </div>
        </div>

        {/* Stat 3: Active Shops */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Boutiques Actives</span>
            <div className="w-10 h-10 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center font-black">
              <Store size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.activeShops} <span className="text-xs font-bold text-gray-400">boutique(s)</span>
            </h3>
            <p className="text-[11px] font-bold text-purple-600 mt-1">
              Commerçants certifiés
            </p>
          </div>
        </div>

        {/* Stat 4: Registered Buyers */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Acheteurs Inscrites</span>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black">
              <Users size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.totalBuyers} <span className="text-xs font-bold text-gray-400">client(s)</span>
            </h3>
            <p className="text-[11px] font-bold text-amber-600 mt-1">
              Comptes acheteurs actifs
            </p>
          </div>
        </div>

      </div>

      {/* Quick Action Navigation Modules */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        <Link
          href="/cms"
          className="bg-white hover:bg-indigo-50/40 p-6 rounded-3xl border border-gray-100 hover:border-indigo-200 shadow-xs transition-all flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
              <Palette size={24} />
            </div>
            <ArrowUpRight size={20} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 group-hover:text-indigo-600 transition-colors">Éditeur Visuel CMS</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Modifiez les bannières, le hero et le footer en direct sans toucher au code.</p>
          </div>
        </Link>

        <Link
          href="/team"
          className="bg-white hover:bg-indigo-50/40 p-6 rounded-3xl border border-gray-100 hover:border-indigo-200 shadow-xs transition-all flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-2xl flex items-center justify-center font-black">
              <UserPlus size={24} />
            </div>
            <ArrowUpRight size={20} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 group-hover:text-indigo-600 transition-colors">Gestion Équipe &amp; RBAC</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Attribuez des rôles (Super Admin, Ingénieur, Comptable, Modérateur).</p>
          </div>
        </Link>

        <Link
          href="/shops"
          className="bg-white hover:bg-indigo-50/40 p-6 rounded-3xl border border-gray-100 hover:border-indigo-200 shadow-xs transition-all flex flex-col justify-between gap-4 group"
        >
          <div className="flex items-center justify-between">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
              <ShieldCheck size={24} />
            </div>
            <ArrowUpRight size={20} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
          </div>
          <div>
            <h3 className="text-base font-black text-gray-900 group-hover:text-indigo-600 transition-colors">Modération des Boutiques</h3>
            <p className="text-xs text-gray-500 font-medium mt-1">Approuvez, certifiez ou suspendez les boutiques des vendeurs.</p>
          </div>
        </Link>

      </div>

      {/* Recent Orders Feed */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-black text-gray-900">Commandes Récentes sur la Plateforme</h2>
          <Link href="/orders" className="text-xs font-bold text-indigo-600 hover:underline">
            Voir tout →
          </Link>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-8 h-8 mb-2" />
            <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des données...</p>
          </div>
        ) : recentOrders.length === 0 ? (
          <div className="p-10 text-center text-xs font-medium text-gray-400">
            Aucune commande enregistrée pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {recentOrders.map((order) => (
              <div key={order.id} className="p-5 flex items-center justify-between gap-4 text-xs">
                <div>
                  <span className="font-mono font-bold text-gray-800">#{order.id.slice(0, 8)}</span>
                  <p className="text-gray-500 font-medium mt-0.5">
                    {order.shipping_address?.full_name || "Client Kalagban"} — {order.shipping_address?.city || "Abidjan"}
                  </p>
                </div>

                <div className="text-right">
                  <span className="font-black text-gray-900">{Number(order.total_amount).toLocaleString()} FCFA</span>
                  <p className="text-[10px] font-bold text-indigo-600 mt-0.5 uppercase tracking-wider">{order.status}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
