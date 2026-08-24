"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  Loader2, 
  MapPin, 
  Search, 
  X, 
  XCircle, 
  Store, 
  User, 
  Eye, 
  Phone
} from "lucide-react";

interface AdminOrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  products?: {
    title: string;
  };
}

interface AdminOrder {
  id: string;
  total_amount: number;
  subtotal?: number;
  application_fee?: number;
  application_fee_rate?: number;
  shipping_fee?: number;
  status: string;
  created_at: string;
  customer_name?: string;
  customer_phone?: string;
  customer_email?: string;
  delivery_type?: string;
  pickup_code?: string;
  relay_status?: string;
  pickup_point_id?: string;
  shop_id?: string;
  shops?: {
    id: string;
    name: string;
    payout_phone?: string;
  };
  pickup_points?: {
    id: string;
    name: string;
    commune?: string;
    code?: string;
  };
  order_items?: AdminOrderItem[];
  shipping_address?: string | {
    full_name?: string;
    phone?: string;
    city?: string;
    address_line?: string;
  };
}

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [inspectOrder, setInspectOrder] = useState<AdminOrder | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select(`
          *,
          shops ( id, name, payout_phone ),
          pickup_points ( id, name, commune, code ),
          order_items ( id, quantity, unit_price, products ( title ) )
        `)
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as unknown as AdminOrder[]);
      }
    } catch (err) {
      console.error("Error fetching admin orders:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    const initFetch = async () => {
      try {
        const { data, error } = await supabase
          .from("orders")
          .select(`
            *,
            shops ( id, name, payout_phone ),
            pickup_points ( id, name, commune, code ),
            order_items ( id, quantity, unit_price, products ( title ) )
          `)
          .order("created_at", { ascending: false });

        if (isMounted) {
          if (!error && data) {
            setOrders(data as unknown as AdminOrder[]);
          }
          setLoading(false);
        }
      } catch (err) {
        console.error("Error fetching admin orders:", err);
        if (isMounted) setLoading(false);
      }
    };

    initFetch();

    const channel = supabase
      .channel("admin_orders_realtime_audit")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => {
        fetchOrders();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [fetchOrders]);

  const filteredOrders = orders.filter((o) => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch =
      !q ||
      o.id.toLowerCase().includes(q) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
      (o.shops?.name && o.shops.name.toLowerCase().includes(q)) ||
      (o.pickup_points?.name && o.pickup_points.name.toLowerCase().includes(q)) ||
      (typeof o.shipping_address === "string" && o.shipping_address.toLowerCase().includes(q));

    if (!matchSearch) return false;

    if (filterStatus === "all") return true;
    if (filterStatus === "cancelled") return o.status === "cancelled";
    if (filterStatus === "pending") return o.status === "pending" || o.status === "pending_payment";
    if (filterStatus === "processing") return o.status === "processing";
    if (filterStatus === "ready_for_pickup") return o.relay_status === "ready_for_pickup" || o.relay_status === "deposited";
    if (filterStatus === "in_transit") return o.status === "shipped" || o.status === "in_transit";
    if (filterStatus === "delivered") return o.status === "delivered" || o.relay_status === "picked_up";

    return o.status === filterStatus;
  });

  const getBadge = (order: AdminOrder) => {
    if (order.status === "cancelled") {
      return (
        <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1 rounded-full border border-red-200 flex items-center gap-1">
          <XCircle size={13} /> Annulée (Stock remis)
        </span>
      );
    }
    if (order.status === "delivered" || order.relay_status === "picked_up") {
      return (
        <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 flex items-center gap-1">
          <CheckCircle2 size={13} /> Livrée 🎉
        </span>
      );
    }
    if (order.relay_status === "ready_for_pickup" || order.relay_status === "deposited") {
      return (
        <span className="bg-amber-50 text-amber-800 text-xs font-bold px-3 py-1 rounded-full border border-amber-300 flex items-center gap-1">
          <MapPin size={13} /> Au Point Relais 📍
        </span>
      );
    }
    if (order.status === "shipped" || order.status === "in_transit") {
      return (
        <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1 rounded-full border border-blue-200 flex items-center gap-1">
          <Truck size={13} /> En livraison 🚚
        </span>
      );
    }
    if (order.status === "processing") {
      return (
        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1 rounded-full border border-indigo-200 flex items-center gap-1">
          <Package size={13} /> En préparation boutique 📦
        </span>
      );
    }
    if (order.status === "pending_payment") {
      return (
        <span className="bg-orange-50 text-orange-700 text-xs font-bold px-3 py-1 rounded-full border border-orange-200 flex items-center gap-1">
          <Clock size={13} /> Attente paiement 💳
        </span>
      );
    }
    return (
      <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1 rounded-full border border-amber-200 flex items-center gap-1">
        <Clock size={13} /> En attente vendeur ⏳
      </span>
    );
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black shadow-xs">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Supervision &amp; Traçabilité des Commandes</h1>
            <p className="text-xs text-gray-500 font-medium">Suivez qui a commandé, quelle boutique prépare, et l&apos;état exact des livraisons et annulations en temps réel.</p>
          </div>
        </div>

        <div className="text-xs font-bold text-gray-500 bg-gray-50 px-4 py-2 rounded-xl border border-gray-200 shrink-0">
          Total : <strong className="text-indigo-600 font-black">{orders.length}</strong> commandes
        </div>
      </div>

      {/* Filter Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {[
            { id: "all", label: "Toutes les commandes" },
            { id: "pending", label: "En attente ⏳" },
            { id: "processing", label: "En préparation 📦" },
            { id: "ready_for_pickup", label: "Au Point Relais 📍" },
            { id: "in_transit", label: "En livraison 🚚" },
            { id: "delivered", label: "Livrées 🎉" },
            { id: "cancelled", label: "Annulées ❌" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Bar */}
        <div className="relative max-w-md w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher (ID, Client, Boutique, Relais)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-10 py-2.5 text-xs font-medium outline-none focus:border-indigo-600 shadow-2xs"
          />
          {searchTerm ? (
            <button
              type="button"
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X size={14} />
            </button>
          ) : null}
        </div>
      </div>

      {/* Orders Table List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des commandes et historiques...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-16 text-center text-gray-400 font-medium text-xs flex flex-col items-center">
            <Package size={36} className="mb-2 text-gray-300" />
            Aucune commande enregistrée dans cette catégorie.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((order) => {
              const addressText = typeof order.shipping_address === "string"
                ? order.shipping_address
                : `${order.shipping_address?.full_name || ""} ${order.shipping_address?.phone || ""} ${order.shipping_address?.address_line || ""}`;

              return (
                <div 
                  key={order.id} 
                  className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6 hover:bg-slate-50/60 transition-colors"
                >
                  {/* Left Info */}
                  <div className="space-y-2 flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono font-black text-sm text-gray-900">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      {getBadge(order)}
                      {order.delivery_type === "pickup_point" ? (
                        <span className="text-[10px] font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md border border-purple-200">
                          📦 Point Relais {order.pickup_points?.name ? `(${order.pickup_points.name})` : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                          🚚 Livraison Domicile
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-gray-700 font-medium">
                      {/* Client */}
                      <div className="flex items-center gap-1.5">
                        <User size={13} className="text-indigo-600 shrink-0" />
                        <span className="font-bold text-gray-900">{order.customer_name || "Client"}</span>
                        {order.customer_phone && (
                          <span className="text-gray-500 font-mono">({order.customer_phone})</span>
                        )}
                      </div>

                      {/* Boutique Vendeuse */}
                      <div className="flex items-center gap-1.5 text-gray-600 bg-amber-50/80 px-2.5 py-0.5 rounded-lg border border-amber-100">
                        <Store size={13} className="text-amber-600 shrink-0" />
                        <span>Boutique : <strong className="text-gray-900">{order.shops?.name || "Partenaire Kalagban"}</strong></span>
                      </div>
                    </div>

                    {addressText && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <MapPin size={13} className="text-gray-400 shrink-0" />
                        <span className="truncate">{addressText}</span>
                      </div>
                    )}
                  </div>

                  {/* Right Financial & Actions */}
                  <div className="flex items-center justify-between lg:justify-end gap-6 shrink-0 pt-3 lg:pt-0 border-t lg:border-t-0 border-gray-100">
                    <div className="text-left lg:text-right">
                      <span className="text-lg font-black text-indigo-600">
                        {Number(order.total_amount || 0).toLocaleString("fr-FR")} FCFA
                      </span>
                      <p className="text-[10px] text-gray-400 font-medium">
                        {new Date(order.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                      </p>
                    </div>

                    <button
                      onClick={() => setInspectOrder(order)}
                      className="bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Eye size={14} />
                      Inspecter
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* INSPECT ORDER AUDIT MODAL */}
      {inspectOrder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto space-y-6">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black">
                  <Package size={20} />
                </div>
                <div>
                  <h3 className="font-black text-gray-900 text-lg">Commande #{inspectOrder.id.slice(0, 8).toUpperCase()}</h3>
                  <p className="text-xs text-gray-400 font-medium">Date: {new Date(inspectOrder.created_at).toLocaleString("fr-FR")}</p>
                </div>
              </div>
              <button
                onClick={() => setInspectOrder(null)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-600 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {/* Status & Traçabilité */}
            <div className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase text-gray-400">Statut Actuel :</span>
                <div className="mt-1">{getBadge(inspectOrder)}</div>
              </div>
              {inspectOrder.pickup_code && (
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-amber-600">Code OTP Retrait :</span>
                  <p className="text-base font-black font-mono text-amber-700">{inspectOrder.pickup_code}</p>
                </div>
              )}
            </div>

            {/* Boutique & Client Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Boutique Box */}
              <div className="p-4 rounded-2xl border border-amber-100 bg-amber-50/40 space-y-1.5 text-xs">
                <span className="font-extrabold text-amber-800 flex items-center gap-1">
                  <Store size={14} /> Boutique Vendeuse
                </span>
                <p className="font-bold text-gray-900">{inspectOrder.shops?.name || "Boutique Partenaire"}</p>
                {inspectOrder.shops?.payout_phone && (
                  <p className="text-gray-500 flex items-center gap-1 font-mono">
                    <Phone size={12} /> {inspectOrder.shops.payout_phone}
                  </p>
                )}
              </div>

              {/* Client Box */}
              <div className="p-4 rounded-2xl border border-indigo-100 bg-indigo-50/40 space-y-1.5 text-xs">
                <span className="font-extrabold text-indigo-800 flex items-center gap-1">
                  <User size={14} /> Acheteur / Client
                </span>
                <p className="font-bold text-gray-900">{inspectOrder.customer_name || "Client"}</p>
                {inspectOrder.customer_phone && (
                  <p className="text-gray-500 flex items-center gap-1 font-mono">
                    <Phone size={12} /> {inspectOrder.customer_phone}
                  </p>
                )}
              </div>
            </div>

            {/* Articles List */}
            <div>
              <h4 className="font-bold text-xs uppercase text-gray-400 mb-2">Articles commandés :</h4>
              <div className="space-y-2">
                {inspectOrder.order_items?.map((item) => (
                  <div key={item.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between text-xs font-medium">
                    <span className="font-bold text-gray-900">{item.products?.title || "Produit"}</span>
                    <span className="text-gray-600">{item.quantity} x {Number(item.unit_price).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Summary */}
            <div className="border-t border-gray-100 pt-4 space-y-1 text-xs text-gray-500">
              <div className="flex justify-between">
                <span>Sous-total articles :</span>
                <strong className="text-gray-900">{Number(inspectOrder.subtotal || 0).toLocaleString()} FCFA</strong>
              </div>
              <div className="flex justify-between">
                <span>Frais d&apos;application Kalagban :</span>
                <strong className="text-indigo-600">+{Number(inspectOrder.application_fee || 0).toLocaleString()} FCFA</strong>
              </div>
              <div className="flex justify-between text-sm font-black text-gray-900 pt-2 border-t border-gray-100">
                <span>Montant Total :</span>
                <span className="text-indigo-600">{Number(inspectOrder.total_amount || 0).toLocaleString()} FCFA</span>
              </div>
            </div>

            {/* Footer Close */}
            <div className="pt-2">
              <button
                onClick={() => setInspectOrder(null)}
                className="w-full bg-gray-900 hover:bg-gray-800 text-white font-bold py-3 rounded-2xl text-xs transition-colors cursor-pointer"
              >
                Fermer l&apos;inspection
              </button>
            </div>

          </div>
        </div>
      )}

    </main>
  );
}
