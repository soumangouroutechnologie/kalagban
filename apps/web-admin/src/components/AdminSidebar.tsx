"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  LayoutDashboard, 
  Palette, 
  Users, 
  Store, 
  Package, 
  DollarSign, 
  UserCheck, 
  LogOut, 
  ShieldAlert,
  Sparkles,
  Menu,
  X,
  MapPin
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [adminUser, setAdminUser] = useState<{ email?: string; role?: string; full_name?: string } | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);

  useEffect(() => {
    const fetchAdminProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, role, admin_role")
          .eq("id", session.user.id)
          .single();

        setAdminUser({
          email: session.user.email,
          full_name: profile?.full_name || "Admin Kalagban",
          role: profile?.admin_role || "super_admin",
        });
      }
    };

    fetchAdminProfile();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  const navItems = [
    { label: "Tableau de Bord", href: "/", icon: LayoutDashboard, role: "all" },
    { label: "Points Relais & Carte", href: "/relays", icon: MapPin, role: "all" },
    { label: "Éditeur Visuel CMS", href: "/cms", icon: Palette, role: "cms" },
    { label: "Gestion Équipe & RBAC", href: "/team", icon: Users, role: "super_admin" },
    { label: "Boutiques & Vendeurs", href: "/shops", icon: Store, role: "all" },
    { label: "Supervision Commandes", href: "/orders", icon: Package, role: "all" },
    { label: "Comptabilité & Finances", href: "/finance", icon: DollarSign, role: "finance" },
    { label: "Utilisateurs & Profils", href: "/users", icon: UserCheck, role: "all" },
  ];

  const getRoleLabel = (role?: string) => {
    switch (role) {
      case "super_admin": return "Super Administrateur 👑";
      case "developer": return "Ingénieur / Développeur 💻";
      case "accountant": return "Comptable / Financier 💰";
      default: return "Modérateur Admin 🛡️";
    }
  };

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

      {/* Mobile Backdrop Overlay */}
      {mobileMenuOpen && (
        <div 
          onClick={() => setMobileMenuOpen(false)}
          className="lg:hidden fixed inset-0 z-45 bg-black/60 backdrop-blur-xs transition-opacity"
        />
      )}

      {/* Sidebar Desktop & Overlay Mobile */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-slate-900 text-white flex flex-col justify-between transition-transform duration-300 transform lg:translate-x-0 ${
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      }`}>
        <div>
          {/* Header */}
          <div className="p-6 border-b border-slate-800 flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-2xl flex items-center justify-center font-black text-lg shadow-lg shadow-indigo-600/30">
              K
            </div>
            <div>
              <h1 className="font-black text-base tracking-tight text-white">Kalagban Admin</h1>
              <p className="text-[11px] font-bold text-indigo-400 flex items-center gap-1">
                <Sparkles size={10} /> Back-Office V1.0
              </p>
            </div>
          </div>

          {/* User Profile Badge */}
          <div className="p-4 mx-4 my-4 rounded-2xl bg-slate-800/80 border border-slate-700/80">
            <p className="text-xs font-black text-white line-clamp-1">
              {adminUser?.full_name || "Administrateur"}
            </p>
            <span className="text-[10px] font-extrabold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full inline-block mt-1">
              {getRoleLabel(adminUser?.role)}
            </span>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 space-y-1.5">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all ${
                    isActive
                      ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]"
                      : "text-slate-400 hover:text-white hover:bg-slate-800/60"
                  }`}
                >
                  <Icon size={18} className={isActive ? "text-white" : "text-slate-400"} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Footer Logout */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={() => setShowLogoutModal(true)}
            className="w-full flex items-center justify-center gap-2 bg-red-500/10 hover:bg-red-500 text-red-400 hover:text-white font-extrabold text-xs py-3 px-4 rounded-2xl transition-all border border-red-500/20 cursor-pointer"
          >
            <LogOut size={16} />
            Se Déconnecter
          </button>
        </div>
      </aside>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full shadow-2xl text-center space-y-4 border border-gray-100">
            <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mx-auto">
              <ShieldAlert size={28} />
            </div>
            <div>
              <h3 className="text-lg font-black text-gray-900">Confirmation de Déconnexion</h3>
              <p className="text-xs text-gray-500 mt-1">
                Êtes-vous sûr de vouloir quitter le Panneau Administrateur Kalagban ?
              </p>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-2.5 rounded-xl text-xs transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                onClick={handleLogout}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl text-xs shadow-md transition-colors cursor-pointer"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
