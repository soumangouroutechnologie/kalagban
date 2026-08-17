"use client";

import React, { useState, useEffect } from "react";
import { 
  AlertTriangle, 
  Plus, 
  Search, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  X, 
  RefreshCw, 
  MapPin, 
  Truck, 
  Package, 
  FileText,
  User,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface LogisticsIncident {
  id: string;
  incident_type: string;
  severity: "low" | "medium" | "high" | "critical";
  status: "open" | "investigating" | "resolved" | "cancelled";
  order_code?: string;
  title: string;
  description: string;
  resolution_notes?: string;
  reported_by?: string;
  assigned_to?: string;
  resolved_at?: string;
  created_at: string;
}

export default function LogisticsIncidentsPage() {
  const { hasPermission, isSuperAdmin } = useAdminAuth();

  const [incidents, setIncidents] = useState<LogisticsIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedSeverity, setSelectedSeverity] = useState("all");

  const [showAddModal, setShowAddModal] = useState(false);
  const [resolvingIncident, setResolvingIncident] = useState<LogisticsIncident | null>(null);
  const [resolutionNote, setResolutionNote] = useState("");

  const [newIncident, setNewIncident] = useState({
    title: "",
    incident_type: "retard",
    severity: "medium" as const,
    order_code: "",
    description: "",
    reported_by: "Logisticien Kalagban",
  });

  const fetchIncidents = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("logistics_incidents")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setIncidents(data);
      } else {
        setIncidents([]);
      }
    } catch (err) {
      console.error("Error fetching incidents:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchIncidents();

    const channel = supabase
      .channel("admin_incidents_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "logistics_incidents" }, () => fetchIncidents())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("logistics_incidents").insert({
        title: newIncident.title,
        incident_type: newIncident.incident_type,
        severity: newIncident.severity,
        order_code: newIncident.order_code || null,
        description: newIncident.description,
        reported_by: newIncident.reported_by,
        status: "open",
      });

      if (error) throw error;
      setShowAddModal(false);
      fetchIncidents();
    } catch (err: any) {
      alert("Erreur lors de la création de l'incident : " + err.message);
    }
  };

  const handleResolveIncident = async () => {
    if (!resolvingIncident) return;
    try {
      await supabase.from("logistics_incidents").update({
        status: "resolved",
        resolution_notes: resolutionNote,
        resolved_at: new Date().toISOString(),
      }).eq("id", resolvingIncident.id);

      setResolvingIncident(null);
      setResolutionNote("");
      fetchIncidents();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    }
  };

  const filteredIncidents = incidents.filter((inc) => {
    const matchSearch =
      inc.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inc.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (inc.order_code && inc.order_code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchStatus = selectedStatus === "all" || inc.status === selectedStatus;
    const matchSeverity = selectedSeverity === "all" || inc.severity === selectedSeverity;
    return matchSearch && matchStatus && matchSeverity;
  });

  const getSeverityBadge = (sev: LogisticsIncident["severity"]) => {
    switch (sev) {
      case "critical":
        return <span className="bg-red-50 text-red-700 border border-red-200 px-2.5 py-1 rounded-xl text-[10px] font-black animate-pulse">CRITIQUE 🚨</span>;
      case "high":
        return <span className="bg-orange-50 text-orange-700 border border-orange-200 px-2.5 py-1 rounded-xl text-[10px] font-black">ÉLEVÉ ⚠️</span>;
      case "medium":
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 px-2.5 py-1 rounded-xl text-[10px] font-bold">MOYEN 🟡</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 px-2.5 py-1 rounded-xl text-[10px] font-bold">MINEUR 🔵</span>;
    }
  };

  const getStatusBadge = (status: LogisticsIncident["status"]) => {
    switch (status) {
      case "open":
        return <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Ouvert</span>;
      case "investigating":
        return <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">En Cours</span>;
      case "resolved":
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Résolu ✅</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Annulé</span>;
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Incidents &amp; Anomalies Logistiques</h1>
            <p className="text-xs text-gray-500 font-medium">
              Suivi et résolution en temps réel des blocages de transport et de livraison
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-red-600 hover:bg-red-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-red-600/20 transition-all"
        >
          <Plus size={16} /> Déclarer un Incident
        </button>
      </div>

      {/* Incidents Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher incident, commande..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">Tous Statuts</option>
              <option value="open">Ouverts</option>
              <option value="investigating">En Cours</option>
              <option value="resolved">Résolus</option>
            </select>

            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">Toutes Gravités</option>
              <option value="critical">Critique</option>
              <option value="high">Élevé</option>
              <option value="medium">Moyen</option>
              <option value="low">Mineur</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-5">Gravité &amp; Type</th>
                <th className="py-3.5 px-5">Incident &amp; Description</th>
                <th className="py-3.5 px-5">Commande / Rapporteur</th>
                <th className="py-3.5 px-5">Statut</th>
                <th className="py-3.5 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredIncidents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-xs text-gray-400 font-medium">
                    <p className="font-bold text-gray-700 text-sm mb-1">Aucun incident logistique à signaler</p>
                    <p>Le réseau de livraison et les points relais fonctionnent normalement.</p>
                  </td>
                </tr>
              ) : (
                filteredIncidents.map((inc) => (
                  <tr key={inc.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {getSeverityBadge(inc.severity)}
                        <p className="text-[10px] text-gray-400 font-bold uppercase">{inc.incident_type}</p>
                      </div>
                    </td>

                    <td className="py-4 px-5 max-w-sm">
                      <h4 className="font-extrabold text-gray-900 text-xs">{inc.title}</h4>
                      <p className="text-[11px] text-gray-500 line-clamp-2 mt-0.5">{inc.description}</p>
                      {inc.resolution_notes && (
                        <p className="text-[10px] text-emerald-700 font-medium bg-emerald-50 p-1.5 rounded-lg mt-1">
                          Résolution : {inc.resolution_notes}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      {inc.order_code && (
                        <p className="font-mono font-black text-indigo-600">{inc.order_code}</p>
                      )}
                      <p className="text-[11px] text-gray-500">Par : {inc.reported_by || "Opérateur"}</p>
                      <p className="text-[10px] text-gray-400">
                        {new Date(inc.created_at).toLocaleDateString("fr-FR")} à {new Date(inc.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </td>

                    <td className="py-4 px-5">
                      {getStatusBadge(inc.status)}
                    </td>

                    <td className="py-4 px-5 text-center">
                      {inc.status !== "resolved" ? (
                        <button
                          onClick={() => setResolvingIncident(inc)}
                          className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                        >
                          Résoudre
                        </button>
                      ) : (
                        <span className="text-xs text-gray-400 font-bold">Terminé</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Declare Incident */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Déclarer une Anomalie</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateIncident} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Titre de l&apos;Incident</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Retard livraison Angré"
                  value={newIncident.title}
                  onChange={(e) => setNewIncident({ ...newIncident, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Type d&apos;Anomalie</label>
                  <select
                    value={newIncident.incident_type}
                    onChange={(e) => setNewIncident({ ...newIncident, incident_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  >
                    <option value="retard">Retard de Livraison</option>
                    <option value="colis_introuvable">Colis Introuvable</option>
                    <option value="relais_sature">Relais Saturé</option>
                    <option value="livreur_indisponible">Livreur Indisponible</option>
                    <option value="panne_vehicule">Panne Véhicule</option>
                    <option value="erreur_adresse">Erreur Adresse</option>
                    <option value="autre">Autre</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Niveau de Gravité</label>
                  <select
                    value={newIncident.severity}
                    onChange={(e: any) => setNewIncident({ ...newIncident, severity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  >
                    <option value="low">Mineur 🔵</option>
                    <option value="medium">Moyen 🟡</option>
                    <option value="high">Élevé ⚠️</option>
                    <option value="critical">Critique 🚨</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Code Commande (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: KB-84920"
                  value={newIncident.order_code}
                  onChange={(e) => setNewIncident({ ...newIncident, order_code: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold font-mono"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Description Détaillée</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Expliquez la situation opérationnelle..."
                  value={newIncident.description}
                  onChange={(e) => setNewIncident({ ...newIncident, description: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 shadow-md"
                >
                  Enregistrer l&apos;Alerte
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Resolve Incident */}
      {resolvingIncident && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Résoudre l&apos;Incident</h3>
              <button onClick={() => setResolvingIncident(null)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs font-bold text-gray-800">{resolvingIncident.title}</p>
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Notes de Résolution</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Précisez la solution appliquée (ex: Nouveau livreur assigné, client contacté...)"
                  value={resolutionNote}
                  onChange={(e) => setResolutionNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-3 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setResolvingIncident(null)}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200"
              >
                Annuler
              </button>
              <button
                onClick={handleResolveIncident}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 shadow-md"
              >
                Clôturer l&apos;Incident
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
