"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Building2, 
  PackageCheck, 
  Boxes, 
  Wallet, 
  Settings, 
  LogOut, 
  ShieldCheck,
  Bell,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Info,
  Package
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

export default function RelayDashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [relayCode, setRelayCode] = useState("");
  
  // Notification states
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("kalagban_relay_code");
    if (!saved) {
      router.push("/login");
      return;
    }

    const verifyRelaySession = async () => {
      const { data: relayPoint, error } = await supabase
        .from("pickup_points")
        .select("*")
        .eq("code", saved)
        .maybeSingle();

      if (error || !relayPoint) {
        localStorage.removeItem("kalagban_relay_code");
        router.push("/login");
        return;
      }

      if (relayPoint.status === "suspended") {
        localStorage.removeItem("kalagban_relay_code");
        router.push("/login");
        return;
      }

      if (relayPoint) {
        setRelayCode(relayPoint.code);
        fetchNotifications(relayPoint.id);
      }
    };

    // Fetch notifications from Supabase ONLY for THIS relay point
    const fetchNotifications = async (pointId?: string) => {
      let query = supabase
        .from("relay_notifications")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (pointId) {
        query = query.or(`pickup_point_id.eq.${pointId},pickup_point_id.is.null`);
      }

      const { data } = await query;

      if (data && data.length > 0) {
        setNotifications(data);
      } else {
        setNotifications([
          {
            id: "notif-1",
            title: "Bienvenue sur le Portail Relais",
            message: "Votre espace est actif et synchronisé en temps réel avec le siège Kalagban.",
            type: "info",
            is_read: false,
            created_at: "À l'instant"
          }
        ]);
      }
    };

    verifyRelaySession();

    const channel = supabase
      .channel("relay_notifications_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "relay_notifications" }, () => {
        fetchNotifications();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_points" }, () => {
        verifyRelaySession();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [router]);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from("relay_notifications")
      .update({ is_read: true })
      .eq("is_read", false);
  };

  const handleLogout = () => {
    localStorage.removeItem("kalagban_relay_code");
    router.push("/login");
  };

  const navigation = [
    { name: "Tableau de bord", href: "/", icon: PackageCheck },
    { name: "Mes Colis en Étagère", href: "/packages", icon: Boxes },
    { name: "Commissions & Retraits", href: "/earnings", icon: Wallet },
    { name: "Paramètres Point Relais", href: "/settings", icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col md:flex-row font-sans text-gray-900">
      {/* Sidebar navigation */}
      <aside className="w-full md:w-64 bg-white border-r border-gray-100 flex flex-col justify-between shrink-0 shadow-xs z-20">
        <div>
          {/* Header Logo & Branding */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-linear-to-br from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-600/30">
                K
              </div>
              <div>
                <div className="flex items-center space-x-1.5">
                  <span className="text-lg font-black tracking-tight text-gray-900">Kalagban</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">Relais</span>
                </div>
                <p className="text-[11px] font-mono font-semibold text-gray-500">{relayCode || "Session Relais"}</p>
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5">
            {navigation.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-2xl font-bold text-sm transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/25"
                      : "text-gray-500 hover:text-gray-900 hover:bg-gray-50"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${isActive ? "text-white" : "text-gray-400"}`} />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Support & Status */}
        <div className="p-4 border-t border-gray-100 space-y-4">
          <div className="bg-linear-to-br from-indigo-600 to-violet-600 rounded-2xl p-4 text-white space-y-2 shadow-lg shadow-indigo-600/20">
            <div className="flex items-center space-x-2 text-xs font-bold text-white/90">
              <HelpCircle className="w-4 h-4 text-amber-300" />
              <span>Assistance Relais</span>
            </div>
            <p className="text-[11px] text-white/80 leading-relaxed font-medium">Un souci avec un dépôt ou un code OTP ?</p>
            <a 
              href="https://wa.me/2250700000000" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block w-full py-2 bg-white text-indigo-700 font-bold text-xs rounded-xl text-center shadow-xs hover:bg-indigo-50 transition-colors"
            >
              Support Kalagban 24/7
            </a>
          </div>

          <div className="bg-emerald-50 border border-emerald-100 rounded-xl p-3 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
              <span className="text-xs font-bold text-emerald-800">Point Relais Actif</span>
            </div>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="flex items-center space-x-3 px-4 py-2.5 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition-colors w-full cursor-pointer"
          >
            <LogOut className="w-4 h-4 text-red-500" />
            <span>Déconnexion</span>
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-x-hidden">
        {/* Top Navbar */}
        <header className="h-16 bg-white/80 border-b border-gray-100 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30 shadow-xs">
          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
              ● Partenaire Certifié Kalagban
            </span>
          </div>

          <div className="flex items-center space-x-4 relative">
            {/* Notification Bell Icon */}
            <div className="relative">
              <button 
                onClick={() => setShowNotifications(!showNotifications)}
                className="relative p-2.5 rounded-xl bg-gray-50 border border-gray-200 text-gray-500 hover:text-gray-900 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown Modal */}
              {showNotifications && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl border border-gray-100 shadow-2xl p-5 z-50 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-gray-900">Notifications Relais</h4>
                      {unreadCount > 0 && (
                        <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 font-bold text-[10px] rounded-full">
                          {unreadCount} nouvelle(s)
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllRead}
                        className="text-[11px] font-bold text-indigo-600 hover:underline"
                      >
                        Tout marquer comme lu
                      </button>
                    )}
                  </div>

                  <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-3.5 rounded-2xl border transition-all ${
                          notif.is_read ? "bg-gray-50/50 border-gray-100" : "bg-indigo-50/40 border-indigo-100 shadow-xs"
                        }`}
                      >
                        <div className="flex items-start gap-3">
                          {notif.type === "deposit" && <Package className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />}
                          {notif.type === "pickup" && <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />}
                          {notif.type === "warning" && <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />}
                          {notif.type === "info" && <Info className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />}

                          <div className="space-y-0.5 flex-1">
                            <h5 className="font-bold text-xs text-gray-900">{notif.title}</h5>
                            <p className="text-[11px] text-gray-600 leading-snug">{notif.message}</p>
                            <span className="text-[10px] text-gray-400 font-medium block pt-1">{notif.created_at}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile Avatar Badge */}
            <div className="flex items-center space-x-3 pl-4 border-l border-gray-200">
              <div className="text-right">
                <p className="text-xs font-extrabold text-gray-900">Gérant Relais</p>
                <p className="text-[10px] text-gray-500 font-medium font-mono">{relayCode || "Session Relais"}</p>
              </div>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center font-black text-xs text-indigo-600">
                PR
              </div>
            </div>
          </div>
        </header>

        {/* Dynamic Page Content */}
        <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto space-y-6">
          {children}
        </main>
      </div>

      {/* Logout Confirmation Modal Popup */}
      {showLogoutModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-gray-100 animate-in fade-in zoom-in duration-200">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-red-50 border border-red-100 text-red-600 flex items-center justify-center shrink-0">
                <LogOut className="w-6 h-6 text-red-600" />
              </div>
              <div>
                <h3 className="font-extrabold text-gray-900 text-base">Confirmer la déconnexion ?</h3>
                <p className="text-xs text-gray-500 font-medium">Session Point Relais : <span className="font-mono text-indigo-600 font-bold">{relayCode}</span></p>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100">
              Êtes-vous sûr de vouloir fermer la session de ce Point Relais ? Vous devrez saisir à nouveau votre identifiant et votre code PIN pour accéder à cet espace.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutModal(false);
                  handleLogout();
                }}
                className="px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold shadow-md shadow-red-600/20 transition-all cursor-pointer"
              >
                Se déconnecter
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
