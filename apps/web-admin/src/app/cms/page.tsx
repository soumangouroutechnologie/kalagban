"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Palette, 
  Sparkles, 
  Save, 
  Check, 
  Loader2, 
  Plus, 
  Trash2, 
  Eye, 
  Megaphone, 
  Layout, 
  Phone, 
  Mail, 
  MapPin,
  Clock,
  Store
} from "lucide-react";

interface TopBannerConfig {
  enabled: boolean;
  text: string;
  bg_color: string;
  text_color: string;
}

interface HeroConfig {
  badge_text: string;
  title_start: string;
  title_highlight: string;
  title_end: string;
  description: string;
  button_text: string;
  carousel_images: string[];
}

interface PromoBannerConfig {
  enabled: boolean;
  ad_type?: string;
  raw_html_code?: string;
  phone_number: string;
  callout_label: string;
  title: string;
  subtitle: string;
  price_tag: string;
  image_url: string;
  target_url?: string;
  image_position?: "top" | "center" | "bottom" | "contain";
  banner_height?: "auto" | "compact" | "standard" | "large";
}

interface FooterContactConfig {
  address: string;
  phone: string;
  email: string;
  about_text: string;
}

export default function CMSPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // CMS Form States
  const [topBanner, setTopBanner] = useState<TopBannerConfig>({
    enabled: true,
    text: "Bienvenue sur Kalagban — La Marketplace n°1 des vendeurs vérifiés en Côte d'Ivoire !",
    bg_color: "#6d28d9",
    text_color: "#ffffff",
  });

  const [hero, setHero] = useState<HeroConfig>({
    badge_text: "OFFRES EXCLUSIVES & LIVRAISON RAPIDE",
    title_start: "Achetez directement chez les",
    title_highlight: "meilleurs commerçants",
    title_end: ".",
    description: "Découvrez des milliers de produits authentiques au meilleur prix : mode, électronique, beauté et plus encore.",
    button_text: "Explorer le catalogue",
    carousel_images: [
      "/hero_3d_shopping_bag.png",
      "/cousel1.jpg",
      "/carousel2.jpg",
      "/carousel3.jpg"
    ]
  });

  const [promoBanner, setPromoBanner] = useState<PromoBannerConfig>({
    enabled: true,
    ad_type: "full_image",
    phone_number: "25 20 00 61 61",
    callout_label: "Commandez au",
    title: "CATÉGORIE DU JOUR",
    subtitle: "Télévisions & Tech",
    price_tag: "DÈS 45 000 FCFA",
    image_url: "/promo_banner_tech.png",
  });

  const [footerContact, setFooterContact] = useState<FooterContactConfig>({
    address: "Abidjan, Côte d'Ivoire",
    phone: "+225 07 00 00 00 00",
    email: "contact@kalagban.ci",
    about_text: "La plateforme e-commerce n°1 connectant les acheteurs aux meilleurs commerçants et vendeurs certifiés en Côte d'Ivoire.",
  });

  const [socialLinks, setSocialLinks] = useState({
    whatsapp: "+2250700000000",
    facebook: "https://facebook.com/kalagban",
    instagram: "https://instagram.com/kalagban",
    tiktok: "https://tiktok.com/@kalagban",
  });

  const [sellerBanner, setSellerBanner] = useState({
    badge_text: "VOTRE BOUTIQUE EST EN LIGNE",
    title: "Développez votre audience avec Kalagban ✨",
    description: "Consultez vos statistiques en temps réel, gérez vos stocks et expédiez vos commandes rapidement.",
    button_text: "Créer un produit",
  });

  const [sellerSlides, setSellerSlides] = useState<string[]>([
    "/img_slide/imgslide1.jpg",
    "/img_slide/imgslide2.jpg",
    "/img_slide/imgslide3.jpg"
  ]);

  const [shopsList, setShopsList] = useState<Array<{
    id: string;
    name: string;
    description?: string;
    logo_url?: string;
    is_featured?: boolean;
    featured_badge?: string;
  }>>([]);

  const [categoryBubbles, setCategoryBubbles] = useState({
    enabled: true,
    style: "bubbles",
    items: [
      { id: "all", name: "Toutes les offres", image_url: "/hero_3d_shopping_bag.png", tag: "TOP", color: "from-purple-600 to-indigo-600" },
      { id: "femme", name: "Femme", image_url: "/1.png", tag: "FEMME", color: "from-pink-500 to-rose-500" },
      { id: "homme", name: "Homme", image_url: "/2.png", tag: "HOMME", color: "from-blue-600 to-indigo-600" },
      { id: "enfants", name: "Enfants", image_url: "/3.png", tag: "KIDS", color: "from-amber-500 to-orange-500" },
      { id: "deco-maison", name: "Deco & Maison", image_url: "/4.png", tag: "DECO", color: "from-emerald-500 to-teal-500" },
    ],
  });

  const [flashSaleTimer, setFlashSaleTimer] = useState({
    enabled: true,
    title: "OFFRES LIMITÉES",
    duration_hours: 24,
    end_time: "2026-08-06T23:59:59Z",
  });

  const [popupBanner, setPopupBanner] = useState({
    enabled: true,
    show_once_per_session: false,
    auto_delay_ms: 1000,
    images: [{ image_url: "/promo_banner_tech.png", link_url: "#catalogue" }] as (string | { image_url: string; link_url?: string })[],
    target_url: "#catalogue",
  });

  const [newImageUrl, setNewImageUrl] = useState("");
  const [newSellerSlideUrl, setNewSellerSlideUrl] = useState("");
  const [newPopupUrl, setNewPopupUrl] = useState("");
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingSeller, setUploadingSeller] = useState(false);
  const [uploadingPromo, setUploadingPromo] = useState(false);
  const [uploadingPopup, setUploadingPopup] = useState(false);

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  const uploadFileToSupabase = async (file: File): Promise<string | null> => {
    try {
      // 1. Instant local Data URL conversion (< 5ms)
      const base64Url = await readFileAsBase64(file);

      // 2. Fast upload attempt to Supabase with strict 1.2s timeout
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
      const filePath = `cms/${fileName}`;

      const uploadPromise = supabase.storage
        .from('kalagban_media')
        .upload(filePath, file);

      const timeoutPromise = new Promise<{ error: any }>((resolve) =>
        setTimeout(() => resolve({ error: new Error('Storage timeout') }), 1200)
      );

      const res = (await Promise.race([uploadPromise, timeoutPromise])) as { error: any };

      if (!res.error) {
        const { data } = supabase.storage
          .from('kalagban_media')
          .getPublicUrl(filePath);
        return data.publicUrl;
      }

      // Fast fallback to Base64 Data URL if bucket missing or network slow
      return base64Url;
    } catch {
      return await readFileAsBase64(file);
    }
  };

  const handleHeroFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingHero(true);
    const publicUrl = await uploadFileToSupabase(file);
    if (publicUrl) {
      setHero((prev) => ({
        ...prev,
        carousel_images: [...prev.carousel_images, publicUrl],
      }));
    }
    setUploadingHero(false);
  };

  const handleSellerFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingSeller(true);
    const publicUrl = await uploadFileToSupabase(file);
    if (publicUrl) {
      setSellerSlides((prev) => [...prev, publicUrl]);
    }
    setUploadingSeller(false);
  };

  const handlePromoFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingPromo(true);
    const publicUrl = await uploadFileToSupabase(file);
    if (publicUrl) {
      setPromoBanner((prev) => ({
        ...prev,
        image_url: publicUrl,
        ad_type: "full_image",
      }));
    }
    setUploadingPromo(false);
  };

  const fetchSiteSettings = async () => {
    try {
      const { data, error } = await supabase
        .from("site_settings")
        .select("key, value");

      if (!error && data) {
        data.forEach((row) => {
          if (row.key === "top_banner") setTopBanner(row.value as TopBannerConfig);
          if (row.key === "hero_section") setHero(row.value as HeroConfig);
          if (row.key === "category_bubbles" && row.value) setCategoryBubbles(row.value as typeof categoryBubbles);
          if (row.key === "flash_sale_timer" && row.value) setFlashSaleTimer(row.value as typeof flashSaleTimer);
          if (row.key === "popup_banner" && row.value) setPopupBanner(row.value as typeof popupBanner);
          if (row.key === "promo_banner") {
            const val = row.value as PromoBannerConfig;
            setPromoBanner({
              ...val,
              ad_type: val.ad_type || "full_image",
            });
          }
          if (row.key === "footer_contact") setFooterContact(row.value as FooterContactConfig);
          if (row.key === "social_links" && row.value) setSocialLinks(row.value as typeof socialLinks);
          if (row.key === "seller_banner") setSellerBanner(row.value as typeof sellerBanner);
          if (row.key === "seller_slides" && Array.isArray(row.value)) setSellerSlides(row.value as string[]);
        });
      }

      // Fetch shops for Featured Shops section
      const { data: dbShops } = await supabase.from("shops").select("*").order("name");
      if (dbShops) {
        setShopsList(dbShops as typeof shopsList);
      }
    } catch (err) {
      console.error("Error fetching site settings:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSiteSettings();

    const channel = supabase
      .channel("admin_cms_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => fetchSiteSettings())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSaveCMS = async () => {
    setSaving(true);
    setSavedSuccess(false);

    try {
      // 1. LocalStorage Instant Backup
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("kalagban_promo_banner", JSON.stringify(promoBanner));
          localStorage.setItem("kalagban_top_banner", JSON.stringify(topBanner));
          localStorage.setItem("kalagban_hero", JSON.stringify(hero));
        } catch (e) {
          console.warn("LocalStorage save warning:", e);
        }
      }

      // 2. Primary site_settings table update
      const updates = [
        { key: "top_banner", value: topBanner, updated_at: new Date().toISOString() },
        { key: "hero_section", value: hero, updated_at: new Date().toISOString() },
        { key: "category_bubbles", value: categoryBubbles, updated_at: new Date().toISOString() },
        { key: "flash_sale_timer", value: flashSaleTimer, updated_at: new Date().toISOString() },
        { key: "popup_banner", value: popupBanner, updated_at: new Date().toISOString() },
        { key: "promo_banner", value: promoBanner, updated_at: new Date().toISOString() },
        { key: "footer_contact", value: footerContact, updated_at: new Date().toISOString() },
        { key: "social_links", value: socialLinks, updated_at: new Date().toISOString() },
        { key: "seller_banner", value: sellerBanner, updated_at: new Date().toISOString() },
        { key: "seller_slides", value: sellerSlides, updated_at: new Date().toISOString() },
      ];

      const { error: settingsError } = await supabase
        .from("site_settings")
        .upsert(updates, { onConflict: "key" });

      if (settingsError) {
        console.warn("site_settings upsert warning:", settingsError);
      }

      // 3. Update Shops Featured status
      if (shopsList.length > 0) {
        for (const s of shopsList) {
          await supabase
            .from("shops")
            .update({
              is_featured: !!s.is_featured,
              featured_badge: s.featured_badge || "Vendeur Vérifié",
            })
            .eq("id", s.id);
        }
      }

      // 3. Optional sync with category_bubbles
      try {
        if (categoryBubbles.items && categoryBubbles.items.length > 0) {
          const bubblePayload = categoryBubbles.items.map((item, idx) => ({
            id: item.id,
            name: item.name,
            image_url: item.image_url,
            tag: item.tag || "HOT",
            color: item.color || "from-purple-600 to-indigo-600",
            position: idx + 1,
            is_active: categoryBubbles.enabled,
          }));
          await supabase.from("category_bubbles").upsert(bubblePayload, { onConflict: "id" });
        }
      } catch (catErr) {
        console.warn("category_bubbles sync warning:", catErr);
      }

      // 4. Optional sync with promotional_banners
      try {
        await supabase.from("promotional_banners").upsert({
          title: promoBanner.title || "Bannière Pub",
          subtitle: promoBanner.subtitle || "",
          badge_text: promoBanner.price_tag || "PROMO",
          image_url: promoBanner.image_url,
          ad_type: promoBanner.ad_type || "standard",
          raw_html_code: promoBanner.raw_html_code || "",
          is_active: promoBanner.enabled,
          position: 1,
        });
      } catch (pubErr) {
        console.warn("promotional_banners sync warning:", pubErr);
      }

      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    } catch (err) {
      console.error("Error saving CMS settings:", err);
      alert("Erreur lors de la sauvegarde du design.");
    } finally {
      setSaving(false);
    }
  };

  const handleAddCarouselImage = () => {
    if (!newImageUrl.trim()) return;
    setHero({
      ...hero,
      carousel_images: [...hero.carousel_images, newImageUrl.trim()]
    });
    setNewImageUrl("");
  };

  const handleRemoveCarouselImage = (index: number) => {
    const updated = hero.carousel_images.filter((_, idx) => idx !== index);
    setHero({ ...hero, carousel_images: updated });
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8">
      
      {/* Top Title Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <Palette size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Éditeur Visuel CMS</h1>
            <p className="text-xs text-gray-500 font-medium">Personnalisation en temps réel de la page d&apos;accueil</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="http://localhost:3001"
            target="_blank"
            rel="noreferrer"
            className="bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs px-4 py-3 rounded-2xl flex items-center gap-2 transition-colors"
          >
            <Eye size={16} /> Prévisualiser le site
          </a>

          <button
            onClick={handleSaveCMS}
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-6 py-3 rounded-2xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {saving ? (
              <Loader2 size={16} className="animate-spin" />
            ) : savedSuccess ? (
              <Check size={16} className="text-emerald-300" />
            ) : (
              <Save size={16} />
            )}
            {saving ? "Sauvegarde..." : savedSuccess ? "Enregistré !" : "Enregistrer les modifications"}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center">
          <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
          <p className="text-gray-500 font-bold animate-pulse text-xs">Chargement de la configuration...</p>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* SECTION 1: TOP BANNER */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Megaphone className="text-indigo-600" size={20} />
              <h2 className="text-lg font-black text-gray-900">1. Bannière d&apos;Annonce Supérieure</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Texte de l&apos;annonce</label>
                <input
                  type="text"
                  value={topBanner.text}
                  onChange={(e) => setTopBanner({ ...topBanner, text: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium focus:bg-white focus:border-indigo-600 outline-none"
                />
              </div>

              <div className="flex items-center gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">Couleur de Fond</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={topBanner.bg_color}
                      onChange={(e) => setTopBanner({ ...topBanner, bg_color: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-600">{topBanner.bg_color}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">Couleur du Texte</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={topBanner.text_color}
                      onChange={(e) => setTopBanner({ ...topBanner, text_color: e.target.value })}
                      className="w-10 h-10 rounded-xl border border-gray-200 cursor-pointer p-0.5"
                    />
                    <span className="text-xs font-mono font-bold text-gray-600">{topBanner.text_color}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 1.5: TIMER DES VENTES FLASH (OFFRES LIMITÉES) */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Clock className="text-amber-500" size={20} />
                <h2 className="text-lg font-black text-gray-900">1.5 Compte à Rebours des Ventes Flash (Timer)</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={flashSaleTimer.enabled}
                  onChange={(e) => setFlashSaleTimer({ ...flashSaleTimer, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-700">Activer le Timer</span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Titre de la Section</label>
                <input
                  type="text"
                  value={flashSaleTimer.title}
                  onChange={(e) => setFlashSaleTimer({ ...flashSaleTimer, title: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                  placeholder="OFFRES LIMITÉES"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Durée du Timer (Heures)</label>
                <input
                  type="number"
                  value={flashSaleTimer.duration_hours}
                  onChange={(e) => setFlashSaleTimer({ ...flashSaleTimer, duration_hours: Number(e.target.value) })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Date &amp; Heure de Fin de Promo</label>
                <input
                  type="text"
                  value={flashSaleTimer.end_time}
                  onChange={(e) => setFlashSaleTimer({ ...flashSaleTimer, end_time: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-mono font-medium outline-none"
                  placeholder="2026-08-06T23:59:59Z"
                />
              </div>
            </div>
          </section>

          {/* SECTION 1.6: PUBLICITÉ POP-UP MODALE SUR L'APP */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Sparkles className="text-purple-600" size={20} />
                <h2 className="text-lg font-black text-gray-900">1.6 Publicité Pop-up Modale (Fenêtre Surgissante d&apos;Accueil)</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={popupBanner.enabled}
                  onChange={(e) => setPopupBanner({ ...popupBanner, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-700">Activer la Pub Surgissante</span>
              </label>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Délai d&apos;apparition automatique (millisecondes)</label>
                  <input
                    type="number"
                    value={popupBanner.auto_delay_ms || 1000}
                    onChange={(e) => setPopupBanner({ ...popupBanner, auto_delay_ms: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                    placeholder="1000"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700">Lien de Destination au Clic (#catalogue, URL...)</label>
                  <input
                    type="text"
                    value={popupBanner.target_url || "#catalogue"}
                    onChange={(e) => setPopupBanner({ ...popupBanner, target_url: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none"
                    placeholder="#catalogue"
                  />
                </div>
              </div>

              {/* Images & Partner Links of the Pop-up Carousel */}
              <div className="space-y-3 pt-2">
                <span className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                  Diapositives &amp; Liens Partenaires ({popupBanner.images?.length || 0})
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {popupBanner.images?.map((item, idx) => {
                    const imgUrl = typeof item === "string" ? item : item.image_url;
                    const linkUrl = typeof item === "string" ? (popupBanner.target_url || "#catalogue") : (item.link_url || "");

                    return (
                      <div key={idx} className="bg-slate-50 border border-gray-200 rounded-2xl p-3.5 space-y-2.5 relative group">
                        <button
                          onClick={() => {
                            const newImgs = popupBanner.images.filter((_, i) => i !== idx);
                            setPopupBanner({ ...popupBanner, images: newImgs });
                          }}
                          className="absolute top-2.5 right-2.5 bg-red-600 text-white p-1.5 rounded-xl shadow-md cursor-pointer hover:bg-red-700 transition-colors z-10"
                          title="Supprimer la diapositive"
                        >
                          <Trash2 size={14} />
                        </button>

                        <div className="aspect-video w-full bg-slate-900 rounded-xl overflow-hidden">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={imgUrl} alt={`Pub ${idx + 1}`} className="w-full h-full object-cover" />
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] font-extrabold uppercase tracking-wider text-gray-500 block">
                            🔗 Lien Partenaire / Sponsor (URL au Clic)
                          </label>
                          <input
                            type="text"
                            value={linkUrl}
                            onChange={(e) => {
                              const newImgs = [...(popupBanner.images || [])];
                              if (typeof newImgs[idx] === "string") {
                                newImgs[idx] = { image_url: newImgs[idx] as string, link_url: e.target.value };
                              } else {
                                newImgs[idx] = { ...(newImgs[idx] as { image_url: string; link_url?: string }), link_url: e.target.value };
                              }
                              setPopupBanner({ ...popupBanner, images: newImgs });
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-bold outline-none focus:border-purple-600"
                            placeholder="https://partenaire.ci ou #catalogue"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                  <label className="bg-purple-50 hover:bg-purple-100 text-purple-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-purple-200 cursor-pointer transition-colors shrink-0">
                    {uploadingPopup ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                    {uploadingPopup ? "Téléversement..." : "📁 Importer Image Pub (Fichier local)"}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setUploadingPopup(true);
                          const url = await uploadFileToSupabase(file);
                          if (url) {
                            const newSlide = { image_url: url, link_url: popupBanner.target_url || "#catalogue" };
                            setPopupBanner({ ...popupBanner, images: [...(popupBanner.images || []), newSlide] });
                          }
                          setUploadingPopup(false);
                        }
                      }}
                      disabled={uploadingPopup}
                      className="hidden"
                    />
                  </label>

                  <div className="flex flex-1 items-center gap-2">
                    <input
                      type="text"
                      placeholder="Ou coller une URL d'image (ex: /promo.jpg ou https://...)"
                      value={newPopupUrl}
                      onChange={(e) => setNewPopupUrl(e.target.value)}
                      className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                    />
                    <button
                      onClick={() => {
                        if (newPopupUrl.trim()) {
                          const newSlide = { image_url: newPopupUrl.trim(), link_url: popupBanner.target_url || "#catalogue" };
                          setPopupBanner({ ...popupBanner, images: [...(popupBanner.images || []), newSlide] });
                          setNewPopupUrl("");
                        }
                      }}
                      className="bg-purple-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-purple-700 shrink-0"
                    >
                      <Plus size={16} /> Ajouter URL
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2: HERO SECTION & CAROUSEL */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Layout className="text-indigo-600" size={20} />
              <h2 className="text-lg font-black text-gray-900">2. Section Hero &amp; Carrousel d&apos;Images</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Badge Supérieur (Ex: OFFRES EXCLUSIVES)</label>
                <input
                  type="text"
                  value={hero.badge_text}
                  onChange={(e) => setHero({ ...hero, badge_text: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Titre (Mot mis en valeur)</label>
                <input
                  type="text"
                  value={hero.title_highlight}
                  onChange={(e) => setHero({ ...hero, title_highlight: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-700">Description / Sous-titre</label>
                <textarea
                  rows={2}
                  value={hero.description}
                  onChange={(e) => setHero({ ...hero, description: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                />
              </div>
            </div>

            {/* Carousel Images Manager */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Images du Carrousel ({hero.carousel_images.length})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {hero.carousel_images.map((url, idx) => (
                  <div key={idx} className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-slate-50 aspect-square p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Slide ${idx + 1}`} className="w-full h-full object-contain" />
                    <button
                      onClick={() => handleRemoveCarouselImage(idx)}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer transition-colors shrink-0">
                  {uploadingHero ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {uploadingHero ? "Téléversement..." : "📁 Choisir une image (Fichier local)"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleHeroFileUpload}
                    disabled={uploadingHero}
                    className="hidden"
                  />
                </label>

                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ou coller une URL d'image (ex: /carousel1.jpg ou https://...)"
                    value={newImageUrl}
                    onChange={(e) => setNewImageUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                  />
                  <button
                    onClick={handleAddCarouselImage}
                    className="bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-indigo-700 shrink-0"
                  >
                    <Plus size={16} /> Ajouter URL
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 2.5: BANDEAU DES CATÉGORIES & BULLES ANIMÉES */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center justify-between gap-4 pb-4 border-b border-gray-100">
              <div className="flex items-center gap-3">
                <Sparkles className="text-indigo-600" size={20} />
                <h2 className="text-lg font-black text-gray-900">2.5 Bandeau des Catégories &amp; Bulles Animées</h2>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={categoryBubbles.enabled}
                  onChange={(e) => setCategoryBubbles({ ...categoryBubbles, enabled: e.target.checked })}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                />
                <span className="text-xs font-bold text-gray-700">Activer le Bandeau</span>
              </label>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Style d&apos;affichage</label>
                <select
                  value={categoryBubbles.style || "bubbles"}
                  onChange={(e) => setCategoryBubbles({ ...categoryBubbles, style: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none cursor-pointer"
                >
                  <option value="bubbles">🌟 Bulles &amp; Ronds Animés de Catégories (Style Stories Instagram/TikTok)</option>
                  <option value="badges">🛡️ Badges de Services Classiques (Livraison, Vendeurs Vérifiés...)</option>
                </select>
              </div>

              {categoryBubbles.style === "bubbles" && (
                <div className="space-y-4 pt-2">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-700 block">
                    Gestion des Bulles Animées ({categoryBubbles.items.length})
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    {categoryBubbles.items.map((cat, idx) => (
                      <div key={idx} className="bg-slate-50 border border-gray-200 rounded-2xl p-4 space-y-3 relative group">
                        <button
                          onClick={() => {
                            const newItems = categoryBubbles.items.filter((_, i) => i !== idx);
                            setCategoryBubbles({ ...categoryBubbles, items: newItems });
                          }}
                          className="absolute top-2.5 right-2.5 text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Supprimer la bulle"
                        >
                          <Trash2 size={15} />
                        </button>

                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full p-0.5 bg-linear-to-tr from-violet-600 to-amber-400 shrink-0">
                            <div className="w-full h-full bg-white rounded-full overflow-hidden">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={cat.image_url} alt={cat.name} className="w-full h-full object-cover rounded-full" />
                            </div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <input
                              type="text"
                              value={cat.name}
                              onChange={(e) => {
                                const newItems = [...categoryBubbles.items];
                                newItems[idx].name = e.target.value;
                                setCategoryBubbles({ ...categoryBubbles, items: newItems });
                              }}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-bold outline-none"
                              placeholder="Nom catégorie"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 text-[11px]">
                          <div>
                            <label className="font-bold text-gray-500 block text-[10px]">ID Filtre</label>
                            <input
                              type="text"
                              value={cat.id}
                              onChange={(e) => {
                                const newItems = [...categoryBubbles.items];
                                newItems[idx].id = e.target.value;
                                setCategoryBubbles({ ...categoryBubbles, items: newItems });
                              }}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 font-mono outline-none"
                            />
                          </div>
                          <div>
                            <label className="font-bold text-gray-500 block text-[10px]">Badge Tag</label>
                            <input
                              type="text"
                              value={cat.tag || ""}
                              onChange={(e) => {
                                const newItems = [...categoryBubbles.items];
                                newItems[idx].tag = e.target.value;
                                setCategoryBubbles({ ...categoryBubbles, items: newItems });
                              }}
                              className="w-full bg-white border border-gray-200 rounded-lg px-2 py-1 font-bold outline-none"
                              placeholder="ex: TOP"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="font-bold text-gray-500 block text-[10px]">URL Image Bulle</label>
                          <input
                            type="text"
                            value={cat.image_url}
                            onChange={(e) => {
                              const newItems = [...categoryBubbles.items];
                              newItems[idx].image_url = e.target.value;
                              setCategoryBubbles({ ...categoryBubbles, items: newItems });
                            }}
                            className="w-full bg-white border border-gray-200 rounded-lg px-2.5 py-1 text-xs font-medium outline-none"
                          />
                        </div>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => {
                      const newCat = {
                        id: `cat_${Date.now()}`,
                        name: "Nouvelle Catégorie",
                        image_url: "/hero_3d_shopping_bag.png",
                        tag: "NEW",
                        color: "from-indigo-600 to-purple-600",
                      };
                      setCategoryBubbles({
                        ...categoryBubbles,
                        items: [...categoryBubbles.items, newCat],
                      });
                    }}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer transition-colors w-full sm:w-auto"
                  >
                    <Plus size={16} /> Ajouter une Bulle de Catégorie
                  </button>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 3: HORIZONTAL PROMO BANNER */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Sparkles className="text-indigo-600" size={20} />
              <h2 className="text-lg font-black text-gray-900">3. Bannière Publicitaire Horizontale &amp; Code Pub Pur</h2>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Type de Publicité</label>
                <select
                  value={promoBanner.ad_type || "standard"}
                  onChange={(e) => setPromoBanner({ ...promoBanner, ad_type: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600 cursor-pointer"
                >
                  <option value="full_image">🖼️ Bannière Image Complète Plein Écran (Remplace tout le bloc par une image Pub local/URL)</option>
                  <option value="standard">📞 Bannière Composite (Numéro Téléphone, Catégorie du Jour &amp; Prix)</option>
                  <option value="custom_code">💻 Code HTML / Script Pub Pur (AdSense, Script Partenaire, iFrame)</option>
                </select>
              </div>

              {promoBanner.ad_type === "full_image" ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700">Image de la Bannière Publicitaire Plein Écran (PNG, JPG, GIF Animé, WebP)</label>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs px-5 py-3 rounded-xl flex items-center justify-center gap-2 shadow-md cursor-pointer transition-all shrink-0">
                        {uploadingPromo ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {uploadingPromo ? "Téléversement..." : "📁 Importer Image Pub (Fichier local)"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePromoFileUpload}
                          disabled={uploadingPromo}
                          className="hidden"
                        />
                      </label>

                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ou coller une URL d'image (ex: /promo_banner_tech.png ou https://...)"
                          value={promoBanner.image_url}
                          onChange={(e) => setPromoBanner({ ...promoBanner, image_url: e.target.value })}
                          className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-medium outline-none focus:border-indigo-600"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Options de Cadrage et Hauteur pour la Bannière */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-gray-200">
                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">📐 Cadrage / Position du Visuel</label>
                      <select
                        value={promoBanner.image_position || "top"}
                        onChange={(e) => setPromoBanner({ ...promoBanner, image_position: e.target.value as any })}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-indigo-600"
                      >
                        <option value="top">👤 Cadrer vers le Haut (Visages et Personnes visibles)</option>
                        <option value="center">🎯 Centré (Standard)</option>
                        <option value="bottom">⬇️ Cadrer vers le Bas</option>
                        <option value="contain">🖼️ Image Entière (Sans aucun rognage)</option>
                      </select>
                      <span className="text-[11px] text-gray-500">Permet d&apos;ajuster la photo pour voir les têtes et visages.</span>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-bold text-gray-700 block">📏 Hauteur de la Bannière</label>
                      <select
                        value={promoBanner.banner_height || "standard"}
                        onChange={(e) => setPromoBanner({ ...promoBanner, banner_height: e.target.value as any })}
                        className="w-full bg-white border border-gray-300 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-800 outline-none focus:border-indigo-600"
                      >
                        <option value="auto">🌟 Automatique (Selon le format de l&apos;image)</option>
                        <option value="compact">📱 Compact (220px)</option>
                        <option value="standard">💻 Standard (320px)</option>
                        <option value="large">🖥️ Grand Format (440px)</option>
                      </select>
                      <span className="text-[11px] text-gray-500">Contrôle l&apos;espace vertical occupé par la publicité.</span>
                    </div>
                  </div>

                  {promoBanner.image_url && (
                    <div className="pt-2 space-y-1.5">
                      <span className="text-xs font-extrabold text-gray-700 block">👁️ Aperçu du Cadrage en Temps Réel :</span>
                      <div className={`w-full rounded-2xl overflow-hidden border border-gray-200 bg-slate-900 shadow-md ${
                        promoBanner.banner_height === "compact" ? "h-36 sm:h-48" :
                        promoBanner.banner_height === "large" ? "h-64 sm:h-80" :
                        promoBanner.banner_height === "auto" ? "h-auto max-h-96" :
                        "h-48 sm:h-60"
                      }`}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={promoBanner.image_url}
                          alt="Aperçu Pub Plein Écran"
                          className={`w-full h-full ${
                            promoBanner.image_position === "contain"
                              ? "object-contain"
                              : promoBanner.image_position === "bottom"
                              ? "object-cover object-bottom"
                              : promoBanner.image_position === "center"
                              ? "object-cover object-center"
                              : "object-cover object-top"
                          }`}
                        />
                      </div>
                    </div>
                  )}
                </div>
              ) : promoBanner.ad_type === "custom_code" ? (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700">Code HTML / JS Pur de la Publicité (Remplace tout le bloc)</label>
                  <textarea
                    rows={4}
                    placeholder="Collez ici votre script ou code HTML de publicité (ex: <iframe ...></iframe> ou <a href='...'><img src='pub.gif'/></a>)"
                    value={promoBanner.raw_html_code || ""}
                    onChange={(e) => setPromoBanner({ ...promoBanner, raw_html_code: e.target.value })}
                    className="w-full bg-slate-900 text-emerald-400 font-mono border border-gray-700 rounded-xl px-4 py-2.5 text-xs outline-none"
                  />
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700">Numéro Commande Téléphone</label>
                      <input
                        type="text"
                        value={promoBanner.phone_number}
                        onChange={(e) => setPromoBanner({ ...promoBanner, phone_number: e.target.value })}
                        className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700">Titre Catégorie du Jour</label>
                      <input
                        type="text"
                        value={promoBanner.subtitle}
                        onChange={(e) => setPromoBanner({ ...promoBanner, subtitle: e.target.value })}
                        className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-700">Prix d&apos;appel Badge</label>
                      <input
                        type="text"
                        value={promoBanner.price_tag}
                        onChange={(e) => setPromoBanner({ ...promoBanner, price_tag: e.target.value })}
                        className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                      />
                    </div>
                  </div>

                  {/* Promo Banner Image Upload & URL Input */}
                  <div className="space-y-2 pt-2 border-t border-gray-100">
                    <label className="text-xs font-bold text-gray-700">Vignette Image (PNG, JPG, GIF)</label>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer transition-colors shrink-0">
                        {uploadingPromo ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                        {uploadingPromo ? "Téléversement..." : "📁 Choisir une vignette (Fichier local)"}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handlePromoFileUpload}
                          disabled={uploadingPromo}
                          className="hidden"
                        />
                      </label>

                      <div className="flex flex-1 items-center gap-2">
                        <input
                          type="text"
                          placeholder="Ou coller une URL d'image (ex: /promo_banner_tech.png ou https://...)"
                          value={promoBanner.image_url}
                          onChange={(e) => setPromoBanner({ ...promoBanner, image_url: e.target.value })}
                          className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                        />
                      </div>
                    </div>

                    {promoBanner.image_url && (
                      <div className="pt-2">
                        <span className="text-[11px] font-bold text-gray-500 block mb-1">Aperçu Visuel de la Vignette :</span>
                        <div className="w-full max-w-sm h-20 rounded-2xl overflow-hidden border border-gray-200 bg-slate-100">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img src={promoBanner.image_url} alt="Aperçu Pub" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </section>

          {/* SECTION 4: FOOTER CONTACT & LINKS */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <MapPin className="text-indigo-600" size={20} />
              <h2 className="text-lg font-black text-gray-900">4. Coordonnées &amp; Informations Footer</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Adresse Physique</label>
                <input
                  type="text"
                  value={footerContact.address}
                  onChange={(e) => setFooterContact({ ...footerContact, address: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Téléphone Support</label>
                <input
                  type="text"
                  value={footerContact.phone}
                  onChange={(e) => setFooterContact({ ...footerContact, phone: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Email Contact</label>
                <input
                  type="text"
                  value={footerContact.email}
                  onChange={(e) => setFooterContact({ ...footerContact, email: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                />
              </div>
            </div>

            {/* Social Media Links Subsection */}
            <div className="pt-4 border-t border-gray-100 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                🌐 Liens Réseaux Sociaux &amp; WhatsApp
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">WhatsApp Support (Numéro avec indicatif)</label>
                  <input
                    type="text"
                    value={socialLinks.whatsapp}
                    onChange={(e) => setSocialLinks({ ...socialLinks, whatsapp: e.target.value })}
                    placeholder="+2250700000000"
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Lien Facebook</label>
                  <input
                    type="text"
                    value={socialLinks.facebook}
                    onChange={(e) => setSocialLinks({ ...socialLinks, facebook: e.target.value })}
                    placeholder="https://facebook.com/..."
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Lien Instagram</label>
                  <input
                    type="text"
                    value={socialLinks.instagram}
                    onChange={(e) => setSocialLinks({ ...socialLinks, instagram: e.target.value })}
                    placeholder="https://instagram.com/..."
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-gray-700">Lien TikTok</label>
                  <input
                    type="text"
                    value={socialLinks.tiktok}
                    onChange={(e) => setSocialLinks({ ...socialLinks, tiktok: e.target.value })}
                    placeholder="https://tiktok.com/@..."
                    className="w-full bg-slate-50 border border-gray-200 rounded-xl px-3.5 py-2 text-xs font-medium outline-none"
                  />
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 5: SELLER DASHBOARD ANNOUNCEMENT SLIDES & TEXTS */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Sparkles className="text-indigo-600" size={20} />
              <h2 className="text-lg font-black text-gray-900">5. Espace Vendeurs : Bannière, Textes &amp; Carrousel</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Badge Statut Vendeur (Ex: VOTRE BOUTIQUE EST EN LIGNE)</label>
                <input
                  type="text"
                  value={sellerBanner.badge_text}
                  onChange={(e) => setSellerBanner({ ...sellerBanner, badge_text: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Titre de la Bannière Vendeur</label>
                <input
                  type="text"
                  value={sellerBanner.title}
                  onChange={(e) => setSellerBanner({ ...sellerBanner, title: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-700">Description / Sous-titre Vendeur</label>
                <textarea
                  rows={2}
                  value={sellerBanner.description}
                  onChange={(e) => setSellerBanner({ ...sellerBanner, description: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-700">Texte du Bouton d&apos;Action</label>
                <input
                  type="text"
                  value={sellerBanner.button_text}
                  onChange={(e) => setSellerBanner({ ...sellerBanner, button_text: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600"
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <h3 className="text-xs font-black uppercase tracking-wider text-gray-700">
                Images du Slide Vendeur ({sellerSlides.length})
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {sellerSlides.map((url, idx) => (
                  <div key={idx} className="relative group rounded-2xl overflow-hidden border border-gray-200 bg-slate-50 aspect-video p-1">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={url} alt={`Seller Slide ${idx + 1}`} className="w-full h-full object-cover rounded-xl" />
                    <button
                      onClick={() => setSellerSlides(sellerSlides.filter((_, i) => i !== idx))}
                      className="absolute top-2 right-2 bg-red-600 text-white p-1.5 rounded-xl shadow-md opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      title="Supprimer"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
                <label className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold text-xs px-4 py-2.5 rounded-xl flex items-center justify-center gap-2 border border-indigo-200 cursor-pointer transition-colors shrink-0">
                  {uploadingSeller ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {uploadingSeller ? "Téléversement..." : "📁 Choisir une image (Fichier local)"}
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleSellerFileUpload}
                    disabled={uploadingSeller}
                    className="hidden"
                  />
                </label>

                <div className="flex flex-1 items-center gap-2">
                  <input
                    type="text"
                    placeholder="Ou coller une URL d'image (ex: /img_slide/imgslide1.jpg ou https://...)"
                    value={newSellerSlideUrl}
                    onChange={(e) => setNewSellerSlideUrl(e.target.value)}
                    className="flex-1 bg-slate-50 border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-medium outline-none"
                  />
                  <button
                    onClick={() => {
                      if (newSellerSlideUrl.trim()) {
                        setSellerSlides([...sellerSlides, newSellerSlideUrl.trim()]);
                        setNewSellerSlideUrl("");
                      }
                    }}
                    className="bg-indigo-600 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-1.5 cursor-pointer hover:bg-indigo-700 shrink-0"
                  >
                    <Plus size={16} /> Ajouter URL
                  </button>
                </div>
              </div>
            </div>
          </section>

          {/* SECTION 6: BOUTIQUES VEDETTES EN PAGE D'ACCUEIL */}
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
            <div className="flex items-center gap-3 pb-4 border-b border-gray-100">
              <Store className="text-indigo-600" size={20} />
              <div>
                <h2 className="text-lg font-black text-gray-900">6. Boutiques Vedettes &amp; Partenaires Certifiés</h2>
                <p className="text-xs text-gray-500 font-medium">Sélectionnez les boutiques mises en avant sur la page d&apos;accueil du site et de l&apos;application mobile.</p>
              </div>
            </div>

            {shopsList.length === 0 ? (
              <p className="text-xs text-gray-400 font-medium italic">Chargement ou aucune boutique disponible en base de données...</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {shopsList.map((shop, idx) => (
                  <div 
                    key={shop.id} 
                    className={`p-4 rounded-2xl border transition-all space-y-3 ${
                      shop.is_featured ? "border-indigo-500 bg-indigo-50/20 shadow-xs" : "border-gray-200 bg-slate-50 opacity-75"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-white border border-gray-200 overflow-hidden shrink-0 flex items-center justify-center font-black text-indigo-600 text-sm">
                          {shop.logo_url ? (
                            <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                          ) : (
                            shop.name.charAt(0)
                          )}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-extrabold text-gray-900 truncate">{shop.name}</p>
                          <p className="text-[10px] text-gray-500 truncate">{shop.description || "Boutique partenaire Kalagban"}</p>
                        </div>
                      </div>

                      <label className="relative inline-flex items-center cursor-pointer shrink-0">
                        <input
                          type="checkbox"
                          checked={!!shop.is_featured}
                          onChange={(e) => {
                            const updated = [...shopsList];
                            updated[idx].is_featured = e.target.checked;
                            setShopsList(updated);
                          }}
                          className="sr-only peer"
                        />
                        <div className="w-9 h-5 bg-gray-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      </label>
                    </div>

                    {shop.is_featured && (
                      <div className="space-y-1 pt-2 border-t border-indigo-100">
                        <label className="text-[10px] font-bold text-indigo-900 block">Badge Personnalisé Vedette</label>
                        <input
                          type="text"
                          value={shop.featured_badge || "Vendeur Vérifié"}
                          onChange={(e) => {
                            const updated = [...shopsList];
                            updated[idx].featured_badge = e.target.value;
                            setShopsList(updated);
                          }}
                          placeholder="Ex: Boutique Officielle, Top Vente..."
                          className="w-full bg-white border border-indigo-200 rounded-lg px-3 py-1.5 text-xs font-semibold text-indigo-700 outline-none"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      )}
    </main>
  );
}
