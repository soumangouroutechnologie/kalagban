"use client";

/* eslint-disable @next/next/no-img-element */
import React, { useState, useRef } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  UploadCloud, 
  Save, 
  CheckCircle, 
  Wand2, 
  ShieldCheck, 
  Clock, 
  ArrowRight,
  Plus,
  Trash2,
  Star
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

interface ProductImage {
  id: string;
  file: File;
  previewUrl: string;
  hasBgRemoved?: boolean;
  bgColor?: string;
}

export default function NewProductPage() {
  const { toast } = useToast();
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [targetGenders, setTargetGenders] = useState<string[]>(["femme"]);
  const [stock, setStock] = useState("0");
  const [sku, setSku] = useState("");

  const toggleGender = (g: string) => {
    if (g === "unisexe") {
      setTargetGenders((prev) => {
        const isUnisex = prev.includes("unisexe") || (prev.includes("homme") && prev.includes("femme"));
        if (isUnisex) {
          return prev.filter((item) => item !== "unisexe" && item !== "homme");
        } else {
          return Array.from(new Set([...prev, "homme", "femme", "unisexe"]));
        }
      });
      return;
    }

    setTargetGenders((prev) => {
      let updated = prev.includes(g) ? prev.filter((item) => item !== g) : [...prev, g];
      if (updated.includes("homme") && updated.includes("femme")) {
        if (!updated.includes("unisexe")) updated.push("unisexe");
      } else {
        updated = updated.filter((item) => item !== "unisexe");
      }
      return updated.length > 0 ? updated : [g];
    });
  };

  const buildCategoryString = (selectedCat: string, customCat: string, genders: string[]) => {
    if (selectedCat === "autre") {
      const base = customCat.trim() || "Autre";
      return `${base},${genders.join(",")}`;
    }

    const tokens = new Set<string>();
    if (selectedCat) tokens.add(selectedCat);

    let coreType = selectedCat;
    if (selectedCat.startsWith("vetements")) coreType = "vetements";
    else if (selectedCat.startsWith("chaussures")) coreType = "chaussures";
    else if (selectedCat.startsWith("accessoires")) coreType = "accessoires";
    else if (selectedCat.startsWith("beaute-et-soins")) coreType = "beaute-et-soins";

    if (genders.includes("homme")) {
      tokens.add("homme");
      if (coreType === "vetements") tokens.add("vetements-hommes");
      if (coreType === "chaussures") tokens.add("chaussures-hommes");
      if (coreType === "accessoires") tokens.add("accessoires-hommes");
      if (coreType === "beaute-et-soins") tokens.add("beaute-et-soins-hommes");
    }

    if (genders.includes("femme")) {
      tokens.add("femme");
      if (coreType === "vetements") tokens.add("vetements-femmes");
      if (coreType === "chaussures") tokens.add("chaussures-femmes");
      if (coreType === "accessoires") tokens.add("accessoires-femmes");
      if (coreType === "beaute-et-soins") tokens.add("beaute-et-soins-femmes");
    }

    if (genders.includes("enfants")) {
      tokens.add("enfants");
      if (coreType === "vetements") tokens.add("vetements-enfants");
      if (coreType === "chaussures") tokens.add("chaussures-enfants");
      if (coreType === "accessoires") tokens.add("accessoires-enfants");
      if (coreType === "beaute-et-soins") tokens.add("beaute-et-soins-enfants");
    }

    if (genders.includes("unisexe") || (genders.includes("homme") && genders.includes("femme"))) {
      tokens.add("unisexe");
      tokens.add("mixte");
    }

    return Array.from(tokens).join(",");
  };
  
  // États Multi-Images & Studio IA
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

  const [submittedModal, setSubmittedModal] = useState(false);

  const currentImage = images[selectedImageIndex] || null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) {
      toast.warning("Veuillez remplir le titre et le prix du produit.");
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        toast.error("Vous n'êtes pas authentifié. Veuillez vous connecter ou créer une boutique d'abord.");
        return;
      }

      // 1. Insertion du produit dans la base de données en attente de modération
      const { data: newProd, error: prodError } = await supabase
        .from('products')
        .insert({
          shop_id: session.user.id,
          title,
          description,
          price: parseFloat(price) || 0,
          old_price: oldPrice ? parseFloat(oldPrice) : null,
          category: buildCategoryString(category, customCategory, targetGenders),
          stock_quantity: parseInt(stock) || 0,
          sku,
          status: 'pending',
          moderation_status: 'pending_review',
        })
        .select('id')
        .single();

      if (prodError || !newProd) throw prodError;

      // 2. Upload de toutes les images vers Supabase Storage et insertion dans product_media
      for (let i = 0; i < images.length; i++) {
        const imgItem = images[i];
        if (imgItem.file) {
          const fileExt = imgItem.file.name.split('.').pop() || 'webp';
          const fileName = `prod_${newProd.id}_${i}_${Date.now()}.${fileExt}`;
          
          const { error: uploadError } = await supabase.storage
            .from('kalagban_media')
            .upload(fileName, imgItem.file);

          if (!uploadError) {
            const { data: publicUrlData } = supabase.storage
              .from('kalagban_media')
              .getPublicUrl(fileName);

            await supabase.from('product_media').insert({
              product_id: newProd.id,
              url: publicUrlData.publicUrl,
              position: i
            });
          } else {
            console.error("Erreur d'upload image", i, uploadError);
          }
        }
      }

      setIsSaved(true);
      toast.success("Produit soumis avec succès !");
      setSubmittedModal(true);
    } catch (err) {
      const error = err as Error;
      toast.error("Erreur lors de la soumission : " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

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
    // Reset file input
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
      
      // Conversion en WebP pour la légèreté et la fluidité
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
            ? { ...img, file: newFile, previewUrl: url, hasBgRemoved: true, bgColor: "#ffffff" }
            : img
        )
      );
    } catch (error) {
      console.error("Erreur de détourage IA ou conversion:", error);
      toast.error("Erreur lors du traitement de l'image.");
    } finally {
      setIsRemovingBg(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-5xl mx-auto pb-10">
      
      {/* Moderation Process Notice Banner */}
      <div className="bg-linear-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600 shrink-0">
          <ShieldCheck size={22} />
        </div>
        <div className="flex-1 text-sm text-amber-900">
          <span className="font-bold">Processus de modération Kalagban :</span> Tout nouvel article soumis est examiné par l&apos;équipe de modération avant sa mise en ligne publique afin de garantir la qualité du catalogue.
        </div>
      </div>

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
            <h1 className="text-2xl font-black text-text-main">Ajouter un nouveau produit</h1>
            <p className="text-sm text-text-muted">Remplissez les détails ci-dessous pour soumettre votre article.</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button 
            onClick={handleSave}
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
            {isSaving ? "Soumission en cours..." : isSaved ? "Soumis pour validation !" : "Soumettre pour validation"}
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
                  placeholder="Ex: Polo noir en coton bio" 
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Description</label>
                <textarea 
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre produit en détail (matière, coupe, conseils d'entretien...)..." 
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Galerie Multi-Médias avec Éditeur Magique IA */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-text-main">Photos du Produit</h2>
                <p className="text-xs text-text-muted">Ajoutez jusqu&apos;à 5 photos (Face, Dos, Zoom matière, Porté...). La 1ère photo sera la photo de couverture.</p>
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
            
            {/* Main Interactive Studio Canvas */}
            {currentImage ? (
              <div className="flex flex-col gap-5 pt-4 border-t border-gray-100">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-gray-800">
                      Édition : {selectedImageIndex === 0 ? "Photo Principale (Couverture) ⭐" : `Photo ${selectedImageIndex + 1}`}
                    </span>
                  </div>
                  <button 
                    onClick={() => handleRemoveImage(selectedImageIndex)} 
                    className="text-xs font-bold text-danger hover:underline flex items-center gap-1"
                  >
                    <Trash2 size={14} /> Supprimer cette photo
                  </button>
                </div>

                {/* Aperçu de l'image (Canvas Studio) */}
                <div 
                  className="w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner border border-gray-100 transition-colors duration-500"
                  style={{ backgroundColor: currentImage.bgColor !== "transparent" ? currentImage.bgColor : "#f8fafc" }}
                >
                  {/* Effet damier pour le transparent */}
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

                {/* Barre d'outils d'édition Studio */}
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
                  <p className="text-xs text-text-muted mt-1">Sélectionnez jusqu&apos;à 5 photos en une seule fois (PNG, JPG, max 5Mo)</p>
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
                  placeholder="0.00" 
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Prix avant réduction</label>
                <input 
                  type="number" 
                  value={oldPrice}
                  onChange={(e) => setOldPrice(e.target.value)}
                  placeholder="0.00" 
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
                    placeholder="Ex: Chaussures de sport" 
                    className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                  />
                </div>
              )}

              {/* Public & Genres Cibles */}
              <div className="flex flex-col gap-2 pt-2 border-t border-gray-100">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-bold text-gray-700">Public &amp; Genre Cible</label>
                  {targetGenders.includes("homme") && targetGenders.includes("femme") && (
                    <span className="text-[11px] font-black bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full">
                      ✨ Visible Homme &amp; Femme
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 font-medium">
                  Cochez les différents genres pouvant utiliser cet article :
                </p>

                <div className="grid grid-cols-2 gap-2 mt-1">
                  {/* Homme */}
                  <button
                    type="button"
                    onClick={() => toggleGender("homme")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                      targetGenders.includes("homme")
                        ? "bg-indigo-50/80 border-indigo-500 text-indigo-900 shadow-xs"
                        : "bg-bg-app border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={targetGenders.includes("homme")}
                      onChange={() => {}}
                      className="rounded text-primary focus:ring-primary h-4 w-4 pointer-events-none"
                    />
                    <span>👨 Homme</span>
                  </button>

                  {/* Femme */}
                  <button
                    type="button"
                    onClick={() => toggleGender("femme")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                      targetGenders.includes("femme")
                        ? "bg-pink-50/80 border-pink-500 text-pink-900 shadow-xs"
                        : "bg-bg-app border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={targetGenders.includes("femme")}
                      onChange={() => {}}
                      className="rounded text-pink-600 focus:ring-pink-500 h-4 w-4 pointer-events-none"
                    />
                    <span>👩 Femme</span>
                  </button>

                  {/* Unisexe / Mixte */}
                  <button
                    type="button"
                    onClick={() => toggleGender("unisexe")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                      targetGenders.includes("unisexe") || (targetGenders.includes("homme") && targetGenders.includes("femme"))
                        ? "bg-purple-50/80 border-purple-500 text-purple-900 shadow-xs"
                        : "bg-bg-app border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={targetGenders.includes("unisexe") || (targetGenders.includes("homme") && targetGenders.includes("femme"))}
                      onChange={() => {}}
                      className="rounded text-purple-600 focus:ring-purple-500 h-4 w-4 pointer-events-none"
                    />
                    <span>🔄 Unisexe / Mixte</span>
                  </button>

                  {/* Enfants */}
                  <button
                    type="button"
                    onClick={() => toggleGender("enfants")}
                    className={`flex items-center gap-2.5 p-2.5 rounded-xl border text-xs font-bold transition-all cursor-pointer text-left ${
                      targetGenders.includes("enfants")
                        ? "bg-amber-50/80 border-amber-500 text-amber-900 shadow-xs"
                        : "bg-bg-app border-gray-200 text-gray-600 hover:border-gray-300"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={targetGenders.includes("enfants")}
                      onChange={() => {}}
                      className="rounded text-amber-600 focus:ring-amber-500 h-4 w-4 pointer-events-none"
                    />
                    <span>🧒 Enfants</span>
                  </button>
                </div>
              </div>
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
                  placeholder="Ex: POLO-BLK-001" 
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Modal de Confirmation de Soumission en Modération */}
      {submittedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
          <div className="bg-surface rounded-3xl p-6 sm:p-8 max-w-md w-full border border-gray-100 shadow-2xl flex flex-col items-center text-center gap-5">
            
            <div className="w-16 h-16 rounded-full bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Clock size={36} />
            </div>

            <div className="flex flex-col gap-2">
              <h3 className="text-2xl font-black text-text-main">Produit soumis pour modération !</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Votre article <span className="font-bold text-text-main">« {title} »</span> a été enregistré et {images.length} photo(s) ont été téléversées.
                Il sera examiné très rapidement par l&apos;équipe Kalagban avant sa mise en ligne.
              </p>
            </div>

            <div className="w-full bg-bg-app rounded-2xl p-4 border border-gray-100 flex flex-col gap-2 text-left text-xs text-gray-600">
              <div className="flex items-center gap-2 font-bold text-gray-800">
                <ShieldCheck size={16} className="text-primary" /> Contrôle qualité en cours :
              </div>
              <p>• Conformité de la description et des photos</p>
              <p>• Respect des règles de tarification de la plateforme</p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full mt-2">
              <Link 
                href="/products" 
                className="flex-1 bg-primary text-white font-bold py-3 px-4 rounded-xl shadow-lg shadow-primary/30 hover:bg-indigo-600 transition-all flex items-center justify-center gap-2 text-sm"
              >
                Voir mes produits <ArrowRight size={16} />
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
