"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Truck, CheckCircle2, Clock, Loader2, MapPin, Search, X } from "lucide-react";

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
  delivery_type?: string;
  relay_status?: string;
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

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setOrders(data as AdminOrder[]);
      }
    } catch (err) {
      console.error("Error fetching admin orders:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();

    const channel = supabase
      .channel("admin_orders_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchOrders())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const filteredOrders = orders.filter(o => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q ||
      o.id.toLowerCase().includes(q) ||
      (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
      (o.customer_phone && o.customer_phone.toLowerCase().includes(q)) ||
      (typeof o.shipping_address === "string" && o.shipping_address.toLowerCase().includes(q)) ||
      (typeof o.shipping_address === "object" && (
        o.shipping_address?.city?.toLowerCase().includes(q) ||
        o.shipping_address?.full_name?.toLowerCase().includes(q) ||
        o.shipping_address?.address_line?.toLowerCase().includes(q)
      ));

    if (!matchSearch) return false;
    return filterStatus === "all" ? true : o.status === filterStatus;
  });

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <Package size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Supervision des Commandes</h1>
            <p className="text-xs text-gray-500 font-medium">Vue d&apos;ensemble de toutes les transactions de la plateforme</p>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2 overflow-x-auto">
          {[
            { id: "all", label: "Toutes les commandes" },
            { id: "pending", label: "En attente ⏳" },
            { id: "delivering", label: "En livraison 🚚" },
            { id: "delivered", label: "Livrées 🎉" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setFilterStatus(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                filterStatus === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md w-full">
        <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Rechercher par n° de commande, client, ville..."
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

      {/* Orders List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des commandes...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium text-xs">
            Aucune commande enregistrée dans cette catégorie.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredOrders.map((order) => {
              const addressText = typeof order.shipping_address === "string"
                ? order.shipping_address
                : `${order.shipping_address?.full_name || ""} ${order.shipping_address?.phone || ""} ${order.shipping_address?.address_line || ""}`;

              return (
                <div key={order.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <span className="font-mono font-black text-sm text-gray-900">
                        Commande #{order.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase">
                        {order.status}
                      </span>
                      {order.delivery_type === "pickup_point" ? (
                        <span className="text-[10px] font-extrabold text-amber-700 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200 uppercase flex items-center gap-1">
                          📦 Retrait Point Relais {order.relay_status ? `(${order.relay_status})` : ""}
                        </span>
                      ) : (
                        <span className="text-[10px] font-extrabold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200 uppercase flex items-center gap-1">
                          🚚 Livraison Domicile
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-xs text-gray-700 font-medium">
                      <span className="font-bold text-gray-900">{order.customer_name || "Client"}</span>
                      {order.customer_phone && (
                        <span className="text-gray-500 font-mono">({order.customer_phone})</span>
                      )}
                    </div>

                    {addressText && (
                      <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                        <MapPin size={14} className="text-indigo-600 shrink-0" />
                        <span className="line-clamp-1">{addressText}</span>
                      </div>
                    )}
                  </div>

                  <div className="text-right shrink-0 flex flex-col items-end gap-1">
                    <span className="text-lg font-black text-indigo-700">
                      {Number(order.total_amount || 0).toLocaleString()} FCFA
                    </span>
                    <div className="text-[11px] text-gray-500 font-medium flex flex-col items-end">
                      <span>Articles: <strong className="text-gray-800">{Number(order.subtotal || (Number(order.total_amount) - Number(order.application_fee || 0))).toLocaleString()} FCFA</strong></span>
                      {Number(order.application_fee) > 0 && (
                        <span className="text-indigo-600 font-bold">
                          Frais app: +{Number(order.application_fee).toLocaleString()} FCFA {order.application_fee_rate ? `(${Number(order.application_fee_rate * 100).toFixed(2)}%)` : ""}
                        </span>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                      {new Date(order.created_at).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </main>
  );
}
