"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import { 
  CheckCircle2, 
  Package, 
  ArrowRight, 
  Loader2,
  XCircle
} from "lucide-react";

interface OrderDetail {
  id: string;
  customer_name: string;
  customer_phone?: string;
  total_amount: number;
  subtotal?: number;
  application_fee?: number;
  shipping_fee?: number;
  status: string;
  created_at: string;
  shop_id: string;
  delivery_type?: string;
  pickup_code?: string;
  relay_status?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  products?: {
    title: string;
  };
}

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shop, setShop] = useState<{ name?: string; payout_phone?: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!order) return;
    if (!confirm("Êtes-vous sûr de vouloir annuler cette commande ? Les articles seront remis en stock.")) {
      return;
    }
    setIsCancelling(true);
    try {
      // 1. Update order status to cancelled
      const { error: updateErr } = await supabase
        .from("orders")
        .update({ status: "cancelled" })
        .eq("id", order.id);

      if (updateErr) throw updateErr;

      // 2. Restore product stock
      for (const item of items) {
        const { data: prod } = await supabase
          .from("products")
          .select("stock_quantity")
          .eq("id", item.id)
          .single();
        if (prod) {
          await supabase
            .from("products")
            .update({ stock_quantity: Number(prod.stock_quantity || 0) + Number(item.quantity) })
            .eq("id", item.id);
        }
      }

      // 3. Notify Seller
      if (order.shop_id) {
        try {
          await supabase.from("seller_notifications").insert({
            shop_id: order.shop_id,
            title: "Commande Annulée par le Client ❌",
            message: `La commande #${order.id.slice(0, 8).toUpperCase()} a été annulée par l'acheteur. Les articles ont été réintégrés à votre stock.`,
            type: "order",
            reference_id: order.id,
          });
        } catch (notifErr) {
          console.warn("Notification error:", notifErr);
        }
      }

      setOrder((prev) => (prev ? { ...prev, status: "cancelled" } : null));
      alert("Votre commande a été annulée avec succès.");
    } catch (err: unknown) {
      console.error("Error cancelling order:", err);
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      alert("Erreur lors de l'annulation : " + msg);
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const fetchOrder = async () => {
      try {
        // 1. Fetch Order
        const { data: orderData, error: orderErr } = await supabase
          .from("orders")
          .select("*")
          .eq("id", id)
          .single();

        if (!isMounted) return;

        if (orderErr || !orderData) {
          console.error("Order error:", orderErr);
          setIsLoading(false);
          return;
        }

        setOrder(orderData);

        // 2. Fetch Items
        const { data: itemsData } = await supabase
          .from("order_items")
          .select("*, products(title)")
          .eq("order_id", id);

        if (itemsData && isMounted) setItems(itemsData);

        // 3. Fetch Shop
        const { data: shopData } = await supabase
          .from("shops")
          .select("name, payout_phone")
          .eq("id", orderData.shop_id)
          .maybeSingle();

        if (isMounted && shopData) {
          setShop(shopData);
        }

      } catch (err) {
        console.error("Error loading order:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchOrder();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="animate-spin text-indigo-600 w-12 h-12 mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Chargement de votre reçu...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Commande introuvable</h2>
          <p className="text-gray-500 mb-6">Impossible de trouver cette référence de commande.</p>
          <Link href="/" className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl">
            Retour à l&apos;accueil
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-3xl w-full mx-auto px-4 sm:px-6 pt-10 pb-16">
        
        {/* SUCCESS CARD */}
        <div className="bg-white rounded-3xl p-8 sm:p-12 border border-gray-100 shadow-xl text-center mb-8">
          
          <div className="w-20 h-20 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 border-4 border-emerald-100">
            <CheckCircle2 size={44} />
          </div>

          <span className="text-xs font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 px-3.5 py-1.5 rounded-full border border-emerald-100 mb-4 inline-block">
            Commande Confirmée
          </span>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
            Merci pour votre commande ! 🎉
          </h1>
          <p className="text-gray-500 font-medium text-base max-w-md mx-auto mb-6">
            Votre commande a été transmise à la boutique <strong>{shop?.name || "partenaire"}</strong>.
          </p>

          <div className="bg-gray-50 rounded-2xl p-4 inline-flex items-center gap-3 border border-gray-100 mb-6">
            <span className="text-xs text-gray-500 font-bold uppercase">Référence :</span>
            <span className="font-mono font-extrabold text-indigo-600 text-sm">#{order.id}</span>
          </div>

          {/* POINT RELAIS OTP CODE BOX */}
          {order.pickup_code && (
            <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 mb-8 text-center shadow-md">
              <span className="text-xs font-black uppercase text-amber-900 tracking-wider">
                📍 Code de Sécurité OTP (Retrait Point Relais)
              </span>
              <h2 className="text-4xl font-black text-amber-950 font-mono tracking-widest my-3">
                {order.pickup_code}
              </h2>
              <p className="text-xs text-amber-800 font-bold max-w-sm mx-auto">
                Présentez ce code de sécurité au gérant de votre Point Relais pour récupérer votre colis.
              </p>
            </div>
          )}

          {/* ANIMATED STATUS TIMELINE (JUMIA INSPIRED) */}
          <div className="mb-8 text-left">
            <OrderStatusTimeline
              orderStatus={order.status}
              relayStatus={order.relay_status}
              deliveryType={order.delivery_type}
              pickupCode={order.pickup_code}
              createdAt={order.created_at}
            />
          </div>

          {/* BUYER DASHBOARD REDIRECTION BUTTON */}
          <div className="flex flex-col gap-3">
            <Link
              href="/account"
              className="w-full bg-indigo-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 text-base"
            >
              <Package size={20} />
              Suivre ma commande dans mon Espace Client
            </Link>
            <p className="text-xs text-gray-400 font-medium">
              Consultez l&apos;évolution de votre livraison et l&apos;historique de vos achats dans votre espace personnel.
            </p>
          </div>

        </div>

        {/* ORDER DETAILS SUMMARY */}
        <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm mb-8">
          <h3 className="font-extrabold text-gray-900 text-lg mb-6 pb-3 border-b border-gray-100 flex items-center gap-2">
            <Package size={20} className="text-indigo-600" /> Détails des articles
          </h3>

          <div className="flex flex-col gap-4 mb-6">
            {items.map((item) => (
              <div key={item.id} className="flex justify-between items-center text-sm py-2 border-b border-gray-50">
                <div>
                  <h4 className="font-bold text-gray-900">{item.products?.title || "Produit Kalagban"}</h4>
                  <span className="text-xs text-gray-500 font-medium">Quantité : {item.quantity}</span>
                </div>
                <span className="font-extrabold text-gray-900">
                  {(Number(item.unit_price) * item.quantity).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-4 flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-sm font-medium text-gray-500">
              <span>Sous-total articles</span>
              <span className="font-bold text-gray-900">
                {Number(order.subtotal || (Number(order.total_amount) - Number(order.application_fee || 0))).toLocaleString("fr-FR")} FCFA
              </span>
            </div>

            {Number(order.application_fee) > 0 && (
              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                <span>Frais d&apos;application</span>
                <span className="font-bold text-indigo-600">
                  +{Number(order.application_fee).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            )}

            {Number(order.shipping_fee) > 0 && (
              <div className="flex justify-between items-center text-sm font-medium text-gray-500">
                <span>Frais de livraison</span>
                <span className="font-bold text-emerald-600">
                  +{Number(order.shipping_fee).toLocaleString("fr-FR")} FCFA
                </span>
              </div>
            )}

            <div className="border-t border-gray-100 pt-3 flex justify-between items-center text-lg font-black text-gray-900">
              <span>Total payé/dû</span>
              <span className="text-indigo-600">{Number(order.total_amount).toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>
        </div>

        {/* Actions & Navigation */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-8">
          {(order.status === "pending" || order.status === "pending_payment") && (
            <button
              onClick={handleCancelOrder}
              disabled={isCancelling}
              className="w-full sm:w-auto bg-red-50 hover:bg-red-100 text-red-600 font-bold px-5 py-3 rounded-2xl border border-red-200 transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 text-sm"
            >
              {isCancelling ? <Loader2 size={16} className="animate-spin" /> : <XCircle size={16} />}
              Annuler cette commande
            </button>
          )}

          <Link href="/" className="inline-flex items-center gap-2 text-indigo-600 font-bold hover:underline text-sm ml-auto">
            Retourner à l&apos;accueil de la boutique <ArrowRight size={16} />
          </Link>
        </div>

      </main>

      <Footer />
    </div>
  );
}
