"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { 
  Truck, 
  Search, 
  Phone, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  UserPlus, 
  X, 
  Trash2, 
  MapPin,
  FileText,
  Printer,
  Camera,
  UploadCloud,
  Eye,
  ShieldCheck,
  Building2,
  Check,
  ArrowRight,
  ArrowLeft,
  Loader2,
  ExternalLink,
  Lock
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";
import { printCourierBadge, CourierPdfData } from "@/lib/courier-pdf";

export interface CourierItem {
  id: string;
  full_name: string;
  phone: string;
  secondary_phone?: string | null;
  email?: string | null;
  photo_url?: string | null;
  vehicle_type: "moto" | "voiture" | "camion" | "camionnette" | "tricycle_triporteur" | "velo" | "a_pied" | "autre";
  license_plate?: string | null;
  coverage_type: "all_abidjan" | "specific_communes";
  preferred_communes: string[];
  preferred_zone: string;
  id_card_type: string;
  id_card_number?: string | null;
  id_card_front_url?: string | null;
  id_card_back_url?: string | null;
  is_partner_company: boolean;
  company_name?: string | null;
  company_manager?: string | null;
  company_phone?: string | null;
  registered_by?: string | null;
  status: "available" | "on_delivery" | "offline" | "suspended" | "pending_verification";
  total_deliveries: number;
  rating: number;
  acceptance_rate: number;
  cancellation_rate: number;
  created_at: string;
}

const ABIDJAN_COMMUNES = [
  "Cocody",
  "Yopougon",
  "Plateau",
  "Marcory",
  "Koumassi",
  "Treichville",
  "Port-Bouët",
  "Abobo",
  "Adjamé",
  "Attécoubé",
  "Bingerville",
  "Songon",
  "Anyama"
];

