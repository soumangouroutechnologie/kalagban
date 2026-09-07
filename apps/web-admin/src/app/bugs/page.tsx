"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Bug,
  AlertOctagon,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  Search,
  Eye,
  X,
  Smartphone,
  Globe,
  Server,
  Download,
  Check,
  Activity,
  Layers,
  ShieldAlert,
  TrendingUp,
  Cpu,
  Monitor,
  Copy,
  Sparkles,
  Info
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

export interface BugRecord {
  id: string;
  level: "critical" | "error" | "warning" | "info";
  app: "mobile-buyer" | "mobile-seller" | "web-buyer" | "web-seller" | "web-relay" | "web-admin" | "api" | "edge-function";
  message: string;
  stack_trace?: string | null;
  fingerprint?: string | null;
  device_id?: string | null;
  device_os?: string | null;
  device_model?: string | null;
  route_or_screen?: string | null;
  occurrences_count?: number;
  context?: Record<string, unknown> | null;
  status: "open" | "investigating" | "resolved" | "ignored";
  resolved_by?: string | null;
  resolved_at?: string | null;
  created_at: string;
}

export interface GroupedBug {
  key: string;
  fingerprint: string;
  title: string;
  level: "critical" | "error" | "warning" | "info";
  app: string;
  route_or_screen: string;
  status: "open" | "investigating" | "resolved" | "ignored";
  totalOccurrences: number;
  uniqueDevicesCount: number;
  devicesList: string[];
  osBreakdown: Record<string, number>;
  firstSeenAt: string;
  lastSeenAt: string;
  resolvedBy?: string | null;
  resolvedAt?: string | null;
  latestRecord: BugRecord;
  records: BugRecord[];
}

