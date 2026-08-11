"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { 
  X, 
  ShoppingCart, 
  User, 
  Phone, 
  MapPin, 
  Clock, 
  MessageSquare,
  Loader2,
  PackageCheck
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
  status: string;
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

  // Extract phone number from customer_name if formatted like "kevin (0707070707)" or customer_name
  const nameParts = order.customer_name.split("(");
  const displayName = nameParts[0].trim();
  let phoneMatch = nameParts[1] ? nameParts[1].replace(")", "").trim() : "";
  if (!phoneMatch) phoneMatch = "2250777620864";

  let cleanPhone = phoneMatch.replace(/\D/g, "");
  if (cleanPhone.length === 10 && (cleanPhone.startsWith("07") || cleanPhone.startsWith("05") || cleanPhone.startsWith("01"))) {
    cleanPhone = "225" + cleanPhone;
  }

  const whatsappMessage = encodeURIComponent(
    `Bonjour ${displayName}, concernant votre commande #${order.id.slice(0, 8)} de ${Number(order.total_amount).toLocaleString("fr-FR")} FCFA sur Kalagban.`
  );
  const whatsappUrl = `https://wa.me/${cleanPhone}?text=${whatsappMessage}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar">
        
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <ShoppingCart size={20} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Détails de la commande</span>
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
          
          {/* Customer & Date Info */}
          <div className="bg-gray-50 p-5 rounded-2xl border border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-gray-700 font-extrabold text-sm">
                <User size={16} className="text-primary" />
                <span>Client : {displayName}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-medium text-xs">
                <MapPin size={16} className="text-gray-400" />
                <span>Livraison : {order.customer_name}</span>
              </div>
              <div className="flex items-center gap-2 text-gray-500 font-medium text-xs">
                <Clock size={16} className="text-gray-400" />
                <span>Date : {new Date(order.created_at).toLocaleString("fr-FR")}</span>
              </div>
            </div>

            {/* Quick Contact Buttons */}
            <div className="flex items-center sm:flex-col justify-end gap-2 shrink-0">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 text-white font-bold text-xs py-2 px-3.5 rounded-xl hover:bg-emerald-700 transition-colors flex items-center gap-1.5 shadow-sm"
              >
                <MessageSquare size={14} />
                WhatsApp Client
              </a>
              <a
                href={`tel:${cleanPhone}`}
                className="bg-gray-200 text-gray-800 font-bold text-xs py-2 px-3.5 rounded-xl hover:bg-gray-300 transition-colors flex items-center gap-1.5"
              >
                <Phone size={14} />
                Appeler
              </a>
            </div>
          </div>

          {/* Change Order Status Bar */}
          <div className="flex flex-col gap-2 bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between">
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-700">Changer le statut de la commande</span>
              {isUpdatingStatus && <Loader2 size={16} className="animate-spin text-primary" />}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
              <button
                type="button"
                onClick={() => handleUpdateStatus("pending")}
                disabled={isUpdatingStatus}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  currentStatus === "pending" ? "bg-amber-500 text-white border-amber-500 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                En attente
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("processing")}
                disabled={isUpdatingStatus}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  currentStatus === "processing" ? "bg-indigo-600 text-white border-indigo-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                En préparation
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("shipped")}
                disabled={isUpdatingStatus}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  currentStatus === "shipped" ? "bg-blue-600 text-white border-blue-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Expédiée 🚚
              </button>

              <button
                type="button"
                onClick={() => handleUpdateStatus("delivered")}
                disabled={isUpdatingStatus}
                className={`py-2 px-2.5 rounded-xl text-xs font-bold transition-all border ${
                  currentStatus === "delivered" ? "bg-emerald-600 text-white border-emerald-600 shadow-sm" : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                }`}
              >
                Livrée ✅
              </button>
            </div>
          </div>

          {/* Ordered Articles Table */}
          <div className="flex flex-col gap-3">
            <h4 className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Articles commandés</h4>
            
            {isLoadingItems ? (
              <div className="p-6 flex justify-center"><Loader2 className="animate-spin text-primary" size={24} /></div>
            ) : items.length === 0 ? (
              <p className="text-xs text-gray-500 font-medium">1x Produit (Détails chargés)</p>
            ) : (
              <div className="flex flex-col gap-2">
                {items.map((item) => {
                  const mediaUrl = item.products?.product_media && item.products.product_media.length > 0
                    ? item.products.product_media[0].url
                    : null;

                  return (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-gray-200 overflow-hidden shrink-0 flex items-center justify-center text-gray-400">
                          {mediaUrl ? (
                            <img src={mediaUrl} alt="" className="w-full h-full object-cover" />
                          ) : (
                            <PackageCheck size={18} />
                          )}
                        </div>
                        <div>
                          <h5 className="font-extrabold text-sm text-gray-900">{item.products?.title || "Article Produit"}</h5>
                          <span className="text-xs text-gray-500 font-medium">{item.quantity} x {Number(item.unit_price).toLocaleString("fr-FR")} FCFA</span>
                        </div>
                      </div>
                      <span className="font-black text-sm text-gray-900">
                        {(item.quantity * Number(item.unit_price)).toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Total Amount Box */}
          <div className="bg-primary/5 p-4 rounded-2xl border border-primary/20 flex items-center justify-between mt-2">
            <span className="text-sm font-extrabold text-gray-700">Montant Total de la commande</span>
            <span className="text-2xl font-black text-primary">
              {Number(order.total_amount).toLocaleString("fr-FR")} FCFA
            </span>
          </div>

        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-100 flex justify-end">
          <button
            onClick={onClose}
            className="bg-gray-900 text-white font-bold text-sm px-6 py-2.5 rounded-xl hover:bg-gray-800 transition-colors"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}
