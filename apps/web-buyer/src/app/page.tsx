"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useMemo } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard, { ProductType } from "@/components/ProductCard";
import { CATEGORY_TREE } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import {
  Loader2,
  Sparkles,
  ShoppingBag,
  ArrowRight,
  ShieldCheck,
  Truck,
  ChevronLeft,
  ChevronRight,
  X,
  SlidersHorizontal,
} from "lucide-react";
import PriceRangeFilter from "@/components/PriceRangeFilter";

interface ShopType {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_featured?: boolean;
  featured_badge?: string;
  created_at?: string;
}

interface PromotionalCampaign {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  badge_text?: string;
  banner_url?: string;
  theme_color?: string;
  countdown_end?: string;
  status: string;
  is_featured_home?: boolean;
}

export default function BuyerHomePage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] = useState("all");
  const [products, setProducts] = useState<ProductType[]>([]);
  const [shops, setShops] = useState<ShopType[]>([]);
  const [promotionalCampaigns, setPromotionalCampaigns] = useState<
    PromotionalCampaign[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sortOrder, setSortOrder] = useState("newest");
  const [onlyDeals, setOnlyDeals] = useState(false);

  // Dynamic Price Bounds & Pure Filtering State
  const allPrices = useMemo(
    () =>
      products.map((p) => Number(p.price)).filter((p) => !isNaN(p) && p >= 0),
    [products],
  );
  const minPossiblePrice = 0;
  const maxPossiblePrice = useMemo(
    () =>
      allPrices.length > 0 ? Math.max(Math.max(...allPrices), 25000) : 500000,
    [allPrices],
  );

  const [customMinPrice, setCustomMinPrice] = useState<number | null>(null);
  const [customMaxPrice, setCustomMaxPrice] = useState<number | null>(null);
  const [isMobilePriceModalOpen, setIsMobilePriceModalOpen] = useState(false);

  const currentMinPrice =
    customMinPrice !== null ? customMinPrice : minPossiblePrice;
  const currentMaxPrice =
    customMaxPrice !== null ? customMaxPrice : maxPossiblePrice;
  const isPriceFiltered =
    (customMinPrice !== null && customMinPrice > minPossiblePrice) ||
    (customMaxPrice !== null && customMaxPrice < maxPossiblePrice);

  // CMS Dynamic Live Settings
  const [topBannerConfig, setTopBannerConfig] = useState({
    enabled: true,
    text: "Bienvenue sur Kalagban — La Marketplace n°1 des vendeurs vérifiés en Côte d'Ivoire !",
    bg_color: "#6d28d9",
    text_color: "#ffffff",
  });

  const [popupBannerConfig, setPopupBannerConfig] = useState({
    enabled: true,
    show_once_per_session: false,
    auto_delay_ms: 1000,
    auto_scroll_interval_ms: 3500,
    images: [
      { image_url: "/promo_banner_tech.png", link_url: "#catalogue" },
    ] as (string | { image_url: string; link_url?: string })[],
    target_url: "#catalogue",
  });

  const [showPopupModal, setShowPopupModal] = useState(false);
  const [popupSlideIndex, setPopupSlideIndex] = useState(0);

  // Auto-scroll Timer for Promotional Pop-up Modal Slides
  useEffect(() => {
    if (
      !showPopupModal ||
      !popupBannerConfig.enabled ||
      !popupBannerConfig.images ||
      popupBannerConfig.images.length <= 1
    ) {
      return;
    }
    const interval = setInterval(() => {
      setPopupSlideIndex(
        (prev) => (prev + 1) % popupBannerConfig.images.length,
      );
    }, popupBannerConfig.auto_scroll_interval_ms || 3500);

    return () => clearInterval(interval);
  }, [
    showPopupModal,
    popupBannerConfig.enabled,
    popupBannerConfig.images,
    popupBannerConfig.auto_scroll_interval_ms,
  ]);

  const fetchHomePageData = async () => {
    const signal = AbortSignal.timeout(15000);
    try {
      // 0. Fetch Live Visual CMS Site Settings
      const { data: settingsData } = await supabase
        .from("site_settings")
        .select("key, value")
        .abortSignal(signal);

      if (settingsData) {
        settingsData.forEach((row) => {
          if (row.key === "top_banner" && row.value)
            setTopBannerConfig(row.value);
          if (row.key === "popup_banner" && row.value) {
            const popupCfg = row.value as typeof popupBannerConfig;
            setPopupBannerConfig(popupCfg);
            if (
              popupCfg.enabled &&
              popupCfg.images &&
              popupCfg.images.length > 0
            ) {
              setTimeout(() => {
                setShowPopupModal(true);
              }, popupCfg.auto_delay_ms || 1000);
            }
          }
        });
      }

      // 2. Fetch Products
      const { data: prodData, error: prodErr } = await supabase
        .from("products")
        .select("*, product_media(url)")
        .abortSignal(signal)
        .eq("status", "active")
        .order("created_at", { ascending: false });

      if (prodErr) throw prodErr;

      // 2. Fetch Active Promotional Campaigns (SDUI) & products
      const { data: promoCamps } = await supabase
        .from("promotional_campaigns")
        .select("*")
        .abortSignal(signal)
        .eq("status", "active")
        .order("position", { ascending: true });

      const promoProductMap = new Map<
        string,
        { special_price: number; discount_percentage: number }
      >();

      if (promoCamps && promoCamps.length > 0) {
        setPromotionalCampaigns(promoCamps as PromotionalCampaign[]);
        const campIds = promoCamps.map((c) => c.id);
        const { data: promoItems } = await supabase
          .from("campaign_products")
          .select("product_id, special_price, discount_percentage")
          .abortSignal(signal)
          .in("campaign_id", campIds);

        if (promoItems && promoItems.length > 0) {
          for (const item of promoItems) {
            if (item.product_id && item.special_price) {
              promoProductMap.set(item.product_id, {
                special_price: Number(item.special_price),
                discount_percentage: Number(item.discount_percentage) || 20,
              });
            }
          }
        }
      } else {
        setPromotionalCampaigns([]);
      }

      if (!prodErr && prodData) {
        const approvedOnly = prodData.filter(
          (item: { status: string; moderation_status?: string | null }) => {
            const isPending =
              item.moderation_status === "pending_review" ||
              item.moderation_status === "pending";
            const isRejected = item.moderation_status === "rejected";
            const isApproved =
              item.moderation_status === "approved" ||
              (!item.moderation_status && item.status === "active");
            return (
              item.status === "active" &&
              isApproved &&
              !isPending &&
              !isRejected
            );
          },
        );

        const formatted: ProductType[] = approvedOnly.map(
          (item: {
            id: string;
            shop_id: string;
            title: string;
            description?: string;
            category?: string;
            price: number;
            old_price?: number | null;
            stock_quantity: number;
            status: string;
            image_url?: string | null;
            product_media?: { url: string }[];
          }) => {
            const promoInfo = promoProductMap.get(item.id);
            const rawPrice = Number(item.price) || 0;
            const hasPromo = Boolean(
              promoInfo &&
              promoInfo.special_price &&
              promoInfo.special_price < rawPrice,
            );

            const finalPrice = hasPromo ? promoInfo!.special_price : rawPrice;
            const finalOldPrice = hasPromo
              ? rawPrice
              : item.old_price
                ? Number(item.old_price)
                : null;

            return {
              id: item.id,
              shop_id: item.shop_id,
              title: item.title,
              description: item.description,
              category: item.category,
              price: finalPrice,
              old_price: finalOldPrice,
              stock_quantity: item.stock_quantity,
              status: item.status,
              image_url:
                item.product_media && item.product_media.length > 0
                  ? item.product_media[0].url
                  : item.image_url || null,
            };
          },
        );
        setProducts(formatted);
      }

      // 3. Fetch Featured Shops
      const { data: featuredShops } = await supabase
        .from("shops")
        .select("*")
        .abortSignal(signal)
        .eq("is_featured", true)
        .order("created_at", { ascending: false });

      if (featuredShops && featuredShops.length > 0) {
        setShops(featuredShops as ShopType[]);
      } else {
        const { data: shopData } = await supabase
          .from("shops")
          .select("*")
          .abortSignal(signal)
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
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          if (isMounted) fetchHomePageData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "shops" },
        () => {
          if (isMounted) fetchHomePageData();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "promotional_campaigns" },
        () => {
          if (isMounted) fetchHomePageData();
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const activeParentCategory = CATEGORY_TREE.find(
    (c) => c.id.toLowerCase() === selectedCategory.toLowerCase(),
  );

  const filteredProducts = products.filter((p) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      p.title.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q)) ||
      (p.category && p.category.toLowerCase().includes(q));

    let matchesCategory = true;
    if (selectedCategory !== "all") {
      const prodCat = (p.category || "").toLowerCase();
      const isUnisex = prodCat.includes("unisexe") || prodCat.includes("mixte");
      const isParentGender =
        selectedCategory === "homme" || selectedCategory === "femme";

      if (selectedSubCategory !== "all") {
        const subLower = selectedSubCategory.toLowerCase();
        const baseSub = subLower
          .replace("-hommes", "")
          .replace("-femmes", "")
          .replace("-enfants", "");
        matchesCategory =
          prodCat === subLower ||
          prodCat.includes(subLower) ||
          (isUnisex && isParentGender && prodCat.includes(baseSub));
      } else if (activeParentCategory) {
        const subIds = activeParentCategory.subCategories.map((s) =>
          s.id.toLowerCase(),
        );
        matchesCategory =
          prodCat === selectedCategory.toLowerCase() ||
          subIds.includes(prodCat) ||
          prodCat.includes(selectedCategory.toLowerCase()) ||
          subIds.some((s) => prodCat.includes(s)) ||
          (isParentGender && isUnisex);
      } else {
        matchesCategory =
          prodCat === selectedCategory.toLowerCase() ||
          prodCat.includes(selectedCategory.toLowerCase());
      }
    }

    const matchesPrice =
      Number(p.price) >= currentMinPrice && Number(p.price) <= currentMaxPrice;

    return (
      matchesSearch &&
      matchesCategory &&
      matchesPrice &&
      (!onlyDeals || Boolean(p.old_price && p.old_price > p.price))
    );
  });

  const sortedProducts = [...filteredProducts].sort((a, b) =>
    sortOrder === "price-asc"
      ? a.price - b.price
      : sortOrder === "price-desc"
        ? b.price - a.price
        : 0,
  );
  const selectCategory = (id: string) => {
    setSelectedCategory(id);
    setSelectedSubCategory("all");
  };

  return (
    <div className="fashion-home min-h-screen flex flex-col bg-white font-sans relative w-full">
      {topBannerConfig.enabled && (
        <div className="fashion-announcement">{topBannerConfig.text}</div>
      )}
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />
      <main className="fashion-main">
        <section className="fashion-hero" aria-labelledby="fashion-title">
          <div className="fashion-hero-copy">
            <span className="fashion-eyebrow">LE STYLE SE VIT ICI</span>
            <h1 id="fashion-title">
              Votre style.
              <br />
              Vos envies.
              <br />
              <em>Kalagban.</em>
            </h1>
            <p>
              Des pièces qui vous ressemblent, des boutiques à découvrir. La
              mode se rencontre sur Kalagban.
            </p>
            <a href="#catalogue" className="fashion-cta">
              Explorer la sélection <ArrowRight size={17} />
            </a>
            <span className="fashion-hero-note">
              FEMME · HOMME · ENFANT · ACCESSOIRES
            </span>
          </div>
          <a
            href="/category/femme"
            className="fashion-hero-photo fashion-hero-photo-main"
          >
            <img
              src="/carousel3.jpg"
              alt="Découvrez la sélection mode femme Kalagban"
              fetchPriority="high"
            />
            <span>
              Une allure, mille possibilités <ArrowRight size={18} />
            </span>
          </a>
          <a
            href="/category/homme"
            className="fashion-hero-photo fashion-hero-photo-side"
          >
            <img
              src="/carousel2.jpg"
              alt="Looks et inspirations mode Kalagban"
            />
            <span>
              Le style se partage <ArrowRight size={18} />
            </span>
          </a>
          <div className="fashion-hero-stamp" aria-hidden="true">
            LA MODE
            <br />
            NOUS RASSEMBLE
          </div>
        </section>

        <div className="fashion-services">
          <a href="/shipping-policy">
            <Truck size={17} /> Livraison & points relais
          </a>
          <a href="/quality-charter">
            <ShieldCheck size={17} /> Notre charte qualité
          </a>
          <a href="/faq">
            <ShoppingBag size={17} /> Aide à la commande
          </a>
          <span>Vos prix en FCFA</span>
        </div>

        <section
          className="fashion-categories"
          aria-label="Explorer les univers"
        >
          {CATEGORY_TREE.map((category, i) => (
            <a
              href={`/category/${category.id}`}
              key={category.id}
              className="fashion-category-tile"
            >
              <img src={category.image} alt="" loading="lazy" />
              <span>
                <small>0{i + 1} / COLLECTION</small>
                <strong>{category.label}</strong>
                <span>
                  Explorer <ArrowRight size={14} />
                </span>
              </span>
            </a>
          ))}
        </section>

        {promotionalCampaigns.length > 0 && (
          <section
            className="fashion-campaigns"
            aria-label="Les campagnes du moment"
          >
            {promotionalCampaigns.map((campaign) => (
              <a
                href={`/promo/${campaign.slug || campaign.id}`}
                key={campaign.id}
                className="fashion-campaign"
              >
                {campaign.banner_url && (
                  <img src={campaign.banner_url} alt="" loading="lazy" />
                )}
                <div>
                  <small>{campaign.badge_text || "À DÉCOUVRIR"}</small>
                  <h2>{campaign.title}</h2>
                  <p>{campaign.subtitle}</p>
                  <span>
                    Découvrir <ArrowRight size={16} />
                  </span>
                </div>
              </a>
            ))}
          </section>
        )}

        <section
          id="catalogue"
          className="fashion-catalogue"
          aria-labelledby="catalogue-title"
        >
          <div className="fashion-section-heading">
            <div>
              <span className="fashion-eyebrow">LE PLAISIR DE TROUVER</span>
              <h2 id="catalogue-title">À vous de choisir.</h2>
            </div>
            <p aria-live="polite">
              {isLoading
                ? "Votre sélection arrive…"
                : `${sortedProducts.length} article${sortedProducts.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <div className="fashion-catalogue-toolbar">
            <div
              className="fashion-category-tabs"
              role="group"
              aria-label="Filtrer par univers"
            >
              {[{ id: "all", label: "Tout découvrir" }, ...CATEGORY_TREE].map(
                (category) => (
                  <button
                    type="button"
                    key={category.id}
                    aria-pressed={selectedCategory === category.id}
                    onClick={() => selectCategory(category.id)}
                  >
                    {category.label}
                  </button>
                ),
              )}
            </div>
            <label className="fashion-sort">
              Trier par
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                aria-label="Trier les articles"
              >
                <option value="newest">Nouveautés</option>
                <option value="price-asc">Prix croissant</option>
                <option value="price-desc">Prix décroissant</option>
              </select>
            </label>
          </div>
          <div className="fashion-quick-filters">
            <button
              type="button"
              aria-pressed={onlyDeals}
              onClick={() => setOnlyDeals(!onlyDeals)}
            >
              Prix réduits
            </button>
            <button
              type="button"
              aria-pressed={customMaxPrice === 10000}
              onClick={() => {
                setCustomMinPrice(null);
                setCustomMaxPrice(customMaxPrice === 10000 ? null : 10000);
              }}
            >
              Jusqu’à 10 000 F
            </button>
            <button
              type="button"
              className="fashion-mobile-filter"
              onClick={() => setIsMobilePriceModalOpen(true)}
            >
              <SlidersHorizontal size={14} /> Budget
            </button>
            {(isPriceFiltered ||
              onlyDeals ||
              searchTerm ||
              selectedCategory !== "all") && (
              <button
                type="button"
                onClick={() => {
                  selectCategory("all");
                  setSearchTerm("");
                  setCustomMinPrice(null);
                  setCustomMaxPrice(null);
                  setOnlyDeals(false);
                }}
              >
                Tout réinitialiser <X size={13} />
              </button>
            )}
          </div>
          <div className="fashion-catalogue-layout">
            <aside
              className="fashion-sidebar"
              aria-label="Affiner la sélection"
            >
              {activeParentCategory && (
                <div className="fashion-subcategories">
                  <h3>{activeParentCategory.label}</h3>
                  <button
                    type="button"
                    aria-pressed={selectedSubCategory === "all"}
                    onClick={() => setSelectedSubCategory("all")}
                  >
                    Tous les articles
                  </button>
                  {activeParentCategory.subCategories.map((sub) => (
                    <button
                      type="button"
                      aria-pressed={selectedSubCategory === sub.id}
                      key={sub.id}
                      onClick={() => setSelectedSubCategory(sub.id)}
                    >
                      {sub.label}
                    </button>
                  ))}
                </div>
              )}
              <PriceRangeFilter
                minPrice={currentMinPrice}
                maxPrice={currentMaxPrice}
                minLimit={minPossiblePrice}
                maxLimit={maxPossiblePrice}
                productCount={sortedProducts.length}
                onChange={(min, max) => {
                  setCustomMinPrice(min);
                  setCustomMaxPrice(max);
                }}
                onReset={() => {
                  setCustomMinPrice(null);
                  setCustomMaxPrice(null);
                }}
              />
            </aside>
            <div className="fashion-results">
              {isLoading ? (
                <div className="fashion-empty" role="status">
                  <Loader2 className="animate-spin" size={26} />
                  <h3>Votre sélection arrive…</h3>
                  <p>Nous préparons les articles disponibles.</p>
                </div>
              ) : sortedProducts.length === 0 ? (
                <div className="fashion-empty">
                  <ShoppingBag size={30} />
                  <h3>La prochaine trouvaille vous attend.</h3>
                  <p>
                    {products.length === 0
                      ? "Les articles ne sont pas disponibles pour le moment. Réessayez dans quelques instants."
                      : "Essayez un autre univers ou un budget plus large."}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      selectCategory("all");
                      setSearchTerm("");
                      setCustomMinPrice(null);
                      setCustomMaxPrice(null);
                      setOnlyDeals(false);
                      if (!products.length) {
                        setIsLoading(true);
                        void fetchHomePageData();
                      }
                    }}
                  >
                    {products.length ? "Voir tous les articles" : "Réessayer"}{" "}
                    <ArrowRight size={15} />
                  </button>
                </div>
              ) : (
                <div className="fashion-product-grid">
                  {sortedProducts.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>
        {shops.length > 0 && (
          <section className="fashion-shops">
            <div className="fashion-section-heading">
              <div>
                <span className="fashion-eyebrow">
                  DERRIÈRE CHAQUE TROUVAILLE
                </span>
                <h2>Des boutiques à découvrir.</h2>
              </div>
            </div>
            <div className="fashion-shop-grid">
              {shops.map((shop) => (
                <div key={shop.id}>
                  <span className="fashion-shop-avatar">
                    {shop.logo_url ? (
                      <img src={shop.logo_url} alt="" loading="lazy" />
                    ) : (
                      shop.name.charAt(0)
                    )}
                  </span>
                  <h3>{shop.name}</h3>
                  {shop.description && <p>{shop.description}</p>}
                  <a href="#catalogue">
                    Explorer le catalogue <ArrowRight size={14} />
                  </a>
                </div>
              ))}
            </div>
          </section>
        )}
        {isMobilePriceModalOpen && (
          <PriceRangeFilter
            minPrice={currentMinPrice}
            maxPrice={currentMaxPrice}
            minLimit={minPossiblePrice}
            maxLimit={maxPossiblePrice}
            productCount={sortedProducts.length}
            isMobileModal
            onCloseMobile={() => setIsMobilePriceModalOpen(false)}
            onChange={(min, max) => {
              setCustomMinPrice(min);
              setCustomMaxPrice(max);
            }}
            onReset={() => {
              setCustomMinPrice(null);
              setCustomMaxPrice(null);
            }}
          />
        )}
      </main>

      {/* PROMOTIONAL POP-UP MODAL BANNER (RESPONSIVE & AUTO-SCROLLING WITH PARTNER LINKS) */}
      {showPopupModal &&
        popupBannerConfig.enabled &&
        popupBannerConfig.images &&
        popupBannerConfig.images.length > 0 &&
        (() => {
          const normalizedSlides = popupBannerConfig.images.map((item) => {
            if (typeof item === "string") {
              return {
                image_url: item,
                link_url: popupBannerConfig.target_url || "#catalogue",
              };
            }
            return {
              image_url: item.image_url || "/promo_banner_tech.png",
              link_url:
                item.link_url || popupBannerConfig.target_url || "#catalogue",
            };
          });

          const activeSlide =
            normalizedSlides[popupSlideIndex] || normalizedSlides[0];
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
                            prev === 0 ? normalizedSlides.length - 1 : prev - 1,
                          )
                        }
                        className="absolute left-2 sm:left-3 top-1/2 -translate-y-1/2 z-20 w-8 h-8 sm:w-9 sm:h-9 bg-black/60 hover:bg-black text-white rounded-full flex items-center justify-center backdrop-blur-md transition-colors cursor-pointer shadow-md"
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() =>
                          setPopupSlideIndex((prev) =>
                            prev === normalizedSlides.length - 1 ? 0 : prev + 1,
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
                              idx === popupSlideIndex
                                ? "w-6 bg-white"
                                : "w-2 bg-white/50 hover:bg-white/80"
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
                      {activeSlide.link_url &&
                      activeSlide.link_url !== "#catalogue"
                        ? `Visiter : ${activeSlide.link_url}`
                        : "Découvrez les promotions exclusives du moment"}
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
