"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  ShoppingBag, 
  CheckCircle2, 
  User, 
  MapPin, 
  Loader2, 
  Lock,
  UserCheck,
  AlertCircle
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
  const [paymentMethod, setPaymentMethod] = useState("cod"); // 'cod' | 'wave' | 'orange' | 'mtn'
  const [deliveryType, setDeliveryType] = useState<"home_delivery" | "pickup_point">("home_delivery");
  const [selectedCommune, setSelectedCommune] = useState("Cocody");
  const [selectedRelayId, setSelectedRelayId] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);

  const [availableRelays, setAvailableRelays] = useState<Array<{ id: string; code: string; name: string; commune: string; address: string; manager_name?: string; phone?: string }>>([]);

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

      // Fetch Real Active Pickup Points created by Admin
      const { data: pointsData } = await supabase
        .from("pickup_points")
        .select("id, code, name, commune, address, manager_name, phone")
        .eq("status", "active");

      if (pointsData && pointsData.length > 0) {
        setAvailableRelays(pointsData);
        setSelectedCommune(pointsData[0].commune);
        setSelectedRelayId(pointsData[0].code || pointsData[0].id);
        setDistrict(pointsData[0].commune);
      } else {
        setAvailableRelays([]);
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
      // Group cart items by shopId so each shop receives its own order!
      const shopGroups: Record<string, typeof cart> = {};
      cart.forEach((item) => {
        if (!shopGroups[item.shopId]) shopGroups[item.shopId] = [];
        shopGroups[item.shopId].push(item);
      });

      let lastOrderId = "";

      for (const [shopId, items] of Object.entries(shopGroups)) {
        const groupTotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);

        const generatedOtp = Math.floor(100000 + Math.random() * 900000).toString();
        const selectedRelay = availableRelays.find(r => (r.code || r.id) === selectedRelayId || r.id === selectedRelayId);

        // 1. Insert Order
        const { data: orderData, error: orderError } = await supabase
          .from("orders")
          .insert({
            shop_id: shopId,
            customer_id: session.user.id,
            customer_name: `${customerName}`,
            customer_phone: customerPhone,
            shipping_address: deliveryType === "pickup_point" 
              ? `Point Relais: ${selectedRelay?.name || 'Sélectionné'} (${selectedCommune}) - ${selectedRelay?.address || ''}`
              : `${city} - ${district}${notes ? ` (${notes})` : ""}`,
            total_amount: groupTotal,
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

        // Notify Point Relais in real-time
        if (deliveryType === "pickup_point" && selectedRelay) {
          await supabase.from("relay_notifications").insert({
            title: "Nouvelle Commande Client à Réceptionner",
            message: `La commande #${orderData.id.slice(0, 8).toUpperCase()} de ${customerName} (${customerPhone}) est planifiée pour votre Point Relais "${selectedRelay.name}".`,
            type: "pickup"
          });
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

      // Success
      clearCart();
      router.push(`/orders/${lastOrderId}`);

    } catch (err: unknown) {
      console.error("Checkout Exception:", err);
      setErrorMsg("Une erreur inattendue est survenue.");
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
                  <button
                    type="button"
                    onClick={() => setDeliveryType("home_delivery")}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer ${
                      deliveryType === "home_delivery"
                        ? "border-indigo-600 bg-indigo-50/50 text-indigo-950 font-bold"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0">🏠</div>
                    <div>
                      <h4 className="font-extrabold text-sm">Livraison à Domicile</h4>
                      <p className="text-xs text-gray-500">Expédition directe à votre adresse</p>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setDeliveryType("pickup_point")}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 text-left transition-all cursor-pointer ${
                      deliveryType === "pickup_point"
                        ? "border-amber-500 bg-amber-50/50 text-amber-950 font-bold"
                        : "border-gray-200 text-gray-600 hover:bg-gray-50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-amber-500 text-white flex items-center justify-center font-bold text-xs shrink-0">📍</div>
                    <div>
                      <h4 className="font-extrabold text-sm">Retrait en Point Relais</h4>
                      <p className="text-xs text-gray-500">Récupération sécurisée par Code OTP</p>
                    </div>
                  </button>
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
                        className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-amber-500/40 font-bold text-sm transition-all"
                      >
                        <option value="Cocody">Cocody</option>
                        <option value="Yopougon">Yopougon</option>
                        <option value="Marcory">Marcory</option>
                        <option value="Plateau">Plateau</option>
                        <option value="Koumassi">Koumassi</option>
                        <option value="Abobo">Abobo</option>
                      </select>
                    </div>

                    {/* Étape 2: Choix du Point Relais dans la commune */}
                    <div className="flex flex-col gap-2">
                      <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">
                        2. Sélectionnez le Point Relais de {selectedCommune} *
                      </label>

                      {availableRelays.filter(r => r.commune.toLowerCase() === selectedCommune.toLowerCase()).length === 0 ? (
                        <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl text-xs font-medium text-amber-900">
                          Aucun point relais disponible dans la commune de <strong>{selectedCommune}</strong> pour le moment. Veuillez sélectionner &quot;Livraison à Domicile&quot; ou choisir une autre commune.
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {availableRelays
                            .filter(r => r.commune.toLowerCase() === selectedCommune.toLowerCase())
                            .map((relay) => (
                              <div
                                key={relay.id}
                                onClick={() => {
                                  setSelectedRelayId(relay.code || relay.id);
                                  setDistrict(relay.commune);
                                }}
                                className={`p-4 rounded-2xl border-2 flex items-start justify-between cursor-pointer transition-all ${
                                  selectedRelayId === (relay.code || relay.id)
                                    ? "border-amber-500 bg-amber-50/60 shadow-sm"
                                    : "border-gray-200 hover:bg-gray-50"
                                }`}
                              >
                                <div>
                                  <h4 className="font-extrabold text-sm text-gray-900">{relay.name}</h4>
                                  <p className="text-xs text-gray-600 font-medium mt-1">📍 {relay.address}</p>
                                  {relay.manager_name && (
                                    <p className="text-[11px] text-gray-400 font-medium mt-0.5">Gérant : {relay.manager_name}</p>
                                  )}
                                </div>
                                {selectedRelayId === (relay.code || relay.id) && (
                                  <span className="text-emerald-600 font-black text-xs bg-emerald-100 px-2.5 py-1 rounded-full shrink-0">Sélectionné</span>
                                )}
                              </div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Section 3: Payment Method */}
              <div className="bg-white p-6 sm:p-8 rounded-3xl border border-gray-100 shadow-sm flex flex-col gap-5">
                <div className="flex items-center gap-3 pb-3 border-b border-gray-100">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
                    <CheckCircle2 size={20} />
                  </div>
                  <h3 className="text-lg font-black text-gray-900">Mode de paiement</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <label 
                    onClick={() => setPaymentMethod("cod")}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                      paymentMethod === "cod" ? "border-indigo-600 bg-indigo-50/50 text-indigo-900" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input type="radio" name="payment" checked={paymentMethod === "cod"} onChange={() => setPaymentMethod("cod")} className="hidden" />
                    <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs">💵</div>
                    <div>
                      <h4 className="font-extrabold text-sm">Paiement à la livraison</h4>
                      <p className="text-xs text-gray-500 font-medium">Espèces ou Mobile Money à la réception</p>
                    </div>
                  </label>

                  <label 
                    onClick={() => setPaymentMethod("wave")}
                    className={`p-4 rounded-2xl border-2 flex items-center gap-3 cursor-pointer transition-all ${
                      paymentMethod === "wave" ? "border-indigo-600 bg-indigo-50/50 text-indigo-900" : "border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    <input type="radio" name="payment" checked={paymentMethod === "wave"} onChange={() => setPaymentMethod("wave")} className="hidden" />
                    <div className="w-8 h-8 rounded-full bg-cyan-500 text-white flex items-center justify-center font-bold text-xs">🌊</div>
                    <div>
                      <h4 className="font-extrabold text-sm">Wave / Mobile Money</h4>
                      <p className="text-xs text-gray-500 font-medium">Paiement direct à la livraison</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* SUBMIT ORDER BUTTON */}
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className="w-full bg-gray-900 text-white font-extrabold py-5 px-8 rounded-2xl hover:bg-indigo-600 transition-all shadow-xl shadow-gray-900/10 flex items-center justify-center gap-3 text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="animate-spin" size={20} />
                ) : (
                  <UserCheck size={20} />
                )}
                {isSubmitting ? "Traitement de la commande..." : !user ? "Connectez-vous pour valider" : "Valider et payer ma commande"}
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

              <div className="border-t border-gray-100 pt-4 flex flex-col gap-3">
                <div className="flex justify-between text-sm text-gray-500 font-medium">
                  <span>Sous-total</span>
                  <span className="font-bold text-gray-900">{totalPrice.toLocaleString("fr-FR")} FCFA</span>
                </div>
                <div className="flex justify-between text-sm text-gray-500 font-medium">
                  <span>Livraison</span>
                  <span className="font-extrabold text-emerald-600">À régler au livreur</span>
                </div>
                <div className="border-t border-gray-100 pt-3 flex justify-between items-baseline">
                  <span className="font-black text-base text-gray-900">Total à payer</span>
                  <span className="font-black text-2xl text-indigo-600">
                    {totalPrice.toLocaleString("fr-FR")} FCFA
                  </span>
                </div>
              </div>
            </div>
          </div>

        </div>

      </main>
      <Footer />
    </div>
  );
}
