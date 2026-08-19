"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Search, User, UserCheck, Home, Heart, X, Bell, Truck, Package } from "lucide-react";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { useCart } from "@/context/CartContext";
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
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-2 sm:gap-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 sm:gap-3 group shrink-0">
          <div className="w-10 h-10 sm:w-11 sm:h-11 bg-linear-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl sm:text-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            K
          </div>
          <div className="hidden sm:flex flex-col">
            <span className="text-xl sm:text-2xl font-black tracking-tight text-gray-900 leading-none">
              Kalagban
            </span>
            <span className="text-[9px] sm:text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 mt-0.5">
              Marketplace
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-2 sm:mx-4 flex">
          <div className="relative w-full">
            <input
              type="text"
              value={searchTerm || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Rechercher un produit, une catégorie..."
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-full py-2.5 sm:py-3 px-4 sm:px-5 pl-10 sm:pl-12 pr-9 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-xs sm:text-sm font-medium"
            />
            <Search className="absolute left-3.5 sm:left-4.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={16} />
            {searchTerm ? (
              <button
                type="button"
                onClick={() => onSearchChange?.("")}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
                title="Effacer la recherche"
              >
                <X size={14} />
              </button>
            ) : null}
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          
          {/* Notification Bell (If logged in) */}
          {user && (
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  if (!showNotifs && unreadCount > 0) markAllAsRead();
                }}
                className="relative p-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-all cursor-pointer flex items-center justify-center"
                title="Notifications de suivi"
              >
                <Bell size={18} />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white font-black text-[10px] w-4 h-4 rounded-full flex items-center justify-center shadow-xs animate-pulse">
                    {unreadCount}
                  </span>
                )}
              </button>

              {/* Notification Dropdown */}
              {showNotifs && (
                <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-3xl shadow-2xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-top-2 duration-200">
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
                className="flex items-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold px-4 py-2.5 rounded-xl transition-colors text-xs border border-indigo-100"
              >
                <Home size={16} />
                <span>Aller sur Kalagban</span>
              </Link>
            ) : (
              <Link
                href="/account"
                className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs"
              >
                <UserCheck size={16} className="text-emerald-600" />
                <span>Mon Compte</span>
              </Link>
            )
          ) : (
            <Link
              href="/login"
              className="flex items-center gap-2 bg-gray-100 hover:bg-gray-200 text-gray-900 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs"
            >
              <User size={16} className="text-gray-600" />
              <span>Se Connecter</span>
            </Link>
          )}

          {/* Favoris Button */}
          <Link
            href={user ? "/account?tab=favorites" : "/login?redirect=/account"}
            className="relative bg-rose-50 hover:bg-rose-100 text-rose-600 font-bold px-3.5 py-2.5 rounded-2xl flex items-center gap-2 transition-all border border-rose-100 text-xs"
            title="Mes Favoris (Connexion requise)"
          >
            <Heart size={18} className="fill-rose-500 text-rose-500" />
            <span className="hidden sm:inline">Favoris</span>
          </Link>

          {/* Cart Button */}
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative bg-gray-900 text-white font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-gray-900/10 hover:shadow-indigo-600/30 transform hover:-translate-y-0.5 text-xs cursor-pointer"
          >
            <ShoppingBag size={18} />
            <span className="hidden sm:inline">Panier</span>
            {totalItems > 0 && (
              <span className="bg-emerald-400 text-gray-950 font-black text-xs px-2 py-0.5 rounded-full animate-bounce">
                {totalItems}
              </span>
            )}
          </button>
        </div>
      </div>
    </header>
  );
}
