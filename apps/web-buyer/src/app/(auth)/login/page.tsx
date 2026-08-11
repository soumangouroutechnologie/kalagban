"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, Mail, Phone, Loader2, UserCheck, AlertCircle, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/lib/supabase";

function LoginContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/account";

  const [authMethod, setAuthMethod] = useState<"phone" | "email">("phone");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    try {
      let credentials;
      if (authMethod === "phone") {
        let cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length === 10 && (cleanPhone.startsWith("07") || cleanPhone.startsWith("05") || cleanPhone.startsWith("01"))) {
          cleanPhone = "225" + cleanPhone;
        }
        credentials = { phone: cleanPhone, password };
      } else {
        credentials = { email, password };
      }

      const { error } = await supabase.auth.signInWithPassword(credentials);

      if (error) {
        setErrorMsg("Identifiant ou mot de passe incorrect. Veuillez réessayer.");
      } else {
        router.push(redirectPath);
      }
    } catch (err: unknown) {
      console.error("Login error:", err);
      setErrorMsg("Une erreur est survenue lors de la connexion.");
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
          Connexion Espace Client
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          Accédez à vos commandes, adresses et produits favoris.
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

          <form className="space-y-5" onSubmit={handleLogin}>
            {authMethod === "phone" ? (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2">
                  Numéro de Téléphone *
                </label>
                <div className="relative">
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ex: 07 08 09 10 11"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3.5 px-4 pl-11 focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 font-medium text-sm transition-all"
                  />
                  <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2">
                  Adresse Email *
                </label>
                <div className="relative">
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre.email@exemple.com"
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3.5 px-4 pl-11 focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 font-medium text-sm transition-all"
                  />
                  <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                </div>
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700">
                  Mot de passe *
                </label>
                <Link href="/forgot-password" className="text-xs font-bold text-indigo-600 hover:underline">
                  Mot de passe oublié ?
                </Link>
              </div>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl py-3.5 px-4 pl-11 pr-11 focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 font-medium text-sm transition-all"
                />
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
            >
              {isLoading ? <Loader2 className="animate-spin" size={18} /> : <UserCheck size={18} />}
              {isLoading ? "Connexion..." : "Se Connecter à mon Compte Client"}
            </button>
          </form>

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Vous n&apos;avez pas encore de compte client ?{" "}
              <Link href={`/register?redirect=${encodeURIComponent(redirectPath)}`} className="font-extrabold text-indigo-600 hover:underline">
                Créer un compte client (30s)
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuyerLoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
