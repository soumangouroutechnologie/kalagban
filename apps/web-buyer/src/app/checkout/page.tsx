"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { calculateApplicationFee } from "@/lib/fee";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  ShoppingBag, 
  User, 
  MapPin, 
  Loader2, 
  Lock,
  UserCheck,
  AlertCircle,
  CreditCard,
  ShieldCheck
} from "lucide-react";

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, totalPrice, clearCart } = useCart();

  const [user, setUser] = useState<unknown | null>(null);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [city, setCity] = useState("Abidjan");
  const [district, setDistrict] = useState("");
  const [notes, setNotes] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("kpay"); // 'kpay' | 'cod'
  const [deliveryType, setDeliveryType] = useState<"home_delivery" | "pickup_point">("pickup_point");
  const [selectedCommune, setSelectedCommune] = useState("");
  const [selectedRelayId, setSelectedRelayId] = useState("");
  const [communesList, setCommunesList] = useState<Array<{ id: string; name: string; code: string; color_hex?: string }>>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [availableRelays, setAvailableRelays] = useState<Array<{ id: string; code: string; name: string; commune: string; address: string; manager_name?: string; phone?: string; color_code?: string }>>([]);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setUser(session.user);
        
        // Fetch profile info
        const { data: profile } = await supabase
          .from("profiles")
          .select("full_name, phone")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profile) {
          if (profile.full_name) setCustomerName(profile.full_name);
          if (profile.phone) setCustomerPhone(profile.phone);
        }
      }

      // 1. Fetch Real Communes
      const { data: dbCommunes } = await supabase
        .from("communes")
        .select("id, name, code, color_hex")
        .order("display_order", { ascending: true });

      // 2. Fetch Real Active Pickup Points created by Admin
      const { data: pointsData } = await supabase
        .from("pickup_points")
        .select("id, code, name, commune, address, manager_name, phone, color_code")
        .eq("status", "active");

      const rawPoints = pointsData || [];
      setAvailableRelays(rawPoints);

      let finalCommunes = dbCommunes || [];
      if (finalCommunes.length === 0 && rawPoints.length > 0) {
        const uniqueNames = Array.from(new Set(rawPoints.map(p => p.commune)));
        finalCommunes = uniqueNames.map(name => ({
          id: name,
          name,
          code: name.substring(0, 3).toUpperCase(),
          color_hex: "#6366F1"
        }));
      }
      setCommunesList(finalCommunes);

      if (rawPoints.length > 0) {
        const defaultCommune = rawPoints[0].commune;
        setSelectedCommune(defaultCommune);
        setSelectedRelayId(rawPoints[0].code || rawPoints[0].id);
        setDistrict(defaultCommune);
      } else if (finalCommunes.length > 0) {
        setSelectedCommune(finalCommunes[0].name);
        setDistrict(finalCommunes[0].name);
        setSelectedRelayId("");
      }

      setIsLoadingAuth(false);
    };

    checkAuth();
  }, []);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
            <ShoppingBag size={40} />
          </div>
          <h2 className="text-2xl font-black text-gray-900 mb-2">Votre panier est vide</h2>
          <p className="text-gray-500 mb-6 font-medium">Ajoutez des produits avant de passer votre commande.</p>
          <Link href="/" className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30">
            Découvrir les produits
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg("");

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      setErrorMsg("Vous devez être connecté à votre compte client pour valider votre commande.");
      setIsSubmitting(false);
      return;
    }

    if (!customerName || !customerPhone || !district) {
      setErrorMsg("Veuillez remplir tous les champs obligatoires (*)");
      setIsSubmitting(false);
      return;
    }

    try {
      // 0. Verify real-time stock availability
      const productIds = Array.from(new Set(cart.map((i) => i.productId)));
      const { data: currentProducts } = await supabase
        .from("products")
        .select("id, title, stock_quantity")
        .in("id", productIds);

      if (currentProducts) {
        for (const cartItem of cart) {
          const matching = currentProducts.find((p) => p.id === cartItem.productId);
          if (matching && cartItem.quantity > matching.stock_quantity) {
            setErrorMsg(`Stock insuffisant pour "${matching.title}". Il ne reste que ${matching.stock_quantity} unité(s) disponible(s). Veuillez ajuster votre panier.`);
            setIsSubmitting(false);
            return;
          }
        }
      }

      // Group cart items by shopId so each shop receives its own order!
      const shopGroups: Record<string, typeof cart> = {};
      cart.forEach((item) => {
        if (!shopGroups[item.shopId]) shopGroups[item.shopId] = [];
        shopGroups[item.shopId].push(item);
      });

      let lastOrderId = "";
      let grandTotal = 0;

      for (const [shopId, items] of Object.entries(shopGroups)) {
        const groupSubtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
        const feeCalc = calculateApplicationFee(groupSubtotal, 0);
        grandTotal += feeCalc.total;

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const selectedRelay = availableRelays.find(r => (r.code || r.id) === selectedRelayId || r.id === selectedRelayId);

        // 1. Insert Order with full financial breakdown
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            shop_id: shopId,
            customer_id: session.user.id,
            customer_name: `${customerName}`,
            customer_phone: customerPhone,
            customer_email: session.user.email || null,
            shipping_address: deliveryType === "pickup_point" 
              ? `Point Relais: ${selectedRelay?.name || 'Sélectionné'} (${selectedCommune}) - ${selectedRelay?.address || ''}`
              : `${city} - ${district}${notes ? ` (${notes})` : ""}`,
            subtotal: feeCalc.subtotal,
            application_fee: feeCalc.applicationFee,
            application_fee_rate: feeCalc.rate,
            shipping_fee: 0,
            total_amount: feeCalc.total,
            status: "pending",
            delivery_type: deliveryType,
            pickup_point_id: deliveryType === "pickup_point" ? (selectedRelay?.id || null) : null,
            pickup_code: generatedOtp,
            relay_status: deliveryType === "pickup_point" ? "pending_deposit" : null
          })
          .select("id")
          .single();

        if (orderError || !orderData) {
          console.error("Error creating order:", orderError);
          const errDetail = orderError ? (orderError.message || orderError.details || JSON.stringify(orderError)) : "Données de commande invalides";
          setErrorMsg("Erreur lors de la création de la commande : " + errDetail);
          setIsSubmitting(false);
          return;
        }

        // Safe In-App Notification Dispatches
        try {
          if (deliveryType === "pickup_point" && selectedRelay) {
            await supabase.from("relay_notifications").insert({
              title: "Nouvelle Commande Client à Réceptionner",
              message: `La commande #${orderData.id.slice(0, 8).toUpperCase()} de ${customerName} (${customerPhone}) est planifiée pour votre Point Relais "${selectedRelay.name}".`,
              type: "pickup"
            });
          }

          if (shopId) {
            await supabase.from("seller_notifications").insert({
              shop_id: shopId,
              title: "Nouvelle Commande Reçue 🛍️",
              message: `Nouvelle commande #${orderData.id.slice(0, 8).toUpperCase()} de ${customerName} (${groupSubtotal.toLocaleString("fr-FR")} FCFA). En attente de votre confirmation.`,
              type: "order",
              reference_id: orderData.id,
            });
          }

          if (session?.user?.id) {
            await supabase.from("customer_notifications").insert({
              customer_id: session.user.id,
              order_id: orderData.id,
              title: "Commande Effectuée avec Succès 🎉",
              message: `Votre commande #${orderData.id.slice(0, 8).toUpperCase()} a été enregistrée avec succès. Nous attendons la confirmation du vendeur.`,
              type: "order",
            });
          }

          await supabase.from("admin_notifications").insert({
            title: "Nouvelle Commande Marketplace",
            message: `Commande #${orderData.id.slice(0, 8).toUpperCase()} passée par ${customerName} (${feeCalc.total.toLocaleString("fr-FR")} FCFA).`,
            notification_type: "info",
            target_role: "all",
            is_broadcast: true,
          });
        } catch (notifErr) {
          console.warn("Non-blocking notification error:", notifErr);
        }

        lastOrderId = orderData.id;

        // 2. Insert Order Items
        const orderItemsPayload = items.map((i) => ({
          order_id: orderData.id,
          product_id: i.productId,
          quantity: i.quantity,
          unit_price: i.price,
          variant_details: i.selectedOptions || {},
        }));

        const { error: itemsError } = await supabase
          .from("order_items")
          .insert(orderItemsPayload);

        if (itemsError) {
          console.error("Error creating order items:", itemsError);
        }
      }

      // Online Payment via K-PAY
      if (paymentMethod === "kpay") {
        const payRes = await fetch("/api/payments/kpay/init", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId: lastOrderId,
            amount: grandTotal,
            customerName,
            customerPhone,
            customerEmail: session.user.email,
            redirectBaseUrl: typeof window !== "undefined" ? window.location.origin : undefined,
          }),
        });

        const payData = await payRes.json();

        if (!payRes.ok || !payData.gatewayUrl) {
          throw new Error(payData.error || "Impossible d'initialiser la passerelle de paiement K-PAY.");
        }

        // Clear cart and redirect to K-PAY hosted page
        clearCart();
        window.location.href = payData.gatewayUrl;
        return;
      }

      // Cash on Delivery
      clearCart();
      router.push(`/orders/${lastOrderId}`);

    } catch (err: unknown) {
      console.error("Checkout Exception:", err);
      const msg = err instanceof Error ? err.message : "Une erreur inattendue est survenue.";
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        
        {/* Navigation */}
        <div className="mb-6 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={16} />
            Continuer mes achats
          </Link>
          <span className="text-xs font-black uppercase tracking-wider text-indigo-600 bg-indigo-50 px-3 py-1 rounded-full border border-indigo-100">
            Paiement Sécurisé
          </span>
        </div>

        <h1 className="text-3xl font-black text-gray-900 mb-8 tracking-tight">Finaliser ma commande</h1>

        {/* MANDATORY AUTH BANNER IF NOT LOGGED IN */}
        {!isLoadingAuth && !user && (
          <div className="bg-amber-50 border-2 border-amber-300 rounded-3xl p-6 sm:p-8 mb-8 shadow-lg animate-in fade-in">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-amber-500 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md">
                  <Lock size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-amber-950">Compte Client Obligatoire</h3>
                  <p className="text-sm font-medium text-amber-800 mt-1 max-w-xl">
                    Pour garantir le suivi en temps réel de votre livraison et sécuriser vos achats, vous devez vous connecter ou créer un compte client. Vos articles restent enregistrés !
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto">
                <Link
                  href={`/login?redirect=${encodeURIComponent("/checkout")}`}
                  className="flex-1 sm:flex-initial bg-white border border-amber-300 text-amber-900 font-extrabold px-5 py-3 rounded-xl hover:bg-amber-100 transition-colors text-center text-sm shadow-xs"
                >
                  Se Connecter
                </Link>
                <Link
                  href={`/register?redirect=${encodeURIComponent("/checkout")}`}
                  className="flex-1 sm:flex-initial bg-amber-600 text-white font-extrabold px-6 py-3 rounded-xl hover:bg-amber-700 transition-colors text-center text-sm shadow-md"
                >
                  Créer mon compte (30s)
                </Link>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* LEFT: FORM */}
          <div className="lg:col-span-7 flex flex-col gap-6">
            
            {/* Error banner */}
            {errorMsg && (
              <div className="bg-red-50 border border-red-200 text-red-700 p-4 rounded-2xl text-sm font-bold flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0 text-red-500" />
                <span>{errorMsg}</span>
              </div>
            )}

            <form onSubmit={handlePlaceOrder} className="flex flex-col gap-6">
              
              {/* Section 1: Customer Details */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <User size={20} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Coordonnées du client</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Nom & Prénom *</label>
                    <input
                      type="text"
                      required
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="ex: Kevin Kouassi"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-medium text-sm transition-all"
                    />
                  </div>

                  <div className="flex flex-col gap-2">
                    <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Numéro de téléphone *</label>
                    <input
                      type="tel"
                      required
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="ex: 07 08 09 10 11"
                      className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-medium text-sm transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Mode de Livraison & Adresse */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <MapPin size={20} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Mode de livraison</h3>
                </div>

                {/* Delivery Type Selector Tabs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Retrait en Point Relais (Active & Prioritaire) */}
                  <div
                    onClick={() => setDeliveryType("pickup_point")}
                    className="p-4 rounded-2xl border-2 border-indigo-600 bg-indigo-50/70 text-indigo-950 flex items-center gap-3 text-left transition-all cursor-pointer shadow-sm ring-2 ring-indigo-600/20"
                  >
                    <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-indigo-600/30">
                      📍
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm text-indigo-950">Retrait en Point Relais</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-md">
                          Recommandé
                        </span>
                      </div>
                      <p className="text-xs text-indigo-800/80 font-medium">Récupération sécurisée par Code OTP</p>
                    </div>
                  </div>

                  {/* Option 2: Livraison à Domicile (Bientôt disponible) */}
                  <div
                    className="p-4 rounded-2xl border-2 border-gray-200 bg-gray-50/70 text-gray-400 flex items-center gap-3 text-left relative overflow-hidden cursor-not-allowed opacity-75 select-none"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center font-bold text-sm shrink-0">
                      🏠
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
                        <h4 className="font-extrabold text-sm text-gray-600">Livraison à Domicile</h4>
                        <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-md">
                          Bientôt
                        </span>
                      </div>
                      <p className="text-xs text-gray-400">Prochainement disponible</p>
                    </div>
                  </div>
                </div>

                {deliveryType === "home_delivery" ? (
                  <div className="space-y-4 pt-2">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Ville *</label>
                        <select
                          value={city}
                          onChange={(e) => setCity(e.target.value)}
                          className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-medium text-sm transition-all"
                        >
                          <option value="Abidjan">Abidjan</option>
                          <option value="Yamoussoukro">Yamoussoukro</option>
                          <option value="Bouaké">Bouaké</option>
                          <option value="San-Pédro">San-Pédro</option>
                          <option value="Korhogo">Korhogo</option>
                        </select>
                      </div>

                      <div className="flex flex-col gap-2">
                        <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Commune / Quartier *</label>
                        <input
                          type="text"
                          required
                          value={district}
                          onChange={(e) => setDistrict(e.target.value)}
                          placeholder="ex: Cocody Angré 8ème Tranche"
                          className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-medium text-sm transition-all"
                        />
                      </div>
                    </div>

                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Repère de livraison (Optionnel)</label>
                      <input
                        type="text"
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        placeholder="ex: En face de la pharmacie, portail blanc"
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-medium text-sm transition-all"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-5 pt-2">
                    {/* Étape 1: Choix de la Commune */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                        1. Choisissez votre Commune *
                      </label>
                      <select
                        value={selectedCommune}
                        onChange={(e) => {
                          const commune = e.target.value;
                          setSelectedCommune(commune);
                          setDistrict(commune);
                          const matching = availableRelays.filter(r => r.commune.toLowerCase() === commune.toLowerCase());
                          if (matching.length > 0) {
                            setSelectedRelayId(matching[0].code || matching[0].id);
                          } else {
                            setSelectedRelayId("");
                          }
                        }}
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-bold text-sm transition-all"
                      >
                        {communesList.map((c) => {
                          const count = availableRelays.filter(r => r.commune.toLowerCase() === c.name.toLowerCase()).length;
                          return (
                            <option key={c.id || c.name} value={c.name}>
                              {c.name} {count > 0 ? `(${count} point${count > 1 ? 's' : ''} relais actif${count > 1 ? 's' : ''})` : "(Bientôt disponible)"}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Étape 2: Choix du Point Relais dans la commune */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                        2. Sélectionnez le Point Relais de {selectedCommune || "votre commune"} *
                      </label>

                      {availableRelays.filter(r => r.commune.toLowerCase() === selectedCommune.toLowerCase()).length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-medium text-amber-900 flex items-center gap-3">
                          <span className="text-lg">⚠️</span>
                          <span>
                            Aucun point relais actif dans la commune de <strong>{selectedCommune}</strong> pour le moment. Veuillez sélectionner une autre commune (comme Cocody ou Adjamé).
                          </span>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {availableRelays
                            .filter(r => r.commune.toLowerCase() === selectedCommune.toLowerCase())
                            .map((relay) => {
                              const isSelected = selectedRelayId === (relay.code || relay.id) || selectedRelayId === relay.id;
                              return (
                                <div
                                  key={relay.id}
                                  onClick={() => {
                                    setSelectedRelayId(relay.code || relay.id);
                                    setDistrict(relay.commune);
                                  }}
                                  style={{ borderLeftColor: relay.color_code || "#6366F1" }}
                                  className={`p-4 rounded-2xl border border-l-4 flex items-start justify-between cursor-pointer transition-all ${
                                    isSelected
                                      ? "border-indigo-600 bg-indigo-50/60 shadow-sm ring-2 ring-indigo-600/20"
                                      : "border-gray-200 hover:border-gray-300 hover:bg-gray-50"
                                  }`}
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <h4 className="font-extrabold text-sm text-gray-900">{relay.name}</h4>
                                      <span className="font-mono text-[10px] text-gray-400 font-bold">{relay.code}</span>
                                    </div>
                                    <p className="text-xs text-gray-600 font-medium mt-1">📍 {relay.address}</p>
                                    {relay.manager_name && (
                                      <p className="text-[11px] text-gray-400 font-medium mt-0.5">Gérant : {relay.manager_name} • {relay.phone}</p>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <span className="text-emerald-700 font-black text-xs bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-full shrink-0">
                                      Sélectionné
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Payment Method */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-5">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                      <CreditCard size={20} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900">Mode de paiement</h3>
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-full flex items-center gap-1">
                    <ShieldCheck size={12} /> 100% Sécurisé
                  </span>
                </div>

                <div className="grid grid-cols-1 gap-3.5">
                  {/* Option 1: K-PAY Online Instant Payment (Recommended) */}
                  <label 
                    onClick={() => setPaymentMethod("kpay")}
                    className={`p-5 rounded-2xl border-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 cursor-pointer transition-all ${
                      paymentMethod === "kpay" 
                        ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-sm ring-2 ring-indigo-600/10" 
                        : "border-gray-200 hover:bg-gray-50/70 text-gray-800"
                    }`}
                  >
                    <input type="radio" name="payment" checked={paymentMethod === "kpay"} onChange={() => setPaymentMethod("kpay")} className="hidden" />
                    
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-md shadow-indigo-600/20">
                        ⚡
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <h4 className="font-black text-sm text-gray-900">Paiement en ligne sécurisé (K-PAY)</h4>
                          <span className="text-[10px] font-black bg-indigo-600 text-white px-2 py-0.5 rounded-full uppercase tracking-wider">
                            Recommandé
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 font-medium">
                          Wave, Orange Money, MTN MoMo, Moov, Carte Visa / Mastercard, PayPal
                        </p>
                      </div>
                    </div>

                    {/* Payment Provider Badges */}
                    <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-50 text-cyan-800 border border-cyan-200 text-[10px] font-extrabold">🌊 Wave</span>
                      <span className="px-2 py-0.5 rounded-md bg-orange-50 text-orange-800 border border-orange-200 text-[10px] font-extrabold">🟠 Orange</span>
                      <span className="px-2 py-0.5 rounded-md bg-yellow-50 text-yellow-800 border border-yellow-200 text-[10px] font-extrabold">🟡 MTN</span>
                      <span className="px-2 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[10px] font-extrabold">💳 CB / Visa</span>
                    </div>
                  </label>

                  {/* Option 2: Cash / Mobile Money on Delivery */}
                  <label 
                    onClick={() => setPaymentMethod("cod")}
                    className={`p-5 rounded-2xl border-2 flex items-center justify-between gap-4 cursor-pointer transition-all ${
                      paymentMethod === "cod" 
                        ? "border-indigo-600 bg-indigo-50/40 text-indigo-950 shadow-sm ring-2 ring-indigo-600/10" 
                        : "border-gray-200 hover:bg-gray-50/70 text-gray-800"
                    }`}
                  >
                    <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="hidden" />
                    
                    <div className="flex items-center gap-3.5">
                      <div className="w-10 h-10 rounded-xl bg-slate-800 text-white flex items-center justify-center font-bold text-sm shrink-0">
                        💵
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="font-black text-sm text-gray-900">Paiement à la livraison</h4>
                        <p className="text-xs text-gray-500 font-medium">
                          Espèces ou Mobile Money lors de la réception du colis par le livreur
                        </p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>

              {/* SUBMIT ORDER BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className={`w-full font-black py-5 px-8 rounded-2xl transition-all shadow-xl flex items-center justify-center gap-3 text-base disabled:opacity-50 disabled:cursor-not-allowed ${
                  paymentMethod === "kpay" 
                    ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-600/25" 
                    : "bg-gray-900 hover:bg-gray-800 text-white shadow-gray-900/15"
                }`}
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : paymentMethod === "kpay" ? (
                  <Lock size={20} />
                ) : (
                  <UserCheck size={20} />
                )}
                {isSubmitting 
                  ? "Initialisation du paiement sécurisé..." 
                  : !user 
                    ? "Connectez-vous pour valider" 
                    : paymentMethod === "kpay"
                      ? "Payer en ligne avec K-PAY"
                      : "Valider ma commande (Paiement à réception)"}
              </button>

            </form>
          </div>

          {/* RIGHT: CART SUMMARY */}
          <div className="lg:col-span-5">
            <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm sticky top-28 flex flex-col gap-6">
              <h3 className="text-lg font-black text-gray-900 pb-4 border-b border-gray-100">
                Résumé du panier ({cart.reduce((a, b) => a + b.quantity, 0)} articles)
              </h3>

              <div className="flex flex-col gap-4 max-h-80 overflow-y-auto pr-1 custom-scrollbar">
                {cart.map((item) => (
                  <div key={item.productId} className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-3">
                      <div className="w-14 h-14 bg-gray-200 rounded-xl overflow-hidden shrink-0">
                        {item.image ? (
                          <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 font-bold text-xs">Photo</div>
                        )}
                      </div>
                      <div>
                        <h4 className="font-extrabold text-sm text-gray-900 line-clamp-1">{item.title}</h4>
                        <span className="text-xs text-gray-500 font-medium">{item.quantity} x {item.price.toLocaleString("fr-FR")} FCFA</span>
                      </div>
                    </div>
                    <span className="font-black text-sm text-indigo-600 shrink-0">
                      {(item.price * item.quantity).toLocaleString("fr-FR")} FCFA
                    </span>
                  </div>
                ))}
              </div>

              {(() => {
                const summaryFee = calculateApplicationFee(totalPrice, 0);
                return (
                  <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                    <div className="flex justify-between text-sm text-gray-500 font-medium">
                      <span>Sous-total</span>
                      <span className="font-bold text-gray-900">{summaryFee.subtotal.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 font-medium">
                      <span>Frais d&apos;application</span>
                      <span className="font-bold text-indigo-600">+{summaryFee.applicationFee.toLocaleString("fr-FR")} FCFA</span>
                    </div>
                    <div className="flex justify-between text-sm text-gray-500 font-medium">
                      <span>Livraison</span>
                      <span className="font-extrabold text-emerald-600">À régler au livreur</span>
                    </div>
                    <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                      <span className="font-black text-base text-gray-900">Total à payer</span>
                      <span className="font-black text-2xl text-indigo-600">
                        {summaryFee.total.toLocaleString("fr-FR")} FCFA
                      </span>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

        </div>

      </main>
      <Footer />
    </div>
  );
}
