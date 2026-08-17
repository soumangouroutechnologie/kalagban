"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { 
  Package, 
  Heart, 
  MapPin, 
  User, 
  LogOut, 
  Clock, 
  Truck, 
  CheckCircle2, 
  XCircle, 
  ShoppingBag, 
  Loader2, 
  Plus, 
  Trash2,
  ChevronRight,
  Save
} from "lucide-react";
import { useCart } from "@/context/CartContext";
import OrderStatusTimeline from "@/components/OrderStatusTimeline";

interface CustomerOrder {
  id: string;
  shop_id: string;
  customer_name: string;
  total_amount: number;
  subtotal?: number | null;
  application_fee?: number | null;
  shipping_fee?: number | null;
  status: string;
  created_at: string;
  delivery_type?: string | null;
  pickup_code?: string | null;
  relay_status?: string | null;
  order_items?: {
    id: string;
    quantity: number;
    unit_price: number;
    products?: {
      title: string;
      product_media?: { url: string }[];
    };
  }[];
}

interface WishlistItem {
  id: string;
  product_id: string;
  products: {
    id: string;
    title: string;
    price: number;
    old_price?: number;
    stock_quantity: number;
    product_media?: { url: string }[];
  };
}

interface CustomerAddress {
  id: string;
  full_name: string;
  phone: string;
  city: string;
  district: string;
  landmark?: string;
  is_default: boolean;
}

