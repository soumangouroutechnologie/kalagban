"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Package, Truck, CheckCircle2, Clock, Loader2, MapPin } from "lucide-react";

interface AdminOrder {
  id: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address?: {
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

  const filteredOrders = orders.filter(o => 
    filterStatus === "all" ? true : o.status === filterStatus
  );

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
            {filteredOrders.map((order) => (
              <div key={order.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-sm text-gray-900">
                      Commande #{order.id.slice(0, 8)}
                    </span>
                    <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100 uppercase">
                      {order.status}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-gray-500 font-medium">
                    <MapPin size={14} className="text-indigo-600 shrink-0" />
                    <span>
                      {order.shipping_address?.full_name || "Client Kalagban"} — {order.shipping_address?.phone || "+225 07..."} — {order.shipping_address?.address_line || "Abidjan"}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span className="text-lg font-black text-gray-900">
                    {Number(order.total_amount).toLocaleString()} FCFA
                  </span>
                  <p className="text-[11px] text-gray-400 font-medium mt-0.5">
                    {new Date(order.created_at).toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
