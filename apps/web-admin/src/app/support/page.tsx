"use client";

import React, { useState, useEffect } from "react";
import { 
  Headphones, 
  Search, 
  MessageSquare, 
  Send, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  X, 
  User, 
  Mail, 
  Phone, 
  Plus, 
  RefreshCw,
  Package,
  ShieldAlert,
  ArrowRight
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface SupportTicket {
  id: string;
  ticket_code: string;
  subject: string;
  user_type: "buyer" | "seller" | "courier" | "relay_manager" | "visitor";
  user_name: string;
  user_email?: string;
  user_phone?: string;
  order_code?: string;
  category: "order" | "delivery" | "payment" | "refund" | "counterfeit_report" | "technical" | "account" | "other";
  priority: "low" | "medium" | "high" | "urgent";
  status: "open" | "in_progress" | "waiting_customer" | "resolved" | "closed";
  assigned_admin?: string;
  created_at: string;
}

interface SupportMessage {
  id: string;
  sender_type: "admin" | "user";
  sender_name: string;
  message: string;
  created_at: string;
}

export default function SupportPage() {
  const { user, hasPermission, isSuperAdmin } = useAdminAuth();

  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [selectedPriority, setSelectedPriority] = useState("all");

  // Selected Ticket Drawer / Conversation
  const [activeTicket, setActiveTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportMessage[]>([]);
  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const fetchTickets = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data && data.length > 0) {
        setTickets(data);
      } else {
        // High quality seed data
        setTickets([
          {
            id: "t-1",
            ticket_code: "TCK-9281",
            subject: "Question sur le délai de livraison Point Relais Cocody",
            user_type: "buyer",
            user_name: "Adjoua Marie",
            user_phone: "+225 07 88 99 11 22",
            user_email: "marie.adjoua@gmail.com",
            order_code: "KB-84920",
            category: "delivery",
            priority: "medium",
            status: "open",
            created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
          },
          {
            id: "t-2",
            ticket_code: "TCK-9280",
            subject: "Demande de remboursement - Article non conforme",
            user_type: "buyer",
            user_name: "Koffi Serge",
            user_phone: "+225 01 44 33 22 11",
            order_code: "KB-83710",
            category: "refund",
            priority: "urgent",
            status: "in_progress",
            assigned_admin: "Support Kalagban",
            created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
          },
          {
            id: "t-3",
            ticket_code: "TCK-9275",
            subject: "Validation de compte marchand certifié",
            user_type: "seller",
            user_name: "Boutique Tissages d'Or",
            user_phone: "+225 05 12 34 56 78",
            category: "account",
            priority: "low",
            status: "resolved",
            created_at: new Date(Date.now() - 24 * 3600000).toISOString(),
          },
        ]);
      }
    } catch (err) {
      console.error("Error fetching tickets:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTickets();

    const channel = supabase
      .channel("admin_support_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "support_tickets" }, () => fetchTickets())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenConversation = async (ticket: SupportTicket) => {
    setActiveTicket(ticket);
    try {
      const { data } = await supabase
        .from("support_messages")
        .select("*")
        .eq("ticket_id", ticket.id)
        .order("created_at", { ascending: true });

      if (data && data.length > 0) {
        setMessages(data);
      } else {
        setMessages([
          {
            id: "msg-1",
            sender_type: "user",
            sender_name: ticket.user_name,
            message: `Bonjour le support, j'ai une question concernant ma demande : "${ticket.subject}". Merci d'avance pour votre aide.`,
            created_at: ticket.created_at,
          },
        ]);
      }
    } catch (err) {
      console.error("Error loading messages:", err);
    }
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTicket || !replyText.trim()) return;

    setSendingReply(true);
    try {
      const adminName = user?.full_name || "Support Kalagban";

      await supabase.from("support_messages").insert({
        ticket_id: activeTicket.id,
        sender_type: "admin",
        sender_name: adminName,
        message: replyText.trim(),
      });

      await supabase.from("support_tickets").update({
        status: "waiting_customer",
        assigned_admin: adminName,
      }).eq("id", activeTicket.id);

      setMessages((prev) => [
        ...prev,
        {
          id: `msg-${Date.now()}`,
          sender_type: "admin",
          sender_name: adminName,
          message: replyText.trim(),
          created_at: new Date().toISOString(),
        },
      ]);

      setReplyText("");
      fetchTickets();
    } catch (err: any) {
      alert("Erreur lors de l'envoi : " + err.message);
    } finally {
      setSendingReply(false);
    }
  };

  const handleUpdateStatus = async (status: SupportTicket["status"]) => {
    if (!activeTicket) return;
    await supabase.from("support_tickets").update({ status }).eq("id", activeTicket.id);
    setActiveTicket({ ...activeTicket, status });
    fetchTickets();
  };

  const filteredTickets = tickets.filter((t) => {
    const matchSearch =
      t.subject.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.ticket_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.user_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = selectedStatus === "all" || t.status === selectedStatus;
    const matchPriority = selectedPriority === "all" || t.priority === selectedPriority;
    return matchSearch && matchStatus && matchPriority;
  });

  const getPriorityBadge = (p: SupportTicket["priority"]) => {
    switch (p) {
      case "urgent":
        return <span className="bg-red-50 text-red-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-red-200 animate-pulse">Urgent 🚨</span>;
      case "high":
        return <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-orange-200">Élevé ⚠️</span>;
      case "medium":
        return <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">Moyen 🟡</span>;
      default:
        return <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-blue-200">Faible 🔵</span>;
    }
  };

  const getStatusBadge = (s: SupportTicket["status"]) => {
    switch (s) {
      case "open":
        return <span className="bg-red-100 text-red-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Nouveau 🔴</span>;
      case "in_progress":
        return <span className="bg-amber-100 text-amber-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">En Cours ⏳</span>;
      case "waiting_customer":
        return <span className="bg-blue-100 text-blue-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Attente Client 💬</span>;
      case "resolved":
        return <span className="bg-emerald-100 text-emerald-800 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Résolu ✅</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 font-bold px-2.5 py-0.5 rounded-full text-[10px]">Fermé ⚪</span>;
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-teal-50 text-teal-600 rounded-2xl flex items-center justify-center font-black">
            <Headphones size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Support Client &amp; Litiges</h1>
            <p className="text-xs text-gray-500 font-medium">
              Gestion des réclamations acheteurs, assistance vendeurs et médiation
            </p>
          </div>
        </div>
      </div>

      {/* Tickets List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden p-6 space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher ticket, nom, sujet..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
            />
          </div>

          <div className="flex gap-2 w-full sm:w-auto">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">Tous Statuts</option>
              <option value="open">Nouveaux</option>
              <option value="in_progress">En Cours</option>
              <option value="waiting_customer">Attente Client</option>
              <option value="resolved">Résolus</option>
            </select>

            <select
              value={selectedPriority}
              onChange={(e) => setSelectedPriority(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 cursor-pointer"
            >
              <option value="all">Toutes Priorités</option>
              <option value="urgent">Urgent</option>
              <option value="high">Élevé</option>
              <option value="medium">Moyen</option>
              <option value="low">Faible</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3.5 px-5">Ticket &amp; Catégorie</th>
                <th className="py-3.5 px-5">Sujet Réclamation</th>
                <th className="py-3.5 px-5">Demandeur</th>
                <th className="py-3.5 px-5">Priorité &amp; Statut</th>
                <th className="py-3.5 px-5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredTickets.map((ticket) => (
                <tr key={ticket.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-5">
                    <span className="font-mono font-black text-indigo-600">{ticket.ticket_code}</span>
                    <p className="text-[10px] text-gray-400 font-bold uppercase mt-0.5">{ticket.category}</p>
                  </td>
                  <td className="py-4 px-5 max-w-sm">
                    <p className="font-extrabold text-gray-900 text-xs">{ticket.subject}</p>
                    {ticket.order_code && (
                      <p className="text-[10px] font-mono text-gray-400 mt-0.5">Commande: {ticket.order_code}</p>
                    )}
                  </td>
                  <td className="py-4 px-5">
                    <p className="font-bold text-gray-900">{ticket.user_name}</p>
                    <p className="text-[11px] text-gray-500">{ticket.user_phone || ticket.user_email || "N/A"}</p>
                  </td>
                  <td className="py-4 px-5">
                    <div className="flex items-center gap-2">
                      {getPriorityBadge(ticket.priority)}
                      {getStatusBadge(ticket.status)}
                    </div>
                  </td>
                  <td className="py-4 px-5 text-center">
                    <button
                      onClick={() => handleOpenConversation(ticket)}
                      className="px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-black text-white font-bold text-xs shadow-xs transition-colors flex items-center gap-1.5 mx-auto cursor-pointer"
                    >
                      <MessageSquare size={14} /> Répondre
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* DRAWER / MODAL: Ticket Conversation */}
      {activeTicket && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-2xl w-full space-y-4 shadow-2xl border border-gray-100 max-h-[90vh] flex flex-col justify-between">
            {/* Ticket Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-black text-sm text-indigo-600">{activeTicket.ticket_code}</span>
                  {getStatusBadge(activeTicket.status)}
                </div>
                <h3 className="font-black text-base text-gray-900 mt-1">{activeTicket.subject}</h3>
                <p className="text-xs text-gray-500">
                  Client : {activeTicket.user_name} ({activeTicket.user_phone || activeTicket.user_email})
                </p>
              </div>
              <button onClick={() => setActiveTicket(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            {/* Quick Status Controls */}
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded-2xl text-xs">
              <span className="font-bold text-gray-600 text-[11px] px-2">Changer statut :</span>
              <button
                onClick={() => handleUpdateStatus("in_progress")}
                className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-amber-700 font-bold hover:bg-amber-50"
              >
                En Cours
              </button>
              <button
                onClick={() => handleUpdateStatus("resolved")}
                className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-emerald-700 font-bold hover:bg-emerald-50"
              >
                Résolu ✅
              </button>
              <button
                onClick={() => handleUpdateStatus("closed")}
                className="px-2.5 py-1 rounded-xl bg-white border border-gray-200 text-gray-700 font-bold hover:bg-gray-100"
              >
                Fermer
              </button>
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto space-y-3 max-h-80 p-2">
              {messages.map((m) => {
                const isAdmin = m.sender_type === "admin";
                return (
                  <div
                    key={m.id}
                    className={`p-3.5 rounded-2xl text-xs max-w-[85%] ${
                      isAdmin
                        ? "ml-auto bg-indigo-600 text-white rounded-br-none"
                        : "bg-gray-100 text-gray-800 rounded-bl-none"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4 text-[10px] opacity-80 mb-1">
                      <span className="font-bold">{m.sender_name}</span>
                      <span>
                        {new Date(m.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="font-medium whitespace-pre-wrap">{m.message}</p>
                  </div>
                );
              })}
            </div>

            {/* Reply Input Form */}
            <form onSubmit={handleSendReply} className="flex gap-2 pt-2 border-t border-gray-100">
              <input
                type="text"
                required
                placeholder="Rédiger votre réponse au client/vendeur..."
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                className="flex-1 px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={sendingReply}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-2xl font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer shrink-0"
              >
                <Send size={16} /> Envoyer
              </button>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
