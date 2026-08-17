"use client";

import React from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  Award, 
  Store, 
  Truck, 
  RotateCcw, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight
} from "lucide-react";

export default function SellerGuidePage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-purple-50 text-[#6d28d9] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <Award size={32} />
          </div>
          <span className="text-xs font-bold text-[#6d28d9] uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Espace Vendeurs
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Guide du Vendeur Certifié
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xl mx-auto">
            Bien vendre sur Kalagban — Standards, processus et bonnes pratiques pour réussir sur la marketplace de mode de référence.
          </p>
        </div>

        {/* Content Container */}
        <div className="bg-white p-6 sm:p-10 rounded-3xl border border-gray-100 shadow-sm space-y-8 text-sm text-gray-700 leading-relaxed">
          
          {/* Section 1 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">1</span>
              Bienvenue sur Kalagban
            </h2>
            <p>
              Bienvenue sur Kalagban, la marketplace dédiée à la mode.
            </p>
            <p>
              Kalagban permet aux vendeurs, créateurs, boutiques, marques et professionnels de la mode de présenter leurs produits à une clientèle en ligne et de développer leur activité grâce à une plateforme simple, accessible et sécurisée.
            </p>
            <p>
              En devenant vendeur sur Kalagban, vous bénéficiez d&apos;une vitrine digitale pour présenter vos articles, recevoir des commandes et développer votre clientèle.
            </p>
            <p className="font-semibold text-gray-900">
              Notre objectif est de créer une marketplace fiable, dynamique et professionnelle, offrant une expérience de qualité aussi bien aux vendeurs qu&apos;aux acheteurs.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 2 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">2</span>
              Qui peut devenir vendeur ?
            </h2>
            <p>Peut devenir vendeur sur Kalagban :</p>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium text-gray-600 bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Une boutique de vêtements</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Une marque de mode</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Un créateur ou styliste</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Un vendeur indépendant</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Un grossiste ou distributeur</li>
              <li className="flex items-center gap-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Une entreprise spécialisée mode</li>
              <li className="flex items-center gap-2 sm:col-span-2"><CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> Un professionnel proposant des accessoires de mode</li>
            </ul>
            <p className="text-xs text-gray-500">
              Le vendeur doit fournir des informations exactes et respecter les règles de la plateforme. Kalagban se réserve le droit de vérifier les informations fournies avant ou après la validation d&apos;un compte vendeur.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 3 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">3</span>
              Devenir Vendeur Certifié
            </h2>
            <p>
              La certification permet d&apos;identifier les vendeurs qui respectent les standards d&apos;excellence de Kalagban. Pour être certifié, le vendeur doit notamment :
            </p>
            <ol className="list-decimal list-inside space-y-1.5 text-xs text-gray-600 font-medium pl-2">
              <li>Créer son compte vendeur ;</li>
              <li>Renseigner correctement ses informations ;</li>
              <li>Fournir les informations ou justificatifs demandés ;</li>
              <li>Renseigner ses coordonnées de paiement Mobile Money officielles ;</li>
              <li>Accepter les conditions de la marketplace ;</li>
              <li>Respecter la Charte Qualité &amp; Sécurité ;</li>
              <li>Proposer des produits conformes aux règles de Kalagban.</li>
            </ol>
            <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3.5 rounded-xl text-xs font-medium flex items-center gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0" />
              <span>Une certification peut être suspendue ou retirée en cas de non-respect répété des règles.</span>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 4 & 5 */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">4</span>
              Création de votre Boutique &amp; Publication des Produits
            </h2>
            <p>
              Votre boutique représente votre image auprès des clients. Renseignez soigneusement votre logo, nom commercial, description et photos.
            </p>
            <p>
              Chaque produit publié doit comporter : le nom précis, la catégorie, le prix en FCFA, les tailles et couleurs disponibles, la matière, la disponibilité exacte et des photos réelles de haute qualité.
            </p>
            <p className="text-xs text-red-600 font-semibold">
              ⚠️ Les photos et descriptions doivent correspondre fidèlement au produit livré. Il est formellement interdit d&apos;utiliser une présentation trompeuse.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 6 & 7: Commission */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">5</span>
              Commission &amp; Tarification Kalagban
            </h2>
            <div className="bg-purple-50 p-5 rounded-2xl border border-purple-100 space-y-2">
              <p className="font-extrabold text-gray-900 text-sm">
                Kalagban applique une commission de 10 % sur chaque vente réalisée sur la marketplace.
              </p>
              <p className="text-xs text-gray-600">
                Le vendeur doit tenir compte de cette commission dans la détermination de ses prix de vente.
              </p>
              <div className="bg-white p-3 rounded-xl border border-purple-100 text-xs font-medium text-gray-700">
                💡 <strong>Exemple concret :</strong> Pour une vente de 20 000 FCFA, la commission Kalagban de 10 % correspond à 2 000 FCFA. Le montant net revenant au vendeur est de <strong>18 000 FCFA</strong>.
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 8: Paiement Vendeurs */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">6</span>
              Paiement des Vendeurs (Chaque Mercredi)
            </h2>
            <p>
              Les paiements des vendeurs sont effectués <strong>chaque mercredi par Mobile Money</strong> (Wave, Orange Money, MTN MoMo, Moov Money).
            </p>
            <p className="text-xs text-gray-600">
              Le vendeur doit obligatoirement fournir des coordonnées Mobile Money exactes et appartenant au titulaire autorisé du compte vendeur.
            </p>
          </section>

          <hr className="border-gray-100" />

          {/* Section 9, 10, 11: Commandes, Livraison & Retours */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">7</span>
              Traitement des Commandes, Livraison &amp; Retours
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1.5">
                <span className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                  <Store size={16} className="text-[#6d28d9]" /> Commandes
                </span>
                <p className="text-gray-600">
                  Vérifier la commande, préparer l&apos;article avec soin, emballer proprement et remettre au transporteur. Éviter toute annulation injustifiée.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1.5">
                <span className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                  <Truck size={16} className="text-blue-600" /> Livraison
                </span>
                <p className="text-gray-600">
                  Frais de livraison à la charge du client. Délai indicatif de <strong>maximum une semaine</strong>.
                </p>
              </div>

              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 space-y-1.5">
                <span className="font-extrabold text-gray-900 text-sm flex items-center gap-1.5">
                  <RotateCcw size={16} className="text-emerald-600" /> Retours (5 Jours)
                </span>
                <p className="text-gray-600">
                  Le client dispose de <strong>5 jours</strong> pour demander un retour. L&apos;article doit être intact, non porté, non lavé et dans son état d&apos;origine.
                </p>
              </div>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 12, 15: Qualité & Produits Interdits */}
          <section className="space-y-3">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">8</span>
              Qualité &amp; Produits Strictement Interdits
            </h2>
            <p>
              Chaque vendeur est légalement et contractuellement responsable de la conformité des produits commercialisés.
            </p>
            <div className="bg-red-50 text-red-950 p-4 rounded-2xl border border-red-100 text-xs space-y-1.5">
              <p className="font-bold text-red-700">Sont formellement interdits sur Kalagban :</p>
              <p>• Produits contrefaits ou fausses marques</p>
              <p>• Dissimulation d&apos;un défaut majeur</p>
              <p>• Photos d&apos;articles différentes du produit réel</p>
              <p>• Produits dangereux, volés ou illégaux</p>
            </div>
          </section>

          <hr className="border-gray-100" />

          {/* Section 17 & 18: Engagement */}
          <section className="space-y-4">
            <h2 className="text-xl font-extrabold text-gray-900 flex items-center gap-2">
              <span className="w-7 h-7 bg-[#6d28d9] text-white rounded-lg flex items-center justify-center text-xs font-black">9</span>
              Engagement du Vendeur Certifié Kalagban
            </h2>
            <p className="text-xs text-gray-600">
              Un bon vendeur ne vend pas seulement un produit : il construit une réputation durable. Nous invitons chaque vendeur à considérer sa boutique Kalagban comme une véritable vitrine d&apos;excellence.
            </p>

            <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 p-5 rounded-2xl text-xs space-y-2">
              <span className="font-black text-emerald-800 text-sm">✅ En devenant Vendeur Certifié, je m&apos;engage à :</span>
              <ul className="space-y-1 text-emerald-700 font-medium">
                <li>• Fournir des informations authentiques et exactes</li>
                <li>• Vendre des articles 100% conformes et de qualité</li>
                <li>• Respecter les clients et traiter chaque commande avec professionnalisme</li>
                <li>• Respecter les délais de livraison et conditions de retour (5 jours)</li>
                <li>• Préserver la stricte confidentialité des données personnelles des clients</li>
              </ul>
            </div>
          </section>

          {/* CTA Box */}
          <div className="bg-linear-to-br from-[#6d28d9] to-indigo-800 text-white p-6 sm:p-8 rounded-3xl text-center space-y-4 shadow-xl shadow-indigo-600/20">
            <h3 className="text-2xl font-black">Prêt à développer vos ventes sur Kalagban ?</h3>
            <p className="text-xs sm:text-sm text-purple-100 max-w-lg mx-auto">
              Rejoignez dès maintenant la première communauté de vendeurs et créateurs de mode certifiés en Côte d&apos;Ivoire.
            </p>
            <div className="flex flex-wrap justify-center gap-3 pt-2">
              <a
                href={`${process.env.NEXT_PUBLIC_SELLER_URL || "https://seller.kalagban.ci"}/register`}
                target="_blank"
                rel="noreferrer"
                className="bg-white text-[#6d28d9] font-black text-xs sm:text-sm px-6 py-3 rounded-xl shadow-lg hover:bg-purple-50 transition-all inline-flex items-center gap-2"
              >
                Créer ma boutique vendeur <ArrowRight size={16} />
              </a>
              <a
                href={`${process.env.NEXT_PUBLIC_SELLER_URL || "https://seller.kalagban.ci"}/login`}
                target="_blank"
                rel="noreferrer"
                className="bg-purple-900/40 text-white border border-purple-300/30 font-bold text-xs sm:text-sm px-6 py-3 rounded-xl hover:bg-purple-900/60 transition-all"
              >
                Accéder à mon espace vendeur
              </a>
            </div>
          </div>

        </div>

      </main>

      <Footer />
    </div>
  );
}
