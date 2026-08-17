"use client";

import React, { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { 
  HelpCircle, 
  ChevronDown, 
  Phone, 
  User, 
  ShoppingBag, 
  Package, 
  Truck, 
  RotateCcw, 
  Store, 
  ShieldCheck, 
  Mail, 
  Search,
  LucideIcon
} from "lucide-react";

interface FAQCategory {
  id: string;
  title: string;
  icon: LucideIcon;
  items: { q: string; a: string }[];
}

export default function FAQPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [openItems, setOpenItems] = useState<Record<string, boolean>>({
    "compte-0": true,
    "achats-0": true,
    "livraison-0": true,
    "retours-0": true,
  });

  const toggleItem = (key: string) => {
    setOpenItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const categories: FAQCategory[] = [
    {
      id: "compte",
      title: "Gestion du Compte",
      icon: User,
      items: [
        {
          q: "Comment créer un compte sur Kalagban ?",
          a: "Rendez-vous sur l'application ou le site Kalagban, cliquez sur 'Mon Compte' ou 'Se connecter', puis suivez les étapes d'inscription rapide avec votre numéro de téléphone ou votre adresse email."
        },
        {
          q: "Puis-je modifier mes informations personnelles ?",
          a: "Oui, vos informations (nom, adresses de livraison, numéro de téléphone) peuvent être modifiées à tout moment depuis votre espace 'Mon Compte Client'."
        },
        {
          q: "J'ai oublié mon mot de passe. Comment faire ?",
          a: "Utilisez la fonction 'Mot de passe oublié' ou optez pour la connexion instantanée par code de sécurité OTP envoyé sur votre téléphone."
        }
      ]
    },
    {
      id: "achats",
      title: "Achats & Catalogue",
      icon: ShoppingBag,
      items: [
        {
          q: "Comment acheter un article sur Kalagban ?",
          a: "Sélectionnez le produit qui vous plaît, choisissez votre taille et couleur parmi les options disponibles, ajoutez-le au panier puis suivez les étapes de validation du checkout."
        },
        {
          q: "Puis-je acheter plusieurs articles auprès de différentes boutiques ?",
          a: "Oui ! Vous pouvez combiner des articles de différentes boutiques dans votre panier. Les commandes seront regroupées pour votre confort de livraison."
        },
        {
          q: "Comment connaître les caractéristiques détaillées d'un article ?",
          a: "Consultez la fiche descriptive du produit qui précise la composition textile, la coupe, le guide des tailles et les instructions d'entretien fournies par le vendeur certifié."
        }
      ]
    },
    {
      id: "commandes",
      title: "Commandes & Suivi",
      icon: Package,
      items: [
        {
          q: "Comment savoir si ma commande est confirmée ?",
          a: "Dès validation de votre commande, vous recevez une confirmation instantanée à l'écran ainsi qu'un suivi en direct dans votre espace 'Suivi de mes Commandes'."
        },
        {
          q: "Puis-je annuler ma commande ?",
          a: "L'annulation dépend de l'état d'avancement de la préparation. Si la commande n'a pas encore été expédiée par le vendeur, contactez rapidement le support client officiel."
        },
        {
          q: "Que faire si je reçois un mauvais article ou une taille non conforme ?",
          a: "Contactez immédiatement le support Kalagban en précisant votre numéro de commande et en joignant des photos du produit reçu pour déclencher la procédure de remplacement ou de retour."
        }
      ]
    },
    {
      id: "livraison",
      title: "Livraison & Délais",
      icon: Truck,
      items: [
        {
          q: "Qui paie les frais de livraison ?",
          a: "Les frais de livraison sont à la charge du client selon le mode choisi (Point Relais économique à 500 FCFA ou Livraison express à domicile)."
        },
        {
          q: "Quel est le délai indicatif de livraison ?",
          a: "Le délai indicatif de livraison est d'environ 24h à 48h sur Abidjan et de maximum une semaine pour l'ensemble des destinations, sous réserve des conditions logistiques."
        },
        {
          q: "Que faire si ma commande subit un retard ?",
          a: "Contactez le support Kalagban avec votre référence de commande afin que notre équipe logistique effectue un traçage immédiat auprès du transporteur ou du Point Relais."
        }
      ]
    },
    {
      id: "retours",
      title: "Politique de Retours (5 Jours)",
      icon: RotateCcw,
      items: [
        {
          q: "Puis-je retourner un article et sous quel délai ?",
          a: "Oui, vous disposez d'un délai légal de 5 jours suivant la réception pour formuler une demande de retour."
        },
        {
          q: "Puis-je retourner un article que j'ai déjà porté ou lavé ?",
          a: "Non. Pour des raisons d'hygiène et de conformité, tout article retourné doit impérativement être intact, non porté, non lavé, non dégradé et dans son emballage d'origine."
        },
        {
          q: "Puis-je retourner un article déchiré ou dégradé ?",
          a: "Non, sauf si la dégradation existait avant la réception et qu'elle a été immédiatement constatée et signalée avec photos lors de la livraison."
        }
      ]
    },
    {
      id: "vendeurs",
      title: "Espace Vendeurs",
      icon: Store,
      items: [
        {
          q: "Comment devenir vendeur sur Kalagban ?",
          a: "Créez votre espace vendeur sur notre portail dédié en fournissant les justificatifs d'activité demandés. Notre équipe valide votre boutique sous 24h ouvrées."
        },
        {
          q: "Combien coûte la vente sur Kalagban (Commission) ?",
          a: "Kalagban applique une commission transparente de 10 % sur chaque vente réalisée sur la marketplace."
        },
        {
          q: "Quand et comment les vendeurs sont-ils payés ?",
          a: "Les versements des vendeurs sont effectués chaque mercredi par Mobile Money (Wave, Orange Money, MTN MoMo, Moov Money) pour les ventes livrées et validées."
        },
        {
          q: "Que se passe-t-il si un vendeur ne respecte pas la charte ?",
          a: "Kalagban peut retirer les produits litigieux, restreindre la visibilité de la boutique ou suspendre définitivement le compte en cas de récidive."
        }
      ]
    },
    {
      id: "securite",
      title: "Sécurité & Confidentialité",
      icon: ShieldCheck,
      items: [
        {
          q: "Kalagban me demandera-t-il mon code secret Mobile Money ?",
          a: "JAMAIS ! Aucun membre de l'équipe Kalagban ne vous demandera votre mot de passe, code OTP ou code secret Mobile Money. Ne les communiquez jamais à qui que ce soit."
        },
        {
          q: "Mes données personnelles sont-elles protégées et vendues ?",
          a: "Vos données sont strictement protégées conformément à la loi ivoirienne n° 2013-450 sur la protection des données personnelles. Kalagban ne vend JAMAIS les informations de ses utilisateurs."
        },
        {
          q: "Comment signaler un produit suspect ou une contrefaçon ?",
          a: "Utilisez le bouton de signalement disponible sur chaque fiche produit ou contactez directement l'équipe de modération à contact@kalagban.ci."
        }
      ]
    }
  ];

  const filteredCategories = categories.map(cat => ({
    ...cat,
    items: cat.items.filter(
      item => 
        item.q.toLowerCase().includes(searchTerm.toLowerCase()) || 
        item.a.toLowerCase().includes(searchTerm.toLowerCase())
    )
  })).filter(cat => cat.items.length > 0);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans">
      <Header searchTerm="" onSearchChange={() => {}} />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12 space-y-10">
        
        {/* Hero Header */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-purple-50 text-[#6d28d9] rounded-3xl flex items-center justify-center mx-auto shadow-sm">
            <HelpCircle size={32} />
          </div>
          <span className="text-xs font-bold text-[#6d28d9] uppercase tracking-widest bg-purple-50 px-3 py-1 rounded-full border border-purple-100">
            Support &amp; FAQ
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight">
            Centre d&apos;Aide &amp; Foire Aux Questions
          </h1>
          <p className="text-sm sm:text-base text-gray-500 font-medium max-w-xl mx-auto">
            Trouvez rapidement toutes les réponses à vos questions concernant votre compte, vos achats, vos livraisons et vos ventes sur Kalagban.
          </p>

          {/* Search bar */}
          <div className="max-w-md mx-auto pt-4 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input
              type="text"
              placeholder="Rechercher une question (ex: retour, livraison, paiement...)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl text-xs sm:text-sm font-medium focus:outline-none focus:ring-2 focus:ring-[#6d28d9] shadow-xs"
            />
          </div>
        </div>

        {/* FAQ Categories & Accordions */}
        <div className="space-y-8">
          {filteredCategories.map((category) => {
            const Icon = category.icon;
            return (
              <div key={category.id} className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm space-y-4">
                <h2 className="text-lg font-extrabold text-gray-900 flex items-center gap-2.5 pb-2 border-b border-gray-100">
                  <div className="w-8 h-8 rounded-xl bg-purple-50 text-[#6d28d9] flex items-center justify-center">
                    <Icon size={18} />
                  </div>
                  {category.title}
                </h2>

                <div className="space-y-3">
                  {category.items.map((item, idx) => {
                    const itemKey = `${category.id}-${idx}`;
                    const isOpen = !!openItems[itemKey];

                    return (
                      <div 
                        key={idx} 
                        className={`rounded-2xl border transition-all ${
                          isOpen ? "bg-purple-50/40 border-purple-100" : "bg-gray-50/60 border-gray-100 hover:border-gray-200"
                        }`}
                      >
                        <button
                          onClick={() => toggleItem(itemKey)}
                          className="w-full p-4 text-left flex items-center justify-between gap-4 font-bold text-xs sm:text-sm text-gray-900"
                        >
                          <span>{item.q}</span>
                          <ChevronDown 
                            size={18} 
                            className={`text-gray-400 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180 text-[#6d28d9]" : ""}`} 
                          />
                        </button>

                        {isOpen && (
                          <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-gray-600 font-medium leading-relaxed border-t border-purple-100/50">
                            {item.a}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Contact Support Card */}
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm text-center space-y-4">
          <div className="w-12 h-12 bg-purple-50 text-[#6d28d9] rounded-2xl flex items-center justify-center mx-auto">
            <Phone size={24} />
          </div>
          <h3 className="text-xl font-extrabold text-gray-900">Vous ne trouvez pas la réponse à votre question ?</h3>
          <p className="text-xs text-gray-500 font-medium max-w-md mx-auto">
            Notre équipe d&apos;assistance est à votre entière disposition. Avant de contacter le support, préparez votre nom, téléphone et numéro de commande.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4 pt-2 text-xs font-bold text-gray-800">
            <a 
              href="mailto:contact@kalagban.ci" 
              className="px-5 py-2.5 rounded-xl bg-gray-50 hover:bg-gray-100 border border-gray-200 transition-colors flex items-center gap-2"
            >
              <Mail size={16} className="text-[#6d28d9]" /> contact@kalagban.ci
            </a>
            <a 
              href="tel:+2250700000000" 
              className="px-5 py-2.5 rounded-xl bg-[#6d28d9] text-white hover:bg-purple-800 shadow-sm transition-colors flex items-center gap-2"
            >
              <Phone size={16} /> Service Client Kalagban
            </a>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
