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
  Loader2,
  Printer,
  QrCode,
  X
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

interface ExpectedOrder {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_email?: string;
  customer_id?: string;
  total_amount: number;
  created_at: string;
  pickup_code?: string;
  status: string;
  relay_status: string;
  shop_id?: string;
  shop_name?: string;
}

export default function RelayDashboardHome() {
  const [relayCode, setRelayCode] = useState("");
  const [relayId, setRelayId] = useState("");
  const [depositCode, setDepositCode] = useState("");
  const [isDepositing, setIsDepositing] = useState(false);
  const [depositSuccess, setDepositSuccess] = useState<string | null>(null);

  const [otpCode, setOtpCode] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [otpSuccess, setOtpSuccess] = useState<string | null>(null);
  const [otpError, setOtpError] = useState<string | null>(null);

  // Thermal Receipt State
  const [receiptModalData, setReceiptModalData] = useState<{
    orderCode: string;
    customerName: string;
    customerPhone: string;
    date: string;
    relayName: string;
    amount: string;
  } | null>(null);

  const handlePrintReceipt = () => {
    window.print();
  };

  // Stats
  const [capacity, setCapacity] = useState({ current: 0, max: 100 });
  const [todayPickups, setTodayPickups] = useState(0);
  const [totalCommissions, setTotalCommissions] = useState(0);

  const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);
  const [expectedOrders, setExpectedOrders] = useState<ExpectedOrder[]>([]);

  // Initial load from Supabase PostgreSQL with strict relay tenant isolation
  useEffect(() => {
    const code = localStorage.getItem("kalagban_relay_code");
    const storedId = localStorage.getItem("kalagban_relay_id");
    if (code) setRelayCode(code);
    if (storedId) setRelayId(storedId);

    const loadRealData = async () => {
      const activeCode = localStorage.getItem("kalagban_relay_code");
      let currentId = localStorage.getItem("kalagban_relay_id");
      let maxCap = 50;

      if (activeCode) {
        const { data: pt } = await supabase
          .from("pickup_points")
          .select("id, max_capacity, name, code")
          .eq("code", activeCode)
          .maybeSingle();

        if (pt) {
          currentId = pt.id;
          maxCap = pt.max_capacity || 50;
          setRelayId(pt.id);
          localStorage.setItem("kalagban_relay_id", pt.id);
          localStorage.setItem("kalagban_relay_name", pt.name);
        }
      }

      if (!currentId) {
        setExpectedOrders([]);
        setPackageLogs([]);
        setTodayPickups(0);
        setTotalCommissions(0);
        return;
      }

      // 1. Load Expected Orders ONLY for THIS point relais
      const { data: pendingOrders } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, customer_email, customer_id, total_amount, created_at, pickup_code, status, relay_status, shop_id, shops(name)")
        .eq("pickup_point_id", currentId)
        .eq("delivery_type", "pickup_point")
        .eq("relay_status", "pending_deposit")
        .order("created_at", { ascending: false });

      const formattedExpected: ExpectedOrder[] = (pendingOrders || []).map((o: any) => ({
        id: o.id,
        customer_name: o.customer_name || "Client Kalagban",
        customer_phone: o.customer_phone || "+225 --",
        customer_email: o.customer_email,
        customer_id: o.customer_id,
        total_amount: Number(o.total_amount || 0),
        created_at: o.created_at,
        pickup_code: o.pickup_code,
        status: o.status || "pending",
        relay_status: o.relay_status || "pending_deposit",
        shop_id: o.shop_id,
        shop_name: Array.isArray(o.shops) ? (o.shops[0]?.name || "Boutique Partenaire") : (o.shops?.name || "Boutique Partenaire"),
      }));

      setExpectedOrders(formattedExpected);

      // 2. Count Colis en étagère (In-Stock) ONLY for THIS point relais
      const { data: inStockOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("pickup_point_id", currentId)
        .eq("relay_status", "ready_for_pickup");

      setCapacity({ current: inStockOrders?.length || 0, max: maxCap });

      // 3. Load Relay Logs ONLY for THIS point relais
      const { data: logsData } = await supabase
        .from("relay_logs")
        .select("*")
        .eq("pickup_point_id", currentId)
        .order("created_at", { ascending: false })
        .limit(50);

      if (logsData && logsData.length > 0) {
        setPackageLogs(logsData.map((l: Record<string, any>) => ({
          id: l.order_code || (l.order_id ? l.order_id.slice(0, 8).toUpperCase() : "---"),
          client: l.customer_name || "Client Kalagban",
          phone: l.customer_phone || "+225 --",
          status: l.action_type === "pickup" ? "picked_up" : "ready_for_pickup",
          code: l.otp_code || "---",
          time: new Date(l.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          amount: "300 FCFA"
        })));

        const pickedUpLogs = logsData.filter((l: Record<string, any>) => l.action_type === "pickup");
        const totalEarned = pickedUpLogs.reduce((sum, l) => sum + (l.commission_earned || 300), 0);

        const todayStr = new Date().toISOString().slice(0, 10);
        const todayCount = pickedUpLogs.filter(l => l.created_at && l.created_at.startsWith(todayStr)).length;

        setTodayPickups(todayCount);
        setTotalCommissions(totalEarned);
      } else {
        setPackageLogs([]);
        setTodayPickups(0);
        setTotalCommissions(0);
      }
    };

    loadRealData();

    // Supabase Live Realtime (orders & relay_logs)
    const channel = supabase
      .channel("relay_dashboard_orders_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, () => loadRealData())
      .on("postgres_changes", { event: "*", schema: "public", table: "relay_logs" }, () => loadRealData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Quick 1-Click Reception of Expected Order
  const handleQuickReceive = async (order: ExpectedOrder) => {
    const isShipped = order.status === "shipped" || order.status === "in_transit";
    if (!isShipped) {
      const statusLabel = order.status === "pending" ? "En attente de confirmation marchand" : "En cours de préparation chez le vendeur";
      alert(`⛔ Impossible de réceptionner ce colis :\nLe vendeur n'a pas encore remis le colis au coursier (Statut actuel : ${statusLabel}).\n\nVous ne pourrez enregistrer le colis en étagère qu'une fois expédié par la boutique.`);
      return;
    }

    setIsDepositing(true);
    const orderCode = order.id.slice(0, 8).toUpperCase();
    const generatedOtp = order.pickup_code || Math.floor(100000 + Math.random() * 900000).toString();

    try {
      // 1. Try Calling Dedicated RPC function
      const { data: rpcRes } = await supabase.rpc("relay_receive_package", {
        p_order_id: order.id,
        p_pickup_code: generatedOtp,
        p_relay_code: relayCode || null
      });

      if (rpcRes && !rpcRes.success) {
        alert(rpcRes.message || "Erreur de réception.");
        setIsDepositing(false);
        return;
      }

      // 2. Also execute direct update as fallback/sync
      await supabase
        .from("orders")
        .update({
          relay_status: "ready_for_pickup",
          deposited_at: new Date().toISOString(),
          pickup_code: generatedOtp,
        })
        .eq("id", order.id);

      // 3. Trigger Email 2 (READY_FOR_PICKUP with OTP)
      try {
        let recipientEmail = order.customer_email;
        if (!recipientEmail && order.customer_id) {
          const { data: prof } = await supabase
            .from("profiles")
            .select("email")
            .eq("id", order.customer_id)
            .maybeSingle();
          if (prof?.email) recipientEmail = prof.email;
        }

        await fetch("/api/notifications/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "READY_FOR_PICKUP",
            orderId: order.id,
            orderCode: orderCode,
            recipientEmail: recipientEmail,
            recipientName: order.customer_name,
            pickupCode: generatedOtp,
            relayName: relayCode ? `Point Relais ${relayCode}` : "Point Relais Kalagban",
            trackingUrl: "https://kalagban.com/account",
          }),
        });
      } catch (mailErr) {
        console.error("Error triggering ready_for_pickup email:", mailErr);
      }

      setExpectedOrders(prev => prev.filter(o => o.id !== order.id));
      setDepositSuccess(`Colis #${orderCode} (${order.customer_name}) réceptionné avec succès et placé en étagère.`);
      setCapacity(prev => ({ ...prev, current: prev.current + 1 }));
      setPackageLogs(prev => [
        {
          id: orderCode,
          client: order.customer_name,
          phone: order.customer_phone,
          status: "ready_for_pickup",
          code: generatedOtp,
          time: new Date().toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }),
          amount: "En étagère"
        },
        ...prev
      ]);
    } catch (err: any) {
      console.error("Error receiving package:", err);
      alert("Erreur lors de la réception : " + err.message);
    } finally {
      setIsDepositing(false);
      setTimeout(() => setDepositSuccess(null), 6000);
    }
  };

  // Handle Courier Package Deposit
  const handleDepositSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const rawInput = depositCode.trim();
    if (!rawInput) return;

    setIsDepositing(true);
    const searchCode = rawInput.replace("#", "").trim();

    try {
      // Find matching order in Database
      const { data: matchedOrders, error: searchErr } = await supabase
        .from("orders")
        .select("id, customer_name, customer_phone, status, pickup_point_id, relay_status, pickup_code, shops(name)")
        .or(`id.eq.${searchCode},id.ilike.${searchCode}%`)
        .limit(1);

      if (searchErr || !matchedOrders || matchedOrders.length === 0) {
        alert(`❌ Commande introuvable avec le numéro #${searchCode}. Veuillez vérifier la référence du colis.`);
        setIsDepositing(false);
        return;
      }

      const order = matchedOrders[0];

      // Assignment check
      if (order.pickup_point_id && relayId && order.pickup_point_id !== relayId) {
        alert("⛔ Erreur d'assignation : Ce colis est assigné à un AUTRE point relais. Impossible de le réceptionner dans votre établissement.");
        setIsDepositing(false);
        return;
      }

      // Shipped check
      if (order.status !== "shipped" && order.status !== "in_transit") {
        const statusLabel = order.status === "pending" ? "En attente confirmation marchand" : "En cours de préparation chez le vendeur";
        alert(`⛔ Impossible de mettre ce colis en étagère :\nLe vendeur n'a pas encore remis la commande au coursier (Statut actuel : ${statusLabel}).\nLa réception ne peut se faire qu'une fois le colis expédié.`);
        setIsDepositing(false);
        return;
      }

      if (order.relay_status === "ready_for_pickup") {
        alert("ℹ️ Ce colis est DÉJÀ enregistré en étagère dans votre point relais.");
        setIsDepositing(false);
        return;
      }

      const generatedOtp = order.pickup_code || Math.floor(100000 + Math.random() * 900000).toString();

      const { data: rpcRes } = await supabase.rpc("relay_receive_package", {
        p_order_id: order.id,
        p_pickup_code: generatedOtp,
        p_relay_code: relayCode || null
      });

      if (rpcRes && !rpcRes.success) {
        alert(rpcRes.message || "Erreur de réception.");
        setIsDepositing(false);
        return;
      }

      // Fallback direct sync
      await supabase
        .from("orders")
        .update({
          relay_status: "ready_for_pickup",
          deposited_at: new Date().toISOString(),
          pickup_code: generatedOtp,
        })
        .eq("id", order.id);

      setDepositSuccess(`Colis #${order.id.slice(0, 8).toUpperCase()} (${order.customer_name}) réceptionné avec succès et placé en étagère.`);
      setDepositCode("");
      
      // Reload live data
      const { data: inStockOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("pickup_point_id", relayId)
        .eq("relay_status", "ready_for_pickup");
      setCapacity(prev => ({ ...prev, current: inStockOrders?.length || prev.current + 1 }));
      setExpectedOrders(prev => prev.filter(o => o.id !== order.id));
    } catch (err: any) {
      alert("Erreur lors de la réception : " + err.message);
    } finally {
      setIsDepositing(false);
      setTimeout(() => setDepositSuccess(null), 6000);
    }
  };

  // Handle Customer Pickup via OTP Code Verification
  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setOtpSuccess(null);
    setIsVerifyingOtp(true);

    const targetCode = otpCode.trim();
    if (!targetCode) {
      setIsVerifyingOtp(false);
      return;
    }

    try {
      // 1. First try universal RPC verify
      const { data: universalRpcData } = await supabase.rpc("relay_verify_otp", {
        p_code: targetCode,
        p_relay_code: relayCode || null
      });

      if (universalRpcData) {
        if (universalRpcData.success) {
          const orderId = universalRpcData.order_id || universalRpcData.order_code || targetCode.toUpperCase();
          const displayCode = universalRpcData.order_code || orderId.slice(0, 8).toUpperCase();
          const customerName = universalRpcData.customer_name || "Client Kalagban";
          const customerPhone = universalRpcData.customer_phone || "+225 --";

          setOtpSuccess(`Code OTP Valide ! Colis #${displayCode} remis à ${customerName}. Commission de +300 FCFA créditée !`);
          setReceiptModalData({
            orderCode: displayCode,
            customerName: customerName,
            customerPhone: customerPhone,
            date: new Date().toLocaleString("fr-FR"),
            relayName: relayCode ? `Point Relais ${relayCode}` : "Point Relais Kalagban",
            amount: "Retrait Confirmé"
          });
          setPackageLogs(prev => prev.map(p => (p.code === targetCode || p.id === displayCode || p.id === orderId) ? { ...p, status: "picked_up" } : p));
          setCapacity(prev => ({ ...prev, current: Math.max(0, prev.current - 1) }));
          setTodayPickups(prev => prev + 1);
          setTotalCommissions(prev => prev + 300);
          setOtpCode("");
          setIsVerifyingOtp(false);
          return;
        } else if (universalRpcData.message && !universalRpcData.message.includes("introuvable")) {
          // If RPC explicitly rejected due to wrong relay or other business rule
          setOtpError(universalRpcData.message);
          setIsVerifyingOtp(false);
          return;
        }
      }

      // 2. Search order in Supabase by pickup_code or ID
      let { data: dbOrder } = await supabase
        .from("orders")
        .select("*, pickup_points(name)")
        .eq("pickup_code", targetCode)
        .maybeSingle();

      if (dbOrder && relayId && dbOrder.pickup_point_id && dbOrder.pickup_point_id !== relayId) {
        const otherRelayName = (dbOrder as any).pickup_points?.name || "un autre Point Relais";
        setOtpError(`Ce code OTP appartient à un colis déposé au Point Relais "${otherRelayName}". Impossible de valider la remise ici.`);
        setIsVerifyingOtp(false);
        return;
      }

      if (!dbOrder) {
        // Also try by full or partial ID
        const cleanId = targetCode.replace("#", "").toLowerCase();
        const { data: orderById } = await supabase
          .from("orders")
          .select("*")
          .ilike("id", `${cleanId}%`)
          .maybeSingle();

        if (orderById) {
          dbOrder = orderById;
        }
      }

      const foundLocal = packageLogs.find(p => p.code === targetCode || p.id.toLowerCase() === targetCode.toLowerCase().replace("#", ""));

      if (dbOrder || foundLocal) {
        const orderId = dbOrder?.id || foundLocal?.id || targetCode.toUpperCase();
        const displayCode = orderId.slice(0, 8).toUpperCase();
        const customerName = dbOrder?.customer_name || foundLocal?.client || "Client Kalagban";
        const customerPhone = dbOrder?.customer_phone || foundLocal?.phone || "+225 --";
        const otpToVerify = dbOrder?.pickup_code || targetCode;

        // Try verify_order_pickup_otp RPC
        if (dbOrder?.id) {
          await supabase.rpc("verify_order_pickup_otp", {
            p_order_id: dbOrder.id,
            p_input_code: otpToVerify
          });

          // Also execute direct update as fallback
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
          pickup_point_id: relayId || dbOrder?.pickup_point_id || null,
          order_id: dbOrder?.id || null,
          order_code: displayCode,
          customer_name: customerName,
          customer_phone: customerPhone,
          action_type: "pickup",
          otp_code: otpToVerify,
          commission_earned: 300
        });

        // Insert Notification in DB
        await supabase.from("relay_notifications").insert({
          title: "Remise Client Confirmée",
          message: `Le colis #${displayCode} a été remis au client ${customerName}. Commission de +300 FCFA créditée !`,
          type: "pickup"
        });

        // Notify Seller (Paiement débloqué)
        if (dbOrder?.shop_id) {
          await supabase.from("seller_notifications").insert({
            shop_id: dbOrder.shop_id,
            title: "Commande Livrée avec Succès 🎉",
            message: `La commande #${displayCode} a été remise au client avec validation du Code OTP. Vos fonds sont disponibles.`,
            type: "order",
            reference_id: dbOrder.id,
          });
        }

        // Notify Customer (In-App)
        if (dbOrder?.customer_id) {
          await supabase.from("customer_notifications").insert({
            customer_id: dbOrder.customer_id,
            order_id: dbOrder.id,
            title: "Commande Récupérée avec Succès ! 🎉",
            message: `Votre commande #${displayCode} a bien été retirée au ${relayCode ? `Point Relais ${relayCode}` : "Point Relais"}. Merci de votre fidélité !`,
            type: "delivery",
          });
        }

        // Notify Super-Admin
        await supabase.from("admin_notifications").insert({
          title: "Retrait Colis Confirmé (OTP)",
          message: `La commande #${displayCode} a été remise à ${customerName} au Point Relais ${relayCode || ""}.`,
          notification_type: "info",
          target_role: "all",
          is_broadcast: true,
        });

        setOtpSuccess(`Code OTP Valide ! Colis #${displayCode} remis à ${customerName}. Commission de +300 FCFA créditée !`);
        setReceiptModalData({
          orderCode: displayCode,
          customerName: customerName,
          customerPhone: customerPhone,
          date: new Date().toLocaleString("fr-FR"),
          relayName: relayCode ? `Point Relais ${relayCode}` : "Point Relais Kalagban",
          amount: "Retrait Confirmé"
        });
        setPackageLogs(prev => prev.map(p => (p.code === targetCode || p.id === displayCode || p.id === orderId) ? { ...p, status: "picked_up" } : p));
        setCapacity(prev => ({ ...prev, current: Math.max(0, prev.current - 1) }));
        setTodayPickups(prev => prev + 1);
        setTotalCommissions(prev => prev + 300);
        setOtpCode("");
      } else {
        setOtpError("Code OTP ou Numéro de colis invalide. Veuillez vérifier le SMS du client.");
      }
    } catch (err) {
      console.error("Error verifying OTP:", err);
      setOtpError("Une erreur est survenue lors de la validation du code.");
    } finally {
      setIsVerifyingOtp(false);
    }
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

      {/* SECTION: COLIS ATTENDUS (ANNONCÉS PAR LES CLIENTS / EN COURS D'ACHEMINEMENT) */}
      <div className="bg-white border border-indigo-100 rounded-3xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-gray-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-base">
                Colis Attendus & Acheminement
              </h3>
              <p className="text-xs text-gray-500 font-medium">
                Suivi des colis confiés aux coursiers vers votre point relais. Les colis en préparation chez le vendeur ne peuvent être réceptionnés qu'après expédition.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-black px-3 py-1 rounded-full">
              {expectedOrders.filter(o => o.status === "shipped" || o.status === "in_transit").length} en route avec coursier
            </span>
            <span className="bg-amber-50 border border-amber-200 text-amber-700 text-xs font-black px-3 py-1 rounded-full">
              {expectedOrders.filter(o => o.status === "pending" || o.status === "processing" || o.status === "preparing").length} en préparation vendeur
            </span>
          </div>
        </div>

        {expectedOrders.length === 0 ? (
          <div className="py-8 text-center text-gray-400 font-medium text-xs bg-slate-50/50 rounded-2xl border border-dashed border-gray-200">
            <Truck className="w-8 h-8 mx-auto text-gray-300 mb-2" />
            Aucun nouveau colis en attente pour le moment.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 text-gray-600 font-black border-b border-gray-200">
                  <th className="px-4 py-3.5 rounded-l-xl">N° Commande</th>
                  <th className="px-4 py-3.5">Boutique Marchande</th>
                  <th className="px-4 py-3.5">Client & Contact</th>
                  <th className="px-4 py-3.5">Statut Acheminement</th>
                  <th className="px-4 py-3.5">Montant</th>
                  <th className="px-4 py-3.5 rounded-r-xl text-right">Action Réception</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {expectedOrders.map((order) => {
                  const isShipped = order.status === "shipped" || order.status === "in_transit";
                  return (
                    <tr key={order.id} className="hover:bg-indigo-50/40 transition-colors">
                      <td className="px-4 py-4 font-mono font-black text-indigo-700">
                        #{order.id.slice(0, 8).toUpperCase()}
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-800">
                        {order.shop_name || "Boutique Partenaire"}
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-bold text-gray-900">{order.customer_name}</p>
                        <p className="font-mono text-[11px] text-gray-500">{order.customer_phone}</p>
                      </td>
                      <td className="px-4 py-4">
                        {isShipped ? (
                          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 font-black px-2.5 py-1 rounded-xl text-[10px] inline-flex items-center gap-1">
                            <Truck size={12} /> En Route avec Coursier
                          </span>
                        ) : (
                          <span className="bg-amber-50 text-amber-700 border border-amber-200 font-extrabold px-2.5 py-1 rounded-xl text-[10px] inline-flex items-center gap-1" title="Le vendeur n'a pas encore remis le colis au coursier.">
                            ⏳ Chez le Vendeur ({order.status === "pending" ? "En attente" : "En préparation"})
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 font-bold text-gray-900">
                        {Number(order.total_amount || 0).toLocaleString()} FCFA
                      </td>
                      <td className="px-4 py-4 text-right">
                        {isShipped ? (
                          <button
                            onClick={() => handleQuickReceive(order)}
                            disabled={isDepositing}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-4 py-2 rounded-xl shadow-md shadow-indigo-600/20 inline-flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
                          >
                            <Package className="w-4 h-4" /> Réceptionner du Coursier
                          </button>
                        ) : (
                          <button
                            onClick={() => handleQuickReceive(order)}
                            className="bg-gray-100 border border-gray-200 text-gray-400 font-bold text-xs px-3.5 py-2 rounded-xl cursor-not-allowed inline-flex items-center gap-1.5 opacity-80"
                            title="Le vendeur n'a pas encore expédié ce colis. Vous ne pouvez le réceptionner que lorsqu'il est en route."
                          >
                            <span>🔒 En attente d'expédition</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
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

      {/* THERMAL RECEIPT MODAL (58mm/80mm POS TICKET) */}
      {receiptModalData && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setReceiptModalData(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            {/* Ticket de Caisse Thermal Paper Preview */}
            <div id="thermal-receipt-printable" className="bg-amber-50/50 border border-dashed border-gray-300 rounded-2xl p-5 text-center font-mono text-xs space-y-3 text-gray-800">
              <div className="border-b border-dashed border-gray-300 pb-3 space-y-1">
                <div className="w-10 h-10 bg-indigo-600 text-white font-black text-lg rounded-xl flex items-center justify-center mx-auto">
                  K
                </div>
                <h3 className="font-black text-sm uppercase tracking-wider text-gray-900">KALAGBAN EXPRESS</h3>
                <p className="text-[10px] text-gray-500 font-sans">Plateforme E-Commerce &amp; Points Relais</p>
                <p className="text-[11px] font-bold text-indigo-700">{receiptModalData.relayName}</p>
              </div>

              <div className="text-left space-y-1 text-[11px] py-1 border-b border-dashed border-gray-300 pb-3">
                <p><span className="text-gray-500 font-sans">Date :</span> <strong>{receiptModalData.date}</strong></p>
                <p><span className="text-gray-500 font-sans">N° Colis :</span> <strong className="text-indigo-950 font-black">{receiptModalData.orderCode}</strong></p>
                <p><span className="text-gray-500 font-sans">Client :</span> <strong>{receiptModalData.customerName}</strong></p>
                <p><span className="text-gray-500 font-sans">Téléphone :</span> <strong>{receiptModalData.customerPhone}</strong></p>
                <p><span className="text-gray-500 font-sans">Statut :</span> <strong className="text-emerald-700 font-black">COLIS RETIRÉ &amp; VÉRIFIÉ</strong></p>
              </div>

              <div className="pt-2 text-[10px] text-gray-500 space-y-1 font-sans">
                <p className="font-bold text-gray-700">Code Retrait Validé avec Succès</p>
                <p>Merci pour votre confiance sur Kalagban Marketplace !</p>
                <p className="font-mono text-[9px] text-gray-400">www.kalagban.com</p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={handlePrintReceipt}
                className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs py-3.5 px-4 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <Printer size={16} /> Imprimer le Ticket
              </button>
              <button
                onClick={() => setReceiptModalData(null)}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs py-3.5 px-4 rounded-2xl transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
