"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-indigo-50 text-[#6d28d9] rounded-2xl flex items-center justify-center mx-auto font-black shadow-xs">
            <ShieldCheck size={28} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Conditions Générales d&apos;Utilisation (CGU)</h1>
          <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto">
            Termes et conditions régissant l&apos;utilisation de la plateforme Kalagban Marketplace.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6 text-xs text-gray-600 font-medium leading-relaxed">
          <h3 className="text-base font-extrabold text-gray-900">1. Présentation de la Plateforme</h3>
          <p>
            Kalagban est une Marketplace e-commerce mettant en relation des acheteurs et des vendeurs professionnels vérifiés en Côte d&apos;Ivoire.
          </p>

          <h3 className="text-base font-extrabold text-gray-900">2. Engagements des Vendeurs</h3>
          <p>
            Chaque vendeur s&apos;engage à fournir des produits certifiés authentiques et à respecter la charte de qualité Kalagban.
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
