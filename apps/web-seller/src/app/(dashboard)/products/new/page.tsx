"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { ArrowLeft, UploadCloud, Save, CheckCircle, Wand2, ShieldCheck, Clock, ArrowRight } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { PRODUCT_CATEGORIES } from "@/lib/categories";

export default function NewProductPage() {
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form states
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [oldPrice, setOldPrice] = useState("");
  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [stock, setStock] = useState("0");
  const [sku, setSku] = useState("");
  
  // États pour l'éditeur magique
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

  const [submittedModal, setSubmittedModal] = useState(false);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !price) {
      alert("Veuillez remplir le titre et le prix du produit.");
      return;
    }
    
    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert("Vous n'êtes pas authentifié. Veuillez vous connecter ou créer une boutique d'abord.");
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
          category: category === "autre" ? (customCategory.trim() || "Autre") : category,
          stock_quantity: parseInt(stock) || 0,
          sku,
          status: 'pending',
          moderation_status: 'pending_review',
        })
        .select('id')
        .single();

      if (prodError || !newProd) throw prodError;

      // 2. Televersement de l'image et insertion dans product_media
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop() || 'jpg';
        const fileName = `prod_${newProd.id}_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('kalagban_media')
          .upload(fileName, imageFile);

        if (!uploadError) {
          const { data: publicUrlData } = supabase.storage
            .from('kalagban_media')
            .getPublicUrl(fileName);

          await supabase.from('product_media').insert({
            product_id: newProd.id,
            url: publicUrlData.publicUrl,
            position: 0
          });
        } else {
          console.error("Erreur d'upload image produit:", uploadError);
        }
      }

      setIsSaved(true);
      setSubmittedModal(true);
    } catch (err) {
      const error = err as Error;
      alert("Erreur lors de la soumission : " + error.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setImageFile(file);
      const url = URL.createObjectURL(file);
      setUploadedImage(url);
      setHasBgRemoved(false);
      setSelectedBgColor("transparent");
    }
  };

  const handleRemoveBg = async () => {
    if (!uploadedImage) return;
    setIsRemovingBg(true);
    try {
      const mod = await import("@imgly/background-removal");
      const imglyRemoveBackground = (mod.default || mod.removeBackground || mod) as unknown as (image: string) => Promise<Blob>;
      const blob = await imglyRemoveBackground(uploadedImage);
      
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
            0.8 // Qualité à 80% (excellent compromis poids/qualité)
          );
        };
        img.onerror = () => reject(new Error("Erreur de chargement pour la conversion WebP"));
        img.src = URL.createObjectURL(blob);
      });

      const url = URL.createObjectURL(webpBlob);
      setImageFile(new File([webpBlob], "product_bg_removed.webp", { type: "image/webp" }));
      setUploadedImage(url);
      setHasBgRemoved(true);
      setSelectedBgColor("#ffffff"); // Par défaut on met fond blanc après détourage
    } catch (error) {
      console.error("Erreur de détourage IA ou conversion:", error);
      alert("Erreur lors du traitement de l'image.");
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

      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link href="/products" className="p-2 border border-gray-200 rounded-xl text-text-muted hover:bg-white hover:text-text-main transition-colors bg-surface">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <h1 className="text-3xl font-black text-text-main tracking-tight">Ajouter un produit</h1>
            <p className="text-text-muted mt-1">Soumettez votre article à l&apos;équipe de modération pour publication.</p>
          </div>
        </div>
        
        <div className="flex gap-3">
          <Link href="/products" className="px-5 py-2.5 rounded-xl font-bold border border-gray-200 text-text-main hover:bg-white transition-colors bg-surface flex items-center">
            Annuler
          </Link>
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
                  placeholder="Ex: T-shirt en coton bio" 
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Description</label>
                <textarea 
                  rows={5}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Décrivez votre produit en détail..." 
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all resize-none custom-scrollbar"
                ></textarea>
              </div>
            </div>
          </div>

          {/* Médias avec Éditeur Magique */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text-main">Médias</h2>
              {uploadedImage && (
                <button onClick={() => setUploadedImage(null)} className="text-sm font-bold text-danger hover:underline">
                  Retirer l&apos;image
                </button>
              )}
            </div>
            
            {!uploadedImage ? (
              <div 
                onClick={handleUploadClick}
                className="border-2 border-dashed border-gray-200 rounded-2xl p-10 flex flex-col items-center justify-center gap-4 hover:bg-bg-app hover:border-primary/50 transition-all cursor-pointer group"
              >
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileChange} 
                  accept="image/*" 
                  className="hidden" 
                />
                <div className="w-16 h-16 bg-white rounded-full shadow-sm flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <UploadCloud size={32} />
                </div>
                <div className="text-center">
                  <p className="font-bold text-text-main">Cliquez pour ajouter des images</p>
                  <p className="text-sm text-text-muted mt-1">ou glissez-déposez vos fichiers ici (PNG, JPG, max 5Mo)</p>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-6">
                {/* Aperçu de l'image (Canvas simulé) */}
                <div 
                  className="w-full max-w-sm mx-auto aspect-square rounded-2xl overflow-hidden relative flex items-center justify-center shadow-inner border border-gray-100 transition-colors duration-500"
                  style={{ backgroundColor: selectedBgColor !== "transparent" ? selectedBgColor : "#f8fafc" }}
                >
                  {/* Effet damier pour le transparent */}
                  {selectedBgColor === "transparent" && hasBgRemoved && (
                    <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'repeating-conic-gradient(#000 0% 25%, transparent 0% 50%)', backgroundSize: '20px 20px' }}></div>
                  )}

                  {isRemovingBg && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-3">
                      <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
                      <p className="font-bold text-primary animate-pulse">Détourage par IA en cours...</p>
                    </div>
                  )}
                  
                  {/* Vrai détourage IA, plus besoin du hack mix-blend-multiply ! */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img 
                    src={uploadedImage} 
                    alt="Produit" 
                    className={`w-full h-full object-contain relative z-0 transition-all duration-700 ${hasBgRemoved ? "scale-90" : "scale-100"}`} 
                  />
                  
                  {hasBgRemoved && (
                    <div className="absolute top-4 right-4 bg-success text-white px-3 py-1 rounded-full text-xs font-bold shadow-md flex items-center gap-1 z-20 animate-fade-in">
                      <CheckCircle size={14} /> Fond supprimé
                    </div>
                  )}
                </div>

                {/* Barre d'outils d'édition */}
                <div className="bg-bg-app rounded-2xl p-5 flex flex-col sm:flex-row gap-6 justify-between items-center border border-gray-100">
                  
                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <span className="text-sm font-bold text-gray-700">Outil Magique (IA)</span>
                    <button 
                      onClick={handleRemoveBg}
                      disabled={hasBgRemoved || isRemovingBg}
                      className={`flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold transition-all ${
                        hasBgRemoved 
                          ? "bg-gray-100 text-gray-400 cursor-not-allowed" 
                          : "bg-linear-to-r from-purple-500 to-indigo-500 text-white shadow-lg shadow-purple-500/30 hover:scale-105"
                      }`}
                    >
                      <Wand2 size={18} />
                      {hasBgRemoved ? "Détourage terminé" : "Supprimer le fond"}
                    </button>
                  </div>

                  <div className="hidden sm:block w-px h-12 bg-gray-200"></div>

                  <div className="flex flex-col gap-3 w-full sm:w-auto">
                    <span className="text-sm font-bold text-gray-700">Couleur d&apos;arrière-plan</span>
                    <div className={`flex gap-3 flex-wrap ${!hasBgRemoved ? 'opacity-40 grayscale pointer-events-none' : 'transition-opacity duration-300'}`}>
                      {bgColors.map(color => (
                        <button
                          key={color.name}
                          onClick={() => setSelectedBgColor(color.value)}
                          title={color.name}
                          className={`w-10 h-10 rounded-full border transition-transform hover:scale-110 shadow-sm flex items-center justify-center ${color.border} ${selectedBgColor === color.value ? 'ring-2 ring-primary ring-offset-2' : ''}`}
                          style={{ 
                            backgroundColor: color.value !== "transparent" ? color.value : "#f8fafc", 
                            backgroundImage: color.value === "transparent" ? 'repeating-conic-gradient(#e5e7eb 0% 25%, white 0% 50%)' : 'none', 
                            backgroundSize: '10px 10px' 
                          }}
                        >
                          {selectedBgColor === color.value && <CheckCircle size={16} className={color.value === '#ffffff' || color.value === 'transparent' ? 'text-primary' : 'text-black/50'} />}
                        </button>
                      ))}
                    </div>
                  </div>

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

          {/* Variantes (Tailles, Couleurs) */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-text-main">Variantes (Options)</h2>
              <button className="text-sm font-bold text-primary hover:underline">
                + Ajouter une option
              </button>
            </div>
            
            <div className="flex flex-col gap-5 border border-gray-100 rounded-xl p-4 bg-bg-app">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                  <label className="text-sm font-bold text-gray-700">Nom de l&apos;option</label>
                  <input 
                    type="text" 
                    defaultValue="Taille"
                    className="w-32 bg-white border border-gray-200 text-gray-900 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium"
                  />
                </div>
                <button className="text-danger hover:text-danger/70 text-sm font-bold">Retirer</button>
              </div>
              
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Valeurs de l&apos;option</label>
                <input 
                  type="text" 
                  placeholder="Ex: S, M, L, XL (séparées par des virgules)" 
                  className="w-full bg-white border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
            
            <p className="text-xs text-text-muted mt-4">
              Ajoutez des variantes si ce produit possède plusieurs options, comme des tailles ou des couleurs différentes.
            </p>
          </div>

        </div>

        {/* Sidebar Column */}
        <div className="flex flex-col gap-6">
          
          {/* Statut */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-4">Statut</h2>
            <select className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-bold">
              <option value="active">Actif</option>
              <option value="draft">Brouillon</option>
            </select>
          </div>

          {/* Organisation */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-4">Organisation</h2>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Catégorie</label>
                <select 
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all font-medium"
                >
                  <option value="">Sélectionner une catégorie...</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
                {category === "autre" && (
                  <input 
                    type="text" 
                    value={customCategory}
                    onChange={(e) => setCustomCategory(e.target.value)}
                    placeholder="Préciser la catégorie..." 
                    className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all mt-2"
                  />
                )}
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Tags</label>
                <input 
                  type="text" 
                  placeholder="Séparés par une virgule" 
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

          {/* Inventaire */}
          <div className="bg-surface rounded-card p-6 shadow-sm border border-gray-100">
            <h2 className="text-xl font-bold text-text-main mb-4">Inventaire</h2>
            <div className="flex flex-col gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">SKU (Référence)</label>
                <input 
                  type="text" 
                  value={sku}
                  onChange={(e) => setSku(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all uppercase"
                />
              </div>
              <div className="flex flex-col gap-2">
                <label className="text-sm font-bold text-gray-700">Quantité en stock</label>
                <input 
                  type="number" 
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  className="w-full bg-bg-app border border-gray-200 text-gray-900 rounded-xl py-3 px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary transition-all"
                />
              </div>
            </div>
          </div>

        </div>

      </div>

      {/* Confirmation Modal: Produit soumis avec succès */}
      {submittedModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl border border-gray-100 flex flex-col items-center text-center animate-scale-up">
            <div className="w-20 h-20 bg-amber-50 rounded-full flex items-center justify-center mb-6 text-amber-500 ring-8 ring-amber-50/50">
              <Clock size={40} className="animate-pulse" />
            </div>
            
            <h3 className="text-2xl font-black text-gray-900 mb-2">
              Produit Soumis pour Validation ! 🎉
            </h3>
            
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              Votre article <span className="font-bold text-gray-800">« {title || "Sans titre"} »</span> a été transmis avec succès à l&apos;équipe de modération de Kalagban. Il sera examiné avant d&apos;apparaître en ligne.
            </p>

            <div className="w-full bg-gray-50 border border-gray-100 rounded-2xl p-4 mb-6 text-left flex items-start gap-3">
              <ShieldCheck size={20} className="text-primary shrink-0 mt-0.5" />
              <div className="text-xs text-gray-600">
                <span className="font-bold text-gray-800">Délai estimé :</span> Validation rapide (habituellement sous 1h à 24h). Vous recevrez une notification instantanée.
              </div>
            </div>

            <div className="flex gap-3 w-full">
              <button
                onClick={() => {
                  setSubmittedModal(false);
                  setTitle(""); setPrice(""); setOldPrice(""); setUploadedImage(null); setImageFile(null);
                }}
                className="flex-1 py-3 px-4 rounded-xl border border-gray-200 text-gray-700 font-bold hover:bg-gray-50 text-sm transition-all"
              >
                Ajouter un autre
              </button>
              <Link
                href="/products"
                className="flex-1 py-3 px-4 rounded-xl bg-primary text-white font-bold hover:bg-indigo-600 text-sm transition-all flex items-center justify-center gap-1.5 shadow-lg shadow-primary/20"
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
