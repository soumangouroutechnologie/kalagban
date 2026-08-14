"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Building2, KeyRound, ShieldCheck, ArrowRight, Eye, EyeOff } from "lucide-react";

import { supabase } from "@/lib/supabase";

export default function RelayLoginPage() {
  const router = useRouter();
  const [relayCode, setRelayCode] = useState("");
  const [pinCode, setPinCode] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const formattedCode = relayCode.trim().toUpperCase();

      // Check if pickup_point exists in Supabase
      const { data: relayPoint, error: dbError } = await supabase
        .from("pickup_points")
        .select("*")
        .eq("code", formattedCode)
        .maybeSingle();

      if (dbError || !relayPoint) {
        setError("Code Point Relais introuvable ou supprimé par l'Administration.");
        setIsLoading(false);
        return;
      }

      if (relayPoint.status === "suspended") {
        setError("Ce point relais est actuellement suspendu par l'Administration.");
        setIsLoading(false);
        return;
      }

      const expectedPin =
        relayPoint.pin_code ||
        (relayPoint.email && relayPoint.email.startsWith("pin:")
          ? relayPoint.email.replace("pin:", "")
          : null);

      if (expectedPin && pinCode.trim() === expectedPin) {
        localStorage.setItem("kalagban_relay_code", formattedCode);
        router.push("/");
        return;
      } else {
        setError("Code PIN d'accès incorrect pour ce Point Relais.");
        setIsLoading(false);
        return;
      }
    } catch (err) {
      console.error("Login verification error:", err);
      setError("Erreur de connexion au serveur de sécurité. Impossible de vérifier vos accès.");
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4 font-sans text-gray-900">
      <div className="w-full max-w-md bg-white border border-gray-100 rounded-3xl p-8 shadow-xl space-y-6">
        <div className="text-center space-y-3">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 shadow-sm">
            <Building2 className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Portail Point Relais</h1>
          <p className="text-xs font-medium text-gray-500">Espace Partenaire de Réception & Remise Colis Kalagban</p>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Code Identifiant Point Relais
            </label>
            <div className="relative">
              <input
                type="text"
                value={relayCode}
                onChange={(e) => setRelayCode(e.target.value)}
                placeholder="Ex: REL-ABJ-001"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3.5 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-all uppercase font-mono font-bold text-sm"
                required
              />
              <Building2 className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
              Code PIN d'Accès Sécurisé
            </label>
            <div className="relative">
              <input
                type={showPin ? "text" : "password"}
                value={pinCode}
                onChange={(e) => setPinCode(e.target.value)}
                placeholder="••••••"
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3.5 px-4 pl-11 pr-11 focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-all font-mono tracking-widest text-lg font-bold"
                required
              />
              <KeyRound className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
              <button
                type="button"
                onClick={() => setShowPin(!showPin)}
                className="absolute right-3.5 top-3.5 text-gray-400 hover:text-gray-700 transition-colors cursor-pointer"
                title={showPin ? "Masquer le code PIN" : "Afficher le code PIN"}
              >
                {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-4 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/25 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <span>Connexion au Point Relais...</span>
              ) : (
                <>
                  <span>Accéder à mon Espace Relais</span>
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        </form>

        <div className="pt-4 border-t border-gray-100 text-center">
          <div className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>Supervision & Contrôle à Distance Sécurisé</span>
          </div>
        </div>
      </div>
    </div>
  );
}
