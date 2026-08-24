"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAdminAuth, ROLE_LABELS, AdminPermissions } from "@/lib/rbac";
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
  MapPin,
  Truck,
  Megaphone,
  BarChart3,
  FileText
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
  const { isSuperAdmin, hasPermission, role } = useAdminAuth();

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
    const timer = setTimeout(() => {
      fetchDashboardMetrics();
    }, 0);

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
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchDashboardMetrics]);

  const roleMeta = ROLE_LABELS[role] || ROLE_LABELS.moderator;

  // Define All Potential Quick Actions with their permission requirements
  const allQuickActions: Array<{
    title: string;
    description: string;
    href: string;
    icon: React.ComponentType<{ size?: number; className?: string }>;
    bgColor: string;
    textColor: string;
    permissionKey: keyof AdminPermissions;
  }> = [
    {
      title: "Boutiques & Vendeurs",
      description: "Validation des marchands, vérification KYC et suivi des créateurs.",
      href: "/shops",
      icon: Store,
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      permissionKey: "can_moderate_shops",
    },
    {
      title: "Modération des Produits",
      description: "Approbation, contrôle qualité et vérification des fiches catalogue.",
      href: "/products-moderation",
      icon: ShieldAlert,
      bgColor: "bg-blue-50",
      textColor: "text-blue-600",
      permissionKey: "can_moderate_products",
    },
    {
      title: "Supervision des Commandes",
      description: "Suivi des flux d'achats, expéditions et livraisons clients.",
      href: "/orders",
      icon: Package,
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      permissionKey: "can_view_orders",
    },
    {
      title: "Points Relais & Carte",
      description: "Supervision des stocks en relais, tournées et réseau de distribution.",
      href: "/relays",
      icon: MapPin,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      permissionKey: "can_view_relays",
    },
    {
      title: "Gestion des Livreurs",
      description: "Flotte opérationnelle, assignations et ramassages de colis.",
      href: "/couriers",
      icon: Truck,
      bgColor: "bg-orange-50",
      textColor: "text-orange-600",
      permissionKey: "can_view_couriers",
    },
    {
      title: "Incidents Logistiques",
      description: "Traitement des anomalies de livraison et réclamations terrain.",
      href: "/logistics/incidents",
      icon: AlertTriangle,
      bgColor: "bg-red-50",
      textColor: "text-red-600",
      permissionKey: "can_view_logistics_incidents",
    },
    {
      title: "Comptabilité & Trésorerie",
      description: "Suivi des commissions (5%), frais de service et virements Mobile Money.",
      href: "/finance",
      icon: DollarSign,
      bgColor: "bg-emerald-50",
      textColor: "text-emerald-600",
      permissionKey: "can_view_finance",
    },
    {
      title: "Support & Litiges",
      description: "Gestion des tickets d'aide, réclamations clients et assistance boutiques.",
      href: "/support",
      icon: Headphones,
      bgColor: "bg-teal-50",
      textColor: "text-teal-600",
      permissionKey: "can_view_support",
    },
    {
      title: "Marketing & Promotions",
      description: "Codes promos, campagnes de réduction et ventes flash.",
      href: "/marketing",
      icon: Megaphone,
      bgColor: "bg-pink-50",
      textColor: "text-pink-600",
      permissionKey: "can_manage_marketing",
    },
    {
      title: "Risques & Sécurité",
      description: "Détection des transactions suspectes et protection anti-fraude.",
      href: "/risk",
      icon: ShieldCheck,
      bgColor: "bg-amber-50",
      textColor: "text-amber-600",
      permissionKey: "can_view_risk",
    },
    {
      title: "Analytics & Rapports",
      description: "Statistiques détaillées de ventes, performance et métriques globales.",
      href: "/analytics",
      icon: BarChart3,
      bgColor: "bg-cyan-50",
      textColor: "text-cyan-600",
      permissionKey: "can_view_analytics",
    },
    {
      title: "Éditeur Visuel CMS",
      description: "Personnalisation visuelle de la page d'accueil, bannières et hero.",
      href: "/cms",
      icon: Palette,
      bgColor: "bg-indigo-50",
      textColor: "text-indigo-600",
      permissionKey: "can_edit_cms",
    },
    {
      title: "Gestion Équipe & RBAC",
      description: "Attribution des rôles, permissions et accès des collaborateurs.",
      href: "/team",
      icon: UserPlus,
      bgColor: "bg-purple-50",
      textColor: "text-purple-600",
      permissionKey: "can_manage_team",
    },
    {
      title: "Journal d'Audit",
      description: "Historique complet des actions administratives et de sécurité.",
      href: "/audit",
      icon: FileText,
      bgColor: "bg-slate-100",
      textColor: "text-slate-700",
      permissionKey: "can_manage_team",
    },
  ];

  // Filter actions visible for current user's role
  const visibleActions = allQuickActions.filter(a => isSuperAdmin || hasPermission(a.permissionKey));

  // Determine authorized visible alerts
  const showPayoutAlert = alerts.pendingPayouts > 0 && (isSuperAdmin || hasPermission("can_manage_payouts") || hasPermission("can_view_finance"));
  const showProductAlert = alerts.pendingProducts > 0 && (isSuperAdmin || hasPermission("can_moderate_products"));
  const showTicketAlert = alerts.openTickets > 0 && (isSuperAdmin || hasPermission("can_view_support"));
  const showIncidentAlert = alerts.openIncidents > 0 && (isSuperAdmin || hasPermission("can_view_logistics_incidents") || hasPermission("can_manage_logistics"));
  const hasAnyAlert = showPayoutAlert || showProductAlert || showTicketAlert || showIncidentAlert;

  const canSeeOrders = isSuperAdmin || hasPermission("can_view_orders");
  const canSeeFinance = isSuperAdmin || hasPermission("can_view_finance") || hasPermission("can_view_financial_analytics");
  const canSeeShops = isSuperAdmin || hasPermission("can_moderate_shops") || hasPermission("can_view_seller_analytics");
  const canSeeUsers = isSuperAdmin || hasPermission("can_manage_users") || hasPermission("can_manage_team");

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      
      {/* Top Banner with dynamic role identity */}
      <div className="bg-linear-to-r from-indigo-900 via-slate-900 to-purple-900 text-white rounded-3xl p-8 sm:p-10 shadow-xl relative overflow-hidden flex flex-col md:flex-row items-center justify-between gap-6 border border-indigo-800/50">
        <div className="relative z-10 space-y-2 max-w-xl">
          <span className="inline-flex items-center gap-1.5 bg-indigo-500/20 text-indigo-300 font-extrabold text-xs px-3 py-1 rounded-full border border-indigo-400/30">
            <Sparkles size={12} /> {roleMeta.label}
          </span>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
            {isSuperAdmin ? "Tableau de Bord Administrateur" : `Espace ${roleMeta.label.replace(/[^a-zA-ZÀ-ÿ\s/]/g, "").trim()}`}
          </h1>
          <p className="text-sm text-slate-300 font-medium leading-relaxed">
            {isSuperAdmin 
              ? "Supervision globale, gestion de l'équipe, modération des boutiques et édition visuelle en temps réel."
              : roleMeta.description}
          </p>
        </div>

        {(isSuperAdmin || hasPermission("can_edit_cms")) && (
          <div className="flex items-center gap-3 z-10 shrink-0">
            <Link
              href="/cms"
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer"
            >
              <Palette size={16} /> Éditeur Visuel CMS
            </Link>
          </div>
        )}
      </div>

      {/* Overview Stat Cards Grid - Filtered strictly by permissions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* Stat 1: Total Revenue (Only for Finance & Super Admin) */}
        {canSeeFinance && (
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
        )}

        {/* Stat 2: Orders Count */}
        {canSeeOrders && (
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
                Supervision des flux d&apos;achats
              </p>
            </div>
          </div>
        )}

        {/* Stat 3: Active Shops */}
        {canSeeShops && (
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
                Commerçants et créateurs vérifiés
              </p>
            </div>
          </div>
        )}

        {/* Stat: Products pending review (for Seller Managers & Moderators) */}
        {(hasPermission("can_moderate_products") || hasPermission("can_moderate_shops")) && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Modération Produits</span>
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center font-black">
                <ShieldAlert size={20} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {alerts.pendingProducts} <span className="text-xs font-bold text-gray-400">en attente</span>
              </h3>
              <p className="text-[11px] font-bold text-blue-600 mt-1">
                Contrôle qualité &amp; conformité
              </p>
            </div>
          </div>
        )}

        {/* Stat: Support Tickets (if user is support or super admin) */}
        {hasPermission("can_view_support") && !canSeeFinance && (
          <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Tickets Support</span>
              <div className="w-10 h-10 bg-teal-50 text-teal-600 rounded-xl flex items-center justify-center font-black">
                <Headphones size={20} />
              </div>
            </div>
            <div>
              <h3 className="text-2xl font-black text-gray-900 tracking-tight">
                {alerts.openTickets} <span className="text-xs font-bold text-gray-400">ouvert(s)</span>
              </h3>
              <p className="text-[11px] font-bold text-teal-600 mt-1">
                Assistance acheteurs &amp; vendeurs
              </p>
            </div>
          </div>
        )}

        {/* Stat 4: Registered Users (Super Admin only) */}
        {canSeeUsers && (
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
        )}

      </div>

      {/* Actionable Alerts & Pending Interventions - Scoped to role */}
      {hasAnyAlert && (
        <div className="bg-amber-50/80 border border-amber-200/80 rounded-3xl p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-amber-500 text-white flex items-center justify-center font-black shadow-md shadow-amber-500/20">
                <Bell size={18} className="animate-bounce" />
              </div>
              <div>
                <h3 className="text-sm font-black text-amber-950">Actions &amp; Demandes en Attente d&apos;Intervention</h3>
                <p className="text-xs text-amber-800/80 font-medium">Les éléments suivants nécessitent l&apos;intervention de votre rôle.</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {showPayoutAlert && (
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

            {showProductAlert && (
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

            {showTicketAlert && (
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

            {showIncidentAlert && (
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

      {/* Quick Action Navigation Modules - Strictly filtered by granted permissions */}
      {visibleActions.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-black text-gray-900">Raccourcis &amp; Espaces de Gestion</h2>
            <span className="text-xs text-gray-400 font-bold">{visibleActions.length} module(s) accessible(s)</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {visibleActions.map((action, idx) => {
              const Icon = action.icon;
              return (
                <Link
                  key={idx}
                  href={action.href}
                  className="bg-white hover:bg-indigo-50/40 p-6 rounded-3xl border border-gray-100 hover:border-indigo-200 shadow-xs transition-all flex flex-col justify-between gap-4 group cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className={`w-12 h-12 ${action.bgColor} ${action.textColor} rounded-2xl flex items-center justify-center font-black`}>
                      <Icon size={24} />
                    </div>
                    <ArrowUpRight size={20} className="text-gray-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-gray-900 group-hover:text-indigo-600 transition-colors">{action.title}</h3>
                    <p className="text-xs text-gray-500 font-medium mt-1">{action.description}</p>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* Split Feeds: Recent Orders (if permitted) & Live Notifications */}
      <div className={`grid gap-6 items-start ${canSeeOrders ? "grid-cols-1 lg:grid-cols-2" : "grid-cols-1"}`}>
        
        {/* Feed 1: Recent Orders (Rendered only if permitted) */}
        {canSeeOrders && (
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
        )}

        {/* Feed 2: Live Notifications & Demandes */}
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
            {hasPermission("can_send_notifications") && (
              <Link href="/notifications" className="text-xs font-bold text-amber-700 hover:underline">
                Centre de notifs →
              </Link>
            )}
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
