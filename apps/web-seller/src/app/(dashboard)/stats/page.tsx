"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { TrendingUp, Package, Users, Banknote, ArrowUp, Star, Loader2, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  price: string;
  image?: string;
}

interface DbProductItem {
  id: string;
  title: string;
  price: number;
  image_url?: string | null;
  product_media?: { url: string }[];
}

export default function StatsPage() {
  const [timeFilter, setTimeFilter] = useState("Cette semaine");
  const [isLoading, setIsLoading] = useState(true);
  
  const [totalSales, setTotalSales] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [visitors] = useState(0); // Dummy for now
  
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        // 1. Fetch Orders for total sales
        const { data: orders } = await supabase
          .from('orders')
          .select('id, total_amount, subtotal, status')
          .eq('shop_id', session.user.id);

        let sales = 0;
        const orderIds: string[] = [];

        if (orders) {
          orders.forEach(o => {
            if (o.status !== 'cancelled') {
              sales += Number(o.subtotal || o.total_amount || 0);
              orderIds.push(o.id);
            }
          });
        }
        setTotalSales(sales);

        // 2. Fetch Order Items to get top products and total items sold
        let totalItems = 0;
        const productSales: Record<string, number> = {};

        if (orderIds.length > 0) {
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id, quantity')
            .in('order_id', orderIds);

          if (orderItems) {
            orderItems.forEach(item => {
              totalItems += item.quantity;
              if (productSales[item.product_id]) {
                productSales[item.product_id] += item.quantity;
              } else {
                productSales[item.product_id] = item.quantity;
              }
            });
          }
        }
        setItemsSold(totalItems);

        // Sort products by sales
        const topProductIds = Object.keys(productSales)
          .sort((a, b) => productSales[b] - productSales[a])
          .slice(0, 3);

        // Fetch details of top products
        if (topProductIds.length > 0) {
          const { data: productsData } = await supabase
            .from('products')
            .select('id, title, price, image_url, product_media(url)')
            .in('id', topProductIds);

          if (productsData) {
            const formattedTopProducts = (productsData as unknown as DbProductItem[]).map((p) => ({
              id: p.id,
              name: p.title,
              price: `${Number(p.price || 0).toLocaleString('fr-FR')} FCFA`,
              sales: productSales[p.id],
              image: p.image_url || (p.product_media && p.product_media.length > 0 ? p.product_media[0].url : undefined),
            })).sort((a, b) => b.sales - a.sales);
            
            setTopProducts(formattedTopProducts);
          }
        }

      } catch (error) {
        console.error("Erreur chargement des stats:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    setTimeout(() => {
      loadStats();
    }, 0);
  }, [timeFilter]);

  const kpis = [
    {
      title: "Argent gagné",
      value: `${totalSales.toLocaleString('fr-FR')} FCFA`,
      icon: <Banknote size={40} className="text-success" />,
      bg: "bg-success/10",
      trend: totalSales > 0 ? "En hausse" : "Stable",
      trendColor: totalSales > 0 ? "text-success" : "text-gray-500",
      trendIcon: totalSales > 0 ? <ArrowUp size={16} /> : null
    },
    {
      title: "Articles vendus",
      value: itemsSold.toString(),
      icon: <Package size={40} className="text-primary" />,
      bg: "bg-primary/10",
      trend: itemsSold > 0 ? "En hausse" : "Stable",
      trendColor: itemsSold > 0 ? "text-primary" : "text-gray-500",
      trendIcon: itemsSold > 0 ? <ArrowUp size={16} /> : null
    },
    {
      title: "Visiteurs",
      value: visitors.toString(),
      icon: <Users size={40} className="text-info" />,
      bg: "bg-info/10",
      trend: visitors > 0 ? "En hausse" : "Stable",
      trendColor: visitors > 0 ? "text-info" : "text-gray-500",
      trendIcon: visitors > 0 ? <ArrowUp size={16} /> : null
    }
  ];

  if (isLoading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary w-12 h-12" /></div>;
  }

  return (
    <div className="flex flex-col gap-8 w-full max-w-6xl mx-auto pb-10">
      
      {/* En-tête de la page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight flex items-center gap-3">
            <TrendingUp className="text-primary" size={32} />
            Mes Résultats
          </h1>
          <p className="text-text-muted mt-1 font-medium">Résumé de votre activité sur la période sélectionnée.</p>
        </div>
        
        {/* Filtre de période */}
        <div className="flex bg-white rounded-xl shadow-sm border border-gray-200 p-1">
          {["Aujourd'hui", "Cette semaine", "Ce mois-ci"].map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${
                timeFilter === filter 
                  ? "bg-primary text-white shadow-sm" 
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Cartes KPI (Très visuelles, grandes icônes, textes simples) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-surface rounded-4xl p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center transform transition-transform hover:scale-105">
            <div className={`w-20 h-20 ${kpi.bg} rounded-full flex items-center justify-center mb-4`}>
              {kpi.icon}
            </div>
            <h2 className="text-4xl font-black text-text-main mb-1">{kpi.value}</h2>
            <p className="text-lg font-bold text-gray-500 mb-3">{kpi.title}</p>
            <div className={`flex items-center gap-1 font-bold bg-gray-50 px-3 py-1.5 rounded-full ${kpi.trendColor}`}>
              {kpi.trendIcon}
              <span>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Top Produits */}
      <div className="bg-surface rounded-4xl p-8 shadow-sm border border-gray-100 mt-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-12 h-12 bg-warning/10 text-warning rounded-full flex items-center justify-center">
            <Star size={24} className="fill-warning" />
          </div>
          <h2 className="text-2xl font-black text-text-main">Articles les plus vendus</h2>
        </div>

        {topProducts.length === 0 ? (
          <div className="text-center py-10 text-text-muted">
            <p>Aucun article vendu pour le moment.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {topProducts.map((product, index) => (
              <div key={product.id} className="flex flex-col items-center p-4 rounded-2xl bg-gray-50 border border-gray-100 relative">
                
                {/* Médaille / Classement */}
                <div className="absolute -top-4 -left-4 w-10 h-10 rounded-full bg-primary text-white font-black flex items-center justify-center shadow-lg shadow-primary/30 border-2 border-white text-xl z-10">
                  {index + 1}
                </div>

                {/* Image Produit */}
                <div className="w-full aspect-square rounded-2xl overflow-hidden mb-4 shadow-xs bg-gray-100 flex flex-col items-center justify-center text-gray-400 relative">
                  {product.image ? (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center p-4">
                      <ImageIcon size={44} className="mb-2 text-gray-300" />
                      <span className="text-[10px] font-bold uppercase text-gray-400 tracking-wider">Image produit</span>
                    </div>
                  )}
                </div>

                {/* Infos visuelles */}
                <h3 className="text-lg font-bold text-text-main text-center mb-1">{product.name}</h3>
                <p className="text-xl font-black text-success mb-2">{product.price}</p>
                
                <div className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-xl flex items-center gap-2">
                  <Package size={18} />
                  {product.sales} vendus
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message d'encouragement */}
      <div className="bg-primary/10 rounded-2xl p-6 text-center">
        {totalSales > 0 ? (
          <p className="text-lg font-bold text-primary">🎉 Super travail ! Continuez d&apos;ajouter de beaux produits pour augmenter vos ventes.</p>
        ) : (
          <p className="text-lg font-bold text-primary">🚀 C&apos;est le moment de vous lancer ! Partagez votre boutique pour réaliser vos premières ventes.</p>
        )}
      </div>

    </div>
  );
}
