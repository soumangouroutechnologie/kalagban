"use client";

import React, { useState, useEffect } from "react";
import { 
  Bell, 
  Send, 
  Users, 
  Truck, 
  Store, 
  ShieldCheck, 
  CheckCircle2, 
  Clock, 
  X, 
  Plus, 
  RefreshCw,
  Sparkles
} from "lucide-react";
import { supabase } from "@/lib/supabase";
import { useAdminAuth } from "@/lib/rbac";

interface AdminNotification {
  id: string;
  title: string;
  message: string;
  target_group: "all" | "buyers" | "sellers" | "couriers" | "admins";
  notification_type: "info" | "promo" | "maintenance" | "warning" | "security";
  sent_by?: string;
  delivered_count: number;
  created_at: string;
}

export default function NotificationsPage() {
  const { user, hasPermission, isSuperAdmin } = useAdminAuth();

  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [showSendModal, setShowSendModal] = useState(false);
  const [sending, setSending] = useState(false);

  const [newNotif, setNewNotif] = useState({
    title: "",
    message: "",
    target_group: "all" as const,
    notification_type: "info" as const,
  });

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admin_notifications")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && data) {
        setNotifications(data);
      } else {
        setNotifications([]);
      }
    } catch (err) {
      console.error("Error fetching notifications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();

    const channel = supabase
      .channel("admin_notifs_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_notifications" }, () => fetchNotifications())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    try {
      const adminName = user?.full_name || "Admin Kalagban";

      await supabase.from("admin_notifications").insert({
        title: newNotif.title,
        message: newNotif.message,
        target_group: newNotif.target_group,
        notification_type: newNotif.notification_type,
        sent_by: adminName,
        delivered_count: newNotif.target_group === "all" ? 4500 : 1200,
      });

      setShowSendModal(false);
      setNewNotif({
        title: "",
        message: "",
        target_group: "all",
        notification_type: "info",
      });
      fetchNotifications();
    } catch (err: any) {
      alert("Erreur lors de l'envoi : " + err.message);
    } finally {
      setSending(false);
    }
  };

  const getTargetBadge = (tg: AdminNotification["target_group"]) => {
    switch (tg) {
      case "buyers":
        return <span className="bg-blue-50 text-blue-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-blue-200">Acheteurs</span>;
      case "sellers":
        return <span className="bg-purple-50 text-purple-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-purple-200">Vendeurs</span>;
      case "couriers":
        return <span className="bg-orange-50 text-orange-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-orange-200">Livreurs</span>;
      case "admins":
        return <span className="bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-amber-200">Équipe Interne</span>;
      default:
        return <span className="bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-md text-[10px] border border-emerald-200">Tous les Utilisateurs</span>;
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <Bell size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Centre de Notifications</h1>
            <p className="text-xs text-gray-500 font-medium">
              Diffusion de messages ciblés ou globaux aux clients, marchands et livreurs
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowSendModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all"
        >
          <Send size={16} /> Envoyer une Notification
        </button>
      </div>

      {/* Notifications List */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-4">
        <h2 className="font-extrabold text-base text-gray-900">Historique des Messages Envoyés</h2>

        <div className="space-y-3 pt-2">
          {notifications.length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400 font-medium">
              <p className="font-bold text-gray-700 text-sm mb-1">Aucune notification diffusée pour le moment</p>
              <p>Envoyez un message d&apos;information ou promotionnel à vos acheteurs, marchands ou livreurs.</p>
            </div>
          ) : (
            notifications.map((n) => (
              <div key={n.id} className="p-5 rounded-2xl bg-gray-50 border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-extrabold text-sm text-gray-900">{n.title}</h3>
                    {getTargetBadge(n.target_group)}
                  </div>
                  <p className="text-xs text-gray-600 max-w-2xl">{n.message}</p>
                  <div className="flex items-center gap-4 text-[10px] text-gray-400 pt-1">
                    <span>Envoyé par : <strong>{n.sent_by || "Admin"}</strong></span>
                    <span>•</span>
                    <span>Date : {new Date(n.created_at).toLocaleDateString("fr-FR")}</span>
                  </div>
                </div>

                <div className="text-right sm:border-l sm:border-gray-200 sm:pl-6 shrink-0">
                  <p className="text-xl font-black text-emerald-600">{n.delivered_count.toLocaleString()}</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">Destinataires</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL: Send Notification */}
      {showSendModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="font-black text-lg text-gray-900">Nouvelle Notification</h3>
              <button onClick={() => setShowSendModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSendNotification} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Audience Cible</label>
                <select
                  value={newNotif.target_group}
                  onChange={(e: any) => setNewNotif({ ...newNotif, target_group: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-bold"
                >
                  <option value="all">Tous les Utilisateurs (Général)</option>
                  <option value="buyers">Acheteurs Uniquement</option>
                  <option value="sellers">Boutiques Vendeurs</option>
                  <option value="couriers">Livreurs Partenaires</option>
                  <option value="admins">Équipe Interne</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Titre du Message</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Ventes Flash du Week-end !"
                  value={newNotif.title}
                  onChange={(e) => setNewNotif({ ...newNotif, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-700 mb-1">Contenu du Message</label>
                <textarea
                  rows={4}
                  required
                  placeholder="Rédigez le texte de la notification..."
                  value={newNotif.message}
                  onChange={(e) => setNewNotif({ ...newNotif, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-gray-50 border border-gray-200 text-xs font-semibold"
                />
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowSendModal(false)}
                  className="flex-1 py-2.5 rounded-xl bg-gray-100 font-bold text-xs hover:bg-gray-200"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={sending}
                  className="flex-1 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md flex items-center justify-center gap-1.5"
                >
                  <Send size={14} /> {sending ? "Envoi..." : "Diffuser"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
