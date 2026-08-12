"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeft, 
  Mail, 
  User, 
  Phone, 
  Loader2, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck
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

  const [authStep, setAuthStep] = useState<"form" | "otp">("form");
  const [otpCode, setOtpCode] = useState("");
  const [countdown, setCountdown] = useState(60);
  const [canResend, setCanResend] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Countdown timer for OTP
  React.useEffect(() => {
    let timer: ReturnType<typeof setInterval> | undefined;
    if (authStep === "otp" && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            setCanResend(true);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [authStep, countdown]);

  const getCleanPhone = () => {
    let clean = phone.replace(/\D/g, "");
    if (clean.length === 10 && (clean.startsWith("07") || clean.startsWith("05") || clean.startsWith("01"))) {
      clean = "225" + clean;
    }
    return clean.startsWith("+") ? clean : "+" + clean;
  };

  // Send OTP
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");

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

    if (authMethod === "email" && (!email || !email.includes("@"))) {
      setErrorMsg("Veuillez entrer une adresse email valide.");
      setIsLoading(false);
      return;
    }

    try {
      if (authMethod === "email") {
        const { error } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: {
            shouldCreateUser: true,
            data: {
              full_name: fullName,
              role: "buyer"
            }
          }
        });
        if (error) throw error;
      } else {
        const formatted = getCleanPhone();
        const { error } = await supabase.auth.signInWithOtp({
          phone: formatted,
          options: {
            shouldCreateUser: true,
            data: {
              full_name: fullName,
              role: "buyer"
            }
          }
        });
        if (error) throw error;
      }

      setAuthStep("otp");
      setCountdown(60);
      setCanResend(false);
      setSuccessMsg(`Un code de validation a été envoyé à ${authMethod === "email" ? email : phone}.`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Impossible d'envoyer le code de vérification.";
      setErrorMsg(msg);
    } finally {
      setIsLoading(false);
    }
  };

  // Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (!otpCode || otpCode.trim().length < 6) {
      setErrorMsg("Veuillez saisir le code complet à 6 chiffres.");
      setIsLoading(false);
      return;
    }

    try {
      let authRes;
      if (authMethod === "email") {
        authRes = await supabase.auth.verifyOtp({
          email: email.trim(),
          token: otpCode.trim(),
          type: "email"
        });
      } else {
        const formatted = getCleanPhone();
        authRes = await supabase.auth.verifyOtp({
          phone: formatted,
          token: otpCode.trim(),
          type: "sms"
        });
      }

      if (authRes.error) throw authRes.error;

      if (authRes.data.user) {
        await supabase.from("profiles").upsert({
          id: authRes.data.user.id,
          full_name: fullName,
          phone: authMethod === "phone" ? phone : null,
          email: authMethod === "email" ? email : null,
          role: "buyer"
        });
      }

      router.push(redirectPath);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Code de validation invalide ou expiré.";
      setErrorMsg(msg);
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

          {successMsg && (
            <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
              <CheckCircle2 size={18} className="shrink-0 text-emerald-500" />
              <span>{successMsg}</span>
            </div>
          )}

          {authStep === "otp" ? (
            /* === OTP STEP === */
            <form className="space-y-5" onSubmit={handleVerifyOtp}>
              <div className="text-center py-2">
                <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-3 border border-indigo-100">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="text-lg font-black text-gray-900">Vérification de Sécurité</h3>
                <p className="text-xs text-gray-500 mt-1">
                  Saisissez le code à 6 chiffres envoyé à{" "}
                  <span className="font-bold text-gray-900">{authMethod === "email" ? email : phone}</span>
                </p>
              </div>

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-1.5 text-center">
                  Code de Confirmation (6 chiffres)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  placeholder="• • • • • •"
                  className="w-full bg-gray-50 border-2 border-indigo-600 text-gray-900 rounded-2xl py-3 px-4 text-center font-black text-2xl tracking-[10px] focus:ring-4 focus:ring-indigo-600/20 focus:border-indigo-600 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading || otpCode.length < 6}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                <span>{isLoading ? "Validation en cours..." : "Valider et Continuer"}</span>
              </button>

              <div className="flex items-center justify-center gap-2 text-xs font-medium text-gray-500 pt-2">
                <span>Pas reçu de code ?</span>
                {canResend ? (
                  <button
                    type="button"
                    onClick={() => handleSendOtp()}
                    disabled={isLoading}
                    className="font-extrabold text-indigo-600 hover:underline"
                  >
                    Renvoyer le code
                  </button>
                ) : (
                  <span className="font-bold text-gray-400">Renvoyer dans {countdown}s</span>
                )}
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setAuthStep("form");
                    setErrorMsg("");
                    setSuccessMsg("");
                  }}
                  className="text-xs font-bold text-gray-500 hover:text-gray-900 transition-colors"
                >
                  ← Modifier mon {authMethod === "email" ? "email" : "numéro"}
                </button>
              </div>
            </form>
          ) : (
            /* === FORM STEP === */
            <form className="space-y-4" onSubmit={handleSendOtp}>
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed mt-2"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <CheckCircle2 size={18} />}
                <span>
                  {isLoading ? "Traitement..." : "Créer mon Compte Client ➔"}
                </span>
              </button>
            </form>
          )}

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
