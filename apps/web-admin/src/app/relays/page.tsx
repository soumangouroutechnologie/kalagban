"use client";

import React, { useState, useEffect } from "react";
import { 
  MapPin, 
  Plus, 
  Eye, 
  Lock, 
  Unlock, 
  Boxes, 
  Building2, 
  Phone, 
  ShieldAlert, 
  CheckCircle2, 
  Search, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  Edit, 
  Trash2, 
  KeyRound, 
  DollarSign, 
  Package, 
  Truck, 
  Clock, 
  Check, 
  ArrowRight, 
  DoorOpen, 
  ChevronRight, 
  Layers, 
  Filter, 
  ExternalLink,
  ShieldCheck,
  UserCheck,
  Smartphone
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface PickupPoint {
  id: string;
  name: string;
  code: string;
  manager_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  commune: string;
  latitude: number;
  longitude: number;
  status: "active" | "suspended" | "full" | "closed";
  max_capacity: number;
  current_packages_count: number;
  commission_per_package: number;
  total_commissions_earned: number;
  pin_code?: string;
}

interface RelayInventoryItem {
  id: string;
  order_code: string;
  customer_name: string;
  customer_phone: string;
  seller_name: string;
  seller_phone: string;
  deposited_at: string;
  status: "in_stock" | "retrieved" | "overdue" | "returned_to_sender";
  max_retention_days: number;
  is_overdue: boolean;
  otp_code?: string;
}

interface RelayLog {
  id: string;
  action_type: string;
  order_code: string;
  customer_name: string;
  created_at: string;
  commission_earned: number;
}

export default function AdminRelaysPage() {
  const { hasPermission, isSuperAdmin } = useAdminAuth();

  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");

  // Selected Relay for Map / Details
  const [selectedRelay, setSelectedRelay] = useState<PickupPoint | null>(null);

  // IMMERSIVE COCKPIT MODE ("Entrer dans le point relais")
  const [immersiveRelay, setImmersiveRelay] = useState<PickupPoint | null>(null);
  const [relayInventory, setRelayInventory] = useState<RelayInventoryItem[]>([]);
  const [relayLogs, setRelayLogs] = useState<RelayLog[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [otpInput, setOtpInput] = useState("");
  const [verifyingOtp, setVerifyingOtp] = useState(false);

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [newRelay, setNewRelay] = useState({
    name: "",
    code: "",
    manager_name: "",
    phone: "",
    address: "",
    city: "Abidjan",
    commune: "Cocody",
    max_capacity: 50,
    commission_per_package: 300,
    latitude: 5.3484,
    longitude: -4.0197,
    pin_code: "123456",
  });

  const fetchRelays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pickup_points")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      const formatted: PickupPoint[] = data.map((p: any) => ({
        ...p,
        pin_code: p.pin_code || (p.email && p.email.startsWith("pin:") ? p.email.replace("pin:", "") : "123456"),
      }));
      setPoints(formatted);
      if (!selectedRelay && formatted.length > 0) {
        setSelectedRelay(formatted[0]);
      }
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRelays();

    const channel = supabase
      .channel("admin_relays_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_points" }, () => fetchRelays())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Fetch Inventory and Logs when entering a Relay
  const handleEnterRelay = async (relay: PickupPoint) => {
    setImmersiveRelay(relay);
    setLoadingInventory(true);

    try {
      // 1. Fetch live inventory
      const { data: invData } = await supabase
        .from("relay_inventory")
        .select("*")
        .eq("pickup_point_id", relay.id)
        .order("deposited_at", { ascending: false });

      setRelayInventory(invData || []);

      // 2. Fetch live logs
      const { data: logData } = await supabase
        .from("relay_logs")
        .select("*")
        .eq("pickup_point_id", relay.id)
        .order("created_at", { ascending: false })
        .limit(20);

      setRelayLogs(logData || []);
    } catch (err) {
      console.error("Error loading relay cockpit:", err);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleCreateRelay = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = newRelay.code || `RELAY-${newRelay.commune.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

      const { error } = await supabase.from("pickup_points").insert({
        name: newRelay.name,
        code,
        manager_name: newRelay.manager_name,
        phone: newRelay.phone,
        email: `pin:${newRelay.pin_code}`,
        address: newRelay.address,
        city: newRelay.city,
        commune: newRelay.commune,
        max_capacity: newRelay.max_capacity,
        commission_per_package: newRelay.commission_per_package,
        latitude: newRelay.latitude,
        longitude: newRelay.longitude,
        status: "active",
      });

      if (error) throw error;
      setShowAddModal(false);
      fetchRelays();
    } catch (err: any) {
      alert("Erreur lors de la création du point relais : " + err.message);
    }
  };

  const handleToggleRelayStatus = async (relay: PickupPoint) => {
    const nextStatus = relay.status === "active" ? "suspended" : "active";
    await supabase.from("pickup_points").update({ status: nextStatus }).eq("id", relay.id);
    fetchRelays();
    if (immersiveRelay && immersiveRelay.id === relay.id) {
      setImmersiveRelay({ ...immersiveRelay, status: nextStatus });
    }
  };

  const filteredPoints = points.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.commune.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manager_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCommune = selectedCommune === "all" || p.commune === selectedCommune;
    const matchStatus = selectedStatus === "all" || p.status === selectedStatus;
    return matchSearch && matchCommune && matchStatus;
  });

  const communes = Array.from(new Set(points.map((p) => p.commune).filter(Boolean)));

  // Global Key Metrics
  const totalRelays = points.length;
  const activeRelays = points.filter((p) => p.status === "active").length;
  const totalCapacity = points.reduce((acc, p) => acc + (p.max_capacity || 0), 0);
  const totalPackages = points.reduce((acc, p) => acc + (p.current_packages_count || 0), 0);
  const avgOccupancy = totalCapacity > 0 ? Math.round((totalPackages / totalCapacity) * 100) : 0;

  // Occupancy rate calculation helper
  const getOccupancyRate = (p: PickupPoint) => {
    if (!p.max_capacity || p.max_capacity === 0) return 0;
    return Math.round(((p.current_packages_count || 0) / p.max_capacity) * 100);
  };

  const getSaturationBadge = (p: PickupPoint) => {
    const rate = getOccupancyRate(p);
    if (p.status === "suspended") {
      return <span className="bg-gray-100 text-gray-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">Suspendu ⏸️</span>;
    }
    if (rate >= 95) {
      return <span className="bg-red-100 text-red-700 px-2.5 py-0.5 rounded-full text-[10px] font-black animate-pulse">Saturé 🔴 ({rate}%)</span>;
    }
    if (rate >= 85) {
      return <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">Attention ⚠️ ({rate}%)</span>;
    }
    return <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-full text-[10px] font-black">Disponible 🟢 ({rate}%)</span>;
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* IMMERSIVE COCKPIT VIEW (If entered a relay) */}
      {immersiveRelay ? (
        <div className="space-y-6">
          {/* Top Bar with Back Button */}
          <div className="bg-slate-900 text-white p-6 rounded-3xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-xl">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setImmersiveRelay(null)}
                className="bg-slate-800 hover:bg-slate-700 text-white p-3 rounded-2xl transition-colors flex items-center gap-2 text-xs font-bold cursor-pointer"
              >
                ← Quitter le Point Relais
              </button>
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[10px] font-black px-2.5 py-0.5 rounded-lg uppercase">
                    Vue Cockpit En Direct
                  </span>
                  <span className="text-xs text-gray-400 font-mono">Code: {immersiveRelay.code}</span>
                </div>
                <h1 className="text-2xl font-black tracking-tight mt-1">{immersiveRelay.name}</h1>
                <p className="text-xs text-gray-400 font-medium flex items-center gap-1.5 mt-0.5">
                  <MapPin size={14} className="text-indigo-400" /> {immersiveRelay.address}, {immersiveRelay.commune}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={() => handleToggleRelayStatus(immersiveRelay)}
                className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-colors cursor-pointer flex items-center gap-2 ${
                  immersiveRelay.status === "active"
                    ? "bg-red-500/20 text-red-300 border border-red-500/40 hover:bg-red-500/30"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30"
                }`}
              >
                {immersiveRelay.status === "active" ? <Lock size={14} /> : <Unlock size={14} />}
                {immersiveRelay.status === "active" ? "Verrouiller ce Relais" : "Activer ce Relais"}
              </button>
            </div>
          </div>

          {/* Cockpit Status & Gauge */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Capacité &amp; Occupation</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">
                  {immersiveRelay.current_packages_count || 0} / {immersiveRelay.max_capacity}
                </span>
                <span className="text-xs font-black text-indigo-600">
                  {getOccupancyRate(immersiveRelay)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className={`h-full transition-all ${
                    getOccupancyRate(immersiveRelay) >= 95 ? "bg-red-500" :
                    getOccupancyRate(immersiveRelay) >= 85 ? "bg-amber-500" : "bg-emerald-500"
                  }`}
                  style={{ width: `${Math.min(100, getOccupancyRate(immersiveRelay))}%` }}
                />
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Gérant du Relais</span>
              <p className="text-sm font-extrabold text-gray-900">{immersiveRelay.manager_name}</p>
              <p className="text-xs text-gray-500 flex items-center gap-1 font-medium">
                <Phone size={12} className="text-indigo-600" /> {immersiveRelay.phone}
              </p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Code PIN de Connexion</span>
              <div className="flex items-center gap-2">
                <span className="font-mono font-black text-sm bg-gray-100 px-3 py-1 rounded-xl text-gray-900">
                  {immersiveRelay.pin_code || "123456"}
                </span>
                <KeyRound size={16} className="text-amber-500" />
              </div>
              <p className="text-[10px] text-gray-400">Authentification tablette relais</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Commission Gagnée</span>
              <p className="text-2xl font-black text-emerald-600">
                {(immersiveRelay.total_commissions_earned || 0).toLocaleString()} FCFA
              </p>
              <p className="text-[10px] text-gray-400">Tarif: {immersiveRelay.commission_per_package} FCFA / colis</p>
            </div>
          </div>

          {/* Virtual Locker & Live Logs */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Column 1 & 2: Virtual Parcel Locker */}
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-base text-gray-900">
                    📦 Casier Virtuel des Colis en Stock ({relayInventory.length})
                  </h2>
                  <p className="text-xs text-gray-500 font-medium">
                    Colis actuellement stockés dans le point relais en attente de retrait client
                  </p>
                </div>
              </div>

              {loadingInventory ? (
                <div className="py-12 text-center text-xs text-gray-400 font-bold animate-pulse">
                  Synchronisation du stock en direct...
                </div>
              ) : relayInventory.length === 0 ? (
                <div className="py-12 text-center text-xs text-gray-400 font-medium space-y-1">
                  <p className="font-bold text-gray-700">Aucun colis en stock dans ce point relais</p>
                  <p className="text-[11px]">Le casier virtuel se remplira automatiquement dès qu&apos;un livreur effectuera un dépôt.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-600">
                    <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                      <tr>
                        <th className="py-3 px-5">Commande</th>
                        <th className="py-3 px-5">Client &amp; Téléphone</th>
                        <th className="py-3 px-5">Boutique Vendeur</th>
                        <th className="py-3 px-5">Statut &amp; Souffrance</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {relayInventory.map((item) => (
                        <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                          <td className="py-3.5 px-5">
                            <span className="font-mono font-black text-indigo-600">{item.order_code}</span>
                            <div className="text-[10px] text-gray-400">
                              Dépôt : {new Date(item.deposited_at).toLocaleDateString("fr-FR")}
                            </div>
                          </td>
                          <td className="py-3.5 px-5">
                            <p className="font-bold text-gray-900">{item.customer_name}</p>
                            <p className="text-[11px] text-gray-500 font-mono">{item.customer_phone}</p>
                          </td>
                          <td className="py-3.5 px-5">
                            <p className="font-bold text-gray-800">{item.seller_name}</p>
                          </td>
                          <td className="py-3.5 px-5">
                            {item.is_overdue ? (
                              <span className="bg-red-50 text-red-700 font-black px-2.5 py-1 rounded-xl text-[10px] border border-red-200 flex items-center gap-1 w-fit animate-pulse">
                                <AlertTriangle size={12} /> Colis en Souffrance (&gt; 5j)
                              </span>
                            ) : (
                              <span className="bg-emerald-50 text-emerald-700 font-black px-2.5 py-1 rounded-xl text-[10px] border border-emerald-200 flex items-center gap-1 w-fit">
                                <CheckCircle2 size={12} /> En Stock (Dispo)
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Column 3: Live Timestamped Scans & Logs */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-gray-900 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" /> Journal Live des Scans
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              </div>

              <div className="space-y-3 max-h-100 overflow-y-auto pr-1">
                {relayLogs.length === 0 ? (
                  <div className="py-8 text-center text-xs text-gray-400 font-medium">
                    Aucun scan enregistré aujourd&apos;hui.
                  </div>
                ) : (
                  relayLogs.map((log) => (
                    <div key={log.id} className="p-3.5 rounded-2xl bg-gray-50 border border-gray-100 space-y-1">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className={`font-black uppercase px-2 py-0.5 rounded-md ${
                          log.action_type === "deposit"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-emerald-100 text-emerald-800"
                        }`}>
                          {log.action_type === "deposit" ? "📥 Dépôt Livreur" : "📤 Retrait Client (OTP)"}
                        </span>
                        <span className="text-gray-400 font-medium">
                          {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-gray-800 mt-1">Colis: {log.order_code}</p>
                      <p className="text-[11px] text-gray-500">Bénéficiaire : {log.customer_name}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* GLOBAL RELAYS & MAP OVERVIEW */
        <div className="space-y-8">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                <MapPin size={24} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-gray-900 tracking-tight">Supervision des Points Relais &amp; Carte</h1>
                <p className="text-xs text-gray-500 font-medium">
                  Réseau de retrait physique Kalagban, taux de saturation et mode immersion
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={fetchRelays}
                className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-colors cursor-pointer"
                title="Actualiser"
              >
                <RefreshCw size={16} />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
              >
                <Plus size={16} /> Nouveau Point Relais
              </button>
            </div>
          </div>

          {/* Key Metrics Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Réseau Points Relais</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">{totalRelays}</span>
                <span className="text-xs font-bold text-emerald-600">({activeRelays} actifs)</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Colis en Stock Global</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-indigo-600">{totalPackages}</span>
                <span className="text-xs text-gray-400">/ {totalCapacity} places</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Taux d&apos;Occupation Réseau</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-gray-900">{avgOccupancy}%</span>
                <span className="text-xs font-bold text-emerald-600">Capacité fluide</span>
              </div>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Sécurité des Retraits</span>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-600">99.4%</span>
                <span className="text-xs font-bold text-gray-400">OTP certifié</span>
              </div>
            </div>
          </div>

          {/* Interactive Map & Relay Explorer Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Left: Interactive Map Container */}
            <div className="lg:col-span-7 bg-slate-900 rounded-3xl p-6 text-white space-y-4 shadow-md flex flex-col justify-between min-h-120">
              <div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                    <h3 className="font-extrabold text-sm">Carte Interactive d&apos;Abidjan</h3>
                  </div>
                  <span className="text-[10px] font-bold text-gray-400">Abidjan Hub Réseau</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  Cliquez sur un point relais pour visualiser son statut et y entrer en mode cockpit.
                </p>
              </div>

              {/* Visual Interactive Map Canvas Simulation with Clickable Pins */}
              <div className="relative w-full h-80 bg-slate-950/60 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-4">
                {/* Abidjan Map background grid */}
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] bg-size-[16px_16px] opacity-40"></div>

                {/* Clickable Pins for Relays */}
                {filteredPoints.slice(0, 10).map((p, idx) => {
                  const rate = getOccupancyRate(p);
                  const isSelected = selectedRelay?.id === p.id;
                  // Dynamic positions distributed for preview
                  const leftPos = 20 + ((idx * 27) % 65);
                  const topPos = 20 + ((idx * 33) % 60);

                  return (
                    <button
                      key={p.id}
                      onClick={() => setSelectedRelay(p)}
                      style={{ left: `${leftPos}%`, top: `${topPos}%` }}
                      className={`absolute transform -translate-x-1/2 -translate-y-1/2 p-2 rounded-2xl transition-all cursor-pointer flex items-center gap-1.5 shadow-lg ${
                        isSelected
                          ? "bg-indigo-600 text-white ring-4 ring-indigo-400/40 scale-110 z-20"
                          : rate >= 95
                          ? "bg-red-500 text-white z-10"
                          : rate >= 85
                          ? "bg-amber-500 text-white z-10"
                          : "bg-emerald-600 text-white hover:scale-105"
                      }`}
                    >
                      <MapPin size={16} />
                      <span className="text-[10px] font-black whitespace-nowrap hidden sm:inline">
                        {p.name.split(" ")[0]} ({rate}%)
                      </span>
                    </button>
                  );
                })}

                <div className="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur-xs p-2 rounded-xl text-[10px] text-gray-300 border border-slate-800 flex items-center gap-3">
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-emerald-500"></span> Dispo (&lt;85%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500"></span> Élevé (85-95%)</span>
                  <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-red-500"></span> Saturé (&gt;95%)</span>
                </div>
              </div>

              {/* Selected Relay Focus Box */}
              {selectedRelay && (
                <div className="bg-slate-800/90 p-4 rounded-2xl border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-400">{selectedRelay.commune}</span>
                    <h4 className="font-extrabold text-sm text-white">{selectedRelay.name}</h4>
                    <p className="text-xs text-gray-400">{selectedRelay.manager_name} • {selectedRelay.phone}</p>
                  </div>

                  <button
                    onClick={() => handleEnterRelay(selectedRelay)}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-extrabold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer shrink-0"
                  >
                    <DoorOpen size={16} /> Entrer dans le Point Relais
                  </button>
                </div>
              )}
            </div>

            {/* Right: Search, Filter & List of Relays */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="font-extrabold text-base text-gray-900">
                    Points Relais Référencés ({filteredPoints.length})
                  </h3>
                </div>

                {/* Filter Controls */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par nom, commune..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                    />
                  </div>

                  <div className="flex gap-2">
                    <select
                      value={selectedCommune}
                      onChange={(e) => setSelectedCommune(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
                    >
                      <option value="all">Toutes Communes</option>
                      {communes.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value)}
                      className="flex-1 px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
                    >
                      <option value="all">Tous Statuts</option>
                      <option value="active">Actifs</option>
                      <option value="suspended">Suspendus</option>
                    </select>
                  </div>
                </div>

                {/* Relays Scrollable List */}
                <div className="space-y-2.5 max-h-96 overflow-y-auto pr-1">
                  {filteredPoints.map((p) => {
                    const isSelected = selectedRelay?.id === p.id;
                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedRelay(p)}
                        className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                          isSelected
                            ? "border-indigo-600 bg-indigo-50/40 shadow-xs"
                            : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
                        }`}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-extrabold text-xs text-gray-900 truncate">{p.name}</span>
                            {getSaturationBadge(p)}
                          </div>
                          <p className="text-[11px] text-gray-500 mt-0.5 truncate">
                            {p.commune} • {p.current_packages_count || 0}/{p.max_capacity} colis
                          </p>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleEnterRelay(p);
                          }}
                          className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-xs shrink-0"
                          title="Entrer dans le point relais"
                        >
                          <DoorOpen size={16} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Relay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Créer un Point Relais</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateRelay} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nom de l&apos;Établissement</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pharmacie des Arts - Angré"
                  value={newRelay.name}
                  onChange={(e) => setNewRelay({ ...newRelay, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Commune</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Cocody"
                    value={newRelay.commune}
                    onChange={(e) => setNewRelay({ ...newRelay, commune: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Capacité Max (Colis)</label>
                  <input
                    type="number"
                    required
                    value={newRelay.max_capacity}
                    onChange={(e) => setNewRelay({ ...newRelay, max_capacity: parseInt(e.target.value) || 50 })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Nom du Gérant</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: M. Bamba"
                    value={newRelay.manager_name}
                    onChange={(e) => setNewRelay({ ...newRelay, manager_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    required
                    placeholder="+225 07..."
                    value={newRelay.phone}
                    onChange={(e) => setNewRelay({ ...newRelay, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Adresse Détaillée</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Boulevard Latrille, Carrefour Duncan"
                  value={newRelay.address}
                  onChange={(e) => setNewRelay({ ...newRelay, address: e.target.value })}
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
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md"
                >
                  Enregistrer le Relais
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
