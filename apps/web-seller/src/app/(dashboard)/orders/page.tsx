"use client";

import React, { useState, useEffect } from "react";
import { Search, Filter, Eye, Truck, CheckCircle2, Clock, XCircle, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import OrderDetailModal, { SellerOrder } from "@/components/orders/OrderDetailModal";

interface Order extends SellerOrder {
  id: string;
  shop_id: string;
  customer_name: string;
  total_amount: number;
  status: string;
  created_at: string;
  shipping_address?: string;
}

export default function OrdersPage() {
  const [activeTab, setActiveTab] = useState("Toutes");
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  const tabs = ["Toutes", "En attente", "Expédiées", "Livrées", "Annulées"];

  const loadOrders = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', session.user.id)
        .order('created_at', { ascending: false });

      if (data) setOrders(data as Order[]);
    } catch (error) {
      console.error("Error loading orders:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      loadOrders();
    }, 0);
  }, []);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending": return <Clock size={16} className="text-warning" />;
      case "shipped": return <Truck size={16} className="text-info" />;
      case "delivered": return <CheckCircle2 size={16} className="text-success" />;
      case "cancelled": return <XCircle size={16} className="text-danger" />;
      default: return <Clock size={16} className="text-warning" />;
    }
  };

  const getStatusStyle = (status: string) => {
    switch (status) {
      case "pending": return "bg-warning/10 text-warning";
      case "shipped": return "bg-info/10 text-info";
      case "delivered": return "bg-success/10 text-success";
      case "cancelled": return "bg-danger/10 text-danger";
      default: return "bg-gray-100 text-gray-600";
    }
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "pending": return "En attente";
      case "shipped": return "Expédiée";
      case "delivered": return "Livrée";
      case "cancelled": return "Annulée";
      default: return status;
    }
  };

  const mapTabToStatus = (tab: string) => {
    switch(tab) {
      case "En attente": return "pending";
      case "Expédiées": return "shipped";
      case "Livrées": return "delivered";
      case "Annulées": return "cancelled";
      default: return "";
    }
  };

  const actualFilteredOrders = orders.filter(o => {
    const q = searchTerm.trim().toLowerCase();
    const matchSearch = !q || 
                        o.id.toLowerCase().includes(q) || 
                        (o.customer_name && o.customer_name.toLowerCase().includes(q)) ||
                        (o.shipping_address && o.shipping_address.toLowerCase().includes(q));
    if (!matchSearch) return false;
    
    if (activeTab === "Toutes") return true;
    return o.status === mapTabToStatus(activeTab);
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Commandes</h1>
          <p className="text-text-muted mt-1">Vous avez <strong className="text-warning font-bold">{orders.filter(o => o.status === 'pending').length} commandes</strong> en attente d&apos;expédition.</p>
        </div>
        <div className="flex gap-2">
          <button className="bg-white border border-gray-200 text-text-main font-bold px-4 py-2.5 rounded-xl shadow-sm hover:bg-gray-50 transition-colors">
            Exporter
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-200 hide-scroll-indicator">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${
              activeTab === tab 
                ? "border-primary text-primary" 
                : "border-transparent text-text-muted hover:text-text-main hover:border-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-surface rounded-card p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between gap-4 mt-2">
        <div className="relative w-full sm:max-w-md">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par ID, client..." 
            className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-2.5 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <button className="flex items-center gap-2 bg-bg-app border border-gray-200 text-text-main px-4 py-2.5 rounded-xl font-bold hover:bg-gray-50 transition-colors">
          <Filter size={18} />
          Filtrer
        </button>
      </div>

      {/* Orders Table */}
      <div className="bg-surface rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : actualFilteredOrders.length === 0 ? (
            <div className="p-12 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                <Search size={32} />
              </div>
              <h3 className="text-lg font-bold text-text-main mb-1">Aucune commande trouvée</h3>
              <p className="text-text-muted">Il n&apos;y a aucune commande correspondant à ce statut pour le moment.</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-bg-app text-text-muted text-sm border-b border-gray-100">
                  <th className="font-bold py-4 px-6">Commande</th>
                  <th className="font-bold py-4 px-6">Date</th>
                  <th className="font-bold py-4 px-6">Client</th>
                  <th className="font-bold py-4 px-6">Statut</th>
                  <th className="font-bold py-4 px-6">Total</th>
                  <th className="font-bold py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {actualFilteredOrders.map((order) => (
                  <tr key={order.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group">
                    <td className="py-4 px-6 font-bold text-text-main">
                      {order.id.substring(0, 8)}...
                    </td>
                    <td className="py-4 px-6 text-text-muted font-medium text-sm">
                      {new Date(order.created_at).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          {order.customer_name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-text-main text-sm">{order.customer_name}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${getStatusStyle(order.status)}`}>
                        {getStatusIcon(order.status)}
                        {translateStatus(order.status)}
                      </span>
                    </td>
                    <td className="py-4 px-6 font-black text-text-main">{order.total_amount} FCFA</td>
                    <td className="py-4 px-6 text-right">
                      {order.status === "cancelled" ? (
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="text-xs font-bold text-gray-500 hover:text-gray-900 bg-gray-100 hover:bg-gray-200 px-3.5 py-2 rounded-xl transition-all border border-gray-200 flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Eye size={14} />
                          Consulter
                        </button>
                      ) : (
                        <button 
                          onClick={() => setSelectedOrder(order)}
                          className="text-xs font-extrabold text-primary hover:text-white bg-primary/10 hover:bg-primary px-3.5 py-2 rounded-xl transition-all border border-primary/20 shadow-xs flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Eye size={14} />
                          Gérer la commande
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={() => loadOrders()}
        />
      )}

    </div>
  );
}
