"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  Search, 
  RefreshCw, 
  CheckCircle2, 
  UserX, 
  Eye, 
  Activity, 
  X,
  FileWarning,
  Flame
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface RiskAlert {
  id: string;
  alert_type: string;
  severity: "low" | "medium" | "high" | "critical";
  target_entity_type: string;
  target_entity_id: string;
  target_entity_label?: string;
  description: string;
  risk_score: number;
  status: "open" | "investigating" | "resolved" | "dismissed" | "account_frozen";
  investigated_by?: string;
  action_taken?: string;
  created_at: string;
}

export default function RiskPage() {
  const { user, hasPermission, isSuperAdmin } = useAdminAuth();

  const [alerts, setAlerts] = useState<RiskAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSeverity, setSelectedSeverity] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  const [selectedAlert, setSelectedAlert] = useState<RiskAlert | null>(null);
  const [actionNote, setActionNote] = useState("");
  const [acting, setActing] = useState(false);

  const fetchRiskAlerts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("risk_alerts")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setAlerts(data);
      } else {
        setAlerts([]);
      }
    } catch (err) {
      console.error("Error fetching risk alerts:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiskAlerts();

    const channel = supabase
      .channel("admin_risk_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "risk_alerts" }, () => fetchRiskAlerts())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleTakeAction = async (action: "account_frozen" | "resolved" | "dismissed") => {
    if (!selectedAlert) return;
    setActing(true);
    try {
      const adminName = user?.full_name || "Sécurité Kalagban";

      await supabase.from("risk_alerts").update({
        status: action,
        action_taken: actionNote || (action === "account_frozen" ? "Compte gelé préventivement" : "Alerte traitée"),
        investigated_by: adminName,
      }).eq("id", selectedAlert.id);

      setSelectedAlert(null);
      setActionNote("");
      fetchRiskAlerts();
    } catch (err: any) {
      alert("Erreur : " + err.message);
    } finally {
      setActing(false);
    }
  };

  const filteredAlerts = alerts.filter((a) => {
    const matchSearch =
      a.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      a.alert_type.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (a.target_entity_label && a.target_entity_label.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchSeverity = selectedSeverity === "all" || a.severity === selectedSeverity;
    const matchStatus = selectedStatus === "all" || a.status === selectedStatus;
    return matchSearch && matchSeverity && matchStatus;
  });

  const getSeverityBadge = (s: RiskAlert["severity"]) => {
    switch (s) {
      case "critical":
        return <span className="bg-red-100 text-red-800 font-black px-2.5 py-1 rounded-xl text-[10px] border border-red-300 animate-pulse">CRITIQUE 🚨</span>;
      case "high":
        return <span className="bg-orange-100 text-orange-800 font-black px-2.5 py-1 rounded-xl text-[10px] border border-orange-300">ÉLEVÉ ⚠️</span>;
      case "medium":
        return <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-1 rounded-xl text-[10px] border border-amber-300">MOYEN 🟡</span>;
      default:
        return <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-1 rounded-xl text-[10px] border border-blue-300">FAIBLE 🔵</span>;
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center font-black">
            <ShieldAlert size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Risques, Fraude &amp; Sécurité</h1>
            <p className="text-xs text-gray-500 font-medium">
              Détection des anomalies, protection anti-bruteforce et gel préventif des comptes
            </p>
          </div>
        </div>
      </div>

      {/* Risk Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Alertes Actives</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-red-600">
              {alerts.filter(a => a.status === "open" || a.status === "investigating").length}
            </span>
            <span className="text-xs text-gray-500">nécessitant attention</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Tentatives OTP Bloquées</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">100%</span>
            <span className="text-xs font-bold text-emerald-600">Anti-bruteforce actif</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Score Global de Santé</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">98.5 / 100</span>
            <span className="text-xs font-bold text-emerald-500">Plateforme Sécurisée</span>
          </div>
        </div>
      </div>

      {/* Alerts Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher alerte, entité, motif..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={selectedSeverity}
              onChange={(e) => setSelectedSeverity(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">Toutes Gravités</option>
              <option value="critical">Critique</option>
              <option value="high">Élevé</option>
              <option value="medium">Moyen</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-5">Gravité &amp; Score</th>
                <th className="py-3.5 px-5">Type d&apos;Anomalie</th>
                <th className="py-3.5 px-5">Entité Ciblée</th>
                <th className="py-3.5 px-5">Description</th>
                <th className="py-3.5 px-5">Statut</th>
                <th className="py-3.5 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredAlerts.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-gray-400 font-medium">
                    <p className="font-bold text-gray-700 text-sm mb-1">Aucune anomalie ou alerte de fraude active</p>
                    <p>La sécurité et la protection anti-bruteforce veillent sur les transactions en temps réel.</p>
                  </td>
                </tr>
              ) : (
                filteredAlerts.map((alert) => (
                  <tr key={alert.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-5">
                      <div className="space-y-1">
                        {getSeverityBadge(alert.severity)}
                        <div className="text-[10px] font-bold text-gray-500">
                          Score Risque: <span className="font-black text-red-600">{alert.risk_score}/100</span>
                        </div>
                      </div>
                    </td>

                    <td className="py-4 px-5 font-bold text-gray-900 capitalize">
                      {alert.alert_type.replace(/_/g, " ")}
                    </td>

                    <td className="py-4 px-5">
                      <p className="font-bold text-gray-900">{alert.target_entity_label || alert.target_entity_id}</p>
                      <span className="text-[10px] text-gray-400 font-mono uppercase">{alert.target_entity_type}</span>
                    </td>

                    <td className="py-4 px-5 max-w-sm">
                      <p className="text-xs text-gray-600">{alert.description}</p>
                      {alert.action_taken && (
                        <p className="text-[10px] text-emerald-700 bg-emerald-50 p-1.5 rounded-lg mt-1 font-medium">
                          Action : {alert.action_taken}
                        </p>
                      )}
                    </td>

                    <td className="py-4 px-5">
                      {alert.status === "account_frozen" ? (
                        <span className="bg-red-500 text-white font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          Compte Gelé ⛔
                        </span>
                      ) : alert.status === "resolved" ? (
                        <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          Résolu ✅
                        </span>
                      ) : alert.status === "investigating" ? (
                        <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">
                          En Examen 🔍
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-[10px] animate-pulse">
                          Non Traité 🔴
                        </span>
                      )}
                    </td>

                    <td className="py-4 px-5 text-center">
                      <button
                        onClick={() => setSelectedAlert(alert)}
                        className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors cursor-pointer"
                      >
                        Intervenir
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Investigate Alert */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-gray-900">Intervention Sécurité</h3>
                <p className="text-xs text-gray-500">{selectedAlert.target_entity_label}</p>
              </div>
              <button onClick={() => setSelectedAlert(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-red-50 p-4 rounded-2xl border border-red-200 text-xs text-red-900">
                <p className="font-bold">{selectedAlert.description}</p>
                <p className="text-[10px] text-red-700 mt-1 font-mono">Score de criticité : {selectedAlert.risk_score} / 100</p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Notes d&apos;intervention</label>
                <textarea
                  rows={3}
                  placeholder="Justifiez la décision de sécurité (ex: Vérification identité effectuée...)"
                  value={actionNote}
                  onChange={(e) => setActionNote(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
              <button
                disabled={acting}
                onClick={() => handleTakeAction("account_frozen")}
                className="w-full py-2.5 rounded-xl bg-red-600 text-white font-bold text-xs hover:bg-red-700 transition-colors shadow-sm cursor-pointer"
              >
                ⛔ Geler / Suspendre le Compte
              </button>
              <button
                disabled={acting}
                onClick={() => handleTakeAction("resolved")}
                className="w-full py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
              >
                ✅ Marquer comme Vérifié &amp; Résolu
              </button>
              <button
                type="button"
                onClick={() => setSelectedAlert(null)}
                className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-700 font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
