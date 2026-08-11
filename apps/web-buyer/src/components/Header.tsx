"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Search, User, UserCheck, Home, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export default function Header({ 
  searchTerm, 
  onSearchChange 
}: { 
  searchTerm?: string; 
  onSearchChange?: (term: string) => void;
}) {
  const pathname = usePathname();
  const { totalItems, setIsCartOpen } = useCart();
  const [user, setUser] = useState<unknown | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const isAccountPage = pathname === "/account";

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 bg-linear-to-br from-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-2xl shadow-lg shadow-indigo-500/30 group-hover:scale-105 transition-transform">
            K
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight text-gray-900 leading-none">
              Kalagban
            </span>
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-600 mt-0.5">
              Marketplace
            </span>
          </div>
        </Link>

        {/* Search Bar */}
        <div className="flex-1 max-w-lg mx-4 hidden md:block">
          <div className="relative">
            <input
              type="text"
              value={searchTerm || ""}
              onChange={(e) => onSearchChange?.(e.target.value)}
              placeholder="Rechercher un produit, une marque, une catégorie..."
              className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-full py-3 px-5 pl-12 focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500 transition-all text-sm font-medium"
            />
            <Search className="absolute left-4.5 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-3">
          
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