export default function CustomerAccountPage() {
  const router = useRouter();
  const { addToCart } = useCart();

  const [activeTab, setActiveTab] = useState<"orders" | "wishlist" | "addresses" | "profile">("orders");
  const [isLoading, setIsLoading] = useState(true);
  const [profile, setProfile] = useState<{ full_name?: string; phone?: string; email?: string } | null>(null);

  // Tab Data States
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [addresses, setAddresses] = useState<CustomerAddress[]>([]);

  // Profile Edit State
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState("");

  // Modals State
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newCity, setNewCity] = useState("Abidjan");
  const [newDistrict, setNewDistrict] = useState("");
  const [newLandmark, setNewLandmark] = useState("");

  useEffect(() => {
    const loadCustomerData = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login?redirect=/account");
          return;
        }

        // 1. Fetch Profile
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileData) {
          const userProf = {
            full_name: profileData.full_name || "",
            phone: profileData.phone || "",
            email: session.user.email || "",
          };
          setProfile(userProf);
          setEditFullName(userProf.full_name);
          setEditPhone(userProf.phone);
          setNewFullName(userProf.full_name);
          setNewPhone(userProf.phone);
        }

        // 2. Fetch Orders
        const { data: ordersData } = await supabase
          .from("orders")
          .select("*, order_items(*, products(title, product_media(url)))")
          .eq("customer_id", session.user.id)
          .order("created_at", { ascending: false });

        if (ordersData) setOrders(ordersData as CustomerOrder[]);

        // 3. Fetch Wishlist
        const { data: wishlistData } = await supabase
          .from("wishlists")
          .select("id, product_id, products(id, title, price, old_price, stock_quantity, product_media(url))")
          .eq("user_id", session.user.id);

        if (wishlistData) setWishlist(wishlistData as unknown as WishlistItem[]);

        // 4. Fetch Addresses
        const { data: addressData } = await supabase
          .from("customer_addresses")
          .select("*")
          .eq("user_id", session.user.id)
          .order("created_at", { ascending: false });

        if (addressData) setAddresses(addressData as CustomerAddress[]);

      } catch (err) {
        console.error("Error loading account data:", err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCustomerData();
  }, [router]);

  const handleLogoutConfirm = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setProfileSuccessMsg("");

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase.from("profiles").upsert({
        id: session.user.id,
        full_name: editFullName,
        phone: editPhone,
        role: "buyer"
      });

      if (error) {
        alert("Erreur de mise à jour : " + error.message);
      } else {
        setProfile({
          ...profile,
          full_name: editFullName,
          phone: editPhone
        });
        setProfileSuccessMsg("Vos informations personnelles ont été mises à jour avec succès !");
        setTimeout(() => setProfileSuccessMsg(""), 3500);
      }
    } catch (err) {
      console.error("Error updating profile:", err);
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleAddAddress = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFullName || !newPhone || !newDistrict) {
      alert("Veuillez remplir les champs obligatoires.");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data, error } = await supabase
        .from("customer_addresses")
        .insert({
          user_id: session.user.id,
          full_name: newFullName,
          phone: newPhone,
          city: newCity,
          district: newDistrict,
          landmark: newLandmark,
          is_default: addresses.length === 0
        })
        .select()
        .single();

      if (!error && data) {
        setAddresses([data as CustomerAddress, ...addresses]);
        setShowAddressModal(false);
        setNewDistrict("");
        setNewLandmark("");
      }
    } catch (err) {
      console.error("Error adding address:", err);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    try {
      await supabase.from("customer_addresses").delete().eq("id", id);
      setAddresses(addresses.filter(a => a.id !== id));
    } catch (err) {
      console.error("Error deleting address:", err);
    }
  };

  const handleDeleteWishlist = async (id: string) => {
    try {
      await supabase.from("wishlists").delete().eq("id", id);
      setWishlist(wishlist.filter(w => w.id !== id));
    } catch (err) {
      console.error("Error deleting wishlist item:", err);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return <span className="bg-amber-50 text-amber-700 text-xs font-bold px-3 py-1.5 rounded-full border border-amber-200 flex items-center gap-1.5"><Clock size={14} /> En attente de préparation</span>;
      case "processing":
        return <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-3 py-1.5 rounded-full border border-indigo-200 flex items-center gap-1.5"><Package size={14} /> En préparation par le vendeur</span>;
      case "shipped":
        return <span className="bg-blue-50 text-blue-700 text-xs font-bold px-3 py-1.5 rounded-full border border-blue-200 flex items-center gap-1.5"><Truck size={14} /> En cours de livraison 🚚</span>;
      case "delivered":
        return <span className="bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1.5 rounded-full border border-emerald-200 flex items-center gap-1.5"><CheckCircle2 size={14} /> Commande Livrée 🎉</span>;
      case "cancelled":
        return <span className="bg-red-50 text-red-700 text-xs font-bold px-3 py-1.5 rounded-full border border-red-200 flex items-center gap-1.5"><XCircle size={14} /> Commande Annulée</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full">{status}</span>;
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="animate-spin text-indigo-600 w-12 h-12 mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Chargement de votre espace client...</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16">
        
        {/* USER PROFILE WELCOME HEADER */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-linear-to-br from-indigo-600 to-purple-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shadow-lg shadow-indigo-600/30">
              {profile?.full_name?.charAt(0).toUpperCase() || "C"}
            </div>
            <div>
              <span className="text-xs font-extrabold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                Espace Client Acheteur
              </span>
              <h1 className="text-2xl sm:text-3xl font-black text-gray-900 tracking-tight mt-1">
                {profile?.full_name || "Client Kalagban"}
              </h1>
              <p className="text-xs sm:text-sm text-gray-500 font-medium">
                {profile?.email || ""} {profile?.phone ? `• ${profile.phone}` : ""}
              </p>
            </div>
          </div>

          <button
            onClick={() => setShowLogoutModal(true)}
            className="bg-gray-100 hover:bg-red-50 text-gray-700 hover:text-red-600 font-bold px-4 py-2.5 rounded-xl transition-colors text-xs flex items-center gap-2 border border-gray-200/80 cursor-pointer"
          >
            <LogOut size={16} />
            Se déconnecter
          </button>
        </div>

        {/* DASHBOARD TABS NAVIGATION */}
        <div className="flex overflow-x-auto gap-2 border-b border-gray-200 pb-4 mb-8 custom-scrollbar">
          <button
            onClick={() => setActiveTab("orders")}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
              activeTab === "orders" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
            }`}
          >
            <Package size={18} />
            Mes Commandes ({orders.length})
          </button>

          <button
            onClick={() => setActiveTab("wishlist")}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
              activeTab === "wishlist" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
            }`}
          >
            <Heart size={18} />
            Mes Favoris ({wishlist.length})
          </button>

          <button
            onClick={() => setActiveTab("addresses")}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
              activeTab === "addresses" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
            }`}
          >
            <MapPin size={18} />
            Carnet d&apos;Adresses ({addresses.length})
          </button>

          <button
            onClick={() => setActiveTab("profile")}
            className={`px-5 py-3 rounded-2xl font-black text-sm transition-all flex items-center gap-2.5 whitespace-nowrap cursor-pointer ${
              activeTab === "profile" 
                ? "bg-indigo-600 text-white shadow-lg shadow-indigo-600/30" 
                : "bg-white text-gray-600 hover:bg-gray-100 border border-gray-200/80"
            }`}
          >
            <User size={18} />
            Mon Profil
          </button>
        </div>

        {/* TAB 1: MES COMMANDES */}
        {activeTab === "orders" && (
          <div className="flex flex-col gap-6">
            {orders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-sm flex flex-col items-center">
                <div className="w-16 h-16 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mb-4">
                  <Package size={32} />
                </div>
                <h3 className="text-xl font-black text-gray-900 mb-2">Aucune commande enregistrée</h3>
                <p className="text-gray-500 font-medium text-sm mb-6 max-w-sm">Vous n&apos;avez pas encore passé de commande sur Kalagban Marketplace.</p>
                <Link href="/" className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30">
                  Découvrir les produits
                </Link>
              </div>
            ) : (
              orders.map((ord) => (
                <div key={ord.id} className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col gap-6">
                  
                  {/* Order Header */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100">
                    <div>
                      <div className="flex items-center gap-3">
                        <span className="font-mono font-black text-gray-900 text-base">Commande #{ord.id.slice(0, 8)}...</span>
                        <span className="text-xs text-gray-400 font-medium">({new Date(ord.created_at).toLocaleDateString("fr-FR")})</span>
                      </div>
                      <p className="text-xs text-gray-500 font-medium mt-0.5">Livraison à : {ord.customer_name}</p>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      {getStatusBadge(ord.status)}
                      <span className="text-xl font-black text-indigo-600">{Number(ord.total_amount).toLocaleString("fr-FR")} FCFA</span>
                    </div>
                  </div>

                  {/* Order Items */}
                  <div className="flex flex-col gap-3">
                    {ord.order_items?.map((item) => {
                      const imgUrl = item.products?.product_media && item.products.product_media.length > 0
                        ? item.products.product_media[0].url
                        : null;

                      return (
                        <div key={item.id} className="flex items-center justify-between p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-200 rounded-xl overflow-hidden shrink-0 flex items-center justify-center text-gray-400">
                              {imgUrl ? <img src={imgUrl} alt="" className="w-full h-full object-cover" /> : <Package size={20} />}
                            </div>
                            <div>
                              <h4 className="font-extrabold text-sm text-gray-900">{item.products?.title || "Article Produit"}</h4>
                              <span className="text-xs text-gray-500 font-medium">{item.quantity} x {Number(item.unit_price).toLocaleString("fr-FR")} FCFA</span>
                            </div>
                          </div>

                          <span className="font-extrabold text-sm text-gray-900">
                            {(item.quantity * Number(item.unit_price)).toLocaleString("fr-FR")} FCFA
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Financial Breakdown */}
                  {Number(ord.application_fee) > 0 && (
                    <div className="flex flex-wrap items-center justify-between text-xs text-gray-500 bg-gray-50/80 px-4 py-2.5 rounded-xl border border-gray-100">
                      <span>Articles : <strong className="text-gray-900">{Number(ord.subtotal || (Number(ord.total_amount) - Number(ord.application_fee || 0))).toLocaleString("fr-FR")} FCFA</strong></span>
                      <span>Frais d&apos;application : <strong className="text-indigo-600">+{Number(ord.application_fee).toLocaleString("fr-FR")} FCFA</strong></span>
                      {Number(ord.shipping_fee) > 0 && (
                        <span>Livraison : <strong className="text-emerald-600">+{Number(ord.shipping_fee).toLocaleString("fr-FR")} FCFA</strong></span>
                      )}
                    </div>
                  )}

                  {/* ANIMATED STATUS TIMELINE (JUMIA INSPIRED) */}
                  <div className="pt-2">
                    <OrderStatusTimeline
                      orderStatus={ord.status}
                      relayStatus={ord.relay_status}
                      deliveryType={ord.delivery_type}
                      pickupCode={ord.pickup_code}
                      createdAt={ord.created_at}
                    />
                  </div>

                  {/* Order Receipt Link */}
                  <div className="pt-2 flex justify-end">
                    <Link 
                      href={`/orders/${ord.id}`} 
                      className="text-xs font-extrabold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 transition-colors"
                    >
                      Voir le reçu complet & imprimable <ChevronRight size={14} />
                    </Link>
                  </div>

                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 2: MES FAVORIS */}
        {activeTab === "wishlist" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm">
            <h3 className="text-lg font-black text-gray-900 mb-6">Produits mis en favoris ({wishlist.length})</h3>

            {wishlist.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center">
                <Heart size={40} className="text-gray-300 mb-3" />
                <p className="text-gray-500 font-medium text-sm">Vous n&apos;avez encore aucun produit en favoris.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {wishlist.map((item) => {
                  const mediaUrl = item.products?.product_media && item.products.product_media.length > 0 
                    ? item.products.product_media[0].url 
                    : null;

                  return (
                    <div key={item.id} className="bg-gray-50 rounded-2xl p-4 border border-gray-100 flex flex-col justify-between gap-4">
                      <div className="flex gap-4">
                        <div className="w-20 h-20 bg-gray-200 rounded-xl overflow-hidden shrink-0">
                          {mediaUrl ? <img src={mediaUrl} alt={item.products.title} className="w-full h-full object-cover" /> : null}
                        </div>
                        <div className="flex flex-col justify-center">
                          <h4 className="font-extrabold text-sm text-gray-900 line-clamp-2">{item.products.title}</h4>
                          <span className="font-black text-indigo-600 text-base mt-1">{item.products.price.toLocaleString("fr-FR")} FCFA</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 pt-2 border-t border-gray-200/60">
                        <button
                          onClick={() => addToCart({
                            productId: item.products.id,
                            shopId: "shop",
                            title: item.products.title,
                            price: item.products.price,
                            oldPrice: item.products.old_price,
                            image: mediaUrl || "",
                            quantity: 1
                          })}
                          className="flex-1 bg-gray-900 text-white font-bold text-xs py-2.5 px-3 rounded-xl hover:bg-indigo-600 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          <ShoppingBag size={14} />
                          Ajouter au panier
                        </button>

                        <button
                          onClick={() => handleDeleteWishlist(item.id)}
                          className="p-2.5 text-gray-400 hover:text-red-600 bg-white rounded-xl border border-gray-200 transition-colors cursor-pointer"
                          title="Supprimer des favoris"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: CARNET D'ADRESSES */}
        {activeTab === "addresses" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm flex flex-col gap-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-black text-gray-900">Mes adresses de livraison ({addresses.length})</h3>
              <button
                onClick={() => setShowAddressModal(true)}
                className="bg-indigo-600 text-white font-bold text-xs py-2.5 px-4 rounded-xl shadow-md hover:bg-indigo-700 transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Plus size={16} />
                Ajouter une adresse
              </button>
            </div>

            {/* Address Modal Form */}
            {showAddressModal && (
              <form onSubmit={handleAddAddress} className="bg-gray-50 p-6 rounded-2xl border border-gray-200 flex flex-col gap-4 animate-in fade-in">
                <h4 className="font-bold text-sm text-gray-900">Nouvelle adresse de livraison</h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <input
                    type="text"
                    required
                    value={newFullName}
                    onChange={(e) => setNewFullName(e.target.value)}
                    placeholder="Nom complet du destinataire *"
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium"
                  />
                  <input
                    type="tel"
                    required
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="Téléphone *"
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <select
                    value={newCity}
                    onChange={(e) => setNewCity(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium"
                  >
                    <option value="Abidjan">Abidjan</option>
                    <option value="Yamoussoukro">Yamoussoukro</option>
                    <option value="Bouaké">Bouaké</option>
                    <option value="San-Pédro">San-Pédro</option>
                  </select>
                  <input
                    type="text"
                    required
                    value={newDistrict}
                    onChange={(e) => setNewDistrict(e.target.value)}
                    placeholder="Commune / Quartier * (ex: Cocody)"
                    className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium"
                  />
                </div>

                <input
                  type="text"
                  value={newLandmark}
                  onChange={(e) => setNewLandmark(e.target.value)}
                  placeholder="Repère précis (ex: Près de la pharmacie du quartier)"
                  className="w-full bg-white border border-gray-200 rounded-xl p-3 text-sm font-medium"
                />

                <div className="flex justify-end gap-2 pt-2">
                  <button type="button" onClick={() => setShowAddressModal(false)} className="px-4 py-2 text-xs font-bold text-gray-500 bg-gray-200 rounded-xl">Annuler</button>
                  <button type="submit" className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 rounded-xl">Enregistrer l&apos;adresse</button>
                </div>
              </form>
            )}

            {/* Address List */}
            {addresses.length === 0 ? (
              <p className="text-gray-500 text-sm font-medium text-center py-6">Aucune adresse enregistrée pour le moment.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {addresses.map((addr) => (
                  <div key={addr.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-200/80 flex flex-col justify-between gap-3">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-extrabold text-sm text-gray-900">{addr.full_name}</span>
                        {addr.is_default && <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200">Par défaut</span>}
                      </div>
                      <p className="text-xs text-gray-600 font-medium">{addr.city} - {addr.district}</p>
                      {addr.landmark && <p className="text-xs text-gray-400 font-medium italic mt-0.5">{addr.landmark}</p>}
                      <p className="text-xs text-indigo-600 font-bold mt-2">📞 {addr.phone}</p>
                    </div>

                    <div className="flex justify-end pt-2 border-t border-gray-200/60">
                      <button onClick={() => handleDeleteAddress(addr.id)} className="text-xs font-bold text-red-600 hover:underline cursor-pointer">Supprimer</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: MON PROFIL (EDITABLE & FUNCTIONAL) */}
        {activeTab === "profile" && (
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm max-w-xl">
            <h3 className="text-lg font-black text-gray-900 mb-6">Informations personnelles</h3>

            {profileSuccessMsg && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl text-xs font-bold flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 size={18} className="shrink-0 text-emerald-600" />
                <span>{profileSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveProfile} className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Nom & Prénom *</label>
                <input
                  type="text"
                  required
                  value={editFullName}
                  onChange={(e) => setEditFullName(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-bold text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Numéro de Téléphone *</label>
                <input
                  type="tel"
                  required
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-indigo-600/40 font-bold text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-xs font-extrabold uppercase tracking-wider text-gray-700">Adresse Email (Non modifiable)</label>
                <input
                  type="email"
                  disabled
                  value={profile?.email || ""}
                  className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-xl p-3.5 font-bold text-sm cursor-not-allowed"
                />
              </div>

              <button
                type="submit"
                disabled={isSavingProfile}
                className="w-full bg-indigo-600 text-white font-bold py-3.5 px-6 rounded-xl hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 text-sm disabled:opacity-70 mt-2 cursor-pointer"
              >
                {isSavingProfile ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                {isSavingProfile ? "Enregistrement..." : "Enregistrer les modifications"}
              </button>
            </form>
          </div>
        )}

      </main>

      {/* CONFIRMATION POPUP FOR LOGOUT */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-gray-100 text-center flex flex-col items-center">
            <div className="w-16 h-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mb-4 border-4 border-red-100">
              <LogOut size={32} />
            </div>

            <h3 className="text-xl font-black text-gray-900 mb-2">Se déconnecter ?</h3>
            <p className="text-sm font-medium text-gray-500 mb-6 leading-relaxed">
              Êtes-vous sûr de vouloir vous déconnecter de votre espace client Kalagban ? Vous devrez vous reconnecter pour accéder à vos commandes.
            </p>

            <div className="flex items-center gap-3 w-full">
              <button
                type="button"
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold py-3 px-4 rounded-xl transition-colors text-sm cursor-pointer"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={handleLogoutConfirm}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-red-600/30 transition-all text-sm cursor-pointer"
              >
                Oui, déconnexion
              </button>
            </div>
          </div>
        </div>
      )}

      <Footer />
    </div>
  );
}
