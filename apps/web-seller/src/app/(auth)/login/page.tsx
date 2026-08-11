"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail, Lock, ArrowRight, ShieldCheck, Loader2, Eye, EyeOff, Phone, CheckCircle2, XCircle } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import PhoneInput from "react-phone-number-input";
import "react-phone-number-input/style.css";
import "./phone-input.css"; // We will create this for custom styling

export default function LoginPage() {
  const router = useRouter();
  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState<string | undefined>("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Password validation state (visual only for login)
  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    
    let loginData;
    
    if (authMethod === "phone") {
      if (!phone) {
        setErrorMsg("Veuillez entrer un numéro de téléphone valide.");
        setIsLoading(false);
        return;
      }
      loginData = { phone: phone, password };
    } else {
      loginData = { email, password };
    }
    
    // Essayer de se connecter
    const { error } = await supabase.auth.signInWithPassword(loginData);

    if (error) {
      if (error.message.includes("Invalid login credentials")) {
        setErrorMsg("Identifiants incorrects ou compte inexistant. Veuillez vous inscrire d'abord.");
      } else {
        setErrorMsg("Erreur de connexion : " + error.message);
      }
      setIsLoading(false);
      return;
    }
    
    // Définir un cookie magique pour simuler la session middleware
    document.cookie = "kalagban_seller_auth=true; path=/; max-age=86400"; // Valide 1 jour
    
    // Rediriger vers le tableau de bord
    router.push("/");
    router.refresh();
  };

  return (
    <div className="flex w-full min-h-screen bg-white overflow-y-auto">
      
      {/* LEFT SIDE : LOGIN FORM */}
      <div className="w-full lg:w-1/2 min-h-screen flex flex-col justify-between px-6 sm:px-12 md:px-16 py-8 bg-white relative z-10 shadow-2xl overflow-y-auto">
        <div className="w-full max-w-md mx-auto my-auto py-4">
          
          {/* Logo Kalagban */}
          <div className="flex items-center gap-2 mb-6">
            <div className="w-10 h-10 bg-linear-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">
              K
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900">Kalagban</span>
          </div>

          <div className="mb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-gray-900 mb-2 tracking-tight">Bon retour ! 👋</h1>
            <p className="text-gray-500 text-sm font-medium">Connectez-vous à votre portail vendeur pour gérer vos produits et commandes.</p>
          </div>

          {/* Tab Selector for Auth Method */}
          <div className="flex p-1 bg-gray-100 rounded-2xl mb-6">
            <button
              onClick={() => { setAuthMethod("phone"); setErrorMsg(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${authMethod === "phone" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              <Phone size={18} /> Téléphone
            </button>
            <button
              onClick={() => { setAuthMethod("email"); setErrorMsg(""); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all ${authMethod === "email" ? "bg-white text-primary shadow-sm" : "text-gray-500 hover:text-gray-900"}`}
            >
              <Mail size={18} /> Email
            </button>
          </div>

          <form className="flex flex-col gap-4" onSubmit={handleLogin}>
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm font-medium border border-red-100">
                {errorMsg}
              </div>
            )}

            {/* Dynamic Input based on auth method */}
            {authMethod === "phone" ? (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700">Numéro de téléphone</label>
                <div className="kalagban-phone-container">
                  <PhoneInput
                    international
                    defaultCountry="CI"
                    value={phone}
                    onChange={setPhone}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3 px-4 focus-within:ring-2 focus-within:ring-primary/50 focus-within:border-primary transition-all text-sm font-medium"
                  />
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700">Adresse Email</label>
                <div className="relative">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com" 
                    required={authMethod === "email"}
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm font-medium"
                  />
                  <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            )}

            {/* Password Input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-sm font-bold text-gray-700">Mot de passe</label>
                <Link href="/forgot-password" className="text-xs font-bold text-primary hover:underline">Oublié ?</Link>
              </div>
              <div className="relative">
                <input 
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••" 
                  required
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3 px-4 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all text-sm font-medium"
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

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-primary text-white font-bold text-base rounded-2xl py-3.5 mt-2 shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex justify-center items-center gap-2 group disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin" size={22} /> : (
                <>
                  Se connecter
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
                </>
              )}
            </button>
          </form>

          {/* Sign up link */}
          <p className="mt-6 text-center text-gray-600 font-medium text-sm">
            Pas encore vendeur sur Kalagban ? <Link href="/register" className="text-primary font-bold hover:underline">Rejoignez-nous</Link>
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
          <h2 className="text-4xl font-black mb-6 leading-tight">Gérez votre boutique d&apos;une main de maître.</h2>
          <p className="text-lg text-white/80 font-medium">
            Accédez à vos statistiques en temps réel, gérez vos commandes et développez votre chiffre d&apos;affaires grâce aux outils intelligents de Kalagban.
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
