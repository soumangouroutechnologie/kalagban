"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ShoppingBag, Image as ImageIcon, Eye, Heart } from "lucide-react";
import { useCart } from "@/context/CartContext";
import { supabase } from "@/lib/supabase";

export interface ProductType {
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
}

export default function ProductCard({ product }: { product: ProductType }) {
  const router = useRouter();
  const { addToCart } = useCart();
  const [isFav, setIsFav] = useState(false);

  const discountPercent = product.old_price && product.old_price > product.price
    ? Math.round(((product.old_price - product.price) / product.old_price) * 100)
    : null;

  const handleFavoriteClick = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      alert("Connexion requise : Vous devez être connecté ou inscrit à votre compte Kalagban pour ajouter des produits à vos favoris.");
      router.push("/login");
      return;
    }

    setIsFav(!isFav);
  };

  return (
    <div className="bg-white rounded-3xl p-4 border border-gray-100 shadow-sm hover:shadow-xl hover:border-indigo-100 transition-all duration-300 flex flex-col group relative">
      
      {/* Image Container */}
      <Link href={`/products/${product.id}`} className="block relative aspect-square bg-gray-50 rounded-2xl overflow-hidden mb-4">
        {product.image_url ? (
          <img 
            src={product.image_url} 
            alt={product.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" 
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-gray-300">
            <ImageIcon size={48} strokeWidth={1.5} />
          </div>
        )}

        {/* Badges */}
        <div className="absolute top-3 left-3 flex flex-col gap-1.5 z-10">
          {discountPercent !== null && (
            <span className="bg-red-500 text-white font-extrabold text-xs px-2.5 py-1 rounded-xl shadow-md">
              -{discountPercent}%
            </span>
          )}
          {product.category && (
            <span className="bg-white/90 backdrop-blur-md text-gray-800 font-bold text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-xl shadow-xs border border-white/50">
              {product.category}
            </span>
          )}
        </div>

        {/* Heart Favorite Button */}
        <button
          onClick={handleFavoriteClick}
          className="absolute top-3 right-3 z-20 w-9 h-9 bg-white/90 backdrop-blur-md rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform cursor-pointer"
          title="Ajouter aux favoris (Connexion requise)"
        >
          <Heart
            size={18}
            className={isFav ? "text-red-500 fill-red-500" : "text-gray-600 hover:text-red-500"}
          />
        </button>

        {/* Quick View Overlay */}
        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="bg-white text-gray-900 font-bold text-xs px-4 py-2 rounded-full shadow-lg flex items-center gap-1.5 transform translate-y-2 group-hover:translate-y-0 transition-all">
            <Eye size={14} /> Voir le produit
          </span>
        </div>
      </Link>

      {/* Info Container */}
      <div className="flex-1 flex flex-col justify-between gap-3">
        <div>
          <Link href={`/products/${product.id}`} className="group-hover:text-indigo-600 transition-colors">
            <h3 className="font-bold text-gray-900 text-base line-clamp-2 leading-snug">
              {product.title}
            </h3>
          </Link>
        </div>

        {/* Price & Cart Action */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-50">
          <div className="flex flex-col">
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-gray-900 tracking-tight">
                {product.price.toLocaleString("fr-FR")}
              </span>
              <span className="text-xs font-bold text-gray-500">FCFA</span>
            </div>
            {product.old_price && (
              <span className="text-xs text-gray-400 line-through font-medium">
                {product.old_price.toLocaleString("fr-FR")} FCFA
              </span>
            )}
          </div>

          <button
            onClick={() =>
              addToCart({
                productId: product.id,
                shopId: product.shop_id,
                title: product.title,
                price: product.price,
                oldPrice: product.old_price,
                image: product.image_url,
                quantity: 1,
              })
            }
            className="w-11 h-11 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all shadow-xs group/btn cursor-pointer"
            title="Ajouter au panier"
          >
            <ShoppingBag size={20} className="group-hover/btn:scale-110 transition-transform" />
          </button>
        </div>

      </div>
    </div>
  );
}
