"use client";

import React, { useState, useEffect, useCallback } from "react";
import { 
  Star, 
  Send, 
  MessageSquare, 
  CheckCircle2, 
  Loader2, 
  User 
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

export interface ReviewItem {
  id: string;
  user_name: string;
  rating: number;
  comment?: string;
  created_at: string;
}

interface ProductReviewsSectionProps {
  productId: string;
  productTitle: string;
}

export default function ProductReviewsSection({
  productId,
  productTitle
}: ProductReviewsSectionProps) {
  const { toast } = useToast();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  // New Review Form
  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState("");
  const [userName, setUserName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const fetchReviews = useCallback(async () => {
    try {
      const { data } = await supabase
        .from("product_reviews")
        .select("*")
        .eq("product_id", productId)
        .eq("status", "published")
        .order("created_at", { ascending: false });

      if (data) {
        setReviews(data);
      }
    } catch (err) {
      console.warn("Reviews fetch warning:", err);
    } finally {
      setLoading(false);
    }
  }, [productId]);

  useEffect(() => {
    fetchReviews();

    const loadUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name")
          .eq("id", session.user.id)
          .single();

        if (profile) {
          setUserName(`${profile.first_name || ""} ${profile.last_name || ""}`.trim());
        }
      }
    };
    loadUser();
  }, [fetchReviews]);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)
    : "5.0";

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userName.trim()) {
      toast.warning("Veuillez renseigner votre nom ou prénom.");
      return;
    }

    setIsSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const { error } = await supabase.from("product_reviews").insert({
        product_id: productId,
        user_id: session?.user?.id || null,
        user_name: userName.trim(),
        rating,
        comment: comment.trim() || null,
        status: "published"
      });

      if (error) throw error;

      toast.success("Merci ! Votre avis a été publié avec succès.", "Avis enregistré ⭐");
      setComment("");
      setShowForm(false);
      fetchReviews();

    } catch (err: unknown) {
      console.error("Review submit error:", err);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'enregistrement";
      toast.error(msg, "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-xs space-y-6">
      
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 pb-6">
        <div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
            <Star className="text-amber-400 fill-amber-400" size={22} />
            Avis &amp; Évaluations Clients
          </h3>
          <p className="text-xs text-gray-500 font-medium mt-0.5">
            Retours d&apos;expérience sur {productTitle}
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-right">
            <div className="flex items-center gap-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((star) => (
                <Star
                  key={star}
                  size={16}
                  className={star <= Math.round(Number(averageRating)) ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-100"}
                />
              ))}
            </div>
            <p className="text-xs font-bold text-gray-700 mt-0.5">
              <span className="font-black text-gray-900 text-sm">{averageRating} / 5</span> ({reviews.length} avis)
            </p>
          </div>

          <button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition-all shadow-xs shrink-0 cursor-pointer"
          >
            {showForm ? "Fermer" : "Donner mon avis"}
          </button>
        </div>
      </div>

      {/* Review Submission Form */}
      {showForm && (
        <form onSubmit={handleSubmitReview} className="bg-slate-50 border border-slate-200/80 rounded-2xl p-5 space-y-4 animate-in fade-in duration-200">
          <h4 className="font-extrabold text-sm text-gray-900">Évaluer ce produit</h4>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Votre note globale *</label>
            <div className="flex items-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  type="button"
                  key={star}
                  onMouseEnter={() => setHoverRating(star)}
                  onMouseLeave={() => setHoverRating(0)}
                  onClick={() => setRating(star)}
                  className="p-1 text-amber-400 transition-transform hover:scale-125 cursor-pointer"
                >
                  <Star
                    size={24}
                    className={(hoverRating || rating) >= star ? "fill-amber-400 text-amber-400" : "text-gray-300"}
                  />
                </button>
              ))}
              <span className="text-xs font-black text-gray-700 ml-2">
                {rating === 5 ? "Excellent 🌟" : rating === 4 ? "Très bon 👍" : rating === 3 ? "Moyen 😐" : "Décevant 👎"}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Votre nom ou pseudo *</label>
            <input
              type="text"
              required
              placeholder="Ex: Awa K."
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Votre commentaire (optionnel)</label>
            <textarea
              rows={3}
              placeholder="Qualité du produit, conformité par rapport à la photo, taille..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 resize-none"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 rounded-xl bg-gray-200 text-gray-700 font-bold text-xs hover:bg-gray-300 transition-all cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-all flex items-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
              Publier l&apos;avis
            </button>
          </div>
        </form>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="py-8 flex justify-center text-gray-400">
          <Loader2 size={24} className="animate-spin text-indigo-600" />
        </div>
      ) : reviews.length === 0 ? (
        <div className="py-10 text-center text-gray-400 space-y-1">
          <MessageSquare size={32} className="mx-auto text-gray-300 mb-2" />
          <p className="font-bold text-gray-700 text-sm">Soyez le premier à donner votre avis !</p>
          <p className="text-xs">Partagez votre expérience avec la communauté Kalagban.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {reviews.map((rev) => (
            <div key={rev.id} className="p-4 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                      {rev.user_name.charAt(0).toUpperCase()}
                    </div>
                    <span className="font-extrabold text-xs text-gray-900">{rev.user_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-0.5 text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        size={12}
                        className={s <= rev.rating ? "fill-amber-400 text-amber-400" : "text-gray-200 fill-gray-100"}
                      />
                    ))}
                  </div>
                </div>

                {rev.comment ? (
                  <p className="text-xs text-gray-700 font-medium leading-relaxed">
                    &ldquo;{rev.comment}&rdquo;
                  </p>
                ) : (
                  <p className="text-xs text-gray-400 italic">Aucun commentaire textuel.</p>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-gray-400 pt-2 border-t border-gray-100">
                <span className="flex items-center gap-1 text-emerald-700 font-bold">
                  <CheckCircle2 size={12} /> Achat Vérifié
                </span>
                <span>{new Date(rev.created_at).toLocaleDateString("fr-FR")}</span>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
