"use client";

import React, { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AlertTriangle, RefreshCw, ShoppingBag, Loader2 } from "lucide-react";

function CancelContent() {

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 py-16">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-8 sm:p-12 text-center">
          
          <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-amber-50/50">
            <AlertTriangle size={40} />
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mb-2">
            Paiement non finalisé
          </h1>
          <p className="text-gray-500 font-medium text-sm max-w-md mx-auto mb-8">
            La transaction a été interrompue ou annulée. Aucun montant n&apos;a été débité de votre compte. Vos articles sont toujours conservés dans votre panier.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              href="/checkout"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-extrabold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 text-sm"
            >
              <RefreshCw size={18} /> Réessayer le paiement
            </Link>
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-800 font-extrabold px-8 py-4 rounded-xl hover:bg-gray-200 transition-all text-sm"
            >
              <ShoppingBag size={18} /> Retour à l&apos;accueil
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutCancelPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    }>
      <CancelContent />
    </Suspense>
  );
}
