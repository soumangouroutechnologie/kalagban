"use client";

import React, { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { 
  CheckCircle2, 
  Package, 
  ShoppingBag, 
  ShieldCheck,
  QrCode,
  Loader2 
} from "lucide-react";

interface OrderSuccessData {
  id: string;
  customer_name?: string;
  total_amount: number;
  delivery_type: string;
  pickup_code?: string;
  pickup_points?: {
    name: string;
    commune: string;
    address: string;
  };
}

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order_id") || "";

  const [order, setOrder] = useState<OrderSuccessData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!orderId) {
      return;
    }

    let isMounted = true;

    const fetchOrder = async () => {
      try {
        const { data } = await supabase
          .from("orders")
          .select("*, pickup_points(name, commune, address)")
          .eq("id", orderId)
          .single();

        if (data && isMounted) {
          setOrder(data);
        }
      } catch (err) {
        console.error("Error fetching order confirmation:", err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [orderId]);

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 py-12">
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl overflow-hidden p-8 sm:p-12 text-center">
          
          {/* Top Success Badge */}
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-inner ring-8 ring-emerald-50/50">
            <CheckCircle2 size={44} className="animate-bounce" />
          </div>

          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-100/80 text-emerald-800 font-black text-xs uppercase tracking-wider mb-3">
            <ShieldCheck size={16} /> Paiement Validé avec Succès via K-PAY
          </div>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-2">
            Merci pour votre commande !
          </h1>
          <p className="text-gray-500 font-medium text-sm sm:text-base max-w-lg mx-auto mb-8">
            Votre paiement en ligne a été validé et sécurisé. Votre commande est immédiatement transmise pour préparation.
          </p>

          {loading && orderId ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3">
              <Loader2 className="animate-spin text-indigo-600" size={32} />
              <p className="text-xs text-gray-400 font-bold">Chargement des détails de commande...</p>
            </div>
          ) : order ? (
            <div className="bg-gray-50 rounded-2xl border border-gray-100 p-6 mb-8 text-left max-w-xl mx-auto space-y-4">
              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Numéro de Commande</span>
                <span className="font-mono font-black text-sm text-gray-900">#{order.id.slice(0, 8).toUpperCase()}</span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Montant Total Payé</span>
                <span className="font-black text-base text-emerald-600">
                  {Number(order.total_amount || 0).toLocaleString("fr-FR")} FCFA
                </span>
              </div>

              <div className="flex items-center justify-between border-b border-gray-200 pb-3">
                <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Mode de Livraison</span>
                <span className="font-extrabold text-xs text-gray-900">
                  {order.delivery_type === "pickup_point" ? "Point Relais Kalagban 📦" : "Livraison à Domicile 🚚"}
                </span>
              </div>

              {/* Point Relais & PIN Code */}
              {order.delivery_type === "pickup_point" && order.pickup_code && (
                <div className="bg-indigo-600 text-white rounded-xl p-4 flex items-center justify-between gap-4 shadow-lg shadow-indigo-600/20">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-200">Code PIN Secret de Retrait</p>
                    <p className="text-2xl font-mono font-black tracking-widest">{order.pickup_code}</p>
                    <p className="text-[10px] text-indigo-100">À présenter au Point Relais lors du retrait</p>
                  </div>
                  <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                    <QrCode size={28} />
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            {orderId && (
              <Link
                href={`/orders/${orderId}`}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-indigo-600 text-white font-extrabold px-8 py-4 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/25 text-sm"
              >
                <Package size={18} /> Suivre ma commande en direct
              </Link>
            )}
            <Link
              href="/"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 bg-gray-100 text-gray-800 font-extrabold px-8 py-4 rounded-xl hover:bg-gray-200 transition-all text-sm"
            >
              <ShoppingBag size={18} /> Continuer mes achats
            </Link>
          </div>

        </div>
      </main>

      <Footer />
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={40} />
      </div>
    }>
      <SuccessContent />
    </Suspense>
  );
}
