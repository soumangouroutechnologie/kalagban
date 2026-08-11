"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import { Mail, ArrowRight, ShieldCheck, Loader2, KeyRound } from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMsg("");
    setSuccessMsg("");
    
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    if (error) {
      setErrorMsg("Erreur lors de la réinitialisation : " + error.message);
      setIsLoading(false);
      return;
    }
    
    setSuccessMsg("Un email de réinitialisation vous a été envoyé. Vérifiez votre boîte de réception.");
    setIsLoading(false);
  };

  return (
    <div className="flex w-full h-screen overflow-y-auto bg-white">
      
      {/* LEFT SIDE : FORGOT PASSWORD FORM */}
      <div className="w-full lg:w-1/2 flex flex-col justify-center px-8 sm:px-16 md:px-24 py-10 bg-white relative z-10 shadow-2xl">
        <div className="w-full max-w-md mx-auto my-auto">
          {/* Logo Kalagban */}
          <div className="flex items-center gap-2 mb-12">
            <div className="w-10 h-10 bg-linear-to-br from-primary to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-primary/30">
              K
            </div>
            <span className="text-2xl font-black tracking-tight text-gray-900">Kalagban</span>
          </div>

          <div className="mb-10">
            <div className="w-12 h-12 bg-indigo-50 text-primary rounded-2xl flex items-center justify-center mb-6 border border-indigo-100">
              <KeyRound size={24} />
            </div>
            <h1 className="text-4xl font-extrabold text-gray-900 mb-3 tracking-tight">Mot de passe oublié ?</h1>
            <p className="text-gray-500 font-medium">Entrez l&apos;adresse email associée à votre compte vendeur et nous vous enverrons un lien pour réinitialiser votre mot de passe.</p>
            <p className="text-orange-600/80 font-medium text-sm mt-2 p-3 bg-orange-50 rounded-xl border border-orange-100">
              Note : Si vous vous êtes inscrit avec un numéro de téléphone, veuillez contacter le support pour réinitialiser votre mot de passe.
            </p>
          </div>

          <form className="flex flex-col gap-5" onSubmit={handleResetPassword}>
            {errorMsg && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl text-sm font-medium border border-red-100">
                {errorMsg}
              </div>
            )}
            {successMsg && (
              <div className="bg-green-50 text-green-600 p-4 rounded-xl text-sm font-medium border border-green-100">
                {successMsg}
              </div>
            )}

            {/* Email Input */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-gray-700">Adresse Email</label>
              <div className="relative">
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="votre@email.com" 
                  required
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3.5 px-4 pl-12 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
                <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={isLoading || successMsg !== ""}
              className="w-full bg-primary text-white font-bold text-lg rounded-2xl py-4 mt-4 shadow-lg shadow-primary/30 hover:bg-indigo-600 hover:shadow-indigo-600/40 transform hover:-translate-y-1 transition-all flex justify-center items-center gap-2 group disabled:opacity-70 disabled:hover:translate-y-0"
            >
              {isLoading ? <Loader2 className="animate-spin" size={24} /> : (
                <>
                  Envoyer le lien
                  <ArrowRight className="group-hover:translate-x-1 transition-transform" size={20} />
                </>
              )}
            </button>
          </form>

          {/* Sign in link */}
          <p className="mt-8 text-center text-gray-600 font-medium">
            <Link href="/login" className="text-primary font-bold hover:underline flex items-center justify-center gap-2">
              <ArrowRight size={16} className="rotate-180" /> Retour à la connexion
            </Link>
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
          <h2 className="text-4xl font-black mb-6 leading-tight">Sécurité avant tout.</h2>
          <p className="text-lg text-white/80 font-medium">
            La sécurité de votre boutique est notre priorité. Réinitialisez votre accès en toute confiance pour reprendre vos ventes.
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
