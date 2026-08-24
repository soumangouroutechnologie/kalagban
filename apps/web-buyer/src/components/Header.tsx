"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Search, User, UserCheck, Home, Heart, X, Bell, Truck, Package } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCart } from "@/context/CartContext";
import { useFavorites } from "@/context/FavoritesContext";
import { supabase } from "@/lib/supabase";

interface CustomerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
  order_id?: string;
}

export default function Header({ 
  searchTerm, 
  onSearchChange 
}: { 
  searchTerm?: string; 
  onSearchChange?: (term: string) => void;
}) {
  const pathname = usePathname();
  const { totalItems, setIsCartOpen } = useCart();
  const { totalFavorites } = useFavorites();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  
  // Notification State
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const notifRef = useRef<HTMLDivElement>(null);

  const fetchNotifications = async (userId: string) => {
    try {
      const { data } = await supabase
        .from("customer_notifications")
        .select("*")
        .eq("customer_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      if (data) {
        setNotifications(data);
      }
    } catch (err) {
      console.error("Error fetching customer notifications:", err);
    }
  };

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      const u = session?.user || null;
      setUser(u);
      if (u) fetchNotifications(u.id);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user || null;
      setUser(u);
      if (u) fetchNotifications(u.id);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Supabase Realtime Listener for Customer Notifications
  useEffect(() => {
    if (!user?.id) return;

    const channelId = `customer_notifs_${user.id}_${Math.random().toString(36).substring(2, 7)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "customer_notifications", filter: `customer_id=eq.${user.id}` }, (payload) => {
        setNotifications(prev => [payload.new as CustomerNotification, ...prev]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifs(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllAsRead = async () => {
    if (!user?.id) return;
    try {
      await supabase
        .from("customer_notifications")
        .update({ is_read: true })
        .eq("customer_id", user.id);
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    } catch (err) {
      console.error("Error marking notifs read:", err);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;
  const isAccountPage = pathname === "/account";

  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-1.5 sm:gap-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group shrink-0">
          <div className="w-9 h-9 sm:w-11 sm:h-11 bg-linear-to-br from-indigo-600 to-purple-600 rounded-xl sm:rounded-2xl flex items-center justify-center text-white font-black text-lg sm:text-2xl shadow-md shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            K
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-lg sm:text-2xl font-black tracking-tight text-gray-900 leading-none">
              Kalagban
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 mt-0.5">
              Marketplace
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 min-w-0 max-w-lg mx-1 sm:mx-4 flex">
          <div className="relative w-full">
            <input
              type="text"
              value={searchTerm || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Rechercher un produit..."
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-full py-2 sm:py-3 px-3 sm:px-5 pl-8 sm:pl-12 pr-8 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium"
            />
            <Search className="absolute left-2.5 sm:left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={15} />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                title="Effacer la recherche"
              >
                <X size={13} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
          
          {/* Notification Bell (If logged in) */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs && unreadCount > 0) markAllAsRead();
                }}
                className="relative p-2 sm:p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl sm:rounded-2xl transition-all cursor-pointer flex items-center justify-center"
                title="Notifications de suivi"
              >
                <Bell size={17} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[9px] w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div className="absolute right-0 mt-3 w-72 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <Bell size={16} className="text-indigo-600" />
                      <h4 className="font-extrabold text-sm text-gray-900">Notifications &amp; Suivi</h4>
                    </div>
                    {notifications.length > 0 && (
                      <span className="text-[10px] font-bold text-gray-400">{notifications.length} message(s)</span>
                    )}
                  </div>

                  <div className="max-h-80 overflow-y-auto py-2 space-y-2 divide-y divide-gray-50 custom-scrollbar">
                    {notifications.length === 0 ? (
                      <div className="py-8 text-center text-xs text-gray-400 font-medium">
                        Aucune nouvelle notification pour le moment.
                      </div>
                    ) : (
                      notifications.map((n) => (
                        <div key={n.id} className={`p-3 rounded-2xl transition-colors ${!n.is_read ? 'bg-indigo-50/40' : 'bg-gray-50/60'}`}>
                          <div className="flex items-start gap-2.5">
                            <div className="w-8 h-8 rounded-xl bg-white border border-gray-200 flex items-center justify-center shrink-0 mt-0.5 text-indigo-600">
                              {n.type === "pickup" ? <Package size={15} className="text-emerald-600" /> : <Truck size={15} />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h5 className="font-extrabold text-xs text-gray-900 leading-snug">{n.title}</h5>
                              <p className="text-[11px] text-gray-600 mt-0.5 leading-relaxed">{n.message}</p>
                              <span className="text-[9px] text-gray-400 font-medium mt-1 block">
                                {new Date(n.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                              </span>
                            </div>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  <div className="pt-2 border-t border-gray-100 text-center">
                    <Link
                      href="/account?tab=orders"
                      onClick={() => setShowNotifs(false)}
                      className="text-xs font-extrabold text-indigo-600 hover:text-indigo-700 block py-1"
                    >
                      Voir toutes mes commandes →
                    </Link>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation Button: Aller sur Kalagban / Mon Compte */}
          {user ? (
            isAccountPage ? (
              <Link
                href="/"
                className="flex items-center gap-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold p-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl transition-colors text-xs border border-indigo-100 shrink-0"
                title="Aller sur Kalagban"
              >
                <Home size={17} />
                <span className="hidden md:inline">Accueil</span>
              </Link>
            ) : (
              <Link
                href="/account"
                className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold p-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl transition-colors text-xs shrink-0"
                title="Mon Compte"
              >
                <UserCheck size={17} className="text-emerald-600" />
                <span className="hidden md:inline">Mon Compte</span>
              </Link>
            )
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-1.5 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold p-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl transition-colors text-xs shrink-0"
              title="Se Connecter"
            >
              <User size={17} className="text-gray-600" />
              <span className="hidden md:inline">Connexion</span>
            </Link>
          )}

          {/* Favoris Button */}
          <Link
            href={user ? "/account?tab=favorites" : "/login?redirect=/account"}
            className="relative bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold p-2 sm:px-3 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1.5 transition-all border border-rose-100 text-xs shrink-0"
            title="Mes Favoris"
          >
            <Heart size={17} className="fill-rose-500 text-rose-500" />
            <span className="hidden lg:inline">Favoris</span>
            {totalFavorites > 0 && (
              <span className="bg-rose-500 text-white font-black text-[10px] sm:text-xs px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full">
                {totalFavorites}
              </span>
            )}
          </Link>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bg-gray-900 text-white font-bold p-2 sm:px-3.5 sm:py-2.5 rounded-xl sm:rounded-2xl flex items-center gap-1.5 hover:bg-indigo-600 transition-all shadow-md shadow-gray-900/10 text-xs cursor-pointer shrink-0"
            title="Mon Panier"
          >
            <ShoppingBag size={17} />
            <span className="hidden lg:inline">Panier</span>
            {totalItems > 0 && (
              <span className="bg-emerald-400 text-gray-950 font-black text-[10px] sm:text-xs px-1.5 py-0.2 sm:px-2 sm:py-0.5 rounded-full">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
