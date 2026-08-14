"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard, { ProductType } from "@/components/ProductCard";
import { PRODUCT_CATEGORIES, CATEGORY_TREE } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import { 
  Loader2, 
  Sparkles, 
  ShoppingBag, 
  ArrowRight, 
  Clock, 
  Store, 
  CheckCircle2,
  ShieldCheck,
  Truck,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  PhoneCall,
  X,
} from "lucide-react";

interface ShopType {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_featured?: boolean;
  featured_badge?: string;
  created_at?: string;
}

interface FlashSaleCampaign {
  id: string;
  title: string;
  end_time: string;
  discount_percentage: number;
}

export default function BuyerHomePage() {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [products, setProducts] = useState<ProductType[]>([]);
  const [shops, setShops] = useState<ShopType[]>([]);
  const [activeFlashSale, setActiveFlashSale] = useState<FlashSaleCampaign | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // CMS Dynamic Live Settings
  const [topBannerConfig, setTopBannerConfig] = useState({
    enabled: true,
    text: "Bienvenue sur Kalagban — La Marketplace n°1 des vendeurs vérifiés en Côte d'Ivoire !",
    bg_color: "#6d28d9",
    text_color: "#ffffff"
  });

  const [heroConfig, setHeroConfig] = useState({
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

  const [promoBannerConfig, setPromoBannerConfig] = useState({
    enabled: true,
    ad_type: "standard",
    raw_html_code: "",
    target_url: "#catalogue",
    phone_number: "25 20 00 61 61",
    callout_label: "Commandez au",
    title: "CATÉGORIE DU JOUR",
    subtitle: "Télévisions & Tech",
    price_tag: "DÈS 45 000 FCFA",
    image_url: "/promo_banner_tech.png",
    image_position: "top",
    banner_height: "standard",
  });

  const [categoryBubblesConfig, setCategoryBubblesConfig] = useState({
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

  const [flashSaleTimerConfig, setFlashSaleTimerConfig] = useState({
    enabled: true,
    title: "OFFRES LIMITÉES",
    duration_hours: 24,
    end_time: "2026-08-06T23:59:59Z",
  });

  const [popupBannerConfig, setPopupBannerConfig] = useState({
    enabled: true,
    show_once_per_session: false,
    auto_delay_ms: 1000,
    auto_scroll_interval_ms: 3500,
    images: [
      { image_url: "/promo_banner_tech.png", link_url: "#catalogue" }
    ] as (string | { image_url: string; link_url?: string })[],
    target_url: "#catalogue",
  });

  const [showPopupModal, setShowPopupModal] = useState(false);
  const [popupSlideIndex, setPopupSlideIndex] = useState(0);

  // Auto-scroll Timer for Promotional Pop-up Modal Slides
  useEffect(() => {
    if (!showPopupModal || !popupBannerConfig.enabled || !popupBannerConfig.images || popupBannerConfig.images.length <= 1) {
      return;
    }
    const interval = setInterval(() => {
      setPopupSlideIndex((prev) => (prev + 1) % popupBannerConfig.images.length);
    }, popupBannerConfig.auto_scroll_interval_ms || 3500);

    return () => clearInterval(interval);
  }, [showPopupModal, popupBannerConfig.enabled, popupBannerConfig.images, popupBannerConfig.auto_scroll_interval_ms]);

  // Hero Carousel Images
  const carouselImages = heroConfig.carousel_images && heroConfig.carousel_images.length > 0
    ? heroConfig.carousel_images
    : ["/hero_3d_shopping_bag.png", "/cousel1.jpg", "/carousel2.jpg", "/carousel3.jpg"];

  const [currentSlide, setCurrentSlide] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  // Auto-scroll Categories Bar
  const categoryScrollRef = useRef<HTMLDivElement>(null);
  const isCategoryHovered = false;

  // Countdown timer for Flash Sale
  const [timeLeft, setTimeLeft] = useState({ hours: 5, minutes: 59, seconds: 33 });

  // Auto-play Hero Carousel Timer
  useEffect(() => {
    if (isHovered) return;
    const slideInterval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
    }, 4000);

    return () => clearInterval(slideInterval);
  }, [carouselImages.length, isHovered]);

  // Auto-scroll Categories Bar Timer
  useEffect(() => {
    if (isCategoryHovered) return;
    const catTimer = setInterval(() => {
      if (categoryScrollRef.current) {
        const { scrollLeft, scrollWidth, clientWidth } = categoryScrollRef.current;
        if (scrollLeft + clientWidth >= scrollWidth - 15) {
          categoryScrollRef.current.scrollTo({ left: 0, behavior: "smooth" });
        } else {
          categoryScrollRef.current.scrollBy({ left: 220, behavior: "smooth" });
        }
      }
    }, 2500);

    return () => clearInterval(catTimer);
  }, [isCategoryHovered]);

  // Flash Sale Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev.seconds > 0) {
          return { ...prev, seconds: prev.seconds - 1 };
        } else if (prev.minutes > 0) {
          return { ...prev, minutes: 59, seconds: 59 };
        } else if (prev.hours > 0) {
          return { hours: prev.hours - 1, minutes: 59, seconds: 59 };
        }
        return { hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchHomePageData = async () => {
    try {
      // 0. Fetch Live Visual CMS Site Settings
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("key, value");

      if (settingsData) {
        settingsData.forEach((row) => {
          if (row.key === "category_bubbles" && row.value) {
            const val = row.value as typeof categoryBubblesConfig;
            setCategoryBubblesConfig({
              ...val,
              style: val.style || "bubbles",
              enabled: val.enabled !== false,
            });
          }
          if (row.key === "top_banner" && row.value) setTopBannerConfig(row.value);
          if (row.key === "hero_section" && row.value) setHeroConfig(row.value);
          if (row.key === "promo_banner" && row.value) setPromoBannerConfig(row.value);
          if (row.key === "flash_sale_timer" && row.value) setFlashSaleTimerConfig(row.value as typeof flashSaleTimerConfig);
          if (row.key === "popup_banner" && row.value) {
            const popupCfg = row.value as typeof popupBannerConfig;
            setPopupBannerConfig(popupCfg);
            if (popupCfg.enabled && popupCfg.images && popupCfg.images.length > 0) {
              setTimeout(() => {
                setShowPopupModal(true);
              }, popupCfg.auto_delay_ms || 1000);
            }
          }
        });
      } else if (typeof window !== "undefined") {
        const localPromo = localStorage.getItem("kalagban_promo_banner");
        if (localPromo) {
          try {
            setPromoBannerConfig(JSON.parse(localPromo));
          } catch {}
        }
      }


      // 1. Fetch Active Flash Sale Campaign
      const { data: flashData } = await supabase
        .from("flash_sales")
        .select("*")
        .eq("status", "active")
        .gt("end_time", new Date().toISOString())
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (flashData) {
        setActiveFlashSale(flashData as FlashSaleCampaign);
        const end = new Date(flashData.end_time).getTime();
        const now = new Date().getTime();
        const diffMs = Math.max(0, end - now);
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);
        setTimeLeft({ hours, minutes, seconds });
      }

      // 2. Fetch Products
      const { data: prodData, error: prodErr } = await supabase
        .from("products")
        .select("*, product_media(url)")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (!prodErr && prodData) {
        const formatted: ProductType[] = prodData.map((item: {
          id: string;
          shop_id: string;
          title: string;
          description?: string;
          category?: string;
          price: number;
          old_price?: number | null;
          stock_quantity: number;
          status: string;
          product_media?: { url: string }[];
        }) => ({
          id: item.id,
          shop_id: item.shop_id,
          title: item.title,
          description: item.description,
          category: item.category,
          price: Number(item.price),
          old_price: item.old_price ? Number(item.old_price) : null,
          stock_quantity: item.stock_quantity,
          status: item.status,
          image_url: item.product_media && item.product_media.length > 0 ? item.product_media[0].url : null,
        }));
        setProducts(formatted);
      }

      // 3. Fetch Featured Shops
      const { data: featuredShops } = await supabase
        .from("shops")
        .select("*")
        .eq("is_featured", true)
        .order("created_at", { ascending: false });

      if (featuredShops && featuredShops.length > 0) {
        setShops(featuredShops as ShopType[]);
      } else {
        const { data: shopData } = await supabase
          .from("shops")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(4);

        if (shopData) {
          setShops(shopData as ShopType[]);
        }
      }

    } catch (err) {
      console.error("Unexpected error fetching homepage data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;
    const initData = async () => {
      if (isMounted) {
        await fetchHomePageData();
      }
    };
    initData();

    const channel = supabase
      .channel("public_site_settings_buyer")
      .on("postgres_changes", { event: "*", schema: "public", table: "site_settings" }, () => {
        if (isMounted) fetchHomePageData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shops" }, () => {
        if (isMounted) fetchHomePageData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const flashSaleProducts = products.filter(
    (p) => (p.old_price && p.old_price > p.price) || p.stock_quantity <= 5
  );

  const activeParentCategory = CATEGORY_TREE.find(
    (c) => c.id.toLowerCase() === selectedCategory.toLowerCase()
  );

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));

    if (q) {
      return matchesSearch;
    }

    let matchesCategory = true;
    if (selectedCategory !== "all") {
      const prodCat = (p.category || "").toLowerCase();

      if (selectedSubCategory !== "all") {
        matchesCategory = prodCat === selectedSubCategory.toLowerCase();
      } else if (activeParentCategory) {
        const subIds = activeParentCategory.subCategories.map((s) => s.id.toLowerCase());
        matchesCategory =
          prodCat === selectedCategory.toLowerCase() ||
          subIds.includes(prodCat) ||
          prodCat.includes(selectedCategory.toLowerCase());
      } else {
        matchesCategory = prodCat === selectedCategory.toLowerCase();
      }
    }

    return matchesSearch && matchesCategory;
  });

  const nextSlide = () => setCurrentSlide((prev) => (prev + 1) % carouselImages.length);
  const prevSlide = () => setCurrentSlide((prev) => (prev - 1 + carouselImages.length) % carouselImages.length);

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans relative">
      
      {/* SUBTLE TRANSPARENT AFRICAN PATTERN BACKGROUND OVERLAY */}
      <div 
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.04] mix-blend-multiply bg-repeat bg-size-[320px_320px]"
        style={{ backgroundImage: "url('/african_pattern_bg.png')" }}
      />      {/* TOP ANNOUNCEMENT BANNER */}
      {topBannerConfig.enabled && (
        <div 
          className="relative z-10 text-xs font-bold py-2 px-4 text-center flex items-center justify-center gap-2"
          style={{ backgroundColor: topBannerConfig.bg_color, color: topBannerConfig.text_color }}
        >
          <Sparkles size={14} className="text-amber-300 animate-pulse" />
          <span>{topBannerConfig.text}</span>
        </div>
      )}

      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-16 space-y-10">
        
        {/* HERO SECTION WITH AUTO-SLIDING CAROUSEL */}
        <div className="relative rounded-3xl bg-linear-to-r from-[#f4f2ff] via-[#f7f5ff] to-[#f4f2ff] p-5 sm:p-10 md:p-12 border border-[#e8e4ff] overflow-hidden shadow-xs flex flex-row items-center justify-between gap-4 sm:gap-8">
          
          {/* Left Text Banner */}
          <div className="relative z-10 flex-1 min-w-0">
            <span className="inline-flex items-center gap-1.5 bg-[#ede9fe] text-[#6d28d9] font-extrabold text-[10px] sm:text-[11px] uppercase tracking-wider px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-full mb-3 sm:mb-5">
              <Sparkles size={12} className="text-[#6d28d9]" /> {heroConfig.badge_text}
            </span>
            
            <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-gray-900 tracking-tight leading-tight mb-3 sm:mb-5">
              {heroConfig.title_start} <span className="text-[#6d28d9]">{heroConfig.title_highlight}</span>{heroConfig.title_end}
            </h1>
            
            <p className="text-gray-600 text-xs sm:text-base font-medium leading-relaxed mb-4 sm:mb-8 line-clamp-3 sm:line-clamp-none">
              {heroConfig.description}
            </p>
            
            <a 
              href="#catalogue"
              className="inline-flex items-center gap-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-black px-4 sm:px-7 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl shadow-lg shadow-[#6d28d9]/25 transition-all text-xs sm:text-sm group cursor-pointer"
            >
              {heroConfig.button_text}
              <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
            </a>
          </div>

          {/* Right Image Carousel Container (Stays on the right for Mobile, Tablet & PC) */}
          <div 
            className="relative w-36 sm:w-72 md:w-96 aspect-square rounded-2xl sm:rounded-3xl overflow-hidden shadow-lg border border-white/80 bg-white group shrink-0"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            {/* Carousel Images with Smooth Fade */}
            {carouselImages.map((imgSrc, idx) => (
              <div 
                key={idx}
                className={`absolute inset-0 transition-opacity duration-700 ease-in-out flex items-center justify-center p-2 bg-white ${
                  idx === currentSlide ? "opacity-100 z-10" : "opacity-0 z-0"
                }`}
              >
                <img 
                  src={imgSrc} 
                  alt={`Slide ${idx + 1}`} 
                  className="w-full h-full object-contain rounded-2xl" 
                />
              </div>
            ))}

            {/* Navigation Arrows on Hover */}
            <button
              onClick={prevSlide}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white/90 backdrop-blur-md text-gray-800 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer"
              title="Précédent"
            >
              <ChevronLeft size={20} />
            </button>

            <button
              onClick={nextSlide}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 bg-white/90 backdrop-blur-md text-gray-800 rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white cursor-pointer"
              title="Suivant"
            >
              <ChevronRight size={20} />
            </button>

            {/* Pagination Dots */}
            <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/30 backdrop-blur-md px-3 py-1.5 rounded-full">
              {carouselImages.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-2 rounded-full transition-all cursor-pointer ${
                    idx === currentSlide ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                  }`}
                />
              ))}
            </div>
          </div>

        </div>

        {/* ANIMATED CATEGORY CIRCLES STRIP (STORIES / QUICK CATEGORY FILTER) */}
        {categoryBubblesConfig.enabled !== false && (
          (categoryBubblesConfig.style === "bubbles" || !categoryBubblesConfig.style) ? (
            <div className="bg-white/90 backdrop-blur-md rounded-3xl p-5 border border-gray-100/90 shadow-xs relative overflow-hidden">
              <div className="flex items-center justify-between gap-4 mb-3 px-1">
                <span className="text-xs font-black uppercase tracking-wider text-gray-700 flex items-center gap-1.5">
                  <Sparkles size={14} className="text-[#6d28d9]" /> Catégories en Vedette
                </span>
                <span className="text-[11px] font-bold text-gray-400">Cliquez pour filtrer les offres</span>
              </div>

              {/* Centered Scrollable Animated Circles Bar */}
              <div className="flex items-center justify-center gap-4 sm:gap-8 overflow-x-auto pb-2 scrollbar-none pt-1 flex-wrap sm:flex-nowrap">
                {categoryBubblesConfig.items.map((cat, idx) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <button
                      key={idx}
                      onClick={() => {
                        if (cat.id === "all") {
                          setSelectedCategory("all");
                        } else {
                          router.push(`/category/${cat.id}`);
                        }
                      }}
                      className="group flex flex-col items-center gap-2 cursor-pointer shrink-0 transition-all focus:outline-none"
                    >
                      {/* Animated Circle Container with Gradient Ring */}
                      <div className="relative">
                        <div
                          className={`w-20 h-20 sm:w-22 sm:h-22 rounded-full p-0.75 bg-linear-to-tr ${
                            cat.color || "from-violet-600 via-indigo-500 to-amber-400"
                          } transition-all duration-300 group-hover:scale-110 group-hover:-translate-y-1.5 shadow-md group-hover:shadow-indigo-500/25 ${
                            isSelected ? "ring-4 ring-purple-300 scale-105" : ""
                          }`}
                        >
                          <div className="w-full h-full bg-white rounded-full p-1 overflow-hidden relative flex items-center justify-center">
                            <img
                              src={cat.image_url}
                              alt={cat.name}
                              className="w-full h-full object-cover rounded-full transition-transform duration-500 group-hover:scale-110"
                            />
                          </div>
                        </div>

                        {/* Badge Tag Pill */}
                        {cat.tag && (
                          <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 bg-[#6d28d9] text-white font-black text-[9px] px-2 py-0.5 rounded-full shadow-md tracking-wider uppercase whitespace-nowrap border border-white">
                            {cat.tag}
                          </span>
                        )}
                      </div>

                      {/* Category Label */}
                      <span
                        className={`text-xs font-black text-center tracking-tight truncate max-w-22.5 sm:max-w-25 transition-colors ${
                          isSelected ? "text-[#6d28d9] underline font-extrabold" : "text-gray-800 group-hover:text-[#6d28d9]"
                        }`}
                      >
                        {cat.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 bg-indigo-50 text-[#6d28d9] rounded-xl flex items-center justify-center shrink-0">
                  <Truck size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">Livraison Rapide</h4>
                  <p className="text-xs text-gray-400 font-medium">À Abidjan et dans toutes les régions</p>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">Vendeurs Vérifiés</h4>
                  <p className="text-xs text-gray-400 font-medium">Boutiques certifiées Kalagban</p>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                  <Clock size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">Service 7j/7</h4>
                  <p className="text-xs text-gray-400 font-medium">Support client réactif</p>
                </div>
              </div>

              <div className="bg-white p-4.5 rounded-2xl border border-gray-100 shadow-xs flex items-center gap-3.5">
                <div className="w-11 h-11 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center shrink-0">
                  <RotateCcw size={22} />
                </div>
                <div>
                  <h4 className="font-extrabold text-sm text-gray-900">Paiement à la livraison</h4>
                  <p className="text-xs text-gray-400 font-medium">Wave, Orange Money ou Cash</p>
                </div>
              </div>
            </div>
          )
        )}

        {/* 1. OFFRES LIMITÉES / VENTES FLASH SECTION */}
        {flashSaleTimerConfig.enabled && (flashSaleProducts.length > 0 || activeFlashSale || products.length > 0) && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100/90 shadow-xs relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-[#6d28d9]" />
                <h2 className="text-xs font-black uppercase tracking-wider text-gray-700">
                  {flashSaleTimerConfig.title || "OFFRES LIMITÉES"}
                </h2>
              </div>

              {/* Countdown Timer in Purple */}
              <div className="flex items-center gap-2 text-xs font-bold text-gray-500">
                <Clock size={14} className="text-[#6d28d9]" />
                <span>FINIT DANS :</span>
                <span className="font-mono font-black text-[#6d28d9]">
                  {String(timeLeft.hours).padStart(2, "0")}h : {String(timeLeft.minutes).padStart(2, "0")}m : {String(timeLeft.seconds).padStart(2, "0")}s
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
              {(flashSaleProducts.length > 0 ? flashSaleProducts : products).slice(0, 4).map((prod) => (
                <ProductCard key={prod.id} product={prod} />
              ))}
            </div>
          </section>
        )}

        {/* HIGH IMPACT HORIZONTAL PROMOTIONAL BANNER STRIP (100% RESPONSIVE, NO CLOSE BUTTON) */}
        {promoBannerConfig.enabled && (
          promoBannerConfig.ad_type === "custom_code" && promoBannerConfig.raw_html_code ? (
            <div className="relative rounded-3xl overflow-hidden shadow-md border border-gray-100 bg-white p-4 w-full">
              <div dangerouslySetInnerHTML={{ __html: promoBannerConfig.raw_html_code }} />
            </div>
          ) : (promoBannerConfig.ad_type === "full_image" || (promoBannerConfig.image_url && promoBannerConfig.ad_type !== "standard")) ? (
            <div className={`relative rounded-3xl overflow-hidden shadow-lg border border-gray-100 group bg-slate-900 w-full flex items-center justify-center cursor-pointer ${
              promoBannerConfig.banner_height === "compact" ? "h-44 sm:h-56" :
              promoBannerConfig.banner_height === "large" ? "h-72 sm:h-96 md:h-105" :
              promoBannerConfig.banner_height === "auto" ? "h-auto max-h-125" :
              "h-56 sm:h-64 md:h-80"
            }`}>
              <a href={promoBannerConfig.target_url || "#catalogue"} className="block w-full h-full">
                <img
                  src={promoBannerConfig.image_url}
                  alt={promoBannerConfig.title || "Bannière Publicitaire"}
                  className={`w-full h-full transition-transform duration-700 group-hover:scale-[1.005] ${
                    promoBannerConfig.image_position === "contain"
                      ? "object-contain"
                      : promoBannerConfig.image_position === "bottom"
                      ? "object-cover object-bottom"
                      : promoBannerConfig.image_position === "center"
                      ? "object-cover object-center"
                      : "object-cover object-top"
                  }`}
                />
              </a>
            </div>
          ) : (
            <div className="relative rounded-3xl overflow-hidden shadow-md flex flex-col md:flex-row items-stretch border border-[#006666] w-full">
              
              {/* Left Orange Ordering Callout */}
              <div className="bg-linear-to-r from-amber-500 to-orange-500 text-white font-black px-6 py-4 flex items-center justify-center gap-3 shrink-0">
                <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center animate-bounce">
                  <PhoneCall size={22} className="text-white" />
                </div>
                <div className="leading-tight">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-100 block">{promoBannerConfig.callout_label}</span>
                  <span className="text-lg font-black tracking-tight">{promoBannerConfig.phone_number}</span>
                </div>
              </div>

              {/* Main Teal Promo Content */}
              <div className="flex-1 bg-linear-to-r from-[#005f60] via-[#007374] to-[#004d4e] text-white p-5 flex flex-col sm:flex-row items-center justify-between gap-4 relative">
                
                <div className="flex items-center gap-4 z-10">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
                        {promoBannerConfig.title}
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-amber-300 underline decoration-amber-400">
                        {promoBannerConfig.subtitle}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Price Tag & Banner Preview Image */}
                <div className="flex items-center gap-5 z-10">
                  <span className="bg-amber-400 text-gray-950 font-black text-sm sm:text-base px-5 py-2 rounded-xl uppercase shadow-md tracking-wider shrink-0">
                    {promoBannerConfig.price_tag}
                  </span>
                  {promoBannerConfig.image_url && (
                    <div className="w-28 sm:w-36 h-14 rounded-xl overflow-hidden shadow-lg border border-white/20 shrink-0 hidden sm:block">
                      <img src={promoBannerConfig.image_url} alt="Promo" className="w-full h-full object-cover" />
                    </div>
                  )}
                </div>

              </div>

            </div>
          )
        )}

        {/* 2. BOUTIQUES VEDETTES SECTION */}
        {shops.length > 0 && (
          <section className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100/90 shadow-xs">
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-indigo-50 text-[#6d28d9] rounded-xl flex items-center justify-center shrink-0">
                <Store size={20} />
              </div>
              <div>
                <h2 className="text-lg font-black text-gray-900 tracking-tight">
                  Boutiques Vedettes
                </h2>
                <p className="text-xs text-gray-400 font-medium">Découvrez les vendeurs certifiés sur Kalagban</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {shops.map((shop) => (
                <div key={shop.id} className="bg-slate-50/70 rounded-2xl p-5 border border-gray-100 flex flex-col justify-between gap-4 group">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-linear-to-br from-[#6d28d9] to-purple-600 text-white rounded-xl overflow-hidden shrink-0 flex items-center justify-center font-black text-lg shadow-xs">
                      {shop.logo_url && !shop.logo_url.startsWith("file://") ? (
                        <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                      ) : (
                        shop.name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <h3 className="font-extrabold text-sm text-gray-900 line-clamp-1">
                          {shop.name}
                        </h3>
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0" />
                      </div>
                      <span className="text-[10px] font-bold text-[#6d28d9] bg-purple-50 px-2 py-0.5 rounded-full border border-purple-100 inline-block mt-0.5">
                        {shop.featured_badge || "Vendeur Vérifié"}
                      </span>
                    </div>
                  </div>

                  {shop.description && (
                    <p className="text-xs text-gray-400 font-medium line-clamp-2 leading-relaxed">
                      {shop.description}
                    </p>
                  )}

                  <a
                    href="#catalogue"
                    className="w-full bg-white hover:bg-[#6d28d9] hover:text-white text-gray-900 font-bold text-xs py-2.5 px-3 rounded-xl border border-gray-200/80 text-center transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    Voir les articles <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* 3. CATEGORY CATALOG SECTION WITH SIDEBAR NAV */}
        <div id="catalogue" className="pt-2">
          {/* Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="text-[#6d28d9]" />
                <h2 className="text-xl font-black text-gray-900 tracking-tight">
                  {selectedCategory === "all"
                    ? "Catalogue Général"
                    : activeParentCategory
                    ? `Rayon ${activeParentCategory.label}`
                    : PRODUCT_CATEGORIES.find((c) => c.id === selectedCategory)?.label || "Catalogue"}
                </h2>
              </div>
              <p className="text-xs text-gray-400 font-medium mt-0.5">
                {filteredProducts.length} article(s) disponible(s) {selectedCategory !== "all" && `dans la catégorie ${selectedCategory.toUpperCase()}`}
              </p>
            </div>

            {/* Reset / All Categories Quick Button */}
            {selectedCategory !== "all" && (
              <button
                onClick={() => {
                  setSelectedCategory("all");
                  setSelectedSubCategory("all");
                }}
                className="self-start sm:self-auto bg-purple-50 hover:bg-purple-100 text-[#6d28d9] font-bold text-xs px-4 py-2 rounded-xl transition-colors flex items-center gap-1.5 border border-purple-100 cursor-pointer"
              >
                <RotateCcw size={14} /> Voir tous les rayons
              </button>
            )}
          </div>

          {/* Top Parent Category Avatar Bubbles Strip */}
          <div className="flex items-center gap-2.5 overflow-x-auto pb-4 custom-scrollbar scroll-smooth mb-6">
            <button
              onClick={() => {
                setSelectedCategory("all");
                setSelectedSubCategory("all");
              }}
              className={`px-5 py-3 rounded-2xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                selectedCategory === "all"
                  ? "bg-[#6d28d9] text-white shadow-md shadow-[#6d28d9]/30 scale-105"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200/80"
              }`}
            >
              🛍️ Toutes les offres
            </button>

            {CATEGORY_TREE.map((parent) => {
              const isSelected = selectedCategory === parent.id;
              return (
                <button
                  key={parent.id}
                  onClick={() => {
                    setSelectedCategory(parent.id);
                    setSelectedSubCategory("all");
                  }}
                  className={`px-5 py-3 rounded-2xl text-xs font-black whitespace-nowrap transition-all flex items-center gap-2 shrink-0 cursor-pointer ${
                    isSelected
                      ? "bg-linear-to-r from-purple-600 to-indigo-600 text-white shadow-md shadow-purple-500/25 scale-105"
                      : "bg-white text-gray-800 hover:bg-purple-50/50 border border-gray-200/80"
                  }`}
                >
                  <img src={parent.image} alt={parent.label} className="w-5 h-5 rounded-full object-cover border border-white" />
                  {parent.label}
                </button>
              );
            })}
          </div>

          {/* TWO COLUMN LAYOUT: SIDEBAR + PRODUCT GRID */}
          <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* SIDEBAR FOR SUB-CATEGORIES */}
            {activeParentCategory && (
              <aside className="w-full lg:w-72 shrink-0 bg-white rounded-3xl p-5 border border-gray-100/90 shadow-xs sticky top-24">
                <div className="flex items-center justify-between pb-3 mb-4 border-b border-gray-100">
                  <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                    <Sparkles size={14} className="text-[#6d28d9]" />
                    {activeParentCategory.label}
                  </span>
                  <span className="text-[10px] font-bold bg-purple-50 text-[#6d28d9] px-2 py-0.5 rounded-full border border-purple-100">
                    {activeParentCategory.subCategories.length} sous-catégories
                  </span>
                </div>

                <div className="flex flex-col gap-1.5">
                  {/* All Subcategories Pill */}
                  <button
                    onClick={() => setSelectedSubCategory("all")}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      selectedSubCategory === "all"
                        ? "bg-[#6d28d9] text-white shadow-sm font-extrabold"
                        : "text-gray-700 hover:bg-gray-50"
                    }`}
                  >
                    <span>Tous les articles ({activeParentCategory.label})</span>
                    <ChevronRight size={14} className={selectedSubCategory === "all" ? "text-white" : "text-gray-400"} />
                  </button>

                  {/* Subcategories Items List */}
                  {activeParentCategory.subCategories.map((sub) => {
                    const isSubSelected = selectedSubCategory.toLowerCase() === sub.id.toLowerCase();
                    const subCount = products.filter(
                      (p) => (p.category || "").toLowerCase() === sub.id.toLowerCase()
                    ).length;

                    return (
                      <button
                        key={sub.id}
                        onClick={() => setSelectedSubCategory(sub.id)}
                        className={`w-full text-left px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSubSelected
                            ? "bg-purple-50 text-[#6d28d9] font-black border border-purple-200/80 shadow-2xs"
                            : "text-gray-600 hover:bg-gray-50 hover:text-[#6d28d9]"
                        }`}
                      >
                        <span className="truncate">{sub.label}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                          isSubSelected ? "bg-[#6d28d9] text-white" : "bg-gray-100 text-gray-500"
                        }`}>
                          {subCount}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Sidebar Guarantee Badge */}
                <div className="mt-6 p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
                  <ShieldCheck size={20} className="text-emerald-500 shrink-0" />
                  <div>
                    <h4 className="font-extrabold text-[11px] text-gray-900">Retrait Sécurisé</h4>
                    <p className="text-[10px] text-gray-400">Point Relais vérifié Abidjan</p>
                  </div>
                </div>
              </aside>
            )}

            {/* MAIN CATALOG PRODUCTS GRID */}
            <div className="flex-1 min-w-0 w-full">
              {isLoading ? (
                <div className="py-16 flex flex-col items-center justify-center">
                  <Loader2 className="animate-spin text-[#6d28d9] w-10 h-10 mb-3" />
                  <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des produits...</p>
                </div>
              ) : filteredProducts.length === 0 ? (
                <div className="bg-white rounded-3xl p-10 text-center border border-gray-100 shadow-xs max-w-lg mx-auto my-4">
                  <div className="w-14 h-14 bg-purple-50 text-[#6d28d9] rounded-full flex items-center justify-center mx-auto mb-3">
                    <ShoppingBag size={28} />
                  </div>
                  <h3 className="text-base font-extrabold text-gray-900 mb-1">Aucun produit disponible</h3>
                  <p className="text-gray-400 text-xs mb-5">
                    Aucun produit ne correspond à cette sous-catégorie pour le moment.
                  </p>
                  <button
                    onClick={() => { setSelectedCategory("all"); setSelectedSubCategory("all"); setSearchTerm(""); }}
                    className="bg-[#6d28d9] text-white font-bold px-5 py-2.5 rounded-xl text-xs cursor-pointer shadow-md hover:bg-purple-800 transition-colors"
                  >
                    Voir toutes les offres
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
                  {filteredProducts.map((prod) => (
                    <ProductCard key={prod.id} product={prod} />
                  ))}
                </div>
              )}
            </div>

          </div>
        </div>

      </main>

      {/* PROMOTIONAL POP-UP MODAL BANNER (RESPONSIVE & AUTO-SCROLLING WITH PARTNER LINKS) */}
      {showPopupModal && popupBannerConfig.enabled && popupBannerConfig.images && popupBannerConfig.images.length > 0 && (() => {
        const normalizedSlides = popupBannerConfig.images.map((item) => {
          if (typeof item === "string") {
            return { image_url: item, link_url: popupBannerConfig.target_url || "#catalogue" };
          }
          return {
            image_url: item.image_url || "/promo_banner_tech.png",
            link_url: item.link_url || popupBannerConfig.target_url || "#catalogue",
          };
        });

        const activeSlide = normalizedSlides[popupSlideIndex] || normalizedSlides[0];
        const isExternal = activeSlide.link_url?.startsWith("http");

        return (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-300">
            <div className="bg-white rounded-3xl overflow-hidden shadow-2xl w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-xl max-h-[92vh] relative border border-white/20 flex flex-col group">
              
              {/* Top Close Button (X) */}
              <button
                onClick={() => setShowPopupModal(false)}
                className="absolute top-3 right-3 z-30 w-9 h-9 sm:w-10 sm:h-10 bg-black/75 hover:bg-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-all cursor-pointer shadow-lg border border-white/30 hover:scale-105"
                title="Fermer la publicité"
              >
                <X size={20} />
              </button>

              {/* Modal Image Slider - Adaptive Container respecting full image dimensions */}
              <div className="relative w-full bg-slate-950 overflow-hidden flex items-center justify-center min-h-65 max-h-[68vh]">
                {/* Ambient Blurred Background to fill empty aspect ratio borders cleanly */}
                <img
                  src={activeSlide.image_url}
                  alt=""
                  aria-hidden="true"
                  className="absolute inset-0 w-full h-full object-cover blur-2xl opacity-35 scale-125 pointer-events-none"
                />

                <a
                  href={activeSlide.link_url}
                  target={isExternal ? "_blank" : "_self"}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={() => setShowPopupModal(false)}
                  className="relative z-10 w-full h-full flex items-center justify-center cursor-pointer p-1"
                >
                  <img
                    src={activeSlide.image_url}
                    alt="Offre Spéciale Pop-up"
                    className="w-auto h-auto max-w-full max-h-[65vh] object-contain transition-transform duration-500 group-hover:scale-[1.02]"
                  />
                </a>

                {/* Prev / Next Buttons if Multiple Images */}
                {normalizedSlides.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setPopupSlideIndex((prev) =>
                          prev === 0 ? normalizedSlides.length - 1 : prev - 1
                        )
                      }
                      className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer shadow-md"
                    >
                      <ChevronLeft size={20} />
                    </button>
                    <button
                      onClick={() =>
                        setPopupSlideIndex((prev) =>
                          prev === normalizedSlides.length - 1 ? 0 : prev + 1
                        )
                      }
                      className="absolute right-2 sm:right-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer shadow-md"
                    >
                      <ChevronRight size={20} />
                    </button>

                    {/* Auto-Scroll Indicator Dots */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1.5 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20">
                      {normalizedSlides.map((_, idx) => (
                        <button
                          key={idx}
                          onClick={() => setPopupSlideIndex(idx)}
                          className={`h-2 rounded-full transition-all cursor-pointer ${
                            idx === popupSlideIndex ? "w-6 bg-white" : "w-2 bg-white/50 hover:bg-white/80"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Bottom CTA */}
              <div className="p-3.5 sm:p-5 bg-white flex items-center justify-between gap-3 border-t border-gray-100">
                <div className="space-y-0.5 min-w-0">
                  <span className="text-[11px] sm:text-xs font-black uppercase tracking-wider text-[#6d28d9] flex items-center gap-1">
                    <Sparkles size={13} /> OFFRE SPÉCIALE PARTENAIRE
                  </span>
                  <p className="text-[11px] sm:text-xs text-gray-500 font-medium truncate">
                    {activeSlide.link_url && activeSlide.link_url !== "#catalogue" ? `Visiter : ${activeSlide.link_url}` : "Découvrez les promotions exclusives du moment"}
                  </p>
                </div>

                <a
                  href={activeSlide.link_url}
                  target={isExternal ? "_blank" : "_self"}
                  rel={isExternal ? "noopener noreferrer" : undefined}
                  onClick={() => setShowPopupModal(false)}
                  className="bg-[#6d28d9] hover:bg-indigo-700 text-white font-extrabold text-xs px-4 sm:px-6 py-2.5 sm:py-3 rounded-xl shadow-md shadow-indigo-600/30 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
                >
                  Profiter <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </div>
        );
      })()}

      <Footer />
    </div>
  );
}
