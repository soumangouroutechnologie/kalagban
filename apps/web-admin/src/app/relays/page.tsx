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
  Smartphone,
  Palette,
  Sparkles,
  Info,
  Map,
  LayoutGrid,
  List
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

export interface CommuneItem {
  id: string;
  name: string;
  code: string;
  color_hex: string;
  badge_bg: string;
  badge_text: string;
  city: string;
  zone: string;
  display_order: number;
  latitude?: number;
  longitude?: number;
}

export interface PickupPoint {
  id: string;
  name: string;
  code: string;
  manager_name: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  commune: string;
  commune_id?: string;
  color_code?: string;
  badge_bg?: string;
  badge_text?: string;
  zone_label?: string;
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

interface ConfirmationModalState {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  type: "primary" | "danger" | "warning";
  details?: { label: string; value: string; color?: string }[];
  onConfirm: () => void;
}

const DEFAULT_COMMUNES: CommuneItem[] = [
  { id: "c-adj", name: "Adjamé", code: "ADJ", color_hex: "#10B981", badge_bg: "rgba(16, 185, 129, 0.12)", badge_text: "#065F46", city: "Abidjan", zone: "Abidjan Nord", display_order: 1, latitude: 5.3567, longitude: -4.0245 },
  { id: "c-coc", name: "Cocody", code: "COC", color_hex: "#6366F1", badge_bg: "rgba(99, 102, 241, 0.12)", badge_text: "#3730A3", city: "Abidjan", zone: "Abidjan Est", display_order: 2, latitude: 5.3484, longitude: -3.9858 },
  { id: "c-yop", name: "Yopougon", code: "YOP", color_hex: "#F59E0B", badge_bg: "rgba(245, 158, 11, 0.12)", badge_text: "#92400E", city: "Abidjan", zone: "Abidjan Ouest", display_order: 3, latitude: 5.3438, longitude: -4.0725 },
  { id: "c-mar", name: "Marcory", code: "MAR", color_hex: "#8B5CF6", badge_bg: "rgba(139, 92, 246, 0.12)", badge_text: "#5B21B6", city: "Abidjan", zone: "Abidjan Sud", display_order: 4, latitude: 5.2974, longitude: -3.9870 },
  { id: "c-pla", name: "Plateau", code: "PLA", color_hex: "#06B6D4", badge_bg: "rgba(6, 182, 212, 0.12)", badge_text: "#155E75", city: "Abidjan", zone: "Abidjan Centre", display_order: 5, latitude: 5.3235, longitude: -4.0177 },
  { id: "c-tre", name: "Treichville", code: "TRE", color_hex: "#EC4899", badge_bg: "rgba(236, 72, 153, 0.12)", badge_text: "#9D174D", city: "Abidjan", zone: "Abidjan Sud", display_order: 6, latitude: 5.3032, longitude: -4.0094 },
  { id: "c-kou", name: "Koumassi", code: "KOU", color_hex: "#3B82F6", badge_bg: "rgba(59, 130, 246, 0.12)", badge_text: "#1E40AF", city: "Abidjan", zone: "Abidjan Sud", display_order: 7, latitude: 5.2905, longitude: -3.9482 },
  { id: "c-pb", name: "Port-Bouët", code: "PB", color_hex: "#EAB308", badge_bg: "rgba(234, 179, 8, 0.12)", badge_text: "#854D0E", city: "Abidjan", zone: "Abidjan Littoral", display_order: 8, latitude: 5.2575, longitude: -3.9298 },
  { id: "c-abo", name: "Abobo", code: "ABO", color_hex: "#EF4444", badge_bg: "rgba(239, 68, 68, 0.12)", badge_text: "#991B1B", city: "Abidjan", zone: "Abidjan Nord", display_order: 9, latitude: 5.4182, longitude: -4.0163 },
  { id: "c-att", name: "Attécoubé", code: "ATT", color_hex: "#84CC16", badge_bg: "rgba(132, 204, 22, 0.12)", badge_text: "#3F6212", city: "Abidjan", zone: "Abidjan Centre", display_order: 10, latitude: 5.3377, longitude: -4.0416 },
  { id: "c-bin", name: "Bingerville", code: "BIN", color_hex: "#14B8A6", badge_bg: "rgba(20, 184, 166, 0.12)", badge_text: "#115E59", city: "Abidjan", zone: "Grand Abidjan", display_order: 11, latitude: 5.3556, longitude: -3.8950 },
  { id: "c-son", name: "Songon", code: "SON", color_hex: "#64748B", badge_bg: "rgba(100, 116, 139, 0.12)", badge_text: "#334155", city: "Abidjan", zone: "Grand Abidjan", display_order: 12, latitude: 5.3167, longitude: -4.2667 },
  { id: "c-any", name: "Anyama", code: "ANY", color_hex: "#A855F7", badge_bg: "rgba(168, 85, 247, 0.12)", badge_text: "#6B21A8", city: "Abidjan", zone: "Grand Abidjan", display_order: 13, latitude: 5.4944, longitude: -4.0519 },
];

export default function AdminRelaysPage() {
  const { hasPermission, isSuperAdmin } = useAdminAuth();
  const canManage = hasPermission("can_manage_relays") || isSuperAdmin;

  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [communesList, setCommunesList] = useState<CommuneItem[]>(DEFAULT_COMMUNES);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("all");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [activeTab, setActiveTab] = useState<"map" | "grid">("map");

  // Selected Relay for Map / Details
  const [selectedRelay, setSelectedRelay] = useState<PickupPoint | null>(null);

  // IMMERSIVE COCKPIT MODE ("Entrer dans le point relais")
  const [immersiveRelay, setImmersiveRelay] = useState<PickupPoint | null>(null);
  const [relayInventory, setRelayInventory] = useState<RelayInventoryItem[]>([]);
  const [relayLogs, setRelayLogs] = useState<RelayLog[]>([]);
  const [loadingInventory, setLoadingInventory] = useState(false);

  const generateRandomPin = () => Math.floor(100000 + Math.random() * 900000).toString();

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [showCommunesModal, setShowCommunesModal] = useState(false);
  const [newCommune, setNewCommune] = useState({ name: "", code: "", color_hex: "#6366F1", zone: "Abidjan Centre" });

  const [confirmModal, setConfirmModal] = useState<ConfirmationModalState>({
    isOpen: false,
    title: "",
    description: "",
    confirmLabel: "Confirmer",
    type: "primary",
    onConfirm: () => {},
  });

  const [newRelay, setNewRelay] = useState({
    name: "",
    code: "",
    manager_name: "",
    phone: "",
    address: "",
    city: "Abidjan",
    commune: "Adjamé",
    commune_id: "c-adj",
    color_code: "#10B981",
    zone_label: "Abidjan Nord",
    max_capacity: 100,
    commission_per_package: 300,
    latitude: 5.3567,
    longitude: -4.0245,
    pin_code: generateRandomPin(),
  });

  // 1. Fetch Communes
  const fetchCommunes = async () => {
    try {
      const { data, error } = await supabase
        .from("communes")
        .select("*")
        .order("display_order", { ascending: true });

      if (!error && data && data.length > 0) {
        setCommunesList(data as CommuneItem[]);
      }
    } catch (err) {
      console.warn("Could not load dynamic communes, using DEFAULT_COMMUNES", err);
    }
  };

  // 2. Fetch Relays with joined Communes
  const fetchRelays = async () => {
    setLoading(true);
    try {
      const [relaysRes, ordersRes, logsRes] = await Promise.all([
        supabase.from("pickup_points").select("*").order("created_at", { ascending: false }),
        supabase.from("orders").select("id, pickup_point_id, relay_status, status").eq("delivery_type", "pickup_point"),
        supabase.from("relay_logs").select("pickup_point_id, action_type, commission_earned")
      ]);

      const allOrders = ordersRes.data || [];
      const allLogs = logsRes.data || [];

      if (!relaysRes.error && relaysRes.data) {
        const formatted: PickupPoint[] = relaysRes.data.map((p: any) => {
          const pointOrders = allOrders.filter((o) => o.pickup_point_id === p.id);
          const inStock = pointOrders.filter((o) => o.relay_status === "ready_for_pickup" || (o.relay_status === "deposited" && o.status !== "delivered")).length;
          
          const pointLogs = allLogs.filter((l) => l.pickup_point_id === p.id);
          const earnedFromLogs = pointLogs.filter((l) => l.action_type === "pickup").reduce((sum, l) => sum + (l.commission_earned || 300), 0);
          const earnedFromOrders = pointOrders.filter((o) => o.relay_status === "picked_up" || o.status === "delivered").length * (p.commission_per_package || 300);
          const totalEarned = Math.max(earnedFromLogs, earnedFromOrders, p.total_commissions_earned || 0);

          const matchedCommune = communesList.find(c => c.name.toLowerCase() === (p.commune || "").toLowerCase());
          const colorCode = p.color_code || matchedCommune?.color_hex || "#6366F1";
          const badgeBg = matchedCommune?.badge_bg || "rgba(99, 102, 241, 0.12)";
          const badgeText = matchedCommune?.badge_text || "#4338CA";

          return {
            ...p,
            current_packages_count: inStock,
            total_commissions_earned: totalEarned,
            color_code: colorCode,
            badge_bg: badgeBg,
            badge_text: badgeText,
            zone_label: p.zone_label || matchedCommune?.zone || "Abidjan",
            pin_code: p.pin_code || (p.email && p.email.startsWith("pin:") ? p.email.replace("pin:", "") : generateRandomPin()),
          };
        });

        setPoints(formatted);
        if (!selectedRelay && formatted.length > 0) {
          setSelectedRelay(formatted[0]);
        } else if (selectedRelay) {
          const updated = formatted.find(f => f.id === selectedRelay.id);
          if (updated) setSelectedRelay(updated);
        }
      }
    } catch (err) {
      console.error("Error fetching relays:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCommunes().then(() => fetchRelays());

    const channel = supabase
      .channel("admin_relays_live_sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "pickup_points" }, () => fetchRelays())
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => fetchRelays())
      .on("postgres_changes", { event: "*", schema: "public", table: "relay_logs" }, () => fetchRelays())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCommuneSelection = (communeName: string) => {
    const selected = communesList.find(c => c.name.toLowerCase() === communeName.toLowerCase()) || DEFAULT_COMMUNES[0];
    const generatedCode = `RELAY-${selected.code}-${Math.floor(100 + Math.random() * 900)}`;
    setNewRelay(prev => ({
      ...prev,
      commune: selected.name,
      commune_id: selected.id,
      color_code: selected.color_hex,
      zone_label: selected.zone,
      code: generatedCode,
      latitude: selected.latitude || 5.3484,
      longitude: selected.longitude || -4.0197,
    }));
  };

  // 3. Load Cockpit Data
  const loadRelayCockpitData = async (relay: PickupPoint) => {
    setLoadingInventory(true);
    try {
      const { data: ordersData } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, relay_status, status, deposited_at, pickup_code, created_at, shop_id, shops(name)")
        .eq("pickup_point_id", relay.id)
        .order("created_at", { ascending: false });

      const allOrders = ordersData || [];

      const { data: logData } = await supabase
        .from("relay_logs")
        .select("*")
        .eq("pickup_point_id", relay.id)
        .order("created_at", { ascending: false })
        .limit(50);

      const logs = logData || [];

      const inStockOrders = allOrders.filter(
        (o: any) => o.relay_status === "ready_for_pickup" || (o.relay_status === "deposited" && o.status !== "delivered")
      );

      const inventoryItems: RelayInventoryItem[] = inStockOrders.map((o: any) => {
        const depDate = o.deposited_at ? new Date(o.deposited_at) : new Date(o.created_at);
        const diffDays = Math.floor((Date.now() - depDate.getTime()) / (1000 * 60 * 60 * 24));
        return {
          id: o.id,
          order_code: o.id.slice(0, 8).toUpperCase(),
          customer_name: o.customer_name || "Client",
          customer_phone: o.customer_phone || "+225 --",
          seller_name: o.shops?.name || "Boutique Kalagban",
          seller_phone: "+225 --",
          deposited_at: o.deposited_at || o.created_at,
          status: "in_stock",
          max_retention_days: 5,
          is_overdue: diffDays > 5,
          otp_code: o.pickup_code || "------"
        };
      });

      setRelayInventory(inventoryItems);
      setRelayLogs(logs as RelayLog[]);

      const pickedUpCount = allOrders.filter((o: any) => o.relay_status === "picked_up" || o.status === "delivered").length;
      const earnedFromLogs = logs.filter((l: any) => l.action_type === "pickup").reduce((sum: number, l: any) => sum + (l.commission_earned || 300), 0);
      const liveEarned = Math.max(earnedFromLogs, pickedUpCount * (relay.commission_per_package || 300));

      setImmersiveRelay(prev => prev ? ({
        ...prev,
        current_packages_count: inStockOrders.length,
        total_commissions_earned: liveEarned
      }) : null);

    } catch (err) {
      console.error("Error loading cockpit data:", err);
    } finally {
      setLoadingInventory(false);
    }
  };

  const handleEnterRelay = (relay: PickupPoint) => {
    setImmersiveRelay(relay);
    loadRelayCockpitData(relay);
  };

  const handleExitRelay = () => {
    setImmersiveRelay(null);
    setRelayInventory([]);
    setRelayLogs([]);
    fetchRelays();
  };

  // 4. Safe Action Confirmations
  const promptCreateRelay = (e: React.FormEvent) => {
    e.preventDefault();
    const matchedCommune = communesList.find(c => c.name === newRelay.commune);
    const color = matchedCommune?.color_hex || newRelay.color_code || "#6366F1";

    setConfirmModal({
      isOpen: true,
      title: "Confirmer la Création du Point Relais",
      description: "Vous êtes sur le point d'ajouter ce nouveau partenaire point relais. Un code secret aléatoire lui sera attribué.",
      confirmLabel: "Créer le Relais",
      type: "primary",
      details: [
        { label: "Nom du Relais", value: newRelay.name },
        { label: "Commune & Couleur", value: `${newRelay.commune} (${newRelay.zone_label})`, color: color },
        { label: "Code Identifiant", value: newRelay.code || "Auto-Généré" },
        { label: "Gérant & Contact", value: `${newRelay.manager_name} • ${newRelay.phone}` },
        { label: "Code PIN Secret", value: newRelay.pin_code },
        { label: "Capacité Maximale", value: `${newRelay.max_capacity} colis` }
      ],
      onConfirm: async () => {
        try {
          const generatedPin = newRelay.pin_code || generateRandomPin();
          const code = newRelay.code || `RELAY-${(matchedCommune?.code || "REL").toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

          const { error } = await supabase.from("pickup_points").insert({
            name: newRelay.name,
            code,
            manager_name: newRelay.manager_name,
            phone: newRelay.phone,
            email: `pin:${generatedPin}`,
            pin_code: generatedPin,
            address: newRelay.address,
            city: newRelay.city,
            commune: newRelay.commune,
            commune_id: newRelay.commune_id && !newRelay.commune_id.startsWith("c-") ? newRelay.commune_id : null,
            color_code: color,
            zone_label: newRelay.zone_label,
            max_capacity: newRelay.max_capacity,
            commission_per_package: newRelay.commission_per_package,
            latitude: newRelay.latitude,
            longitude: newRelay.longitude,
            status: "active",
          });

          if (error) throw error;
          setShowAddModal(false);
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
          fetchRelays();
        } catch (err: any) {
          alert("Erreur lors de la création du point relais : " + err.message);
        }
      }
    });
  };

  const promptDeleteRelay = (relay: PickupPoint) => {
    setConfirmModal({
      isOpen: true,
      title: "Supprimer Définitivement ce Point Relais",
      description: `Êtes-vous absolument certain de vouloir supprimer le point relais "${relay.name}" (${relay.code}) ? Cette action est irréversible.`,
      confirmLabel: "Supprimer Définitivement",
      type: "danger",
      details: [
        { label: "Établissement", value: relay.name },
        { label: "Commune", value: relay.commune, color: relay.color_code },
        { label: "Code", value: relay.code }
      ],
      onConfirm: async () => {
        try {
          const { error } = await supabase.from("pickup_points").delete().eq("id", relay.id);
          if (error) throw error;
          setSelectedRelay(null);
          if (immersiveRelay && immersiveRelay.id === relay.id) {
            setImmersiveRelay(null);
          }
          fetchRelays();
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          alert("Erreur lors de la suppression : " + err.message);
        }
      }
    });
  };

  const promptRegeneratePin = (relay: PickupPoint) => {
    const nextPin = generateRandomPin();
    setConfirmModal({
      isOpen: true,
      title: "Régénérer le Code PIN Secret",
      description: `L'ancien code PIN sera immédiatement révoqué. Le gérant devra se connecter avec ce nouveau code.`,
      confirmLabel: "Régénérer le Code",
      type: "warning",
      details: [
        { label: "Établissement", value: relay.name },
        { label: "Commune", value: relay.commune, color: relay.color_code },
        { label: "Gérant", value: relay.manager_name },
        { label: "Nouveau Code PIN", value: nextPin }
      ],
      onConfirm: async () => {
        try {
          const { error } = await supabase
            .from("pickup_points")
            .update({
              pin_code: nextPin,
              email: `pin:${nextPin}`,
            })
            .eq("id", relay.id);

          if (error) throw error;

          setImmersiveRelay((prev) => (prev ? { ...prev, pin_code: nextPin } : null));
          setPoints((prev) => prev.map((p) => (p.id === relay.id ? { ...p, pin_code: nextPin } : p)));
          setConfirmModal(prev => ({ ...prev, isOpen: false }));
        } catch (err: any) {
          alert("Erreur lors de la régénération du code PIN : " + err.message);
        }
      }
    });
  };

  const promptToggleStatus = (relay: PickupPoint) => {
    const isSuspending = relay.status === "active";
    const nextStatus = isSuspending ? "suspended" : "active";

    setConfirmModal({
      isOpen: true,
      title: isSuspending ? "Suspendre ce Point Relais" : "Réactiver ce Point Relais",
      description: isSuspending
        ? `En suspendant "${relay.name}", les clients ne pourront plus le sélectionner lors de leurs achats.`
        : `Ce point relais redeviendra immédiatement sélectionnable par les acheteurs.`,
      confirmLabel: isSuspending ? "Confirmer la Suspension" : "Réactiver le Relais",
      type: isSuspending ? "danger" : "primary",
      details: [
        { label: "Point Relais", value: relay.name },
        { label: "Commune", value: relay.commune, color: relay.color_code },
        { label: "Colis en cours", value: `${relay.current_packages_count} en étagère` }
      ],
      onConfirm: async () => {
        await supabase.from("pickup_points").update({ status: nextStatus }).eq("id", relay.id);
        fetchRelays();
        if (immersiveRelay && immersiveRelay.id === relay.id) {
          setImmersiveRelay({ ...immersiveRelay, status: nextStatus });
        }
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  const handleAddCommune = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const code = newCommune.code.toUpperCase() || newCommune.name.substring(0, 3).toUpperCase();
      const { error } = await supabase.from("communes").insert({
        name: newCommune.name,
        code,
        color_hex: newCommune.color_hex,
        badge_bg: `${newCommune.color_hex}1f`,
        badge_text: newCommune.color_hex,
        zone: newCommune.zone,
        city: "Abidjan"
      });

      if (error) throw error;
      setShowCommunesModal(false);
      fetchCommunes();
    } catch (err: any) {
      alert("Erreur lors de l'ajout de la commune : " + err.message);
    }
  };

  const filteredPoints = points.filter((p) => {
    const matchSearch =
      p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.commune.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.manager_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.code && p.code.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchCommune = selectedCommune === "all" || p.commune.toLowerCase() === selectedCommune.toLowerCase();
    const matchStatus = selectedStatus === "all" || p.status === selectedStatus;
    return matchSearch && matchCommune && matchStatus;
  });

  const getSaturationBadge = (relay: PickupPoint) => {
    const total = relay.max_capacity || 50;
    const current = relay.current_packages_count || 0;
    const rate = Math.round((current / total) * 100);

    if (rate >= 90) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-red-50 text-red-700 border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse"></span>
          Saturé ({rate}%)
        </span>
      );
    }
    if (rate >= 70) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-50 text-amber-700 border border-amber-200">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
          Occupé ({rate}%)
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        Fluide ({rate}%)
      </span>
    );
  };

  const totalCap = points.reduce((acc, p) => acc + (p.max_capacity || 0), 0);
  const totalStock = points.reduce((acc, p) => acc + (p.current_packages_count || 0), 0);
  const activeCount = points.filter((p) => p.status === "active").length;
  const totalGlobalCommissions = points.reduce((acc, p) => acc + (p.total_commissions_earned || 0), 0);

  // Approximate relative percentages on stylized map of Abidjan
  const getMapPosition = (communeName: string) => {
    const norm = communeName.toLowerCase();
    if (norm.includes("yop")) return { top: "45%", left: "18%" };
    if (norm.includes("adj")) return { top: "35%", left: "42%" };
    if (norm.includes("coc")) return { top: "40%", left: "68%" };
    if (norm.includes("pla")) return { top: "52%", left: "48%" };
    if (norm.includes("tre")) return { top: "62%", left: "48%" };
    if (norm.includes("mar")) return { top: "68%", left: "62%" };
    if (norm.includes("kou")) return { top: "72%", left: "75%" };
    if (norm.includes("port") || norm.includes("pb")) return { top: "82%", left: "80%" };
    if (norm.includes("abo")) return { top: "20%", left: "48%" };
    if (norm.includes("att")) return { top: "42%", left: "36%" };
    if (norm.includes("bin")) return { top: "38%", left: "88%" };
    if (norm.includes("son")) return { top: "55%", left: "8%" };
    if (norm.includes("any")) return { top: "12%", left: "44%" };
    return { top: "50%", left: "50%" };
  };

  return (
    <main className="min-h-screen bg-slate-900/5 p-3 sm:p-5 lg:p-7 font-sans space-y-5">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 sm:p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
            <MapPin size={24} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-lg bg-indigo-50 text-indigo-700 text-[10px] font-black uppercase tracking-wider">
                Logistique & Réseau Relais
              </span>
              <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-[10px] font-extrabold flex items-center gap-1">
                <Sparkles size={10} /> Communes & Carte Interactive
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-gray-900 tracking-tight mt-1">
              Supervision & Carte des Points Relais
            </h1>
            <p className="text-xs text-gray-500 font-medium mt-0.5">
              Visualisation géographique, suivi des capacités et cockpit en immersion directe.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Tab switcher: Map vs Grid */}
          <div className="bg-gray-100 p-1 rounded-2xl flex items-center gap-1">
            <button
              onClick={() => setActiveTab("map")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "map" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Map size={14} /> <span>Carte & Explorer</span>
            </button>
            <button
              onClick={() => setActiveTab("grid")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === "grid" ? "bg-white text-gray-900 shadow-xs" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <LayoutGrid size={14} /> <span>Grille Complète ({points.length})</span>
            </button>
          </div>

          {canManage && (
            <>
              <button
                onClick={() => setShowCommunesModal(true)}
                className="px-3.5 py-2.5 rounded-2xl bg-white border border-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-50 transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                title="Gérer les communes et leurs codes couleurs"
              >
                <Palette size={14} className="text-indigo-600" />
                <span className="hidden sm:inline">Communes</span>
              </button>

              <button
                onClick={() => {
                  handleCommuneSelection("Adjamé");
                  setShowAddModal(true);
                }}
                className="px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={15} />
                <span>Nouveau Relais</span>
              </button>
            </>
          )}

          <button
            onClick={fetchRelays}
            className="p-2.5 rounded-2xl bg-white border border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50 transition-all shadow-2xs cursor-pointer"
            title="Rafraîchir les données"
          >
            <RefreshCw size={15} className={loading ? "animate-spin text-indigo-600" : ""} />
          </button>
        </div>
      </div>

      {/* IMMERSIVE COCKPIT MODE */}
      {immersiveRelay ? (
        <div className="space-y-5 animate-in fade-in zoom-in-95 duration-200">
          <div className="bg-slate-950 text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6 relative overflow-hidden">
            <div className="space-y-2 relative z-10">
              <button
                onClick={handleExitRelay}
                className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold transition-colors inline-flex items-center gap-2 cursor-pointer"
              >
                <ArrowRight className="rotate-180" size={14} /> Quitter le Point Relais
              </button>
              <div className="flex items-center gap-2 mt-2">
                <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 text-[10px] font-black uppercase tracking-wider">
                  Vue Cockpit en Direct
                </span>
                <span className="text-xs text-slate-400 font-mono">Code: {immersiveRelay.code}</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black text-white">{immersiveRelay.name}</h2>
              <div className="flex items-center gap-2 text-xs text-slate-300">
                <span
                  className="w-2.5 h-2.5 rounded-full"
                  style={{ backgroundColor: immersiveRelay.color_code || "#6366F1" }}
                />
                <span className="font-bold">{immersiveRelay.commune} ({immersiveRelay.zone_label})</span>
                <span>•</span>
                <span className="text-slate-400">{immersiveRelay.address}</span>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 relative z-10">
              {canManage && (
                <>
                  <button
                    onClick={() => promptToggleStatus(immersiveRelay)}
                    className={`px-4 py-2.5 rounded-2xl text-xs font-extrabold flex items-center gap-2 transition-all cursor-pointer ${
                      immersiveRelay.status === "active"
                        ? "bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                        : "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                    }`}
                  >
                    {immersiveRelay.status === "active" ? <Lock size={14} /> : <Unlock size={14} />}
                    <span>{immersiveRelay.status === "active" ? "Verrouiller ce Relais" : "Déverrouiller"}</span>
                  </button>

                  <button
                    onClick={() => promptDeleteRelay(immersiveRelay)}
                    className="px-4 py-2.5 rounded-2xl text-xs font-extrabold bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/30 flex items-center gap-2 transition-all cursor-pointer"
                  >
                    <Trash2 size={14} />
                    <span>Supprimer</span>
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Quick Metrics in Cockpit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-2">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Capacité & Occupation</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">
                  {immersiveRelay.current_packages_count || 0} / {immersiveRelay.max_capacity}
                </span>
                <span className="text-xs font-black text-indigo-600">
                  {Math.round(((immersiveRelay.current_packages_count || 0) / (immersiveRelay.max_capacity || 100)) * 100)}%
                </span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-600 transition-all"
                  style={{ width: `${Math.min(100, Math.round(((immersiveRelay.current_packages_count || 0) / (immersiveRelay.max_capacity || 100)) * 100))}%` }}
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
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Code PIN de Connexion</span>
                {canManage && (
                  <button
                    onClick={() => promptRegeneratePin(immersiveRelay)}
                    className="text-[10px] font-black text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 transition-colors"
                    title="Générer un nouveau code PIN aléatoire"
                  >
                    <RefreshCw size={10} /> Régénérer
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="font-mono font-black text-sm bg-indigo-50/70 border border-indigo-100 px-3 py-1 rounded-xl text-indigo-950 tracking-widest">
                  {immersiveRelay.pin_code || "------"}
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
            <div className="lg:col-span-2 bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                    📦 Casier Virtuel des Colis en Stock ({relayInventory.length})
                  </h3>
                  <p className="text-xs text-gray-500 font-medium">Colis actuellement stockés dans ce point relais en attente de retrait client</p>
                </div>
              </div>

              <div className="p-6">
                {relayInventory.length === 0 ? (
                  <div className="text-center py-12 space-y-3">
                    <Boxes className="w-12 h-12 text-gray-300 mx-auto stroke-1" />
                    <p className="text-xs font-bold text-gray-500">Aucun colis en stock dans ce point relais</p>
                    <p className="text-[11px] text-gray-400">Le casier virtuel se remplira automatiquement dès qu'un livreur effectuera un dépôt.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {relayInventory.map((item) => (
                      <div key={item.id} className="p-4 rounded-2xl border border-gray-100 bg-gray-50/50 space-y-2 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between">
                          <span className="font-mono font-black text-xs text-indigo-600">#{item.order_code}</span>
                          <span className="font-mono font-bold text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg border border-indigo-100">
                            OTP: {item.otp_code}
                          </span>
                        </div>
                        <div>
                          <p className="font-bold text-xs text-gray-900">{item.customer_name}</p>
                          <p className="text-[11px] text-gray-500">{item.customer_phone}</p>
                        </div>
                        <div className="text-[10px] text-gray-400 pt-1 border-t border-gray-100 flex items-center justify-between">
                          <span>Boutique: {item.seller_name}</span>
                          <span>{new Date(item.deposited_at).toLocaleDateString("fr-FR")}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Live Scan Journal */}
            <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
              <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                <h3 className="font-black text-base text-gray-900 flex items-center gap-2">
                  <Clock size={16} className="text-indigo-600" /> Journal Live des Scans
                </h3>
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              </div>
              <div className="p-6 divide-y divide-gray-100 max-h-96 overflow-y-auto">
                {relayLogs.length === 0 ? (
                  <p className="text-center py-10 text-xs text-gray-400 font-medium">Aucun scan enregistré pour ce point relais.</p>
                ) : (
                  relayLogs.map((log) => (
                    <div key={log.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black ${
                          log.action_type === "pickup" ? "bg-emerald-50 text-emerald-700" : "bg-blue-50 text-blue-700"
                        }`}>
                          {log.action_type === "pickup" ? "✨ RETRAIT CLIENT (OTP)" : "📥 DÉPÔT LIVREUR"}
                        </span>
                        <p className="text-xs font-bold text-gray-900">Colis: {log.order_code}</p>
                        <p className="text-[10px] text-gray-500">Bénéficiaire : {log.customer_name}</p>
                      </div>
                      <span className="text-[10px] font-mono text-gray-400">
                        {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* STANDARD OVERVIEW */
        <div className="space-y-5">
          {/* Top KPI Strip */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Réseau Points Relais</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-gray-900">{points.length} Relais</span>
                <span className="text-xs font-black text-emerald-600">{activeCount} Actifs</span>
              </div>
              <p className="text-[10px] text-gray-400">Répartis sur {communesList.length} communes d'Abidjan</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Stock Global en Étagères</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-indigo-600">{totalStock} Colis</span>
                <span className="text-xs font-bold text-gray-500">Cap. {totalCap}</span>
              </div>
              <p className="text-[10px] text-gray-400">Colis stockés en attente de remise client</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Commissions Partenaires</span>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-emerald-600">{totalGlobalCommissions.toLocaleString()} FCFA</span>
              </div>
              <p className="text-[10px] text-gray-400">Rémunération 300 FCFA / retrait validé</p>
            </div>

            <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
              <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Couverture Territoriale</span>
              <div className="flex items-center gap-1.5 mt-1">
                {communesList.slice(0, 7).map((c) => (
                  <span
                    key={c.id}
                    title={c.name}
                    className="w-4 h-4 rounded-full border border-white shadow-xs"
                    style={{ backgroundColor: c.color_hex }}
                  />
                ))}
                {communesList.length > 7 && (
                  <span className="text-[10px] font-bold text-gray-400">+{communesList.length - 7}</span>
                )}
              </div>
              <p className="text-[10px] text-gray-400 mt-1">Repères visuels par commune</p>
            </div>
          </div>

          {/* Commune Filter Color Pills */}
          <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-black text-gray-700 flex items-center gap-1.5">
                <Palette size={14} className="text-indigo-600" /> Filtrer par Commune & Couleur
              </span>
              <span className="text-[11px] text-gray-400 font-bold">{filteredPoints.length} point(s) relais affiché(s)</span>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
              <button
                onClick={() => setSelectedCommune("all")}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer ${
                  selectedCommune === "all"
                    ? "bg-slate-900 text-white shadow-xs"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                Toutes ({points.length})
              </button>

              {communesList.map((c) => {
                const count = points.filter(p => p.commune.toLowerCase() === c.name.toLowerCase()).length;
                const isSelected = selectedCommune.toLowerCase() === c.name.toLowerCase();
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCommune(c.name)}
                    style={{
                      backgroundColor: isSelected ? c.color_hex : c.badge_bg,
                      color: isSelected ? "#FFFFFF" : c.badge_text,
                      borderColor: c.color_hex
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer border ${
                      isSelected ? "shadow-md scale-105" : "hover:opacity-80"
                    }`}
                  >
                    <span 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: isSelected ? "#FFFFFF" : c.color_hex }}
                    />
                    <span>{c.name}</span>
                    <span className="px-1.5 py-0.2 rounded-md text-[10px] font-mono opacity-90" style={{ backgroundColor: isSelected ? "rgba(0,0,0,0.2)" : "rgba(255,255,255,0.6)" }}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* TAB 1: INTERACTIVE MAP & EXPLORER */}
          {activeTab === "map" && (
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left 7 Cols: Stylized Interactive Map of Abidjan */}
              <div className="lg:col-span-7 bg-slate-950 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between min-h-115 relative overflow-hidden border border-slate-800">
                {/* Map Header */}
                <div className="relative z-10 flex items-center justify-between pb-3 border-b border-slate-800/80">
                  <div className="flex items-center gap-2.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h3 className="font-black text-sm text-white">Carte Interactive d'Abidjan & Relais</h3>
                      <p className="text-[11px] text-slate-400">Positionnement en direct des points relais et statut de saturation</p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-slate-800 text-[10px] font-mono font-bold text-slate-300 border border-slate-700">
                    Grand Abidjan Hub
                  </span>
                </div>

                {/* Stylized Vector Grid of Abidjan Lagoon & Zones */}
                <div className="relative w-full h-85 my-3 rounded-2xl bg-radial from-slate-900 to-slate-950 border border-slate-800/60 overflow-hidden flex items-center justify-center">
                  {/* Subtle Grid Lines */}
                  <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b15_1px,transparent_1px),linear-gradient(to_bottom,#1e293b15_1px,transparent_1px)] bg-size-[24px_24px]" />
                  
                  {/* Stylized Lagoon Shape (Ébrié Lagoon) */}
                  <svg className="absolute inset-0 w-full h-full opacity-20 pointer-events-none" viewBox="0 0 800 400" preserveAspectRatio="none">
                    <path
                      d="M 50 200 Q 200 180 350 220 T 650 200 T 780 240 L 780 280 Q 600 260 400 300 T 50 260 Z"
                      fill="#38bdf8"
                    />
                    <path
                      d="M 300 220 Q 400 240 500 210 T 600 250 L 580 340 Q 450 320 320 330 Z"
                      fill="#38bdf8"
                    />
                  </svg>

                  {/* Commune Area Badges on Map */}
                  <span className="absolute top-[10%] left-[45%] text-[9px] font-black text-slate-600 uppercase tracking-widest pointer-events-none">Zone Nord (Abobo / Anyama)</span>
                  <span className="absolute top-[42%] left-[12%] text-[9px] font-black text-slate-600 uppercase tracking-widest pointer-events-none">Ouest (Yopougon)</span>
                  <span className="absolute top-[38%] left-[75%] text-[9px] font-black text-slate-600 uppercase tracking-widest pointer-events-none">Est (Cocody / Bingerville)</span>
                  <span className="absolute top-[68%] left-[48%] text-[9px] font-black text-slate-600 uppercase tracking-widest pointer-events-none">Sud (Marcory / Treich / Koumassi)</span>

                  {/* Relay Marker Pins on Map */}
                  {filteredPoints.map((p) => {
                    const pos = getMapPosition(p.commune);
                    const isSelected = selectedRelay?.id === p.id;
                    const color = p.color_code || "#6366F1";

                    return (
                      <div
                        key={p.id}
                        onClick={() => setSelectedRelay(p)}
                        style={{ top: pos.top, left: pos.left }}
                        className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-20"
                      >
                        {/* Pulse Ring */}
                        <div
                          className="absolute -inset-2 rounded-full opacity-40 animate-ping pointer-events-none"
                          style={{ backgroundColor: color }}
                        />

                        {/* Pin Dot */}
                        <div
                          style={{ backgroundColor: color }}
                          className={`w-7 h-7 rounded-2xl shadow-lg flex items-center justify-center text-white font-black text-[11px] transition-transform duration-200 border-2 ${
                            isSelected ? "scale-125 border-white ring-4 ring-white/30" : "border-slate-900 group-hover:scale-110"
                          }`}
                        >
                          <Building2 size={13} />
                        </div>

                        {/* Hover / Selected Label Tooltip */}
                        <div className={`absolute top-full mt-1.5 left-1/2 -translate-x-1/2 whitespace-nowrap bg-slate-900/95 border border-slate-700 px-2.5 py-1 rounded-xl shadow-xl transition-all pointer-events-none ${
                          isSelected ? "opacity-100 scale-100" : "opacity-0 group-hover:opacity-100 scale-95"
                        }`}>
                          <p className="text-[10px] font-black text-white">{p.name}</p>
                          <p className="text-[9px] font-bold text-slate-400">{p.commune} • {p.current_packages_count}/{p.max_capacity} colis</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Map Footer / Quick Legend */}
                <div className="relative z-10 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-bold">Relais Détectés :</span>
                    <span className="font-mono font-black text-indigo-400">{filteredPoints.length} actifs</span>
                  </div>

                  <div className="flex items-center gap-3 text-[11px] text-slate-400">
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-emerald-500" /> Fluide (&lt; 70%)
                    </span>
                    <span className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-500" /> Occupé (70-90%)
                    </span>
                  </div>
                </div>
              </div>

              {/* Right 5 Cols: Relay Selection Details & Action Panel */}
              <div className="lg:col-span-5 space-y-4">
                {selectedRelay ? (
                  <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-xs space-y-5">
                    <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                      <span 
                        style={{ backgroundColor: selectedRelay.badge_bg || "rgba(99,102,241,0.12)", color: selectedRelay.badge_text || "#4338CA" }}
                        className="px-3 py-1 rounded-xl text-xs font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: selectedRelay.color_code || "#6366F1" }} />
                        {selectedRelay.commune} ({selectedRelay.zone_label || "Abidjan"})
                      </span>
                      <span className="font-mono text-xs text-gray-400 font-bold">{selectedRelay.code}</span>
                    </div>

                    <div>
                      <h3 className="font-black text-lg text-gray-900">{selectedRelay.name}</h3>
                      <p className="text-xs text-gray-500 mt-1 flex items-start gap-1">
                        <MapPin size={13} className="text-indigo-600 shrink-0 mt-0.5" />
                        <span>{selectedRelay.address}, {selectedRelay.city}</span>
                      </p>
                    </div>

                    <div className="bg-gray-50 rounded-2xl p-4 space-y-2.5 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Gérant Responsable :</span>
                        <span className="font-extrabold text-gray-900">{selectedRelay.manager_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Téléphone :</span>
                        <span className="font-mono font-bold text-gray-900">{selectedRelay.phone}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Stock en Casier :</span>
                        <span className="font-black text-indigo-700">{selectedRelay.current_packages_count} / {selectedRelay.max_capacity} colis</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Code PIN Secret :</span>
                        <span className="font-mono font-black text-indigo-900 bg-white px-2 py-0.5 rounded-md border border-gray-200">
                          {selectedRelay.pin_code || "------"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 font-bold">Commissions Totales :</span>
                        <span className="font-extrabold text-emerald-600">
                          {(selectedRelay.total_commissions_earned || 0).toLocaleString()} FCFA
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2 pt-1">
                      <button
                        onClick={() => handleEnterRelay(selectedRelay)}
                        className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <DoorOpen size={16} /> Entrer dans le Point Relais
                      </button>

                      {canManage && (
                        <>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => promptRegeneratePin(selectedRelay)}
                              className="py-2.5 rounded-xl bg-gray-50 border border-gray-200 hover:bg-gray-100 text-gray-700 font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                            >
                              <RefreshCw size={12} /> PIN Secret
                            </button>
                            <button
                              onClick={() => promptToggleStatus(selectedRelay)}
                              className={`py-2.5 rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
                                selectedRelay.status === "active"
                                  ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                                  : "bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                              }`}
                            >
                              {selectedRelay.status === "active" ? <Lock size={12} /> : <Unlock size={12} />}
                              <span>{selectedRelay.status === "active" ? "Suspendre" : "Activer"}</span>
                            </button>
                          </div>

                          <button
                            onClick={() => promptDeleteRelay(selectedRelay)}
                            className="w-full py-2.5 rounded-xl bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 text-xs font-extrabold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                          >
                            <Trash2 size={13} />
                            <span>Supprimer ce Point Relais</span>
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-8 text-center border border-gray-100 shadow-xs space-y-2">
                    <Info className="w-8 h-8 text-gray-300 mx-auto stroke-1" />
                    <p className="text-xs font-bold text-gray-500">Sélectionnez un point relais sur la carte</p>
                    <p className="text-[11px] text-gray-400">Cliquez sur un marqueur pour afficher sa fiche d'action détaillée.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: FULL GRID EXPLORER */}
          {activeTab === "grid" && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className="relative flex-1">
                  <Search className="absolute left-3.5 top-3 text-gray-400" size={16} />
                  <input
                    type="text"
                    placeholder="Rechercher par nom, gérant, code relais..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 shadow-2xs"
                  />
                </div>

                <select
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="px-3.5 py-2.5 rounded-2xl bg-white border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer shadow-2xs"
                >
                  <option value="all">Tous Statuts</option>
                  <option value="active">Actifs</option>
                  <option value="suspended">Suspendus</option>
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredPoints.length === 0 ? (
                  <div className="col-span-3 bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-3">
                    <Building2 className="w-12 h-12 text-gray-300 mx-auto stroke-1" />
                    <p className="text-sm font-bold text-gray-700">Aucun point relais trouvé</p>
                    <p className="text-xs text-gray-400">Modifiez vos filtres ou ajoutez un nouveau point relais.</p>
                  </div>
                ) : (
                  filteredPoints.map((p) => {
                    const matchedCommune = communesList.find(c => c.name.toLowerCase() === p.commune.toLowerCase());
                    const color = p.color_code || matchedCommune?.color_hex || "#6366F1";
                    const badgeBg = p.badge_bg || matchedCommune?.badge_bg || "rgba(99, 102, 241, 0.12)";
                    const badgeText = p.badge_text || matchedCommune?.badge_text || "#4338CA";

                    return (
                      <div
                        key={p.id}
                        style={{ borderLeftColor: color }}
                        className="bg-white rounded-3xl p-5 border border-l-4 transition-all shadow-xs hover:shadow-md space-y-3 relative flex flex-col justify-between"
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <span 
                              style={{ backgroundColor: badgeBg, color: badgeText }}
                              className="px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5"
                            >
                              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                              {p.commune} ({p.zone_label || "Abidjan"})
                            </span>
                            {getSaturationBadge(p)}
                          </div>

                          <div>
                            <h3 className="font-extrabold text-sm text-gray-900">{p.name}</h3>
                            <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                              <MapPin size={11} className="text-gray-400 shrink-0" /> {p.address}
                            </p>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Gérant</span>
                            <span className="font-extrabold text-gray-800 text-[11px]">{p.manager_name}</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block font-bold">Stock & Capacité</span>
                            <span className="font-black text-indigo-600 text-[11px]">
                              {p.current_packages_count || 0} / {p.max_capacity} colis
                            </span>
                          </div>
                        </div>

                        <div className="pt-2 border-t border-gray-100 flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5">
                            <KeyRound size={13} className="text-amber-500" />
                            <span className="font-mono font-black text-xs text-gray-800 bg-gray-50 px-2 py-0.5 rounded-md border border-gray-100">
                              {p.pin_code || "------"}
                            </span>
                          </div>

                          <div className="flex items-center gap-1.5">
                            {canManage && (
                              <button
                                onClick={() => promptDeleteRelay(p)}
                                className="p-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 transition-colors cursor-pointer"
                                title="Supprimer ce Relais"
                              >
                                <Trash2 size={13} />
                              </button>
                            )}
                            <button
                              onClick={() => handleEnterRelay(p)}
                              className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <DoorOpen size={14} />
                              <span>Cockpit</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* MODAL: Add New Relay */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-gray-900">Créer un Point Relais</h3>
                <p className="text-xs text-gray-500 font-medium">Attribuez une commune, une couleur et un code d'accès aléatoire.</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={promptCreateRelay} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Commune d'Implantation</label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-1.5 max-h-36 overflow-y-auto p-1 bg-gray-50 rounded-2xl border border-gray-200">
                  {communesList.map((c) => {
                    const isSelected = newRelay.commune.toLowerCase() === c.name.toLowerCase();
                    return (
                      <button
                        type="button"
                        key={c.id}
                        onClick={() => handleCommuneSelection(c.name)}
                        style={{
                          backgroundColor: isSelected ? c.color_hex : "#FFFFFF",
                          color: isSelected ? "#FFFFFF" : "#1F2937",
                          borderColor: isSelected ? c.color_hex : "#E5E7EB"
                        }}
                        className={`p-2 rounded-xl text-[11px] font-black border transition-all text-center flex flex-col items-center gap-1 cursor-pointer shadow-2xs ${
                          isSelected ? "scale-105 shadow-xs" : "hover:border-gray-300"
                        }`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: isSelected ? "#FFFFFF" : c.color_hex }} />
                        <span className="truncate w-full">{c.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nom de l'Établissement / Commerce</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Pharmacie de la Paix - Adjamé"
                  value={newRelay.name}
                  onChange={(e) => setNewRelay({ ...newRelay, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Nom du Gérant Responsable</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: M. Hassan"
                    value={newRelay.manager_name}
                    onChange={(e) => setNewRelay({ ...newRelay, manager_name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Téléphone de Contact</label>
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
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Adresse Précise & Repère Géographique</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Rond point de la liberté, 220 logements"
                  value={newRelay.address}
                  onChange={(e) => setNewRelay({ ...newRelay, address: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
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
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Code Identifiant</label>
                  <input
                    type="text"
                    required
                    value={newRelay.code}
                    onChange={(e) => setNewRelay({ ...newRelay, code: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold text-indigo-700"
                  />
                </div>
              </div>

              {/* PIN Code Box */}
              <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-[11px] font-black text-slate-800 flex items-center gap-1.5">
                    <KeyRound size={14} className="text-amber-500" /> Code PIN Aléatoire de Connexion
                  </label>
                  <button
                    type="button"
                    onClick={() => setNewRelay({ ...newRelay, pin_code: generateRandomPin() })}
                    className="text-[10px] font-extrabold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 cursor-pointer bg-white px-2 py-1 rounded-lg border border-slate-200 shadow-2xs"
                  >
                    <RefreshCw size={10} /> Régénérer
                  </button>
                </div>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={newRelay.pin_code}
                  onChange={(e) => setNewRelay({ ...newRelay, pin_code: e.target.value.replace(/\D/g, '').slice(0, 6) })}
                  className="w-full font-mono text-center font-black tracking-widest text-base px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-slate-900"
                />
                <p className="text-[10px] text-slate-400">Ce code secret unique à 6 chiffres permettra au gérant d'accéder au portail relais.</p>
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
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <span>Continuer vers Confirmation</span>
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Commune & Color Manager */}
      {showCommunesModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-gray-900">Gestion des Communes & Couleurs</h3>
                <p className="text-xs text-gray-500 font-medium">Personnalisez le nuancier visuel de chaque commune d'Abidjan.</p>
              </div>
              <button onClick={() => setShowCommunesModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {communesList.map((c) => (
                <div key={c.id} className="p-3 rounded-2xl border border-gray-100 bg-gray-50 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <span className="w-4 h-4 rounded-full shadow-2xs shrink-0" style={{ backgroundColor: c.color_hex }} />
                    <div>
                      <p className="font-extrabold text-xs text-gray-900">{c.name} ({c.code})</p>
                      <p className="text-[10px] text-gray-400">{c.zone} • {c.city}</p>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] font-bold text-gray-600 bg-white px-2 py-1 rounded-lg border border-gray-200">
                    {c.color_hex}
                  </span>
                </div>
              ))}
            </div>

            <form onSubmit={handleAddCommune} className="pt-3 border-t border-gray-100 space-y-3">
              <h4 className="font-extrabold text-xs text-gray-900">Ajouter une Nouvelle Commune / Zone</h4>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  required
                  placeholder="Nom (ex: Grand-Bassam)"
                  value={newCommune.name}
                  onChange={(e) => setNewCommune({ ...newCommune, name: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
                <input
                  type="text"
                  required
                  placeholder="Code (ex: GB)"
                  value={newCommune.code}
                  onChange={(e) => setNewCommune({ ...newCommune, code: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-mono font-bold"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-xl px-3 py-1.5">
                  <input
                    type="color"
                    value={newCommune.color_hex}
                    onChange={(e) => setNewCommune({ ...newCommune, color_hex: e.target.value })}
                    className="w-7 h-7 rounded-lg border-0 cursor-pointer"
                  />
                  <span className="font-mono text-xs font-bold text-gray-700">{newCommune.color_hex}</span>
                </div>

                <input
                  type="text"
                  placeholder="Zone (ex: Littoral Sud)"
                  value={newCommune.zone}
                  onChange={(e) => setNewCommune({ ...newCommune, zone: e.target.value })}
                  className="px-3 py-2 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-xs transition-colors cursor-pointer"
              >
                Enregistrer la Commune
              </button>
            </form>
          </div>
        </div>
      )}

      {/* POPUP DE CONFIRMATION SÉCURISÉE */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100 animate-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmModal.type === "danger" ? "bg-red-50 text-red-600" :
                confirmModal.type === "warning" ? "bg-amber-50 text-amber-600" : "bg-indigo-50 text-indigo-600"
              }`}>
                {confirmModal.type === "danger" ? <ShieldAlert size={22} /> :
                 confirmModal.type === "warning" ? <AlertTriangle size={22} /> : <CheckCircle2 size={22} />}
              </div>
              <div>
                <h3 className="font-black text-base text-gray-900">{confirmModal.title}</h3>
                <p className="text-xs text-gray-500 font-medium">Vérification de sécurité Kalagban</p>
              </div>
            </div>

            <p className="text-xs text-gray-600 font-medium">{confirmModal.description}</p>

            {confirmModal.details && confirmModal.details.length > 0 && (
              <div className="bg-gray-50 rounded-2xl p-3.5 space-y-2 border border-gray-100">
                {confirmModal.details.map((d, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <span className="text-gray-500 font-bold">{d.label} :</span>
                    <span className="font-extrabold text-gray-900 flex items-center gap-1.5">
                      {d.color && <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.color }} />}
                      {d.value}
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="flex-1 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold text-xs text-gray-700 transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`flex-1 py-2.5 rounded-xl font-black text-xs text-white shadow-md transition-colors ${
                  confirmModal.type === "danger" ? "bg-red-600 hover:bg-red-700" :
                  confirmModal.type === "warning" ? "bg-amber-600 hover:bg-amber-700" : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {confirmModal.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
