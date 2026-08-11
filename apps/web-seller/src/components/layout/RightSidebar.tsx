"use client";

import React, { useState, useEffect } from "react";
import { ArrowRight, Loader2, Package } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

import OrderDetailModal, { SellerOrder } from "@/components/orders/OrderDetailModal";

interface Order extends SellerOrder {
  id: string;
  shop_id: string;
  customer_name: string;
  total_amount: number;
  created_at: string;
  status: string;
}

export default function RightSidebar() {
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalToday, setTotalToday] = useState(0);
  const [pendingCount, setPendingCount] = useState(0);
  const [selectedOrder, setSelectedOrder] = useState<SellerOrder | null>(null);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('shop_id', session.user.id)
        .order('created_at', { ascending: false });

      if (orders) {
        setRecentOrders(orders.slice(0, 5) as Order[]);
        
        let todayTotal = 0;
        let pending = 0;
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        orders.forEach(o => {
          if (o.status === 'pending') pending++;
          
          const orderDate = new Date(o.created_at);
          if (orderDate >= today && o.status !== 'cancelled') {
            todayTotal += Number(o.total_amount);
          }
        });
        
        setTotalToday(todayTotal);
        setPendingCount(pending);
      }
    } catch (error) {
      console.error("Error loading right sidebar:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setTimeout(() => {
      loadData();
    }, 0);
  }, []);

  return (
    <aside className="w-80 bg-surface h-full shadow-[0_0_40px_-15px_rgba(0,0,0,0.05)] p-6 hidden xl:flex flex-col z-20 sticky top-0 right-0 border-l border-gray-100">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-bold text-text-main">Commandes Récentes</h2>
        {pendingCount > 0 && (
          <span className="bg-primary/10 text-primary px-2 py-1 rounded-md text-xs font-bold">{pendingCount} Nouvelles</span>
        )}
      </div>

      {/* Orders List */}
      <div className="flex flex-col gap-4 overflow-y-auto pr-2 pb-4 flex-1 custom-scrollbar">
        {isLoading ? (
          <div className="flex justify-center p-4"><Loader2 className="animate-spin text-primary" /></div>
        ) : recentOrders.length === 0 ? (
          <div className="text-center p-4 text-text-muted text-sm">Aucune commande récente.</div>
        ) : (
          recentOrders.map((order) => {
            const orderDate = new Date(order.created_at);
            return (
              <div 
                key={order.id} 
                onClick={() => setSelectedOrder(order)}
                className="flex gap-4 p-3 hover:bg-bg-app rounded-2xl transition-colors border border-gray-50 group cursor-pointer"
              >
                <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-xl overflow-hidden shrink-0 flex justify-center items-center font-bold">
                  <Package size={22} />
                </div>
                <div className="flex flex-col justify-center flex-1 overflow-hidden">
                  <h4 className="font-bold text-sm text-text-main leading-tight truncate">Commande #{order.id.substring(0,6)}</h4>
                  <span className="text-text-muted text-xs mt-0.5 truncate font-medium">
                    {orderDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                  </span>
                  <div className="flex justify-between items-center mt-1">
                    <span className="font-extrabold text-primary text-sm">{order.total_amount.toLocaleString('fr-FR')} FCFA</span>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Footer */}
      <div className="mt-auto border-t border-gray-100 pt-6">
        <div className="flex justify-between text-sm mb-3">
          <span className="text-text-muted">Total du jour</span>
          <span className="font-bold text-text-main">{totalToday.toLocaleString('fr-FR')} FCFA</span>
        </div>
        <div className="flex justify-between text-sm mb-5">
          <span className="text-text-muted">À expédier</span>
          <span className={`font-bold ${pendingCount > 0 ? "text-danger" : "text-success"}`}>{pendingCount} commandes</span>
        </div>
        
        <Link 
          href="/orders" 
          className="w-full bg-primary text-white font-bold py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 hover:bg-indigo-600 transition-all shadow-lg shadow-primary/30 group cursor-pointer text-sm"
        >
          <span>Traiter les commandes</span>
          <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {/* ORDER DETAIL MODAL */}
      {selectedOrder && (
        <OrderDetailModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusUpdated={() => loadData()}
        />
      )}
    </aside>
  );
}
