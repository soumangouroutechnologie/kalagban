"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Plus, 
  Search, 
  Trash2, 
  Eye, 
  Edit,
  Loader2, 
  Image as ImageIcon,
  AlertTriangle, 
  X
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRODUCT_CATEGORIES } from "@/lib/categories";
import ProductDetailModal, { SellerProduct } from "@/components/products/ProductDetailModal";

interface Product extends SellerProduct {
  id: string;
  title: string;
  category?: string;
  sku?: string;
  price: number;
  stock_quantity: number;
  status: string;
  moderation_status?: "pending_review" | "approved" | "rejected";
  rejection_reason?: string | null;
  image_url?: string | null;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");

  // Modal States
  const [productToView, setProductToView] = useState<SellerProduct | null>(null);
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchShopProducts() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session || !isMounted) return;

        const { data } = await supabase
          .from('products')
          .select('*, product_media(url)')
          .eq('shop_id', session.user.id)
          .order('created_at', { ascending: false });
          
        if (data && isMounted) {
          const formatted: Product[] = data.map((p: {
            id: string;
            title: string;
            description?: string;
            category?: string;
            sku?: string;
            price: number;
            old_price?: number | null;
            stock_quantity: number;
            status: string;
            moderation_status?: "pending_review" | "approved" | "rejected";
            rejection_reason?: string | null;
            product_media?: { url: string }[];
          }) => ({
            id: p.id,
            title: p.title,
            description: p.description,
            category: p.category,
            sku: p.sku,
            price: Number(p.price),
            old_price: p.old_price ? Number(p.old_price) : undefined,
            stock_quantity: p.stock_quantity,
            status: p.status,
            moderation_status: p.moderation_status || (p.status === "active" ? "approved" : "pending_review"),
            rejection_reason: p.rejection_reason,
            image_url: p.product_media && p.product_media.length > 0 ? p.product_media[0].url : null,
            images: p.product_media ? p.product_media.map(m => m.url) : [],
          }));
          setProducts(formatted);
        }
      } catch (error) {
        console.error("Error loading products:", error);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void fetchShopProducts();

    const channel = supabase
      .channel("seller_products_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, () => {
        void fetchShopProducts();
      })
      .subscribe();

    return () => {
      isMounted = false;
      supabase.removeChannel(channel);
    };
  }, []);

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    setIsDeleting(true);

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productToDelete.id);

      if (error) {
        alert("Erreur lors de la suppression : " + error.message);
      } else {
        setProducts(products.filter(p => p.id !== productToDelete.id));
      }
    } catch (error) {
      console.error("Erreur suppression:", error);
    } finally {
      setIsDeleting(false);
      setProductToDelete(null);
    }
  };

  const [statusFilter, setStatusFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");

  const pendingCount = products.filter(p => p.moderation_status === "pending_review").length;
  const approvedCount = products.filter(p => p.moderation_status === "approved" || (!p.moderation_status && p.status === "active")).length;
  const rejectedCount = products.filter(p => p.moderation_status === "rejected").length;

  const filteredProducts = products.filter(p => {
    const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (p.sku && p.sku.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesCategory = selectedCategory ? p.category?.toLowerCase() === selectedCategory.toLowerCase() : true;
    
    let matchesStatus = true;
    if (statusFilter === "pending") matchesStatus = p.moderation_status === "pending_review";
    else if (statusFilter === "approved") matchesStatus = p.moderation_status === "approved" || (!p.moderation_status && p.status === "active");
    else if (statusFilter === "rejected") matchesStatus = p.moderation_status === "rejected";

    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="flex flex-col gap-6 w-full max-w-6xl mx-auto pb-10 relative">
      
      {/* DELETE CONFIRMATION MODAL */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full text-center shadow-2xl border border-gray-100 relative">
            <button 
              onClick={() => setProductToDelete(null)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 p-2 rounded-full hover:bg-gray-100 transition-colors"
            >
              <X size={20} />
            </button>

            <div className="w-16 h-16 bg-red-50 text-red-500 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-red-100">
              <AlertTriangle size={32} />
            </div>

            <h3 className="text-xl font-extrabold text-gray-900 mb-2">Confirmer la suppression</h3>
            <p className="text-gray-500 text-sm font-medium mb-6">
              Êtes-vous sûr de vouloir supprimer le produit <strong className="text-gray-900">&quot;{productToDelete.title}&quot;</strong> ? Cette action est irréversible.
            </p>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setProductToDelete(null)}
                className="flex-1 bg-gray-100 text-gray-700 font-bold py-3 px-4 rounded-xl hover:bg-gray-200 transition-colors text-sm"
              >
                Annuler
              </button>

              <button
                type="button"
                onClick={confirmDeleteProduct}
                disabled={isDeleting}
                className="flex-1 bg-red-600 text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-red-600/30 hover:bg-red-700 transition-colors text-sm flex justify-center items-center gap-2"
              >
                {isDeleting ? <Loader2 className="animate-spin" size={18} /> : "Oui, supprimer"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black text-text-main tracking-tight">Mes Produits</h1>
          <p className="text-text-muted mt-1">Gérez vos articles et suivez l&apos;état de validation par l&apos;équipe de modération.</p>
        </div>
        <Link 
          href="/products/new"
          className="bg-primary text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 hover:shadow-indigo-600/40 transform hover:-translate-y-0.5 transition-all flex items-center gap-2"
        >
          <Plus size={20} />
          Ajouter un Produit
        </Link>
      </div>

      {/* Moderation Status Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 custom-scrollbar">
        <button
          onClick={() => setStatusFilter("all")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
            statusFilter === "all"
              ? "bg-gray-900 text-white shadow-md"
              : "bg-surface text-gray-600 hover:bg-gray-100 border border-gray-200"
          }`}
        >
          Tous les articles
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusFilter === "all" ? "bg-white/20 text-white" : "bg-gray-100 text-gray-700"}`}>
            {products.length}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("pending")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
            statusFilter === "pending"
              ? "bg-amber-500 text-white shadow-md shadow-amber-500/20"
              : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200"
          }`}
        >
          ⏳ En attente de validation
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusFilter === "pending" ? "bg-white/20 text-white" : "bg-amber-100 text-amber-800"}`}>
            {pendingCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("approved")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
            statusFilter === "approved"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200"
          }`}
        >
          🟢 En ligne &amp; Validés
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusFilter === "approved" ? "bg-white/20 text-white" : "bg-emerald-100 text-emerald-800"}`}>
            {approvedCount}
          </span>
        </button>

        <button
          onClick={() => setStatusFilter("rejected")}
          className={`px-4 py-2 rounded-xl text-xs font-extrabold transition-all shrink-0 flex items-center gap-2 ${
            statusFilter === "rejected"
              ? "bg-red-600 text-white shadow-md shadow-red-600/20"
              : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200"
          }`}
        >
          ❌ Refusés
          <span className={`px-2 py-0.5 rounded-full text-[10px] ${statusFilter === "rejected" ? "bg-white/20 text-white" : "bg-red-100 text-red-800"}`}>
            {rejectedCount}
          </span>
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-surface rounded-card p-4 shadow-sm border border-gray-100 flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative w-full sm:max-w-md">
          <input 
            type="text" 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un produit (nom, SKU)..." 
            className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-2.5 px-4 pl-11 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-medium text-sm"
          />
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-2.5 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-medium text-sm w-full sm:w-auto"
          >
            <option value="">Toutes les catégories</option>
            {PRODUCT_CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-surface rounded-card shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-10 flex justify-center"><Loader2 className="animate-spin text-primary" /></div>
          ) : filteredProducts.length === 0 ? (
            <div className="p-10 text-center text-gray-500 font-medium">Aucun produit trouvé.</div>
          ) : (
            <table className="w-full text-left border-collapse min-w-175">
              <thead>
                <tr className="bg-bg-app text-text-muted text-xs uppercase tracking-wider border-b border-gray-100">
                  <th className="font-bold py-4 px-6">Produit</th>
                  <th className="font-bold py-4 px-6">Catégorie</th>
                  <th className="font-bold py-4 px-6">SKU</th>
                  <th className="font-bold py-4 px-6">Prix</th>
                  <th className="font-bold py-4 px-6">Stock</th>
                  <th className="font-bold py-4 px-6">Statut</th>
                  <th className="font-bold py-4 px-6 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    
                    {/* Product Image & Title */}
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-gray-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0 overflow-hidden shadow-xs">
                          {product.image_url ? (
                            <img src={product.image_url} alt={product.title} className="w-full h-full object-cover" />
                          ) : (
                            <ImageIcon size={20} />
                          )}
                        </div>
                        <span className="font-bold text-text-main line-clamp-1">{product.title}</span>
                      </div>
                    </td>

                    {/* Category */}
                    <td className="py-4 px-6">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-indigo-50 text-indigo-700 capitalize">
                        {product.category || "Général"}
                      </span>
                    </td>

                    {/* SKU */}
                    <td className="py-4 px-6 text-text-muted font-medium text-sm">{product.sku || '-'}</td>

                    {/* Price */}
                    <td className="py-4 px-6 font-extrabold text-text-main text-sm">{product.price.toLocaleString("fr-FR")} FCFA</td>

                    {/* Stock */}
                    <td className="py-4 px-6">
                      <span className={`font-bold text-xs px-2.5 py-1 rounded-lg ${
                        product.stock_quantity > 0 ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"
                      }`}>
                        {product.stock_quantity > 0 ? `${product.stock_quantity} unités` : "Épuisé"}
                      </span>
                    </td>

                    {/* Status / Moderation Badge */}
                    <td className="py-4 px-6">
                      {product.moderation_status === "pending_review" ? (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs animate-pulse">
                          ⏳ En attente de validation
                        </span>
                      ) : product.moderation_status === "rejected" ? (
                        <div className="flex flex-col gap-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-red-50 text-red-700 border border-red-200 w-fit">
                            ❌ Rejeté
                          </span>
                          {product.rejection_reason && (
                            <span className="text-[10px] text-red-600 font-semibold max-w-45 line-clamp-1" title={product.rejection_reason}>
                              {product.rejection_reason}
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          🟢 En ligne &amp; Vérifié
                        </span>
                      )}
                    </td>

                    {/* Action Buttons (ALWAYS VISIBLE & CLEAR) */}
                    <td className="py-4 px-6 text-center">
                      <div className="flex items-center justify-center gap-2">
                        {/* View Seller Product Modal */}
                        <button
                          type="button"
                          onClick={() => setProductToView(product)}
                          title="Voir la fiche produit vendeur"
                          className="p-2 text-gray-500 hover:text-indigo-600 bg-gray-50 hover:bg-indigo-50 rounded-xl transition-all border border-gray-200/80"
                        >
                          <Eye size={16} />
                        </button>

                        {/* Edit Product Button */}
                        <Link
                          href={`/products/${product.id}/edit`}
                          title="Modifier ce produit"
                          className="p-2 text-gray-500 hover:text-primary bg-gray-50 hover:bg-primary/10 rounded-xl transition-all border border-gray-200/80"
                        >
                          <Edit size={16} />
                        </Link>

                        {/* Delete Button (Triggers Popup) */}
                        <button
                          type="button"
                          onClick={() => setProductToDelete(product)}
                          title="Supprimer ce produit"
                          className="p-2 text-gray-500 hover:text-red-600 bg-gray-50 hover:bg-red-50 rounded-xl transition-all border border-gray-200/80"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* SELLER PRODUCT DETAIL MODAL */}
      {productToView && (
        <ProductDetailModal
          product={productToView}
          onClose={() => setProductToView(null)}
          onDelete={(p) => setProductToDelete(p as Product)}
        />
      )}
    </div>
  );
}
