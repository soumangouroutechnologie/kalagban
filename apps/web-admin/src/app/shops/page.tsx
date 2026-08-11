"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Store, 
  CheckCircle2, 
  Ban, 
  Trash2, 
  Search, 
  Loader2, 
  ExternalLink,
  ShieldCheck
} from "lucide-react";

interface ShopItem {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  status?: string;
  created_at?: string;
  owner_id?: string;
}

export default function AdminShopsPage() {
  const [shops, setShops] = useState<ShopItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchShops = async () => {
    try {
      const { data, error } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setShops(data as ShopItem[]);
      }
    } catch (err) {
      console.error("Error fetching shops:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShops();
  }, []);

  const handleUpdateShopStatus = async (shopId: string, newStatus: string) => {
    setUpdatingId(shopId);

    try {
      const { error } = await supabase
        .from("shops")
        .update({ status: newStatus })
        .eq("id", shopId);

      if (error) throw error;

      setShops(shops.map(s => s.id === shopId ? { ...s, status: newStatus } : s));
    } catch (err) {
      console.error("Error updating shop status:", err);
      alert("Erreur lors de la mise à jour de la boutique.");
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredShops = shops.filter((shop) => {
    const matchesSearch = shop.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (shop.description && shop.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterStatus === "all" ? true : shop.status === filterStatus;
    return matchesSearch && matchesFilter;
  });

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <Store size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Modération des Boutiques</h1>
            <p className="text-xs text-gray-500 font-medium">Certification, approbation et gestion des commerçants</p>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative flex-1 w-full max-w-md">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher une boutique..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
          {[
            { id: "all", label: "Toutes les boutiques" },
            { id: "active", label: "Vérifiées 🟢" },
            { id: "suspended", label: "Suspendues 🟡" },
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

      {/* Shops List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des boutiques...</p>
          </div>
        ) : filteredShops.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium text-xs">
            Aucune boutique trouvée pour le moment.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredShops.map((shop) => (
              <div key={shop.id} className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-2xl overflow-hidden shrink-0 flex items-center justify-center font-black text-xl shadow-md">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {shop.logo_url ? <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" /> : shop.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-base text-gray-900">{shop.name}</h3>
                      {shop.status === "suspended" ? (
                        <span className="bg-red-50 text-red-700 font-extrabold px-2.5 py-0.5 rounded-full border border-red-200 text-[10px]">
                          Boutique Suspendue 🔴
                        </span>
                      ) : (
                        <span className="bg-emerald-50 text-emerald-700 font-extrabold px-2.5 py-0.5 rounded-full border border-emerald-200 text-[10px] flex items-center gap-1">
                          <CheckCircle2 size={12} /> Vendeur Vérifié &amp; Certifié 🟢
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-1 line-clamp-1">
                      {shop.description || "Aucune description renseignée."}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {updatingId === shop.id ? (
                    <Loader2 className="animate-spin text-indigo-600 w-6 h-6" />
                  ) : (
                    <>
                      {shop.status === "suspended" ? (
                        <button
                          onClick={() => handleUpdateShopStatus(shop.id, "active")}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                        >
                          <ShieldCheck size={14} /> Approuver &amp; Certifier (Réactiver)
                        </button>
                      ) : (
                        <button
                          onClick={() => handleUpdateShopStatus(shop.id, "suspended")}
                          className="bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer shadow-sm transition-colors"
                        >
                          <Ban size={14} /> Suspendre la boutique
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

    </main>
  );
}
