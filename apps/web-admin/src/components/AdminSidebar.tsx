"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  MapPin, 
  Truck, 
  AlertTriangle, 
  ShieldAlert, 
  Store, 
  Package, 
  DollarSign, 
  Sliders, 
  Megaphone, 
  Headphones, 
  ShieldCheck, 
  BarChart3, 
  Bell, 
  FileText, 
  Palette, 
  Users, 
  UserCheck, 
  LogOut, 
  Menu, 
  X,
  Sparkles,
  ChevronDown
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth, ROLE_LABELS, AdminPermissions } from "@/lib/rbac";

interface NavGroup {
  groupTitle: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
    permissionKey: keyof AdminPermissions;
    badge?: number;
  }[];
}

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, role, hasPermission, loading, isSuperAdmin } = useAdminAuth();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [openIncidentsCount, setOpenIncidentsCount] = useState(0);
  const [openTicketsCount, setOpenTicketsCount] = useState(0);
  const [pendingPayoutsCount, setPendingPayoutsCount] = useState(0);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState(0);

  useEffect(() => {
    const fetchCounters = async () => {
      // Pending products
      const { count: prodCount } = await supabase
        .from("products")
        .select("*", { count: "exact", head: true })
        .eq("moderation_status", "pending_review");
      setPendingCount(prodCount || 0);

      // Open logistics incidents
      const { count: incCount } = await supabase
        .from("logistics_incidents")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      setOpenIncidentsCount(incCount || 0);

      // Open support tickets
      const { count: tickCount } = await supabase
        .from("support_tickets")
        .select("*", { count: "exact", head: true })
        .eq("status", "open");
      setOpenTicketsCount(tickCount || 0);

      // Pending seller payouts
      const { count: payCount } = await supabase
        .from("payouts")
        .select("*", { count: "exact", head: true })
        .eq("status", "pending");
      setPendingPayoutsCount(payCount || 0);

      // Admin notifications count
      const { count: notifCount } = await supabase
        .from("admin_notifications")
        .select("*", { count: "exact", head: true });
      setUnreadNotifsCount(notifCount || 0);
    };

    fetchCounters();

    const channelId = `sidebar_counters_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => fetchCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "logistics_incidents" }, () => fetchCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => fetchCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "payouts" }, () => fetchCounters())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications" }, () => fetchCounters())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navGroups: NavGroup[] = [
    {
      groupTitle: "Vue Globale",
      items: [
        { label: "Tableau de Bord", href: "/", icon: LayoutDashboard, permissionKey: "can_view_analytics" },
      ],
    },
    {
      groupTitle: "🚚 Logistique & Flotte",
      items: [
        { label: "Points Relais & Carte", href: "/relays", icon: MapPin, permissionKey: "can_view_relays" },
        { label: "Gestion des Livreurs", href: "/couriers", icon: Truck, permissionKey: "can_view_couriers" },
        { label: "Incidents Logistiques", href: "/logistics/incidents", icon: AlertTriangle, permissionKey: "can_view_logistics_incidents", badge: openIncidentsCount },
      ],
    },
    {
      groupTitle: "🛍️ Commerce & Catalogue",
      items: [
        { label: "Modération Produits", href: "/products-moderation", icon: ShieldAlert, permissionKey: "can_moderate_products", badge: pendingCount },
        { label: "Boutiques & Vendeurs", href: "/shops", icon: Store, permissionKey: "can_moderate_shops" },
        { label: "Supervision Commandes", href: "/orders", icon: Package, permissionKey: "can_view_orders" },
      ],
    },
    {
      groupTitle: "💰 Finances & Tarification",
      items: [
        { label: "Comptabilité & Finances", href: "/finance", icon: DollarSign, permissionKey: "can_view_finance", badge: pendingPayoutsCount },
        { label: "Tarification & Commissions", href: "/finance/pricing", icon: Sliders, permissionKey: "can_manage_commissions" },
      ],
    },
    {
      groupTitle: "📣 Marketing & Support",
      items: [
        { label: "Marketing & Promotions", href: "/marketing", icon: Megaphone, permissionKey: "can_manage_marketing" },
        { label: "Support & Litiges", href: "/support", icon: Headphones, permissionKey: "can_view_support", badge: openTicketsCount },
      ],
    },
    {
      groupTitle: "🛡️ Risques & Analytics",
      items: [
        { label: "Risques & Sécurité", href: "/risk", icon: ShieldCheck, permissionKey: "can_view_risk" },
        { label: "Analytics & Rapports", href: "/analytics", icon: BarChart3, permissionKey: "can_view_analytics" },
        { label: "Notifications", href: "/notifications", icon: Bell, permissionKey: "can_send_notifications", badge: unreadNotifsCount },
      ],
    },
    {
      groupTitle: "⚙️ Pilotage & Système",
      items: [
        { label: "Journal d'Audit", href: "/audit", icon: FileText, permissionKey: "can_manage_team" },
        { label: "Éditeur Visuel CMS", href: "/cms", icon: Palette, permissionKey: "can_edit_cms" },
        { label: "Gestion Équipe & RBAC", href: "/team", icon: Users, permissionKey: "can_manage_team" },
        { label: "Utilisateurs & Profils", href: "/users", icon: UserCheck, permissionKey: "can_view_users" },
      ],
    },
  ];

  const roleMeta = ROLE_LABELS[role] || ROLE_LABELS.moderator;

  return (
    <>
      {/* Mobile Top Bar */}
      <div className="lg:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-40 shadow-md w-full">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-xl flex items-center justify-center font-black text-sm">
            K
          </div>
          <span className="font-extrabold text-base tracking-tight">Kalagban Admin</span>
        </div>

        <button 
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-gray-300 hover:text-white cursor-pointer"
        >
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar Desktop & Overlay Mobile */}
      <aside 
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg text-white shadow-md shadow-indigo-500/20">
              K
            </div>
            <div>
              <div className="font-black text-base tracking-tight leading-none text-white">
                Kalagban
              </div>
              <div className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider mt-1 flex items-center gap-1">
                <Sparkles size={10} /> Back-Office RBAC
              </div>
            </div>
          </Link>

          <button 
            onClick={() => setMobileMenuOpen(false)}
            className="lg:hidden text-gray-400 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-3 my-3 bg-slate-800/80 rounded-2xl border border-slate-700/60 shadow-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-black text-xs flex items-center justify-center shrink-0">
              {user?.full_name?.charAt(0) || "A"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate">{user?.full_name || "Admin Kalagban"}</p>
              <span className="inline-block mt-0.5 text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-900 text-indigo-300 border border-slate-700 truncate max-w-full">
                {roleMeta.label}
              </span>
            </div>
          </div>
        </div>

        {/* Navigation Groups */}
        <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-5 scrollbar-thin scrollbar-thumb-slate-800">
          {navGroups.map((group, gIdx) => {
            const visibleItems = group.items.filter(item => isSuperAdmin || hasPermission(item.permissionKey));
            if (visibleItems.length === 0) return null;

            return (
              <div key={gIdx} className="space-y-1">
                <p className="px-3 text-[10px] font-black text-slate-400 uppercase tracking-wider">
                  {group.groupTitle}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold transition-all group ${
                          isActive
                            ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold"
                            : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon size={16} className={isActive ? "text-white" : "text-slate-400 group-hover:text-white"} />
                          <span className="truncate">{item.label}</span>
                        </div>

                        {item.badge !== undefined && item.badge > 0 && (
                          <span className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                            isActive ? "bg-white text-indigo-600" : "bg-red-500 text-white animate-pulse"
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        {/* Footer Logout */}
        <div className="p-3 border-t border-slate-800">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-bold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors cursor-pointer"
          >
            <LogOut size={16} />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Logout Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-gray-100 text-slate-900">
            <h3 className="font-black text-lg">Confirmer la déconnexion ?</h3>
            <p className="text-xs text-gray-500">Vous allez être redirigé vers l&apos;écran d&apos;authentification de Kalagban Admin.</p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer text-gray-700"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors cursor-pointer shadow-sm"
              >
                Se Déconnecter
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Backdrop for mobile */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/60 z-40 lg:hidden backdrop-blur-xs"
        />
      )}
    </>
  );
}
