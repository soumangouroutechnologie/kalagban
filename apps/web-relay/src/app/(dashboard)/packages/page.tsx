"use client";

import { useState, useEffect } from "react";
import { Search, Filter, ShieldCheck, Phone, User, Calendar, AlertTriangle, RotateCcw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PackageItem {
  id: string;
  rawId: string;
  client: string;
  phone: string;
  status: string;
  shelf: string;
  deposited: string;
  depositedDate: Date;
  daysInRelay: number;
  isExpired: boolean;
  amount: string;
  shopId?: string;
}

export default function RelayPackagesPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchPackages = async () => {
    const relayCode = localStorage.getItem("kalagban_relay_code");
    let currentId = localStorage.getItem("kalagban_relay_id");

    if (!currentId && relayCode) {
      const { data: pt } = await supabase.from("pickup_points").select("id").eq("code", relayCode).maybeSingle();
      if (pt) {
        currentId = pt.id;
        localStorage.setItem("kalagban_relay_id", pt.id);
      }
    }

    if (!currentId) {
      setPackages([]);
      return;
    }

    const { data } = await supabase
      .from("orders")
      .select("*")
      .eq("pickup_point_id", currentId)
      .eq("delivery_type", "pickup_point")
      .order("created_at", { ascending: false });

    if (data && data.length > 0) {
      setPackages(data.map((o: Record<string, any>) => {
        const dDate = new Date(o.created_at);
        const days = Math.floor((Date.now() - dDate.getTime()) / (1000 * 60 * 60 * 24));
        const activeInRelay = o.relay_status === "ready_for_pickup" || o.relay_status === "deposited";

        return {
          id: o.id.slice(0, 8).toUpperCase(),
          rawId: o.id,
          client: o.customer_name || "Client Kalagban",
          phone: o.customer_phone || "+225 --",
          status: o.relay_status || "ready_for_pickup",
          shelf: "Étagère A-01",
          deposited: dDate.toLocaleDateString("fr-FR"),
          depositedDate: dDate,
          daysInRelay: days,
          isExpired: activeInRelay && days >= 7,
          amount: `${Number(o.total_amount || 0).toLocaleString()} FCFA`,
          shopId: o.shop_id,
        };
      }));
    } else {
      setPackages([]);
    }
  };

  useEffect(() => {
    fetchPackages();
  }, []);

  const handleReturnUnclaimed = async (pkg: PackageItem) => {
    if (!confirm(`Confirmez-vous le retour du colis #${pkg.id} au vendeur pour cause de non-réclamation client (> 7 jours) ?`)) {
      return;
    }

    setProcessingId(pkg.rawId);
    try {
      // 1. Update order status
      const { error } = await supabase
        .from("orders")
        .update({
          relay_status: "unclaimed_returned",
          status: "returned_to_sender",
        })
        .eq("id", pkg.rawId);

      if (error) throw error;

      // 2. Notify seller
      if (pkg.shopId) {
        await supabase.from("seller_notifications").insert({
          shop_id: pkg.shopId,
          title: "Colis Non Réclamé - En Cours de Retour 📦",
          message: `Le colis #${pkg.id} (${pkg.client}) est resté plus de 7 jours en Point Relais sans être retiré et est réexpédié vers votre boutique.`,
          type: "order",
          reference_id: pkg.rawId,
        });
      }

      // 3. Admin log
      await supabase.from("admin_notifications").insert({
        title: "Litige/Délai Expiré en Point Relais",
        message: `Le colis #${pkg.id} a été déclaré non réclamé (> 7j) par le Point Relais et est renvoyé au vendeur.`,
        target_group: "support",
        notification_type: "warning",
      });

      setActionSuccess(`Le colis #${pkg.id} a été marqué en retour vendeur.`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchPackages();
    } catch (err) {
      console.error("Erreur lors du retour colis:", err);
      alert("Une erreur est survenue lors de la mise à jour du statut.");
    } finally {
      setProcessingId(null);
    }
  };

  const filtered = packages.filter(p => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch = !q || 
                          p.id.toLowerCase().includes(q) || 
                          p.client.toLowerCase().includes(q) || 
                          p.phone.toLowerCase().includes(q) ||
                          p.shelf.toLowerCase().includes(q);
    const matchesStatus = statusFilter === "all" || 
                          (statusFilter === "expired" ? p.isExpired : p.status === statusFilter);
    return matchesSearch && matchesStatus;
  });

  const expiredCount = packages.filter(p => p.isExpired).length;

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Inventaire des Colis en Étagère</h1>
          <p className="text-gray-500 text-xs font-medium mt-1">Liste détaillée, gestion des délais de rétention (7 jours max) et retours vendeurs.</p>
        </div>

        <div className="flex items-center gap-3">
          {expiredCount > 0 && (
            <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs font-bold text-amber-800 shadow-xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 animate-pulse" />
              <span>{expiredCount} colis en souffrance (&gt; 7 jours)</span>
            </div>
          )}

          <div className="flex items-center space-x-2 bg-white border border-gray-100 rounded-2xl p-3 text-xs font-bold text-gray-700 shadow-xs">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Audit Inventaire Synchronisé</span>
          </div>
        </div>
      </div>

      {actionSuccess && (
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccess}</span>
        </div>
      )}

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
            <option value="expired">⚠️ Non réclamés (&gt; 7 jours)</option>
            <option value="ready_for_pickup">En Étagère (Prêt au retrait)</option>
            <option value="picked_up">Remis au Client</option>
            <option value="unclaimed_returned">Retourné au Vendeur</option>
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
                <th className="px-4 py-3.5">Emplacement</th>
                <th className="px-4 py-3.5">Statut & Ancienneté</th>
                <th className="px-4 py-3.5">Date de Réception</th>
                <th className="px-4 py-3.5">Valeur Colis</th>
                <th className="px-4 py-3.5 rounded-r-xl text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 font-medium text-xs">
                    Aucun colis correspondant aux filtres.
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
                      <div className="flex flex-col gap-1">
                        {pkg.status === "pending_deposit" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-blue-50 text-blue-700 border border-blue-200 w-fit">
                            Attendu
                          </span>
                        )}
                        {(pkg.status === "ready_for_pickup" || pkg.status === "deposited") && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 w-fit">
                            En Stock ({pkg.daysInRelay}j)
                          </span>
                        )}
                        {pkg.status === "picked_up" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200 w-fit">
                            Remis Client
                          </span>
                        )}
                        {pkg.status === "unclaimed_returned" && (
                          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-red-50 text-red-700 border border-red-200 w-fit">
                            Retour Vendeur
                          </span>
                        )}
                        {pkg.isExpired && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-300 w-fit">
                            <AlertTriangle className="w-3 h-3 text-rose-600" /> &gt; 7 jours en relais
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4 text-xs text-gray-500 font-medium">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-gray-400" />
                        <span>{pkg.deposited}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-black text-gray-900">{pkg.amount}</td>
                    <td className="px-4 py-4 text-right">
                      {pkg.isExpired && pkg.status !== "unclaimed_returned" && pkg.status !== "picked_up" && (
                        <button
                          onClick={() => handleReturnUnclaimed(pkg)}
                          disabled={processingId === pkg.rawId}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition shadow-xs disabled:opacity-50"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span>{processingId === pkg.rawId ? "En cours..." : "Retourner Vendeur"}</span>
                        </button>
                      )}
                    </td>
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
