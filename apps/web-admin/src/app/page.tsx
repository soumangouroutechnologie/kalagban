"use client";

import React, { useState, useEffect, useCallback } from "react";
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
  Sparkles,
  AlertTriangle,
  Headphones,
  ShieldAlert,
  ArrowRight,
  Bell,
  Clock,
  MessageSquare
} from "lucide-react";

interface OrderSummary {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address?: { full_name?: string; city?: string };
}

interface AdminNotifItem {
  id: string;
  title: string;
  message: string;
  target_group?: string;
  notification_type?: string;
  created_at: string;
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalOrders: 0,
    activeShops: 0,
    totalBuyers: 0,
  });
  const [alerts, setAlerts] = useState({
    pendingPayouts: 0,
    pendingProducts: 0,
    openTickets: 0,
    openIncidents: 0,
  });
  const [recentOrders, setRecentOrders] = useState<OrderSummary[]>([]);
  const [recentNotifs, setRecentNotifs] = useState<AdminNotifItem[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardMetrics = useCallback(async () => {
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

      // 4. Actionable Alerts (Payouts, Moderation, Tickets, Incidents)
      const [
        { count: payCount },
        { count: prodCount },
        { count: ticketCount },
        { count: incidentCount }
      ] = await Promise.all([
        supabase.from("payouts").select("*", { count: "exact", head: true }).eq("status", "pending"),
        supabase.from("products").select("*", { count: "exact", head: true }).eq("moderation_status", "pending_review"),
        supabase.from("support_tickets").select("*", { count: "exact", head: true }).eq("status", "open"),
        supabase.from("logistics_incidents").select("*", { count: "exact", head: true }).eq("status", "open"),
      ]);

      setAlerts({
        pendingPayouts: payCount || 0,
        pendingProducts: prodCount || 0,
        openTickets: ticketCount || 0,
        openIncidents: incidentCount || 0,
      });

      // 5. Recent Admin Notifications (Feed)
      const { data: notifData } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(6);

      if (notifData) {
        setRecentNotifs(notifData as AdminNotifItem[]);
      }

    } catch (err) {
      console.error("Error fetching admin dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboardMetrics();

    // Supabase Live Realtime Subscription
    const channel = supabase
      .channel("admin_dashboard_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "shops" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "logistics_incidents" }, () => fetchDashboardMetrics())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications" }, () => fetchDashboardMetrics())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardMetrics]);

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

        {/* Stat 4: Registered Users & Buyers */}
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Comptes Utilisateurs</span>
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center font-black">
              <Users size={20} />
            </div>
          </div>
          <div>
            <h3 className="text-2xl font-black text-gray-900 tracking-tight">
              {stats.totalBuyers + stats.activeShops} <span className="text-xs font-bold text-gray-400">compte(s)</span>
            </h3>
            <p className="text-[11px] font-bold text-amber-600 mt-1">
              {stats.totalBuyers} acheteur(s) · {stats.activeShops} boutique(s)
            </p>
          </div>
        </div>

      </div>

      {/* Actionable Alerts & Pending Interventions */}
      {(alerts.pendingPayouts > 0 || alerts.pendingProducts > 0 || alerts.openTickets > 0 || alerts.openIncidents > 0) && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <Bell size={18} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">Actions &amp; Demandes en Attente d&apos;Intervention</h3>
                <p className="text-xs text-amber-800/80 font-medium">Les éléments suivants nécessitent l&apos;attention de l&apos;équipe de gestion.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {alerts.pendingPayouts > 0 && (
              <Link
                href="/finance"
                className="bg-white hover:bg-emerald-50/60 p-4 rounded-2xl border border-amber-200/80 hover:border-emerald-300 flex items-center justify-between group transition-all shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black">
                    <DollarSign size={16} />
                  </div>
                  <div>
                    <span className="block font-black text-xs text-gray-900 group-hover:text-emerald-700">
                      {alerts.pendingPayouts} Virement(s)
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">En attente de règlement</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-emerald-700 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {alerts.pendingProducts > 0 && (
              <Link
                href="/products-moderation"
                className="bg-white hover:bg-blue-50/60 p-4 rounded-2xl border border-amber-200/80 hover:border-blue-300 flex items-center justify-between group transition-all shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-black">
                    <ShieldAlert size={16} />
                  </div>
                  <div>
                    <span className="block font-black text-xs text-gray-900 group-hover:text-blue-700">
                      {alerts.pendingProducts} Produit(s)
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">En attente de modération</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-blue-700 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {alerts.openTickets > 0 && (
              <Link
                href="/support"
                className="bg-white hover:bg-indigo-50/60 p-4 rounded-2xl border border-amber-200/80 hover:border-indigo-300 flex items-center justify-between group transition-all shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-black">
                    <Headphones size={16} />
                  </div>
                  <div>
                    <span className="block font-black text-xs text-gray-900 group-hover:text-indigo-700">
                      {alerts.openTickets} Ticket(s) Support
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">Clients &amp; Vendeurs</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}

            {alerts.openIncidents > 0 && (
              <Link
                href="/logistics/incidents"
                className="bg-white hover:bg-red-50/60 p-4 rounded-2xl border border-amber-200/80 hover:border-red-300 flex items-center justify-between group transition-all shadow-xs cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-red-100 text-red-700 flex items-center justify-center font-black">
                    <AlertTriangle size={16} />
                  </div>
                  <div>
                    <span className="block font-black text-xs text-gray-900 group-hover:text-red-700">
                      {alerts.openIncidents} Incident(s)
                    </span>
                    <span className="text-[10px] text-gray-500 font-medium">Flotte &amp; Colis</span>
                  </div>
                </div>
                <ArrowRight size={14} className="text-gray-400 group-hover:text-red-700 group-hover:translate-x-0.5 transition-transform" />
              </Link>
            )}
          </div>
        </div>
      )}

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

      {/* Split Feeds: Recent Orders & Live Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        
        {/* Feed 1: Recent Orders */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                <Package size={18} />
              </div>
              <h2 className="text-base font-black text-gray-900">Commandes Récentes</h2>
            </div>
            <Link href="/orders" className="text-xs font-bold text-indigo-600 hover:underline">
              Voir tout →
            </Link>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center flex-1">
              <Loader2 className="animate-spin text-indigo-600 w-8 h-8 mb-2" />
              <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des commandes...</p>
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="p-10 text-center text-xs font-medium text-gray-400 flex-1 flex items-center justify-center">
              Aucune commande enregistrée pour le moment.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 flex-1">
              {recentOrders.map((order) => (
                <div key={order.id} className="p-5 flex items-center justify-between gap-4 text-xs hover:bg-slate-50/50 transition-colors">
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

        {/* Feed 2: Live Notifications & Demandes Vendeurs/Clients */}
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden flex flex-col h-full">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold">
                <Bell size={18} />
              </div>
              <div>
                <h2 className="text-base font-black text-gray-900">Flux des Notifications &amp; Demandes</h2>
              </div>
            </div>
            <Link href="/notifications" className="text-xs font-bold text-amber-700 hover:underline">
              Centre de notifs →
            </Link>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center flex-1">
              <Loader2 className="animate-spin text-amber-600 w-8 h-8 mb-2" />
              <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des notifications...</p>
            </div>
          ) : recentNotifs.length === 0 ? (
            <div className="p-10 text-center text-xs font-medium text-gray-400 flex-1 flex items-center justify-center">
              Aucune notification récente sur la plateforme.
            </div>
          ) : (
            <div className="divide-y divide-gray-100 flex-1">
              {recentNotifs.map((notif) => {
                const isPayout = notif.title?.toLowerCase().includes("virement") || notif.title?.toLowerCase().includes("retrait");
                const isSupport = notif.title?.toLowerCase().includes("ticket") || notif.title?.toLowerCase().includes("support");
                const isKyc = notif.title?.toLowerCase().includes("kyc") || notif.title?.toLowerCase().includes("boutique");

                const targetLink = isPayout ? "/finance" : isSupport ? "/support" : isKyc ? "/shops" : "/notifications";

                return (
                  <Link 
                    key={notif.id} 
                    href={targetLink}
                    className="p-5 flex items-start justify-between gap-4 text-xs hover:bg-amber-50/30 transition-colors group cursor-pointer"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-xl shrink-0 flex items-center justify-center mt-0.5 ${
                        isPayout 
                          ? "bg-emerald-100 text-emerald-700" 
                          : isSupport 
                            ? "bg-indigo-100 text-indigo-700" 
                            : "bg-amber-100 text-amber-700"
                      }`}>
                        {isPayout ? <DollarSign size={15} /> : isSupport ? <Headphones size={15} /> : <Bell size={15} />}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-gray-900 group-hover:text-indigo-600 transition-colors">
                          {notif.title}
                        </h4>
                        <p className="text-gray-500 font-medium text-[11px] mt-0.5 line-clamp-2">
                          {notif.message}
                        </p>
                        <span className="inline-flex items-center gap-1 text-[10px] text-gray-400 font-medium mt-1">
                          <Clock size={10} />
                          {new Date(notif.created_at).toLocaleString("fr-FR", {
                            day: "2-digit",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit"
                          })}
                        </span>
                      </div>
                    </div>

                    <ArrowRight size={14} className="text-gray-300 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>

      </div>

    </main>
  );
}
