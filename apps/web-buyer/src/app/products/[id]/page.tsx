"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";
import { 
  ArrowLeft, 
  ShoppingBag, 
  Truck, 
  ShieldCheck, 
  Store, 
  Plus, 
  Minus, 
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  Flame,
  AlertTriangle
} from "lucide-react";

interface ProductDetails {
  id: string;
  shop_id: string;
  title: string;
  description?: string;
  category?: string;
  price: number;
  old_price?: number | null;
  stock_quantity: number;
  status: string;
  media: string[];
}

interface ShopDetails {
  id: string;
  name: string;
  description?: string;
  logo_url?: string;
  is_verified?: boolean;
  kyc_status?: string;
}

export default function ProductDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { addToCart } = useCart();

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [shop, setShop] = useState<ShopDetails | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const fetchProductData = async () => {
      try {
        // 1. Fetch Product
        const { data: prodData, error: prodError } = await supabase
          .from("products")
          .select("*, product_media(url)")
          .eq("id", id)
          .single();

        if (!isMounted) return;

        if (prodError || !prodData || prodData.status !== "active" || prodData.moderation_status === "rejected" || prodData.moderation_status === "pending_review") {
          console.error("Product not available or under moderation:", prodError);
          setIsLoading(false);
          return;
        }

        const mediaUrls = prodData.product_media ? prodData.product_media.map((m: { url: string }) => m.url) : [];

        const formatted: ProductDetails = {
          id: prodData.id,
          shop_id: prodData.shop_id,
          title: prodData.title,
          description: prodData.description,
          category: prodData.category,
          price: Number(prodData.price),
          old_price: prodData.old_price ? Number(prodData.old_price) : null,
          stock_quantity: prodData.stock_quantity,
          status: prodData.status,
          media: mediaUrls,
        };

        setProduct(formatted);
        if (mediaUrls.length > 0) setSelectedImage(mediaUrls[0]);

        // 2. Fetch Shop Info
        const { data: shopData } = await supabase
          .from("shops")
          .select("*")
          .eq("id", prodData.shop_id)
          .maybeSingle();

        if (shopData && isMounted) {
          setShop(shopData);
        }
      } catch (err) {
        console.error("Error loading product detail:", err);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    fetchProductData();

    return () => {
      isMounted = false;
    };
  }, [id]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-12">
          <Loader2 className="animate-spin text-indigo-600 w-12 h-12 mb-4" />
          <p className="text-gray-500 font-bold animate-pulse">Chargement du produit...</p>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 flex flex-col items-center justify-center p-12 text-center">
          <h2 className="text-2xl font-black text-gray-900 mb-2">Produit introuvable</h2>
          <p className="text-gray-500 mb-6">Ce produit n&apos;existe plus ou a été retiré de la vente.</p>
          <Link href="/" className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl">
            Retour à l&apos;accueil
          </Link>
        </main>
        <Footer />
      </div>
    );
  }

  const discountPercent = product.old_price && product.old_price > product.price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : null;

  const handleBuyNow = () => {
    addToCart({
      productId: product.id,
      shopId: product.shop_id,
      title: product.title,
      price: product.price,
      oldPrice: product.old_price,
      image: selectedImage,
      quantity: Math.min(quantity, product.stock_quantity),
      maxStock: product.stock_quantity,
    });
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Header />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Navigation back */}
        <div className="mb-6">
          <Link href="/" className="inline-flex items-center gap-2 text-sm font-bold text-gray-600 hover:text-indigo-600 transition-colors">
            <ArrowLeft size={18} /> Retour au catalogue
          </Link>
        </div>

        {/* PRODUCT SECTION GRID */}
        <div className="bg-white rounded-3xl p-6 sm:p-10 border border-gray-100 shadow-sm grid grid-cols-1 lg:grid-cols-2 gap-12 mb-12">
          
          {/* LEFT: GALLERY */}
          <div className="flex flex-col gap-4">
            <div className="aspect-square bg-gray-50 rounded-2xl overflow-hidden border border-gray-100 flex items-center justify-center relative">
              {selectedImage ? (
                <img src={selectedImage} alt={product.title} className="w-full h-full object-cover" />
              ) : (
                <ImageIcon size={64} className="text-gray-300" strokeWidth={1.5} />
              )}
              {discountPercent !== null && (
                <span className="absolute top-4 left-4 bg-red-500 text-white font-black text-sm px-3 py-1 rounded-xl shadow-lg">
                  -{discountPercent}%
                </span>
              )}
            </div>

            {/* Thumbnails */}
            {product.media.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {product.media.map((url, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(url)}
                    className={`w-20 h-20 rounded-xl overflow-hidden border-2 transition-all ${
                      selectedImage === url ? "border-indigo-600 scale-95" : "border-gray-200 opacity-70 hover:opacity-100"
                    }`}
                  >
                    <img src={url} alt={`Thumbnail ${idx}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT: DETAILS */}
          <div className="flex flex-col justify-between">
            <div>
              {/* Seller / Shop Badge */}
              <div className="flex items-center gap-3 mb-6 p-3.5 bg-gray-50 rounded-2xl border border-gray-100">
                <div className="w-11 h-11 bg-indigo-600 text-white rounded-xl flex items-center justify-center font-black text-xl overflow-hidden shrink-0 shadow-md shadow-indigo-600/20">
                  {shop?.logo_url ? (
                    <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover" />
                  ) : (
                    <Store size={22} />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black text-indigo-600 uppercase tracking-wider">Vendu par</span>
                    <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-600 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100">
                      <CheckCircle2 size={12} /> Boutique Vérifiée
                    </span>
                  </div>
                  <h4 className="text-base font-extrabold text-gray-900 truncate">
                    {shop?.name || "Boutique Kalagban"}
                  </h4>
                </div>
              </div>

              {/* Category & Stock Urgency Badge */}
              <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                {product.category && (
                  <span className="bg-indigo-50 text-indigo-700 font-extrabold text-xs uppercase tracking-wider px-3 py-1.5 rounded-xl">
                    {product.category}
                  </span>
                )}
                
                {product.stock_quantity <= 0 ? (
                  <span className="inline-flex items-center gap-1.5 bg-red-50 text-red-600 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-red-200">
                    <AlertTriangle size={15} /> Rupture de stock
                  </span>
                ) : product.stock_quantity <= 5 ? (
                  <span className="inline-flex items-center gap-1.5 bg-amber-50 text-amber-700 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-amber-200 animate-pulse shadow-xs">
                    <Flame size={15} className="text-amber-500 fill-amber-500" />
                    Plus que {product.stock_quantity} disponible{product.stock_quantity > 1 ? 's' : ''} ! Commandez vite !
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 text-xs font-extrabold px-3 py-1.5 rounded-xl border border-emerald-200">
                    <CheckCircle2 size={15} /> En Stock ({product.stock_quantity} disponibles)
                  </span>
                )}
              </div>

              {/* Title */}
              <h1 className="text-3xl sm:text-4xl font-black text-gray-900 leading-tight mb-4">
                {product.title}
              </h1>

              {/* Price */}
              <div className="flex items-baseline gap-3 mb-6 bg-gray-50 p-4 rounded-2xl border border-gray-100 w-fit">
                <span className="text-3xl font-black text-indigo-600">
                  {product.price.toLocaleString("fr-FR")} FCFA
                </span>
                {product.old_price && (
                  <span className="text-sm font-bold text-gray-400 line-through">
                    {product.old_price.toLocaleString("fr-FR")} FCFA
                  </span>
                )}
              </div>

              {/* Description */}
              {product.description && (
                <div className="mb-8">
                  <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wider mb-2">Description</h3>
                  <p className="text-gray-600 text-base leading-relaxed whitespace-pre-line font-medium">
                    {product.description}
                  </p>
                </div>
              )}

              {/* Quantity Selector (Disabled if out of stock) */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-sm font-bold text-gray-900">Quantité :</span>
                <div className="flex items-center gap-3 bg-gray-100 border border-gray-200 rounded-xl p-1.5">
                  <button
                    disabled={product.stock_quantity <= 0}
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors font-bold disabled:opacity-50"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="text-base font-black text-gray-900 w-6 text-center">{quantity}</span>
                  <button
                    disabled={product.stock_quantity <= 0 || quantity >= product.stock_quantity}
                    onClick={() => setQuantity(quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center text-gray-700 hover:bg-white rounded-lg transition-colors font-bold disabled:opacity-50"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Out of Stock Notice or Action Buttons */}
            {product.stock_quantity <= 0 ? (
              <div className="bg-red-50 border border-red-200 p-4 rounded-2xl flex items-center gap-3 text-red-700 font-bold text-sm">
                <AlertTriangle size={20} className="shrink-0" />
                Ce produit est actuellement en rupture de stock. Le vendeur prépare un réapprovisionnement.
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-gray-100">
                <button
                  onClick={() =>
                    addToCart({
                      productId: product.id,
                      shopId: product.shop_id,
                      title: product.title,
                      price: product.price,
                      oldPrice: product.old_price,
                      image: selectedImage,
                      quantity: Math.min(quantity, product.stock_quantity),
                      maxStock: product.stock_quantity,
                    })
                  }
                  className="flex-1 bg-gray-900 text-white font-bold py-4 px-6 rounded-2xl hover:bg-gray-800 transition-all flex items-center justify-center gap-2 shadow-lg shadow-gray-900/10 cursor-pointer"
                >
                  <ShoppingBag size={20} />
                  Ajouter au panier
                </button>

                <button
                  onClick={handleBuyNow}
                  className="flex-1 bg-indigo-600 text-white font-bold py-4 px-6 rounded-2xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2"
                >
                  Acheter maintenant
                </button>
              </div>
            )}

          </div>

        </div>

        {/* SELLER SHOP CARD & REASSURANCE */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Shop Card */}
          <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-14 h-14 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-2xl shrink-0 shadow-lg shadow-indigo-600/20">
              {shop?.logo_url ? <img src={shop.logo_url} alt={shop.name} className="w-full h-full object-cover rounded-2xl" /> : <Store size={28} />}
            </div>
            <div>
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">Vendu par</span>
              <div className="flex items-center gap-1.5">
                <h4 className="font-extrabold text-gray-900 text-lg leading-tight">{shop?.name || "Boutique Partenaire"}</h4>
                {shop?.is_verified && (
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-black px-2 py-0.5 rounded-full flex items-center gap-1 shadow-2xs">
                    <ShieldCheck size={12} className="text-emerald-600" /> Certifié 🛡️
                  </span>
                )}
              </div>
              <p className="text-xs text-gray-500 font-medium mt-0.5">
                {shop?.is_verified ? "Boutique Officiellement Certifiée Kalagban" : "Vendeur Partenaire Kalagban"}
              </p>
            </div>
          </div>

          {/* Reassurance 1 */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center shrink-0">
              <Truck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Livraison Rapide</h4>
              <p className="text-xs text-gray-500 font-medium">Expédié directement par le vendeur.</p>
            </div>
          </div>

          {/* Reassurance 2 */}
          <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center shrink-0">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h4 className="font-bold text-gray-900 text-sm">Paiement Sécurisé</h4>
              <p className="text-xs text-gray-500 font-medium">Mobile Money ou espèces à la livraison.</p>
            </div>
          </div>
        </div>

      </main>

      <Footer />
    </div>
  );
}