export default function BugManagementDashboardPage() {
  const { user, role, hasPermission, isSuperAdmin } = useAdminAuth();

  // Strict RBAC Guard: Super-Admin & Developer only
  const isAuthorized = isSuperAdmin || role === "developer" || hasPermission("can_manage_bugs");

  const [rawLogs, setRawLogs] = useState<BugRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<string>("all");
  const [selectedApp, setSelectedApp] = useState<string>("all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [selectedOS, setSelectedOS] = useState<string>("all");
  const [inspectBug, setInspectBug] = useState<GroupedBug | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isInjecting, setIsInjecting] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"grouped" | "stream">("grouped");

  const fetchBugs = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("system_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);

      if (!error && data) {
        setRawLogs(data as BugRecord[]);
      } else {
        setRawLogs([]);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des bugs:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthorized) return;

    let isMounted = true;
    const loadBugs = async () => {
      if (isMounted) {
        await fetchBugs();
      }
    };
    loadBugs();

    const channel = supabase
      .channel("bugs_telemetry_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "system_logs" },
        () => {
          if (isMounted) {
            fetchBugs();
          }
        }
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [isAuthorized, fetchBugs]);

  // Group bugs by fingerprint or normalized message
  const groupedBugs: GroupedBug[] = useMemo(() => {
    const map = new Map<string, GroupedBug>();

    rawLogs.forEach((log) => {
      const groupKey = log.fingerprint || `${log.app}:${log.level}:${log.message.slice(0, 100)}`;
      const deviceId = log.device_id || (log.context?.ip_hash as string) || "anon";
      const os = log.device_os || (log.context?.os as string) || "Autre";

      if (!map.has(groupKey)) {
        map.set(groupKey, {
          key: groupKey,
          fingerprint: log.fingerprint || groupKey,
          title: log.message,
          level: log.level,
          app: log.app,
          route_or_screen: log.route_or_screen || (log.context?.screen as string) || "/",
          status: log.status,
          totalOccurrences: 0,
          uniqueDevicesCount: 0,
          devicesList: [],
          osBreakdown: {},
          firstSeenAt: log.created_at,
          lastSeenAt: log.created_at,
          resolvedBy: log.resolved_by,
          resolvedAt: log.resolved_at,
          latestRecord: log,
          records: [],
        });
      }

      const item = map.get(groupKey)!;
      item.totalOccurrences += (log.occurrences_count || 1);
      item.records.push(log);

      if (!item.devicesList.includes(deviceId)) {
        item.devicesList.push(deviceId);
      }
      item.uniqueDevicesCount = item.devicesList.length;

      item.osBreakdown[os] = (item.osBreakdown[os] || 0) + 1;

      if (new Date(log.created_at) > new Date(item.lastSeenAt)) {
        item.lastSeenAt = log.created_at;
        item.latestRecord = log;
        item.status = log.status;
      }
      if (new Date(log.created_at) < new Date(item.firstSeenAt)) {
        item.firstSeenAt = log.created_at;
      }
    });

    return Array.from(map.values()).sort(
      (a, b) => new Date(b.lastSeenAt).getTime() - new Date(a.lastSeenAt).getTime()
    );
  }, [rawLogs]);

  // Filtered grouped bugs
  const filteredGroupedBugs = useMemo(() => {
    return groupedBugs.filter((bug) => {
      const matchSearch =
        bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.app.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.route_or_screen.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bug.fingerprint.toLowerCase().includes(searchTerm.toLowerCase());

      const matchLevel = selectedLevel === "all" || bug.level === selectedLevel;
      const matchApp = selectedApp === "all" || bug.app === selectedApp;
      const matchStatus = selectedStatus === "all" || bug.status === selectedStatus;
      const matchOS = selectedOS === "all" || Boolean(bug.osBreakdown[selectedOS]);

      return matchSearch && matchLevel && matchApp && matchStatus && matchOS;
    });
  }, [groupedBugs, searchTerm, selectedLevel, selectedApp, selectedStatus, selectedOS]);

  // Overall Statistics & Percentages
  const stats = useMemo(() => {
    const totalOccurrences = rawLogs.length;
    const totalGrouped = groupedBugs.length;

    // Unique devices across entire system
    const allDevices = new Set<string>();
    rawLogs.forEach((l) => {
      if (l.device_id) allDevices.add(l.device_id);
      else if (l.context?.ip_hash) allDevices.add(String(l.context.ip_hash));
    });
    const uniqueDevicesTotal = allDevices.size || (totalOccurrences > 0 ? 1 : 0);

    const openBugs = groupedBugs.filter((b) => b.status === "open").length;
    const investigatingBugs = groupedBugs.filter((b) => b.status === "investigating").length;
    const resolvedBugs = groupedBugs.filter((b) => b.status === "resolved").length;
    const criticalBugs = groupedBugs.filter((b) => b.level === "critical" && b.status !== "resolved").length;

    const resolutionRate = totalGrouped > 0 ? Math.round((resolvedBugs / totalGrouped) * 100) : 100;

    // OS Distribution & Percentages
    const osCounts: Record<string, number> = {};
    rawLogs.forEach((l) => {
      const os = l.device_os || (l.context?.os as string) || "Autre";
      osCounts[os] = (osCounts[os] || 0) + 1;
    });

    const osPercentages = Object.entries(osCounts).map(([os, count]) => ({
      os,
      count,
      pct: totalOccurrences > 0 ? Math.round((count / totalOccurrences) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // App Distribution & Percentages
    const appCounts: Record<string, number> = {};
    rawLogs.forEach((l) => {
      appCounts[l.app] = (appCounts[l.app] || 0) + 1;
    });

    const appPercentages = Object.entries(appCounts).map(([app, count]) => ({
      app,
      count,
      pct: totalOccurrences > 0 ? Math.round((count / totalOccurrences) * 100) : 0,
    })).sort((a, b) => b.count - a.count);

    // Severity Percentages
    const criticalCount = rawLogs.filter((l) => l.level === "critical").length;
    const errorCount = rawLogs.filter((l) => l.level === "error").length;
    const warningCount = rawLogs.filter((l) => l.level === "warning" || l.level === "info").length;

    return {
      totalOccurrences,
      totalGrouped,
      uniqueDevicesTotal,
      openBugs,
      investigatingBugs,
      resolvedBugs,
      criticalBugs,
      resolutionRate,
      osPercentages,
      appPercentages,
      severityPct: {
        critical: totalOccurrences > 0 ? Math.round((criticalCount / totalOccurrences) * 100) : 0,
        error: totalOccurrences > 0 ? Math.round((errorCount / totalOccurrences) * 100) : 0,
        warning: totalOccurrences > 0 ? Math.round((warningCount / totalOccurrences) * 100) : 0,
      },
    };
  }, [rawLogs, groupedBugs]);

  // Status Change Handler
  const handleUpdateStatus = async (
    target: GroupedBug,
    newStatus: "open" | "investigating" | "resolved" | "ignored"
  ) => {
    setActionLoading(true);
    try {
      const recordIds = target.records.map((r) => r.id);
      const adminName = user?.full_name || "Admin Développeur";

      const { error } = await supabase
        .from("system_logs")
        .update({
          status: newStatus,
          resolved_by: newStatus === "resolved" ? adminName : null,
          resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
        })
        .in("id", recordIds);

      if (!error) {
        setRawLogs((prev) =>
          prev.map((l) =>
            recordIds.includes(l.id)
              ? {
                  ...l,
                  status: newStatus,
                  resolved_by: newStatus === "resolved" ? adminName : null,
                  resolved_at: newStatus === "resolved" ? new Date().toISOString() : null,
                }
              : l
          )
        );

        if (inspectBug && inspectBug.key === target.key) {
          setInspectBug((prev) =>
            prev
              ? {
                  ...prev,
                  status: newStatus,
                  resolvedBy: newStatus === "resolved" ? adminName : null,
                  resolvedAt: newStatus === "resolved" ? new Date().toISOString() : null,
                }
              : null
          );
        }
      }
    } catch (err) {
      console.error("Erreur mise à jour statut:", err);
    } finally {
      setActionLoading(false);
    }
  };

  // Test Simulator Injector
  const handleInjectSimulatedBug = async (type: "mobile_crash" | "web_checkout" | "api_timeout") => {
    setIsInjecting(true);
    try {
      let payload: {
        level: string;
        app: string;
        message: string;
        stack_trace: string;
        route_or_screen: string;
        device_id: string;
        device_os: string;
        device_model: string;
        context: Record<string, unknown>;
      } = {
        level: "error",
        app: "mobile-buyer",
        message: "Simulation Erreur Mobile : Échec du rendu de la carte de livraison",
        stack_trace: "Error: Failed to fetch active pickup points\n    at PickupMapScreen.tsx:142:18\n    at async loadDeliveryPoints (relays.ts:88:12)",
        route_or_screen: "PickupMapScreen",
        device_id: `device_${Math.floor(Math.random() * 5) + 1}`,
        device_os: "Android",
        device_model: "Samsung Galaxy A54",
        context: { screen: "PickupMapScreen", battery: "78%", network: "4G", user_role: "buyer" },
      };

      if (type === "web_checkout") {
        payload = {
          level: "critical",
          app: "web-buyer",
          message: "Simulation Critique : Échec initialisation passerelle K-Pay lors de la validation du panier",
          stack_trace: "Error: KPayGatewayTimeoutException: Remote payment node failed to acknowledge invoice\n    at initKpayPayment (/api/payments/kpay/init:45:11)\n    at CheckoutPage.tsx:312:9",
          route_or_screen: "/checkout",
          device_id: `device_${Math.floor(Math.random() * 8) + 1}`,
          device_os: "Windows",
          device_model: "Chrome Desktop 122",
          context: { order_amount: 15400, payment_method: "kpay_wave", attempt: 2 },
        };
      } else if (type === "api_timeout") {
        payload = {
          level: "warning",
          app: "web-seller",
          message: "Simulation Avertissement : Latence élevée upload image catalogue (> 3.5s)",
          stack_trace: "Warn: Upload latency threshold exceeded\n    at handleProductImageUpload (SellerDashboard.tsx:189:22)",
          route_or_screen: "/dashboard/products",
          device_id: `device_${Math.floor(Math.random() * 4) + 1}`,
          device_os: "macOS",
          device_model: "Safari 17.4",
          context: { file_size_mb: 4.8, bucket: "products" },
        };
      }

      await fetch("/api/telemetry/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      await fetchBugs();
    } catch (e) {
      console.error("Échec injection de test:", e);
    } finally {
      setIsInjecting(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleExportCSV = () => {
    if (groupedBugs.length === 0) return;
    const headers = [
      "Fingerprint",
      "Gravité",
      "Application",
      "Écran/Route",
      "Occurrences",
      "Appareils Touchés",
      "Statut",
      "Message",
      "Dernière Détection",
      "Résolu Par",
    ];
    const rows = groupedBugs.map((b) => [
      b.fingerprint,
      b.level.toUpperCase(),
      b.app,
      b.route_or_screen,
      b.totalOccurrences,
      b.uniqueDevicesCount,
      b.status,
      `"${(b.title || "").replace(/"/g, '""')}"`,
      new Date(b.lastSeenAt).toISOString(),
      b.resolvedBy || "Non",
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `kalagban_bugs_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // If user does not have Super Admin or Developer permission
  if (!isAuthorized) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl p-8 max-w-md w-full text-center border border-rose-100 shadow-xl space-y-4">
          <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl mx-auto flex items-center justify-center">
            <ShieldAlert size={36} />
          </div>
          <h2 className="text-xl font-black text-slate-900">Accès Restreint</h2>
          <p className="text-xs text-slate-600 leading-relaxed">
            Seuls les profils <span className="font-bold text-indigo-600">Super Administrateur</span> et{" "}
            <span className="font-bold text-indigo-600">Développeur</span> sont autorisés à consulter et gérer la télémétrie et les bugs en temps réel.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block px-5 py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors"
            >
              Retour au tableau de bord
            </Link>
          </div>
        </div>
      </div>
    );
  }

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
          <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">
            <AlertTriangle size={11} /> ERREUR
          </span>
        );
      case "warning":
        return (
          <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded-md text-[10px] border border-blue-200">
            <Info size={11} /> AVERTISSEMENT
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded-md text-[10px]">
            INFO
          </span>
        );
    }
  };

  const getAppBadge = (app: string) => {
    switch (app) {
      case "mobile-buyer":
        return (
          <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-indigo-200">
            <Smartphone size={11} /> Mobile Acheteur
          </span>
        );
      case "mobile-seller":
        return (
          <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-purple-200">
            <Smartphone size={11} /> Mobile Vendeur
          </span>
        );
      case "web-buyer":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">
            <Globe size={11} /> Web Acheteur
          </span>
        );
      case "web-seller":
        return (
          <span className="inline-flex items-center gap-1 bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-orange-200">
            <Globe size={11} /> Web Vendeur
          </span>
        );
      case "web-relay":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">
            <Globe size={11} /> Web Relais
          </span>
        );
      case "web-admin":
        return (
          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-800 font-bold px-2 py-0.5 rounded-md text-[10px] border border-slate-300">
            <Layers size={11} /> Web Admin
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-gray-200">
            <Server size={11} /> API / Edge
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <span className="inline-flex items-center gap-1 bg-rose-50 text-rose-700 font-black px-2 py-0.5 rounded-full text-[10px] border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-600 animate-ping" /> Actif
          </span>
        );
      case "investigating":
        return (
          <span className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-amber-200">
            <Activity size={10} className="animate-spin" /> En cours
          </span>
        );
      case "resolved":
        return (
          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full text-[10px] border border-emerald-200">
            <Check size={10} /> Résolu
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-500 font-bold px-2 py-0.5 rounded-full text-[10px]">
            Ignoré
          </span>
        );
    }
  };

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white p-6 rounded-3xl shadow-xl border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-black">
              <Bug size={22} />
            </div>
            <div>
              <h1 className="text-xl lg:text-2xl font-black tracking-tight">Télémétrie & Détection des Bugs</h1>
              <p className="text-xs text-slate-400 flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                Écoute Live Active (Web, Android & iOS) • Restreint à Super-Admin & Développeur
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => fetchBugs()}
            disabled={loading}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
            <span>Actualiser</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download size={13} />
            <span>Exporter CSV</span>
          </button>

          {/* Test Simulator Menu */}
          <div className="flex items-center gap-1 bg-indigo-950/80 p-1 rounded-xl border border-indigo-800/50">
            <span className="text-[10px] text-indigo-300 font-extrabold px-2 flex items-center gap-1">
              <Sparkles size={11} /> Simuler :
            </span>
            <button
              onClick={() => handleInjectSimulatedBug("mobile_crash")}
              disabled={isInjecting}
              className="px-2 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Mobile
            </button>
            <button
              onClick={() => handleInjectSimulatedBug("web_checkout")}
              disabled={isInjecting}
              className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              K-Pay Crit.
            </button>
            <button
              onClick={() => handleInjectSimulatedBug("api_timeout")}
              disabled={isInjecting}
              className="px-2 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[10px] font-bold transition-all cursor-pointer disabled:opacity-50"
            >
              Seller Web
            </button>
          </div>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Open Bugs */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Bugs Actifs / Ouverts</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-slate-900">{stats.openBugs}</span>
              <span className="text-xs font-bold text-slate-400">/ {stats.totalGrouped} groupes</span>
            </div>
            <p className="text-[11px] text-slate-500">{stats.totalOccurrences} occurrences totales</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center">
            <AlertOctagon size={24} />
          </div>
        </div>

        {/* Unique Devices Impacted */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Appareils Touchés</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-indigo-600">{stats.uniqueDevicesTotal}</span>
              <span className="text-xs font-bold text-slate-400">terminaux distincts</span>
            </div>
            <p className="text-[11px] text-indigo-500 font-bold">Android, iOS & Navigateurs</p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
            <Smartphone size={24} />
          </div>
        </div>

        {/* Critical Alerts */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Bugs Critiques Non Résolus</span>
            <div className="flex items-baseline gap-2">
              <span className={`text-3xl font-black ${stats.criticalBugs > 0 ? "text-rose-600" : "text-emerald-600"}`}>
                {stats.criticalBugs}
              </span>
              <span className="text-xs font-bold text-slate-400">priorité P0</span>
            </div>
            <p className="text-[11px] text-slate-500">
              {stats.criticalBugs > 0 ? "Impact sur le checkout ou auth" : "Aucun blocage majeur"}
            </p>
          </div>
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
            stats.criticalBugs > 0 ? "bg-rose-50 text-rose-600 animate-pulse" : "bg-emerald-50 text-emerald-600"
          }`}>
            <AlertTriangle size={24} />
          </div>
        </div>

        {/* Resolution Rate */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between">
          <div className="space-y-1 flex-1 pr-3">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">Taux de Résolution</span>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-black text-emerald-600">{stats.resolutionRate}%</span>
              <span className="text-xs font-bold text-slate-400">{stats.resolvedBugs} résolus</span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${stats.resolutionRate}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 size={24} />
          </div>
        </div>
      </div>

      {/* Visual Distribution & Percentage Bars Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* OS Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Monitor size={14} className="text-indigo-600" /> Répartition par OS
            </h3>
            <span className="text-[11px] font-bold text-slate-400">100% télémétrie</span>
          </div>
          <div className="space-y-2 pt-1">
            {stats.osPercentages.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucune donnée disponible</p>
            ) : (
              stats.osPercentages.map((item) => (
                <div key={item.os} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700">{item.os}</span>
                    <span className="font-black text-indigo-600">{item.pct}% ({item.count})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Application Breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={14} className="text-purple-600" /> Répartition par Application
            </h3>
            <span className="text-[11px] font-bold text-slate-400">Écosystème</span>
          </div>
          <div className="space-y-2 pt-1">
            {stats.appPercentages.length === 0 ? (
              <p className="text-xs text-slate-400 italic">Aucune donnée disponible</p>
            ) : (
              stats.appPercentages.map((item) => (
                <div key={item.app} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-700 truncate">{item.app}</span>
                    <span className="font-black text-purple-600">{item.pct}% ({item.count})</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-purple-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Severity Distribution */}
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp size={14} className="text-rose-600" /> Gravité des Erreurs
            </h3>
            <span className="text-[11px] font-bold text-slate-400">Pourcentages</span>
          </div>
          <div className="space-y-3 pt-1">
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-rose-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-rose-600" /> Critiques
                </span>
                <span className="font-black text-rose-600">{stats.severityPct.critical}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-rose-600 h-full rounded-full"
                  style={{ width: `${stats.severityPct.critical}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-amber-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500" /> Erreurs standards
                </span>
                <span className="font-black text-amber-600">{stats.severityPct.error}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-amber-500 h-full rounded-full"
                  style={{ width: `${stats.severityPct.error}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-blue-700 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500" /> Avertissements & Info
                </span>
                <span className="font-black text-blue-600">{stats.severityPct.warning}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                <div
                  className="bg-blue-500 h-full rounded-full"
                  style={{ width: `${stats.severityPct.warning}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 lg:p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Rechercher par message d'erreur, composant, écran, fingerprint..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 text-slate-900"
            />
          </div>

          {/* Quick Tabs: Grouped Bugs vs Stream */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200">
            <button
              onClick={() => setActiveTab("grouped")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "grouped"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Groupés ({filteredGroupedBugs.length})
            </button>
            <button
              onClick={() => setActiveTab("stream")}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === "stream"
                  ? "bg-white text-slate-900 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              Flux Direct ({rawLogs.length})
            </button>
          </div>
        </div>

        {/* Filters Row */}
        <div className="flex flex-wrap items-center gap-2.5 pt-1 border-t border-slate-100 text-xs font-semibold text-slate-600">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">Filtres :</span>

          {/* Status */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            aria-label="Filtrer par statut"
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="open">Actif / Ouvert</option>
            <option value="investigating">En cours d&apos;analyse</option>
            <option value="resolved">Résolu</option>
            <option value="ignored">Ignoré</option>
          </select>

          {/* App */}
          <select
            value={selectedApp}
            onChange={(e) => setSelectedApp(e.target.value)}
            aria-label="Filtrer par application"
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Toutes les apps</option>
            <option value="mobile-buyer">Mobile Acheteur</option>
            <option value="mobile-seller">Mobile Vendeur</option>
            <option value="web-buyer">Web Acheteur</option>
            <option value="web-seller">Web Vendeur</option>
            <option value="web-relay">Web Relais</option>
            <option value="web-admin">Web Admin</option>
            <option value="api">API / Backend</option>
          </select>

          {/* Level */}
          <select
            value={selectedLevel}
            onChange={(e) => setSelectedLevel(e.target.value)}
            aria-label="Filtrer par niveau de gravité"
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Tous les niveaux</option>
            <option value="critical">Critique</option>
            <option value="error">Erreur</option>
            <option value="warning">Avertissement</option>
          </select>

          {/* OS */}
          <select
            value={selectedOS}
            onChange={(e) => setSelectedOS(e.target.value)}
            aria-label="Filtrer par système d'exploitation"
            className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 font-bold text-slate-700 text-xs cursor-pointer"
          >
            <option value="all">Tous les OS</option>
            <option value="Android">Android</option>
            <option value="iOS">iOS</option>
            <option value="Windows">Windows</option>
            <option value="macOS">macOS</option>
          </select>

          {(searchTerm || selectedStatus !== "all" || selectedApp !== "all" || selectedLevel !== "all" || selectedOS !== "all") && (
            <button
              onClick={() => {
                setSearchTerm("");
                setSelectedStatus("all");
                setSelectedApp("all");
                setSelectedLevel("all");
                setSelectedOS("all");
              }}
              className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer ml-auto"
            >
              Réinitialiser filtres
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      {activeTab === "grouped" ? (
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Gravité</th>
                  <th className="py-3.5 px-4">Erreur & Écran</th>
                  <th className="py-3.5 px-4">Application</th>
                  <th className="py-3.5 px-4 text-center">Occurrences</th>
                  <th className="py-3.5 px-4 text-center">Appareils</th>
                  <th className="py-3.5 px-4">OS Touchés</th>
                  <th className="py-3.5 px-4">Statut</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredGroupedBugs.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400">
                      <div className="max-w-xs mx-auto space-y-2">
                        <CheckCircle2 size={36} className="mx-auto text-emerald-500" />
                        <p className="font-bold text-slate-700">Aucun bug détecté</p>
                        <p className="text-[11px] text-slate-400">
                          Tous les systèmes et applications fonctionnent normalement selon les filtres sélectionnés.
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredGroupedBugs.map((bug) => {
                    return (
                      <tr
                        key={bug.key}
                        className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                        onClick={() => setInspectBug(bug)}
                      >
                        {/* Level */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getLevelBadge(bug.level)}
                        </td>

                        {/* Message & Route */}
                        <td className="py-4 px-4 max-w-md">
                          <div className="space-y-1">
                            <p className="font-bold text-slate-900 group-hover:text-indigo-600 transition-colors line-clamp-2">
                              {bug.title}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-bold">
                                {bug.route_or_screen}
                              </span>
                              <span>• Vu {new Date(bug.lastSeenAt).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                            </div>
                          </div>
                        </td>

                        {/* App */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getAppBadge(bug.app)}
                        </td>

                        {/* Occurrences */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-800 font-black rounded-lg text-xs">
                            x{bug.totalOccurrences}
                          </span>
                        </td>

                        {/* Unique Devices */}
                        <td className="py-4 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 text-indigo-700 font-black rounded-lg text-xs border border-indigo-100">
                            <Smartphone size={12} /> {bug.uniqueDevicesCount}
                          </span>
                        </td>

                        {/* OS Breakdown Tags */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          <div className="flex flex-wrap gap-1">
                            {Object.entries(bug.osBreakdown).map(([osName, cnt]) => (
                              <span
                                key={osName}
                                className="text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded"
                              >
                                {osName} ({cnt})
                              </span>
                            ))}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-4 px-4 whitespace-nowrap">
                          {getStatusBadge(bug.status)}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setInspectBug(bug)}
                              className="p-1.5 rounded-xl bg-slate-100 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer"
                              title="Inspecter le bug"
                            >
                              <Eye size={15} />
                            </button>

                            {bug.status !== "resolved" ? (
                              <button
                                onClick={() => handleUpdateStatus(bug, "resolved")}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-xl bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 text-[10px] font-black transition-all cursor-pointer flex items-center gap-1"
                              >
                                <Check size={11} /> Résoudre
                              </button>
                            ) : (
                              <button
                                onClick={() => handleUpdateStatus(bug, "open")}
                                disabled={actionLoading}
                                className="px-2.5 py-1 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-[10px] font-bold transition-all cursor-pointer"
                              >
                                Réouvrir
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* Stream Table of Individual Raw Logs */
        <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[11px] font-black text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Date & Heure</th>
                  <th className="py-3.5 px-4">Gravité</th>
                  <th className="py-3.5 px-4">Application</th>
                  <th className="py-3.5 px-4">Appareil & OS</th>
                  <th className="py-3.5 px-4">Message</th>
                  <th className="py-3.5 px-4">Statut</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {rawLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                      {new Date(log.created_at).toLocaleString("fr-FR")}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">{getLevelBadge(log.level)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{getAppBadge(log.app)}</td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-bold text-slate-800">{log.device_os || "Inconnu"}</span>
                      <span className="text-[10px] text-slate-400 block font-mono">{log.device_model || "Appareil"}</span>
                    </td>
                    <td className="py-3 px-4 max-w-sm truncate text-slate-900 font-bold">{log.message}</td>
                    <td className="py-3 px-4 whitespace-nowrap">{getStatusBadge(log.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Inspect Modal Drawer */}
      {inspectBug && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-end p-0 lg:p-4">
          <div className="bg-white w-full max-w-2xl h-full lg:h-auto lg:max-h-[90vh] lg:rounded-3xl shadow-2xl border border-slate-100 flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Modal Header */}
            <div className="p-6 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1 pr-4">
                <div className="flex items-center gap-2">
                  {getLevelBadge(inspectBug.level)}
                  {getAppBadge(inspectBug.app)}
                  {getStatusBadge(inspectBug.status)}
                </div>
                <h3 className="text-base font-black text-white line-clamp-2 mt-2">
                  {inspectBug.title}
                </h3>
              </div>
              <button
                onClick={() => setInspectBug(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Key Metrics Bar */}
              <div className="grid grid-cols-3 gap-3 p-4 bg-slate-50 rounded-2xl border border-slate-100 text-center">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Occurrences</span>
                  <p className="text-lg font-black text-slate-900">x{inspectBug.totalOccurrences}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Appareils Touchés</span>
                  <p className="text-lg font-black text-indigo-600">{inspectBug.uniqueDevicesCount}</p>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Dernier Crash</span>
                  <p className="text-xs font-bold text-slate-700 mt-1">
                    {new Date(inspectBug.lastSeenAt).toLocaleTimeString("fr-FR")}
                  </p>
                </div>
              </div>

              {/* Status Action Buttons */}
              <div className="space-y-2">
                <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider block">
                  Changer le statut de ce bug :
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {(["open", "investigating", "resolved", "ignored"] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => handleUpdateStatus(inspectBug, st)}
                      disabled={actionLoading}
                      className={`py-2 px-3 rounded-xl text-xs font-black transition-all cursor-pointer ${
                        inspectBug.status === st
                          ? "bg-slate-900 text-white shadow-md"
                          : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                      }`}
                    >
                      {st === "open" && "Actif"}
                      {st === "investigating" && "En cours"}
                      {st === "resolved" && "Résolu"}
                      {st === "ignored" && "Ignorer"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stack Trace */}
              {inspectBug.latestRecord.stack_trace && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                      <Cpu size={14} className="text-rose-600" /> Stack Trace / Pile d&apos;erreur
                    </span>
                    <button
                      onClick={() => handleCopy(inspectBug.latestRecord.stack_trace || "", "stack")}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                    >
                      <Copy size={12} />
                      {copiedKey === "stack" ? "Copié !" : "Copier"}
                    </button>
                  </div>
                  <pre className="p-4 bg-slate-900 text-slate-200 text-[11px] font-mono rounded-2xl overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800 max-h-60">
                    {inspectBug.latestRecord.stack_trace}
                  </pre>
                </div>
              )}

              {/* Technical Context & Metadata */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-extrabold text-slate-700 uppercase tracking-wider">
                    Contexte d&apos;exécution & Métadonnées
                  </span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(inspectBug.latestRecord.context, null, 2), "ctx")}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer"
                  >
                    <Copy size={12} />
                    {copiedKey === "ctx" ? "Copié !" : "Copier JSON"}
                  </button>
                </div>
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                  <div className="grid grid-cols-2 gap-2 text-slate-600">
                    <div>
                      <span className="font-bold text-slate-400 block text-[10px]">Fingerprint SHA-256 :</span>
                      <span className="font-mono text-[11px] text-slate-800">{inspectBug.fingerprint.slice(0, 24)}...</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block text-[10px]">Écran / Route :</span>
                      <span className="font-mono text-slate-800">{inspectBug.route_or_screen}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block text-[10px]">Systèmes touchés :</span>
                      <span className="text-slate-800 font-bold">{Object.keys(inspectBug.osBreakdown).join(", ")}</span>
                    </div>
                    <div>
                      <span className="font-bold text-slate-400 block text-[10px]">Résolu par :</span>
                      <span className="text-slate-800 font-bold">{inspectBug.resolvedBy || "Non résolu"}</span>
                    </div>
                  </div>

                  {inspectBug.latestRecord.context && Object.keys(inspectBug.latestRecord.context).length > 0 && (
                    <div className="pt-2 border-t border-slate-200">
                      <span className="font-bold text-slate-400 block text-[10px] mb-1">Payload / Session :</span>
                      <pre className="text-[10px] font-mono bg-white p-2.5 rounded-xl border border-slate-200 text-slate-700 overflow-x-auto">
                        {JSON.stringify(inspectBug.latestRecord.context, null, 2)}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[11px] text-slate-400">
                Ticket ID: {inspectBug.key.slice(0, 18)}
              </span>
              <button
                onClick={() => setInspectBug(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
