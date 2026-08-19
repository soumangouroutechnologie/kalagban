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
  Plus,
  Trash2,
  Star
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

interface ProductImage {
  id: string;
  file?: File;
  previewUrl: string;
  isExisting?: boolean;
  hasBgRemoved?: boolean;
  bgColor?: string;
}

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

  // Multi-Images & Studio IA
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number>(0);
  const [isRemovingBg, setIsRemovingBg] = useState(false);
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
  const currentImage = images[selectedImageIndex] || null;

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
          .select('*, product_media(url, position)')
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

        // Images Multiples
        if (prod.product_media && prod.product_media.length > 0) {
          // Sort by position
          const sortedMedia = [...prod.product_media].sort((a, b) => (a.position || 0) - (b.position || 0));
          const loadedImgs: ProductImage[] = sortedMedia.map((m: { url: string }, idx: number) => ({
            id: `existing_${idx}_${Date.now()}`,
            previewUrl: m.url,
            isExisting: true,
            hasBgRemoved: false,
            bgColor: "transparent"
          }));
          setImages(loadedImgs);
          setSelectedImageIndex(0);
        }

      } catch (err) {
        console.error("Erreur de chargement produit:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchProduct();
  }, [productId, router]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const selectedFiles = Array.from(e.target.files);
      const remainingSlots = 5 - images.length;
      const filesToAdd = selectedFiles.slice(0, remainingSlots);

      const newImages: ProductImage[] = filesToAdd.map((file) => ({
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file,
        previewUrl: URL.createObjectURL(file),
        isExisting: false,
        hasBgRemoved: false,
        bgColor: "transparent",
      }));

      setImages((prev) => {
        const updated = [...prev, ...newImages];
        if (prev.length === 0) {
          setSelectedImageIndex(0);
        }
        return updated;
      });
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleRemoveImage = (indexToRemove: number) => {
    setImages((prev) => {
      const updated = prev.filter((_, idx) => idx !== indexToRemove);
      if (selectedImageIndex >= updated.length) {
        setSelectedImageIndex(Math.max(0, updated.length - 1));
      }
      return updated;
    });
  };

  const handleSetBgColor = (color: string) => {
    if (!currentImage) return;
    setImages((prev) =>
      prev.map((img, idx) =>
        idx === selectedImageIndex ? { ...img, bgColor: color } : img
      )
    );
  };

  const handleRemoveBg = async () => {
    if (!currentImage) return;
    setIsRemovingBg(true);
    try {
      const mod = await import("@imgly/background-removal");
      const imglyRemoveBackground = (mod.default || mod.removeBackground || mod) as unknown as (image: string) => Promise<Blob>;
      const blob = await imglyRemoveBackground(currentImage.previewUrl);
      
      const webpBlob = await new Promise<Blob>((resolve, reject) => {
        const img = new window.Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error("Canvas non supporté"));
          ctx.drawImage(img, 0, 0);
          canvas.toBlob(
            (resultBlob) => {
              if (resultBlob) resolve(resultBlob);
              else reject(new Error("Échec de la conversion WebP"));
            },
            'image/webp',
            0.85
          );
        };
        img.onerror = () => reject(new Error("Erreur de chargement pour la conversion WebP"));
        img.src = URL.createObjectURL(blob);
      });

      const url = URL.createObjectURL(webpBlob);
      const newFile = new File([webpBlob], `product_${selectedImageIndex}_bg_removed.webp`, { type: "image/webp" });

      setImages((prev) =>
        prev.map((img, idx) =>
          idx === selectedImageIndex
            ? { ...img, file: newFile, previewUrl: url, isExisting: false, hasBgRemoved: true, bgColor: "#ffffff" }
            : img
        )
      );
    } catch (error) {
      console.error("Erreur de détourage IA ou conversion:", error);
      alert("Erreur lors du traitement de l'image.");
    } finally {
      setIsRemovingBg(false);
    }
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

      const targetStatus = isAlreadyApproved ? "active" : "pending";
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

      // 2. Synchroniser les images dans product_media
      await supabase.from('product_media').delete().eq('product_id', productId);

      for (let i = 0; i < images.length; i++) {
        const imgItem = images[i];
        let finalUrl = imgItem.previewUrl;

        if (imgItem.file) {
          const fileExt = imgItem.file.name.split('.').pop() || 'webp';
          const fileName = `prod_${productId}_${i}_${Date.now()}.${fileExt}`;

          const { error: uploadError } = await supabase.storage
            .from('kalagban_media')
            .upload(fileName, imgItem.file);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('kalagban_media')
              .getPublicUrl(fileName);
            finalUrl = publicUrlData.publicUrl;
          }
        }

        await supabase.from('product_media').insert({
          product_id: productId,
          url: finalUrl,
          position: i
        });
      }

      setIsSaved(true);
      alert(
        isAlreadyApproved 
          ? "Modifications et photos enregistrées avec succès ! Votre article est à jour sur Kalagban. 🎉" 
          : "Produit mis à jour et soumis à l'équipe de modération ! 🎉"
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
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10">
      
      {/* Moderation Status Banner */}
      {!isAlreadyApproved && (
        <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
            <ShieldCheck size={22} />
          </div>
          <div className="flex-1 text-sm text-amber-900">
            <span className="font-bold">Article en attente de modération :</span> Vos modifications seront examinées par l&apos;équipe Kalagban avant d&apos;être visibles par les clients.
          </div>
        </div>
      )}

      {/* Header Page */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          <Link 
            href="/products" 
            className="w-10 h-10 rounded-xl bg-surface border border-gray-200 flex items-center justify-center text-gray-500 hover:text-primary hover:border-primary/50 transition-colors shadow-sm"
          >
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-text-main">Modifier l&apos;article</h1>
            <p className="text-sm text-text-muted">Mettez à jour les informations, tarifs et photos de votre produit.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleUpdate}
            disabled={isSaving}
            className="bg-primary text-white font-bold px-6 py-2.5 rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 transform hover:-translate-y-0.5 transition-all flex items-center gap-2 disabled:opacity-70 disabled:hover:translate-y-0"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            ) : isSaved ? (
              <CheckCircle size={20} />
            ) : (
              <Save size={20} />
            )}
            {isSaving ? "Enregistrement..." : "Enregistrer les modifications"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Main Column */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          
          {/* Informations Générales */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-6">Informations générales</h2>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Titre du produit *</label>
                <input 
                  type="text" 
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Description</label>
                <textarea 
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Photos Multiples & Studio IA */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-text-main">Photos du Produit</h2>
                <p className="text-xs text-text-muted">Gérez jusqu&apos;à 5 photos. La première photo est la photo principale affichée sur le catalogue.</p>
              </div>
              <span className="text-xs font-bold px-3 py-1 bg-primary/10 text-primary rounded-full">
                {images.length}/5 Photos
              </span>
            </div>

            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={handleFileChange} 
              accept="image/*" 
              multiple
              className="hidden" 
            />

            {/* Thumbnails Gallery Bar */}
            <div className="grid grid-cols-5 gap-3 mb-6">
              {[0, 1, 2, 3, 4].map((slotIdx) => {
                const img = images[slotIdx];
                const isSelected = selectedImageIndex === slotIdx && Boolean(img);

                if (img) {
                  return (
                    <div 
                      key={img.id}
                      onClick={() => setSelectedImageIndex(slotIdx)}
                      className={`relative aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all group ${
                        isSelected 
                          ? 'border-primary ring-2 ring-primary/30 shadow-md scale-102' 
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <img 
                        src={img.previewUrl} 
                        alt={`Photo ${slotIdx + 1}`} 
                        className="w-full h-full object-cover" 
                      />

                      {slotIdx === 0 && (
                        <span className="absolute top-1 left-1 bg-primary text-white text-[10px] font-black px-1.5 py-0.5 rounded shadow flex items-center gap-0.5">
                          <Star size={10} className="fill-white" /> Principale
                        </span>
                      )}

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveImage(slotIdx);
                        }}
                        title="Supprimer cette photo"
                        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-danger text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:scale-110"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  );
                }

                return (
                  <div
                    key={slotIdx}
                    onClick={handleUploadClick}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-200 hover:border-primary/50 hover:bg-primary/5 transition-all flex flex-col items-center justify-center gap-1 cursor-pointer text-gray-400 hover:text-primary group"
                  >
                    <Plus size={20} className="group-hover:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold">
                      {slotIdx === 0 ? "Couverture" : `Photo ${slotIdx + 1}`}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Studio Canvas */}
            {currentImage ? (
              <div className="flex flex-col gap-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold text-gray-800">
                    Aperçu : {selectedImageIndex === 0 ? "Photo Principale ⭐" : `Photo ${selectedImageIndex + 1}`}
                  </span>
                  <button 
                    onClick={() => handleRemoveImage(selectedImageIndex)} 
                    className="text-xs font-bold text-danger hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Supprimer cette photo
                  </button>
                </div>

                <div 
                  className="w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner border border-gray-100 transition-colors duration-500"
                  style={{ backgroundColor: currentImage.bgColor !== "transparent" ? currentImage.bgColor : "#f8fafc" }}
                >
                  {currentImage.bgColor === "transparent" && currentImage.hasBgRemoved && (
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-conic-gradient(#000 0% 25%, transparent 0% 50%)', backgroundSize: '20px 20px' }}></div>
                  )}

                  {isRemovingBg && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-bold text-primary animate-pulse">Détourage par IA en cours...</p>
                    </div>
                  )}
                  
                  <img 
                    src={currentImage.previewUrl} 
                    alt="Produit" 
                    className={`w-full h-full object-contain relative z-0 transition-all duration-700 ${currentImage.hasBgRemoved ? "scale-90" : "scale-100"}`} 
                  />
                  
                  {currentImage.hasBgRemoved && (
                    <div className="absolute top-4 right-4 bg-success text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 z-20 animate-fade-in">
                      <CheckCircle size={14} /> Fond détouré par IA
                    </div>
                  )}
                </div>

                {/* Toolbar */}
                <div className="bg-bg-app rounded-2xl p-5 flex flex-col sm:flex-row gap-6 justify-between items-center border border-gray-100">
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <span className="text-sm font-bold text-gray-700">Studio Magique (IA)</span>
                    <button 
                      onClick={handleRemoveBg}
                      disabled={currentImage.hasBgRemoved || isRemovingBg}
                      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        currentImage.hasBgRemoved 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                          : "bg-linear-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:scale-105"
                      }`}
                    >
                      <Wand2 size={18} />
                      {currentImage.hasBgRemoved ? "Fond détouré avec succès" : "Détourer le fond (IA)"}
                    </button>
                  </div>

                  <div className="hidden sm:block w-px h-12 bg-gray-200"></div>

                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <span className="text-sm font-bold text-gray-700">Arrière-plan Studio</span>
                    <div className={`flex gap-3 flex-wrap ${!currentImage.hasBgRemoved ? 'opacity-40 grayscale pointer-events-none' : 'transition-opacity duration-300'}`}>
                      {bgColors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => handleSetBgColor(color.value)}
                          title={color.name}
                          className={`w-10 h-10 rounded-full border transition-transform hover:scale-110 shadow-sm flex items-center justify-center ${color.border} ${currentImage.bgColor === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                          style={{ 
                            backgroundColor: color.value !== "transparent" ? color.value : "#f8fafc", 
                            backgroundImage: color.value === "transparent" ? 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)' : 'none', 
                            backgroundSize: '10px 10px' 
                          }}
                        >
                          {currentImage.bgColor === color.value && <CheckCircle size={16} className={color.value === '#ffffff' || color.value === 'transparent' ? 'text-primary' : 'text-black/50'} />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div 
                onClick={handleUploadClick}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-8 flex flex-col items-center justify-center gap-3 hover:bg-bg-app hover:border-primary/50 transition-all cursor-pointer group"
              >
                <div className="w-14 h-14 bg-white rounded-full shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <UploadCloud size={28} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-text-main">Cliquez pour importer des photos</p>
                  <p className="text-xs text-text-muted mt-1">Sélectionnez jusqu&apos;à 5 photos (PNG, JPG, max 5Mo)</p>
                </div>
              </div>
            )}
          </div>

          {/* Tarification */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-6">Tarification</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Prix de vente (FCFA) *</label>
                <input 
                  type="number" 
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Prix avant réduction</label>
                <input 
                  type="number" 
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6">
          
          {/* Organisation */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-text-main mb-4">Organisation</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Catégorie</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label}
                    </option>
                  ))}
                  <option value="autre">Autre (préciser)</option>
                </select>
              </div>

              {category === "autre" && (
                <div className="flex flex-col gap-2 animate-fade-in">
                  <label className="text-sm font-bold text-gray-700">Précisez la catégorie</label>
                  <input 
                    type="text" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              )}
            </div>
          </div>

          {/* Inventaire */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-lg font-bold text-text-main mb-4">Inventaire</h2>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Quantité en stock</label>
                <input 
                  type="number" 
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">SKU (Code de référence)</label>
                <input 
                  type="text" 
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
