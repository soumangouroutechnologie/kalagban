"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  UserPlus, 
  ShieldCheck, 
  Crown, 
  Code, 
  DollarSign, 
  ShieldAlert, 
  Check, 
  Loader2, 
  X,
  Mail,
  User,
  Trash2,
  Lock,
  Edit3
} from "lucide-react";

interface AdminPermissions {
  can_manage_team: boolean;
  can_edit_cms: boolean;
  can_view_finance: boolean;
  can_moderate_shops: boolean;
  can_moderate_products: boolean;
}

interface TeamMember {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  admin_role?: string;
  created_at?: string;
  permissions?: AdminPermissions;
}

export default function TeamPage() {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState<string | null>(null);

  // New Member Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    admin_role: "moderator",
    can_manage_team: false,
    can_edit_cms: true,
    can_view_finance: false,
    can_moderate_shops: true,
    can_moderate_products: true,
  });

  const fetchTeamMembers = async () => {
    try {
      // 1. Fetch profiles with admin_role set or super admin
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, role, admin_role, created_at")
        .not("admin_role", "is", null)
        .order("created_at", { ascending: false });

      if (pErr) console.error("Error profiles fetch:", pErr);

      // 2. Fetch admin_permissions
      const { data: perms } = await supabase
        .from("admin_permissions")
        .select("*");

      const permsMap = new Map<string, AdminPermissions>();
      if (perms) {
        perms.forEach((p) => {
          permsMap.set(p.user_id, {
            can_manage_team: p.can_manage_team ?? false,
            can_edit_cms: p.can_edit_cms ?? false,
            can_view_finance: p.can_view_finance ?? false,
            can_moderate_shops: p.can_moderate_shops ?? false,
            can_moderate_products: p.can_moderate_products ?? true,
          });
        });
      }

      if (profiles && profiles.length > 0) {
        const enriched: TeamMember[] = profiles.map((p) => ({
          ...p,
          permissions: permsMap.get(p.id) || {
            can_manage_team: p.admin_role === "super_admin",
            can_edit_cms: p.admin_role === "super_admin" || p.admin_role === "developer",
            can_view_finance: p.admin_role === "super_admin" || p.admin_role === "accountant",
            can_moderate_shops: p.admin_role === "super_admin" || p.admin_role === "moderator",
            can_moderate_products: p.admin_role === "super_admin" || p.admin_role === "moderator",
          },
        }));
        setMembers(enriched);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamMembers();

    const channel = supabase
      .channel("admin_team_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchTeamMembers())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_permissions" }, () => fetchTeamMembers())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);

    try {
      // 1. Sign up user in Auth
      const { data: authData, error: authErr } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            full_name: formData.full_name,
            role: "admin",
          },
        },
      });

      if (authErr) throw authErr;

      if (authData.user) {
        // 2. Update profile with admin_role
        await supabase
          .from("profiles")
          .update({
            full_name: formData.full_name,
            admin_role: formData.admin_role,
            role: "admin",
          })
          .eq("id", authData.user.id);

        // 3. Upsert admin_permissions
        await supabase.from("admin_permissions").upsert({
          user_id: authData.user.id,
          can_manage_team: formData.can_manage_team || formData.admin_role === "super_admin",
          can_edit_cms: formData.can_edit_cms || formData.admin_role === "developer" || formData.admin_role === "super_admin",
          can_view_finance: formData.can_view_finance || formData.admin_role === "accountant" || formData.admin_role === "super_admin",
          can_moderate_shops: formData.can_moderate_shops || formData.admin_role === "moderator" || formData.admin_role === "super_admin",
          can_moderate_products: formData.can_moderate_products || formData.admin_role === "moderator" || formData.admin_role === "super_admin",
        });

        setShowAddModal(false);
        setFormData({
          full_name: "",
          email: "",
          password: "",
          admin_role: "moderator",
          can_manage_team: false,
          can_edit_cms: true,
          can_view_finance: false,
          can_moderate_shops: true,
          can_moderate_products: true,
        });
        fetchTeamMembers();
      }
    } catch (err: unknown) {
      console.error("Error creating team member:", err);
      const message = err instanceof Error ? err.message : "Erreur lors de la création du membre.";
      alert(message);
    } finally {
      setCreating(false);
    }
  };

  const handleTogglePermission = async (memberId: string, permKey: keyof AdminPermissions, currentValue: boolean) => {
    setSavingPermissions(memberId);
    try {
      const member = members.find((m) => m.id === memberId);
      if (!member) return;

      const newPerms: AdminPermissions = {
        can_manage_team: member.permissions?.can_manage_team ?? false,
        can_edit_cms: member.permissions?.can_edit_cms ?? false,
        can_view_finance: member.permissions?.can_view_finance ?? false,
        can_moderate_shops: member.permissions?.can_moderate_shops ?? false,
        can_moderate_products: member.permissions?.can_moderate_products ?? true,
        [permKey]: !currentValue,
      };

      if (memberId !== "super_admin_default") {
        await supabase.from("admin_permissions").upsert({
          user_id: memberId,
          ...newPerms,
        });
      }

      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, permissions: newPerms } : m))
      );
    } catch (err) {
      console.error("Error updating permissions:", err);
    } finally {
      setSavingPermissions(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: string) => {
    try {
      if (memberId !== "super_admin_default") {
        await supabase
          .from("profiles")
          .update({ admin_role: newRole })
          .eq("id", memberId);
      }
      setMembers((prev) =>
        prev.map((m) => (m.id === memberId ? { ...m, admin_role: newRole } : m))
      );
    } catch (err) {
      console.error("Error changing role:", err);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!confirm("Voulez-vous vraiment retirer ce collaborateur de l'équipe ?")) return;
    try {
      if (memberId !== "super_admin_default") {
        await supabase.from("profiles").update({ admin_role: null }).eq("id", memberId);
      }
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error("Error deleting member:", err);
    }
  };

  const getRoleBadge = (admin_role?: string) => {
    switch (admin_role) {
      case "super_admin":
        return (
          <span className="bg-amber-50 text-amber-700 font-extrabold px-3 py-1 rounded-full border border-amber-200 text-xs flex items-center gap-1.5">
            <Crown size={14} className="text-amber-500" /> Super Admin 👑
          </span>
        );
      case "developer":
        return (
          <span className="bg-blue-50 text-blue-700 font-extrabold px-3 py-1 rounded-full border border-blue-200 text-xs flex items-center gap-1.5">
            <Code size={14} className="text-blue-500" /> Développeur / Ingénieur 💻
          </span>
        );
      case "accountant":
        return (
          <span className="bg-emerald-50 text-emerald-700 font-extrabold px-3 py-1 rounded-full border border-emerald-200 text-xs flex items-center gap-1.5">
            <DollarSign size={14} className="text-emerald-500" /> Comptable / Financier 💰
          </span>
        );
      default:
        return (
          <span className="bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1 rounded-full border border-indigo-200 text-xs flex items-center gap-1.5">
            <ShieldAlert size={14} className="text-indigo-500" /> Modérateur Admin 🛡️
          </span>
        );
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Gestion de l&apos;Équipe &amp; Permissions RBAC</h1>
            <p className="text-xs text-gray-500 font-medium">Administration des rôles et attribution des autorisations d&apos;accès</p>
          </div>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all shrink-0"
        >
          <UserPlus size={16} /> Ajouter un Collaborateur
        </button>
      </div>

      {/* 4 Roles Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-amber-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-amber-700 uppercase tracking-wider">Rôle 1</span>
            <Crown className="text-amber-500" size={20} />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900">Administrateur Suprême 👑</h3>
          <p className="text-[11px] text-gray-500 font-medium leading-snug">
            Accès total et illimité : Gestion de l&apos;équipe, CMS, Comptabilité et Modération.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-blue-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-blue-700 uppercase tracking-wider">Rôle 2</span>
            <Code className="text-blue-500" size={20} />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900">Développeur / Ingénieur 💻</h3>
          <p className="text-[11px] text-gray-500 font-medium leading-snug">
            Gestion visuelle du CMS, code, bannières et bon fonctionnement technique de l&apos;application.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-emerald-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-emerald-700 uppercase tracking-wider">Rôle 3</span>
            <DollarSign className="text-emerald-500" size={20} />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900">Comptable / Financier 💰</h3>
          <p className="text-[11px] text-gray-500 font-medium leading-snug">
            Gestion de la trésorerie, suivi des commissions Kalagban (5%) et reversements aux vendeurs.
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-indigo-200/80 shadow-xs space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-indigo-700 uppercase tracking-wider">Rôle 4</span>
            <ShieldAlert className="text-indigo-500" size={20} />
          </div>
          <h3 className="font-extrabold text-sm text-gray-900">Modérateur Admin 🛡️</h3>
          <p className="text-[11px] text-gray-500 font-medium leading-snug">
            Validation des boutiques, modération des produits, des bannières et assistance utilisateurs.
          </p>
        </div>
      </div>

      {/* Team Members & Matrix Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-extrabold text-base text-gray-900">
            Membres de l&apos;Équipe &amp; Matrice de Permissions ({members.length})
          </h2>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement de l&apos;équipe...</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {members.map((member) => (
              <div key={member.id} className="p-6 space-y-4 hover:bg-slate-50/50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-11 h-11 bg-indigo-600 text-white rounded-2xl flex items-center justify-center font-black text-base shadow-sm">
                      {member.full_name ? member.full_name.charAt(0).toUpperCase() : "A"}
                    </div>
                    <div>
                      <h3 className="font-extrabold text-sm text-gray-900">
                        {member.full_name || (
                          member.admin_role === "super_admin"
                            ? "Administrateur Suprême (Directeur)"
                            : member.admin_role === "developer"
                            ? "Ingénieur & Développeur Lead"
                            : member.admin_role === "accountant"
                            ? "Responsable Comptable & Financier"
                            : "Responsable Modération & Support Client"
                        )}
                      </h3>
                      <p className="text-xs text-gray-400 font-medium">Poste &amp; Rôle officiel configuré</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Role Selector Dropdown */}
                    <select
                      value={member.admin_role || "moderator"}
                      onChange={(e) => handleChangeRole(member.id, e.target.value)}
                      className="bg-slate-50 border border-gray-200 rounded-xl px-3 py-1.5 text-xs font-bold text-gray-800 outline-none focus:border-indigo-600 cursor-pointer"
                    >
                      <option value="super_admin">👑 Super Admin (Total)</option>
                      <option value="developer">💻 Développeur / Ingénieur</option>
                      <option value="accountant">💰 Comptable / Financier</option>
                      <option value="moderator">🛡️ Modérateur Admin</option>
                    </select>

                    {getRoleBadge(member.admin_role)}

                    <button
                      onClick={() => handleDeleteMember(member.id)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 transition-colors cursor-pointer"
                      title="Retirer le collaborateur"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>

                {/* Individual Permission Toggles */}
                <div className="bg-slate-50/80 p-4 rounded-2xl border border-gray-200/60 grid grid-cols-2 md:grid-cols-5 gap-3">
                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={member.permissions?.can_manage_team ?? false}
                      onChange={() => handleTogglePermission(member.id, "can_manage_team", member.permissions?.can_manage_team ?? false)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>👥 Gérer l&apos;Équipe</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={member.permissions?.can_edit_cms ?? false}
                      onChange={() => handleTogglePermission(member.id, "can_edit_cms", member.permissions?.can_edit_cms ?? false)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>🎨 Éditeur CMS</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={member.permissions?.can_view_finance ?? false}
                      onChange={() => handleTogglePermission(member.id, "can_view_finance", member.permissions?.can_view_finance ?? false)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>💰 Finances</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={member.permissions?.can_moderate_shops ?? false}
                      onChange={() => handleTogglePermission(member.id, "can_moderate_shops", member.permissions?.can_moderate_shops ?? false)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>🏪 Modération Boutiques</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={member.permissions?.can_moderate_products ?? true}
                      onChange={() => handleTogglePermission(member.id, "can_moderate_products", member.permissions?.can_moderate_products ?? true)}
                      className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                    <span>🛍️ Modération Produits</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CREATE MEMBER MODAL */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setShowAddModal(false)}
              className="absolute top-6 right-6 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
                <UserPlus size={24} />
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">Nouveau Collaborateur Admin</h3>
                <p className="text-xs text-gray-500 font-medium">Créer un compte d&apos;accès à la console de gestion</p>
              </div>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Nom Complet du Collaborateur</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Kouadio"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Adresse Email Professionnelle</label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="email"
                    required
                    placeholder="admin@kalagban.ci"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Mot de Passe Provisoire</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    className="w-full bg-slate-50 border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-700">Profil &amp; Rôle Assigné</label>
                <select
                  value={formData.admin_role}
                  onChange={(e) => setFormData({ ...formData, admin_role: e.target.value })}
                  className="w-full bg-slate-50 border border-gray-200 rounded-2xl px-4 py-2.5 text-xs font-bold outline-none focus:border-indigo-600"
                >
                  <option value="super_admin">👑 Administrateur Suprême (Accès Total)</option>
                  <option value="developer">💻 Développeur / Ingénieur (CMS &amp; Code)</option>
                  <option value="accountant">💰 Comptable / Gestionnaire Financier</option>
                  <option value="moderator">🛡️ Modérateur Admin / Support Client</option>
                </select>
              </div>

              {/* Checkbox Permissions Matrix */}
              <div className="pt-2 space-y-2 border-t border-gray-100">
                <label className="text-xs font-bold text-gray-700 block">Permissions d&apos;Accès Spécifiques :</label>
                <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-gray-100">
                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_manage_team}
                      onChange={(e) => setFormData({ ...formData, can_manage_team: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>👥 Gérer l&apos;Équipe</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_edit_cms}
                      onChange={(e) => setFormData({ ...formData, can_edit_cms: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>🎨 Éditeur CMS &amp; Pubs</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_view_finance}
                      onChange={(e) => setFormData({ ...formData, can_view_finance: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>💰 Finances &amp; Payouts</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_moderate_shops}
                      onChange={(e) => setFormData({ ...formData, can_moderate_shops: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>🏪 Modération Boutiques</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.can_moderate_products}
                      onChange={(e) => setFormData({ ...formData, can_moderate_products: e.target.checked })}
                      className="w-4 h-4 rounded text-indigo-600"
                    />
                    <span>🛍️ Modération Produits</span>
                  </label>
                </div>
              </div>

              <div className="pt-4 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-xs hover:bg-gray-50 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs px-6 py-2.5 rounded-xl flex items-center gap-2 cursor-pointer shadow-md shadow-indigo-600/30"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
                  {creating ? "Création..." : "Créer le Collaborateur"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
