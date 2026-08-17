"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef, useEffect } from "react";
import { 
  X, 
  ShieldCheck, 
  FileText, 
  UploadCloud, 
  Camera, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Store, 
  PenTool, 
  ArrowRight, 
  ArrowLeft,
  RotateCcw,
  Check,
  FileCheck
} from "lucide-react";
import { supabase } from "@/lib/supabase";

export interface KycData {
  id?: string;
  shop_id?: string;
  seller_name?: string;
  id_type?: string;
  id_number?: string;
  id_card_front_url?: string;
  id_card_back_url?: string | null;
  seller_photo_url?: string;
  primary_phone?: string;
  secondary_phone?: string | null;
  store_address?: string;
  store_photos?: string[];
  location_description?: string | null;
  signature_url?: string;
  status?: string;
  admin_notes?: string | null;
  submitted_at?: string;
}

interface SellerKycModalProps {
  isOpen: boolean;
  onClose: () => void;
  shopId: string;
  shopName: string;
  existingKyc?: KycData | null;
  onSuccess: () => void;
}

export default function SellerKycModal({
  isOpen,
  onClose,
  shopId,
  shopName,
  existingKyc,
  onSuccess
}: SellerKycModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmPopup, setShowConfirmPopup] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Step 1: Identity & Manager
  const [sellerName, setSellerName] = useState(existingKyc?.seller_name || "");
  const [idType, setIdType] = useState(existingKyc?.id_type || "cni");
  const [idNumber, setIdNumber] = useState(existingKyc?.id_number || "");
  
  // Files (Images or PDFs up to 5MB)
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(existingKyc?.seller_photo_url || null);

  const [idFrontFile, setIdFrontFile] = useState<File | null>(null);
  const [idFrontPreview, setIdFrontPreview] = useState<string | null>(existingKyc?.id_card_front_url || null);
  const [idFrontIsPdf, setIdFrontIsPdf] = useState(false);

  const [idBackFile, setIdBackFile] = useState<File | null>(null);
  const [idBackPreview, setIdBackPreview] = useState<string | null>(existingKyc?.id_card_back_url || null);
  const [idBackIsPdf, setIdBackIsPdf] = useState(false);

  // Step 2: Store & Contacts
  const [primaryPhone, setPrimaryPhone] = useState(existingKyc?.primary_phone || "");
  const [secondaryPhone, setSecondaryPhone] = useState(existingKyc?.secondary_phone || "");
  const [storeAddress, setStoreAddress] = useState(existingKyc?.store_address || "");
  const [locationDescription, setLocationDescription] = useState(existingKyc?.location_description || "");
  
  const [storePhotos, setStorePhotos] = useState<File[]>([]);
  const [storePhotosPreviews, setStorePhotosPreviews] = useState<string[]>(
    existingKyc?.store_photos ? (Array.isArray(existingKyc.store_photos) ? existingKyc.store_photos : []) : []
  );

  // Step 3: Legal agreement & Signature Canvas
  const [termsAccepted, setTermsAccepted] = useState(true);
  const [signatureData, setSignatureData] = useState<string | null>(existingKyc?.signature_url || null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);

  // Canvas drawing handlers
  useEffect(() => {
    if (step === 3 && canvasRef.current && !signatureData) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.strokeStyle = "#1e1b4b"; // Dark Indigo
        ctx.lineWidth = 2.5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
      }
    }
  }, [step, signatureData]);

  if (!isOpen) return null;

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const rect = canvas.getBoundingClientRect();
    const x = "touches" in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = "touches" in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    if (canvasRef.current) {
      setSignatureData(canvasRef.current.toDataURL("image/png"));
    }
  };

  const clearSignature = () => {
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setSignatureData(null);
    }
  };

  // File Upload Handlers (Check max 5MB)
  const handleFileValidate = (file: File) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      alert(`Le fichier "${file.name}" dépasse la taille maximale autorisée de 5 MB.`);
      return false;
    }
    return true;
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleFileValidate(file)) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleIdFrontSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleFileValidate(file)) {
      setIdFrontFile(file);
      setIdFrontIsPdf(file.type === "application/pdf");
      setIdFrontPreview(URL.createObjectURL(file));
    }
  };

  const handleIdBackSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && handleFileValidate(file)) {
      setIdBackFile(file);
      setIdBackIsPdf(file.type === "application/pdf");
      setIdBackPreview(URL.createObjectURL(file));
    }
  };

  const handleStorePhotosSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const validFiles = files.filter(handleFileValidate);
    if (validFiles.length > 0) {
      const newFiles = [...storePhotos, ...validFiles].slice(0, 4); // Max 4 photos
      setStorePhotos(newFiles);
      setStorePhotosPreviews(newFiles.map(f => URL.createObjectURL(f)));
    }
  };

  // Step Validation
  const validateStep1 = () => {
    if (!sellerName.trim()) { setErrorMessage("Veuillez renseigner le nom complet du gérant."); return false; }
    if (!idNumber.trim()) { setErrorMessage("Veuillez renseigner le numéro de la pièce d'identité."); return false; }
    if (!photoPreview) { setErrorMessage("Veuillez ajouter une photo portrait du gérant."); return false; }
    if (!idFrontPreview) { setErrorMessage("Veuillez téléverser la pièce d'identité (Recto)."); return false; }
    if (idType === "cni" && !idBackPreview) { setErrorMessage("Pour une CNI, le Verso est obligatoire."); return false; }
    setErrorMessage("");
    return true;
  };

  const validateStep2 = () => {
    if (!primaryPhone.trim()) { setErrorMessage("Veuillez renseigner un numéro WhatsApp/Mobile principal."); return false; }
    if (!storeAddress.trim()) { setErrorMessage("Veuillez renseigner l'adresse et commune de la boutique physique."); return false; }
    setErrorMessage("");
    return true;
  };

  const handleNext = () => {
    if (step === 1 && validateStep1()) setStep(2);
    else if (step === 2 && validateStep2()) setStep(3);
  };

  // Upload helper to Supabase Storage
  const uploadToStorage = async (file: File, prefix: string): Promise<string> => {
    const ext = file.name.split(".").pop() || "jpg";
    const path = `kyc/${shopId}/${prefix}_${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("kalagban_media").upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from("kalagban_media").getPublicUrl(path);
    return data.publicUrl;
  };

  // Submit Final KYC Dossier
  const handleFinalSubmit = async () => {
    if (!termsAccepted) {
      alert("Veuillez cocher la case d'acceptation de la charte.");
      return;
    }
    if (!signatureData) {
      alert("Veuillez apposer votre signature numérique dans l'encadré.");
      return;
    }

    setIsSubmitting(true);
    setShowConfirmPopup(false);

    try {
      // 1. Upload files if newly provided
      let finalPhotoUrl = photoPreview || "";
      if (photoFile) finalPhotoUrl = await uploadToStorage(photoFile, "manager_photo");

      let finalIdFrontUrl = idFrontPreview || "";
      if (idFrontFile) finalIdFrontUrl = await uploadToStorage(idFrontFile, "id_front");

      let finalIdBackUrl = idBackPreview || null;
      if (idBackFile) finalIdBackUrl = await uploadToStorage(idBackFile, "id_back");

      const finalStorePhotoUrls: string[] = [...storePhotosPreviews.filter(url => url.startsWith("http"))];
      for (let i = 0; i < storePhotos.length; i++) {
        const url = await uploadToStorage(storePhotos[i], `store_photo_${i + 1}`);
        finalStorePhotoUrls.push(url);
      }

      // 2. Insert or Update seller_certifications table
      const kycPayload = {
        shop_id: shopId,
        seller_name: sellerName,
        id_type: idType,
        id_number: idNumber,
        seller_photo_url: finalPhotoUrl,
        id_card_front_url: finalIdFrontUrl,
        id_card_back_url: finalIdBackUrl,
        primary_phone: primaryPhone,
        secondary_phone: secondaryPhone || null,
        store_address: storeAddress,
        location_description: locationDescription || null,
        store_photos: finalStorePhotoUrls,
        signature_url: signatureData,
        terms_accepted: true,
        status: "pending",
        submitted_at: new Date().toISOString()
      };

      const { error: kycError } = await supabase
        .from("seller_certifications")
        .upsert(kycPayload, { onConflict: "shop_id" });

      if (kycError) throw kycError;

      // 3. Update shop kyc_status
      await supabase
        .from("shops")
        .update({ kyc_status: "pending" })
        .eq("id", shopId);

      // 4. Notify Administrators & Shop Managers
      await supabase.from("admin_notifications").insert({
        title: "🛡️ Nouveau Dossier de Certification Vendeur",
        message: `La boutique "${shopName}" (${sellerName}) a déposé son dossier complet KYC. Pièces justificatives et signature prêtes pour examen.`,
        type: "kyc_submission",
        data: { shop_id: shopId, seller_name: sellerName }
      });

      alert("🎉 Votre dossier de certification a été transmis avec succès ! Le service Conformité Kalagban va l'examiner sous 24 à 48 heures.");
      onSuccess();
      onClose();

    } catch (err: unknown) {
      console.error("KYC Submission error:", err);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi du dossier.";
      alert("Erreur : " + msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/70 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar">
        
        {/* Top Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 sm:px-8 py-5 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-black shadow-inner">
              <ShieldCheck size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full">
                  Dossier Officiel
                </span>
                <span className="text-xs font-bold text-gray-400">Étape {step} sur 3</span>
              </div>
              <h3 className="text-xl font-black text-gray-900 tracking-tight">Certification de la Boutique</h3>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step Progression Bar */}
        <div className="grid grid-cols-3 border-b border-gray-100 bg-slate-50/50">
          <div className={`py-3 px-4 text-center border-b-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            step === 1 ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-gray-400"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              step > 1 ? "bg-emerald-500 text-white" : step === 1 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              {step > 1 ? <Check size={12} /> : "1"}
            </span>
            <span className="hidden sm:inline">Identité & Gérant</span>
          </div>

          <div className={`py-3 px-4 text-center border-b-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            step === 2 ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-gray-400"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              step > 2 ? "bg-emerald-500 text-white" : step === 2 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              {step > 2 ? <Check size={12} /> : "2"}
            </span>
            <span className="hidden sm:inline">Boutique & Contacts</span>
          </div>

          <div className={`py-3 px-4 text-center border-b-2 font-bold text-xs flex items-center justify-center gap-2 transition-all ${
            step === 3 ? "border-indigo-600 text-indigo-700 bg-white" : "border-transparent text-gray-400"
          }`}>
            <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${
              step === 3 ? "bg-indigo-600 text-white" : "bg-gray-200 text-gray-600"
            }`}>
              3
            </span>
            <span className="hidden sm:inline">Accord & Signature</span>
          </div>
        </div>

        {/* Modal Body Content */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          
          {errorMessage && (
            <div className="bg-rose-50 border border-rose-200 text-rose-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle size={18} className="text-rose-600 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* ================= STEP 1: IDENTITY ================= */}
          {step === 1 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-indigo-50/50 border border-indigo-100 rounded-2xl p-4 flex items-start gap-3">
                <FileCheck size={20} className="text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-xs text-indigo-950 font-medium leading-relaxed">
                  Fournissez une pièce d&apos;identité officielle en cours de validité (Image ou PDF, 5 MB maximum). Si vous choisissez la Carte Nationale d&apos;Identité (CNI), le Recto et le Verso sont obligatoires.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700">Nom & Prénom du Gérant *</label>
                  <input
                    type="text"
                    required
                    value={sellerName}
                    onChange={(e) => setSellerName(e.target.value)}
                    placeholder="ex: Yao Koffi Stéphane"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 text-sm font-semibold transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700">Type de Pièce d&apos;Identité *</label>
                  <select
                    value={idType}
                    onChange={(e) => setIdType(e.target.value)}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 text-sm font-semibold transition-all"
                  >
                    <option value="cni">Carte Nationale d&apos;Identité (CNI)</option>
                    <option value="passport">Passeport International</option>
                    <option value="attestation">Attestation d&apos;Identité Officielle</option>
                    <option value="permis">Permis de Conduire</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700">Numéro de la Pièce d&apos;Identité *</label>
                <input
                  type="text"
                  required
                  value={idNumber}
                  onChange={(e) => setIdNumber(e.target.value)}
                  placeholder="ex: CI0012345678"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 text-sm font-semibold font-mono transition-all"
                />
              </div>

              {/* Photo Portrait & ID Files Upload */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
                
                {/* 1. Photo Portrait Gérant */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Photo Portrait Gérant *</span>
                  <label className="border-2 border-dashed border-gray-200 hover:border-indigo-500 bg-gray-50/70 hover:bg-indigo-50/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-35 relative overflow-hidden group">
                    <input type="file" accept="image/*" onChange={handlePhotoSelect} className="hidden" />
                    {photoPreview ? (
                      <img src={photoPreview} alt="Portrait" className="w-full h-28 object-cover rounded-xl" />
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-gray-400 group-hover:text-indigo-600">
                        <Camera size={26} />
                        <span className="text-[11px] font-bold">Photo nette (Selfie/Portrait)</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* 2. CNI Recto (ou Document Principal) */}
                <div className="flex flex-col gap-2">
                  <span className="text-xs font-black text-gray-700 uppercase tracking-wider">
                    {idType === "cni" ? "CNI Recto *" : "Document d'identité *"}
                  </span>
                  <label className="border-2 border-dashed border-gray-200 hover:border-indigo-500 bg-gray-50/70 hover:bg-indigo-50/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-35 relative overflow-hidden group">
                    <input type="file" accept="image/*,application/pdf" onChange={handleIdFrontSelect} className="hidden" />
                    {idFrontPreview ? (
                      idFrontIsPdf ? (
                        <div className="flex flex-col items-center gap-1 text-indigo-600 font-bold text-xs p-2">
                          <FileText size={32} />
                          <span>PDF sélectionné</span>
                        </div>
                      ) : (
                        <img src={idFrontPreview} alt="Recto" className="w-full h-28 object-cover rounded-xl" />
                      )
                    ) : (
                      <div className="flex flex-col items-center gap-1.5 text-gray-400 group-hover:text-indigo-600">
                        <UploadCloud size={26} />
                        <span className="text-[11px] font-bold">Image ou PDF (5MB max)</span>
                      </div>
                    )}
                  </label>
                </div>

                {/* 3. CNI Verso (Obligatoire si CNI) */}
                {idType === "cni" && (
                  <div className="flex flex-col gap-2 animate-in fade-in">
                    <span className="text-xs font-black text-gray-700 uppercase tracking-wider">CNI Verso (Arrière) *</span>
                    <label className="border-2 border-dashed border-gray-200 hover:border-indigo-500 bg-gray-50/70 hover:bg-indigo-50/30 rounded-2xl p-4 flex flex-col items-center justify-center text-center cursor-pointer transition-all min-h-35 relative overflow-hidden group">
                      <input type="file" accept="image/*,application/pdf" onChange={handleIdBackSelect} className="hidden" />
                      {idBackPreview ? (
                        idBackIsPdf ? (
                          <div className="flex flex-col items-center gap-1 text-indigo-600 font-bold text-xs p-2">
                            <FileText size={32} />
                            <span>PDF Verso prêt</span>
                          </div>
                        ) : (
                          <img src={idBackPreview} alt="Verso" className="w-full h-28 object-cover rounded-xl" />
                        )
                      ) : (
                        <div className="flex flex-col items-center gap-1.5 text-gray-400 group-hover:text-indigo-600">
                          <UploadCloud size={26} />
                          <span className="text-[11px] font-bold">Image ou PDF Verso</span>
                        </div>
                      )}
                    </label>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* ================= STEP 2: STORE & CONTACTS ================= */}
          {step === 2 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700">Numéro WhatsApp & Mobile Principal *</label>
                  <input
                    type="tel"
                    required
                    value={primaryPhone}
                    onChange={(e) => setPrimaryPhone(e.target.value)}
                    placeholder="ex: 07 77 62 08 64"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 text-sm font-semibold transition-all"
                  />
                </div>

                <div className="flex flex-col gap-2">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700">Second Numéro de Téléphone (Optionnel)</label>
                  <input
                    type="tel"
                    value={secondaryPhone}
                    onChange={(e) => setSecondaryPhone(e.target.value)}
                    placeholder="ex: 05 01 02 03 04"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 text-sm font-semibold transition-all"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700">Adresse & Commune de la Boutique Physique *</label>
                <input
                  type="text"
                  required
                  value={storeAddress}
                  onChange={(e) => setStoreAddress(e.target.value)}
                  placeholder="ex: Cocody Angré 8ème Tranche, en face de la pharmacie"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 text-sm font-semibold transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-black uppercase tracking-wider text-gray-700">Repères géographiques & Accès (Optionnel)</label>
                <textarea
                  rows={2}
                  value={locationDescription}
                  onChange={(e) => setLocationDescription(e.target.value)}
                  placeholder="ex: Bâtiment R+1, portail blanc, à côté de la boulangerie..."
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3 focus:ring-2 focus:ring-indigo-600/40 text-xs font-medium resize-none"
                />
              </div>

              {/* Store Photos Upload */}
              <div className="flex flex-col gap-2 pt-2">
                <span className="text-xs font-black text-gray-700 uppercase tracking-wider">Photos de la Boutique Physique / Atelier (1 à 4 photos)</span>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {storePhotosPreviews.map((url, idx) => (
                    <div key={idx} className="w-full h-24 rounded-xl border border-gray-200 overflow-hidden relative shadow-xs">
                      <img src={url} alt="Boutique" className="w-full h-full object-cover" />
                    </div>
                  ))}
                  {storePhotosPreviews.length < 4 && (
                    <label className="border-2 border-dashed border-gray-200 hover:border-indigo-500 bg-gray-50 hover:bg-indigo-50/40 rounded-xl h-24 flex flex-col items-center justify-center cursor-pointer transition-all text-gray-400 hover:text-indigo-600">
                      <input type="file" multiple accept="image/*" onChange={handleStorePhotosSelect} className="hidden" />
                      <Store size={22} />
                      <span className="text-[10px] font-bold mt-1">+ Ajouter photo</span>
                    </label>
                  )}
                </div>
              </div>

            </div>
          )}

          {/* ================= STEP 3: AGREEMENT & SIGNATURE ================= */}
          {step === 3 && (
            <div className="space-y-6 animate-in fade-in duration-200">
              
              <div className="bg-amber-50 border border-amber-200/80 rounded-2xl p-4.5 space-y-2">
                <h4 className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck size={16} className="text-amber-600" />
                  Engagement sur l&apos;Honneur & Charte de Confiance Kalagban
                </h4>
                <p className="text-xs text-amber-900 font-medium leading-relaxed">
                  En apposant votre signature numérique ci-dessous, vous certifiez sur l&apos;honneur que vous êtes le propriétaire ou représentant légal de la boutique <strong>{shopName}</strong> et que toutes les pièces fournies sont authentiques.
                </p>
              </div>

              {/* Checkbox agreement */}
              <label className="flex items-start gap-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={termsAccepted}
                  onChange={(e) => setTermsAccepted(e.target.checked)}
                  className="w-5 h-5 rounded-md text-indigo-600 focus:ring-indigo-500 border-gray-300 mt-0.5"
                />
                <span className="text-xs font-bold text-gray-800 leading-relaxed">
                  J&apos;atteste l&apos;exactitude des informations et pièces transmises et j&apos;accepte le traitement de mon dossier pour l&apos;attribution du Badge Vendeur Certifié Kalagban.
                </span>
              </label>

              {/* Digital Signature Pad */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                    <PenTool size={14} className="text-indigo-600" />
                    Signature Numérique Manuscrite *
                  </label>
                  <button
                    type="button"
                    onClick={clearSignature}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-700 flex items-center gap-1"
                  >
                    <RotateCcw size={12} /> Effacer la signature
                  </button>
                </div>

                <div className="border-2 border-dashed border-indigo-300 rounded-2xl bg-white p-2 shadow-inner">
                  <canvas
                    ref={canvasRef}
                    width={500}
                    height={160}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing}
                    onTouchMove={draw}
                    onTouchEnd={stopDrawing}
                    className="w-full h-36 bg-slate-50 rounded-xl cursor-crosshair touch-none"
                  />
                </div>
                <p className="text-[10px] text-gray-400 font-medium text-center">
                  Signez avec votre doigt (sur mobile) ou avec votre curseur de souris dans le cadre ci-dessus.
                </p>
              </div>

            </div>
          )}

        </div>

        {/* Footer Navigation */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur-md px-6 sm:px-8 py-4 border-t border-gray-100 flex items-center justify-between">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s > 1 ? ((s - 1) as 1 | 2 | 3) : 1))}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors flex items-center gap-2"
            >
              <ArrowLeft size={16} /> Précédent
            </button>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 font-bold text-xs transition-colors"
            >
              Fermer
            </button>
          )}

          {step < 3 ? (
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs transition-all shadow-md shadow-indigo-600/25 flex items-center gap-2"
            >
              <span>Suivant</span>
              <ArrowRight size={16} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmPopup(true)}
              disabled={isSubmitting || !signatureData || !termsAccepted}
              className="px-7 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black text-xs transition-all shadow-lg shadow-emerald-600/30 flex items-center gap-2"
            >
              {isSubmitting ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={18} />}
              <span>Valider & Transmettre mon Dossier</span>
            </button>
          )}
        </div>

      </div>

      {/* Confirmation Modal Pop-up */}
      {showConfirmPopup && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 space-y-6 text-center animate-in zoom-in-95">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-emerald-600 ring-8 ring-emerald-50/50 flex items-center justify-center mx-auto shadow-inner">
              <ShieldCheck size={32} />
            </div>

            <div className="space-y-2">
              <h3 className="text-lg font-black text-gray-900">
                Confirmer l&apos;envoi définitif du dossier ?
              </h3>
              <p className="text-xs text-gray-500 font-medium leading-relaxed">
                Confirmez-vous l&apos;exactitude des pièces et de votre signature ? Votre dossier sera transmis au <strong>service Conformité Kalagban</strong> pour l&apos;attribution de votre Badge Vendeur Certifié 🛡️.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmPopup(false)}
                className="flex-1 py-3 px-4 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs transition-colors"
              >
                Vérifier à nouveau
              </button>
              <button
                type="button"
                onClick={handleFinalSubmit}
                disabled={isSubmitting}
                className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs transition-all shadow-lg shadow-emerald-600/25 flex items-center justify-center gap-1.5"
              >
                {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={16} />}
                <span>Confirmer l&apos;envoi</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
