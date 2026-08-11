"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Truck, ShieldCheck, MapPin } from "lucide-react";

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-indigo-50 text-[#6d28d9] rounded-2xl flex items-center justify-center mx-auto font-black shadow-xs">
            <Truck size={28} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Politique de Livraison &amp; Expédition</h1>
          <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto">
            Découvrez nos modalités de livraison sécurisées partout en Côte d&apos;Ivoire.
          </p>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-xs space-y-6 text-xs text-gray-600 font-medium leading-relaxed">
          <h3 className="text-base font-extrabold text-gray-900">1. Délais de Livraison</h3>
          <p>
            Toute commande passée sur la plateforme Kalagban est prise en charge immédiatement par le vendeur certifié. À Abidjan (Cocody, Yopougon, Marcory, Plateau, Abobo, Treichville, Adjame, Koumassi, Port-Bouët), les livraisons s&apos;effectuent sous 24h à 48h jours ouvrables.
          </p>

          <h3 className="text-base font-extrabold text-gray-900">2. Tarifs de Livraison</h3>
          <p>
            Les frais de livraison sont calculés automatiquement lors de la validation de votre panier selon votre commune ou ville de destination.
          </p>

          <h3 className="text-base font-extrabold text-gray-900">3. Inspection du produit à la livraison</h3>
          <p>
            Vous avez le droit d&apos;inspecter le colis avant de procéder au paiement auprès du livreur certifié (Paiement à la livraison par Wave, Mobile Money ou Cash).
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
