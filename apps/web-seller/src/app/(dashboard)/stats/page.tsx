"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useCallback } from "react";
import { 
  TrendingUp, 
  Package, 
  Users, 
  Banknote, 
  ArrowUp, 
  Star, 
  Loader2, 
  Image as ImageIcon,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Plus,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import PayoutRequestModal from "@/components/wallet/PayoutRequestModal";

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

interface PayoutHistoryItem {
  id: string;
  amount: number;
  payment_method: string;
  status: "pending" | "processed" | "failed";
  reference_code?: string;
  created_at: string;
  processed_at?: string;
}

export default function StatsPage() {
  const [timeFilter, setTimeFilter] = useState("Cette semaine");
  const [isLoading, setIsLoading] = useState(true);
  
  const [totalSales, setTotalSales] = useState(0);
  const [itemsSold, setItemsSold] = useState(0);
  const [visitors] = useState(0);
  
  // Wallet state
  const [shopId, setShopId] = useState("");
  const [shopName, setShopName] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");
  const [payoutProvider, setPayoutProvider] = useState("Wave");
  const [availableBalance, setAvailableBalance] = useState(0);
  const [pendingBalance, setPendingBalance] = useState(0);
  const [payoutsHistory, setPayoutsHistory] = useState<PayoutHistoryItem[]>([]);
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState(false);
  
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);

  const loadStats = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      setShopId(session.user.id);

      // Fetch shop payout info
      const { data: shop } = await supabase
        .from('shops')
        .select('name, payout_provider, payout_phone')
        .eq('id', session.user.id)
        .single();

      if (shop) {
        setShopName(shop.name || "Ma Boutique");
        setPayoutProvider(shop.payout_provider || "Wave");
        setPayoutPhone(shop.payout_phone || "");
      }

      // 1. Fetch Orders for total sales & wallet calculation
      const { data: orders } = await supabase
        .from('orders')
        .select('id, total_amount, subtotal, status, created_at')
        .eq('shop_id', session.user.id);

      let sales = 0;
      let deliveredGross = 0;
      let inTransitGross = 0;
      const orderIds: string[] = [];

      if (orders) {
        orders.forEach(o => {
          if (o.status !== 'cancelled') {
            const amount = Number(o.subtotal || o.total_amount || 0);
            sales += amount;
            orderIds.push(o.id);

            if (o.status === 'delivered' || o.status === 'picked_up') {
              deliveredGross += amount;
            } else {
              inTransitGross += amount;
            }
          }
        });
      }
      setTotalSales(sales);

      // 2. Fetch Payouts to subtract from available balance
      const { data: payoutsData } = await supabase
        .from('payouts')
        .select('*')
        .eq('shop_id', session.user.id)
        .order('created_at', { ascending: false });

      let paidOutAmount = 0;
      if (payoutsData) {
        setPayoutsHistory(payoutsData);
        payoutsData.forEach(p => {
          if (p.status === 'processed' || p.status === 'pending') {
            paidOutAmount += Number(p.amount || 0);
          }
        });
      }

      // Kalagban Net Calculation (Vendor gets 95% = 5% Kalagban commission)
      const commissionRate = 0.05;
      const netDelivered = Math.round(deliveredGross * (1 - commissionRate));
      const calcAvailable = Math.max(0, netDelivered - paidOutAmount);
      const calcPending = Math.round(inTransitGross * (1 - commissionRate));

      setAvailableBalance(calcAvailable);
      setPendingBalance(calcPending);

      // 3. Fetch Order Items to get top products and total items sold
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
  }, []);

  useEffect(() => {
    loadStats();
  }, [loadStats, timeFilter]);

  const kpis = [
    {
      title: "Chiffre d'Affaires Brut",
      value: `${totalSales.toLocaleString('fr-FR')} FCFA`,
      icon: <Banknote size={40} className="text-emerald-600" />,
      bg: "bg-emerald-50",
      trend: totalSales > 0 ? "En hausse" : "Stable",
      trendColor: totalSales > 0 ? "text-emerald-600" : "text-gray-500",
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
      title: "Visiteurs boutique",
      value: visitors.toString(),
      icon: <Users size={40} className="text-indigo-600" />,
      bg: "bg-indigo-50",
      trend: visitors > 0 ? "En hausse" : "Stable",
      trendColor: visitors > 0 ? "text-indigo-600" : "text-gray-500",
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
            Mes Résultats &amp; Portefeuille
          </h1>
          <p className="text-text-muted mt-1 font-medium">Suivi de vos ventes et gestion des virements de vos gains.</p>
        </div>
        
        {/* Filtre de période */}
        <div className="flex bg-white rounded-xl shadow-xs border border-gray-200 p-1">
          {["Aujourd'hui", "Cette semaine", "Ce mois-ci"].map((filter) => (
            <button
              key={filter}
              onClick={() => setTimeFilter(filter)}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                timeFilter === filter 
                  ? "bg-primary text-white shadow-xs" 
                  : "text-text-muted hover:text-text-main hover:bg-gray-50"
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* SECTION PORTEFEUILLE & DEMANDE DE RETRAIT */}
      <div className="bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-4xl p-6 sm:p-8 text-white shadow-xl border border-slate-800 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-indigo-300 text-xs font-bold uppercase tracking-wider">
            <Wallet size={18} />
            <span>Portefeuille Vendeur Kalagban</span>
          </div>
          
          <div className="flex flex-wrap items-baseline gap-6">
            <div>
              <p className="text-xs text-gray-400 font-medium">Solde Disponible au Retrait</p>
              <h2 className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight mt-0.5">
                {availableBalance.toLocaleString('fr-FR')} <span className="text-base text-gray-300">FCFA</span>
              </h2>
            </div>
            
            <div className="border-l border-white/10 pl-6">
              <p className="text-xs text-gray-400 font-medium">En cours de livraison (En attente)</p>
              <h3 className="text-xl font-black text-amber-400 tracking-tight mt-0.5">
                {pendingBalance.toLocaleString('fr-FR')} <span className="text-xs text-gray-300">FCFA</span>
              </h3>
            </div>
          </div>

          <p className="text-[11px] text-gray-400 font-medium">
            * Vos gains sont débloqués dès que le client récupère son colis au Point Relais. Commission Kalagban déduite : 5%.
          </p>
        </div>

        <button
          onClick={() => setIsPayoutModalOpen(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-black text-xs sm:text-sm py-3.5 px-6 rounded-2xl transition-all shadow-lg shadow-emerald-500/25 flex items-center gap-2 shrink-0 active:scale-95 cursor-pointer"
        >
          <Banknote size={18} />
          Demander un virement
        </button>
      </div>

      {/* Cartes KPI */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {kpis.map((kpi, index) => (
          <div key={index} className="bg-surface rounded-4xl p-6 shadow-xs border border-gray-100 flex flex-col items-center justify-center text-center transform transition-transform hover:scale-105">
            <div className={`w-20 h-20 ${kpi.bg} rounded-full flex items-center justify-center mb-4`}>
              {kpi.icon}
            </div>
            <h2 className="text-3xl font-black text-text-main mb-1">{kpi.value}</h2>
            <p className="text-sm font-bold text-gray-500 mb-3">{kpi.title}</p>
            <div className={`flex items-center gap-1 font-bold bg-gray-50 px-3 py-1.5 rounded-full text-xs ${kpi.trendColor}`}>
              {kpi.trendIcon}
              <span>{kpi.trend}</span>
            </div>
          </div>
        ))}
      </div>

      {/* HISTORIQUE DES DEMANDES DE VIREMENT */}
      {payoutsHistory.length > 0 && (
        <div className="bg-white rounded-4xl p-6 sm:p-8 shadow-xs border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-bold">
                <Clock size={20} />
              </div>
              <div>
                <h3 className="text-lg font-black text-gray-900">Historique des Virements &amp; Retraits</h3>
                <p className="text-xs text-gray-400 font-medium">Suivez l&apos;état de vos demandes de virement</p>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4">Date de Demande</th>
                  <th className="py-3 px-4">Montant</th>
                  <th className="py-3 px-4">Moyen de Paiement</th>
                  <th className="py-3 px-4">Référence</th>
                  <th className="py-3 px-4 text-center">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 font-medium">
                {payoutsHistory.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3.5 px-4">{new Date(p.created_at).toLocaleDateString("fr-FR")}</td>
                    <td className="py-3.5 px-4 font-black text-gray-900">{Number(p.amount).toLocaleString()} FCFA</td>
                    <td className="py-3.5 px-4 font-bold text-gray-700">{p.payment_method}</td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-400">{p.reference_code || "En attente"}</td>
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                        p.status === "processed"
                          ? "bg-emerald-100 text-emerald-800"
                          : p.status === "pending"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {p.status === "processed" && <CheckCircle2 size={12} />}
                        {p.status === "pending" && <Clock size={12} />}
                        {p.status === "processed" ? "Payé ✅" : p.status === "pending" ? "En attente ⏳" : "Rejeté ❌"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Top Produits */}
      <div className="bg-surface rounded-4xl p-8 shadow-xs border border-gray-100">
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
                <p className="text-xl font-black text-emerald-600 mb-2">{product.price}</p>
                
                <div className="bg-primary/10 text-primary font-bold px-4 py-2 rounded-xl flex items-center gap-2">
                  <Package size={18} />
                  {product.sales} vendus
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Demande de Virement */}
      <PayoutRequestModal
        isOpen={isPayoutModalOpen}
        onClose={() => setIsPayoutModalOpen(false)}
        shopId={shopId}
        shopName={shopName}
        availableBalance={availableBalance}
        defaultProvider={payoutProvider}
        defaultPhone={payoutPhone}
        onSuccess={() => loadStats()}
      />

    </div>
  );
}
