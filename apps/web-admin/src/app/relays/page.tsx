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
  DollarSign
} from "lucide-react";
import { supabase } from "@/lib/supabase";

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

interface ConfirmationState {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText: string;
  isDanger?: boolean;
  onConfirm: () => Promise<void> | void;
}

export default function AdminRelaysPage() {
  const [points, setPoints] = useState<PickupPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCommune, setSelectedCommune] = useState("all");

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [activePoint, setActivePoint] = useState<PickupPoint | null>(null);
  const [createdCredentials, setCreatedCredentials] = useState<{ code: string; pin: string; name: string; manager: string } | null>(null);

  // Generic Confirmation Popup Modal State
  const [confirmModal, setConfirmModal] = useState<ConfirmationState>({
    isOpen: false,
    title: "",
    message: "",
    confirmText: "Confirmer",
    isDanger: false,
    onConfirm: () => {},
  });

  // Edit Point State
  const [editFormData, setEditFormData] = useState({
    name: "",
    manager_name: "",
    phone: "",
    address: "",
    commune: "",
    max_capacity: 100,
    commission_per_package: 300,
    pin_code: "",
  });

  // New Relay Form State
  const [newRelay, setNewRelay] = useState({
    name: "",
    code: "",
    manager_name: "",
    phone: "",
    address: "",
    city: "Abidjan",
    commune: "Cocody",
    max_capacity: 100,
    commission_per_package: 300,
    latitude: 5.3484,
    longitude: -4.0197,
    pin_code: "123456"
  });

  // Fetch Relay Points from Supabase
  const fetchRelays = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("pickup_points")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setPoints(data);
    } else {
      setPoints([]);
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

  // Open Edit Modal with pre-filled data
  const handleOpenEdit = (point: PickupPoint) => {
    setActivePoint(point);
    setEditFormData({
      name: point.name,
      manager_name: point.manager_name,
      phone: point.phone,
      address: point.address,
      commune: point.commune,
      max_capacity: point.max_capacity,
      commission_per_package: Number(point.commission_per_package) || 300,
      pin_code: point.pin_code || "123456"
    });
    setShowEditModal(true);
  };

  // Trigger Confirmation for Saving Edits
  const triggerSaveEditsConfirm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activePoint) return;

    setConfirmModal({
      isOpen: true,
      title: "Confirmer les modifications du Point Relais ?",
      message: `Vous allez mettre à jour les coordonnées du point relais "${activePoint.name}" (${activePoint.code}).\n\n• Commission unitaire : ${editFormData.commission_per_package} FCFA / colis\n• Capacité max : ${editFormData.max_capacity} colis\n• Gérant : ${editFormData.manager_name}`,
      confirmText: "Enregistrer les modifications",
      isDanger: false,
      onConfirm: async () => {
        const updatedFields = {
          name: editFormData.name,
          manager_name: editFormData.manager_name,
          phone: editFormData.phone,
          address: editFormData.address,
          commune: editFormData.commune,
          max_capacity: Number(editFormData.max_capacity),
          commission_per_package: Number(editFormData.commission_per_package),
        };

        setPoints(prev => prev.map(p => p.id === activePoint.id ? { ...p, ...updatedFields } : p));
        await supabase.from("pickup_points").update(updatedFields).eq("id", activePoint.id);
        
        setShowEditModal(false);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Trigger Confirmation for Suspending/Activating
  const triggerToggleStatusConfirm = (point: PickupPoint) => {
    const isSuspending = point.status === "active";
    const newStatus = isSuspending ? "suspended" : "active";

    setConfirmModal({
      isOpen: true,
      title: isSuspending ? "Suspendre ce Point Relais ?" : "Réactiver ce Point Relais ?",
      message: isSuspending
        ? `Êtes-vous sûr de vouloir bloquer à distance l'accès du point relais "${point.name}" (${point.code}) ? Le gérant ne pourra plus valider de remises ni encaisser de dépôts.`
        : `Voulez-vous réactiver l'accès réseau pour le point relais "${point.name}" (${point.code}) ?`,
      confirmText: isSuspending ? "Bloquer l'accès" : "Réactiver le relais",
      isDanger: isSuspending,
      onConfirm: async () => {
        setPoints(prev => prev.map(p => p.id === point.id ? { ...p, status: newStatus } : p));
        await supabase.from("pickup_points").update({ status: newStatus }).eq("id", point.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Trigger Confirmation for Deleting
  const triggerDeleteConfirm = (point: PickupPoint) => {
    setConfirmModal({
      isOpen: true,
      title: "🚨 SUPPRESSION DÉFINITIVE DU POINT RELAIS",
      message: `ATTENTION : Êtes-vous absolument sûr de vouloir SUPPRIMER définitivement le point relais "${point.name}" (${point.code}) ?\n\nCette action est irréversible et supprimera le partenaire de la carte et du réseau Kalagban.`,
      confirmText: "Supprimer définitivement",
      isDanger: true,
      onConfirm: async () => {
        setPoints(prev => prev.filter(p => p.id !== point.id));
        await supabase.from("pickup_points").delete().eq("id", point.id);
        setConfirmModal(prev => ({ ...prev, isOpen: false }));
      }
    });
  };

  // Handle Create Relay Point
  const handleCreateRelay = async (e: React.FormEvent) => {
    e.preventDefault();
    const autoCode = newRelay.code || `REL-ABJ-00${points.length + 1}`;
    const generatedPin = newRelay.pin_code.trim() || Math.floor(100000 + Math.random() * 900000).toString();

    const payload = { 
      ...newRelay, 
      code: autoCode, 
      pin_code: generatedPin,
      status: "active", 
      current_packages_count: 0, 
      total_commissions_earned: 0 
    };

    const { data, error } = await supabase.from("pickup_points").insert([payload]).select();
    if (!error && data) {
      setPoints([data[0], ...points]);
    } else {
      setPoints([{ ...payload, id: Math.random().toString() } as PickupPoint, ...points]);
    }

    setShowAddModal(false);
    setCreatedCredentials({
      code: autoCode,
      pin: generatedPin,
      name: newRelay.name,
      manager: newRelay.manager_name,
    });

    setNewRelay({
      name: "",
      code: "",
      manager_name: "",
      phone: "",
      address: "",
      city: "Abidjan",
      commune: "Cocody",
      max_capacity: 100,
      commission_per_package: 300,
      latitude: 5.3484,
      longitude: -4.0197,
      pin_code: ""
    });
  };

  // Filtered Points
  const filteredPoints = points.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          p.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          p.commune.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCommune = selectedCommune === "all" || p.commune.toLowerCase() === selectedCommune.toLowerCase();
    return matchesSearch && matchesCommune;
  });

  const totalPackagesInRelays = points.reduce((sum, p) => sum + p.current_packages_count, 0);
  const totalCommissionsPaid = points.reduce((sum, p) => sum + Number(p.total_commissions_earned), 0);
  const activeCount = points.filter(p => p.status === "active").length;
  const communesCount = new Set(points.map(p => p.commune.toLowerCase())).size;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 font-sans">
      {/* Header Title */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-indigo-50 text-indigo-700 font-extrabold text-xs rounded-full border border-indigo-100 uppercase tracking-wider">
              Supervision Réseau Logistics
            </span>
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight mt-2">
            Points Relais & Carte de Contrôle à Distance
          </h1>
          <p className="text-xs text-gray-500 mt-1">
            Ajustez les commissions, gérez les accès PIN, auditez les stocks et modifiez ou suspendez les partenaires.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={fetchRelays}
            disabled={loading}
            className="flex items-center gap-2 p-3 px-4 bg-white border border-gray-200 hover:bg-gray-50 rounded-2xl text-gray-700 text-xs font-extrabold transition-all shadow-xs cursor-pointer disabled:opacity-50"
            title="Actualiser les données en temps réel"
          >
            <RefreshCw size={16} className={loading ? "animate-spin text-indigo-600" : ""} />
            <span>{loading ? "Actualisation..." : "Actualiser"}</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3 px-5 rounded-2xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer"
          >
            <Plus size={18} />
            Créer un Nouveau Point Relais
          </button>
        </div>
      </div>

      {/* KPI Global Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Points Relais Actifs</p>
            <h3 className="text-3xl font-black text-gray-900 mt-2">{activeCount} <span className="text-xs font-semibold text-gray-400">/ {points.length}</span></h3>
          </div>
          <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600">
            <Building2 size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Colis en Étagères</p>
            <h3 className="text-3xl font-black text-indigo-600 mt-2">{totalPackagesInRelays} <span className="text-xs font-normal text-gray-400">colis</span></h3>
          </div>
          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600">
            <Boxes size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Commissions Versées</p>
            <h3 className="text-3xl font-black text-amber-600 mt-2">{totalCommissionsPaid.toLocaleString()} <span className="text-xs font-normal text-gray-400">FCFA</span></h3>
          </div>
          <div className="w-12 h-12 bg-amber-50 rounded-2xl flex items-center justify-center text-amber-600">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Couverture Abidjan</p>
            <h3 className="text-3xl font-black text-gray-900 mt-2">{communesCount} <span className="text-xs font-normal text-gray-400">communes</span></h3>
          </div>
          <div className="w-12 h-12 bg-slate-100 rounded-2xl flex items-center justify-center text-slate-700">
            <MapPin size={24} />
          </div>
        </div>
      </div>

      {/* Map Grid Visual Representation */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-extrabold text-gray-900 text-base">Réseau des Points Relais à Abidjan</h3>
          <span className="text-xs text-gray-500 font-medium">Positionnement en temps réel</span>
        </div>

        {filteredPoints.length === 0 ? (
          <div className="p-8 text-center bg-gray-50 rounded-2xl border border-gray-100 text-xs text-gray-500 font-medium">
            Aucun point relais enregistré. Cliquez sur "Créer un Nouveau Point Relais" pour commencer.
          </div>
        ) : (
          <div className="h-64 bg-slate-950 rounded-2xl border border-slate-800 p-4 relative flex items-center justify-center overflow-hidden">
            <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#3b82f6_1px,transparent_1px)] bg-size-[16px_16px]"></div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full z-10">
              {filteredPoints.map((point) => (
                <div 
                  key={point.id} 
                  className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                    point.status === "active"
                      ? "bg-slate-900/90 border-slate-700 hover:border-amber-400"
                      : "bg-red-950/40 border-red-800/50"
                  }`}
                  onClick={() => {
                    setActivePoint(point);
                    setShowAuditModal(true);
                  }}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-amber-400">{point.code}</span>
                    <span className={`w-2.5 h-2.5 rounded-full ${point.status === "active" ? "bg-emerald-400 animate-pulse" : "bg-red-500"}`}></span>
                  </div>
                  <p className="font-bold text-xs text-white mt-1 line-clamp-1">{point.name}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">{point.commune}</p>
                  <div className="mt-3 flex items-center justify-between text-[11px]">
                    <span className="text-amber-400 font-bold">{point.commission_per_package} FCFA/colis</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Table: Points Relais Supervision */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <h3 className="font-extrabold text-gray-900 text-base">Liste de Contrôle à Distance & Actions Admin</h3>

          <div className="relative w-full md:w-80">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Rechercher par nom, code ou commune..."
              className="w-full bg-gray-50 border border-gray-200 rounded-2xl px-4 py-2.5 pl-10 text-xs text-gray-800 focus:outline-none focus:border-indigo-600 font-medium"
            />
            <Search size={16} className="text-gray-400 absolute left-3.5 top-3" />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-gray-400 uppercase font-black tracking-wider">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">Code & Enseigne</th>
                <th className="px-4 py-3.5">Gérant / Contact</th>
                <th className="px-4 py-3.5">Commune & Adresse</th>
                <th className="px-4 py-3.5">Occupations Colis</th>
                <th className="px-4 py-3.5">Commission Unitaire</th>
                <th className="px-4 py-3.5">Statut Système</th>
                <th className="px-4 py-3.5 rounded-r-xl text-right">Actions de Contrôle</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredPoints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400 font-medium text-xs">
                    Aucun point relais ne correspond à votre recherche.
                  </td>
                </tr>
              ) : (
                filteredPoints.map((point) => (
                  <tr key={point.id} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-4">
                      <span className="font-mono font-black text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded text-[11px]">
                        {point.code}
                      </span>
                      <p className="font-extrabold text-gray-900 text-xs mt-1">{point.name}</p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-bold text-gray-800">{point.manager_name}</p>
                      <p className="text-[11px] font-mono text-gray-500 mt-0.5">{point.phone}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className="font-bold text-gray-900">{point.commune}</span>
                      <p className="text-[11px] text-gray-500 line-clamp-1">{point.address}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-bold text-gray-900">
                        {point.current_packages_count} / {point.max_capacity} colis
                      </div>
                      <div className="w-28 bg-gray-200 rounded-full h-1.5 mt-1 overflow-hidden">
                        <div 
                          className={`h-full ${
                            point.current_packages_count / point.max_capacity > 0.8 ? "bg-red-500" : "bg-indigo-600"
                          }`}
                          style={{ width: `${(point.current_packages_count / point.max_capacity) * 100}%` }}
                        ></div>
                      </div>
                    </td>
                    <td className="px-4 py-4 font-bold text-amber-600">
                      {point.commission_per_package} FCFA
                    </td>
                    <td className="px-4 py-4">
                      {point.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <CheckCircle2 size={12} /> Actif & Audité
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-black bg-red-50 text-red-700 border border-red-200">
                          <Lock size={12} /> Accès Bloqué
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Audit Secret */}
                        <button
                          onClick={() => {
                            setActivePoint(point);
                            setShowAuditModal(true);
                          }}
                          className="p-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-xl transition-colors cursor-pointer"
                          title="Vue Miroir / Audit Secret"
                        >
                          <Eye size={15} />
                        </button>

                        {/* Edit & Commission */}
                        <button
                          onClick={() => handleOpenEdit(point)}
                          className="p-2 bg-amber-50 hover:bg-amber-100 text-amber-700 font-extrabold rounded-xl transition-colors cursor-pointer"
                          title="Modifier la commission et les infos"
                        >
                          <Edit size={15} />
                        </button>

                        {/* Suspend / Lock */}
                        <button
                          onClick={() => triggerToggleStatusConfirm(point)}
                          className={`p-2 rounded-xl transition-colors cursor-pointer ${
                            point.status === "active"
                              ? "bg-amber-100 hover:bg-amber-200 text-amber-800"
                              : "bg-emerald-50 hover:bg-emerald-100 text-emerald-600"
                          }`}
                          title={point.status === "active" ? "Bloquer l'accès" : "Réactiver le point relais"}
                        >
                          {point.status === "active" ? <Lock size={15} /> : <Unlock size={15} />}
                        </button>

                        {/* Delete Point Relais */}
                        <button
                          onClick={() => triggerDeleteConfirm(point)}
                          className="p-2 bg-red-50 hover:bg-red-100 text-red-600 font-extrabold rounded-xl transition-colors cursor-pointer"
                          title="Supprimer définitivement le point relais"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal 1: Audit Secret (Vue Miroir) */}
      {showAuditModal && activePoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl space-y-6 text-white">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Eye size={20} />
                </div>
                <div>
                  <h3 className="font-extrabold text-base text-white">Contrôle Furtif à Distance (Vue Miroir)</h3>
                  <p className="text-xs text-amber-400 font-mono">{activePoint.code} — {activePoint.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setShowAuditModal(false)}
                className="p-2 text-slate-400 hover:text-white rounded-xl bg-slate-800 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <p className="text-[11px] text-slate-400 uppercase font-bold">Gérant Partenaire</p>
                <p className="font-extrabold text-white text-sm mt-1">{activePoint.manager_name}</p>
                <p className="text-xs font-mono text-amber-400 mt-0.5">{activePoint.phone}</p>
              </div>

              <div className="bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
                <p className="text-[11px] text-slate-400 uppercase font-bold">Total Commissions Gagnées</p>
                <p className="font-extrabold text-emerald-400 text-sm mt-1">{Number(activePoint.total_commissions_earned).toLocaleString()} FCFA</p>
                <p className="text-[10px] text-slate-400 mt-0.5">{activePoint.commission_per_package} FCFA / colis remis</p>
              </div>
            </div>

            <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
              <h4 className="font-bold text-xs text-slate-300 uppercase tracking-wider">Inventaire Physique Direct en Étagères (Vue Secrète)</h4>
              <div className="p-4 text-center text-xs text-slate-500 font-medium">
                {activePoint.current_packages_count === 0 ? "Aucun colis en étagère actuellement." : `${activePoint.current_packages_count} colis actuellement stockés.`}
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between border-t border-slate-800">
              <span className="text-xs text-slate-400 flex items-center gap-1.5">
                <ShieldAlert size={14} className="text-emerald-400" />
                Synchronisé avec la base de données
              </span>

              <button
                onClick={() => {
                  setShowAuditModal(false);
                  triggerToggleStatusConfirm(activePoint);
                }}
                className={`py-2.5 px-5 rounded-xl font-bold text-xs flex items-center gap-2 cursor-pointer ${
                  activePoint.status === "active"
                    ? "bg-red-600 hover:bg-red-500 text-white"
                    : "bg-emerald-600 hover:bg-emerald-500 text-white"
                }`}
              >
                {activePoint.status === "active" ? (
                  <>
                    <Lock size={14} /> Geler l'Accès à Distance
                  </>
                ) : (
                  <>
                    <Unlock size={14} /> Débloquer le Point Relais
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Édition & Commission du Point Relais */}
      {showEditModal && activePoint && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-black text-lg text-gray-900">Éditer le Point Relais</h3>
                <p className="text-xs font-mono font-bold text-indigo-600">{activePoint.code} — {activePoint.name}</p>
              </div>
              <button 
                onClick={() => setShowEditModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={triggerSaveEditsConfirm} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nom de l'Enseigne</label>
                  <input
                    type="text"
                    value={editFormData.name}
                    onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nom du Gérant</label>
                  <input
                    type="text"
                    value={editFormData.manager_name}
                    onChange={(e) => setEditFormData({ ...editFormData, manager_name: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Téléphone Gérant</label>
                  <input
                    type="text"
                    value={editFormData.phone}
                    onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Commune</label>
                  <select
                    value={editFormData.commune}
                    onChange={(e) => setEditFormData({ ...editFormData, commune: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                  >
                    <option value="Cocody">Cocody</option>
                    <option value="Yopougon">Yopougon</option>
                    <option value="Marcory">Marcory</option>
                    <option value="Plateau">Plateau</option>
                    <option value="Koumassi">Koumassi</option>
                    <option value="Abobo">Abobo</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Adresse Précise</label>
                  <input
                    type="text"
                    value={editFormData.address}
                    onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Commission (FCFA/Colis)</label>
                  <input
                    type="number"
                    value={editFormData.commission_per_package}
                    onChange={(e) => setEditFormData({ ...editFormData, commission_per_package: Number(e.target.value) })}
                    className="w-full bg-amber-50 border border-amber-200 text-amber-900 rounded-xl px-3 py-2 text-xs font-mono font-black"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Capacité Max Stock</label>
                  <input
                    type="number"
                    value={editFormData.max_capacity}
                    onChange={(e) => setEditFormData({ ...editFormData, max_capacity: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer les Modifications
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 3: Création de Point Relais */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-xl w-full shadow-2xl space-y-6 border border-gray-100">
            <div className="flex items-center justify-between pb-4 border-b border-gray-100">
              <div>
                <h3 className="font-black text-lg text-gray-900">Nouveau Partenaire Point Relais</h3>
                <p className="text-xs text-gray-500">Formulaire d'enregistrement et de géolocalisation</p>
              </div>
              <button 
                onClick={() => setShowAddModal(false)}
                className="p-2 text-gray-400 hover:text-gray-600 rounded-xl bg-gray-100 cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateRelay} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nom Enseigne</label>
                  <input
                    type="text"
                    value={newRelay.name}
                    onChange={(e) => setNewRelay({ ...newRelay, name: e.target.value })}
                    placeholder="Ex: Boutique Phénix"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-bold"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Nom Gérant</label>
                  <input
                    type="text"
                    value={newRelay.manager_name}
                    onChange={(e) => setNewRelay({ ...newRelay, manager_name: e.target.value })}
                    placeholder="Ex: Kouassi Paul"
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Téléphone Gérant</label>
                  <input
                    type="text"
                    value={newRelay.phone}
                    onChange={(e) => setNewRelay({ ...newRelay, phone: e.target.value })}
                    placeholder="+225 07..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Commune</label>
                  <select
                    value={newRelay.commune}
                    onChange={(e) => setNewRelay({ ...newRelay, commune: e.target.value })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                  >
                    <option value="Cocody">Cocody</option>
                    <option value="Yopougon">Yopougon</option>
                    <option value="Marcory">Marcory</option>
                    <option value="Plateau">Plateau</option>
                    <option value="Koumassi">Koumassi</option>
                    <option value="Abobo">Abobo</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Adresse Détaillée</label>
                  <input
                    type="text"
                    value={newRelay.address}
                    onChange={(e) => setNewRelay({ ...newRelay, address: e.target.value })}
                    placeholder="Rue, repère géographique..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Capacité Max Colis</label>
                  <input
                    type="number"
                    value={newRelay.max_capacity}
                    onChange={(e) => setNewRelay({ ...newRelay, max_capacity: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase mb-1">Commission (FCFA/Colis)</label>
                  <input
                    type="number"
                    value={newRelay.commission_per_package}
                    onChange={(e) => setNewRelay({ ...newRelay, commission_per_package: Number(e.target.value) })}
                    className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-xs font-mono font-bold text-amber-600"
                    required
                  />
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2.5 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  Enregistrer & Générer Accès
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reusable Confirmation Popup Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
                confirmModal.isDanger ? "bg-red-50 text-red-600 border border-red-100" : "bg-indigo-50 text-indigo-600 border border-indigo-100"
              }`}>
                {confirmModal.isDanger ? <AlertTriangle size={24} /> : <CheckCircle2 size={24} />}
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base leading-snug">{confirmModal.title}</h3>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed font-medium bg-gray-50 p-4 rounded-2xl border border-gray-100 whitespace-pre-line">
              {confirmModal.message}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmModal(prev => ({ ...prev, isOpen: false }))}
                className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors cursor-pointer"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={confirmModal.onConfirm}
                className={`px-6 py-3 rounded-2xl text-white text-xs font-extrabold shadow-md transition-all cursor-pointer ${
                  confirmModal.isDanger
                    ? "bg-red-600 hover:bg-red-700 shadow-red-600/20"
                    : "bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20"
                }`}
              >
                {confirmModal.confirmText}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Credentials Modal Popup */}
      {createdCredentials && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 animate-fade-in font-sans">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0">
                <KeyRound size={24} />
              </div>
              <div>
                <h3 className="font-black text-gray-900 text-base">Accès Sécurisés Générés !</h3>
                <p className="text-xs text-gray-500 font-medium">{createdCredentials.name} — {createdCredentials.manager}</p>
              </div>
            </div>

            <div className="bg-slate-900 text-white p-5 rounded-2xl space-y-3 font-mono">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs text-slate-400 font-sans">Identifiant Relais :</span>
                <span className="font-bold text-amber-400 text-sm">{createdCredentials.code}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 font-sans">Code PIN Sécurisé :</span>
                <span className="font-bold text-emerald-400 text-lg tracking-widest">{createdCredentials.pin}</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 bg-amber-50 p-3 rounded-xl border border-amber-100 font-medium">
              💡 Transmettez cet identifiant et ce Code PIN confidentiel à 6 chiffres directement au gérant partenaire pour sa première connexion.
            </p>

            <div className="flex items-center justify-end pt-2">
              <button
                type="button"
                onClick={() => setCreatedCredentials(null)}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all cursor-pointer text-center"
              >
                Compris & Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
