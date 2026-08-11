"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { 
  Home, 
  Package, 
  ShoppingCart, 
  BarChart2, 
  Settings, 
  HelpCircle,
  Sun,
  X,
  LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function Sidebar({ onClose }: { onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    document.cookie = "kalagban_seller_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    await supabase.auth.signOut();
    localStorage.clear();
    router.push("/register");
  };

  const [pendingOrders, setPendingOrders] = useState(0);

  useEffect(() => {
    const fetchPendingOrders = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const { count } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .eq('shop_id', session.user.id)
        .eq('status', 'pending');
      if (count !== null) setPendingOrders(count);
    };
    setTimeout(() => {
      fetchPendingOrders();
    }, 0);
  }, []);

  const menuItems = [
    { icon: <Home size={20} />, label: "Tableau de bord", path: "/" },
    { icon: <Package size={20} />, label: "Mes Produits", path: "/products" },
    { icon: <ShoppingCart size={20} />, label: "Commandes", path: "/orders", badge: pendingOrders > 0 ? pendingOrders : undefined },
    { icon: <BarChart2 size={20} />, label: "Statistiques", path: "/stats" },
    { icon: <Settings size={20} />, label: "Paramètres", path: "/settings" },
  ];

  return (
    <aside className="w-64 bg-surface h-full shadow-soft flex flex-col p-6 z-50">
      {/* Logo Area */}
      <div className="flex items-center justify-between gap-3 mb-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-linear-to-tr from-primary to-secondary rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-md">
            K
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-text-main">Kalagban</h1>
        </div>
        <button className="lg:hidden p-2 text-text-muted hover:bg-gray-100 rounded-lg" onClick={onClose}>
          <X size={20} />
        </button>
      </div>
      
      {/* Navigation */}
      <nav className="flex flex-col gap-2 flex-1">
        {menuItems.map((item, index) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={index} 
              href={item.path}
              onClick={onClose}
              className={`flex items-center gap-4 px-4 py-3 rounded-btn transition-all duration-200 ${
                isActive 
                  ? "bg-primary text-white shadow-soft" 
                  : "text-text-muted hover:bg-gray-50 hover:text-text-main"
              }`}
            >
              {item.icon}
              <span className="font-medium text-sm">{item.label}</span>
              {item.badge && (
                <span className={`ml-auto text-xs px-2 py-0.5 rounded-full font-bold ${
                  isActive ? "bg-white text-primary" : "bg-danger text-white"
                }`}>
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Promo/Support Widget */}
      <div className="mt-auto bg-linear-to-br from-indigo-500 via-primary to-purple-500 rounded-card p-5 text-white shadow-md relative overflow-hidden group cursor-pointer mb-6">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <HelpCircle size={18} />
            <h3 className="font-bold text-sm">Centre d&apos;Aide</h3>
          </div>
          <p className="text-xs opacity-90 mb-4 leading-relaxed">Besoin d&apos;assistance pour gérer vos commandes ?</p>
          <button className="bg-white text-primary text-xs font-bold py-2 px-4 rounded-full w-full shadow-sm group-hover:scale-105 transition-transform">
            Contacter le support
          </button>
        </div>
        {/* Decor */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-white/10 rounded-full blur-xl transform translate-x-1/2 -translate-y-1/2"></div>
      </div>

      {/* Theme & Logout Toggle */}
      <div className="flex flex-col gap-2 mt-2 border-t border-gray-100 pt-4">
        <div className="flex items-center gap-3 px-4 py-3 text-text-muted hover:text-text-main cursor-pointer transition-colors rounded-btn hover:bg-gray-50">
          <Sun size={20} />
          <span className="font-medium text-sm">Mode Clair</span>
        </div>
        
        <button 
          onClick={handleLogoutClick}
          className="flex items-center gap-3 px-4 py-3 text-danger hover:text-white cursor-pointer transition-colors rounded-btn hover:bg-danger/90 w-full text-left"
        >
          <LogOut size={20} />
          <span className="font-medium text-sm">Déconnexion</span>
        </button>
      </div>

      {/* Modal de Confirmation de Déconnexion (Sidebar) */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-sm w-full shadow-2xl text-center transform scale-100 transition-transform">
            <div className="w-16 h-16 bg-danger/10 text-danger rounded-full flex items-center justify-center mx-auto mb-4">
              <LogOut size={32} />
            </div>
            <h2 className="text-2xl font-black text-text-main mb-2">Déconnexion</h2>
            <p className="text-text-muted mb-8 font-medium">Êtes-vous sûr de vouloir vous déconnecter de votre tableau de bord ?</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-text-main bg-gray-100 hover:bg-gray-200 transition-colors"
              >
                Annuler
              </button>
              <button 
                onClick={confirmLogout}
                className="flex-1 px-4 py-3 rounded-xl font-bold text-white bg-danger hover:bg-red-600 shadow-lg shadow-danger/30 transition-all"
              >
                Oui, quitter
              </button>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}
