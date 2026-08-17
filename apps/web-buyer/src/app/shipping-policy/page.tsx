"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Truck, Clock } from "lucide-react";

export default function ShippingPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <Truck size={32} />
          </div>
          <span className="text-xs font-bold text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
            Conditions de Livraison
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Politique de Livraison
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xl mx-auto">
            Règles et engagements applicables à la préparation, à l&apos;expédition, aux délais et aux retours des commandes sur Kalagban Marketplace.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">
          
          {/* Article 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">1</span>
              Objet
            </h2>
            <p>
              Cette Politique de Livraison définit l&apos;ensemble des règles applicables à la préparation, au traitement, au transport et à la remise des commandes effectuées sur la marketplace Kalagban.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">2</span>
              Frais de Livraison
            </h2>
            <p>
              Les frais de livraison sont à la charge du client. Le montant applicable dépend du mode de livraison choisi (Point Relais ou Livraison à Domicile) et de la localisation géographique.
            </p>
            <p className="text-xs text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 font-medium">
              💡 <strong>Transparence totale :</strong> Le client prend obligatoirement connaissance des frais de livraison exacts avant la validation finale de sa commande au checkout.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 3 & 4: Préparation & Délais */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">3</span>
              Préparation et Délais Indicatifs de Livraison
            </h2>
            <p>
              Dès réception de la commande, le vendeur vérifie la disponibilité de l&apos;article, effectue le contrôle de conformité (taille, couleur, absence de défaut), emballe le produit avec soin et le remet au transporteur partenaire.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs pt-2">
              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-1.5">
                <span className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <Clock size={16} className="text-blue-600" /> Délais Abidjan
                </span>
                <p className="text-blue-800">
                  Généralement livrées sous <strong>24h à 48h ouvrées</strong> selon l&apos;heure de validation.
                </p>
              </div>

              <div className="bg-blue-50/60 p-4 rounded-2xl border border-blue-100 space-y-1.5">
                <span className="font-bold text-blue-900 text-sm flex items-center gap-1.5">
                  <Clock size={16} className="text-blue-600" /> Intérieur &amp; Global
                </span>
                <p className="text-blue-800">
                  Délai indicatif de <strong>maximum une semaine</strong> pour l&apos;ensemble des localités.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Article 5 & 6: Adresse & Réception */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">4</span>
              Adresse de Livraison &amp; Réception
            </h2>
            <p>
              Le client s&apos;engage à fournir un numéro de téléphone joignable et une adresse ou un repère précis.
            </p>
            <p className="text-xs text-gray-600">
              À la réception du colis (en main propre ou en Point Relais), le client est expressément invité à vérifier l&apos;état apparent du colis et de l&apos;article.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 7, 8: Produit incorrect / échec */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">5</span>
              Produit Incorrect, Endommagé ou Échec de Livraison
            </h2>
            <p>
              Si le client reçoit un mauvais article, une taille non conforme ou un produit manifestement détérioré, il doit contacter immédiatement le support Kalagban avec des photos justificatives.
            </p>
            <p className="text-xs text-gray-600">
              Une livraison peut échouer si le destinataire est injoignable après plusieurs relances ou si les informations fournies sont inexactes.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 9: Retours (5 Jours) */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">6</span>
              Conditions de Retour (5 Jours)
            </h2>
            
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-5 rounded-2xl text-xs space-y-2">
              <p className="font-extrabold text-emerald-800 text-sm">
                Le client dispose d&apos;un délai légal de 5 jours suivant la livraison pour demander le retour d&apos;un article.
              </p>
              <p className="text-emerald-700">
                Pour être accepté, le produit retourné doit impérativement être :
              </p>
              <ul className="space-y-1 text-emerald-700 font-semibold pl-2">
                <li>• Intact</li>
                <li>• Non porté</li>
                <li>• Non lavé</li>
                <li>• Non dégradé</li>
                <li>• Non déchiré</li>
                <li>• Dans son état et emballage d&apos;origine</li>
              </ul>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Article 10 & 11: Contact */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-blue-600 text-white rounded-lg flex items-center justify-center text-xs font-black">7</span>
              Contact &amp; Assistance Livraison
            </h2>
            <p>
              Pour toute question relative à l&apos;acheminement d&apos;une commande, le client peut joindre le support Kalagban en précisant son numéro de commande :
            </p>
            <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
              <p>• Email officiel : <strong>contact@kalagban.ci</strong></p>
              <p>• Suivi en direct disponible sur votre compte Kalagban</p>
            </div>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
}
