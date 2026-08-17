"use client";

/* eslint-disable @next/next/no-img-element */

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  PackageSearch, 
  Eye, 
  AlertTriangle,
  ArrowRight,
  Loader2,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  Clock,
  Sparkles,
  AlertCircle,
  FileCheck2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

import ProductDetailModal, { SellerProduct } from "@/components/products/ProductDetailModal";
import SellerKycModal, { KycData } from "@/components/verification/SellerKycModal";

interface Product {
  id: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  old_price?: number;
  stock_quantity: number;
  status: string;
  sku?: string;
  image_url?: string | null;
  images?: string[];
  shop_name?: string;
}

interface ShopInfo {
  id: string;
  name?: string;
  created_at?: string;
  is_verified?: boolean;
  verified_at?: string;
  kyc_deadline?: string;
  kyc_status?: string;
}

export default function SellerDashboard() {
  const [sellerSlides, setSellerSlides] = useState<string[]>([
    "/img_slide/imgslide1.jpg",
    "/img_slide/imgslide2.jpg",
    "/img_slide/imgslide3.jpg"
  ]);

  const [sellerBannerConfig, setSellerBannerConfig] = useState({
    badge_text: "VOTRE BOUTIQUE EST EN LIGNE",
    title: "Développez votre audience avec Kalagban ✨",
    description: "Consultez vos statistiques en temps réel, gérez vos stocks et expédiez vos commandes rapidement.",
    button_text: "Créer un produit",
  });

  const [currentSlide, setCurrentSlide] = useState(0); 
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProduct, setSelectedProduct] = useState<SellerProduct | null>(null);
  
  // KYC & Shop Verification state
  const [shopInfo, setShopInfo] = useState<ShopInfo | null>(null);
  const [kycInfo, setKycInfo] = useState<KycData | null>(null);
  const [isKycModalOpen, setIsKycModalOpen] = useState(false);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number; isExpired: boolean }>({
    days: 5,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false
  });

  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    productViews: 0, // Placeholder
    outOfStock: 0
  });
  
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);
  
  const loadDashboardData = async () => {
    try {
      // Fetch dynamic seller slides and banner config from site_settings
      const { data: settingsData } = await supabase
        .from('site_settings')
        .select('key, value')
        .in('key', ['seller_slides', 'seller_banner']);

      if (settingsData) {
        settingsData.forEach((row) => {
          if (row.key === 'seller_slides' && Array.isArray(row.value)) {
            setSellerSlides(row.value);
          }
          if (row.key === 'seller_banner' && row.value) {
            setSellerBannerConfig(row.value);
          }
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch Shop & KYC details
      const { data: shop } = await supabase
        .from('shops')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle();

      if (shop) {
        setShopInfo(shop as ShopInfo);
      }

      const { data: kyc } = await supabase
        .from('seller_certifications')
        .select('*')
        .eq('shop_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (kyc) {
        setKycInfo(kyc as KycData);
      }

      // 1. Fetch Orders for stats
      const { data: orders } = await supabase
        .from('orders')
        .select('total_amount, subtotal, status')
        .eq('shop_id', session.user.id);
        
      let sales = 0;
      let orderCount = 0;
      
      if (orders) {
        orderCount = orders.length;
        orders.forEach(o => {
          if (o.status !== 'cancelled') {
            sales += Number(o.subtotal || o.total_amount || 0);
          }
        });
      }

      // 2. Fetch Products for stats and list
      const { data: products } = await supabase
        .from('products')
        .select('*, product_media(url)')
        .eq('shop_id', session.user.id)
        .order('created_at', { ascending: false });

      let outStock = 0;
      if (products) {
        products.forEach(p => {
          if (p.stock_quantity <= 0) outStock++;
        });
        const formatted: Product[] = products.map((p: {
          id: string;
          title: string;
          description?: string;
          category?: string;
          price: number;
          old_price?: number | null;
          stock_quantity: number;
          status: string;
          sku?: string;
          product_media?: { url: string }[];
        }) => ({
          id: p.id,
          title: p.title,
          description: p.description,
          category: p.category,
          price: Number(p.price),
          old_price: p.old_price ? Number(p.old_price) : undefined,
          stock_quantity: p.stock_quantity,
          status: p.status || 'active',
          sku: p.sku,
          image_url: p.product_media && p.product_media.length > 0 ? p.product_media[0].url : null,
          images: p.product_media ? p.product_media.map(m => m.url) : [],
        }));
        setRecentProducts(formatted.slice(0, 3));
      }

      setStats({
        totalSales: sales,
        totalOrders: orderCount,
        productViews: 0,
        outOfStock: outStock
      });

    } catch (error) {
      console.error("Erreur de chargement du dashboard:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((ancienneSlide) => (ancienneSlide + 1) % sellerSlides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, [sellerSlides.length]);

  useEffect(() => {
    setTimeout(() => {
      loadDashboardData();
    }, 0);
  }, []);

  // 5-Day Countdown Timer calculation
  useEffect(() => {
    if (!shopInfo) return;

    const calculateTimeLeft = () => {
      const createdAtTime = new Date(shopInfo.created_at || Date.now()).getTime();
      const deadline = shopInfo.kyc_deadline 
        ? new Date(shopInfo.kyc_deadline).getTime() 
        : createdAtTime + (5 * 24 * 60 * 60 * 1000); // 5 days in ms

      const diff = deadline - Date.now();

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      }
    };

    calculateTimeLeft();
    const interval = setInterval(calculateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [shopInfo]);

  const statCards = [
    { label: "Ventes générées", value: `${stats.totalSales.toLocaleString('fr-FR')} FCFA`, icon: <TrendingUp className="text-primary" size={24} />, bg: "bg-primary/10" },
    { label: "Commandes", value: stats.totalOrders.toString(), icon: <PackageSearch className="text-secondary" size={24} />, bg: "bg-secondary/10" },
    { label: "Vues produits (30j)", value: stats.productViews.toString(), icon: <Eye className="text-blue-500" size={24} />, bg: "bg-blue-500/10" },
    { label: "En rupture", value: stats.outOfStock.toString(), icon: <AlertTriangle className="text-danger" size={24} />, bg: "bg-danger/10" }
  ];

  const isVerified = shopInfo?.is_verified || kycInfo?.status === "approved";
  const kycStatus = kycInfo?.status || shopInfo?.kyc_status || "unsubmitted";

  if (isLoading) {
    return (
      <div className="pb-10 pt-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="text-text-muted font-bold animate-pulse">Chargement de votre boutique...</p>
      </div>
    );
  }

  return (
    <main className="pb-10 pt-4 space-y-6">
      
      {/* ================= KYC CERTIFICATION BANNER ================= */}
      {isVerified ? (
        <div className="bg-linear-to-r from-emerald-500/15 via-teal-500/10 to-emerald-500/5 border border-emerald-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-black shadow-lg shadow-emerald-500/30 shrink-0">
              <ShieldCheck size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                  Vérifié & Certifié
                </span>
                <span className="text-xs font-semibold text-emerald-800">Badge Officiel Activé</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">Boutique Officiellement Certifiée Kalagban 🛡️</h3>
              <p className="text-xs text-gray-600 font-medium">Vos documents ont été validés par le service Conformité. Vos clients achètent en toute confiance.</p>
            </div>
          </div>

          <button
            onClick={() => setIsKycModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-white border border-emerald-200 text-emerald-800 hover:bg-emerald-50 text-xs font-bold transition-all shrink-0 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileCheck2 size={16} /> Voir mon dossier KYC
          </button>
        </div>
      ) : kycStatus === "pending" ? (
        <div className="bg-linear-to-r from-amber-500/15 via-orange-500/10 to-amber-500/5 border border-amber-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-black shadow-lg shadow-amber-500/30 shrink-0">
              <Clock size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-amber-500 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                  En cours d&apos;examen
                </span>
                <span className="text-xs font-semibold text-amber-800">Service Conformité Kalagban</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">Dossier de Certification en Examen ⏳</h3>
              <p className="text-xs text-gray-600 font-medium">Vos pièces justificatives et votre signature ont bien été transmises. Validation sous 24 à 48 heures.</p>
            </div>
          </div>

          <button
            onClick={() => setIsKycModalOpen(true)}
            className="px-5 py-2.5 rounded-xl bg-white border border-amber-200 text-amber-900 hover:bg-amber-50 text-xs font-bold transition-all shrink-0 shadow-xs flex items-center justify-center gap-2 cursor-pointer"
          >
            <FileCheck2 size={16} /> Revoir mon dossier
          </button>
        </div>
      ) : kycStatus === "rejected" ? (
        <div className="bg-linear-to-r from-rose-500/15 via-red-500/10 to-rose-500/5 border border-rose-500/30 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-lg shadow-rose-600/30 shrink-0">
              <ShieldAlert size={28} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2.5 py-0.5 rounded-full shadow-xs">
                  Action Requise
                </span>
                <span className="text-xs font-bold text-rose-700">Dossier non validé</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">Pièces à corriger pour votre certification</h3>
              <p className="text-xs text-rose-800 font-semibold mt-0.5">
                {kycInfo?.admin_notes ? `Motif : "${kycInfo.admin_notes}"` : "Certaines pièces fournies ne sont pas conformes. Veuillez mettre à jour votre dossier."}
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsKycModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shrink-0 shadow-md shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Corriger & Re-soumettre</span>
            <ArrowRight size={16} />
          </button>
        </div>
      ) : timeLeft.isExpired ? (
        /* Délai Dépassé (Non soumis après 5 jours) */
        <div className="bg-linear-to-r from-rose-600/20 via-red-500/15 to-rose-600/10 border-2 border-rose-500 rounded-3xl p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-rose-600/10 animate-pulse">
          <div className="flex items-center gap-4">
            <div className="w-13 h-13 rounded-2xl bg-rose-600 text-white flex items-center justify-center font-black shadow-lg shadow-rose-600/40 shrink-0">
              <AlertCircle size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider bg-rose-600 text-white px-2.5 py-0.5 rounded-full">
                  ⚠️ Délai de 5 Jours Dépassé
                </span>
                <span className="text-xs font-black text-rose-700">Compte en sursis de vérification</span>
              </div>
              <h3 className="text-lg font-black text-gray-900 mt-0.5">Soumettez votre dossier KYC en urgence</h3>
              <p className="text-xs text-gray-700 font-medium">
                Vous n&apos;avez pas transmis vos pièces dans le délai imparti. L&apos;administration se réserve le droit de <strong>suspendre ou supprimer définitivement</strong> votre compte vendeur.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsKycModalOpen(true)}
            className="px-6 py-3 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-black transition-all shrink-0 shadow-lg shadow-rose-600/30 flex items-center justify-center gap-2 cursor-pointer"
          >
            <ShieldCheck size={18} />
            <span>Régulariser Maintenant</span>
          </button>
        </div>
      ) : (
        /* Timer Actif (< 5 jours) */
        <div className="bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-3xl p-5 sm:p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 shadow-xl relative overflow-hidden">
          <div className="absolute right-0 top-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center font-black shrink-0">
              <ShieldCheck size={30} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-300 bg-amber-400/20 px-2.5 py-0.5 rounded-full border border-amber-300/30 flex items-center gap-1">
                  <Sparkles size={11} /> Certification Vendeur
                </span>
                <span className="text-xs font-semibold text-gray-300">Obligatoire sous 5 jours</span>
              </div>
              <h3 className="text-lg font-black text-white mt-0.5">Obtenez votre Badge &apos;Vendeur Certifié Kalagban&apos; 🛡️</h3>
              <p className="text-xs text-gray-300 font-medium">Déposez votre CNI (Recto/Verso), photo gérant, signature et photos de votre boutique physique.</p>
            </div>
          </div>

          {/* Countdown Timer Display */}
          <div className="flex items-center gap-4 relative z-10">
            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md px-4 py-2 rounded-2xl border border-white/15">
              <div className="text-center min-w-9">
                <span className="text-lg font-black text-white">{timeLeft.days}</span>
                <p className="text-[9px] uppercase font-bold text-indigo-200">Jours</p>
              </div>
              <span className="text-white font-black">:</span>
              <div className="text-center min-w-9">
                <span className="text-lg font-black text-white">{String(timeLeft.hours).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase font-bold text-indigo-200">Heures</p>
              </div>
              <span className="text-white font-black">:</span>
              <div className="text-center min-w-9">
                <span className="text-lg font-black text-white">{String(timeLeft.minutes).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase font-bold text-indigo-200">Min</p>
              </div>
              <span className="text-white font-black">:</span>
              <div className="text-center min-w-9">
                <span className="text-lg font-black text-amber-400">{String(timeLeft.seconds).padStart(2, '0')}</span>
                <p className="text-[9px] uppercase font-bold text-amber-300">Sec</p>
              </div>
            </div>

            <button
              onClick={() => setIsKycModalOpen(true)}
              className="px-6 py-3 rounded-2xl bg-indigo-500 hover:bg-indigo-400 text-white font-black text-xs transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2 cursor-pointer hover:scale-102"
            >
              <span>Déposer mon dossier</span>
              <ArrowRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* BANNER PROMO SLIDER */}
      <div className="w-full min-h-95 rounded-card p-8 sm:p-10 flex items-center shadow-lg relative overflow-hidden group bg-gray-900">
        <img 
          src={sellerSlides[currentSlide]} 
          alt="Bannière promo"
          className="absolute inset-0 w-full h-full object-cover transition-all duration-1000 ease-in-out"
        />
        <div className="absolute inset-0 bg-linear-to-r from-black/80 via-black/40 to-transparent"></div>

        <div className="z-10 text-white max-w-md relative">
          <span className="bg-white/20 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider backdrop-blur-md mb-4 inline-flex items-center gap-2 border border-white/10 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_rgba(74,222,128,0.8)]"></span>
            {sellerBannerConfig.badge_text}
          </span>
          <h2 className="text-3xl sm:text-4xl font-extrabold mb-4 leading-tight tracking-tight drop-shadow-md">
            {sellerBannerConfig.title}
          </h2>
          <p className="text-gray-200 text-sm mb-8 line-clamp-2 drop-shadow-sm font-medium">
            {sellerBannerConfig.description}
          </p>
          <Link
            href="/products/new"
            className="bg-white text-gray-950 font-bold px-6 py-3 rounded-full hover:bg-gray-100 transition-all inline-flex items-center gap-2 shadow-xl hover:shadow-2xl hover:scale-105 active:scale-95"
          >
            {sellerBannerConfig.button_text} <ArrowRight size={18} />
          </Link>
        </div>
      </div>

      {/* STATS OVERVIEW */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((stat, i) => (
          <div key={i} className="bg-surface p-6 rounded-card border border-gray-100 shadow-soft flex items-center gap-4 hover:border-gray-200 transition-colors">
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${stat.bg}`}>
              {stat.icon}
            </div>
            <div>
              <p className="text-text-muted text-xs font-bold">{stat.label}</p>
              <h3 className="text-2xl font-black text-text-main tracking-tight mt-1">{stat.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* RECENT PRODUCTS PREVIEW */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-text-main">Produits récemment ajoutés</h2>
          <Link href="/products" className="text-primary text-sm font-bold hover:underline flex items-center gap-1">
            Voir tout le catalogue <ArrowRight size={14} />
          </Link>
        </div>

        {recentProducts.length === 0 ? (
          <div className="bg-surface border border-gray-100 rounded-card p-10 text-center flex flex-col items-center justify-center gap-3">
            <div className="w-12 h-12 rounded-full bg-gray-50 flex items-center justify-center text-text-muted">
              <PackageSearch size={24} />
            </div>
            <h3 className="font-bold text-text-main">Aucun produit pour l&apos;instant</h3>
            <p className="text-text-muted text-xs max-w-sm">Commencez à ajouter vos premiers articles pour les vendre sur Kalagban.</p>
            <Link href="/products/new" className="mt-2 text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-xl hover:bg-primary/20 transition-colors">
              Ajouter un produit
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {recentProducts.map((p) => (
              <div key={p.id} className="bg-surface border border-gray-100 rounded-card p-4 shadow-soft flex flex-col justify-between group hover:border-gray-200 transition-colors">
                <div>
                  <div className="w-full aspect-square rounded-xl bg-gray-50 mb-3 overflow-hidden relative border border-gray-100/50 flex items-center justify-center">
                    {p.image_url ? (
                      <img src={p.image_url} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <ImageIcon className="text-gray-300" size={32} />
                    )}
                    {p.old_price && p.old_price > p.price && (
                      <span className="absolute top-2 left-2 bg-danger text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-xs">
                        -{Math.round(((p.old_price - p.price) / p.old_price) * 100)}%
                      </span>
                    )}
                    <button 
                      onClick={() => setSelectedProduct(p as unknown as SellerProduct)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-full bg-white/80 backdrop-blur-xs text-text-main flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-xs hover:bg-white cursor-pointer"
                      title="Aperçu rapide"
                    >
                      <Eye size={14} />
                    </button>
                  </div>
                  <h4 className="font-bold text-text-main text-sm line-clamp-1 mb-1">{p.title}</h4>
                  <p className="text-text-muted text-xs mb-3">{p.category || "Général"}</p>
                </div>

                <div className="flex items-center justify-between border-t border-gray-100 pt-3 mt-auto">
                  <div>
                    {p.old_price && (
                      <p className="text-[10px] text-text-muted line-through">
                        {p.old_price.toLocaleString('fr-FR')} FCFA
                      </p>
                    )}
                    <p className="font-black text-text-main text-sm">
                      {p.price.toLocaleString('fr-FR')} FCFA
                    </p>
                  </div>

                  <Link 
                    href={`/products/${p.id}/edit`}
                    className="text-xs font-bold text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-xl transition-colors inline-flex items-center gap-1"
                  >
                    Gérer <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* QUICK PREVIEW MODAL */}
      <ProductDetailModal 
        product={selectedProduct} 
        onClose={() => setSelectedProduct(null)} 
      />

      {/* KYC VERIFICATION MODAL */}
      {shopInfo && (
        <SellerKycModal
          isOpen={isKycModalOpen}
          onClose={() => setIsKycModalOpen(false)}
          shopId={shopInfo.id}
          shopName={shopInfo.name || "Ma Boutique"}
          existingKyc={kycInfo}
          onSuccess={() => {
            loadDashboardData();
          }}
        />
      )}

    </main>
  );
}
