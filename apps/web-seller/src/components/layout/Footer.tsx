"use client";

import React from "react";
import Link from "next/link";
import { HelpCircle, Mail, Phone } from "lucide-react";

export default function Footer() {
  return (
    <footer className="mt-12 mb-6 bg-white rounded-card shadow-sm border border-gray-100 overflow-hidden">
      {/* Top Section */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8 p-8 border-b border-gray-100">
        {/* Brand Col */}
        <div className="col-span-1 md:col-span-2">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-linear-to-tr from-primary to-secondary rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-md">
              K
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-main">Kalagban Vendeur</h2>
          </div>
          <p className="text-sm text-text-muted max-w-sm mb-6 leading-relaxed">
            La plateforme numéro 1 pour gérer vos ventes, développer votre activité et toucher des milliers de clients à travers le pays.
          </p>
          <div className="flex items-center gap-4">
            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-primary/10 hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-primary/10 hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 4s-.7 2.1-2 3.4c1.6 10-9.4 17.3-18 11.6 2.2.1 4.4-.6 6-2C3 15.5.5 9.6 3 5c2.2 2.6 5.6 4.1 9 4-.9-4.2 4-6.6 7-3.8 1.1 0 3-1.2 3-1.2z"></path></svg>
            </a>
            <a href="#" className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-500 hover:bg-primary/10 hover:text-primary transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>
            </a>
          </div>
        </div>

        {/* Links Col 1 */}
        <div>
          <h3 className="font-bold text-text-main mb-4">Ressources</h3>
          <ul className="flex flex-col gap-3 text-sm text-text-muted">
            <li><Link href="/guide" className="hover:text-primary transition-colors">Guide du vendeur</Link></li>
            <li><Link href="/faq" className="hover:text-primary transition-colors">Foire aux questions</Link></li>
            <li><Link href="/blog" className="hover:text-primary transition-colors">Astuces de vente</Link></li>
            <li><Link href="/api" className="hover:text-primary transition-colors">Documentation API</Link></li>
          </ul>
        </div>

        {/* Contact Col */}
        <div>
          <h3 className="font-bold text-text-main mb-4">Assistance</h3>
          <ul className="flex flex-col gap-3 text-sm text-text-muted">
            <li className="flex items-center gap-2">
              <HelpCircle size={16} className="text-primary" />
              <Link href="/support" className="hover:text-primary transition-colors">Centre de support</Link>
            </li>
            <li className="flex items-center gap-2">
              <Mail size={16} className="text-primary" />
              <a href="mailto:support@kalagban.com" className="hover:text-primary transition-colors">support@kalagban.com</a>
            </li>
            <li className="flex items-center gap-2">
              <Phone size={16} className="text-primary" />
              <span>+225 01 02 03 04 05</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Bottom Section */}
      <div className="p-6 bg-gray-50/50 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-medium text-text-muted">
        <div>
          &copy; {new Date().getFullYear()} Kalagban Marketplace. Tous droits réservés.
        </div>
        <div className="flex items-center gap-6">
          <Link href="/terms" className="hover:text-text-main transition-colors">Conditions d&apos;utilisation</Link>
          <Link href="/privacy" className="hover:text-text-main transition-colors">Politique de confidentialité</Link>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-white rounded-md border border-gray-200 cursor-pointer hover:border-primary/30 transition-colors">
            <span className="w-4 h-4 rounded-full bg-blue-100 overflow-hidden flex items-center justify-center text-[10px]">🇫🇷</span>
            <span>Français</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
