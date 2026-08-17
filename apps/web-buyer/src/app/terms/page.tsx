"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Scale } from "lucide-react";

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-purple-50 text-[#6d28d9] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <Scale size={32} />
          </div>
          <span className="text-xs font-bold text-[#6d28d9] uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Cadre Légal &amp; Réglementaire
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Conditions Générales d&apos;Utilisation (CGU)
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xl mx-auto">
            Kalagban Marketplace — Règles régissant les relations entre Kalagban, les acheteurs, les vendeurs et l&apos;ensemble des utilisateurs de la plateforme.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">
          
          {/* Article 1 & 2 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#6d28d9] text-white rounded-md flex items-center justify-center text-xs font-bold">1</span>
              Article 1 &amp; 2 – Objet et Acceptation des CGU
            </h2>
            <p>
              Les présentes Conditions Générales d&apos;Utilisation définissent les règles d&apos;accès et d&apos;utilisation de Kalagban, marketplace dédiée à la mode. Elles régissent l&apos;ensemble des relations contractuelles entre Kalagban, les acheteurs et les vendeurs.
            </p>
            <p className="text-xs text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 font-medium">
              La création d&apos;un compte, la navigation sur le site web ou l&apos;application mobile implique l&apos;acceptation pleine et entière des présentes CGU. L&apos;utilisateur qui refuse ces conditions doit cesser immédiatement toute utilisation.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 3, 4, 5 */}
          <section className="space-y-4">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#6d28d9] text-white rounded-md flex items-center justify-center text-xs font-bold">2</span>
              Articles 3 à 5 – Compte, Fonctionnement &amp; Obligations des Vendeurs
            </h2>
            <p>
              L&apos;utilisateur est seul responsable de la véracité de ses informations et de la confidentialité de ses identifiants.
            </p>
            <p>
              Kalagban est une plateforme technique de mise en relation. Sauf indication contraire, le vendeur demeure juridiquement responsable de la conformité, de la qualité, de l&apos;authenticité et de la disponibilité des produits qu&apos;il met en vente.
            </p>
            <div className="bg-purple-50/50 p-4 rounded-2xl border border-purple-100 text-xs text-purple-950 space-y-1">
              <p className="font-bold">Le vendeur certifié s&apos;engage notamment à :</p>
              <p>• Fournir des informations scrupuleusement exactes</p>
              <p>• Respecter les prix affichés et honorer les commandes acceptées</p>
              <p>• Se conformer à la Charte Qualité &amp; Sécurité et aux lois applicables</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Article 6 & 7: Commission et Paiement */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#6d28d9] text-white rounded-md flex items-center justify-center text-xs font-bold">3</span>
              Articles 6 &amp; 7 – Commission et Paiement des Vendeurs
            </h2>
            <p>
              Kalagban applique une commission commerciale de <strong>10 % sur chaque vente</strong> réalisée sur la marketplace.
            </p>
            <p>
              Les paiements aux vendeurs sont effectués <strong>chaque mercredi par Mobile Money</strong>, sous réserve de la validation et de l&apos;éligibilité des ventes concernées (commandes livrées sans litige).
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 8, 9, 10: Commandes, Livraison, Retours */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#6d28d9] text-white rounded-md flex items-center justify-center text-xs font-bold">4</span>
              Articles 8 à 10 – Commandes, Livraison &amp; Retours
            </h2>
            <p>
              Une commande constitue un engagement d&apos;achat ferme. Les frais de livraison sont à la charge du client. Le délai indicatif de livraison est d&apos;environ <strong>une semaine maximum</strong>.
            </p>
            <p>
              Conformément à la politique commerciale de Kalagban, le client dispose d&apos;un <strong>délai de 5 jours</strong> suivant la livraison pour demander le retour d&apos;un article. L&apos;article retourné doit être intact, non porté, non lavé, non dégradé et dans son emballage d&apos;origine.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 11, 12, 13, 14, 15 */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#6d28d9] text-white rounded-md flex items-center justify-center text-xs font-bold">5</span>
              Articles 11 à 15 – Produits Interdits, Propriété Intellectuelle &amp; Suspension
            </h2>
            <p>
              La vente de produits contrefaits, volés ou illégaux est formellement prohibée. Tout contenu ou compte frauduleux fera l&apos;objet d&apos;un retrait immédiat et d&apos;une suspension sans préavis.
            </p>
            <p>
              L&apos;ensemble de la marque, du graphisme et des fonctionnalités de Kalagban est protégé par le droit de la propriété intellectuelle.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 16, 17, 18, 19: Droit Ivoirien & Contact */}
          <section className="space-y-3">
            <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-6 h-6 bg-[#6d28d9] text-white rounded-md flex items-center justify-center text-xs font-bold">6</span>
              Articles 16 à 19 – Données Personnelles, Droit Applicable &amp; Contact
            </h2>
            <p>
              Les données personnelles sont traitées dans le strict respect de la <strong>loi ivoirienne n° 2013-450 du 19 juin 2013</strong> relative à la protection des données à caractère personnel.
            </p>
            <p>
              Les présentes CGU sont expressément soumises au <strong>droit ivoirien</strong>. Tout différend relatif à leur validité ou interprétation fera l&apos;objet d&apos;une recherche de règlement amiable prioritaire.
            </p>
            <div className="text-xs text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100 mt-2">
              <p>• Contact support officiel : <strong>contact@kalagban.com</strong></p>
              <p>• Kalagban — La mode, autrement.</p>
            </div>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
}
