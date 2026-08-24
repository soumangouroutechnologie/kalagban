"use client";

import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { 
  Headphones, 
  X, 
  Send, 
  MessageSquare, 
  Loader2, 
  Plus, 
  ChevronRight, 
  FileText,
  PhoneCall,
  Store
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";

export interface SupportTicket {
  id: string;
  ticket_code: string;
  subject: string;
  category: string;
  priority: string;
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  order_code?: string;
  created_at: string;
}

export interface SupportMessage {
  id: string;
  sender_type: "admin" | "user";
  sender_name: string;
  message: string;
  created_at: string;
}

interface ContactSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultOrderCode?: string;
}

export default function ContactSupportModal({
  isOpen,
  onClose,
  defaultOrderCode = ""
}: ContactSupportModalProps) {
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<"new" | "history">("new");

  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Form State
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState("seller_orders");
  const [orderCode, setOrderCode] = useState(defaultOrderCode);
  const [message, setMessage] = useState("");
  const [shopName, setShopName] = useState("");
  const [sellerEmail, setSellerEmail] = useState("");
  const [sellerPhone, setSellerPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // History & Conversation State
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loadingTickets, setLoadingTickets] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  // Kalagban Official Logistics Support WhatsApp
  const kalagbanSupportPhone = "2250777620864";
  const whatsappUrl = `https://wa.me/${kalagbanSupportPhone}?text=${encodeURIComponent(
    `Bonjour Support Vendeurs Kalagban, je suis la boutique "${shopName || "Partenaire"}" concernant ${orderCode ? `la commande #${orderCode}` : "notre compte vendeur"}.`
  )}`;

  useEffect(() => {
    if (!isOpen) return;

    const loadShopInfo = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setSellerEmail(session.user.email || "");
        const { data: shop } = await supabase
          .from("shops")
          .select("name, payout_phone")
          .eq("id", session.user.id)
          .single();

        if (shop) {
          setShopName(shop.name || "Ma Boutique");
          setSellerPhone(shop.payout_phone || "");
        }
      }
    };

    loadShopInfo();
  }, [isOpen]);

  const fetchShopTickets = async () => {
    setLoadingTickets(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const query = supabase.from("support_tickets").select("*").order("created_at", { ascending: false });

      if (session?.user?.email) {
        query.eq("user_email", session.user.email);
      } else if (sellerPhone) {
        query.eq("user_phone", sellerPhone);
      }

      const { data } = await query;
      setTickets(data || []);
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoadingTickets(false);
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "history") {
      fetchShopTickets();
    }
  }, [isOpen, activeTab]);

  const handleOpenTicketConversation = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    try {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      setMessages(data || []);
    } catch (err) {
      console.error("Error fetching messages:", err);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      toast.warning("Veuillez renseigner le sujet et votre message.");
      return;
    }

    setIsSubmitting(true);
    try {
      const randomCode = `TK-VD-${Math.floor(100000 + Math.random() * 900000)}`;
      
      const { data: newTicket, error } = await supabase
        .from("support_tickets")
        .insert({
          ticket_code: randomCode,
          subject: subject.trim(),
          category,
          order_code: orderCode.trim() || null,
          user_type: "seller",
          user_name: shopName.trim() || "Boutique Partenaire",
          user_email: sellerEmail.trim() || null,
          user_phone: sellerPhone.trim() || null,
          status: "open",
          priority: "high"
        })
        .select()
        .single();

      if (error || !newTicket) throw error;

      await supabase.from("support_messages").insert({
        ticket_id: newTicket.id,
        sender_type: "user",
        sender_name: shopName.trim() || "Boutique",
        message: message.trim()
      });

      toast.success("Votre demande vendeur a été transmise à notre équipe.", "Ticket ouvert avec succès 🎫");
      setSubject("");
      setMessage("");
      setActiveTab("history");
      fetchShopTickets();

    } catch (err: unknown) {
      console.error("Ticket error:", err);
      const msg = err instanceof Error ? err.message : "Erreur lors de l'envoi";
      toast.error(msg, "Erreur");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyText.trim() || !selectedTicket) return;

    setSendingReply(true);
    try {
      const { error } = await supabase.from("support_messages").insert({
        ticket_id: selectedTicket.id,
        sender_type: "user",
        sender_name: shopName.trim() || "Boutique",
        message: replyText.trim()
      });

      if (error) throw error;

      await supabase.from("support_tickets").update({
        status: "open",
        updated_at: new Date().toISOString()
      }).eq("id", selectedTicket.id);

      setMessages((prev) => [
        ...prev,
        {
          id: `tmp_${Date.now()}`,
          sender_type: "user",
          sender_name: shopName.trim() || "Boutique",
          message: replyText.trim(),
          created_at: new Date().toISOString()
        }
      ]);

      setReplyText("");
      toast.success("Message transmis au Support Kalagban.");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Erreur réseau";
      toast.error(msg, "Erreur");
    } finally {
      setSendingReply(false);
    }
  };

  if (!isOpen || !mounted) return null;

  const modalContent = (
    <div className="fixed inset-0 z-9999 flex items-center justify-center p-3 sm:p-6 bg-black/65 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg sm:max-w-xl w-full max-h-[92vh] sm:max-h-[90vh] overflow-hidden shadow-2xl border border-gray-100 flex flex-col my-auto">
        
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold">
              <Store size={20} />
            </div>
            <div>
              <h3 className="text-base font-black">Support Partenaires Vendeurs</h3>
              <p className="text-xs text-gray-400 font-medium">Assistance logistique, conformité &amp; paiements</p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-gray-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex border-b border-gray-100 bg-gray-50/70 p-1.5 px-6 gap-2">
          <button
            onClick={() => { setActiveTab("new"); setSelectedTicket(null); }}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "new" 
                ? "bg-white text-indigo-600 shadow-xs border border-gray-200/80" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <Plus size={14} />
            Nouvelle Demande
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1.5 ${
              activeTab === "history" 
                ? "bg-white text-indigo-600 shadow-xs border border-gray-200/80" 
                : "text-gray-500 hover:text-gray-900"
            }`}
          >
            <MessageSquare size={14} />
            Mes Tickets ({tickets.length})
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar">
          {activeTab === "new" ? (
            <form onSubmit={handleCreateTicket} className="space-y-4">
              
              {/* WhatsApp Quick CTA */}
              <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-emerald-500 text-white flex items-center justify-center font-bold shrink-0">
                    <PhoneCall size={16} />
                  </div>
                  <div>
                    <p className="text-xs font-black text-emerald-950">Ligne directe Support Marchands</p>
                    <p className="text-[11px] text-emerald-800 font-medium">WhatsApp officiel Kalagban Logistique</p>
                  </div>
                </div>
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs py-2 px-3 rounded-xl transition-all shadow-xs shrink-0"
                >
                  WhatsApp
                </a>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Catégorie</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold text-gray-800 focus:outline-hidden focus:border-indigo-500"
                >
                  <option value="order">📦 Collecte de colis &amp; Préparation</option>
                  <option value="payment">💰 Demande de virement / Reversement</option>
                  <option value="account">🛡️ Dossier KYC &amp; Certification Boutique</option>
                  <option value="technical">⚙️ Modération de produits &amp; Catalogue</option>
                  <option value="other">💬 Autre demande partenaire</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Code commande (si concerné)</label>
                <input
                  type="text"
                  placeholder="Ex: 8cc603f3..."
                  value={orderCode}
                  onChange={(e) => setOrderCode(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Sujet de votre demande *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Question sur la collecte d'un colis"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Détails de votre message *</label>
                <textarea
                  required
                  rows={4}
                  placeholder="Détaillez votre demande pour notre équipe logistique et conformité..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500 resize-none"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black transition-all shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Envoi en cours...
                  </>
                ) : (
                  <>
                    <Send size={16} />
                    Soumettre mon ticket
                  </>
                )}
              </button>
            </form>
          ) : selectedTicket ? (
            /* CONVERSATION VIEW */
            <div className="flex flex-col h-full space-y-4">
              <button
                onClick={() => setSelectedTicket(null)}
                className="text-xs font-bold text-indigo-600 hover:underline flex items-center gap-1"
              >
                ← Retour à mes tickets
              </button>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200/80">
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono font-black text-indigo-600 text-xs">{selectedTicket.ticket_code}</span>
                  <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                    selectedTicket.status === "resolved" ? "bg-emerald-100 text-emerald-800" :
                    selectedTicket.status === "in_progress" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                  }`}>
                    {selectedTicket.status === "resolved" ? "Résolu ✅" : selectedTicket.status === "in_progress" ? "En cours ⏳" : "Ouvert 🔴"}
                  </span>
                </div>
                <h4 className="font-extrabold text-sm text-gray-900">{selectedTicket.subject}</h4>
              </div>

              <div className="space-y-3 min-h-40 max-h-65 overflow-y-auto p-2">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${msg.sender_type === "admin" ? "items-start" : "items-end"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl p-3 text-xs leading-relaxed ${
                        msg.sender_type === "admin"
                          ? "bg-slate-100 text-gray-900 border border-slate-200"
                          : "bg-indigo-600 text-white font-medium"
                      }`}
                    >
                      <p className="font-bold text-[10px] opacity-75 mb-1">
                        {msg.sender_type === "admin" ? "🛡️ Support Kalagban" : `🏪 ${shopName || "Moi"}`}
                      </p>
                      <p className="whitespace-pre-wrap">{msg.message}</p>
                    </div>
                    <span className="text-[9px] text-gray-400 mt-1">
                      {new Date(msg.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </div>
                ))}
              </div>

              <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-gray-100">
                <input
                  type="text"
                  placeholder="Répondre au support..."
                  value={replyText}
                  onChange={(e) => setReplyText(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-medium focus:outline-hidden focus:border-indigo-500"
                />
                <button
                  type="submit"
                  disabled={sendingReply || !replyText.trim()}
                  className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all disabled:opacity-50 flex items-center justify-center cursor-pointer"
                >
                  {sendingReply ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                </button>
              </form>
            </div>
          ) : (
            /* TICKETS LIST VIEW */
            <div className="space-y-3">
              {loadingTickets ? (
                <div className="py-12 flex flex-col items-center justify-center gap-2 text-gray-400">
                  <Loader2 size={24} className="animate-spin text-indigo-600" />
                  <p className="text-xs font-bold">Chargement de vos demandes...</p>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center text-gray-400">
                  <FileText size={36} className="mx-auto mb-2 opacity-40 text-indigo-600" />
                  <p className="font-bold text-gray-700 text-sm">Aucun ticket ouvert</p>
                  <p className="text-xs mt-1">Cliquez sur &quot;Nouvelle Demande&quot; pour contacter notre service marchand.</p>
                </div>
              ) : (
                tickets.map((t) => (
                  <div
                    key={t.id}
                    onClick={() => handleOpenTicketConversation(t)}
                    className="p-4 rounded-2xl border border-gray-100 bg-gray-50/60 hover:bg-indigo-50/40 hover:border-indigo-200 transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-black text-indigo-600 text-xs">{t.ticket_code}</span>
                        <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                          t.status === "resolved" ? "bg-emerald-100 text-emerald-800" :
                          t.status === "in_progress" ? "bg-amber-100 text-amber-800" : "bg-blue-100 text-blue-800"
                        }`}>
                          {t.status === "resolved" ? "Résolu ✅" : t.status === "in_progress" ? "En cours ⏳" : "Ouvert 🔴"}
                        </span>
                      </div>
                      <h4 className="font-bold text-xs text-gray-900 group-hover:text-indigo-600 transition-colors">
                        {t.subject}
                      </h4>
                      <p className="text-[10px] text-gray-400 font-medium">
                        Créé le {new Date(t.created_at).toLocaleDateString("fr-FR")}
                      </p>
                    </div>
                    <ChevronRight size={16} className="text-gray-400 group-hover:text-indigo-600 transition-colors" />
                  </div>
                ))
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
}
