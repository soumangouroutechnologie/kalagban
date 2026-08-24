"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { 
  X, 
  ShoppingCart, 
  User, 
  Clock, 
  Loader2, 
  PackageCheck, 
  Truck, 
  ShieldCheck, 
  Headphones, 
  CheckCircle2, 
  XCircle, 
  Lock, 
  ArrowRight 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

const emptySubscribe = () => () => {};

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
  customer_id?: string;
  customer_email?: string;
  customer_name: string;
  total_amount: number;
  subtotal?: number;
  application_fee?: number;
  shipping_fee?: number;
  status: string;
  delivery_type?: string;
  pickup_point_id?: string;
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
  const { toast } = useToast();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);
  const [items, setItems] = useState<OrderItemDetail[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(order?.status || "pending");
  const [pendingConfirmStatus, setPendingConfirmStatus] = useState<string | null>(null);

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

  const handleExecuteStatusUpdate = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    setPendingConfirmStatus(null);
    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus })
        .eq("id", order.id);

      if (error) {
        toast.error("Erreur lors de la mise à jour : " + error.message);
      } else {
        setCurrentStatus(newStatus);
        if (onStatusUpdated) onStatusUpdated();
        toast.success("Statut de la commande mis à jour avec succès.");

        // Dispatch In-App & Email Notifications
        const orderCode = order.id.slice(0, 8).toUpperCase();
        let notifTitle = "";
        let notifMsg = "";

        if (newStatus === "confirmed") {
          notifTitle = "Commande Confirmée ✅";
          notifMsg = `Votre commande #${orderCode} a été confirmée par le vendeur.`;
        } else if (newStatus === "processing" || newStatus === "preparing") {
          notifTitle = "Commande en Préparation 📦";
          notifMsg = `Le vendeur prépare soigneusement votre commande #${orderCode}.`;
        } else if (newStatus === "shipped" || newStatus === "in_transit") {
          notifTitle = "Commande en Cours d'Expédition 🚚";
          notifMsg = `Votre commande #${orderCode} est en route vers votre point de livraison.`;

          // Trigger Email 1 (SHIPPED)
          try {
            let recipientEmail = order.customer_email;
            if (!recipientEmail && order.customer_id) {
              const { data: prof } = await supabase
                .from("profiles")
                .select("email")
                .eq("id", order.customer_id)
                .maybeSingle();
              if (prof?.email) recipientEmail = prof.email;
            }

            await fetch("/api/notifications/send-email", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: "SHIPPED",
                orderId: order.id,
                orderCode: orderCode,
                recipientEmail: recipientEmail,
                recipientName: order.customer_name,
                deliveryType: order.delivery_type === "pickup_point" ? "Point Relais" : "Livraison à Domicile",
                shopName: "Boutique Partenaire",
                trackingUrl: "https://kalagban.com/account",
              }),
            });
          } catch (mailErr) {
            console.error("Error triggering shipped email:", mailErr);
          }

          // Admin notification
          await supabase.from("admin_notifications").insert({
            title: "Colis Expédié",
            message: `La commande #${orderCode} a été remise au transporteur (${order.customer_name}).`,
            notification_type: "info",
            target_role: "all",
            is_broadcast: true,
          });

          // Point Relais notification if delivery type is pickup_point
          if (order.pickup_point_id) {
            await supabase.from("relay_notifications").insert({
              pickup_point_id: order.pickup_point_id,
              title: "🚚 Colis Remis au Coursier (En Route)",
              message: `Le vendeur a préparé et expédié le colis #${orderCode} (${displayName}). Le coursier est en route vers votre point relais.`,
              type: "in_transit"
            });
          }
        }

        if (notifTitle && order.customer_id) {
          await supabase.from("customer_notifications").insert({
            customer_id: order.customer_id,
            order_id: order.id,
            title: notifTitle,
            message: notifMsg,
            type: "order",
          });
        }
      }
    } catch (err) {
      console.error("Erreur update status:", err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Status progression rank to forbid going backwards
  const getStatusRank = (status: string) => {
    if (status === "pending") return 1;
    if (status === "processing" || status === "preparing") return 2;
    if (status === "shipped" || status === "in_transit") return 3;
    if (status === "delivered" || status === "picked_up") return 4;
    return 1;
  };

  const currentRank = getStatusRank(currentStatus);

  // Anonymized customer display name
  const nameParts = order.customer_name.split("(");
  const displayName = nameParts[0].trim() || "Client Kalagban";

  // Kalagban Official Logistics Support WhatsApp
  const logisticsSupportPhone = "2250777620864";
  const supportMessage = encodeURIComponent(
    `Bonjour Support Logistique Kalagban, je suis la boutique concernant la commande #${order.id.slice(0, 8)}. J'ai une question sur la collecte du colis.`
  );
  const supportWhatsAppUrl = `https://wa.me/${logisticsSupportPhone}?text=${supportMessage}`;

  if (!isClient) return null;

  const modalContent = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg sm:max-w-2xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar my-auto">
        
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
              <span>Support Logistique Kalagban</span>
            </a>
          </div>

          {/* Privacy Note: No direct seller delivery */}
          <div className="bg-blue-50/80 border border-blue-200 rounded-2xl p-4 flex items-start gap-3">
            <ShieldCheck size={20} className="text-blue-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-black text-blue-950 uppercase tracking-wide">
                Logistique 100% Centralisée par Kalagban
              </p>
              <p className="text-xs text-blue-900 font-medium leading-relaxed">
                <strong>Aucune livraison directe par le marchand au client n&apos;est autorisée.</strong> Vous devez uniquement emballer soigneusement les articles et marquer le colis prêt. Le réseau logistique officiel de Kalagban prend le relais pour l&apos;acheminement et la remise sécurisée.
              </p>
            </div>
          </div>

          {/* Seller Action & Order Progression Controls (Irreversible) */}
          <div className="flex flex-col gap-3 bg-indigo-50/60 p-5 rounded-2xl border border-indigo-100">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-black uppercase tracking-wider text-indigo-900">
                  Progression de la Préparation
                </span>
                <p className="text-[11px] text-gray-500 font-medium">
                  Les étapes sont définitives et actualisent instantanément le suivi client.
                </p>
              </div>
              {isUpdatingStatus && <Loader2 size={18} className="animate-spin text-indigo-600" />}
            </div>

            {currentStatus === "cancelled" ? (
              <div className="bg-red-50 text-red-900 border border-red-200 rounded-2xl p-4 flex items-start gap-3">
                <XCircle size={22} className="text-red-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="text-xs font-black text-red-950 uppercase tracking-wide">
                    Commande Annulée par le Client ❌
                  </p>
                  <p className="text-xs text-red-800 font-medium leading-relaxed">
                    Cette commande a été annulée. Les articles ont été automatiquement réintégrés à votre stock boutique. Aucune préparation ni expédition n&apos;est requise de votre part.
                  </p>
                </div>
              </div>
            ) : currentStatus === "delivered" ? (
              <div className="bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl p-3.5 flex items-center gap-2.5 font-bold text-xs">
                <CheckCircle2 size={20} className="text-emerald-600 shrink-0" />
                <span>Cette commande a été livrée et remise au client avec succès.</span>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-1">
                
                {/* Status 1: Pending */}
                <div
                  className={`py-3 px-3 rounded-xl text-xs font-black border flex flex-col items-center gap-1 text-center transition-all ${
                    currentRank === 1 
                      ? "bg-amber-500 text-white border-amber-500 shadow-md shadow-amber-500/20" 
                      : "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60"
                  }`}
                >
                  <div className="flex items-center gap-1">
                    {currentRank > 1 && <Lock size={12} />}
                    <span>1. En attente</span>
                  </div>
                  <span className="text-[10px] font-normal opacity-80">
                    {currentRank > 1 ? "Validée" : "Nouvelle commande"}
                  </span>
                </div>

                {/* Status 2: Processing (Preparing) */}
                {currentRank === 1 ? (
                  <button
                    type="button"
                    onClick={() => setPendingConfirmStatus("processing")}
                    disabled={isUpdatingStatus}
                    className="py-3 px-3 rounded-xl text-xs font-black transition-all border border-indigo-300 bg-white hover:bg-indigo-50 text-indigo-700 shadow-sm flex flex-col items-center gap-1 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>2. Mettre en préparation 👨‍🍳</span>
                    <span className="text-[10px] font-normal text-indigo-500">Commencer l&apos;emballage</span>
                  </button>
                ) : currentRank === 2 ? (
                  <div className="py-3 px-3 rounded-xl text-xs font-black border bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/20 flex flex-col items-center gap-1">
                    <span>2. En préparation 👨‍🍳</span>
                    <span className="text-[10px] font-normal opacity-90">Colis en cours d&apos;emballage</span>
                  </div>
                ) : (
                  <div className="py-3 px-3 rounded-xl text-xs font-black border bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <Lock size={12} />
                      <span>2. En préparation</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">Préparée</span>
                  </div>
                )}

                {/* Status 3: Shipped (Ready for pickup by courier) */}
                {currentRank === 2 ? (
                  <button
                    type="button"
                    onClick={() => setPendingConfirmStatus("shipped")}
                    disabled={isUpdatingStatus}
                    className="py-3 px-3 rounded-xl text-xs font-black transition-all border border-blue-300 bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-600/25 flex flex-col items-center gap-1 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <span>3. Colis Prêt / Expédié 📦</span>
                    <span className="text-[10px] font-normal text-blue-100">Transmettre à Kalagban</span>
                  </button>
                ) : currentRank === 3 ? (
                  <div className="py-3 px-3 rounded-xl text-xs font-black border bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-600/20 flex flex-col items-center gap-1">
                    <span>3. Colis Expédié 📦</span>
                    <span className="text-[10px] font-normal opacity-90">En acheminement Kalagban</span>
                  </div>
                ) : (
                  <div className="py-3 px-3 rounded-xl text-xs font-black border bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed opacity-60 flex flex-col items-center gap-1">
                    <div className="flex items-center gap-1">
                      <Lock size={12} />
                      <span>3. Expédition</span>
                    </div>
                    <span className="text-[10px] font-normal opacity-80">En attente étape 2</span>
                  </div>
                )}

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
            <div className="h-px bg-gray-200 my-1" />
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

      {/* Confirmation Dialog Overlay */}
      {pendingConfirmStatus && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 text-center animate-in zoom-in-95">
            
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto shadow-inner ${
              pendingConfirmStatus === "shipped" 
                ? "bg-blue-50 text-blue-600 ring-8 ring-blue-50/50" 
                : "bg-indigo-50 text-indigo-600 ring-8 ring-indigo-50/50"
            }`}>
              {pendingConfirmStatus === "shipped" ? <Truck size={32} /> : <PackageCheck size={32} />}
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                {pendingConfirmStatus === "shipped" 
                  ? "Confirmer que le colis est prêt ?" 
                  : "Mettre la commande en préparation ?"}
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                {pendingConfirmStatus === "shipped" ? (
                  <>
                    Vérifiez que le colis est <strong>bien emballé, scellé et étiqueté</strong> avec le N° de commande <strong>#{order.id.slice(0, 8).toUpperCase()}</strong>.<br /><br />
                    <span className="text-blue-700 font-bold">⚠️ Cette action est irréversible.</span> Elle alerte immédiatement le réseau logistique Kalagban et l&apos;acheteur.
                  </>
                ) : (
                  <>
                    Confirmez-vous la disponibilité en stock de ces articles ? Dès validation, l&apos;acheteur verra sa timeline passer à <strong>« En préparation chez le vendeur »</strong>.
                  </>
                )}
              </p>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPendingConfirmStatus(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleExecuteStatusUpdate(pendingConfirmStatus)}
                className={`flex-1 py-3 px-4 rounded-xl text-white font-extrabold text-xs transition-all shadow-lg flex items-center justify-center gap-1.5 ${
                  pendingConfirmStatus === "shipped" 
                    ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/25" 
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/25"
                }`}
              >
                <span>Confirmer</span>
                <ArrowRight size={14} />
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );

  return createPortal(modalContent, document.body);
}
