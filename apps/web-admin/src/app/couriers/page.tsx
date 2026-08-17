"use client";

import React, { useState, useEffect } from "react";
import { 
  Truck, 
  Plus, 
  Search, 
  Phone, 
  Mail, 
  Star, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ShieldAlert, 
  UserPlus, 
  X, 
  Edit, 
  Trash2, 
  RefreshCw, 
  MapPin,
  Lock,
  Unlock,
  Package,
  Layers
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface Courier {
  id: string;
  full_name: string;
  phone: string;
  email?: string;
  photo_url?: string;
  vehicle_type: "moto" | "voiture" | "camionnette" | "velo" | "a_pied";
  license_plate?: string;
  preferred_zone: string;
  status: "offline" | "available" | "on_delivery" | "suspended" | "pending_verification";
  total_deliveries: number;
  rating: number;
  acceptance_rate: number;
  cancellation_rate: number;
  created_at: string;
}

export default function CouriersPage() {
  const { hasPermission, isSuperAdmin } = useAdminAuth();

  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [showAddModal, setShowAddModal] = useState(false);

  const [newCourier, setNewCourier] = useState({
    full_name: "",
    phone: "",
    email: "",
    vehicle_type: "moto" as const,
    license_plate: "",
    preferred_zone: "Abidjan (Toutes communes)",
  });

  const fetchCouriers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("couriers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setCouriers(data);
      } else {
        setCouriers([]);
      }
    } catch (err) {
      console.error("Error fetching couriers:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCouriers();

    const channel = supabase
      .channel("admin_couriers_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "couriers" }, () => fetchCouriers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateCourier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { error } = await supabase.from("couriers").insert({
        full_name: newCourier.full_name,
        phone: newCourier.phone,
        email: newCourier.email || null,
        vehicle_type: newCourier.vehicle_type,
        license_plate: newCourier.license_plate || null,
        preferred_zone: newCourier.preferred_zone,
        status: "available",
      });

      if (error) throw error;
      setShowAddModal(false);
      fetchCouriers();
    } catch (err: any) {
      alert("Erreur lors de l'enregistrement du livreur : " + err.message);
    }
  };

  const handleToggleStatus = async (courier: Courier) => {
    const nextStatus = courier.status === "suspended" ? "available" : "suspended";
    await supabase.from("couriers").update({ status: nextStatus }).eq("id", courier.id);
    fetchCouriers();
  };

  const filteredCouriers = couriers.filter((c) => {
    const matchSearch =
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      c.preferred_zone.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = selectedStatus === "all" || c.status === selectedStatus;
    return matchSearch && matchStatus;
  });

  const availableCount = couriers.filter((c) => c.status === "available").length;
  const onDeliveryCount = couriers.filter((c) => c.status === "on_delivery").length;

  const renderStatusBadge = (status: Courier["status"]) => {
    switch (status) {
      case "available":
        return <span className="bg-emerald-50 text-emerald-700 font-bold px-2.5 py-1 rounded-xl text-[10px] border border-emerald-200 flex items-center gap-1">🟢 Disponible</span>;
      case "on_delivery":
        return <span className="bg-blue-50 text-blue-700 font-bold px-2.5 py-1 rounded-xl text-[10px] border border-blue-200 flex items-center gap-1 animate-pulse">🚚 En Course</span>;
      case "offline":
        return <span className="bg-gray-100 text-gray-600 font-bold px-2.5 py-1 rounded-xl text-[10px]">⚪ Hors Ligne</span>;
      case "suspended":
        return <span className="bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded-xl text-[10px] border border-red-200">⛔ Suspendu</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 font-bold px-2.5 py-1 rounded-xl text-[10px] border border-amber-200">En Attente</span>;
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center font-black">
            <Truck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestion des Livreurs &amp; Flotte</h1>
            <p className="text-xs text-gray-500 font-medium">
              Supervision des transporteurs partenaires et assignation des tournées Kalagban
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
        >
          <UserPlus size={16} /> Enregistrer un Livreur
        </button>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Flotte Totale</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{couriers.length}</span>
            <span className="text-xs font-bold text-gray-500">livreurs référencés</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Livreurs Disponibles</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{availableCount}</span>
            <span className="text-xs font-bold text-emerald-600">Prêts pour tournée</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Courses en Cours</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{onDeliveryCount}</span>
            <span className="text-xs font-bold text-blue-600">En acheminement</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Note Moyenne Flotte</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-600">4.92 / 5</span>
            <span className="text-xs font-bold text-amber-500">⭐ Excellent</span>
          </div>
        </div>
      </div>

      {/* Couriers List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden p-6 space-y-4">
        {/* Filter Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par nom, téléphone, zone..."
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
              <option value="all">Tous les Statuts</option>
              <option value="available">Disponibles</option>
              <option value="on_delivery">En Course</option>
              <option value="suspended">Suspendus</option>
            </select>
          </div>
        </div>

        {filteredCouriers.length === 0 ? (
          <div className="py-16 text-center space-y-3 bg-gray-50/60 rounded-3xl border border-dashed border-gray-200">
            <Truck className="mx-auto text-gray-300 w-12 h-12" />
            <p className="text-sm font-extrabold text-gray-700">Aucun livreur enregistré pour le moment</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto">
              Enregistrez vos premiers transporteurs partenaires pour leur assigner les tournées de livraison.
            </p>
            <button
              onClick={() => setShowAddModal(true)}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              + Enregistrer un premier livreur
            </button>
          </div>
        ) : (
          /* Couriers Grid Cards */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
            {filteredCouriers.map((courier) => (
              <div key={courier.id} className="p-5 rounded-3xl border border-gray-100 hover:border-indigo-200 hover:shadow-xs transition-all space-y-4 bg-white flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 font-black text-sm flex items-center justify-center border border-orange-100">
                        {courier.full_name.charAt(0)}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-sm text-gray-900">{courier.full_name}</h3>
                        <p className="text-xs text-gray-500 font-mono">{courier.phone}</p>
                      </div>
                    </div>
                    {renderStatusBadge(courier.status)}
                  </div>

                  <div className="bg-gray-50 p-3 rounded-2xl space-y-1 text-xs">
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Véhicule :</span>
                      <span className="font-bold text-gray-800 capitalize">
                        {courier.vehicle_type} ({courier.license_plate || "N/A"})
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Zone d&apos;activité :</span>
                      <span className="font-bold text-indigo-600">{courier.preferred_zone}</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Livraisons réussies :</span>
                      <span className="font-bold text-gray-900">{courier.total_deliveries} colis</span>
                    </div>
                    <div className="flex items-center justify-between text-gray-600">
                      <span>Note satisfaction :</span>
                      <span className="font-bold text-amber-600 flex items-center gap-1">
                        <Star size={12} className="fill-amber-500 text-amber-500" /> {courier.rating} / 5
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-2 border-t border-gray-100">
                  <a
                    href={`tel:${courier.phone}`}
                    className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-800 text-xs font-bold text-center transition-colors"
                  >
                    Appeler
                  </a>
                  <button
                    onClick={() => handleToggleStatus(courier)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors cursor-pointer ${
                      courier.status === "suspended"
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                        : "bg-red-50 text-red-700 hover:bg-red-100"
                    }`}
                  >
                    {courier.status === "suspended" ? "Réactiver" : "Suspendre"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* MODAL: Add Courier */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Enregistrer un Livreur</h3>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateCourier} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Nom &amp; Prénoms</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Mamadou Koné"
                  value={newCourier.full_name}
                  onChange={(e) => setNewCourier({ ...newCourier, full_name: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Téléphone</label>
                  <input
                    type="text"
                    required
                    placeholder="+225 07..."
                    value={newCourier.phone}
                    onChange={(e) => setNewCourier({ ...newCourier, phone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Type de Véhicule</label>
                  <select
                    value={newCourier.vehicle_type}
                    onChange={(e: any) => setNewCourier({ ...newCourier, vehicle_type: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                  >
                    <option value="moto">Moto</option>
                    <option value="voiture">Voiture</option>
                    <option value="camionnette">Camionnette</option>
                    <option value="velo">Vélo</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Immatriculation</label>
                  <input
                    type="text"
                    placeholder="Ex: 1234-JK-01"
                    value={newCourier.license_plate}
                    onChange={(e) => setNewCourier({ ...newCourier, license_plate: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">Zone Préférée</label>
                  <input
                    type="text"
                    placeholder="Ex: Cocody"
                    value={newCourier.preferred_zone}
                    onChange={(e) => setNewCourier({ ...newCourier, preferred_zone: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                  />
                </div>
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
                  Créer la Fiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
