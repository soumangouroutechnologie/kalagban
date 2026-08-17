"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Lock, CheckCircle2 } from "lucide-react";

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <Lock size={32} />
          </div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-widest bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
            Vie Privée &amp; Données
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Politique de Protection des Données Personnelles
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xl mx-auto">
            Kalagban Marketplace — Conformité avec la loi ivoirienne n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel.
          </p>
        </div>

        {/* Content Box */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">1</span>
              Notre Engagement &amp; Cadre Légal Ivoirien
            </h2>
            <p>
              Kalagban accorde une importance capitale à la protection de la vie privée et des données personnelles de l&apos;ensemble de ses acheteurs et vendeurs.
            </p>
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-950 p-4 rounded-2xl text-xs space-y-1">
              <p className="font-bold text-emerald-800">🏛️ Référence légale ARTCI (Côte d&apos;Ivoire) :</p>
              <p>
                La présente politique est rédigée en stricte conformité avec la <strong>loi n° 2013-450 du 19 juin 2013</strong> relative à la protection des données à caractère personnel en République de Côte d&apos;Ivoire, garantissant les principes fondamentaux de finalité, de proportionnalité, de transparence et de sécurité des traitements.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2, 3, 4: Données collectées & Finalités */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">2</span>
              Données Collectées et Finalités d&apos;Utilisation
            </h2>
            <p>Selon votre utilisation des services Kalagban, nous collectons les données strictement nécessaires :</p>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                <span className="font-bold text-gray-900">Pour les Acheteurs :</span>
                <p className="text-gray-600">• Nom et prénom</p>
                <p className="text-gray-600">• Numéro de téléphone</p>
                <p className="text-gray-600">• Adresse et commune de livraison</p>
                <p className="text-gray-600">• Historique et reçus de commandes</p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1">
                <span className="font-bold text-gray-900">Pour les Vendeurs :</span>
                <p className="text-gray-600">• Identité et nom commercial de boutique</p>
                <p className="text-gray-600">• Numéro de téléphone et email</p>
                <p className="text-gray-600">• Coordonnées de versement Mobile Money</p>
                <p className="text-gray-600">• Catalogue produits et historique des ventes</p>
              </div>
            </div>

            <p className="text-xs text-gray-600">
              <strong>Finalités :</strong> Traitement des commandes, acheminement par les livreurs et Points Relais, sécurisation des transactions, service après-vente et respect des obligations légales.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 6 & 7: Partage & Sécurité des paiements */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">3</span>
              Partage Restreint &amp; Données de Paiement
            </h2>
            <p>
              Les données personnelles ne sont jamais vendues, cédées ou louées à des tiers. Elles ne sont transmises qu&apos;aux prestataires indispensables à l&apos;exécution de la commande (transporteurs agréés, opérateurs Mobile Money et hébergeurs sécurisés).
            </p>
            <div className="bg-purple-50 border border-purple-200 text-purple-950 p-4 rounded-2xl text-xs space-y-1">
              <span className="font-bold text-purple-900">🔒 Règle absolue de sécurité Mobile Money :</span>
              <p>
                Kalagban ne vous demandera <strong>JAMAIS</strong> de communiquer votre code secret Mobile Money ou votre mot de passe. Les paiements sont sécurisés par les passerelles officielles agréées.
              </p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 8, 9, 10: Droits & ARTCI */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">4</span>
              Vos Droits (Accès, Rectification, Suppression)
            </h2>
            <p>
              Conformément à la réglementation ivoirienne de protection des données, tout utilisateur bénéficie des droits suivants :
            </p>
            <ul className="space-y-1.5 text-xs text-gray-600 font-medium pl-2">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> <strong>Droit d&apos;accès :</strong> Obtenir communication des données vous concernant.</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> <strong>Droit de rectification :</strong> Mettre à jour ou corriger des informations erronées.</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> <strong>Droit de suppression :</strong> Demander l&apos;effacement de vos données lorsque leur conservation n&apos;est plus légalement requise.</li>
            </ul>
          </section>

          <hr className="border-gray-100" />

          {/* Section 11 & 17: Contact DPO */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center text-xs font-black">5</span>
              Exercice des Droits &amp; Contact Délégué à la Protection des Données
            </h2>
            <p>
              Pour exercer vos droits ou poser toute question relative au traitement de vos données personnelles sur Kalagban, vous pouvez contacter notre service dédié :
            </p>
            <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 text-xs text-gray-700 space-y-1 font-medium">
              <p>• Délégué à la Protection des Données : <strong>Service Confidentialité Kalagban</strong></p>
              <p>• Email officiel : <strong>contact@kalagban.ci</strong></p>
              <p>• Adresse : <strong>Abidjan, Côte d&apos;Ivoire</strong></p>
            </div>
          </section>

        </div>

      </main>

      <Footer />
    </div>
  );
}
