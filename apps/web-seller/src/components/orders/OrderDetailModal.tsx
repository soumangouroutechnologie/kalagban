"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { 
  X, 
  ShoppingCart, 
  User, 
  MapPin, 
  Clock, 
  Loader2,
  PackageCheck,
  Truck,
  ShieldCheck,
  Headphones,
  CheckCircle2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface OrderItemDetail {
  id: string;
  quantity: number;
  unit_price: number;
  products?: {
    title: string;
    product_media?: { url: string }[];
  };
}

export interface SellerOrder {
  id: string;
  shop_id: string;
  customer_name: string;
  total_amount: number;
  subtotal?: number;
  application_fee?: number;
  shipping_fee?: number;
  status: string;
  delivery_type?: string;
  created_at: string;
}

interface OrderDetailModalProps {
  order: SellerOrder | null;
  onClose: () => void;
  onStatusUpdated?: () => void;
}

export default function OrderDetailModal({ 
  order, 
  onClose,
  onStatusUpdated 
}: OrderDetailModalProps) {
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(order?.status || "pending");

  useEffect(() => {
    if (!order) return;

    const fetchOrderItems = async () => {
      setIsLoadingItems(true);
      try {
        const { data } = await supabase
          .from("order_items")
          .select("*, products(title, product_media(url))")
          .eq("order_id", order.id);

        if (data) setItems(data as OrderItemDetail[]);
      } catch (err) {
        console.error("Error fetching order items:", err);
      } finally {
        setIsLoadingItems(false);
      }
    };

    fetchOrderItems();
  }, [order]);

  if (!order) return null;

  const handleUpdateStatus = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (error) {
        alert("Erreur lors de la mise à jour : " + error.message);
      } else {
        setCurrentStatus(newStatus);
        if (onStatusUpdated) onStatusUpdated();
      }
    } catch (err) {
      console.error("Erreur update status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Anonymized customer display name
  const nameParts = order.customer_name.split("(");
  const displayName = nameParts[0].trim() || "Client Kalagban";

  // Kalagban Official Logistics Support WhatsApp
  const logisticsSupportPhone = "2250777620864";
  const supportMessage = encodeURIComponent(
    `Bonjour Support Logistique Kalagban, je suis la boutique concernant la commande #${order.id.slice(0, 8)}. J'ai une question sur la collecte du colis.`
  );
  const supportWhatsAppUrl = `https://wa.me/${logisticsSupportPhone}?text=${supportMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar">
        
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              <ShoppingCart size={20} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-gray-400">Détails de la commande</span>
              <h3 className="text-lg font-black text-gray-900">#{order.id.slice(0, 8)}...</h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          
          {/* Logistics & Privacy Banner */}
          <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200/80 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center gap-2 text-gray-800 font-extrabold text-sm">
                <User size={16} className="text-indigo-600" />
                <span>Destinataire : {displayName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 font-semibold text-xs">
                <Truck size={16} className="text-amber-600" />
                <span>Livraison : {order.delivery_type === "pickup_point" ? "Point Relais Kalagban 📦" : "Livraison Domicile Kalagban 🚚"}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-400 font-medium text-[11px]">
                <Clock size={14} />
                <span>Date : {new Date(order.created_at).toLocaleString("fr-FR")}</span>
              </div>
            </div>

            {/* Kalagban Logistics Support CTA */}
            <a
              href={supportWhatsAppUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs py-2.5 px-3.5 rounded-xl transition-all flex items-center gap-2 shadow-sm shrink-0"
            >
              <Headphones size={15} className="text-indigo-400" />
              <span>Support Logistique</span>
            </a>
          </div>

          {/* Privacy Note */}
          <div className="bg-blue-50/70 border border-blue-100 rounded-xl p-3.5 flex items-start gap-2.5">
            <ShieldCheck size={18} className="text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-900 font-medium leading-relaxed">
              <strong>Livraison opérée par Kalagban :</strong> Les coordonnées directes de l&apos;acheteur sont sécurisées. Vous devez uniquement préparer le colis et marquer son état d&apos;avancement ci-dessous. Le livreur Kalagban se charge de la collecte et de la remise.
            </p>
          </div>

          {/* Seller Action & Order Progression Controls */}
          <div className="flex flex-col gap-3 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  Progression de la Préparation
                </span>
                <p className="text-[11px] text-gray-500 font-medium">
                  Le client voit ce statut s&apos;actualiser en direct sur sa page de suivi.
                </p>
              </div>
              {isUpdatingStatus && <Loader2 size={18} className="animate-spin text-indigo-600" />}
            </div>

            {currentStatus === "delivered" ? (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3 flex items-center gap-2 font-bold text-xs">
                <CheckCircle2 size={18} className="text-emerald-600" />
                <span>Cette commande a été livrée avec succès au client par Kalagban Express.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
                {/* Status 1: Pending */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("pending")}
                  disabled={isUpdatingStatus}
                  className={`py-3 px-3 rounded-xl text-xs font-black transition-all border flex flex-col items-center gap-1 ${
                    currentStatus === "pending" 
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20" 
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span>1. En attente</span>
                  <span className="text-[10px] font-normal opacity-80">Nouvelle commande</span>
                </button>

                {/* Status 2: Processing (Preparing) */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("processing")}
                  disabled={isUpdatingStatus}
                  className={`py-3 px-3 rounded-xl text-xs font-black transition-all border flex flex-col items-center gap-1 ${
                    currentStatus === "processing" || currentStatus === "preparing"
                      ? "bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20" 
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span>2. En préparation 👨‍🍳</span>
                  <span className="text-[10px] font-normal opacity-80">Colis en cours d&apos;emballage</span>
                </button>

                {/* Status 3: Shipped (Ready for pickup by courier) */}
                <button
                  type="button"
                  onClick={() => handleUpdateStatus("shipped")}
                  disabled={isUpdatingStatus}
                  className={`py-3 px-3 rounded-xl text-xs font-black transition-all border flex flex-col items-center gap-1 ${
                    currentStatus === "shipped" || currentStatus === "in_transit"
                      ? "bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20" 
                      : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                  }`}
                >
                  <span>3. Colis Prêt / Expédié 📦</span>
                  <span className="text-[10px] font-normal opacity-80">Prêt pour le livreur Kalagban</span>
                </button>
              </div>
            )}
          </div>

          {/* Ordered Articles Table */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Articles commandés</h4>
            
            {isLoadingItems ? (
              <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-indigo-600" size={24} /></div>
            ) : items.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium">1x Produit</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const mediaUrl = item.products?.product_media && item.products.product_media.length > 0
                    ? item.products.product_media[0].url
                    : null;

                  return (
                    <div key={item.id} className="flex items-center justify-between p-3.5 rounded-2xl bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-xl bg-white border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                          {mediaUrl ? (
                            <img src={mediaUrl} alt="Produit" className="w-full h-full object-cover" />
                          ) : (
                            <PackageCheck size={20} className="text-gray-400" />
                          )}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-gray-900">{item.products?.title || "Article"}</p>
                          <p className="text-xs text-gray-500 font-semibold">{item.quantity} x {Number(item.unit_price).toLocaleString("fr-FR")} FCFA</p>
                        </div>
                      </div>
                      <p className="text-sm font-black text-gray-900">
                        {(item.quantity * item.unit_price).toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Financial Breakdown */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col gap-2.5">
            <div className="flex justify-between items-center text-xs font-bold text-gray-600">
              <span>Part Vendeur (Sous-total articles)</span>
              <span>{Number(order.subtotal || order.total_amount).toLocaleString("fr-FR")} FCFA</span>
            </div>
            {order.application_fee !== undefined && order.application_fee > 0 && (
              <div className="flex justify-between items-center text-xs font-bold text-indigo-600">
                <span>Frais d&apos;application (Plateforme)</span>
                <span>+{Number(order.application_fee).toLocaleString("fr-FR")} FCFA</span>
              </div>
            )}
            <div className="h-[1px] bg-gray-200 my-1" />
            <div className="flex justify-between items-center text-sm font-black text-gray-900">
              <span>Total payé par l&apos;acheteur</span>
              <span className="text-indigo-600">{Number(order.total_amount).toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-bold text-xs transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
