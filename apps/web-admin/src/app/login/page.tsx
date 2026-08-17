"use client";

import React, { useState, Suspense } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldCheck, Lock, Mail, Eye, EyeOff, Loader2, Sparkles, KeyRound } from "lucide-react";
import { AdminRole } from "@/lib/rbac";

function AdminLoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg("");

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      if (data.user) {
        // Fetch profile to redirect to appropriate space
        const { data: profile } = await supabase
          .from("profiles")
          .select("admin_role")
          .eq("id", data.user.id)
          .single();

        const role = (profile?.admin_role || "super_admin") as AdminRole;

        switch (role) {
          case "logistician":
            router.push("/relays");
            break;
          case "accountant":
            router.push("/finance");
            break;
          case "moderator":
            router.push("/products-moderation");
            break;
          case "developer":
            router.push("/cms");
            break;
          case "marketing_manager":
            router.push("/marketing");
            break;
          case "support_agent":
            router.push("/support");
            break;
          case "risk_manager":
            router.push("/risk");
            break;
          case "seller_manager":
            router.push("/shops");
            break;
          case "analyst":
            router.push("/analytics");
            break;
          default:
            router.push("/");
            break;
        }
      }
    } catch (err: unknown) {
      console.error("Admin login error:", err);
      const rawMsg = (err as { message?: string })?.message;
      const msg = typeof rawMsg === "string" ? rawMsg : "Email ou mot de passe incorrect.";
      setErrorMsg(msg === "Invalid login credentials" ? "Email ou mot de passe incorrect." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] text-gray-900 p-4 sm:p-6">
      <div className="bg-white rounded-3xl p-8 sm:p-10 max-w-md w-full border border-gray-100 shadow-xl space-y-6">
        
        {/* Header Logo */}
        <div className="text-center space-y-3">
          <div className="w-16 h-16 bg-[#6d28d9] rounded-2xl flex items-center justify-center mx-auto text-white font-black text-3xl shadow-lg shadow-indigo-600/30">
            K
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-gray-900">Kalagban Back-Office</h1>
            <p className="text-xs text-indigo-600 font-bold flex items-center justify-center gap-1.5 mt-1">
              <Sparkles size={14} /> Espace Connexion Administrateur &amp; Collaborateurs
            </p>
          </div>
        </div>

        {/* Default Super Admin Credentials Box */}
        <div className="bg-indigo-50/80 border border-indigo-200/80 rounded-2xl p-4 space-y-1 text-xs">
          <span className="font-black text-indigo-900 flex items-center gap-1.5">
            <KeyRound size={14} className="text-[#6d28d9]" /> Compte Super Admin par Défaut :
          </span>
          <div className="text-gray-700 font-mono text-[11px] pt-1 space-y-0.5">
            <p><span className="text-gray-500 font-sans font-medium">Email :</span> <strong className="text-indigo-950 font-bold">admin@kalagban.com</strong></p>
            <p><span className="text-gray-500 font-sans font-medium">Mot de passe :</span> <strong className="text-indigo-950 font-bold">password123</strong></p>
          </div>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-xs font-extrabold p-3.5 rounded-2xl text-center">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Adresse Email Administrateur</label>
            <div className="relative flex items-center">
              <Mail size={16} className="absolute left-3.5 text-gray-400" />
              <input
                type="email"
                required
                placeholder="admin@kalagban.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-3 text-xs font-semibold outline-hidden focus:border-indigo-600 focus:bg-white text-gray-900 transition-all"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-bold text-gray-700">Mot de Passe</label>
            <div className="relative flex items-center">
              <Lock size={16} className="absolute left-3.5 text-gray-400" />
              <input
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-gray-200 rounded-2xl pl-10 pr-12 py-3 text-xs font-semibold outline-hidden focus:border-indigo-600 focus:bg-white text-gray-900 transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-gray-400 hover:text-gray-600 p-1 rounded-md"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#6d28d9] hover:bg-indigo-700 text-white font-black text-xs py-3.5 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-4"
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
            {loading ? "Connexion en cours..." : "Accéder au Panneau Admin"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f8fafc] flex items-center justify-center text-gray-900 font-bold text-sm">Chargement de la page de connexion...</div>}>
      <AdminLoginForm />
    </Suspense>
  );
}
