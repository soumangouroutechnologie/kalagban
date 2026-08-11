"use client";

import React, { useState, Suspense } from "react";
import Link from "next/link";
import { ArrowLeft, Mail, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { supabase } from "@/lib/supabase";

function ForgotPasswordContent() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isSent, setIsSent] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");

    if (!email) {
      setErrorMsg("Veuillez entrer votre adresse email.");
      setIsLoading(false);
      return;
    }

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });

      if (error) {
        setErrorMsg("Erreur : " + error.message);
      } else {
        setIsSent(true);
      }
    } catch (err: unknown) {
      console.error("Reset password exception:", err);
      setErrorMsg("Une erreur inattendue est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <Link href="/login" className="inline-flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-indigo-600 mb-6 transition-colors mx-auto w-fit">
          <ArrowLeft size={16} />
          Retour à la page de connexion
        </Link>

        <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl mx-auto mb-4 shadow-lg shadow-indigo-600/30">
          K
        </div>

        <h2 className="text-center text-3xl font-black text-gray-900 tracking-tight">
          Mot de passe oublié ?
        </h2>
        <p className="mt-2 text-center text-sm text-gray-500 font-medium">
          Saisissez votre email pour recevoir les instructions de réinitialisation.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-xl rounded-3xl border border-gray-100 sm:px-10">
          
          {isSent ? (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-6 rounded-2xl text-center space-y-3">
              <div className="w-12 h-12 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 size={24} />
              </div>
              <h3 className="font-extrabold text-base">Email envoyé ! 🎉</h3>
              <p className="text-xs text-emerald-700 font-medium leading-relaxed">
                Si un compte correspond à l&apos;adresse <strong>{email}</strong>, un lien de réinitialisation vous a été envoyé.
              </p>
              <div className="pt-2">
                <Link href="/login" className="inline-block bg-emerald-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl shadow-sm">
                  Retourner à la connexion
                </Link>
              </div>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleResetPassword}>
              {errorMsg && (
                <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-xs font-bold flex items-center gap-2">
                  <AlertCircle size={18} className="shrink-0 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-700 mb-2">
                  Adresse Email de votre compte *
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

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-70"
              >
                {isLoading ? <Loader2 className="animate-spin" size={18} /> : <Mail size={18} />}
                {isLoading ? "Envoi..." : "Réinitialiser mon mot de passe"}
              </button>
            </form>
          )}

          <div className="mt-8 pt-6 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-500 font-medium">
              Vous vous souvenez de votre mot de passe ?{" "}
              <Link href="/login" className="font-extrabold text-indigo-600 hover:underline">
                Se connecter
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function BuyerForgotPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-indigo-600" size={32} />
      </div>
    }>
      <ForgotPasswordContent />
    </Suspense>
  );
}
