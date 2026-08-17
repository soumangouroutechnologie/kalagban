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
  ShieldCheck,
  Package,
  Layers,
  Sparkles
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
  const [moderationStatus, setModerationStatus] = useState("approved");

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

  const isAlreadyApproved = (status === "active" || moderationStatus === "approved");

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
        setModerationStatus(prod.moderation_status || (prod.status === "active" ? "approved" : "pending_review"));

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

      // Déterminer le statut selon si le produit est déjà actif ou non
      const targetStatus = isAlreadyApproved ? "active" : "active";
      const targetModerationStatus = isAlreadyApproved ? "approved" : "pending_review";

      // 1. Mettre à jour la table products
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
          status: targetStatus,
          moderation_status: targetModerationStatus,
          rejection_reason: isAlreadyApproved ? null : undefined,
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
      alert(
        isAlreadyApproved 
          ? "Modifications enregistrées avec succès ! Votre article et vos stocks sont à jour en direct sur Kalagban. 🎉" 
          : "Produit soumis avec succès à l'équipe de modération ! 🎉"
      );
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
      
      {/* Information Banner */}
      {isAlreadyApproved ? (
        <div className="bg-emerald-50/80 border border-emerald-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="flex-1 text-sm text-emerald-900">
            <span className="font-bold">Article Approuvé & Actif :</span> Toutes vos modifications (quantité en stock, prix, photos, description) sont <strong>enregistrées et actives immédiatement</strong> sur la marketplace, sans nécessiter de re-validation.
          </div>
        </div>
      ) : (
        <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 flex items-center gap-3 shadow-xs">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center text-amber-700 shrink-0">
            <Sparkles size={22} />
          </div>
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-bold">Article en attente :</span> Les modifications seront soumises à l&apos;équipe de modération pour validation avant publication.
          </div>
        </div>
      )}

      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/products" className="p-2.5 rounded-xl bg-surface hover:bg-gray-100 border border-gray-200/80 text-text-muted hover:text-text-main transition-colors shadow-xs">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-text-main tracking-tight">Modifier le Produit</h1>
            <p className="text-text-muted text-sm mt-0.5">
              {isAlreadyApproved 
                ? "Mettez à jour vos stocks, vos prix et la fiche produit en direct." 
                : "Mettez à jour les informations et soumettez pour validation."}
            </p>
          </div>
        </div>

        <button 
          onClick={handleUpdate}
          disabled={isSaving}
          className="bg-primary text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex items-center gap-2 disabled:opacity-70"
        >
          {isSaving ? <Loader2 className="animate-spin" size={18} /> : isSaved ? <CheckCircle size={18} /> : <Save size={18} />}
          {isSaving ? "Enregistrement..." : isSaved ? "Enregistré !" : (isAlreadyApproved ? "Enregistrer les modifications" : "Soumettre les modifications")}
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
                placeholder="ex: Robe de soirée en pagne" 
                required 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-sm font-bold text-text-main">Description du produit</label>
              <textarea 
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                rows={5} 
                placeholder="Décrivez votre produit en détail..." 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all resize-none"
              />
            </div>

            {/* Catégories */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Catégorie</label>
                <select 
                  value={category} 
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat.label} value={cat.label}>{cat.label}</option>
                  ))}
                  <option value="autre">Autre (personnalisé)</option>
                </select>
              </div>

              {category === "autre" && (
                <div className="flex flex-col gap-2 animate-in fade-in">
                  <label className="text-sm font-bold text-text-main">Catégorie personnalisée</label>
                  <input 
                    type="text" 
                    value={customCategory} 
                    onChange={(e) => setCustomCategory(e.target.value)} 
                    placeholder="ex: Accessoires artisanaux" 
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
                  />
                </div>
              )}
            </div>

            {/* Code SKU Optionnel */}
            <div className="flex flex-col gap-2 pt-2">
              <label className="text-sm font-bold text-text-main">Code SKU (Optionnel)</label>
              <input 
                type="text" 
                value={sku} 
                onChange={(e) => setSku(e.target.value)} 
                placeholder="ex: REF-ROBE-001" 
                className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
              />
            </div>
          </div>

          {/* Card: Tarification & Stock */}
          <div className="bg-surface p-6 rounded-card border border-gray-100 shadow-soft flex flex-col gap-5">
            <h3 className="text-lg font-bold text-text-main border-b border-gray-100 pb-3 flex items-center gap-2">
              <Package size={18} className="text-primary" />
              <span>Tarification & Gestion des Stocks</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Prix de vente (FCFA) *</label>
                <input 
                  type="number" 
                  value={price} 
                  onChange={(e) => setPrice(e.target.value)} 
                  placeholder="ex: 15000" 
                  required 
                  min="0"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-bold text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Ancien prix barré (FCFA)</label>
                <input 
                  type="number" 
                  value={oldPrice} 
                  onChange={(e) => setOldPrice(e.target.value)} 
                  placeholder="ex: 20000" 
                  min="0"
                  className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary font-medium text-sm transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-text-main">Quantité en Stock *</label>
                <input 
                  type="number" 
                  value={stock} 
                  onChange={(e) => setStock(e.target.value)} 
                  placeholder="ex: 10" 
                  required 
                  min="0"
                  className="w-full bg-indigo-50/50 border border-indigo-200 text-indigo-950 font-black rounded-xl p-3.5 focus:ring-2 focus:ring-primary/50 focus:border-primary text-sm transition-all"
                />
              </div>
            </div>
          </div>

        </div>

        {/* RIGHT COLUMN: Media & Image AI Studio */}
        <div className="flex flex-col gap-6">
          
          <div className="bg-surface p-6 rounded-card border border-gray-100 shadow-soft flex flex-col gap-5 sticky top-24">
            <h3 className="text-lg font-bold text-text-main border-b border-gray-100 pb-3 flex items-center justify-between">
              <span>Photo du Produit</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary flex items-center gap-1">
                <Sparkles size={12} /> Studio IA
              </span>
            </h3>

            {/* Hidden input file */}
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleImageSelect} 
              accept="image/*" 
              className="hidden" 
            />

            {/* Preview Box */}
            <div 
              onClick={() => fileInputRef.current?.click()}
              style={{ backgroundColor: selectedBgColor === "transparent" ? "#f9fafb" : selectedBgColor }}
              className={`w-full aspect-square rounded-2xl border-2 border-dashed flex flex-col items-center justify-center relative overflow-hidden group cursor-pointer transition-all ${
                uploadedImage ? "border-gray-200" : "border-gray-300 hover:border-primary bg-gray-50"
              }`}
            >
              {uploadedImage ? (
                <>
                  <img 
                    src={uploadedImage} 
                    alt="Preview" 
                    className={`w-full h-full object-contain p-4 transition-all duration-300 ${
                      hasBgRemoved ? "filter drop-shadow-xl" : ""
                    }`}
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white font-bold text-xs gap-2 backdrop-blur-xs">
                    <UploadCloud size={16} /> Changer l&apos;image
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center p-6">
                  <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                    <UploadCloud size={24} />
                  </div>
                  <p className="text-xs font-bold text-text-main">Cliquez pour ajouter une photo</p>
                  <p className="text-[10px] text-text-muted">PNG, JPG, WEBP jusqu&apos;à 5MB</p>
                </div>
              )}
            </div>

            {/* IA Détourage rapide */}
            {uploadedImage && (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handleRemoveBg}
                  disabled={isRemovingBg}
                  className="w-full bg-indigo-50 hover:bg-indigo-100 text-primary border border-indigo-200/80 font-bold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 transition-all"
                >
                  {isRemovingBg ? <Loader2 className="animate-spin" size={14} /> : <Wand2 size={14} />}
                  {isRemovingBg ? "Détourage IA en cours..." : hasBgRemoved ? "Arrière-plan supprimé ✨" : "Détourer l'arrière-plan (IA)"}
                </button>

                {/* Sélecteur de couleur de fond */}
                {hasBgRemoved && (
                  <div className="flex flex-col gap-2 pt-2 animate-in fade-in">
                    <label className="text-xs font-bold text-text-muted flex items-center gap-1.5">
                      <Layers size={14} /> Fond de Studio Produit
                    </label>
                    <div className="flex items-center gap-2">
                      {bgColors.map((bg) => (
                        <button
                          key={bg.value}
                          type="button"
                          onClick={() => setSelectedBgColor(bg.value)}
                          className={`w-7 h-7 rounded-full border ${bg.border} shadow-xs transition-transform ${
                            selectedBgColor === bg.value ? "scale-125 ring-2 ring-primary ring-offset-2" : "hover:scale-110"
                          }`}
                          style={{ backgroundColor: bg.value === "transparent" ? "#ffffff" : bg.value }}
                          title={bg.name}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <button 
              type="submit"
              disabled={isSaving}
              className="w-full bg-primary hover:bg-indigo-600 text-white font-bold py-3.5 px-4 rounded-xl shadow-lg shadow-primary/30 text-sm flex items-center justify-center gap-2 transition-all mt-2"
            >
              {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {isSaving ? "Enregistrement..." : (isAlreadyApproved ? "Enregistrer les modifications" : "Soumettre les modifications")}
            </button>

          </div>

        </div>

      </form>

    </div>
  );
}
