"use client";

import { useState, useEffect } from "react";
import { 
  Scan, 
  KeyRound, 
  CheckCircle2, 
  Package, 
  Boxes, 
  TrendingUp, 
  AlertCircle,
  Truck,
  UserCheck,
  Sparkles,
  Loader2
} from "lucide-react";
import { supabase } from "@/lib/supabase";

interface PackageLog {
  id: string;
  client: string;
  phone: string;
  status: "ready_for_pickup" | "picked_up" | "returned";
  code: string;
  time: string;
  amount: string;
}

export default function RelayDashboardHome() {
  const [relayCode, setRelayCode] = useState("");
  const [depositCode, setDepositCode] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);

  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Stats
  const [capacity, setCapacity] = useState({ current: 0, max: 100 });
  const [todayPickups, setTodayPickups] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);

  const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);

  // Initial load from Supabase PostgreSQL
  useEffect(() => {
    const code = localStorage.getItem("kalagban_relay_code");
    if (code) setRelayCode(code);

    const loadRealData = async () => {
      // 1. Load Relay Logs
      const { data: logsData } = await supabase
        .from("relay_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (logsData && logsData.length > 0) {
        setPackageLogs(logsData.map((l: Record<string, any>) => ({
          id: l.order_code,
          client: l.customer_name || "Client Kalagban",
          phone: l.customer_phone || "+225 --",
          status: l.action_type === "pickup" ? "picked_up" : "ready_for_pickup",
          code: l.otp_code || "---",
          time: new Date(l.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          amount: "300 FCFA"
        })));

        const pickedUpCount = logsData.filter((l: Record<string, any>) => l.action_type === "pickup").length;
        setTodayPickups(pickedUpCount);
        setTotalCommissions(pickedUpCount * 300);
        
        const inShelfCount = logsData.filter((l: Record<string, any>) => l.action_type === "deposit").length - pickedUpCount;
        setCapacity(prev => ({ ...prev, current: Math.max(0, inShelfCount) }));
      }
    };

    loadRealData();
  }, []);

  // Handle Courier Package Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!depositCode.trim()) return;

    setIsDepositing(true);
    const formattedCode = depositCode.trim().toUpperCase();
    const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();

    // Insert log in Database
    await supabase.from("relay_logs").insert({
      order_code: formattedCode,
      customer_name: "Client Kalagban",
      customer_phone: "+225 0700000000",
      action_type: "deposit",
      otp_code: generatedOtp,
      commission_earned: 300
    });

    // Insert Notification
    await supabase.from("relay_notifications").insert({
      title: "Nouveau Colis Réceptionné",
      message: `Le colis #${formattedCode} a été déposé par le coursier et placé en étagère. Code OTP généré: ${generatedOtp}.`,
      type: "deposit"
    });

    setDepositSuccess(`Colis #${formattedCode} enregistré avec succès en étagère. Code OTP attribué: ${generatedOtp}.`);
    setCapacity(prev => ({ ...prev, current: prev.current + 1 }));
    setPackageLogs(prev => [
      { 
        id: formattedCode, 
        client: "Client Kalagban", 
        phone: "+225 07 00 00 00", 
        status: "ready_for_pickup", 
        code: generatedOtp, 
        time: "À l'instant", 
        amount: "En étagère" 
      },
      ...prev
    ]);
    setDepositCode("");
    setIsDepositing(false);

    setTimeout(() => setDepositSuccess(null), 6000);
  };

  // Handle Customer Pickup via OTP Code Verification
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setOtpSuccess(null);
    setIsVerifyingOtp(true);

    const targetCode = otpCode.trim();

    // First check local logs or Database orders
    const foundLocal = packageLogs.find(p => p.code === targetCode || p.id === targetCode.toUpperCase());

    // Also check Supabase orders
    const { data: dbOrder } = await supabase
      .from("orders")
      .select("*")
      .or(`pickup_code.eq.${targetCode},id.eq.${targetCode}`)
      .maybeSingle();

    if (foundLocal || dbOrder) {
      const orderId = dbOrder?.id || foundLocal?.id || targetCode.toUpperCase();
      const customerName = dbOrder?.customer_name || foundLocal?.client || "Client Kalagban";

      // Update Order Status in Supabase DB if exists
      if (dbOrder) {
        await supabase
          .from("orders")
          .update({ 
            relay_status: "picked_up", 
            status: "delivered", 
            picked_up_at: new Date().toISOString() 
          })
          .eq("id", dbOrder.id);
      }

      // Insert Pickup Log into DB
      await supabase.from("relay_logs").insert({
        order_id: dbOrder?.id || null,
        order_code: orderId,
        customer_name: customerName,
        customer_phone: dbOrder?.customer_phone || "+225 --",
        action_type: "pickup",
        otp_code: targetCode,
        commission_earned: 300
      });

      // Insert Notification in DB
      await supabase.from("relay_notifications").insert({
        title: "Remise Client Confirmée",
        message: `Le colis #${orderId} a été remis au client ${customerName}. Commission de +300 FCFA créditée !`,
        type: "pickup"
      });

      setOtpSuccess(`Code OTP Valide ! Colis #${orderId} remis à ${customerName}. Commission de +300 FCFA créditée !`);
      setPackageLogs(prev => prev.map(p => (p.code === targetCode || p.id === orderId) ? { ...p, status: "picked_up" } : p));
      setCapacity(prev => ({ ...prev, current: Math.max(0, prev.current - 1) }));
      setTodayPickups(prev => prev + 1);
      setTotalCommissions(prev => prev + 300);
      setOtpCode("");
    } else {
      setOtpError("Code OTP ou Numéro de colis invalide. Veuillez vérifier le SMS du client.");
    }

    setIsVerifyingOtp(false);
  };

  return (
    <div className="space-y-6 font-sans">
      
      {/* Hero Welcome Card */}
      <div className="bg-linear-to-r from-gray-900 via-indigo-950 to-gray-900 rounded-3xl p-6 md:p-8 text-white relative overflow-hidden shadow-sm">
        <div className="relative z-10 max-w-2xl space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-amber-300 text-xs font-bold border border-white/10">
            <Sparkles className="w-3.5 h-3.5" />
            <span>PORTAIL OPÉRATIONNEL {relayCode ? `: ${relayCode}` : ""}</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-tight">
            Pilotez vos réceptions et remises de colis en toute simplicité ✨
          </h1>
          <p className="text-sm text-gray-300 font-medium">
            Enregistrez rapidement les arrivages des coursiers et sécurisez la livraison aux clients à l'aide de leur Code OTP à 6 chiffres.
          </p>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Capacity */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Colis en Étagère</p>
              <h3 className="text-3xl font-black text-gray-900 mt-1">
                {capacity.current} <span className="text-sm font-semibold text-gray-400">/ {capacity.max} max</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 text-amber-600 flex items-center justify-center">
              <Boxes className="w-6 h-6" />
            </div>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
            <div 
              className="bg-amber-500 h-full transition-all duration-500 rounded-full"
              style={{ width: `${(capacity.current / capacity.max) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Card 2: Today Handover */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Remises Client Aujourd'hui</p>
              <h3 className="text-3xl font-black text-emerald-600 mt-1">
                {todayPickups} <span className="text-sm font-semibold text-gray-400">colis</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center">
              <UserCheck className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <span>Validées par Code OTP sécurisé</span>
          </p>
        </div>

        {/* Card 3: Total Commissions */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">Commissions Cumulées</p>
              <h3 className="text-3xl font-black text-indigo-600 mt-1">
                {totalCommissions.toLocaleString()} <span className="text-sm font-semibold text-gray-400">FCFA</span>
              </h3>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
          <p className="text-xs text-gray-500 font-medium">Taux fixe : 300 FCFA par colis remis</p>
        </div>

      </div>

      {/* Main Operations Modules Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Module 1: Réception Colis par Coursier */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-11 h-11 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">1. Réception Colis par Coursier</h3>
              <p className="text-xs text-gray-500 font-medium">Enregistrer un colis apporté par le livreur Kalagban</p>
            </div>
          </div>

          {depositSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{depositSuccess}</span>
            </div>
          )}

          <form onSubmit={handleDepositSubmit} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Scanner / Saisir N° de Colis (ex: ORD-9821)
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={depositCode}
                  onChange={(e) => setDepositCode(e.target.value)}
                  placeholder="Scannez ou saisissez le numéro..."
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3.5 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600 transition-all font-mono font-bold text-sm"
                  required
                />
                <Scan className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isDepositing}
              className="w-full py-3.5 px-5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-sm shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isDepositing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Package className="w-4 h-4" />}
              <span>Enregistrer en Étagère Relais</span>
            </button>
          </form>
        </div>

        {/* Module 2: Remise Colis au Client via Code OTP */}
        <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 border border-emerald-100 text-emerald-600 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">2. Remise Colis au Client (Code OTP)</h3>
              <p className="text-xs text-gray-500 font-medium">Valider le code de sécurité à 6 chiffres de l'acheteur</p>
            </div>
          </div>

          {otpSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-medium flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{otpSuccess}</span>
            </div>
          )}

          {otpError && (
            <div className="p-4 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{otpError}</span>
            </div>
          )}

          <form onSubmit={handleOtpVerify} className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-700 uppercase tracking-wider">
                Code OTP à 6 Chiffres Présenté par l'Acheteur
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="ex: 748291"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl py-3.5 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-emerald-600/40 focus:border-emerald-600 transition-all font-mono tracking-widest text-lg font-bold text-center"
                  required
                />
                <KeyRound className="w-5 h-5 text-gray-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={isVerifyingOtp}
              className="w-full py-3.5 px-5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm shadow-md shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserCheck className="w-4 h-4" />}
              <span>Vérifier OTP & Confirmer la Remise</span>
            </button>
          </form>
        </div>

      </div>

      {/* Recent Inventory Movement Table */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="font-extrabold text-gray-900 text-base">Historique Déplacements Récents</h3>
          <span className="text-xs text-gray-500 font-medium">Synchronisé en temps réel avec l'Administration</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3.5 rounded-l-xl">N° Commande</th>
                <th className="px-4 py-3.5">Client</th>
                <th className="px-4 py-3.5">Téléphone</th>
                <th className="px-4 py-3.5">Code OTP</th>
                <th className="px-4 py-3.5">Statut Relais</th>
                <th className="px-4 py-3.5 rounded-r-xl text-right">Horodatage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {packageLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400 font-medium text-xs">
                    Aucun mouvement de colis enregistré pour le moment.
                  </td>
                </tr>
              ) : (
                packageLogs.map((log, idx) => (
                  <tr key={`${log.id}-${idx}`} className="hover:bg-gray-50/80 transition-colors">
                    <td className="px-4 py-4 font-mono font-black text-indigo-600">{log.id}</td>
                    <td className="px-4 py-4 font-bold text-gray-900">{log.client}</td>
                    <td className="px-4 py-4 text-gray-500 font-mono">{log.phone}</td>
                    <td className="px-4 py-4 font-mono text-xs">
                      <span className="bg-gray-100 border border-gray-200 rounded px-2 py-1 inline-block font-bold text-gray-800">{log.code}</span>
                    </td>
                    <td className="px-4 py-4">
                      {log.status === "ready_for_pickup" ? (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200">
                          En Étagère (Prêt)
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Remis au Client
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4 text-right text-xs text-gray-400 font-medium">{log.time}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
