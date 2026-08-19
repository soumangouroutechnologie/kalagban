"use client";

import { useState, useEffect } from "react";
import { Search, Filter, ShieldCheck, Phone, User, Calendar } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PackageItem {
  id: string;
  client: string;
  phone: string;
  status: string;
  shelf: string;
  deposited: string;
  amount: string;
}

export default function RelayPackagesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packages, setPackages] = useState<PackageItem[]>([]);

  useEffect(() => {
    const fetchPackages = async () => {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .eq("delivery_type", "pickup_point")
        .order("created_at", { ascending: false });

      if (data && data.length > 0) {
        setPackages(data.map((o: Record<string, any>) => ({
          id: o.id,
          client: o.customer_name || "Client Kalagban",
          phone: o.customer_phone || "+225 --",
          status: o.relay_status || "ready_for_pickup",
          shelf: "Étagère A-01",
          deposited: new Date(o.created_at).toLocaleDateString("fr-FR"),
          amount: `${Number(o.total_amount || 0).toLocaleString()} FCFA`
        })));
      } else {
        setPackages([]);
      }
    };

    fetchPackages();
  }, []);

  const filtered = packages.filter(p => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || 
                          p.id.toLowerCase().includes(q) || 
                          p.client.toLowerCase().includes(q) ||
                          p.phone.toLowerCase().includes(q) ||
                          p.shelf.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || p.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventaire des Colis en Étagère</h1>
          <p className="text-gray-500 text-xs font-medium mt-1">Liste détaillée et emplacement physique des colis actuellement stockés dans votre point relais.</p>
        </div>

        <div className="flex items-center space-x-2 bg-white border border-gray-100 rounded-2xl p-3 text-xs font-bold text-gray-700 shadow-xs">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Audit Inventaire Synchronisé</span>
        </div>
      </div>

      {/* Filters & Search Bar */}
      <div className="bg-white border border-gray-100 rounded-3xl p-4 flex flex-col md:flex-row gap-4 shadow-xs">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher par N° Colis, Nom Client ou Téléphone..."
            className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 pl-11 text-xs text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-all font-medium"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-4 top-3.5" />
        </div>

        <div className="flex items-center space-x-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-gray-50 border border-gray-200 rounded-2xl px-4 py-3 text-xs text-gray-800 font-bold focus:outline-none focus:ring-2 focus:ring-indigo-600/40"
          >
            <option value="all">Tous les statuts</option>
            <option value="ready_for_pickup">En Étagère (Prêt au retrait)</option>
            <option value="picked_up">Remis au Client</option>
            <option value="returned">Retourné à la Marketplace</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-400 uppercase font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">N° Colis</th>
                <th className="px-4 py-3.5">Acheteur / Contact</th>
                <th className="px-4 py-3.5">Emplacement Étagère</th>
                <th className="px-4 py-3.5">Statut Actuel</th>
                <th className="px-4 py-3.5">Date de Réception</th>
                <th className="px-4 py-3.5 rounded-r-xl text-right">Valeur Colis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium text-xs">
                    Aucun colis actuellement enregistré en étagère.
                  </td>
                </tr>
              ) : (
                filtered.map((pkg) => (
                  <tr key={pkg.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-4 font-mono font-black text-indigo-600">{pkg.id}</td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-gray-400" />
                        <span>{pkg.client}</span>
                      </div>
                      <div className="text-[11px] text-gray-500 font-mono flex items-center gap-1.5 mt-0.5">
                        <Phone className="w-3 h-3 text-gray-400" />
                        <span>{pkg.phone}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-mono text-xs">
                      <span className="bg-gray-100 border border-gray-200 px-2.5 py-1 rounded-lg text-gray-800 font-bold">
                        {pkg.shelf}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      {pkg.status === "pending_deposit" && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200">
                          Attendu
                        </span>
                      )}
                      {(pkg.status === "ready_for_pickup" || pkg.status === "deposited") && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          En Stock
                        </span>
                      )}
                      {pkg.status === "picked_up" && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Remis Client
                        </span>
                      )}
                      {pkg.status === "returned" && (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-red-50 text-red-700 border border-red-200">
                          Retourné
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 font-medium flex items-center gap-1.5 pt-5">
                      <Calendar className="w-3.5 h-3.5 text-gray-400" />
                      <span>{pkg.deposited}</span>
                    </td>
                    <td className="px-4 py-4 text-right font-black text-gray-900">{pkg.amount}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
