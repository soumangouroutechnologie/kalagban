"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useEffect, useRef, use } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  UploadCloud, 
  Save, 
  CheckCircle, 
  Wand2, 
  Loader2, 
  AlertTriangle 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const productId = resolvedParams.id;
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [stock, setStock] = useState("0");
  const [sku, setSku] = useState("");
  const [status, setStatus] = useState("active");

  // Image states
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
  const [hasBgRemoved, setHasBgRemoved] = useState(false);
  const [selectedBgColor, setSelectedBgColor] = useState<string>("transparent");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bgColors = [
    { name: "Transparent", value: "transparent", border: "border-gray-200" },
    { name: "Blanc pur", value: "#ffffff", border: "border-gray-200" },
    { name: "Gris Studio", value: "#f3f4f6", border: "border-gray-300" },
    { name: "Rose Pastel", value: "#fce7f3", border: "border-pink-200" },
    { name: "Bleu Ciel", value: "#e0e7ff", border: "border-blue-200" },
    { name: "Jaune Pâle", value: "#fef3c7", border: "border-yellow-200" },
  ];

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          router.push("/login");
          return;
        }

        const { data: prod, error } = await supabase
          .from('products')
          .select('*, product_media(url)')
          .eq('id', productId)
          .eq('shop_id', session.user.id)
          .single();

        if (error || !prod) {
          alert("Produit introuvable ou accès non autorisé.");
          router.push("/products");
          return;
        }

        setTitle(prod.title || "");
        setDescription(prod.description || "");
        setPrice(prod.price ? prod.price.toString() : "");
        setOldPrice(prod.old_price ? prod.old_price.toString() : "");
        setStock(prod.stock_quantity !== undefined ? prod.stock_quantity.toString() : "0");
        setSku(prod.sku || "");
        setStatus(prod.status || "active");

        // Catégorie
        const foundCategory = PRODUCT_CATEGORIES.find(c => c.label.toLowerCase() === (prod.category || "").toLowerCase());
        if (foundCategory) {
          setCategory(foundCategory.label);
        } else if (prod.category) {
          setCategory("autre");
          setCustomCategory(prod.category);
        } else {
          setCategory("");
        }

        // Image
        if (prod.product_media && prod.product_media.length > 0) {
          setUploadedImage(prod.product_media[0].url);
        }

      } catch (err) {
        console.error("Erreur de chargement produit:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, router]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      setUploadedImage(URL.createObjectURL(file));
      setHasBgRemoved(false);
    }
  };

  const handleRemoveBg = () => {
    if (!uploadedImage) return;
    setIsRemovingBg(true);
    setTimeout(() => {
      setIsRemovingBg(false);
      setHasBgRemoved(true);
    }, 1500);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) {
      alert("Veuillez remplir au moins le titre et le prix.");
      return;
    }

    setIsSaving(true);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // 1. Mettre à jour la table products et repasser en modération
      const { error: updateError } = await supabase
        .from('products')
        .update({
          title,
          description,
          price: parseFloat(price) || 0,
          old_price: oldPrice ? parseFloat(oldPrice) : null,
          category: category === "autre" ? (customCategory.trim() || "Autre") : category,
          stock_quantity: parseInt(stock) || 0,
          sku,
          status: 'pending_review',
          moderation_status: 'pending_review',
          rejection_reason: null, // Reset previous rejection
        })
        .eq('id', productId)
        .eq('shop_id', session.user.id);

      if (updateError) throw updateError;

      // 2. Televerser la nouvelle image si elle a changé
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `prod_${productId}_${Date.now()}.${fileExt}`;

        const { error: uploadError } = await supabase.storage
          .from('kalagban_media')
          .upload(fileName, imageFile);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('kalagban_media')
            .getPublicUrl(fileName);

          // Supprimer anciennes images et ajouter la nouvelle
          await supabase.from('product_media').delete().eq('product_id', productId);
          await supabase.from('product_media').insert({
            product_id: productId,
            url: publicUrlData.publicUrl,
            position: 0
          });
        }
      }

      setIsSaved(true);
      alert("Produit mis à jour et re-soumis avec succès à l'équipe de modération ! 🎉");
      router.push("/products");

    } catch (error) {
      console.error("Erreur de mise à jour du produit:", error);
      alert("Erreur lors de la mise à jour du produit.");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="animate-spin text-primary" size={40} />
        <p className="text-gray-500 font-bold">Chargement des données du produit...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 w-full max-w-4xl mx-auto pb-16">
      
      {/* Moderation Warning Banner */}
      <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
          <AlertTriangle size={22} />
        </div>
        <div className="flex-1 text-sm text-amber-900">
          <span className="font-bold">Information de modération :</span> La modification des informations (titre, prix, photo) re-soumet automatiquement cet article à l&apos;équipe de modération pour validation.
        </div>
      </div>

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products" className="p-2.5 rounded-xl bg-surface hover:bg-gray-100 border border-gray-200/80 text-text-muted hover:text-text-main transition-colors shadow-xs">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-text-main tracking-tight">Modifier le Produit</h1>
            <p className="text-text-muted text-sm mt-0.5">Mettez à jour les informations et re-soumettez pour validation.</p>
          </div>
        </div>

        <button 
          onClick={handleUpdate}
          disabled={isSaving}
          className="bg-primary text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
          {isSaving ? "Soumission..." : isSaved ? "Re-soumis !" : "Soumettre les modifications"}
        </button>
      </div>

      {/* SUCCESS NOTIFICATION */}
      {isSaved && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-2xl flex items-center gap-3 animate-in fade-in">
          <CheckCircle className="text-emerald-600" size={24} />
          <div>
            <h4 className="font-extrabold text-sm">Produit mis à jour avec succès ! 🎉</h4>
            <p className="text-xs text-emerald-700">Redirection vers votre catalogue de produits...</p>
          </div>
        </div>
      )}

      {/* Main Edit Form */}
      <form onSubmit={handleUpdate} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Main Inputs */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Card: Informations Principales */}
          <div className="bg-surface p-6 rounded-card border border-gray-100 shadow-soft flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-main border-b border-gray-100 pb-3">Informations de base</h3>
            
            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-main">Titre du produit *</label>
              <input 
                type="text" 
                value={title} 
                onChange={(e) => setTitle(e.target.value)} 
                placeholder="ex: Réfrigérateur Smart Inverter 350L" 
                required 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-main">Description du produit</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder="Décrivez les fonctionnalités clés, caractéristiques et garanties de votre produit..." 
                rows={5} 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Catégorie</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
                >
                  <option value="">Sélectionner une catégorie</option>
                  {PRODUCT_CATEGORIES.map((cat, idx) => (
                    <option key={idx} value={cat.label}>{cat.label}</option>
                  ))}
                  <option value="autre">Autre (personnalisé)</option>
                </select>
              </div>

              {category === "autre" && (
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-bold text-text-main">Catégorie personnalisée</label>
                  <input 
                    type="text" 
                    value={customCategory} 
                    onChange={(e) => setCustomCategory(e.target.value)} 
                    placeholder="Nom de votre catégorie" 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
                  />
                </div>
              )}

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Code SKU (Optionnel)</label>
                <input 
                  type="text" 
                  value={sku} 
                  onChange={(e) => setSku(e.target.value)} 
                  placeholder="ex: REF-FRIGO-001" 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
                />
              </div>
            </div>
          </div>

          {/* Card: Tarification et Inventaire / Stock */}
          <div className="bg-surface p-6 rounded-card border border-gray-100 shadow-soft flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-main border-b border-gray-100 pb-3">Prix & Gestion du Stock</h3>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Prix de vente (FCFA) *</label>
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder="100000" 
                  required 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-extrabold text-base transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Ancien prix / Barré (FCFA)</label>
                <input 
                  type="number" 
                  value={oldPrice} 
                  onChange={(e) => setOldPrice(e.target.value)} 
                  placeholder="135000" 
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
                />
              </div>
            </div>

            {/* Stock Control */}
            <div className="flex flex-col gap-3 pt-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-bold text-text-main">Quantité disponible en stock</label>
                <span className={`text-xs font-extrabold px-2.5 py-1 rounded-lg ${
                  parseInt(stock) > 5 ? 'bg-emerald-50 text-emerald-700' :
                  parseInt(stock) > 0 ? 'bg-amber-50 text-amber-700' : 'bg-red-50 text-red-600'
                }`}>
                  {parseInt(stock) > 5 ? 'Stock Suffisant' : parseInt(stock) > 0 ? 'Stock Limité 🔥' : 'Rupture de Stock 🚫'}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <input 
                  type="number" 
                  min="0"
                  value={stock} 
                  onChange={(e) => setStock(e.target.value)} 
                  className="w-full sm:w-48 bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 font-black text-lg focus:ring-2 focus:ring-primary/50 transition-all"
                />

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={() => setStock("0")} 
                    className="text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 py-2.5 px-3.5 rounded-xl border border-red-200 transition-colors"
                  >
                    Marquer en Rupture (0)
                  </button>
                  <button 
                    type="button" 
                    onClick={() => setStock((prev) => (parseInt(prev || "0") + 10).toString())} 
                    className="text-xs font-bold bg-emerald-50 text-emerald-700 hover:bg-emerald-100 py-2.5 px-3.5 rounded-xl border border-emerald-200 transition-colors"
                  >
                    +10 en stock
                  </button>
                </div>
              </div>

              {parseInt(stock) <= 0 && (
                <p className="text-xs text-red-600 font-bold flex items-center gap-1.5 mt-1">
                  <AlertTriangle size={14} />
                  Ce produit apparaîtra comme &quot;Rupture de stock&quot; côté client et les achats seront temporairement désactivés.
                </p>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Photo Upload & AI BG Removal */}
        <div className="flex flex-col gap-6">
          
          {/* Card: Statut de publication */}
          <div className="bg-surface p-6 rounded-card border border-gray-100 shadow-soft flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Statut de la fiche</h3>
            
            <div className="flex flex-col gap-2">
              <label 
                onClick={() => setStatus("active")}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  status === "active" ? "border-primary bg-primary/5 text-primary" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-sm font-extrabold">En ligne (Publié)</span>
                </div>
                <input type="radio" name="status" checked={status === "active"} onChange={() => setStatus("active")} className="hidden" />
              </label>

              <label 
                onClick={() => setStatus("draft")}
                className={`flex items-center justify-between p-3.5 rounded-xl border cursor-pointer transition-all ${
                  status === "draft" ? "border-gray-800 bg-gray-100 text-gray-900" : "border-gray-200 hover:bg-gray-50"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-gray-400" />
                  <span className="text-sm font-bold text-gray-700">Brouillon (Masqué)</span>
                </div>
                <input type="radio" name="status" checked={status === "draft"} onChange={() => setStatus("draft")} className="hidden" />
              </label>
            </div>
          </div>

          {/* Card: Photo du produit */}
          <div className="bg-surface p-6 rounded-card border border-gray-100 shadow-soft flex flex-col gap-4">
            <h3 className="text-sm font-bold text-text-main uppercase tracking-wider">Photo du produit</h3>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />

            {!uploadedImage ? (
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-200 hover:border-primary rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition-colors text-center bg-gray-50/50"
              >
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mb-3">
                  <UploadCloud size={24} />
                </div>
                <span className="text-sm font-bold text-text-main mb-1">Changer la photo</span>
                <span className="text-xs text-text-muted">PNG, JPG jusqu&apos;à 5MB</span>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <div 
                  className="w-full h-64 rounded-2xl border border-gray-200 relative overflow-hidden flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: selectedBgColor }}
                >
                  <img 
                    src={uploadedImage} 
                    alt="Aperçu du produit" 
                    className="w-full h-full object-contain p-2" 
                  />

                  {isRemovingBg && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-white p-4">
                      <Wand2 className="animate-spin mb-2" size={32} />
                      <span className="text-sm font-bold">Détourage IA en cours...</span>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    type="button" 
                    onClick={handleRemoveBg}
                    disabled={isRemovingBg || hasBgRemoved}
                    className="flex-1 bg-linear-to-r from-indigo-600 to-purple-600 text-white font-bold text-xs py-3 px-3 rounded-xl shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
                  >
                    <Wand2 size={14} />
                    {hasBgRemoved ? "Arrière-plan détouré ✨" : "Détourer la photo (IA)"}
                  </button>

                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="p-3 text-gray-500 hover:text-primary bg-gray-100 rounded-xl transition-colors"
                    title="Remplacer l'image"
                  >
                    <UploadCloud size={16} />
                  </button>
                </div>

                {hasBgRemoved && (
                  <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                    <span className="text-xs font-bold text-gray-700">Couleur d&apos;arrière-plan</span>
                    <div className="flex items-center gap-2 flex-wrap">
                      {bgColors.map((color, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setSelectedBgColor(color.value)}
                          className={`w-7 h-7 rounded-full border ${color.border} flex items-center justify-center transition-transform ${
                            selectedBgColor === color.value ? "scale-125 ring-2 ring-primary" : ""
                          }`}
                          style={{ backgroundColor: color.value === "transparent" ? "#ffffff" : color.value }}
                          title={color.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

      </form>
    </div>
  );
}
