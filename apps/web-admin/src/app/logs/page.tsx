"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Terminal,
  Search,
  AlertOctagon,
  AlertTriangle,
  Info,
  CheckCircle2,
  RefreshCw,
  Filter,
  Eye,
  X,
  Smartphone,
  Globe,
  Server,
  Zap,
  Clock,
  Download,
  Check,
  Bug,
  Activity,
  Layers
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

export interface SystemLogEntry {
  id: string;
  level: "critical" | "error" | "warning" | "info";
  app: "mobile-buyer" | "mobile-seller" | "web-buyer" | "web-relay" | "web-admin" | "api" | "edge-function";
  message: string;
  stack_trace?: string | null;
  context?: any;
  status: "open" | "investigating" | "resolved" | "ignored";
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export default function SystemLogsDashboardPage() {
  const { user } = useAdminAuth();

  const [logs, setLogs] = useState<SystemLogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [inspectLog, setInspectLog] = useState<SystemLogEntry | null>(null);
  const [isInjectingTest, setIsInjectingTest] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (!error && data) {
        setLogs(data as SystemLogEntry[]);
      } else {
        setLogs([]);
      }
    } catch (err) {
      console.error("Error fetching system logs:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();

    const channel = supabase
      .channel("system_logs_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_logs" },
        () => {
          fetchLogs();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleUpdateStatus = async (logId: string, newStatus: "open" | "investigating" | "resolved" | "ignored") => {
    setActionLoadingId(logId);
    try {
      const { error } = await supabase
        .from("system_logs")
        .update({
          status: newStatus,
          resolved_by: newStatus === "resolved" ? (user?.full_name || "Admin") : null,
          resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
        })
        .eq("id", logId);

      if (!error) {
        setLogs((prev) =>
          prev.map((l) =>
            l.id === logId
              ? {
                  ...l,
                  status: newStatus,
                  resolved_by: newStatus === "resolved" ? (user?.full_name || "Admin") : null,
                  resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
                }
              : l
          )
        );
        if (inspectLog?.id === logId) {
          setInspectLog((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  resolved_by: newStatus === "resolved" ? (user?.full_name || "Admin") : null,
                  resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error("Error updating log status:", err);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleInjectTestLog = async () => {
    setIsInjectingTest(true);
    try {
      await supabase.from("system_logs").insert({
        level: "error",
        app: "mobile-buyer",
        message: "Test Bug Détecté : Échec simulation passerelle paiement ou stock insuffisant",
        stack_trace: "Error: Simulated Checkout Failure at MobileCheckoutScreen.tsx:214:12\n    at processOrderSubmission (checkout.tsx:230:15)\n    at handleInitiateOrder (checkout.tsx:165:7)",
        context: {
          screen: "CheckoutScreen",
          user_id: user?.id || "guest-123",
          device: "Android 14 / Expo Go",
          app_version: "1.0.0",
          payload_sample: { subtotal: 5000, shipping_fee: 500, relay_id: "point-cocody-1" },
        },
        status: "open",
      });
      await fetchLogs();
    } catch (e) {
      console.error("Failed to inject test log:", e);
    } finally {
      setIsInjectingTest(false);
    }
  };

  const handleExportCSV = () => {
    if (logs.length === 0) return;
    const headers = ["ID", "Date", "Niveau", "Application", "Statut", "Message", "Résolu Par"];
    const rows = logs.map((l) => [
      l.id,
      new Date(l.created_at).toISOString(),
      l.level.toUpperCase(),
      l.app,
      l.status,
      `"${(l.message || "").replace(/"/g, '""')}"`,
      l.resolved_by || "Non",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kalagban_system_logs_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered Logs
  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      const matchSearch =
        log.message.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.app.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.stack_trace && log.stack_trace.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (log.resolved_by && log.resolved_by.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchLevel = selectedLevel === "all" || log.level === selectedLevel;
      const matchApp = selectedApp === "all" || log.app === selectedApp;
      const matchStatus = selectedStatus === "all" || log.status === selectedStatus;

      return matchSearch && matchLevel && matchApp && matchStatus;
    });
  }, [logs, searchTerm, selectedLevel, selectedApp, selectedStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = logs.length;
    const openErrors = logs.filter((l) => l.status === "open" && (l.level === "error" || l.level === "critical")).length;
    const critical = logs.filter((l) => l.level === "critical" && l.status !== "resolved").length;
    const resolved = logs.filter((l) => l.status === "resolved").length;
    return { total, openErrors, critical, resolved };
  }, [logs]);

  const getLevelBadge = (level: string) => {
    switch (level) {
      case "critical":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-600 text-white font-black px-2.5 py-0.5 rounded-full text-[10px] tracking-wide animate-pulse">
            <AlertOctagon size={11} /> CRITIQUE
          </span>
        );
      case "error":
        return (
          <span className="inline-flex items-center gap-1 bg-red-100 text-red-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-red-200">
            <AlertTriangle size={11} /> ERREUR
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">
            <AlertTriangle size={11} /> WARNING
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-blue-200">
            <Info size={11} /> INFO
          </span>
        );
    }
  };

  const getAppBadge = (app: string) => {
    switch (app) {
      case "mobile-buyer":
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-xs">
            <Smartphone size={13} className="text-indigo-600" /> App Client
          </span>
        );
      case "mobile-seller":
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-xs">
            <Smartphone size={13} className="text-emerald-600" /> App Vendeur
          </span>
        );
      case "web-buyer":
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-xs">
            <Globe size={13} className="text-blue-600" /> Web Boutique
          </span>
        );
      case "web-relay":
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-xs">
            <Layers size={13} className="text-purple-600" /> Web Relais
          </span>
        );
      case "web-admin":
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-xs">
            <Server size={13} className="text-slate-800" /> Back-Office
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-slate-700 font-semibold text-xs">
            <Zap size={13} className="text-amber-500" /> {app}
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-emerald-200">
            <CheckCircle2 size={11} /> Résolu
          </span>
        );
      case "investigating":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-amber-200">
            <Clock size={11} /> En cours
          </span>
        );
      case "ignored":
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full text-[10px]">
            Ignoré
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-bold px-2.5 py-0.5 rounded-full text-[10px] border border-rose-200">
            <AlertOctagon size={11} /> Ouvert
          </span>
        );
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 bg-slate-900 text-indigo-400 rounded-2xl flex items-center justify-center font-black shadow-md">
            <Terminal size={28} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Journal de Logs &amp; Détecteur de Bugs
              </h1>
              <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-extrabold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                <Activity size={10} className="animate-spin text-emerald-500" /> Realtime Active
              </span>
            </div>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Surveillance proactive et diagnostic instantané des incidents sur toutes les applications Kalagban.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            className="px-4 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Download size={14} /> Exporter CSV
          </button>
          <button
            onClick={handleInjectTestLog}
            disabled={isInjectingTest}
            className="px-4 py-2.5 rounded-2xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 font-bold text-xs flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Bug size={14} /> {isInjectingTest ? "Envoi..." : "Tester Émission Bug"}
          </button>
          <button
            onClick={fetchLogs}
            disabled={loading}
            className="p-2.5 rounded-2xl bg-slate-900 hover:bg-black text-white transition-colors cursor-pointer"
            title="Rafraîchir"
          >
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Erreurs Ouvertes</span>
            <AlertOctagon size={18} className="text-rose-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.openErrors}</div>
          <p className="text-[10px] text-gray-400 font-medium">Nécessitent une intervention</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Incidents Critiques</span>
            <AlertTriangle size={18} className="text-red-600" />
          </div>
          <div className="text-2xl font-black text-red-600">{stats.critical}</div>
          <p className="text-[10px] text-gray-400 font-medium">Bloquants pour les utilisateurs</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Bugs Résolus</span>
            <CheckCircle2 size={18} className="text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-emerald-600">{stats.resolved}</div>
          <p className="text-[10px] text-gray-400 font-medium">Traités par l&apos;équipe dev</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[11px] font-bold uppercase tracking-wider">Total Événements</span>
            <Layers size={18} className="text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-gray-900">{stats.total}</div>
          <p className="text-[10px] text-gray-400 font-medium">Historique des 100 derniers logs</p>
        </div>
      </div>

      {/* Main Table Card with Search and Multi-Filters */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden p-6 space-y-5">
        {/* Filters Row */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par message d'erreur, application, stack trace..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Sévérité */}
            <select
              value={selectedLevel}
              onChange={(e) => setSelectedLevel(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Sévérité : Toutes</option>
              <option value="critical">🔴 Critique</option>
              <option value="error">❌ Erreur</option>
              <option value="warning">⚠️ Warning</option>
              <option value="info">ℹ️ Info</option>
            </select>

            {/* Application */}
            <select
              value={selectedApp}
              onChange={(e) => setSelectedApp(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Application : Toutes</option>
              <option value="mobile-buyer">📱 App Client</option>
              <option value="mobile-seller">📱 App Vendeur</option>
              <option value="web-buyer">🌐 Web Boutique</option>
              <option value="web-relay">🏬 Web Relais</option>
              <option value="web-admin">⚙️ Back-Office</option>
              <option value="api">⚡ API / Edge</option>
            </select>

            {/* Statut */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 focus:outline-hidden cursor-pointer"
            >
              <option value="all">Statut : Tous</option>
              <option value="open">🔴 Ouvert</option>
              <option value="investigating">🟡 En cours</option>
              <option value="resolved">🟢 Résolu</option>
              <option value="ignored">⚪ Ignoré</option>
            </select>
          </div>
        </div>

        {/* Logs Table */}
        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-4">Horodatage</th>
                <th className="py-3.5 px-4">Niveau</th>
                <th className="py-3.5 px-4">App Source</th>
                <th className="py-3.5 px-4">Message / Erreur</th>
                <th className="py-3.5 px-4">Statut</th>
                <th className="py-3.5 px-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-gray-400 font-medium">
                    {loading ? "Chargement des logs système..." : "Aucun log ou bug correspondant aux filtres."}
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr
                    key={log.id}
                    className={`hover:bg-slate-50/70 transition-colors ${
                      log.status === "open" && log.level === "critical" ? "bg-red-50/40" : ""
                    }`}
                  >
                    <td className="py-4 px-4 font-mono text-[11px] text-gray-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })}{" "}
                      {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">{getLevelBadge(log.level)}</td>
                    <td className="py-4 px-4 whitespace-nowrap">{getAppBadge(log.app)}</td>
                    <td className="py-4 px-4 max-w-md">
                      <p className="font-bold text-gray-900 truncate" title={log.message}>
                        {log.message}
                      </p>
                      {log.stack_trace && (
                        <p className="font-mono text-[10px] text-gray-400 truncate mt-0.5">
                          {log.stack_trace.split("\n")[0]}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                    <td className="py-4 px-4 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => setInspectLog(log)}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs shadow-xs transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Eye size={12} /> Inspecter
                        </button>

                        {log.status !== "resolved" && (
                          <button
                            onClick={() => handleUpdateStatus(log.id, "resolved")}
                            disabled={actionLoadingId === log.id}
                            className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs border border-emerald-200 transition-colors cursor-pointer flex items-center gap-1"
                            title="Marquer comme Résolu"
                          >
                            <Check size={12} /> Résoudre
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Detailed Bug & Log Inspection */}
      {inspectLog && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-5 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  {getLevelBadge(inspectLog.level)}
                  <span className="font-black text-lg text-gray-900">Détail du Bug / Log Système</span>
                </div>
                <p className="text-xs text-gray-400 font-mono mt-1">ID : {inspectLog.id}</p>
              </div>
              <button
                onClick={() => setInspectLog(null)}
                className="text-gray-400 hover:text-gray-700 cursor-pointer p-1 rounded-lg hover:bg-gray-100"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Metadata Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-gray-50 p-4 rounded-2xl text-xs">
              <div>
                <span className="text-gray-400 font-bold block text-[10px] uppercase">Application</span>
                <span className="font-bold text-gray-900">{getAppBadge(inspectLog.app)}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block text-[10px] uppercase">Statut</span>
                <span className="font-bold">{getStatusBadge(inspectLog.status)}</span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block text-[10px] uppercase">Horodatage</span>
                <span className="font-bold text-gray-800 font-mono text-[11px]">
                  {new Date(inspectLog.created_at).toLocaleString("fr-FR")}
                </span>
              </div>
              <div>
                <span className="text-gray-400 font-bold block text-[10px] uppercase">Résolu Par</span>
                <span className="font-bold text-gray-800">{inspectLog.resolved_by || "En attente"}</span>
              </div>
            </div>

            {/* Error Message */}
            <div>
              <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                Message d&apos;erreur principal
              </label>
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 font-bold text-xs">
                {inspectLog.message}
              </div>
            </div>

            {/* Stack Trace */}
            {inspectLog.stack_trace && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Stack Trace &amp; Débogage
                </label>
                <pre className="p-4 bg-slate-950 text-emerald-400 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-52 leading-relaxed border border-slate-800">
                  {inspectLog.stack_trace}
                </pre>
              </div>
            )}

            {/* Context / JSON Metadata */}
            {inspectLog.context && Object.keys(inspectLog.context).length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1">
                  Contexte d&apos;exécution (Device, OS, Session, Payload)
                </label>
                <pre className="p-4 bg-slate-900 text-indigo-300 rounded-2xl text-[11px] font-mono overflow-x-auto max-h-48 leading-relaxed border border-slate-800">
                  {JSON.stringify(inspectLog.context, null, 2)}
                </pre>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleUpdateStatus(inspectLog.id, "investigating")}
                  className="px-4 py-2.5 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs border border-amber-200 transition-colors cursor-pointer"
                >
                  🟡 Marquer En Cours
                </button>
                <button
                  onClick={() => handleUpdateStatus(inspectLog.id, "resolved")}
                  className="px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm transition-colors cursor-pointer"
                >
                  🟢 Marquer Résolu
                </button>
              </div>

              <button
                onClick={() => setInspectLog(null)}
                className="px-5 py-2.5 rounded-2xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors cursor-pointer"
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
