"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { ShieldCheck } from "lucide-react";

export default function QualityCharterPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <ShieldCheck size={32} />
          </div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            Charte Officielle
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Charte Qualité &amp; Sécurité
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xl mx-auto">
            Kalagban — Marketplace dédiée à la mode. Les standards d&apos;authenticité, de qualité et de sécurité applicables à l&apos;ensemble des vendeurs et utilisateurs.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">
          
          {/* Article 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">1</span>
              Notre Engagement
            </h2>
            <p>
              Kalagban a pour ambition de devenir une marketplace de référence dans le domaine de la mode en Afrique de l&apos;Ouest.
            </p>
            <p>
              Notre priorité absolue est de créer un environnement dans lequel les acheteurs peuvent commander en toute confiance et les vendeurs développer leur activité dans un cadre sain, équitable et professionnel.
            </p>
            <p className="font-semibold text-gray-900">
              Cette Charte définit les standards minimaux et obligatoires que tout vendeur inscrit sur la plateforme doit respecter sans exception.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 2 & 3: Qualité & Photos */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">2</span>
              Qualité des Produits &amp; Authenticité des Photos
            </h2>
            <p>
              Tout produit publié sur Kalagban doit être rigoureusement conforme à sa description. Le vendeur doit fournir des informations exactes concernant la marque, la matière, la taille, la couleur, l&apos;état du produit, les caractéristiques et les éventuels défauts.
            </p>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-4 rounded-2xl text-xs font-medium space-y-1.5">
              <span className="font-bold text-amber-800">📸 Règle stricte sur les photos :</span>
              <p>
                Les photos doivent représenter fidèlement l&apos;article proposé. Elles doivent être nettes, bien éclairées, non trompeuses et correspondre au stock réel disponible. Un défaut important ne doit jamais être volontairement dissimulé.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Article 4, 5, 6: Produits interdits & Propriété intellectuelle */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">3</span>
              Interdiction de Contrefaçon &amp; Propriété Intellectuelle
            </h2>
            
            <div className="bg-red-50 text-red-950 p-5 rounded-2xl border border-red-100 text-xs space-y-2">
              <p className="font-bold text-red-700 uppercase tracking-wide">Sont formellement prohibés sur la marketplace :</p>
              <ul className="space-y-1 font-medium text-red-900">
                <li>• Les produits contrefaits ou répliques non autorisées</li>
                <li>• Les faux articles présentés frauduleusement comme authentiques</li>
                <li>• Les articles volés, dangereux ou interdits par la loi ivoirienne</li>
                <li>• L&apos;utilisation d&apos;une marque, logo ou image sans disposer des droits d&apos;exploitation</li>
              </ul>
            </div>

            <p className="text-xs text-gray-600">
              Lorsqu&apos;un vendeur commercialise un produit de marque, il doit être en mesure de justifier son authenticité (factures, certificats, contrats de distribution) à la demande de Kalagban. Kalagban peut retirer immédiatement tout produit suspect.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 7 & 8: Préparation & Emballage */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">4</span>
              Préparation et Soin de l&apos;Emballage
            </h2>
            <p>
              Avant toute remise au transporteur ou au Point Relais, le vendeur effectue un contrôle qualité systématique (vérification de la taille, de la couleur, des coutures et de l&apos;absence de salissure).
            </p>
            <p className="text-xs text-gray-600">
              Les articles doivent être soigneusement emballés dans un conditionnement propre et hermétique pour les protéger de la poussière, de l&apos;humidité et des déchirures durant le transport.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Article 9 & 10: Sécurité des utilisateurs & Données */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">5</span>
              Sécurité des Utilisateurs &amp; Confidentialité des Données
            </h2>
            <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 text-xs space-y-2 text-gray-600">
              <p>
                Il est strictement interdit de tenter de récupérer les données bancaires ou codes secrets Mobile Money d&apos;un client, de créer de faux comptes ou d&apos;organiser des paiements hors plateforme dans le but de contourner les garanties Kalagban.
              </p>
              <p>
                Les coordonnées des clients reçues pour la livraison ne doivent <strong>jamais être revendues, transmises à des tiers ou utilisées pour du démarchage personnel non sollicité</strong>.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Article 11, 12, 13: Contrôles, Signalement & Sanctions */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">6</span>
              Contrôles, Signalements &amp; Échelle des Sanctions
            </h2>
            <p>
              Tout utilisateur peut signaler un produit suspect ou un vendeur non conforme au support officiel. En cas de manquement avéré, Kalagban applique une gradation stricte :
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600 font-medium pl-2">
              <li>Avertissement formel avec notification d&apos;infraction ;</li>
              <li>Retrait immédiat de l&apos;article non conforme du catalogue public ;</li>
              <li>Limitation de visibilité de la boutique ;</li>
              <li>Suspension temporaire des ventes ;</li>
              <li>Fermeture définitive du compte vendeur et poursuites légales si nécessaire.</li>
            </ol>
          </section>

          <hr className="border-gray-100" />

          {/* Engagement */}
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-6 rounded-2xl text-xs space-y-2 text-center">
            <p className="font-black text-sm text-emerald-800">
              Kalagban — La mode, autrement.
            </p>
            <p className="text-emerald-700">
              Chaque vendeur reconnaît que la confiance des clients constitue l&apos;actif le plus précieux de notre écosystème. En exerçant sur Kalagban, chaque boutique s&apos;engage solennellement à respecter cette Charte.
            </p>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
