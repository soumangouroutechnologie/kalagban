"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ProductCard, { ProductType } from "@/components/ProductCard";
import { CATEGORY_TREE } from "@/lib/categories";
import { supabase } from "@/lib/supabase";
import {
  Sparkles,
  ShoppingBag,
  ArrowLeft,
  ChevronRight,
  ShieldCheck,
  RotateCcw,
  Loader2,
  Filter,
  SlidersHorizontal,
  Banknote,
} from "lucide-react";
import PriceRangeFilter, { formatFcfa } from "@/components/PriceRangeFilter";

export default function DedicatedWebCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const rawId = (params?.id as string) || "femme";
  const categoryId = rawId.toLowerCase();

  const activeParentCategory =
    CATEGORY_TREE.find((c) => c.id.toLowerCase() === categoryId) || CATEGORY_TREE[0];

  const [selectedSubCategory, setSelectedSubCategory] = useState<string>("all");
  const [products, setProducts] = useState<ProductType[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"recent" | "price-asc" | "price-desc">("recent");

  // Dynamic Price Bounds & Pure Filtering State
  const allPrices = useMemo(
    () => products.map((p) => Number(p.price)).filter((p) => !isNaN(p) && p >= 0),
    [products]
  );
  const minPossiblePrice = useMemo(() => (allPrices.length > 0 ? Math.min(...allPrices) : 0), [allPrices]);
  const maxPossiblePrice = useMemo(() => (allPrices.length > 0 ? Math.max(Math.max(...allPrices), 25000) : 500000), [allPrices]);

  const [customMinPrice, setCustomMinPrice] = useState<number | null>(null);
  const [customMaxPrice, setCustomMaxPrice] = useState<number | null>(null);
  const [isMobilePriceModalOpen, setIsMobilePriceModalOpen] = useState(false);

  const currentMinPrice = customMinPrice !== null ? customMinPrice : minPossiblePrice;
  const currentMaxPrice = customMaxPrice !== null ? customMaxPrice : maxPossiblePrice;
  const isPriceFiltered = (customMinPrice !== null && customMinPrice > minPossiblePrice) || (customMaxPrice !== null && customMaxPrice < maxPossiblePrice);

  useEffect(() => {
    let isMounted = true;
    const loadCategoryProducts = async () => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select(`
            id,
            shop_id,
            title,
            description,
            category,
            price,
            old_price,
            stock_quantity,
            status,
            moderation_status,
            product_media (url)
          `)
          .eq("status", "active")
          .order("created_at", { ascending: false });

        if (!isMounted) return;

        if (!error && data) {
          const approvedOnly = data.filter((item: {
            status: string;
            moderation_status?: string | null;
          }) => {
            const isPending = item.moderation_status === "pending_review" || item.moderation_status === "pending";
            const isRejected = item.moderation_status === "rejected";
            const isApproved = item.moderation_status === "approved" || (!item.moderation_status && item.status === "active");
            return item.status === "active" && isApproved && !isPending && !isRejected;
          });

          const formatted: ProductType[] = approvedOnly.map((item: {
            id: string;
            shop_id: string;
            title: string;
            description?: string;
            category?: string;
            price: number | string;
            old_price?: number | string | null;
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
            image_url:
              item.product_media && item.product_media.length > 0
                ? item.product_media[0].url
                : null,
          }));
          setProducts(formatted);
        } else {
          setProducts([]);
        }
      } catch (err) {
        console.error("Error fetching category products:", err);
        if (isMounted) setProducts([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadCategoryProducts();

    return () => {
      isMounted = false;
    };
  }, [categoryId]);

  // Filter products for active parent category & subcategory
  const filteredProducts = products
    .filter((p) => {
      const q = searchTerm.trim().toLowerCase();
      const matchesSearch =
        !q ||
        p.title.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q));

      if (q) {
        return matchesSearch;
      }

      const prodCat = (p.category || "").toLowerCase();
      const subIds = activeParentCategory.subCategories.map((s) => s.id.toLowerCase());

      let matchesCat = true;
      const isUnisex = prodCat.includes("unisexe") || prodCat.includes("mixte");
      const isParentGender = activeParentCategory.id === "homme" || activeParentCategory.id === "femme";

      if (selectedSubCategory !== "all") {
        const subLower = selectedSubCategory.toLowerCase();
        const baseSub = subLower.replace("-hommes", "").replace("-femmes", "").replace("-enfants", "");
        matchesCat = 
          prodCat === subLower || 
          prodCat.includes(subLower) ||
          (isUnisex && isParentGender && prodCat.includes(baseSub));
      } else {
        matchesCat =
          prodCat === activeParentCategory.id.toLowerCase() ||
          subIds.includes(prodCat) ||
          prodCat.includes(activeParentCategory.id.toLowerCase()) ||
          subIds.some((s) => prodCat.includes(s)) ||
          (isParentGender && isUnisex);
      }

      const matchesPrice = Number(p.price) >= currentMinPrice && Number(p.price) <= currentMaxPrice;

      return matchesSearch && matchesCat && matchesPrice;
    })
    .sort((a, b) => {
      if (sortBy === "price-asc") return a.price - b.price;
      if (sortBy === "price-desc") return b.price - a.price;
      return 0;
    });

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa] font-sans relative">
      <Header searchTerm={searchTerm} onSearchChange={setSearchTerm} />

      {/* Hero Category Banner Header */}
      <div className="bg-linear-to-r from-purple-900 via-indigo-900 to-purple-950 text-white py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <ArrowLeft size={20} />
            </button>

            <div className="w-16 h-16 rounded-2xl bg-white p-1 overflow-hidden shadow-lg border border-white/20 shrink-0 flex items-center justify-center">
              <img
                src={activeParentCategory.image}
                alt={activeParentCategory.label}
                className="w-full h-full object-cover rounded-xl"
              />
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="bg-purple-500/30 text-purple-200 font-bold text-[10px] uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-purple-400/30">
                  RAYON DÉDIÉ
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight mt-1">
                Espace {activeParentCategory.label}
              </h1>
              <p className="text-xs text-purple-200/80 mt-1 font-medium">
                {filteredProducts.length} article(s) disponible(s) dans le rayon {activeParentCategory.label}
              </p>
            </div>
          </div>

          {/* Category Switcher Tabs (Femme, Homme, Enfants, Deco & Maison) */}
          <div className="flex items-center gap-2 overflow-x-auto max-w-full pb-2 scrollbar-none">
            {CATEGORY_TREE.map((parent) => {
              const isSelected = parent.id.toLowerCase() === activeParentCategory.id.toLowerCase();
              return (
                <button
                  key={parent.id}
                  onClick={() => router.push(`/category/${parent.id}`)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 cursor-pointer ${
                    isSelected
                      ? "bg-white text-[#6d28d9] shadow-md font-extrabold scale-105"
                      : "bg-white/10 hover:bg-white/20 text-white border border-white/15"
                  }`}
                >
                  <img src={parent.image} alt={parent.label} className="w-4 h-4 rounded-full object-cover" />
                  {parent.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* MAIN DEDICATED 2-COLUMN CONTAINER */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8 items-start">

          {/* LEFT SIDEBAR FOR SUB-CATEGORIES */}
          <aside className="w-full lg:w-72 shrink-0 bg-white rounded-3xl p-6 border border-gray-100/90 shadow-xs sticky top-24">
            <div className="flex items-center justify-between pb-4 mb-4 border-b border-gray-100">
              <span className="text-xs font-black uppercase tracking-wider text-gray-900 flex items-center gap-2">
                <Filter size={16} className="text-[#6d28d9]" />
                Sous-Catégories
              </span>
              <span className="text-[10px] font-bold bg-purple-50 text-[#6d28d9] px-2 py-0.5 rounded-full border border-purple-100">
                {activeParentCategory.subCategories.length} catégories
              </span>
            </div>

            {/* Sub-categories List */}
            <div className="flex flex-col gap-1.5">
              {/* All Subcategories Button */}
              <button
                onClick={() => setSelectedSubCategory("all")}
                className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                  selectedSubCategory === "all"
                    ? "bg-linear-to-r from-[#6d28d9] to-purple-600 text-white font-black shadow-md shadow-purple-500/20"
                    : "text-gray-700 hover:bg-purple-50/60 hover:text-[#6d28d9]"
                }`}
              >
                <span>Tous les articles ({activeParentCategory.label})</span>
                <ChevronRight size={14} className={selectedSubCategory === "all" ? "text-white" : "text-gray-400"} />
              </button>

              {/* Individual Sub-categories */}
              {activeParentCategory.subCategories.map((sub) => {
                const isSubSelected = selectedSubCategory.toLowerCase() === sub.id.toLowerCase();
                const subCount = products.filter(
                  (p) => (p.category || "").toLowerCase() === sub.id.toLowerCase()
                ).length;

                return (
                  <button
                    key={sub.id}
                    onClick={() => setSelectedSubCategory(sub.id)}
                    className={`w-full text-left px-4 py-3 rounded-2xl text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                      isSubSelected
                        ? "bg-linear-to-r from-[#6d28d9] to-purple-600 text-white font-black shadow-md shadow-purple-500/20"
                        : "text-gray-700 hover:bg-purple-50/60 hover:text-[#6d28d9]"
                    }`}
                  >
                    <span className="truncate">{sub.label}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-extrabold ${
                        isSubSelected ? "bg-white text-[#6d28d9]" : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {subCount}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* DYNAMIC PRICE RANGE FILTER CARD */}
            <div className="mt-5">
              <PriceRangeFilter
                minPrice={currentMinPrice}
                maxPrice={currentMaxPrice}
                minLimit={minPossiblePrice}
                maxLimit={maxPossiblePrice}
                productCount={filteredProducts.length}
                onChange={(min, max) => {
                  setCustomMinPrice(min);
                  setCustomMaxPrice(max);
                }}
                onReset={() => {
                  setCustomMinPrice(null);
                  setCustomMaxPrice(null);
                }}
              />
            </div>

            {/* Sidebar Security & Delivery Badge */}
            <div className="mt-5 p-4 rounded-2xl bg-purple-50/50 border border-purple-100 flex items-center gap-3">
              <ShieldCheck size={22} className="text-[#6d28d9] shrink-0" />
              <div>
                <h4 className="font-extrabold text-xs text-gray-900">Vendeurs Vérifiés</h4>
                <p className="text-[10px] text-gray-400">Garantie &amp; Retrait Point Relais</p>
              </div>
            </div>
          </aside>

          {/* RIGHT MAIN CONTENT AREA (Products Grid & Filters) */}
          <div className="flex-1 min-w-0 w-full">

            {/* Controls Bar: Sub-category Title, Mobile Price Filter & Sort Select */}
            <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-xs mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-black text-gray-900 tracking-tight flex items-center gap-2">
                  <Sparkles size={16} className="text-[#6d28d9]" />
                  {selectedSubCategory === "all"
                    ? `Tous les articles ${activeParentCategory.label}`
                    : activeParentCategory.subCategories.find((s) => s.id === selectedSubCategory)?.label || "Articles"}
                </h2>
                <p className="text-xs text-gray-400 mt-0.5 font-medium">
                  {filteredProducts.length} article(s) trouvé(s)
                </p>
              </div>

              <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                {/* Mobile Filter Trigger Button */}
                <button
                  onClick={() => setIsMobilePriceModalOpen(true)}
                  className={`lg:hidden flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black transition-all cursor-pointer border ${
                    isPriceFiltered
                      ? "bg-[#6d28d9] text-white border-[#6d28d9]"
                      : "bg-gray-50 text-gray-700 border-gray-200"
                  }`}
                >
                  <Banknote size={14} />
                  <span>
                    {isPriceFiltered
                      ? `Budget : ${formatFcfa(currentMinPrice)} - ${formatFcfa(currentMaxPrice)}`
                      : "Filtrer par Prix"}
                  </span>
                  {isPriceFiltered && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  )}
                </button>

                {/* Sort By Dropdown */}
                <div className="flex items-center gap-2 shrink-0">
                  <SlidersHorizontal size={14} className="text-gray-400" />
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as "recent" | "price-asc" | "price-desc")}
                    className="bg-gray-50 border border-gray-200 text-gray-800 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  >
                    <option value="recent">Plus récents</option>
                    <option value="price-asc">Prix : croissant</option>
                    <option value="price-desc">Prix : décroissant</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Mobile Price Modal Drawer */}
            {isMobilePriceModalOpen && (
              <PriceRangeFilter
                minPrice={currentMinPrice}
                maxPrice={currentMaxPrice}
                minLimit={minPossiblePrice}
                maxLimit={maxPossiblePrice}
                productCount={filteredProducts.length}
                isMobileModal={true}
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

            {/* Product Cards Grid */}
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center">
                <Loader2 className="animate-spin text-[#6d28d9] w-10 h-10 mb-3" />
                <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement du rayon...</p>
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs max-w-lg mx-auto my-6">
                <div className="w-16 h-16 bg-purple-50 text-[#6d28d9] rounded-full flex items-center justify-center mx-auto mb-4">
                  <ShoppingBag size={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900 mb-1">Aucun produit trouvé</h3>
                <p className="text-gray-400 text-xs mb-6 leading-relaxed">
                  Aucun article n&apos;est actuellement disponible dans cette sous-catégorie.
                </p>
                <button
                  onClick={() => {
                    setSelectedSubCategory("all");
                    setSearchTerm("");
                  }}
                  className="bg-[#6d28d9] text-white font-black text-xs px-6 py-3 rounded-xl shadow-md hover:bg-purple-800 transition-all cursor-pointer inline-flex items-center gap-2"
                >
                  <RotateCcw size={14} /> Voir tous les articles {activeParentCategory.label}
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
      </main>

      <Footer />
    </div>
  );
}
