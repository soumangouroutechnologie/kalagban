"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState } from "react";
import Link from "next/link";
import { 
  X, 
  Package, 
  ExternalLink, 
  Edit, 
  Trash2, 
  Tag, 
  Store, 
  Layers, 
  CheckCircle2, 
  AlertCircle
} from "lucide-react";

export interface SellerProduct {
  id: string;
  title: string;
  description?: string | null;
  category?: string | null;
  sku?: string | null;
  price: number;
  old_price?: number | null;
  stock_quantity: number;
  status: string;
  moderation_status?: "pending_review" | "approved" | "rejected";
  rejection_reason?: string | null;
  image_url?: string | null;
  images?: string[];
  shop_name?: string;
  shop_logo?: string | null;
}

interface ProductDetailModalProps {
  product: SellerProduct | null;
  onClose: () => void;
  onDelete?: (product: SellerProduct) => void;
}

export default function ProductDetailModal({ 
  product, 
  onClose,
  onDelete
}: ProductDetailModalProps) {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  if (!product) return null;

  const allImages = product.images && product.images.length > 0 
    ? product.images 
    : product.image_url 
      ? [product.image_url] 
      : [];

  const activeImage = allImages[activeImageIndex] || product.image_url;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-100 relative flex flex-col custom-scrollbar">
        
        {/* Header Bar */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md z-30 px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
              <Package size={20} />
            </div>
            <div>
              <span className="text-xs font-bold uppercase tracking-wider text-text-muted">Fiche Produit Vendeur</span>
              <h3 className="text-lg font-black text-gray-900 line-clamp-1">{product.title}</h3>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {product.moderation_status === "pending_review" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-500" />
                En attente de modération
              </span>
            ) : product.moderation_status === "rejected" ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-red-50 text-red-700 border border-red-200">
                <span className="w-2 h-2 rounded-full bg-red-500" />
                Refusé par la modération
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                En ligne &amp; Approuvé
              </span>
            )}

            <button 
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 hover:text-gray-900 flex items-center justify-center transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 flex flex-col gap-6">
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            
            {/* Left: Product Images Gallery */}
            <div className="flex flex-col gap-4">
              <div className="w-full h-72 sm:h-80 bg-gray-50 rounded-2xl border border-gray-100 relative overflow-hidden flex items-center justify-center shadow-inner">
                {activeImage ? (
                  <img 
                    src={activeImage} 
                    alt={product.title} 
                    className="w-full h-full object-cover" 
                  />
                ) : (
                  <div className="flex flex-col items-center gap-2 text-gray-400">
                    <Package size={48} />
                    <span className="text-xs font-bold">Aucune image disponible</span>
                  </div>
                )}

                {product.old_price && product.old_price > product.price && (
                  <span className="absolute top-3 left-3 bg-danger text-white text-xs font-extrabold px-2.5 py-1 rounded-lg shadow-md">
                    -{Math.round(((product.old_price - product.price) / product.old_price) * 100)}% PROMO
                  </span>
                )}
              </div>

              {/* Thumbnails */}
              {allImages.length > 1 && (
                <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
                  {allImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all shrink-0 ${
                        activeImageIndex === idx ? 'border-primary shadow-sm scale-105' : 'border-gray-200 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Key Info */}
            <div className="flex flex-col gap-5 justify-between">
              
              <div className="flex flex-col gap-4">
                {/* Category & SKU */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 text-xs font-extrabold px-3 py-1 rounded-lg capitalize">
                    <Tag size={12} />
                    {product.category || "Général"}
                  </span>

                  {product.sku && (
                    <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-lg">
                      <Layers size={12} />
                      SKU: {product.sku}
                    </span>
                  )}
                </div>

                {/* Title */}
                <h2 className="text-2xl font-black text-gray-900 tracking-tight leading-snug">
                  {product.title}
                </h2>

                {/* Pricing Box */}
                <div className="bg-gray-50 p-4 rounded-2xl border border-gray-100 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Prix Vendeur</span>
                    <div className="flex items-baseline gap-2 mt-0.5">
                      <span className="text-2xl font-black text-primary">
                        {product.price.toLocaleString("fr-FR")} FCFA
                      </span>
                      {product.old_price && (
                        <span className="text-sm font-semibold text-gray-400 line-through">
                          {product.old_price.toLocaleString("fr-FR")} FCFA
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-gray-500 uppercase tracking-wider block">Stock Réel</span>
                    <span className={`inline-flex items-center gap-1.5 text-sm font-extrabold mt-1 ${
                      product.stock_quantity > 0 ? 'text-emerald-600' : 'text-red-600'
                    }`}>
                      {product.stock_quantity > 0 ? (
                        <>
                          <CheckCircle2 size={16} />
                          {product.stock_quantity} en stock
                        </>
                      ) : (
                        <>
                          <AlertCircle size={16} />
                          Rupture de stock
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Description */}
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-extrabold text-gray-700 uppercase tracking-wider">Description du Produit</span>
                  <p className="text-sm text-gray-600 font-medium leading-relaxed bg-gray-50/50 p-3.5 rounded-xl border border-gray-100/80 max-h-36 overflow-y-auto custom-scrollbar">
                    {product.description || "Aucune description fournie pour ce produit."}
                  </p>
                </div>
                {/* Rejection Alert Box */}
                {product.moderation_status === "rejected" && (
                  <div className="bg-red-50 border border-red-200 rounded-2xl p-4 flex flex-col gap-2">
                    <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider">
                      <AlertCircle size={16} /> Motif du refus par la modération :
                    </div>
                    <p className="text-sm font-semibold text-red-900 bg-white/70 p-3 rounded-xl border border-red-100">
                      « {product.rejection_reason || "Cet article ne respecte pas les critères de qualité ou de description de la marketplace."} »
                    </p>
                    <p className="text-xs text-red-600 font-medium">
                      👉 Vous pouvez modifier votre article ci-dessous pour corriger ces points et le re-soumettre à l&apos;équipe.
                    </p>
                  </div>
                )}

                {/* Moderation Pending Notice */}
                {product.moderation_status === "pending_review" && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex items-start gap-3 text-amber-900 text-xs">
                    <div className="w-2 h-2 rounded-full bg-amber-500 shrink-0 mt-1.5 animate-pulse" />
                    <div>
                      <span className="font-bold">Article en cours d&apos;examen :</span> Votre produit est actuellement dans la file de vérification des modérateurs. Il sera visible dès sa validation.
                    </div>
                  </div>
                )}
              </div>

              {/* Shop Badge */}
              {product.shop_name && (
                <div className="flex items-center gap-3 bg-indigo-50/50 p-3 rounded-xl border border-indigo-100/80">
                  <div className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center font-bold text-sm overflow-hidden shrink-0">
                    {product.shop_logo ? (
                      <img src={product.shop_logo} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Store size={18} />
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Votre Boutique</span>
                    <span className="text-xs font-extrabold text-gray-900">{product.shop_name}</span>
                  </div>
                </div>
              )}

            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 px-6 py-4 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Buyer view link */}
          <a
            href={`${process.env.NEXT_PUBLIC_BUYER_URL || "https://kalagban.ci"}/products/${product.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-gray-600 hover:text-primary transition-colors flex items-center gap-1.5 py-2 px-3 rounded-xl hover:bg-gray-200/60"
          >
            <ExternalLink size={14} />
            Aperçu côté client (Acheteur)
          </a>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onDelete(product);
                }}
                className="bg-red-50 text-red-600 font-bold text-sm px-4 py-2.5 rounded-xl hover:bg-red-100 transition-colors flex items-center gap-1.5"
              >
                <Trash2 size={16} />
                Supprimer
              </button>
            )}

            <Link
              href={`/products/${product.id}/edit`}
              onClick={onClose}
              className="bg-primary text-white font-bold text-sm px-5 py-2.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex items-center gap-1.5"
            >
              <Edit size={16} />
              Modifier le produit
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
