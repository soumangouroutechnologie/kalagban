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
  Image as ImageIcon
} from "lucide-react";
import { supabase } from "@/lib/supabase";

import ProductDetailModal, { SellerProduct } from "@/components/products/ProductDetailModal";

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
  
  const [stats, setStats] = useState({
    totalSales: 0,
    totalOrders: 0,
    productViews: 0, // Placeholder until view tracking is implemented
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
        productViews: 0, // Placeholder
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

  const statCards = [
    { label: "Ventes générées", value: `${stats.totalSales.toLocaleString('fr-FR')} FCFA`, icon: <TrendingUp className="text-primary" size={24} />, bg: "bg-primary/10" },
    { label: "Commandes", value: stats.totalOrders.toString(), icon: <PackageSearch className="text-secondary" size={24} />, bg: "bg-secondary/10" },
    { label: "Vues produits (30j)", value: stats.productViews.toString(), icon: <Eye className="text-blue-500" size={24} />, bg: "bg-blue-500/10" },
    { label: "En rupture", value: stats.outOfStock.toString(), icon: <AlertTriangle className="text-danger" size={24} />, bg: "bg-danger/10" }
  ];

  if (isLoading) {
    return (
      <div className="pb-10 pt-4 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="animate-spin text-primary w-12 h-12 mb-4" />
        <p className="text-text-muted font-bold animate-pulse">Chargement de votre boutique...</p>
      </div>
    );
  }

  return (
    <main className="pb-10 pt-4">
      {/* BANNER PROMO */}
      <div className="w-full min-h-95 rounded-card mb-10 p-8 sm:p-10 flex items-center shadow-lg relative overflow-hidden group bg-gray-900">
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
          <h2 className="text-4xl sm:text-5xl font-black mb-4 leading-tight drop-shadow-md">{sellerBannerConfig.title}</h2>
          <p className="opacity-90 mb-8 text-lg font-medium drop-shadow-sm leading-relaxed">{sellerBannerConfig.description}</p>
          <Link href="/products/new" className="bg-white text-primary px-8 py-3.5 rounded-xl font-black shadow-xl shadow-black/20 hover:scale-105 hover:bg-gray-50 transition-all flex items-center gap-2 w-fit">
            {sellerBannerConfig.button_text} <ArrowRight size={18} />
          </Link>
        </div>
        
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/10 rounded-full blur-3xl transform translate-x-1/3 -translate-y-1/3 group-hover:scale-110 transition-transform duration-700"></div>
      </div>

      {/* QUICK STATS */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-text-main tracking-tight">Aperçu de la boutique</h3>
        <Link href="/orders" className="text-primary text-sm font-bold cursor-pointer hover:underline">Voir les détails</Link>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((stat, i) => (
          <div key={i} className="card p-6 flex flex-col gap-3 group cursor-pointer border border-transparent hover:border-primary/10">
            <div className={`w-12 h-12 rounded-2xl ${stat.bg} flex items-center justify-center transition-transform group-hover:scale-110`}>
              {stat.icon}
            </div>
            <div className="mt-2 flex flex-col">
              <span className="text-text-muted text-sm font-semibold mb-1">{stat.label}</span>
              <span className="text-3xl font-extrabold text-text-main tracking-tight">{stat.value}</span>
            </div>
          </div>
        ))}
      </div>

      {/* PRODUCTS GRID */}
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-2xl font-bold text-text-main tracking-tight">Produits récemment ajoutés</h3>
        <Link href="/products" className="text-primary text-sm font-bold cursor-pointer hover:underline">Voir tout le catalogue</Link>
      </div>

      {recentProducts.length === 0 ? (
        <div className="card p-10 flex flex-col items-center justify-center text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <PackageSearch size={32} />
          </div>
          <h4 className="text-lg font-bold text-text-main mb-2">Aucun produit</h4>
          <p className="text-text-muted max-w-sm mb-6">Vous n&apos;avez pas encore de produits dans votre boutique. Lancez-vous !</p>
          <Link href="/products/new" className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl hover:bg-indigo-600 transition-colors">
            Ajouter un produit
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {recentProducts.map((item) => (
            <div key={item.id} className="card p-4 flex flex-col group cursor-pointer border border-transparent hover:border-gray-100 relative">
              <div className="w-full h-56 bg-gray-100 rounded-[20px] mb-5 relative overflow-hidden flex items-center justify-center">
                {item.image_url ? (
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                ) : (
                  <ImageIcon size={40} className="text-gray-300 absolute" />
                )}
                
                <div className="absolute inset-0 bg-black/5 group-hover:bg-black/0 transition-colors z-10"></div>
                
                {item.old_price && item.old_price > item.price && (
                  <div className="absolute top-4 left-4 bg-danger text-white text-xs px-2.5 py-1.5 rounded-lg font-bold shadow-sm z-20">
                    -{Math.round(((item.old_price - item.price) / item.old_price) * 100)}%
                  </div>
                )}
                
                {/* Action Buttons overlay */}
                <div className="absolute top-3 right-3 flex items-center gap-2 z-20">
                  <button 
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedProduct(item);
                    }}
                    title="Voir la fiche produit vendeur"
                    className="w-9 h-9 bg-white/90 backdrop-blur-md text-gray-800 rounded-full flex items-center justify-center shadow-lg hover:bg-primary hover:text-white transition-all transform hover:scale-110"
                  >
                    <Eye size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col px-1">
                <h4 className="font-bold text-text-main text-lg leading-tight mb-1 group-hover:text-primary transition-colors line-clamp-1">{item.title}</h4>
                <span className="text-text-muted text-sm font-medium mb-4">{item.category || "Sans catégorie"}</span>
                
                <div className="flex justify-between items-end mt-auto pt-4 border-t border-gray-100">
                  <div className="flex flex-col">
                    {item.old_price && (
                      <span className="text-text-muted text-xs line-through mb-0.5">{item.old_price.toLocaleString("fr-FR")} FCFA</span>
                    )}
                    <span className="font-extrabold text-xl text-text-main leading-none">{item.price.toLocaleString("fr-FR")} FCFA</span>
                  </div>
                  <Link href="/products" className="bg-primary/10 text-primary px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-primary hover:text-white transition-all shadow-xs flex items-center gap-1">
                    Gérer
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* SELLER PRODUCT DETAIL MODAL */}
      {selectedProduct && (
        <ProductDetailModal
          product={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </main>
  );
}
