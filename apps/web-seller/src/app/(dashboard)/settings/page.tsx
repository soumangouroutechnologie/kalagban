"use client";

import React, { useState, useEffect, useRef } from "react";
import { Camera, Image as ImageIcon, Save, CheckCircle, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState("Boutique");
  const [isSaved, setIsSaved] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // Shop state
  const [shopName, setShopName] = useState("");
  const [shopDescription, setShopDescription] = useState("");
  const [shopLogoUrl, setShopLogoUrl] = useState<string | null>(null);
  
  // Payout state
  const [payoutProvider, setPayoutProvider] = useState("");
  const [payoutPhone, setPayoutPhone] = useState("");

  // Profile state
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [email, setEmail] = useState("");

  const shopLogoRef = useRef<HTMLInputElement>(null);
  const avatarRef = useRef<HTMLInputElement>(null);

  const loadData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      
      setEmail(session.user.email || "");

      // Load Shop
      const { data: shop } = await supabase.from('shops').select('*').eq('id', session.user.id).maybeSingle();
      if (shop) {
        setShopName(shop.name || "");
        setShopDescription(shop.description || "");
        setShopLogoUrl(shop.logo_url);
        setPayoutProvider(shop.payout_provider || "");
        setPayoutPhone(shop.payout_phone || "");
      }

      // Load Profile
      const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).maybeSingle();
      if (profile) {
        setFirstName(profile.first_name || "");
        setLastName(profile.last_name || "");
        setPhone(profile.phone || session.user.phone || "");
        setAvatarUrl(profile.avatar_url);
      } else {
        // Fallback for newly created accounts without a profile row yet
        setPhone(session.user.phone || "");
      }
    } catch (error) {
      console.error("Error loading settings:", error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#profile") {
      setTimeout(() => setActiveTab("Profil Utilisateur"), 0);
    }
    setTimeout(() => {
      loadData();
    }, 0);
  }, []);

  const uploadFile = async (file: File, pathPrefix: string): Promise<string | null> => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return null;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${pathPrefix}_${session.user.id}_${Math.random()}.${fileExt}`;
    
    const { error: uploadError } = await supabase.storage
      .from('kalagban_media')
      .upload(fileName, file);

    if (uploadError) {
      console.error("Upload error", uploadError);
      alert(`Upload error: ${uploadError.message || JSON.stringify(uploadError)}`);
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('kalagban_media')
      .getPublicUrl(fileName);

    return publicUrl;
  };

  const handleShopLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadFile(file, 'shop_logo');
      if (url) {
        setShopLogoUrl(url);
      } else {
        alert("Erreur lors de l'upload de l'image.");
      }
    }
    // Clear the input value so the same file can be selected again
    if (shopLogoRef.current) shopLogoRef.current.value = "";
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const url = await uploadFile(file, 'avatar');
      if (url) {
        setAvatarUrl(url);
      } else {
        alert("Erreur lors de l'upload de l'image.");
      }
    }
    // Clear the input value so the same file can be selected again
    if (avatarRef.current) avatarRef.current.value = "";
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      if (activeTab === "Boutique") {
        await supabase.from('shops').upsert({
          id: session.user.id,
          name: shopName,
          description: shopDescription,
          logo_url: shopLogoUrl
        }, { onConflict: 'id' });
      } else if (activeTab === "Paiements") {
        await supabase.from('shops').upsert({
          id: session.user.id,
          payout_provider: payoutProvider,
          payout_phone: payoutPhone
        }, { onConflict: 'id' });
      } else if (activeTab === "Profil Utilisateur") {
        const { error: upsertError } = await supabase.from('profiles').upsert({
          id: session.user.id,
          first_name: firstName,
          last_name: lastName,
          phone: phone,
          avatar_url: avatarUrl
        }, { onConflict: 'id' });
        
        if (upsertError) {
          console.error("Upsert error:", upsertError);
          if (upsertError.code === '23503') {
            alert("Votre session a expiré ou la base de données a été réinitialisée. Vous allez être déconnecté.");
            await supabase.auth.signOut();
            document.cookie = "kalagban_seller_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
            router.push("/login");
            return;
          }
          alert(`Erreur d'enregistrement : ${upsertError.message}`);
          setIsSaving(false);
          return;
        }
      }

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
      
      // Dire au Header de se mettre à jour sans recharger la page !
      window.dispatchEvent(new Event("kalagban_profile_updated"));
      
    } catch (error) {
      console.error("Error saving settings:", error);
      alert("Erreur lors de l'enregistrement.");
    } finally {
      setIsSaving(false);
    }
  };

  const tabs = ["Boutique", "Profil Utilisateur", "Paiements"];

  if (isLoading) {
    return <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Paramètres</h1>
          <p className="text-text-muted mt-1">Configurez l&apos;identité visuelle et les réglages de votre boutique.</p>
        </div>
        <button 
          onClick={handleSave}
          disabled={isSaving}
          className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
        >
          {isSaving ? <Loader2 size={20} className="animate-spin" /> : (isSaved ? <CheckCircle size={20} /> : <Save size={20} />)}
          {isSaving ? "Enregistrement..." : (isSaved ? "Enregistré !" : "Enregistrer")}
        </button>
      </div>

      <div className="flex overflow-x-auto custom-scrollbar border-b border-gray-200 hide-scroll-indicator">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`whitespace-nowrap px-6 py-3 font-bold text-sm transition-all border-b-2 ${
              activeTab === tab 
                ? "border-primary text-primary" 
                : "border-transparent text-text-muted hover:text-text-main hover:border-gray-300"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {activeTab === "Boutique" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="bg-surface rounded-card shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-6 border-b border-gray-50">
              <h2 className="text-xl font-bold text-text-main">Enseigne de la boutique</h2>
              <p className="text-sm text-text-muted mt-1">Cette image apparaîtra tout en haut de votre page boutique pour les clients.</p>
            </div>
            <div className="p-6">
              <input type="file" ref={shopLogoRef} className="hidden" accept="image/*" onChange={handleShopLogoChange} />
              <div 
                onClick={() => shopLogoRef.current?.click()}
                className="w-full h-48 sm:h-64 bg-gray-100 rounded-2xl border-2 border-dashed border-gray-300 flex flex-col items-center justify-center gap-4 hover:bg-gray-50 hover:border-primary/50 transition-all cursor-pointer relative overflow-hidden"
              >
                {shopLogoUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={shopLogoUrl} alt="Cover" className="w-full h-full object-cover" />
                ) : (
                  <div className="z-10 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform mb-2">
                      <ImageIcon size={32} />
                    </div>
                    <p className="font-bold text-text-main">Ajouter une photo de couverture</p>
                    <p className="text-sm text-text-muted">Recommandé : 1920 x 480 px (Format Paysage)</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-6">Informations générales</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Nom de la boutique</label>
                <input 
                  type="text" 
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-text-main font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2 md:col-span-2">
                <label className="text-sm font-bold text-gray-700">Description détaillée</label>
                <textarea 
                  rows={4}
                  value={shopDescription}
                  onChange={(e) => setShopDescription(e.target.value)}
                  placeholder="Décrivez l'histoire de votre boutique, ce que vous vendez..." 
                  className="w-full bg-bg-app border border-gray-200 text-text-main font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Profil Utilisateur" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100 flex flex-col md:flex-row gap-8 items-start">
            <div className="flex flex-col items-center gap-4">
              <input type="file" ref={avatarRef} className="hidden" accept="image/*" onChange={handleAvatarChange} />
              <div 
                onClick={() => avatarRef.current?.click()}
                className="relative w-32 h-32 rounded-full bg-gray-100 overflow-hidden border-4 border-white shadow-lg group cursor-pointer"
              >
                {avatarUrl ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={avatarUrl} alt="Profil" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-gray-400">
                    <Camera size={40} />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex flex-col items-center justify-center text-white transition-opacity">
                  <Camera size={24} className="mb-1" />
                  <span className="text-xs font-bold">Modifier</span>
                </div>
              </div>
            </div>

            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 w-full">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Prénom</label>
                <input 
                  type="text" 
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Votre prénom"
                  className="w-full bg-bg-app border border-gray-200 text-text-main font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Nom</label>
                <input 
                  type="text" 
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Votre nom"
                  className="w-full bg-bg-app border border-gray-200 text-text-main font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Adresse Email (lecture seule)</label>
                <input 
                  type="email" 
                  value={email}
                  disabled
                  className="w-full bg-gray-100 border border-gray-200 text-gray-500 rounded-xl py-3 px-4 focus:outline-none"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Téléphone</label>
                <input 
                  type="tel" 
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+225 00 00 00 00 00"
                  className="w-full bg-bg-app border border-gray-200 text-text-main font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "Paiements" && (
        <div className="flex flex-col gap-6 animate-fade-in">
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100 flex flex-col items-center justify-center text-center">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-4">
              <CheckCircle size={40} />
            </div>
            <h3 className="text-xl font-bold text-text-main mb-2">Modes de Reversement</h3>
            <p className="text-text-muted max-w-md">
              Kalagban vous reversera vos gains automatiquement sur votre compte Mobile Money. Veuillez configurer le numéro de réception ci-dessous.
            </p>
          </div>

          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-6">Compte de réception</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Opérateur Mobile Money</label>
                <select 
                  value={payoutProvider}
                  onChange={(e) => setPayoutProvider(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-text-main font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="">Sélectionnez un opérateur...</option>
                  <option value="Wave">Wave</option>
                  <option value="Orange Money">Orange Money</option>
                  <option value="MTN Mobile Money">MTN Mobile Money</option>
                  <option value="Moov Money">Moov Money</option>
                </select>
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Numéro de réception</label>
                <input 
                  type="tel" 
                  value={payoutPhone}
                  onChange={(e) => setPayoutPhone(e.target.value)}
                  placeholder="Ex: +225 00 00 00 00 00"
                  className="w-full bg-bg-app border border-gray-200 text-text-main font-medium rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
