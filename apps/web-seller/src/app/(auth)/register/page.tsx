"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  ShieldCheck, 
  Loader2, 
  Eye, 
  EyeOff, 
  Phone, 
  CheckCircle2, 
  XCircle,
  Store,
  Camera,
  Sparkles,
  ArrowLeft,
  Check
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "../login/phone-input.css";

export default function RegisterPage() {
  const router = useRouter();

  // Wizard Step: 1 = Credentials, 2 = Shop Details
  const [step, setStep] = useState<1 | 2>(1);

  // Step 1 State
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Step 2 State
  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);

  // Status & Modal State
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Password validation state
  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  // Handle Step 1 Validation & Proceed
  const handleNextStep = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");

    if (authMethod === "phone" && !phone) {
      setErrorMsg("Veuillez entrer un numéro de téléphone valide.");
      return;
    }
    if (authMethod === "email" && !email) {
      setErrorMsg("Veuillez entrer une adresse email valide.");
      return;
    }
    if (!isPasswordValid) {
      setErrorMsg("Veuillez choisir un mot de passe qui respecte tous les critères de sécurité.");
      return;
    }

    setStep(2);
  };

  // Handle Logo Image Selection
  const handleLogoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogoFile(file);
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  // Handle Full Registration & Shop Creation
  const handleFinalRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (!shopName.trim()) {
      setErrorMsg("Veuillez donner un nom à votre boutique.");
      setIsLoading(false);
      return;
    }

    try {
      // 1. Inscription Auth dans Supabase
      let registerData;
      if (authMethod === "phone") {
        if (!phone) {
          setErrorMsg("Veuillez entrer un numéro de téléphone valide.");
          setIsLoading(false);
          return;
        }
        registerData = { phone: phone as string, password };
      } else {
        registerData = { email, password };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp(registerData);

      if (authError || !authData.user) {
        setErrorMsg("Erreur d'inscription : " + (authError?.message || "Impossible de créer le compte."));
        setIsLoading(false);
        return;
      }

      const userId = authData.user.id;

      // 2. Upload du Logo si sélectionné
      let uploadedLogoUrl: string | null = null;
      if (logoFile) {
        const fileExt = logoFile.name.split(".").pop();
        const fileName = `shop_logo_${userId}_${Date.now()}.${fileExt}`;
        
        const { error: uploadErr } = await supabase.storage
          .from("kalagban_media")
          .upload(fileName, logoFile);

        if (!uploadErr) {
          const { data: publicUrlData } = supabase.storage
            .from("kalagban_media")
            .getPublicUrl(fileName);
          uploadedLogoUrl = publicUrlData.publicUrl;
        }
      }

      // 3. Insertion / Mise à jour de la boutique dans public.shops
      await supabase.from("shops").upsert({
        id: userId,
        name: shopName.trim(),
        description: shopDescription.trim() || "Boutique officielle sur Kalagban",
        logo_url: uploadedLogoUrl,
      });

      // 4. Insertion / Mise à jour du profil vendeur dans public.profiles
      await supabase.from("profiles").upsert({
        id: userId,
        phone: phone || null,
        avatar_url: uploadedLogoUrl,
        role: "seller"
      });

      // Set auth cookie
      document.cookie = "kalagban_seller_auth=true; path=/; max-age=86400";

      setIsLoading(false);
      setShowSuccessModal(true);

    } catch (err: unknown) {
      console.error("Register Error:", err);
      setErrorMsg("Une erreur inattendue est survenue.");
      setIsLoading(false);
    }
  };

  const handleGoToDashboard = () => {
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex w-full min-h-screen bg-white overflow-y-auto relative">
      
      {/* SUCCESS CONFIRMATION MODAL (POP-UP) */}
      {showSuccessModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full text-center shadow-2xl border border-gray-100 relative overflow-hidden">
            
            {/* Glowing Accent */}
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 rounded-full blur-3xl" />

            <div className="w-20 h-20 bg-linear-to-br from-green-400 to-emerald-600 text-white rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/30 animate-bounce">
              <CheckCircle2 size={44} strokeWidth={2.5} />
            </div>

            <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-wider px-3 py-1 rounded-full border border-emerald-100 mb-3">
              <Sparkles size={14} /> Boutique Validée !
            </span>

            <h2 className="text-3xl font-black text-gray-900 tracking-tight mb-2">
              Félicitations ! 🎉
            </h2>
            <p className="text-gray-500 text-sm font-medium mb-6">
              Votre boutique a été configurée et activée avec succès sur Kalagban.
            </p>

            {/* Created Shop Card Preview */}
            <div className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex items-center gap-4 text-left mb-8">
              <div className="w-14 h-14 bg-primary text-white rounded-xl flex items-center justify-center font-black text-2xl overflow-hidden shrink-0 shadow-md">
                {logoPreview ? (
                  <img src={logoPreview} alt="Logo Boutique" className="w-full h-full object-cover" />
                ) : (
                  <Store size={28} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-extrabold text-gray-900 text-base truncate">{shopName}</h4>
                <p className="text-xs text-gray-500 line-clamp-1 font-medium">{shopDescription || "Boutique officielle"}</p>
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 mt-1">
                  <Check size={12} /> Compte Vendeur Vérifié
                </span>
              </div>
            </div>

            <button
              onClick={handleGoToDashboard}
              className="w-full bg-primary text-white font-bold text-base py-4 rounded-2xl shadow-xl shadow-primary/30 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 group"
            >
              Accéder à mon Tableau de Bord
              <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
            </button>
          </div>
        </div>
      )}

      {/* LEFT SIDE : REGISTER FORM (WIZARD) */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between px-6 sm:px-12 md:px-16 py-8 bg-white relative z-10 shadow-2xl overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto py-4">
          
          {/* Logo Kalagban Header */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-linear-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-lg shadow-lg shadow-primary/30">
                K
              </div>
              <span className="text-xl font-black tracking-tight text-gray-900">Kalagban</span>
            </div>

            {/* Step Counter */}
            <span className="text-xs font-extrabold text-primary bg-primary/10 px-3 py-1 rounded-full border border-primary/20">
              Étape {step} sur 2
            </span>
          </div>

          {/* Progress Bar Indicator */}
          <div className="w-full bg-gray-100 h-1.5 rounded-full mb-5 overflow-hidden">
            <div 
              className="bg-primary h-full transition-all duration-500 ease-out rounded-full"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>

          {/* Title Header */}
          <div className="mb-5">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-1 tracking-tight">
              {step === 1 ? "Vos Identifiants 🚀" : "Votre Boutique 🏪"}
            </h1>
            <p className="text-gray-500 font-medium text-xs">
              {step === 1 
                ? "Créez vos accès sécurisés pour accéder au portail vendeur." 
                : "Personnalisez l'identité visuelle de votre boutique en ligne."}
            </p>
          </div>

          {errorMsg && (
            <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-xs font-medium border border-red-100 mb-4">
              {errorMsg}
            </div>
          )}

          {/* STEP 1: CREDENTIALS */}
          {step === 1 && (
            <form className="flex flex-col gap-4" onSubmit={handleNextStep}>
              
              {/* Tab Selector for Auth Method */}
              <div className="flex p-1 bg-gray-100 rounded-2xl mb-1">
                <button
                  type="button"
                  onClick={() => { setAuthMethod("phone"); setErrorMsg(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${authMethod === "phone" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  <Phone size={16} /> Téléphone
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMethod("email"); setErrorMsg(""); }}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${authMethod === "email" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
                >
                  <Mail size={16} /> Email
                </button>
              </div>

              {/* Input based on auth method */}
              {authMethod === "phone" ? (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-700">Numéro de téléphone</label>
                  <div className="kalagban-phone-container">
                    <PhoneInput
                      international
                      defaultCountry="CI"
                      value={phone}
                      onChange={setPhone}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-2.5 px-4 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all text-sm"
                    />
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-gray-700">Adresse Email</label>
                  <div className="relative">
                    <input 
                      type="email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="votre@email.com" 
                      required={authMethod === "email"}
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-2.5 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm font-medium"
                    />
                    <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  </div>
                </div>
              )}

              {/* Password Input */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Mot de passe</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••" 
                    required
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-2.5 px-4 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm font-medium"
                  />
                  <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                  <button 
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                
                {/* Password Strength Indicator */}
                <div className="mt-2 flex flex-col gap-1.5 p-3 bg-gray-50 rounded-xl border border-gray-100">
                  <p className="text-xs font-bold text-gray-700">Sécurité du mot de passe</p>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${passwordCriteria.length ? "text-green-600" : "text-gray-500"}`}>
                      {passwordCriteria.length ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-gray-300" />}
                      Au moins 8 car.
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${passwordCriteria.uppercase ? "text-green-600" : "text-gray-500"}`}>
                      {passwordCriteria.uppercase ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-gray-300" />}
                      Une majuscule
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${passwordCriteria.number ? "text-green-600" : "text-gray-500"}`}>
                      {passwordCriteria.number ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-gray-300" />}
                      Un chiffre
                    </div>
                    <div className={`flex items-center gap-1.5 text-[11px] font-medium transition-colors ${passwordCriteria.special ? "text-green-600" : "text-gray-500"}`}>
                      {passwordCriteria.special ? <CheckCircle2 size={14} /> : <XCircle size={14} className="text-gray-300" />}
                      Un car. spécial
                    </div>
                  </div>
                </div>
              </div>

              {/* Next Step Button */}
              <button 
                type="submit" 
                className="w-full bg-primary text-white font-bold text-base rounded-2xl py-3.5 mt-1 shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex justify-center items-center gap-2 group"
              >
                Étape suivante : Ma Boutique
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
              </button>
            </form>
          )}

          {/* STEP 2: SHOP DETAILS */}
          {step === 2 && (
            <form className="flex flex-col gap-4" onSubmit={handleFinalRegister}>
              
              {/* Logo Upload Box */}
              <div className="flex flex-col items-center gap-2">
                <label className="text-xs font-bold text-gray-700 text-center">Logo de la boutique</label>
                <div 
                  onClick={() => logoInputRef.current?.click()}
                  className="w-20 h-20 rounded-2xl bg-gray-50 border-2 border-dashed border-gray-300 hover:border-primary flex items-center justify-center cursor-pointer relative overflow-hidden group transition-all shadow-sm"
                >
                  {logoPreview ? (
                    <img src={logoPreview} alt="Aperçu Logo" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center gap-1 text-gray-400 group-hover:text-primary transition-colors">
                      <Camera size={24} />
                      <span className="text-[10px] font-bold">Ajouter</span>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                    <Camera size={18} />
                  </div>
                </div>
                <input 
                  type="file" 
                  ref={logoInputRef}
                  onChange={handleLogoSelect}
                  accept="image/*"
                  className="hidden" 
                />
              </div>

              {/* Shop Name */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Nom de votre boutique *</label>
                <div className="relative">
                  <input 
                    type="text" 
                    value={shopName}
                    onChange={(e) => setShopName(e.target.value)}
                    placeholder="ex: Kouassi Collection, Douba Shop..." 
                    required
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-2.5 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-medium text-sm"
                  />
                  <Store className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>

              {/* Shop Description */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-700">Description courte (Optionnelle)</label>
                <textarea 
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  placeholder="ex: Spécialiste des vêtements tendance et accessoires de mode à Abidjan." 
                  rows={2}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl p-3 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-medium text-xs"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="bg-gray-100 text-gray-700 font-bold px-5 py-4 rounded-2xl hover:bg-gray-200 transition-all flex items-center gap-2 text-sm"
                >
                  <ArrowLeft size={18} />
                  Retour
                </button>

                <button 
                  type="submit" 
                  disabled={isLoading}
                  className="flex-1 bg-primary text-white font-bold text-lg rounded-2xl py-4 shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex justify-center items-center gap-2 group disabled:opacity-70"
                >
                  {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                    <>
                      Créer ma boutique
                      <Sparkles size={20} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* Sign in link */}
          <p className="mt-6 text-center text-gray-600 font-medium">
            Déjà vendeur sur Kalagban ? <Link href="/login" className="text-primary font-bold hover:underline">Se connecter</Link>
          </p>

        </div>
      </div>

      {/* RIGHT SIDE : VISUAL */}
      <div className="hidden lg:flex w-1/2 relative bg-gray-900 overflow-hidden items-center justify-center">
        {/* Background Image */}
        <img 
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&q=80&w=1200" 
          alt="Kalagban Seller Hub" 
          className="absolute inset-0 w-full h-full object-cover opacity-40 mix-blend-overlay"
        />
        
        {/* Decorative elements */}
        <div className="absolute inset-0 bg-linear-to-br from-primary/80 to-indigo-900/90"></div>
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-white/10 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl"></div>

        {/* Content */}
        <div className="relative z-10 text-white max-w-lg px-12 text-center">
          <div className="w-20 h-20 bg-white/10 backdrop-blur-md rounded-3xl mx-auto mb-8 flex items-center justify-center border border-white/20 shadow-2xl">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h2 className="text-4xl font-black mb-6 leading-tight">Ouvrez votre boutique en quelques clics.</h2>
          <p className="text-lg text-white/80 font-medium">
            Démarrez votre aventure de vente en ligne. Simple, rapide et conçu pour booster votre activité dès le premier jour.
          </p>
          
          <div className="mt-12 flex items-center justify-center gap-4">
            <div className="flex -space-x-4">
              <img src="https://i.pravatar.cc/100?img=1" alt="Vendeur 1" className="w-12 h-12 rounded-full border-2 border-primary" />
              <img src="https://i.pravatar.cc/100?img=2" alt="Vendeur 2" className="w-12 h-12 rounded-full border-2 border-primary" />
              <img src="https://i.pravatar.cc/100?img=3" alt="Vendeur 3" className="w-12 h-12 rounded-full border-2 border-primary" />
            </div>
            <div className="text-left">
              <p className="font-bold text-white text-sm">+5,000 vendeurs</p>
              <p className="text-white/60 text-xs">font confiance à Kalagban</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
