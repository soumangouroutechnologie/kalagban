"use client";

import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";
import { useToast } from "@/context/ToastContext";
import { 
  CheckCircle2, 
  Package, 
  ArrowRight, 
  Loader2,
  XCircle,
  Truck,
  Send
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
  delivery_otp?: string;
  relay_status?: string;
  shipping_address?: string;
}

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  products?: {
    title: string;
  };
}

interface AssignedCourier {
  id: string;
  full_name: string;
  phone: string;
  vehicle_type: string;
  license_plate?: string | null;
}

export default function OrderSuccessPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { toast, confirm } = useToast();

  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [shop, setShop] = useState<{ name?: string; payout_phone?: string } | null>(null);
  const [courier, setCourier] = useState<AssignedCourier | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);

  const handleCancelOrder = async () => {
    if (!order) return;
    const isConfirmed = await confirm({
      title: "Annuler cette commande",
      message: "Êtes-vous sûr de vouloir annuler cette commande ? Les articles seront immédiatement réintégrés au stock.",
      confirmText: "Oui, annuler la commande",
      cancelText: "Non, conserver",
      type: "danger"
    });

    if (!isConfirmed) return;

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
      toast.success("Votre commande a été annulée avec succès.", "Commande annulée");
    } catch (err: unknown) {
      console.error("Error cancelling order:", err);
      const msg = err instanceof Error ? err.message : "Une erreur est survenue.";
      toast.error(msg, "Erreur d'annulation");
    } finally {
      setIsCancelling(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const loadOrderData = async () => {
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

        if (!isMounted) return;
        if (itemsData) setItems(itemsData);

        // 3. Fetch Shop
        const { data: shopData } = await supabase
          .from("shops")
          .select("name, payout_phone")
          .eq("id", orderData.shop_id)
          .maybeSingle();

        if (!isMounted) return;
        if (shopData) {
          setShop(shopData);
        }

        // 4. Fetch Assigned Courier
        const { data: assignmentData } = await supabase
          .from("courier_assignments")
          .select(`
            id,
            status,
            couriers (
              id,
              full_name,
              phone,
              vehicle_type,
              license_plate
            )
          `)
          .eq("order_id", id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!isMounted) return;
        if (assignmentData?.couriers) {
          const c = Array.isArray(assignmentData.couriers) 
            ? assignmentData.couriers[0] 
            : assignmentData.couriers;
          if (c) setCourier(c as unknown as AssignedCourier);
        }

      } catch (err) {
        if (!isMounted) return;
        console.error("Error loading order:", err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    loadOrderData();

    // Supabase Realtime for order updates
    const channel = supabase
      .channel(`order_tracking_${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders", filter: `id=eq.${id}` },
        () => {
          if (isMounted) loadOrderData();
        }
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "courier_assignments", filter: `order_id=eq.${id}` },
        () => {
          if (isMounted) loadOrderData();
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [id]);

  // WhatsApp Link to send GPS to Courier
  const getWhatsappToCourierUrl = () => {
    if (!courier?.phone) return "#";
    const phoneClean = courier.phone.replace(/[^0-9]/g, "");
    const waPhone = phoneClean.startsWith("225") ? phoneClean : `225${phoneClean}`;
    const text = encodeURIComponent(
      `Bonjour ${courier.full_name} 👋, je suis ${order?.customer_name || "le client"} pour la commande KALAGBAN #${order?.id?.slice(0, 8).toUpperCase()}.\n\nVoici ma position géographique pour la livraison : [Veuillez joindre votre localisation WhatsApp ici]`
    );
    return `https://wa.me/${waPhone}?text=${text}`;
  };

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

  const activeOtp = order.delivery_otp || order.pickup_code;

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
            {order.status === "delivered" ? "Colis Livré avec Succès 🎉" : "Commande Confirmée"}
          </span>

          <h1 className="text-3xl sm:text-4xl font-black text-gray-900 tracking-tight mb-3">
            {order.status === "delivered" ? "Merci pour votre achat ! 🎉" : "Merci pour votre commande ! 🎉"}
          </h1>
          <p className="text-gray-500 font-medium text-base max-w-md mx-auto mb-6">
            Votre commande a été transmise à la boutique <strong>{shop?.name || "partenaire"}</strong>.
          </p>

          <div className="bg-gray-50 rounded-2xl p-4 inline-flex items-center gap-3 border border-gray-100 mb-6">
            <span className="text-xs text-gray-500 font-bold uppercase">Référence :</span>
            <span className="font-mono font-extrabold text-indigo-600 text-sm">#{order.id}</span>
          </div>

          {/* CODE DE SÉCURITÉ OTP : POINT RELAIS OU DOMICILE */}
          {activeOtp && order.status !== "delivered" && (
            <div className={`border-2 rounded-3xl p-6 mb-8 text-center shadow-md ${
              order.delivery_type === "pickup_point" 
                ? "bg-amber-50 border-amber-300" 
                : "bg-linear-to-br from-indigo-50 to-blue-50 border-indigo-300"
            }`}>
              <span className={`text-xs font-black uppercase tracking-wider block ${
                order.delivery_type === "pickup_point" ? "text-amber-900" : "text-indigo-900"
              }`}>
                {order.delivery_type === "pickup_point" 
                  ? "📍 Code de Sécurité OTP (Retrait Point Relais)" 
                  : "🔒 Code Secret de Remise à Domicile"}
              </span>
              
              <h2 className={`text-4xl font-black font-mono tracking-widest my-3 ${
                order.delivery_type === "pickup_point" ? "text-amber-950" : "text-indigo-950"
              }`}>
                {activeOtp}
              </h2>
              
              <p className={`text-xs font-bold max-w-md mx-auto ${
                order.delivery_type === "pickup_point" ? "text-amber-800" : "text-indigo-800"
              }`}>
                {order.delivery_type === "pickup_point"
                  ? "Présentez ce code de sécurité au gérant de votre Point Relais pour récupérer votre colis."
                  : "Communiquez ce code au livreur UNIQUEMENT au moment où vous tenez votre colis en main propre."}
              </p>
            </div>
          )}

          {/* FICHE LIVREUR ASSIGNÉ & PARTAGE POSITION WHATSAPP */}
          {courier && order.status !== "delivered" && (
            <div className="bg-emerald-50/80 border border-emerald-200 rounded-3xl p-5 mb-8 text-left space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-800 font-extrabold text-xs uppercase tracking-wider">
                  <Truck size={16} />
                  <span>Votre Livreur est en route</span>
                </div>
                <span className="text-[10px] font-bold bg-emerald-200 text-emerald-900 px-2.5 py-0.5 rounded-full">
                  {courier.vehicle_type?.toUpperCase() || "MOTO"}
                </span>
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-2xl border border-emerald-100">
                <div>
                  <h4 className="font-extrabold text-slate-900 text-sm">{courier.full_name}</h4>
                  <p className="text-xs text-slate-500 font-mono mt-0.5">Contact : {courier.phone}</p>
                </div>

                <a
                  href={getWhatsappToCourierUrl()}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center gap-2 bg-linear-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs py-2.5 px-4 rounded-xl shadow-md shadow-emerald-600/20 transition transform active:scale-95"
                >
                  <Send size={14} />
                  Partager ma position WhatsApp
                </a>
              </div>
            </div>
          )}

          {/* ANIMATED STATUS TIMELINE */}
          <div className="mb-8 text-left">
            <OrderStatusTimeline
              orderStatus={order.status}
              relayStatus={order.relay_status}
              deliveryType={order.delivery_type}
              pickupCode={activeOtp}
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
