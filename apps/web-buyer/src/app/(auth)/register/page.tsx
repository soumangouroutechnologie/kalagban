"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  Lock, 
  Mail, 
  User, 
  Phone, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Check, 
  X 
} from "lucide-react";
import { supabase } from "@/lib/supabase";

function RegisterContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/account";

  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Force du mot de passe (Règles identiques au vendeur)
  const passwordCriteria = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  const validCount = Object.values(passwordCriteria).filter(Boolean).length;
  const isPasswordValid = Object.values(passwordCriteria).every(Boolean);

  const getPasswordStrengthColor = () => {
    if (validCount <= 1) return "bg-red-500";
    if (validCount === 2) return "bg-amber-500";
    if (validCount === 3) return "bg-blue-500";
    return "bg-emerald-500";
  };

  const getPasswordStrengthLabel = () => {
    if (validCount <= 1) return "Très faible";
    if (validCount === 2) return "Moyen";
    if (validCount === 3) return "Bon";
    return "Fort (Sécurisé ✨)";
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (!fullName) {
      setErrorMsg("Veuillez entrer votre nom complet.");
      setIsLoading(false);
      return;
    }

    if (authMethod === "phone" && !phone) {
      setErrorMsg("Veuillez entrer un numéro de téléphone valide.");
      setIsLoading(false);
      return;
    }

    if (authMethod === "email" && !email) {
      setErrorMsg("Veuillez entrer une adresse email valide.");
      setIsLoading(false);
      return;
    }

    if (!isPasswordValid) {
      setErrorMsg("Veuillez choisir un mot de passe qui respecte tous les critères de sécurité.");
      setIsLoading(false);
      return;
    }

    try {
      let cleanPhone = phone.replace(/\D/g, "");
      if (cleanPhone.length === 10 && (cleanPhone.startsWith("07") || cleanPhone.startsWith("05") || cleanPhone.startsWith("01"))) {
        cleanPhone = "225" + cleanPhone;
      }

      let signUpPayload;
      if (authMethod === "phone") {
        signUpPayload = {
          phone: cleanPhone,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: cleanPhone,
              role: "buyer"
            }
          }
        };
      } else {
        signUpPayload = {
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              phone: cleanPhone || null,
              role: "buyer"
            }
          }
        };
      }

      const { data: authData, error: authError } = await supabase.auth.signUp(signUpPayload);

      if (authError || !authData.user) {
        setErrorMsg("Erreur d'inscription : " + (authError?.message || "Impossible de créer le compte."));
        setIsLoading(false);
        return;
      }

      // Upsert profile
      await supabase.from("profiles").upsert({
        id: authData.user.id,
        full_name: fullName,
        phone: cleanPhone || phone || null,
        role: "buyer"
      });

      router.push(redirectPath);

    } catch (err: unknown) {
      console.error("Register exception:", err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 mb-6 transition-colors mx-auto w-fit">
          <ArrowLeft size={16} />
          Retour à la boutique Kalagban
        </Link>

        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-lg shadow-indigo-600/30">
          K
        </div>

        <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">
          Créer un Compte Client
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          Inscrivez-vous en 30s pour enregistrer vos commandes et adresses.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-gray-100 sm:px-10">
          
          {/* Auth Method Selector */}
          <div className="flex bg-gray-100 p-1.5 rounded-2xl mb-6 border border-gray-200/80">
            <button
              type="button"
              onClick={() => setAuthMethod("phone")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                authMethod === "phone" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Phone size={15} />
              Téléphone
            </button>
            <button
              type="button"
              onClick={() => setAuthMethod("email")}
              className={`flex-1 py-2.5 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 ${
                authMethod === "email" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-900"
              }`}
            >
              <Mail size={15} />
              Adresse Email
            </button>
          </div>

          {errorMsg && (
            <div className="mb-6 bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={18} className="shrink-0 text-red-500" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleRegister}>
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                Nom & Prénom *
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex: Kevin Kouassi"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3 px-4 pl-11 focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 font-medium text-sm transition-all"
                />
                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
              </div>
            </div>

            {authMethod === "phone" ? (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                  Numéro de Téléphone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ex: 07 08 09 10 11"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3 px-4 pl-11 focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 font-medium text-sm transition-all"
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                  Adresse Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre.email@exemple.com"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3 px-4 pl-11 focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 font-medium text-sm transition-all"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            )}

            {/* Password Input with Eye toggle */}
            <div>
              <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5">
                Mot de passe *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3 px-4 pl-11 pr-11 focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 font-medium text-sm transition-all"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                  title={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Password Strength Progress Bar & Checklist */}
            {password.length > 0 && (
              <div className="bg-gray-50 p-3.5 rounded-2xl border border-gray-200/80 space-y-2 animate-in fade-in">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-gray-500">Force du mot de passe :</span>
                  <span className={`font-extrabold ${validCount === 4 ? "text-emerald-600" : "text-amber-600"}`}>
                    {getPasswordStrengthLabel()}
                  </span>
                </div>

                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-300 ${getPasswordStrengthColor()}`}
                    style={{ width: `${(validCount / 4) * 100}%` }}
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1 text-[11px] font-bold">
                  <div className={`flex items-center gap-1 ${passwordCriteria.length ? "text-emerald-600" : "text-gray-400"}`}>
                    {passwordCriteria.length ? <Check size={13} /> : <X size={13} />}
                    <span>8+ caractères</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.uppercase ? "text-emerald-600" : "text-gray-400"}`}>
                    {passwordCriteria.uppercase ? <Check size={13} /> : <X size={13} />}
                    <span>1 Majuscule (A-Z)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.number ? "text-emerald-600" : "text-gray-400"}`}>
                    {passwordCriteria.number ? <Check size={13} /> : <X size={13} />}
                    <span>1 Chiffre (0-9)</span>
                  </div>
                  <div className={`flex items-center gap-1 ${passwordCriteria.special ? "text-emerald-600" : "text-gray-400"}`}>
                    {passwordCriteria.special ? <Check size={13} /> : <X size={13} />}
                    <span>1 Caractère spécial (@#!)</span>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !isPasswordValid}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
              {isLoading ? "Création du compte..." : "Créer mon Compte Client"}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Vous avez déjà un compte ?{" "}
              <Link href={`/login?redirect=${encodeURIComponent(redirectPath)}`} className="font-extrabold text-indigo-600 hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuyerRegisterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    }>
      <RegisterContent />
    </Suspense>
  );
}