export default function CouriersPage() {
  const { isSuperAdmin, user: adminUser } = useAdminAuth();

  const [couriers, setCouriers] = useState<CourierItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedVehicle, setSelectedVehicle] = useState("all");

  // Add Courier Modal State
  const [showAddModal, setShowAddModal] = useState(false);
  const [formStep, setFormStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  // Step 1: Identity
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [secondaryPhone, setSecondaryPhone] = useState("");
  const [idType, setIdType] = useState("cni");
  const [idNumber, setIdNumber] = useState("");

  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(null);
  const [idFrontIsPdf, setIdFrontIsPdf] = useState(false);

  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(null);
  const [idBackIsPdf, setIdBackIsPdf] = useState(false);

  // Step 2: Vehicle & Zone
  const [vehicleType, setVehicleType] = useState<CourierItem["vehicle_type"]>("moto");
  const [licensePlate, setLicensePlate] = useState("");
  const [coverageType, setCoverageType] = useState<"all_abidjan" | "specific_communes">("all_abidjan");
  const [selectedCommunes, setSelectedCommunes] = useState<string[]>([]);

  // Step 3: Partner Company & Agreement
  const [isPartnerCompany, setIsPartnerCompany] = useState(false);
  const [companyName, setCompanyName] = useState("");
  const [companyManager, setCompanyManager] = useState("");
  const [companyPhone, setCompanyPhone] = useState("");
  const [termsAccepted, setTermsAccepted] = useState(true);

  // Courier Detail & Audit Modal
  const [selectedCourier, setSelectedCourier] = useState<CourierItem | null>(null);
  const [deleteConfirmCourier, setDeleteConfirmCourier] = useState<CourierItem | null>(null);

  const fetchCouriers = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("couriers")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        const formatted: CourierItem[] = data.map((c: any) => ({
          ...c,
          coverage_type: c.coverage_type || "all_abidjan",
          preferred_communes: Array.isArray(c.preferred_communes) ? c.preferred_communes : [],
          preferred_zone: c.preferred_zone || "Abidjan",
          id_card_type: c.id_card_type || "cni",
          is_partner_company: !!c.is_partner_company
        }));
        setCouriers(formatted);
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

    const channelId = `admin_couriers_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "couriers" }, () => fetchCouriers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Upload file helper to Supabase Storage
  const uploadCourierFile = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `couriers/${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;
    const { error } = await supabase.storage.from("kalagban_media").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("kalagban_media").getPublicUrl(path);
    return data.publicUrl;
  };

  const handleValidateFile = (file: File) => {
    if (file.size > 5 * 1024 * 1024) {
      alert(`Le fichier "${file.name}" dépasse la limite maximale de 5 MB.`);
      return false;
    }
    return true;
  };

  // Step 1 File Inputs
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleValidateFile(file)) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleIdFrontChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleValidateFile(file)) {
      setIdFrontFile(file);
      setIdFrontIsPdf(file.type === "application/pdf");
      setIdFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleIdBackChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleValidateFile(file)) {
      setIdBackFile(file);
      setIdBackIsPdf(file.type === "application/pdf");
      setIdBackPreview(URL.createObjectURL(file));
    }
  };

  const toggleCommune = (commune: string) => {
    if (selectedCommunes.includes(commune)) {
      setSelectedCommunes(selectedCommunes.filter(c => c !== commune));
    } else {
      setSelectedCommunes([...selectedCommunes, commune]);
    }
  };

  // Form Step Validation
  const validateStep1 = () => {
    if (!fullName.trim()) { setFormError("Veuillez renseigner le nom et prénoms du livreur."); return false; }
    if (!phone.trim()) { setFormError("Veuillez renseigner le numéro WhatsApp / téléphone principal."); return false; }
    if (!photoPreview) { setFormError("Veuillez ajouter une photo portrait du livreur."); return false; }
    if (!idNumber.trim()) { setFormError("Veuillez renseigner le numéro de la pièce d'identité."); return false; }
    if (!idFrontPreview) { setFormError("Veuillez téléverser la pièce d'identité (Recto)."); return false; }
    if (idType === "cni" && !idBackPreview) { setFormError("Pour une CNI, le Verso est obligatoire."); return false; }
    setFormError("");
    return true;
  };

  const validateStep2 = () => {
    if (coverageType === "specific_communes" && selectedCommunes.length === 0) {
      setFormError("Veuillez sélectionner au moins une commune de couverture.");
      return false;
    }
    setFormError("");
    return true;
  };

  const handleNextStep = () => {
    if (formStep === 1 && validateStep1()) setFormStep(2);
    else if (formStep === 2 && validateStep2()) setFormStep(3);
  };

  // Submit Courier
  const handleSaveCourier = async () => {
    if (!termsAccepted) {
      alert("Veuillez cocher la case d'attestation et de conformité.");
      return;
    }

    setIsSubmitting(true);

    try {
      let finalPhotoUrl = photoPreview || "";
      if (photoFile) finalPhotoUrl = await uploadCourierFile(photoFile, "courier_photo");

      let finalIdFrontUrl = idFrontPreview || "";
      if (idFrontFile) finalIdFrontUrl = await uploadCourierFile(idFrontFile, "id_front");

      let finalIdBackUrl = idBackPreview || null;
      if (idBackFile) finalIdBackUrl = await uploadCourierFile(idBackFile, "id_back");

      const zoneText = coverageType === "all_abidjan" || selectedCommunes.length === 0
        ? "Tout Abidjan"
        : selectedCommunes.join(", ");

      const payload = {
        full_name: fullName.trim(),
        phone: phone.trim(),
        secondary_phone: secondaryPhone.trim() || null,
        photo_url: finalPhotoUrl,
        vehicle_type: vehicleType,
        license_plate: licensePlate.trim() || null,
        coverage_type: coverageType,
        preferred_communes: coverageType === "all_abidjan" ? [] : selectedCommunes,
        preferred_zone: zoneText,
        id_card_type: idType,
        id_card_number: idNumber.trim(),
        id_card_front_url: finalIdFrontUrl,
        id_card_back_url: finalIdBackUrl,
        is_partner_company: isPartnerCompany,
        company_name: isPartnerCompany ? companyName.trim() : null,
        company_manager: isPartnerCompany ? companyManager.trim() : null,
        company_phone: isPartnerCompany ? companyPhone.trim() : null,
        registered_by: adminUser?.full_name || "Agent Kalagban",
        status: "available",
        is_verified: true,
        terms_accepted: true
      };

      const { error } = await supabase.from("couriers").insert(payload);
      if (error) throw error;

      alert(`🎉 Le livreur "${fullName}" a été enregistré avec succès dans la flotte Kalagban !`);
      
      // Reset form
      setShowAddModal(false);
      setFormStep(1);
      setFullName("");
      setPhone("");
      setSecondaryPhone("");
      setIdNumber("");
      setPhotoFile(null);
      setPhotoPreview(null);
      setIdFrontFile(null);
      setIdFrontPreview(null);
      setIdBackFile(null);
      setIdBackPreview(null);
      setLicensePlate("");
      setSelectedCommunes([]);
      setIsPartnerCompany(false);
      setCompanyName("");
      setCompanyManager("");
      setCompanyPhone("");

      fetchCouriers();

    } catch (err: any) {
      console.error("Error creating courier:", err);
      alert("Erreur lors de l'enregistrement : " + err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleStatus = async (courier: CourierItem) => {
    const nextStatus = courier.status === "suspended" ? "available" : "suspended";
    await supabase.from("couriers").update({ status: nextStatus }).eq("id", courier.id);
    fetchCouriers();
    if (selectedCourier && selectedCourier.id === courier.id) {
      setSelectedCourier({ ...selectedCourier, status: nextStatus });
    }
  };

  const handleDeleteCourier = async (courier: CourierItem) => {
    try {
      // 1. Supprimer d'éventuelles assignations liées
      await supabase.from("courier_assignments").delete().eq("courier_id", courier.id);

      // 2. Supprimer la fiche du livreur
      const { error } = await supabase.from("couriers").delete().eq("id", courier.id);
      if (error) throw error;

      alert(`🗑️ Le livreur "${courier.full_name}" a été retiré définitivement de la base.`);
      setDeleteConfirmCourier(null);
      setSelectedCourier(null);
      fetchCouriers();
    } catch (err: any) {
      console.error("Error deleting courier:", err);
      alert("Erreur lors de la suppression : " + (err.message || "Impossible de supprimer ce livreur."));
    }
  };

  const filteredCouriers = couriers.filter((c) => {
    const matchSearch =
      c.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.phone.includes(searchTerm) ||
      (c.license_plate && c.license_plate.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (c.company_name && c.company_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
      c.preferred_zone.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchStatus = selectedStatus === "all" || c.status === selectedStatus;
    const matchVehicle = selectedVehicle === "all" || c.vehicle_type === selectedVehicle;

    return matchSearch && matchStatus && matchVehicle;
  });

  const availableCount = couriers.filter((c) => c.status === "available").length;
  const onDeliveryCount = couriers.filter((c) => c.status === "on_delivery").length;
  const suspendedCount = couriers.filter((c) => c.status === "suspended").length;

  const renderVehicleBadge = (vType: CourierItem["vehicle_type"]) => {
    switch (vType) {
      case "moto": return <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-orange-200">🛵 Moto</span>;
      case "voiture": return <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-blue-200">🚗 Voiture</span>;
      case "camion": return <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-indigo-200">🚛 Camion</span>;
      case "camionnette": return <span className="bg-cyan-50 text-cyan-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-cyan-200">🚐 Camionnette</span>;
      case "tricycle_triporteur": return <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">🛺 Tricycle</span>;
      default: return <span className="bg-gray-100 text-gray-700 font-bold px-2 py-0.5 rounded-md text-[10px]">{vType}</span>;
    }
  };

  const renderStatusBadge = (status: CourierItem["status"]) => {
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
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center font-black shadow-inner">
            <Truck size={26} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestion des Livreurs &amp; Flotte</h1>
            <p className="text-xs text-gray-500 font-medium">
              Enregistrement manuel, audit des pièces, supervision et assignation des transporteurs
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setFormStep(1);
            setShowAddModal(true);
          }}
          className="bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-orange-600/25 transition-all"
        >
          <UserPlus size={16} /> Enregistrer un Livreur
        </button>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Flotte Totale</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-gray-900">{couriers.length}</span>
            <span className="text-xs font-bold text-gray-500">livreurs référencés</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Livreurs Prêts</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-600">{availableCount}</span>
            <span className="text-xs font-bold text-emerald-600">Disponibles</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">En Acheminement</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-blue-600">{onDeliveryCount}</span>
            <span className="text-xs font-bold text-blue-600">En cours de livraison</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs space-y-1">
          <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider">Suspendus</span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-600">{suspendedCount}</span>
            <span className="text-xs font-bold text-rose-600">Comptes bloqués</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex-1 min-w-70 relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, téléphone, immatriculation, commune, société..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-medium focus:ring-2 focus:ring-orange-600/30 outline-none"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">Tous les engins</option>
            <option value="moto">🛵 Moto</option>
            <option value="voiture">🚗 Voiture</option>
            <option value="camion">🚛 Camion</option>
            <option value="camionnette">🚐 Camionnette</option>
            <option value="tricycle_triporteur">🛺 Tricycle</option>
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-2xl text-xs font-bold text-gray-700 outline-none cursor-pointer"
          >
            <option value="all">Tous les statuts</option>
            <option value="available">🟢 Disponibles</option>
            <option value="on_delivery">🚚 En course</option>
            <option value="offline">⚪ Hors ligne</option>
            <option value="suspended">⛔ Suspendus</option>
          </select>
        </div>
      </div>

      {/* Couriers List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
            <Loader2 size={32} className="animate-spin mx-auto mb-2 text-orange-500" />
            <p className="text-xs font-bold">Chargement de la flotte de livreurs...</p>
          </div>
        ) : filteredCouriers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 bg-white rounded-3xl border border-gray-100">
            <Truck size={40} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm font-bold text-gray-700">Aucun livreur trouvé</p>
            <p className="text-xs text-gray-400 mt-1">Modifiez vos filtres ou enregistrez un nouveau livreur.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredCouriers.map((courier) => (
              <div 
                key={courier.id} 
                className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      {courier.photo_url ? (
                        <img 
                          src={courier.photo_url} 
                          alt={courier.full_name} 
                          className="w-12 h-12 rounded-2xl object-cover border border-gray-200" 
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black text-sm">
                          {courier.full_name.charAt(0)}
                        </div>
                      )}
                      <div>
                        <h3 className="font-black text-sm text-gray-900">{courier.full_name}</h3>
                        <p className="text-xs text-emerald-700 font-bold flex items-center gap-1 mt-0.5">
                          <Phone size={12} /> {courier.phone}
                        </p>
                      </div>
                    </div>
                    {renderStatusBadge(courier.status)}
                  </div>

                  <div className="space-y-2 pt-2 border-t border-gray-50 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-medium">Engin :</span>
                      <div className="flex items-center gap-1.5">
                        {renderVehicleBadge(courier.vehicle_type)}
                        {courier.license_plate && (
                          <span className="font-mono text-[10px] font-bold text-gray-700 bg-gray-100 px-1.5 py-0.5 rounded">
                            {courier.license_plate}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-[11px] text-gray-400 font-medium">Couverture :</span>
                      <span className="font-bold text-gray-800 text-[11px] text-right truncate max-w-45">
                        {courier.coverage_type === "all_abidjan" ? "Tout Abidjan" : courier.preferred_zone}
                      </span>
                    </div>

                    {courier.is_partner_company && courier.company_name && (
                      <div className="flex items-center justify-between pt-1 border-t border-dashed border-gray-100">
                        <span className="text-[10px] text-purple-600 font-bold flex items-center gap-1">
                          <Building2 size={11} /> Partenaire :
                        </span>
                        <span className="text-[10px] font-black text-purple-950 truncate max-w-42.5">
                          {courier.company_name}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSelectedCourier(courier)}
                    className="flex-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Eye size={14} /> Fiche &amp; Audit
                  </button>

                  <button
                    onClick={() => printCourierBadge(courier)}
                    className="p-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 transition-colors cursor-pointer"
                    title="Télécharger la fiche / badge PDF"
                  >
                    <Printer size={15} />
                  </button>

                  <button
                    onClick={() => handleToggleStatus(courier)}
                    className={`p-2 rounded-xl transition-colors cursor-pointer ${
                      courier.status === "suspended" 
                        ? "bg-emerald-50 text-emerald-700 hover:bg-emerald-100" 
                        : "bg-amber-50 text-amber-700 hover:bg-amber-100"
                    }`}
                    title={courier.status === "suspended" ? "Réactiver le livreur" : "Suspendre le livreur"}
                  >
                    {courier.status === "suspended" ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  </button>

                  <button
                    onClick={() => setDeleteConfirmCourier(courier)}
                    className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors cursor-pointer"
                    title="Supprimer définitivement le livreur"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================================= */}
      {/* MODAL 1: FORMULAIRE COMPLET D'ENREGISTREMENT LIVREUR EN 3 ÉTAPES */}
      {/* ========================================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black shadow-inner">
                  <UserPlus size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">
                      Flotte &amp; Logistique
                    </span>
                    <span className="text-xs font-bold text-gray-400">Étape {formStep} sur 3</span>
                  </div>
                  <h3 className="text-xl font-black text-gray-900">Enregistrer un Livreur</h3>
                </div>
              </div>

              <button 
                onClick={() => setShowAddModal(false)}
                className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
              >
                <X size={18} />
              </button>
            </div>

            {/* Stepper Header */}
            <div className="grid grid-cols-3 border-b border-gray-100 bg-slate-50/50">
              <div className={`py-3 px-3 text-center border-b-2 font-bold text-xs flex items-center justify-center gap-1.5 ${
                formStep === 1 ? "border-orange-600 text-orange-700 bg-white" : "border-transparent text-gray-400"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  formStep > 1 ? "bg-emerald-500 text-white" : formStep === 1 ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {formStep > 1 ? <Check size={12} /> : "1"}
                </span>
                <span className="hidden sm:inline">Identité &amp; CNI</span>
              </div>

              <div className={`py-3 px-3 text-center border-b-2 font-bold text-xs flex items-center justify-center gap-1.5 ${
                formStep === 2 ? "border-orange-600 text-orange-700 bg-white" : "border-transparent text-gray-400"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  formStep > 2 ? "bg-emerald-500 text-white" : formStep === 2 ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  {formStep > 2 ? <Check size={12} /> : "2"}
                </span>
                <span className="hidden sm:inline">Engin &amp; Zones</span>
              </div>

              <div className={`py-3 px-3 text-center border-b-2 font-bold text-xs flex items-center justify-center gap-1.5 ${
                formStep === 3 ? "border-orange-600 text-orange-700 bg-white" : "border-transparent text-gray-400"
              }`}>
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
                  formStep === 3 ? "bg-orange-600 text-white" : "bg-gray-200 text-gray-600"
                }`}>
                  3
                </span>
                <span className="hidden sm:inline">Société &amp; Accord</span>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 sm:p-8 flex flex-col gap-6">
              
              {formError && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
                  <AlertTriangle size={18} className="text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* STEP 1: IDENTITY & CNI */}
              {formStep === 1 && (
                <div className="space-y-5 animate-in fade-in">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-700">Nom &amp; Prénoms du Livreur *</label>
                      <input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="ex: Mamadou Koné"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-orange-600/40 text-sm font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-700">WhatsApp / Téléphone Principal *</label>
                      <input
                        type="tel"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="ex: 07 77 62 08 64"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-orange-600/40 text-sm font-semibold"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-700">Second Numéro (Optionnel)</label>
                      <input
                        type="tel"
                        value={secondaryPhone}
                        onChange={(e) => setSecondaryPhone(e.target.value)}
                        placeholder="ex: 05 01 02 03 04"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-orange-600/40 text-sm font-semibold"
                      />
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-700">Type de Pièce d&apos;Identité *</label>
                      <select
                        value={idType}
                        onChange={(e) => setIdType(e.target.value)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-orange-600/40 text-sm font-semibold"
                      >
                        <option value="cni">Carte Nationale d&apos;Identité (CNI)</option>
                        <option value="passport">Passeport</option>
                        <option value="attestation">Attestation d&apos;Identité</option>
                        <option value="permis">Permis de Conduire</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-700">Numéro de la Pièce d&apos;Identité *</label>
                    <input
                      type="text"
                      required
                      value={idNumber}
                      onChange={(e) => setIdNumber(e.target.value)}
                      placeholder="ex: CI0098765432"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-orange-600/40 text-sm font-semibold font-mono"
                    />
                  </div>

                  {/* Photo Portrait & CNI Upload */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                    
                    {/* Photo Portrait */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Photo Livreur *</span>
                      <label className="border-2 border-dashed border-gray-200 hover:border-orange-500 bg-gray-50 hover:bg-orange-50/40 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-32 relative overflow-hidden group">
                        <input type="file" accept="image/*" onChange={handlePhotoChange} className="hidden" />
                        {photoPreview ? (
                          <img src={photoPreview} alt="Portrait" className="w-full h-24 object-cover rounded-xl" />
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-orange-600">
                            <Camera size={22} />
                            <span className="text-[10px] font-bold">Photo nette</span>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* CNI Recto */}
                    <div className="flex flex-col gap-1.5">
                      <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Pièce Recto *</span>
                      <label className="border-2 border-dashed border-gray-200 hover:border-orange-500 bg-gray-50 hover:bg-orange-50/40 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-32 relative overflow-hidden group">
                        <input type="file" accept="image/*,application/pdf" onChange={handleIdFrontChange} className="hidden" />
                        {idFrontPreview ? (
                          idFrontIsPdf ? (
                            <div className="flex flex-col items-center gap-1 text-orange-600 font-bold text-xs p-2">
                              <FileText size={28} />
                              <span className="text-[10px]">PDF Recto</span>
                            </div>
                          ) : (
                            <img src={idFrontPreview} alt="Recto" className="w-full h-24 object-cover rounded-xl" />
                          )
                        ) : (
                          <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-orange-600">
                            <UploadCloud size={22} />
                            <span className="text-[10px] font-bold">Image ou PDF</span>
                          </div>
                        )}
                      </label>
                    </div>

                    {/* CNI Verso */}
                    {idType === "cni" && (
                      <div className="flex flex-col gap-1.5">
                        <span className="text-xs font-black text-gray-700 uppercase tracking-wider">CNI Verso *</span>
                        <label className="border-2 border-dashed border-gray-200 hover:border-orange-500 bg-gray-50 hover:bg-orange-50/40 rounded-2xl p-3 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-32 relative overflow-hidden group">
                          <input type="file" accept="image/*,application/pdf" onChange={handleIdBackChange} className="hidden" />
                          {idBackPreview ? (
                            idBackIsPdf ? (
                              <div className="flex flex-col items-center gap-1 text-orange-600 font-bold text-xs p-2">
                                <FileText size={28} />
                                <span className="text-[10px]">PDF Verso</span>
                              </div>
                            ) : (
                              <img src={idBackPreview} alt="Verso" className="w-full h-24 object-cover rounded-xl" />
                            )
                          ) : (
                            <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-orange-600">
                              <UploadCloud size={22} />
                              <span className="text-[10px] font-bold">Verso (Image/PDF)</span>
                            </div>
                          )}
                        </label>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* STEP 2: VEHICLE & COVERAGE ZONE */}
              {formStep === 2 && (
                <div className="space-y-5 animate-in fade-in">
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-700">Type de Véhicule / Engin *</label>
                      <select
                        value={vehicleType}
                        onChange={(e) => setVehicleType(e.target.value as any)}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-orange-600/40 text-sm font-semibold"
                      >
                        <option value="moto">🛵 Moto (Deux-roues)</option>
                        <option value="voiture">🚗 Voiture</option>
                        <option value="camion">🚛 Camion</option>
                        <option value="camionnette">🚐 Camionnette</option>
                        <option value="tricycle_triporteur">🛺 Tricycle / Triporteur</option>
                        <option value="velo">🚲 Vélo</option>
                        <option value="autre">Autre Engin</option>
                      </select>
                    </div>

                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-black uppercase tracking-wider text-gray-700">Immatriculation / Plaque</label>
                      <input
                        type="text"
                        value={licensePlate}
                        onChange={(e) => setLicensePlate(e.target.value)}
                        placeholder="ex: 1234-JK-01"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-orange-600/40 text-sm font-semibold font-mono uppercase"
                      />
                    </div>
                  </div>

                  {/* Coverage Zone Selector */}
                  <div className="space-y-3 pt-2">
                    <label className="text-xs font-black uppercase tracking-wider text-gray-700">Zone de Couverture Préférée *</label>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                        coverageType === "all_abidjan" ? "border-orange-600 bg-orange-50/50 text-orange-950" : "border-gray-200 bg-white"
                      }`}>
                        <input
                          type="radio"
                          name="coverage"
                          checked={coverageType === "all_abidjan"}
                          onChange={() => setCoverageType("all_abidjan")}
                          className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <p className="text-xs font-black">Tout Abidjan (Toutes Communes)</p>
                          <p className="text-[11px] text-gray-500">Disponible sur l&apos;ensemble de la métropole</p>
                        </div>
                      </label>

                      <label className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                        coverageType === "specific_communes" ? "border-orange-600 bg-orange-50/50 text-orange-950" : "border-gray-200 bg-white"
                      }`}>
                        <input
                          type="radio"
                          name="coverage"
                          checked={coverageType === "specific_communes"}
                          onChange={() => setCoverageType("specific_communes")}
                          className="w-4 h-4 text-orange-600 focus:ring-orange-500"
                        />
                        <div>
                          <p className="text-xs font-black">Communes Spécifiques</p>
                          <p className="text-[11px] text-gray-500">Sélectionner une ou plusieurs communes</p>
                        </div>
                      </label>
                    </div>

                    {coverageType === "specific_communes" && (
                      <div className="p-4 bg-slate-50 border border-gray-200 rounded-2xl space-y-2 animate-in fade-in">
                        <span className="text-[11px] font-bold text-gray-600 block">
                          Sélectionnez les communes couvertes par ce livreur :
                        </span>
                        <div className="flex flex-wrap gap-2">
                          {ABIDJAN_COMMUNES.map((commune) => {
                            const isSelected = selectedCommunes.includes(commune);
                            return (
                              <button
                                key={commune}
                                type="button"
                                onClick={() => toggleCommune(commune)}
                                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                                  isSelected 
                                    ? "bg-orange-600 text-white shadow-xs" 
                                    : "bg-white text-gray-700 border border-gray-200 hover:border-orange-300"
                                }`}
                              >
                                {isSelected ? "✓ " : "+ "} {commune}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                  </div>

                </div>
              )}

              {/* STEP 3: PARTNER COMPANY & INTERNAL ATTESTATION */}
              {formStep === 3 && (
                <div className="space-y-5 animate-in fade-in">
                  
                  {/* Partner Company Toggle */}
                  <div className="p-4.5 rounded-2xl border border-purple-200 bg-purple-50/50 space-y-4">
                    <label className="flex items-center gap-3 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isPartnerCompany}
                        onChange={(e) => setIsPartnerCompany(e.target.checked)}
                        className="w-5 h-5 rounded text-purple-600 focus:ring-purple-500 border-purple-300"
                      />
                      <div>
                        <p className="text-xs font-black text-purple-950 flex items-center gap-1.5">
                          <Building2 size={15} /> Le livreur provient d&apos;une entreprise partenaire (Optionnel)
                        </p>
                        <p className="text-[11px] text-purple-800">
                          Cochez si le transporteur est employé ou rattaché à une structure tierce de livraison.
                        </p>
                      </div>
                    </label>

                    {isPartnerCompany && (
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 border-t border-purple-200/60 animate-in fade-in">
                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-purple-900">Nom Entreprise *</label>
                          <input
                            type="text"
                            value={companyName}
                            onChange={(e) => setCompanyName(e.target.value)}
                            placeholder="ex: Flash Delivery Express"
                            className="bg-white border border-purple-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-purple-900">Nom du Gérant</label>
                          <input
                            type="text"
                            value={companyManager}
                            onChange={(e) => setCompanyManager(e.target.value)}
                            placeholder="ex: M. Traoré"
                            className="bg-white border border-purple-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>

                        <div className="flex flex-col gap-1">
                          <label className="text-[10px] font-black uppercase text-purple-900">Contact Société</label>
                          <input
                            type="tel"
                            value={companyPhone}
                            onChange={(e) => setCompanyPhone(e.target.value)}
                            placeholder="ex: 07 00 11 22 33"
                            className="bg-white border border-purple-200 rounded-xl p-2.5 text-xs font-bold focus:ring-2 focus:ring-purple-500 outline-none"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Internal Attestation & Agreement Checkbox */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4.5 space-y-3">
                    <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider flex items-center gap-2">
                      <ShieldCheck size={16} className="text-emerald-600" />
                      Attestation d&apos;Enregistrement &amp; Conformité des Pièces
                    </h4>
                    
                    <label className="flex items-start gap-3 cursor-pointer select-none bg-white p-3.5 rounded-xl border border-emerald-100">
                      <input
                        type="checkbox"
                        checked={termsAccepted}
                        onChange={(e) => setTermsAccepted(e.target.checked)}
                        className="w-5 h-5 rounded text-emerald-600 focus:ring-emerald-500 border-gray-300 mt-0.5"
                      />
                      <span className="text-xs font-bold text-gray-800 leading-relaxed">
                        J&apos;atteste que toutes les pièces d&apos;identité et informations du livreur ont été vérifiées et validées manuellement par l&apos;entreprise, et que le livreur accepte les conditions d&apos;acheminement Kalagban.
                      </span>
                    </label>
                  </div>

                </div>
              )}

            </div>

            {/* Modal Footer Navigation */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-4 border-t border-gray-100 flex items-center justify-between">
              {formStep > 1 ? (
                <button
                  type="button"
                  onClick={() => setFormStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1))}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-2"
                >
                  <ArrowLeft size={16} /> Précédent
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition-colors"
                >
                  Annuler
                </button>
              )}

              {formStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNextStep}
                  className="px-6 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-xs transition-all shadow-md shadow-orange-600/25 flex items-center gap-2"
                >
                  <span>Suivant</span>
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSaveCourier}
                  disabled={isSubmitting || !termsAccepted}
                  className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
                >
                  {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <CheckCircle2 size={18} />}
                  <span>Créer la Fiche du Livreur</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 2: AUDIT, DÉTAILS DU LIVREUR & EXPORT PDF */}
      {/* ========================================================================= */}
      {selectedCourier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-md animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-3.5">
                {selectedCourier.photo_url ? (
                  <img src={selectedCourier.photo_url} alt={selectedCourier.full_name} className="w-12 h-12 rounded-2xl object-cover border border-gray-200" />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center font-black">
                    {selectedCourier.full_name.charAt(0)}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase tracking-wider bg-orange-100 text-orange-800 px-2 py-0.5 rounded-md">
                      Fiche Livreur Certifié
                    </span>
                    {renderStatusBadge(selectedCourier.status)}
                  </div>
                  <h3 className="text-xl font-black text-gray-900">{selectedCourier.full_name}</h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => printCourierBadge(selectedCourier)}
                  className="px-3.5 py-2 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-800 font-extrabold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  title="Télécharger la fiche & badge PDF"
                >
                  <Printer size={15} /> Télécharger PDF
                </button>

                <button 
                  onClick={() => setSelectedCourier(null)}
                  className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6 sm:p-8 space-y-6">
              
              {/* Section 1: Informations Générales */}
              <div className="bg-slate-50/80 p-5 rounded-2xl border border-gray-200/80 space-y-4">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider border-b border-gray-200 pb-2 flex items-center justify-between">
                  <span>1. Coordonnées &amp; Identification</span>
                  <span className="text-[10px] text-gray-400 font-mono">ID: {selectedCourier.id.slice(0, 13).toUpperCase()}</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">WhatsApp Principal</span>
                    <p className="font-black text-emerald-700 text-sm mt-0.5">{selectedCourier.phone}</p>
                  </div>

                  {selectedCourier.secondary_phone && (
                    <div>
                      <span className="text-[10px] font-bold text-gray-400 uppercase">Numéro Secondaire</span>
                      <p className="font-bold text-gray-800 mt-0.5">{selectedCourier.secondary_phone}</p>
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Type &amp; N° Pièce</span>
                    <p className="font-black text-orange-700 mt-0.5">
                      {selectedCourier.id_card_type.toUpperCase()} : <span className="font-mono">{selectedCourier.id_card_number || "Non renseigné"}</span>
                    </p>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Type d&apos;Engin</span>
                    <div className="mt-1">{renderVehicleBadge(selectedCourier.vehicle_type)}</div>
                  </div>

                  <div>
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Immatriculation</span>
                    <p className="font-black font-mono text-gray-900 mt-0.5">
                      {selectedCourier.license_plate || "Non renseignée"}
                    </p>
                  </div>

                  <div className="col-span-2 sm:col-span-1">
                    <span className="text-[10px] font-bold text-gray-400 uppercase">Zone de Couverture</span>
                    <p className="font-bold text-gray-900 mt-0.5">
                      {selectedCourier.coverage_type === "all_abidjan" ? "Tout Abidjan" : selectedCourier.preferred_zone}
                    </p>
                  </div>
                </div>
              </div>

              {/* Section 2: Société Partenaire (Si existante) */}
              {selectedCourier.is_partner_company && selectedCourier.company_name && (
                <div className="bg-purple-50/70 border border-purple-200 p-5 rounded-2xl space-y-3">
                  <h4 className="text-xs font-black text-purple-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 size={15} className="text-purple-700" />
                    Société de Livraison Partenaire
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                    <div>
                      <span className="text-[10px] font-bold text-purple-500 uppercase">Entreprise</span>
                      <p className="font-black text-purple-950 mt-0.5">{selectedCourier.company_name}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-purple-500 uppercase">Gérant</span>
                      <p className="font-bold text-purple-900 mt-0.5">{selectedCourier.company_manager || "Non renseigné"}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-purple-500 uppercase">Contact Société</span>
                      <p className="font-bold text-emerald-700 mt-0.5">{selectedCourier.company_phone || "Non renseigné"}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Section 3: Pièces Justificatives */}
              <div className="space-y-3">
                <h4 className="text-xs font-black text-gray-900 uppercase tracking-wider">
                  2. Pièces Justificatives &amp; Documents
                </h4>

                <div className="grid grid-cols-3 gap-4">
                  {/* Photo Portrait */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-2.5 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Photo Livreur</span>
                    {selectedCourier.photo_url ? (
                      <img src={selectedCourier.photo_url} alt="Photo" className="w-full h-32 object-cover rounded-xl border border-gray-100" />
                    ) : (
                      <div className="w-full h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Aucune photo</div>
                    )}
                  </div>

                  {/* CNI Recto */}
                  <div className="bg-white rounded-2xl border border-gray-200 p-2.5 text-center shadow-2xs">
                    <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Pièce Recto</span>
                    {selectedCourier.id_card_front_url?.endsWith(".pdf") ? (
                      <div className="w-full h-32 rounded-xl bg-orange-50/50 flex flex-col items-center justify-center text-orange-600 gap-1">
                        <FileText size={32} />
                        <span className="text-[10px] font-bold">Document PDF</span>
                      </div>
                    ) : selectedCourier.id_card_front_url ? (
                      <img src={selectedCourier.id_card_front_url} alt="ID Recto" className="w-full h-32 object-cover rounded-xl border border-gray-100" />
                    ) : (
                      <div className="w-full h-32 rounded-xl bg-gray-100 flex items-center justify-center text-gray-400 text-xs">Non fourni</div>
                    )}
                    {selectedCourier.id_card_front_url && (
                      <a href={selectedCourier.id_card_front_url} target="_blank" rel="noreferrer" className="mt-1.5 text-[10px] font-bold text-orange-600 hover:underline inline-flex items-center gap-1">
                        <ExternalLink size={10} /> Voir pièce
                      </a>
                    )}
                  </div>

                  {/* CNI Verso */}
                  {selectedCourier.id_card_back_url && (
                    <div className="bg-white rounded-2xl border border-gray-200 p-2.5 text-center shadow-2xs">
                      <span className="text-[10px] font-bold text-gray-500 uppercase block mb-1.5">Pièce Verso</span>
                      {selectedCourier.id_card_back_url.endsWith(".pdf") ? (
                        <div className="w-full h-32 rounded-xl bg-orange-50/50 flex flex-col items-center justify-center text-orange-600 gap-1">
                          <FileText size={32} />
                          <span className="text-[10px] font-bold">PDF Verso</span>
                        </div>
                      ) : (
                        <img src={selectedCourier.id_card_back_url} alt="ID Verso" className="w-full h-32 object-cover rounded-xl border border-gray-100" />
                      )}
                      <a href={selectedCourier.id_card_back_url} target="_blank" rel="noreferrer" className="mt-1.5 text-[10px] font-bold text-orange-600 hover:underline inline-flex items-center gap-1">
                        <ExternalLink size={10} /> Voir pièce
                      </a>
                    </div>
                  )}
                </div>
              </div>

            </div>

            {/* Modal Bottom Actions */}
            <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-4 border-t border-gray-100 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setDeleteConfirmCourier(selectedCourier)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={15} /> Supprimer
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleToggleStatus(selectedCourier)}
                  className={`px-5 py-2.5 rounded-xl font-bold text-xs transition-colors ${
                    selectedCourier.status === "suspended"
                      ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                      : "bg-rose-600 hover:bg-rose-700 text-white"
                  }`}
                >
                  {selectedCourier.status === "suspended" ? "Réactiver le Livreur 🟢" : "Suspendre le Livreur ⛔"}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedCourier(null)}
                  className="px-5 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-800 text-white font-extrabold text-xs transition-colors"
                >
                  Fermer
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmCourier && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-600 ring-8 ring-rose-50/50 flex items-center justify-center mx-auto shadow-inner">
              <Trash2 size={30} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                Supprimer ce livreur ?
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Êtes-vous sûr de vouloir retirer le livreur <strong>&quot;{deleteConfirmCourier.full_name}&quot;</strong> de la flotte Kalagban ? Cette action est irréversible.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmCourier(null)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Annuler
              </button>
              <button
                type="button"
                onClick={() => handleDeleteCourier(deleteConfirmCourier)}
                className="flex-1 py-3 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs transition-all shadow-lg shadow-rose-600/25"
              >
                Supprimer Définitivement
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
