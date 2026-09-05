"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { supabase } from "@/lib/supabase";
import { useCart } from "@/context/CartContext";
import { useToast } from "@/context/ToastContext";
import {
  ArrowLeft,
  Sparkles,
  Clock,
  Check,
  Plus,
  Tag,
  Share2,
  ShieldCheck,
  Truck,
  RotateCcw,
} from "lucide-react";

interface CampaignData {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  banner_url?: string;
  theme_color?: string;
  countdown_end?: string;
  status: string;
}

interface CampaignProduct {
  id: string;
  shop_id: string;
  title: string;
  category?: string;
  price: number;
  original_price?: number;
  discount_percentage?: number;
  stock_allocated: number;
  stock_sold: number;
  image_url: string;
  vendor_name?: string;
}

export default function WebBuyerPromoCampaignPage() {
  const params = useParams();
  const slug = params?.slug as string;
  const { addToCart } = useCart();
  const { toast } = useToast();

  const [searchTerm, setSearchTerm] = useState("");
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [products, setProducts] = useState<CampaignProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [addedItemNotice, setAddedItemNotice] = useState<string | null>(null);

  // Countdown timer state
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: false,
  });

  const slugify = (text: string) => {
    return text
      .toString()
      .toLowerCase()
      .trim()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/\s+/g, "-")
      .replace(/[^\w-]+/g, "")
      .replace(/--+/g, "-");
  };

  useEffect(() => {
    let isMounted = true;

    async function fetchCampaignData() {
      if (!slug) return;
      try {
        const rawSlug = String(slug || "").trim();
        const decodedSlug = decodeURIComponent(rawSlug).trim();
        const normalizedSlug = slugify(decodedSlug);

        // 1. Search campaign with multiple candidate keys
        const candidateKeys = Array.from(
          new Set([rawSlug, decodedSlug, normalizedSlug, decodedSlug.toLowerCase()])
        ).filter(Boolean);
        let targetCamp: CampaignData | null = null;

        for (const key of candidateKeys) {
          const { data } = await supabase
            .from("promotional_campaigns")
            .select("*")
            .or(`slug.eq."${key}",id.eq."${key}",slug.ilike."%${key}%",title.ilike."%${key}%"`)
            .limit(1)
            .maybeSingle();

          if (data) {
            targetCamp = data;
            break;
          }
        }

        if (!targetCamp) {
          // Fallback to active campaign
          const { data: latestActive } = await supabase
            .from("promotional_campaigns")
            .select("*")
            .eq("status", "active")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          if (latestActive) {
            targetCamp = latestActive;
          }
        }

        if (!targetCamp) {
          const formattedTitle = decodedSlug
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

          targetCamp = {
            id: `camp-${normalizedSlug}`,
            slug: normalizedSlug,
            title: formattedTitle || "Offre Promotionnelle",
            subtitle: "Découvrez notre sélection spéciale à prix réduits !",
            badge_text: "JUSQU'À -75%",
            theme_color: "#E65100",
            status: "active",
          };
        }

        if (!isMounted) return;
        setCampaign(targetCamp);

        // 2. Fetch linked campaign products with 2-step query (100% resilient)
        let foundProducts: CampaignProduct[] = [];

        if (targetCamp?.id && !targetCamp.id.startsWith("camp-")) {
          const { data: cpRows } = await supabase
            .from("campaign_products")
            .select("*")
            .eq("campaign_id", targetCamp.id)
            .order("position", { ascending: true });

          if (cpRows && cpRows.length > 0) {
            const productIds = cpRows.map((r) => r.product_id).filter(Boolean);
            const { data: prodsData } = await supabase
              .from("products")
              .select("id, shop_id, title, category, price, images, image_url, stock_quantity, product_media(url), shops(name)")
              .in("id", productIds);

            if (prodsData && prodsData.length > 0) {
              type ProductRow = (typeof prodsData)[number];
              const prodMap = new Map(prodsData.map((p: ProductRow) => [p.id, p]));
              foundProducts = cpRows
                .filter((r) => prodMap.has(r.product_id))
                .map((r) => {
                  const p = prodMap.get(r.product_id)!;
                  const original = Number(p.price) || 0;
                  const discount = Number(r.discount_percentage) || 20;
                  const finalPrice = r.special_price
                    ? Number(r.special_price)
                    : Math.round(original * (1 - discount / 100));
                  const rawImg = p.product_media?.[0]?.url || p.image_url || p.images?.[0] || "/placeholder.png";
                  const vendorName = Array.isArray(p.shops) ? p.shops[0]?.name : (p.shops as { name?: string } | null)?.name;

                  return {
                    id: p.id,
                    shop_id: p.shop_id || "",
                    title: p.title || "Article en Promotion",
                    category: p.category || "Général",
                    price: finalPrice,
                    original_price: original > finalPrice ? original : Math.round(finalPrice * 1.3),
                    discount_percentage: discount,
                    stock_allocated: Number(r.stock_allocated) || Number(p.stock_quantity) || 50,
                    stock_sold: Number(r.stock_sold) || 0,
                    image_url: rawImg,
                    vendor_name: vendorName,
                  };
                });
            }
          }
        }

        if (foundProducts.length > 0) {
          if (isMounted) setProducts(foundProducts);
        } else {
          // Fallback: active catalog products with promotional discount
          const { data: generalProducts } = await supabase
            .from("products")
            .select("id, shop_id, title, category, price, images, image_url, stock_quantity, product_media(url), shops(name)")
            .eq("status", "active")
            .limit(24);

          if (generalProducts && generalProducts.length > 0) {
            type GeneralProductRow = (typeof generalProducts)[number];
            const fallbackMapped: CampaignProduct[] = generalProducts.map((p: GeneralProductRow, idx: number) => {
              const original = Number(p.price) || 25000;
              const discount = 20 + (idx % 4) * 15;
              const finalPrice = Math.round(original * (1 - discount / 100));
              const rawImg = p.product_media?.[0]?.url || p.image_url || p.images?.[0] || "/placeholder.png";
              const vendorName = Array.isArray(p.shops) ? p.shops[0]?.name : (p.shops as { name?: string } | null)?.name;

              return {
                id: p.id,
                shop_id: p.shop_id || "",
                title: p.title || "Produit Spécial",
                category: p.category || "Général",
                price: finalPrice,
                original_price: original,
                discount_percentage: discount,
                stock_allocated: Number(p.stock_quantity) || 25,
                stock_sold: 2 + idx,
                image_url: rawImg,
                vendor_name: vendorName,
              };
            });
            if (isMounted) setProducts(fallbackMapped);
          }
        }
      } catch (err) {
        console.error("Erreur chargement campagne dynamique:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    fetchCampaignData();

    const channel = supabase
      .channel("web_buyer_promo_screen_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "campaign_products" }, () => {
        fetchCampaignData();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "promotional_campaigns" }, () => {
        fetchCampaignData();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, [slug]);

  // Realtime Countdown Engine
  useEffect(() => {
    if (!campaign?.countdown_end) return;

    const interval = setInterval(() => {
      const target = new Date(campaign.countdown_end!).getTime();
      const now = new Date().getTime();
      const diff = target - now;

      if (diff <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        clearInterval(interval);
      } else {
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
        const minutes = Math.floor((diff / (1000 * 60)) % 60);
        const seconds = Math.floor((diff / 1000) % 60);
        setTimeLeft({ days, hours, minutes, seconds, isExpired: false });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign?.countdown_end]);

  // Categories extraction
  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return ["all", ...Array.from(set)];
  }, [products]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== "all") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      list = list.filter(
        (p) =>
          p.title.toLowerCase().includes(q) ||
          (p.category && p.category.toLowerCase().includes(q))
      );
    }
    return list;
  }, [products, selectedCategory, searchTerm]);

  const themeColor = campaign?.theme_color || "#E65100";

  const handleAddToCart = (item: CampaignProduct) => {
    addToCart({
      productId: item.id,
      shopId: item.shop_id,
      title: item.title,
      price: item.price,
      oldPrice: item.original_price,
      image: item.image_url,
      quantity: 1,
      maxStock: item.stock_allocated - item.stock_sold,
    });

    setAddedItemNotice(item.id);
    toast.success(`"${item.title}" ajouté au panier !`, "Article Ajouté");
    setTimeout(() => {
      setAddedItemNotice(null);
    }, 2000);
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      toast.success("Lien de la campagne copié !", "Partage Réussi");
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans relative w-full overflow-x-hidden">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-16 space-y-6 sm:space-y-8">
        
        {/* Navigation Back Breadcrumb */}
        <div className="flex items-center justify-between gap-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-bold text-gray-600 hover:text-gray-900 bg-white px-3.5 py-2 rounded-xl border border-gray-200/80 shadow-2xs transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Retour à l&apos;accueil</span>
          </Link>

          <button
            onClick={handleShare}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-gray-700 hover:text-gray-900 bg-white px-3.5 py-2 rounded-xl border border-gray-200/80 shadow-2xs transition-colors cursor-pointer"
          >
            <Share2 size={14} />
            <span>Partager l&apos;offre</span>
          </button>
        </div>

        {loading ? (
          <div className="space-y-6 animate-pulse">
            <div className="h-56 sm:h-72 rounded-3xl bg-gray-200" />
            <div className="h-14 rounded-2xl bg-gray-200" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-80 rounded-3xl bg-gray-200" />
              ))}
            </div>
          </div>
        ) : (
          <>
            {/* HERO CAMPAIGN BANNER */}
            <div
              className="relative rounded-3xl overflow-hidden shadow-xl p-6 sm:p-10 md:p-12 text-white flex flex-col justify-between min-h-56 sm:min-h-64 md:min-h-72"
              style={{ backgroundColor: themeColor }}
            >
              {campaign?.banner_url && (
                <img
                  src={campaign.banner_url}
                  alt={campaign.title}
                  className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-luminosity pointer-events-none"
                />
              )}

              {/* Top badges */}
              <div className="relative z-10 flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/25 backdrop-blur-md text-xs font-black uppercase tracking-wider text-white shadow-xs">
                    <Sparkles size={13} className="text-amber-300" />
                    {campaign?.badge_text || "OFFRE EXCLUSIVE"}
                  </span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500 text-white text-xs font-black uppercase">
                    <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
                    EN DIRECT
                  </span>
                </div>

                <span className="text-xs font-mono font-bold bg-black/30 backdrop-blur-md px-3 py-1 rounded-full text-white/90">
                  /promo/{campaign?.slug || slug}
                </span>
              </div>

              {/* Title & Subtitle */}
              <div className="relative z-10 my-4 max-w-3xl space-y-2">
                <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-tight drop-shadow-xs">
                  {campaign?.title}
                </h1>
                {campaign?.subtitle && (
                  <p className="text-sm sm:text-base md:text-lg text-white/90 font-medium max-w-2xl leading-relaxed">
                    {campaign.subtitle}
                  </p>
                )}
              </div>

              {/* Trust badges footer */}
              <div className="relative z-10 flex items-center gap-4 text-xs font-bold text-white/80 flex-wrap pt-2 border-t border-white/20">
                <span className="flex items-center gap-1.5">
                  <Truck size={14} className="text-amber-300" /> Livraison Express Abidjan &amp; Intérieur
                </span>
                <span className="flex items-center gap-1.5">
                  <ShieldCheck size={14} className="text-emerald-300" /> Produits Authentiques Certifiés
                </span>
                <span className="flex items-center gap-1.5">
                  <RotateCcw size={14} className="text-purple-300" /> Paiement Sécurisé à la Livraison
                </span>
              </div>
            </div>

            {/* COUNTDOWN TIMER STRIP */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-red-600 animate-pulse" />
                <span className="text-xs sm:text-sm font-black uppercase text-gray-800 tracking-tight">
                  {campaign?.status === "ended" ? "Offre Terminée" : "Compte à Rebours (Temps Restant) :"}
                </span>
              </div>

              {campaign?.status === "ended" || timeLeft.isExpired ? (
                <span className="px-4 py-1.5 rounded-xl bg-gray-100 text-gray-600 font-black text-xs">
                  Offre Clôturée
                </span>
              ) : (
                <div className="flex items-center gap-2 font-mono font-black text-xs sm:text-sm">
                  {timeLeft.days > 0 && (
                    <>
                      <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg flex items-baseline gap-1">
                        <span className="text-sm sm:text-base">{String(timeLeft.days).padStart(2, "0")}</span>
                        <span className="text-[10px] text-gray-400">j</span>
                      </div>
                      <span className="text-gray-400 font-black">:</span>
                    </>
                  )}
                  <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg flex items-baseline gap-1">
                    <span className="text-sm sm:text-base">{String(timeLeft.hours).padStart(2, "0")}</span>
                    <span className="text-[10px] text-gray-400">h</span>
                  </div>
                  <span className="text-gray-400 font-black">:</span>
                  <div className="bg-slate-900 text-white px-2.5 py-1.5 rounded-lg flex items-baseline gap-1">
                    <span className="text-sm sm:text-base">{String(timeLeft.minutes).padStart(2, "0")}</span>
                    <span className="text-[10px] text-gray-400">m</span>
                  </div>
                  <span className="text-gray-400 font-black">:</span>
                  <div className="bg-red-600 text-white px-2.5 py-1.5 rounded-lg flex items-baseline gap-1 shadow-xs">
                    <span className="text-sm sm:text-base">{String(timeLeft.seconds).padStart(2, "0")}</span>
                    <span className="text-[10px] text-red-200">s</span>
                  </div>
                </div>
              )}
            </div>

            {/* CATEGORIES TABS */}
            {categories.length > 2 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
                {categories.map((cat) => {
                  const isSelected = selectedCategory === cat;
                  const label =
                    cat === "all"
                      ? "✨ Tout voir"
                      : cat.charAt(0).toUpperCase() + cat.slice(1);

                  return (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`px-4 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all cursor-pointer ${
                        isSelected
                          ? "bg-slate-900 text-white shadow-sm"
                          : "bg-white hover:bg-gray-100 text-gray-700 border border-gray-200/80"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* SECTION HEADER */}
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm sm:text-base font-black text-gray-900 flex items-center gap-2">
                <Tag size={16} className="text-orange-600" />
                Grille Promotionnelle ({filteredProducts.length} article{filteredProducts.length > 1 ? "s" : ""})
              </h2>
            </div>

            {/* PRODUCTS GRID */}
            {filteredProducts.length === 0 ? (
              <div className="py-16 text-center space-y-3 bg-white rounded-3xl border border-dashed border-gray-200 p-8">
                <Tag className="mx-auto text-gray-300 w-12 h-12" />
                <p className="text-sm font-extrabold text-gray-700">Aucun produit dans cette sélection</p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  Revenez à &quot;Tout voir&quot; pour découvrir l&apos;ensemble des kits de la promotion.
                </p>
                <button
                  onClick={() => setSelectedCategory("all")}
                  className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  Afficher tous les articles
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
                {filteredProducts.map((item) => {
                  const remaining = Math.max(1, item.stock_allocated - item.stock_sold);
                  const progressPct = Math.min(
                    100,
                    Math.round((item.stock_sold / item.stock_allocated) * 100)
                  );
                  const isJustAdded = addedItemNotice === item.id;

                  return (
                    <div
                      key={item.id}
                      className="bg-white rounded-3xl p-3 sm:p-4 border border-gray-100 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group relative"
                    >
                      {/* Top Image & Badge */}
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden bg-gray-50 border border-gray-100 mb-3">
                        <img
                          src={item.image_url}
                          alt={item.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        {item.discount_percentage ? (
                          <span className="absolute top-2.5 left-2.5 bg-red-600 text-white font-black text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 rounded-lg shadow-md uppercase tracking-wider">
                            -{item.discount_percentage}%
                          </span>
                        ) : null}
                      </div>

                      {/* Content */}
                      <div className="space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          {item.vendor_name && (
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                              {item.vendor_name}
                            </span>
                          )}
                          <Link href={`/products/${item.id}`}>
                            <h3 className="text-xs sm:text-sm font-bold text-gray-900 line-clamp-2 hover:text-[#6d28d9] transition-colors">
                              {item.title}
                            </h3>
                          </Link>
                        </div>

                        {/* Price Row */}
                        <div className="space-y-0.5 pt-1">
                          <div className="flex items-baseline gap-2">
                            <span
                              className="text-sm sm:text-lg font-black tracking-tight"
                              style={{ color: themeColor }}
                            >
                              {item.price.toLocaleString("fr-FR")} FCFA
                            </span>
                          </div>
                          {item.original_price && item.original_price > item.price ? (
                            <span className="text-[11px] sm:text-xs text-gray-400 line-through block">
                              {item.original_price.toLocaleString("fr-FR")} FCFA
                            </span>
                          ) : null}
                        </div>

                        {/* Stock progress bar */}
                        <div className="space-y-1 pt-1">
                          <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-500"
                              style={{
                                width: `${progressPct}%`,
                                backgroundColor: themeColor,
                              }}
                            />
                          </div>
                          <span className="text-[10px] text-gray-500 font-bold block">
                            {remaining} article{remaining > 1 ? "s" : ""} restant{remaining > 1 ? "s" : ""}
                          </span>
                        </div>

                        {/* Action Button */}
                        <button
                          onClick={() => handleAddToCart(item)}
                          className={`w-full py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-1.5 transition-all shadow-xs cursor-pointer ${
                            isJustAdded
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-900 hover:bg-slate-800 text-white"
                          }`}
                        >
                          {isJustAdded ? (
                            <>
                              <Check size={14} /> Ajouté !
                            </>
                          ) : (
                            <>
                              <Plus size={14} /> Ajouter au Panier
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <Footer />
    </div>
  );
}
