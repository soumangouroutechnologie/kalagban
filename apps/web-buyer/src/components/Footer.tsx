/* eslint-disable @next/next/no-img-element */
"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Phone, Mail, MapPin, MessageCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface FooterContactConfig {
  address: string;
  phone: string;
  email: string;
  about_text?: string;
}

interface SocialLinksConfig {
  whatsapp?: string;
  facebook?: string;
  instagram?: string;
  tiktok?: string;
}

export default function Footer() {
  const [contact, setContact] = useState<FooterContactConfig>({
    address: "Abidjan, Côte d'Ivoire",
    phone: "+225 07 00 00 00 00",
    email: "contact@kalagban.ci",
    about_text: "La plateforme e-commerce n°1 connectant les acheteurs aux meilleurs commerçants et vendeurs certifiés en Côte d'Ivoire.",
  });

  const [socials, setSocials] = useState<SocialLinksConfig>({
    whatsapp: "+2250700000000",
    facebook: "https://facebook.com/kalagban",
    instagram: "https://instagram.com/kalagban",
    tiktok: "https://tiktok.com/@kalagban",
  });

  const fetchFooterData = async () => {
    try {
      const { data } = await supabase.from("site_settings").select("key, value");
      if (data) {
        data.forEach((row) => {
          if (row.key === "footer_contact" && row.value) {
            setContact((prev) => ({ ...prev, ...(row.value as FooterContactConfig) }));
          }
          if (row.key === "social_links" && row.value) {
            setSocials((prev) => ({ ...prev, ...(row.value as SocialLinksConfig) }));
          }
        });
      }
    } catch (err) {
      console.warn("Footer fetch settings warning:", err);
    }
  };

  useEffect(() => {
    fetchFooterData();

    const channel = supabase
      .channel("public_footer_settings")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        fetchFooterData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <footer className="bg-white text-gray-900 pt-12 pb-10 mt-16 border-t border-gray-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Useful Links Grid Section */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 pb-12 border-b border-gray-100">
          
          {/* Column 1: About Kalagban */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[#6d28d9] rounded-xl flex items-center justify-center text-white font-black text-base shadow-xs">
                K
              </div>
              <span className="font-extrabold text-gray-900 text-lg tracking-tight">Kalagban</span>
            </div>
            
            <p className="text-xs text-gray-500 font-medium leading-relaxed">
              {contact.about_text || "La plateforme e-commerce n°1 connectant les acheteurs aux meilleurs commerçants et vendeurs certifiés en Côte d'Ivoire."}
            </p>

            <div className="space-y-2 text-xs text-gray-500 font-medium pt-1">
              <div className="flex items-center gap-2.5">
                <MapPin size={15} className="text-[#6d28d9] shrink-0" />
                <span>{contact.address}</span>
              </div>
              <div className="flex items-center gap-2.5">
                <Phone size={15} className="text-[#6d28d9] shrink-0" />
                <a href={`tel:${contact.phone}`} className="hover:text-[#6d28d9] transition-colors">
                  {contact.phone}
                </a>
              </div>
              <div className="flex items-center gap-2.5">
                <Mail size={15} className="text-[#6d28d9] shrink-0" />
                <a href={`mailto:${contact.email}`} className="hover:text-[#6d28d9] transition-colors">
                  {contact.email}
                </a>
              </div>
            </div>

            {/* Dynamic Social Icons */}
            <div className="flex items-center gap-3 pt-2">
              {socials.whatsapp && (
                <a
                  href={`https://wa.me/${socials.whatsapp.replace(/[^0-9]/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center hover:bg-emerald-600 hover:text-white transition-all shadow-2xs"
                  title="WhatsApp Support"
                >
                  <MessageCircle size={15} />
                </a>
              )}
              {socials.facebook && (
                <a
                  href={socials.facebook}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center hover:bg-blue-600 hover:text-white transition-all shadow-2xs"
                  title="Facebook"
                >
                  <span className="font-extrabold text-xs">f</span>
                </a>
              )}
              {socials.instagram && (
                <a
                  href={socials.instagram}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-pink-50 text-pink-600 flex items-center justify-center hover:bg-pink-600 hover:text-white transition-all shadow-2xs"
                  title="Instagram"
                >
                  <span className="font-extrabold text-xs">IG</span>
                </a>
              )}
              {socials.tiktok && (
                <a
                  href={socials.tiktok}
                  target="_blank"
                  rel="noreferrer"
                  className="w-8 h-8 rounded-full bg-slate-100 text-slate-900 flex items-center justify-center hover:bg-slate-900 hover:text-white transition-all shadow-2xs"
                  title="TikTok"
                >
                  <span className="font-extrabold text-xs">TK</span>
                </a>
              )}
            </div>
          </div>

          {/* Column 2: Client Navigation */}
          <div>
            <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider mb-4">
              Navigation Client
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-medium">
              <li>
                <Link href="/" className="hover:text-[#6d28d9] transition-colors">
                  Page d&apos;accueil
                </Link>
              </li>
              <li>
                <a href="#catalogue" className="hover:text-[#6d28d9] transition-colors">
                  Catalogue Produits
                </a>
              </li>
              <li>
                <Link href="/account" className="hover:text-[#6d28d9] transition-colors">
                  Mon Compte Client
                </Link>
              </li>
              <li>
                <Link href="/account?tab=orders" className="hover:text-[#6d28d9] transition-colors">
                  Suivi de mes Commandes
                </Link>
              </li>
              <li>
                <Link href="/account?tab=wishlist" className="hover:text-[#6d28d9] transition-colors">
                  Mes Produits Favoris
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Espace Vendeurs */}
          <div>
            <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider mb-4">
              Espace Vendeurs
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-medium">
              <li>
                <a 
                  href={`${process.env.NEXT_PUBLIC_SELLER_URL || "https://seller.kalagban.ci"}/register`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-[#6d28d9] transition-colors flex items-center gap-1.5 font-bold text-[#6d28d9]"
                >
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Devenir Vendeur Kalagban
                </a>
              </li>
              <li>
                <a 
                  href={`${process.env.NEXT_PUBLIC_SELLER_URL || "https://seller.kalagban.ci"}/login`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="hover:text-[#6d28d9] transition-colors"
                >
                  Portail Vendeur (Connexion)
                </a>
              </li>
              <li>
                <Link href="/seller-guide" className="hover:text-[#6d28d9] transition-colors">
                  Guide du Vendeur Certifié
                </Link>
              </li>
              <li>
                <Link href="/quality-charter" className="hover:text-[#6d28d9] transition-colors">
                  Charte Qualité &amp; Sécurité
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 4: Aide & Informations */}
          <div>
            <h4 className="font-extrabold text-sm text-gray-900 uppercase tracking-wider mb-4">
              Aide &amp; Informations
            </h4>
            <ul className="space-y-2.5 text-xs text-gray-500 font-medium">
              <li>
                <Link href="/faq" className="hover:text-[#6d28d9] transition-colors">
                  Centre d&apos;Aide &amp; FAQ
                </Link>
              </li>
              <li>
                <Link href="/shipping-policy" className="hover:text-[#6d28d9] transition-colors">
                  Politique de Livraison
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#6d28d9] transition-colors">
                  Conditions Générales d&apos;Utilisation (CGU)
                </Link>
              </li>
              <li>
                <Link href="/privacy-policy" className="hover:text-[#6d28d9] transition-colors">
                  Protection des Données Personnelles
                </Link>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-gray-400 font-medium">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-gray-900 text-sm">Kalagban Marketplace</span>
            <span>— © {new Date().getFullYear()} Tous droits réservés.</span>
          </div>

          {/* Official Mobile Money Logos */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="font-bold text-gray-600">Moyens de paiement acceptés :</span>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-7 bg-white rounded-lg border border-gray-200 p-0.5 shadow-2xs flex items-center justify-center overflow-hidden hover:scale-105 transition-transform" title="Wave Côte d'Ivoire">
                <img src="/waveci.png" alt="Wave" className="w-full h-full object-contain rounded-md" />
              </div>
              <div className="w-10 h-7 bg-white rounded-lg border border-gray-200 p-0.5 shadow-2xs flex items-center justify-center overflow-hidden hover:scale-105 transition-transform" title="Orange Money Côte d'Ivoire">
                <img src="/omci.png" alt="Orange Money" className="w-full h-full object-contain rounded-md" />
              </div>
              <div className="w-10 h-7 bg-white rounded-lg border border-gray-200 p-0.5 shadow-2xs flex items-center justify-center overflow-hidden hover:scale-105 transition-transform" title="MTN Mobile Money">
                <img src="/mtnci.webp" alt="MTN MoMo" className="w-full h-full object-contain rounded-md" />
              </div>
              <div className="w-10 h-7 bg-white rounded-lg border border-gray-200 p-0.5 shadow-2xs flex items-center justify-center overflow-hidden hover:scale-105 transition-transform" title="Moov Money Côte d'Ivoire">
                <img src="/moovci.png" alt="Moov Money" className="w-full h-full object-contain rounded-md" />
              </div>
              <span className="bg-gray-100 text-gray-700 font-extrabold px-2.5 py-1 rounded-lg text-[10px] border border-gray-200 shadow-2xs">
                CASH
              </span>
            </div>
          </div>
        </div>

      </div>
    </footer>
  );
}
