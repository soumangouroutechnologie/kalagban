"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { HelpCircle, ChevronDown, PhoneCall, ShieldCheck, Truck } from "lucide-react";

export default function FAQPage() {
  const faqs = [
    {
      q: "Comment passer une commande sur Kalagban ?",
      a: "Vous pouvez parcourir le catalogue, ajouter des produits à votre panier et valider votre commande en fournissant votre adresse et téléphone. Vous pouvez aussi commander directement par téléphone au 25 20 00 61 61."
    },
    {
      q: "Quels sont les modes de paiement acceptés ?",
      a: "Kalagban propose le paiement à la livraison via Wave, Orange Money, MTN Mobile Money, Moov Money ou en espèces (Cash)."
    },
    {
      q: "Quels sont les délais de livraison à Abidjan et à l'intérieur ?",
      a: "À Abidjan, les livraisons s'effectuent sous 24h à 48h. Pour les villes de l'intérieur de la Côte d'Ivoire, les délais sont de 48h à 72h."
    },
    {
      q: "Comment s'assurer de l'authenticité des vendeurs ?",
      a: "Toutes les boutiques inscrites sur Kalagban font l'objet d'une vérification rigoureuse par nos modérateurs avant d'obtenir le badge 'Vendeur Vérifié'."
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-8">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 bg-indigo-50 text-[#6d28d9] rounded-2xl flex items-center justify-center mx-auto font-black shadow-xs">
            <HelpCircle size={28} />
          </div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tight">Centre d&apos;Aide &amp; Foire Aux Questions (FAQ)</h1>
          <p className="text-sm text-gray-500 font-medium max-w-xl mx-auto">
            Trouvez rapidement toutes les réponses à vos questions concernant vos achats et vos livraisons sur Kalagban.
          </p>
        </div>

        <div className="space-y-4 pt-6">
          {faqs.map((faq, idx) => (
            <div key={idx} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-2">
              <h3 className="font-extrabold text-base text-gray-900 flex items-center justify-between">
                <span>{faq.q}</span>
              </h3>
              <p className="text-xs text-gray-600 font-medium leading-relaxed pt-1">
                {faq.a}
              </p>
            </div>
          ))}
        </div>
      </main>

      <Footer />
    </div>
  );
}
