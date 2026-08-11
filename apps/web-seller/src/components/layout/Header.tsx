"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from "react";
import { Search, Bell, ChevronDown, Menu, User, Settings, LogOut, Package, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

interface NotificationItem {
  id: string;
  type: "order" | "alert";
  title: string;
  time: string;
  unread: boolean;
}

export default function Header({ onMenuClick }: { onMenuClick?: () => void }) {
  const router = useRouter();
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isLogoutModalOpen, setIsLogoutModalOpen] = useState(false);
  
  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  const [profile, setProfile] = useState<{ firstName: string, lastName: string, avatarUrl: string | null, email: string }>({
    firstName: "Vendeur",
    lastName: "",
    avatarUrl: null,
    email: ""
  });
  
  const [shopName, setShopName] = useState("Boutique à configurer");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  useEffect(() => {
    const loadHeaderData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        // Détection de session expirée/réinitialisée -> Nettoyage et redirection vers la connexion
        document.cookie = "kalagban_seller_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        router.push("/register");
        return;
      }
      
      // 1. Profil
      const { data: pData } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (pData) {
        setProfile({
          firstName: pData.first_name || "Vendeur",
          lastName: pData.last_name || "",
          avatarUrl: pData.avatar_url,
          email: session.user.email || ""
        });
      }

      // 2. Boutique
      const { data: sData } = await supabase.from('shops').select('name').eq('id', session.user.id).maybeSingle();
      if (sData) {
        setShopName(sData.name || "Nouvelle Boutique");
      }

      // 3. Notifications réelles (Commandes en attente & Ruptures de stock)
      const realNotifs: NotificationItem[] = [];

      const { data: pendingOrders } = await supabase
        .from('orders')
        .select('id, customer_name, created_at')
        .eq('shop_id', session.user.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      if (pendingOrders && pendingOrders.length > 0) {
        pendingOrders.forEach((o) => {
          realNotifs.push({
            id: `order_${o.id}`,
            type: 'order',
            title: `Nouvelle commande de ${o.customer_name.split('(')[0].trim()}`,
            time: new Date(o.created_at).toLocaleTimeString("fr-FR", { hour: '2-digit', minute: '2-digit' }),
            unread: true
          });
        });
      }

      const { data: outOfStock } = await supabase
        .from('products')
        .select('id, title')
        .eq('shop_id', session.user.id)
        .lte('stock_quantity', 0)
        .limit(5);

      if (outOfStock && outOfStock.length > 0) {
        outOfStock.forEach((p) => {
          realNotifs.push({
            id: `stock_${p.id}`,
            type: 'alert',
            title: `Rupture de stock : ${p.title}`,
            time: 'Alerte stock',
            unread: true
          });
        });
      }

      setNotifications(realNotifs);
    };
    
    loadHeaderData();

    window.addEventListener("kalagban_profile_updated", loadHeaderData);
    return () => {
      window.removeEventListener("kalagban_profile_updated", loadHeaderData);
    };
  }, [router]);

  // Gérer le clic en dehors pour fermer les menus
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) {
        setIsProfileOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogoutClick = () => {
    setIsLogoutModalOpen(true);
    setIsProfileOpen(false);
  };

  const confirmLogout = async () => {
    document.cookie = "kalagban_seller_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
    await supabase.auth.signOut();
    localStorage.clear();
    router.push("/register");
  };

  const unreadCount = notifications.filter(n => n.unread).length;

  return (
    <header className="flex justify-between items-center mb-8 sticky top-0 bg-bg-app/90 backdrop-blur-md z-40 py-4 pb-6">
      <div className="flex items-center gap-4">
        {/* Mobile Menu Button */}
        <button 
          onClick={onMenuClick}
          className="lg:hidden p-2 text-text-main hover:bg-gray-100 rounded-lg transition-colors"
        >
          <Menu size={24} />
        </button>
        
        {/* Search Bar */}
        <div className="relative w-full max-w-50 sm:max-w-xs md:max-w-md group hidden sm:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary transition-colors" size={20} />
          <input 
            type="text" 
            placeholder="Rechercher une commande, un produit..." 
            className="w-full pl-12 pr-4 py-3 rounded-full bg-white shadow-sm border border-transparent focus:border-primary/20 focus:outline-none focus:ring-4 focus:ring-primary/10 text-sm font-medium text-text-main transition-all"
          />
        </div>
      </div>

      {/* Right Actions */}
      <div className="flex items-center gap-3 sm:gap-6">
        
        {/* Notifications Dropdown */}
        <div className="relative" ref={notifRef}>
          <button 
            onClick={() => {
              setIsNotifOpen(!isNotifOpen);
              setIsProfileOpen(false);
            }}
            className={`w-10 h-10 sm:w-11 sm:h-11 rounded-full flex items-center justify-center transition-colors relative shadow-sm border border-transparent ${isNotifOpen ? 'bg-primary/10 text-primary border-primary/20' : 'bg-white text-text-muted hover:text-primary hover:border-gray-100'}`}
          >
            {unreadCount > 0 && (
              <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-danger rounded-full border-2 border-white animate-pulse"></span>
            )}
            <Bell size={20} />
          </button>

          {/* Notif Menu */}
          {isNotifOpen && (
            <div className="absolute top-full right-0 mt-3 w-80 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden transform origin-top-right transition-all">
              <div className="p-4 border-b border-gray-50 flex justify-between items-center">
                <h3 className="font-bold text-text-main">Notifications</h3>
                {unreadCount > 0 ? (
                  <span className="text-xs font-bold bg-primary/10 text-primary px-2 py-1 rounded-lg">{unreadCount} nouvelles</span>
                ) : (
                  <span className="text-xs font-bold text-gray-400">À jour</span>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 bg-gray-50 text-gray-400 rounded-full flex items-center justify-center">
                      <Bell size={22} />
                    </div>
                    <p className="text-sm font-bold text-gray-900">Aucune notification</p>
                    <p className="text-xs text-gray-400 max-w-50">Vos nouvelles commandes et alertes de stock s&apos;afficheront ici en temps réel.</p>
                  </div>
                ) : (
                  notifications.map((notif) => (
                    <div key={notif.id} className={`p-4 border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer flex gap-3 transition-colors ${notif.unread ? 'bg-primary/5' : ''}`}>
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${notif.type === 'order' ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning'}`}>
                        {notif.type === 'order' ? <Package size={18} /> : <AlertCircle size={18} />}
                      </div>
                      <div>
                        <p className={`text-sm ${notif.unread ? 'font-bold text-text-main' : 'font-medium text-text-muted'}`}>{notif.title}</p>
                        <p className="text-xs text-gray-400 mt-1">{notif.time}</p>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {notifications.length > 0 && (
                <div className="p-3 text-center border-t border-gray-50">
                  <button onClick={() => setNotifications([])} className="text-sm font-bold text-primary hover:underline">
                    Marquer tout comme lu
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative" ref={profileRef}>
          <div 
            onClick={() => {
              setIsProfileOpen(!isProfileOpen);
              setIsNotifOpen(false);
            }}
            className={`flex items-center gap-2 sm:gap-3 cursor-pointer p-1.5 sm:pr-4 rounded-full shadow-sm border transition-colors ${isProfileOpen ? 'bg-gray-50 border-gray-200' : 'bg-white border-transparent hover:border-gray-100'}`}
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 bg-primary/10 rounded-full overflow-hidden shrink-0 flex items-center justify-center text-primary font-bold">
              {profile.avatarUrl ? (
                <img src={profile.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                profile.firstName ? profile.firstName.charAt(0).toUpperCase() : "V"
              )}
            </div>

            <div className="hidden sm:flex flex-col text-left">
              <span className="text-xs font-bold text-text-main leading-none flex items-center gap-1">
                {profile.firstName} {profile.lastName}
              </span>
              <span className="text-[10px] text-text-muted font-medium leading-none mt-1">
                {shopName}
              </span>
            </div>

            <ChevronDown size={14} className={`text-text-muted transition-transform duration-200 hidden sm:block ${isProfileOpen ? 'rotate-180' : ''}`} />
          </div>

          {/* Profile Menu */}
          {isProfileOpen && (
            <div className="absolute top-full right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl shadow-gray-200/50 border border-gray-100 p-2 transform origin-top-right transition-all">
              <div className="p-3 border-b border-gray-50 sm:hidden">
                <p className="font-bold text-text-main text-sm">{profile.firstName} {profile.lastName}</p>
                <p className="text-xs text-text-muted">{shopName}</p>
              </div>

              <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm font-bold text-text-main hover:text-primary transition-colors">
                <User size={18} />
                Mon Profil & Boutique
              </Link>
              <Link href="/settings" onClick={() => setIsProfileOpen(false)} className="flex items-center gap-3 p-3 rounded-xl hover:bg-gray-50 text-sm font-bold text-text-main hover:text-primary transition-colors">
                <Settings size={18} />
                Paramètres
              </Link>
              <hr className="my-1 border-gray-50" />
              <button 
                onClick={handleLogoutClick}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-danger/10 text-sm font-bold text-danger transition-colors"
              >
                <LogOut size={18} />
                Déconnexion
              </button>
            </div>
          )}
        </div>

      </div>

      {/* LOGOUT CONFIRMATION MODAL */}
      {isLogoutModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl border border-gray-100 relative">
            <div className="w-16 h-16 bg-red-50 text-danger rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <LogOut size={28} />
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Déconnexion</h3>
            <p className="text-gray-500 text-sm font-medium mb-6">
              Êtes-vous sûr de vouloir vous déconnecter de votre espace vendeur Kalagban ?
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsLogoutModalOpen(false)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmLogout}
                className="flex-1 bg-danger text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-danger/30 hover:bg-red-700 transition-colors text-sm"
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
