"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import Header from "./Header";
import RightSidebar from "./RightSidebar";
import Footer from "./Footer";
import { supabase } from "@/lib/supabase";

export default function LayoutWrapper({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const checkAuthAndShop = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();

      // 1. Si aucun utilisateur Supabase valide n'existe (session expirée ou compte supprimé)
      if (error || !session) {
        document.cookie = "kalagban_seller_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        localStorage.clear();
        await supabase.auth.signOut();
        router.push("/register");
        return;
      }

      // 2. Vérifier si la boutique existe en base de données
      const { data: shop } = await supabase
        .from('shops')
        .select('id')
        .eq('id', session.user.id)
        .maybeSingle();

      if (!shop) {
        // L'utilisateur n'a pas de boutique enregistrée -> Redirection vers l'assistant d'inscription
        document.cookie = "kalagban_seller_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
        await supabase.auth.signOut();
        router.push("/register");
      }
    };

    checkAuthAndShop();
  }, [router]);

  return (
    <div className="flex h-screen w-full bg-bg-app font-sans overflow-hidden relative">
      {/* Mobile Drawer Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-30 lg:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Left Sidebar (Drawer on Mobile) */}
      <div 
        className={`fixed inset-y-0 left-0 z-40 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 ${
          isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <Sidebar onClose={() => setIsMobileMenuOpen(false)} />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 relative custom-scrollbar flex flex-col w-full">
        <Header onMenuClick={() => setIsMobileMenuOpen(true)} />
        <div className="flex-1">
          {children}
        </div>
        <Footer />
      </div>
      
      {/* Right Sidebar */}
      <RightSidebar />
    </div>
  );
}
