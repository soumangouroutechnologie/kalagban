"use client";

import React, { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase";
import { 
  Users, 
  UserPlus, 
  Check, 
  Loader2, 
  X, 
  User, 
  Trash2, 
  ShieldCheck, 
  Info, 
  CheckCircle2, 
  XCircle, 
  Sliders 
} from "lucide-react";
import { 
  useAdminAuth, 
  AdminRole, 
  AdminPermissions, 
  ROLE_LABELS, 
  ROLE_BASE_PERMISSIONS, 
  computePermissions 
} from "@/lib/rbac";

interface TeamMember {
  id: string;
  full_name: string;
  email?: string;
  role: string;
  admin_role: AdminRole;
  created_at?: string;
  permissions: AdminPermissions;
  custom_permissions?: Record<string, boolean>;
}

export default function TeamPage() {
  const { isSuperAdmin } = useAdminAuth();

  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"members" | "matrix" | "who_does_what">("members");

  // Modals
  const [showAddModal, setShowAddModal] = useState(false);
  const [inspectMember, setInspectMember] = useState<TeamMember | null>(null);
  const [creating, setCreating] = useState(false);
  const [savingPermissions, setSavingPermissions] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    full_name: "",
    email: "",
    password: "",
    admin_role: "moderator" as AdminRole,
    custom_permissions: {} as Record<string, boolean>,
  });

  const fetchTeamMembers = useCallback(async () => {
    try {
      const { data: profiles, error: pErr } = await supabase
        .from("profiles")
        .select("id, full_name, role, admin_role, created_at")
        .not("admin_role", "is", null)
        .order("created_at", { ascending: false });

      if (pErr) console.error("Error profiles fetch:", pErr);

      const { data: perms } = await supabase
        .from("admin_permissions")
        .select("*");

      const permsMap = new Map<string, { dbPerms: Partial<AdminPermissions>; custom: Record<string, boolean> }>();
      if (perms) {
        perms.forEach((p) => {
          permsMap.set(p.user_id, {
            dbPerms: p,
            custom: (p.custom_permissions as Record<string, boolean>) || {},
          });
        });
      }

      if (profiles && profiles.length > 0) {
        const enriched: TeamMember[] = profiles.map((p) => {
          const role = (p.admin_role || "moderator") as AdminRole;
          const permData = permsMap.get(p.id);
          const computed = computePermissions(role, permData?.dbPerms, permData?.custom);

          return {
            id: p.id,
            full_name: p.full_name || "Membre Équipe",
            role: p.role,
            admin_role: role,
            created_at: p.created_at,
            permissions: computed,
            custom_permissions: permData?.custom || {},
          };
        });
        setMembers(enriched);
      } else {
        setMembers([]);
      }
    } catch (err) {
      console.error("Error fetching team members:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTeamMembers();
    }, 0);

    const channel = supabase
      .channel("admin_team_realtime_full")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchTeamMembers())
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_permissions" }, () => fetchTeamMembers())
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchTeamMembers]);

  const handleCreateMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSuperAdmin) {
      alert("Seul le Super Administrateur peut créer des collaborateurs.");
      return;
    }
    setCreating(true);

    try {
      const generatedUid = crypto.randomUUID();

      // 1. Create in profiles
      const { error: profErr } = await supabase.from("profiles").upsert({
        id: generatedUid,
        full_name: formData.full_name,
        role: "admin",
        admin_role: formData.admin_role,
      });

      if (profErr) throw profErr;

      // 2. Set permissions
      const basePerms = ROLE_BASE_PERMISSIONS[formData.admin_role];
      const { error: permErr } = await supabase.from("admin_permissions").upsert({
        user_id: generatedUid,
        ...basePerms,
        custom_permissions: formData.custom_permissions,
        updated_at: new Date().toISOString(),
      });

      if (permErr) throw permErr;

      // Reset form & close
      setShowAddModal(false);
      setFormData({
        full_name: "",
        email: "",
        password: "",
        admin_role: "moderator",
        custom_permissions: {},
      });
      fetchTeamMembers();
    } catch (err: unknown) {
      console.error("Error creating team member:", err);
      const msg = err instanceof Error ? err.message : "Erreur lors de la création du collaborateur.";
      alert(msg);
    } finally {
      setCreating(false);
    }
  };

  const handleToggleExtraPermission = async (memberId: string, permKey: keyof AdminPermissions) => {
    if (!isSuperAdmin) {
      alert("Action réservée au Super Administrateur.");
      return;
    }

    const member = members.find((m) => m.id === memberId);
    if (!member) return;

    setSavingPermissions(memberId);
    try {
      const currentCustom = { ...(member.custom_permissions || {}) };
      const currentVal = member.permissions[permKey];
      const newVal = !currentVal;

      currentCustom[permKey as string] = newVal;

      await supabase.from("admin_permissions").upsert({
        user_id: memberId,
        [permKey]: newVal,
        custom_permissions: currentCustom,
        updated_at: new Date().toISOString(),
      });

      // Local state update
      setMembers((prev) =>
        prev.map((m) => {
          if (m.id === memberId) {
            const updatedPerms = { ...m.permissions, [permKey]: newVal };
            return {
              ...m,
              permissions: updatedPerms,
              custom_permissions: currentCustom,
            };
          }
          return m;
        })
      );
    } catch (err) {
      console.error("Error toggling permission:", err);
    } finally {
      setSavingPermissions(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: AdminRole) => {
    if (!isSuperAdmin) {
      alert("Action réservée au Super Administrateur.");
      return;
    }

    try {
      await supabase.from("profiles").update({ admin_role: newRole }).eq("id", memberId);
      const basePerms = ROLE_BASE_PERMISSIONS[newRole];

      await supabase.from("admin_permissions").upsert({
        user_id: memberId,
        ...basePerms,
        updated_at: new Date().toISOString(),
      });

      fetchTeamMembers();
    } catch (err) {
      console.error("Error changing role:", err);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    if (!isSuperAdmin) {
      alert("Action réservée au Super Administrateur.");
      return;
    }
    if (!confirm("Voulez-vous révoquer les accès administrateur de ce collaborateur ?")) return;

    try {
      await supabase.from("profiles").update({ admin_role: null }).eq("id", memberId);
      await supabase.from("admin_permissions").delete().eq("user_id", memberId);
      setMembers((prev) => prev.filter((m) => m.id !== memberId));
    } catch (err) {
      console.error("Error revoking member:", err);
    }
  };

  const renderBadge = (adminRole: AdminRole) => {
    const meta = ROLE_LABELS[adminRole] || ROLE_LABELS.moderator;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black border ${meta.badgeColor}`}>
        {meta.label}
      </span>
    );
  };

  const keyPermissionsList: { key: keyof AdminPermissions; label: string; group: string }[] = [
    { key: "can_manage_logistics", label: "Gestion Logistique & Relais", group: "Logistique" },
    { key: "can_view_relays", label: "Supervision Points Relais & Carte", group: "Logistique" },
    { key: "can_manage_couriers", label: "Gestion des Livreurs", group: "Logistique" },
    { key: "can_view_logistics_incidents", label: "Traitement des Incidents Logistiques", group: "Logistique" },
    { key: "can_moderate_products", label: "Modération Fiches Produits", group: "Catalogue" },
    { key: "can_moderate_shops", label: "Validation des Boutiques Vendeurs", group: "Catalogue" },
    { key: "can_view_finance", label: "Consultation Comptabilité & Trésorerie", group: "Finance" },
    { key: "can_manage_payouts", label: "Validation des Payouts & Reversements", group: "Finance" },
    { key: "can_manage_commissions", label: "Tarification & Commissions Dynamiques", group: "Finance" },
    { key: "can_manage_marketing", label: "Campagnes Marketing & Coupons", group: "Marketing" },
    { key: "can_view_support", label: "Support Client & Résolution Litiges", group: "Support" },
    { key: "can_view_risk", label: "Gestion des Risques & Anti-Fraude", group: "Risques" },
    { key: "can_edit_cms", label: "Éditeur Visuel CMS & Bannières", group: "Technique" },
    { key: "can_manage_team", label: "Administration Équipe & Droits RBAC", group: "Administration" },
  ];

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <Users size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Centre de Pilotage Équipe &amp; RBAC</h1>
            <p className="text-xs text-gray-500 font-medium">
              Architecture multi-rôles dynamique avec attribution flexible des permissions
            </p>
          </div>
        </div>

        {isSuperAdmin && (
          <button
            onClick={() => setShowAddModal(true)}
            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all shrink-0"
          >
            <UserPlus size={16} /> Ajouter un Collaborateur
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "members"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Users size={16} /> Collaborateurs ({members.length})
        </button>
        <button
          onClick={() => setActiveTab("matrix")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "matrix"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <Sliders size={16} /> Matrice Granulaire des Droits
        </button>
        <button
          onClick={() => setActiveTab("who_does_what")}
          className={`px-4 py-2.5 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "who_does_what"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          <ShieldCheck size={16} /> Vue Synthétique « Qui Gère Quoi ? »
        </button>
      </div>

      {/* 5 Official Roles Showcase Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {(["super_admin", "logistician", "accountant", "moderator", "developer"] as AdminRole[]).map((rKey) => {
          const meta = ROLE_LABELS[rKey];
          return (
            <div key={rKey} className="bg-white p-4 rounded-3xl border border-gray-100 shadow-xs space-y-1.5 flex flex-col justify-between">
              <div>
                <span className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">Rôle Officiel</span>
                <h3 className="font-extrabold text-xs text-gray-900 mt-1">{meta.label}</h3>
                <p className="text-[11px] text-gray-500 font-medium leading-tight mt-1">{meta.description}</p>
              </div>
              <div className="pt-2 border-t border-gray-50">
                <span className="text-[10px] font-bold text-indigo-600">
                  {members.filter(m => m.admin_role === rKey).length} collaborateur(s)
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* TAB 1: Members Table */}
      {activeTab === "members" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <h2 className="font-extrabold text-base text-gray-900">
              Liste des Membres de l&apos;Équipe ({members.length})
            </h2>
            <span className="text-xs text-gray-500">
              💡 Le Super Admin peut attribuer des permissions supplémentaires à la volée.
            </span>
          </div>

          {loading ? (
            <div className="py-16 flex flex-col items-center justify-center">
              <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
              <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement de l&apos;équipe...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-600">
                <thead className="bg-gray-50 text-[11px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                  <tr>
                    <th className="py-4 px-6">Collaborateur</th>
                    <th className="py-4 px-6">Rôle Principal</th>
                    <th className="py-4 px-6">Domaines &amp; Espaces Actifs</th>
                    <th className="py-4 px-6 text-center">Actions &amp; Accès</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {members.map((member) => (
                    <tr key={member.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-700 font-black text-xs flex items-center justify-center">
                            {member.full_name.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 text-sm">{member.full_name}</p>
                            <p className="text-[11px] text-gray-400">ID: {member.id.substring(0, 8)}...</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-6">
                        {isSuperAdmin && member.admin_role !== "super_admin" ? (
                          <select
                            value={member.admin_role}
                            onChange={(e) => handleChangeRole(member.id, e.target.value as AdminRole)}
                            className="text-xs font-bold bg-white border border-gray-200 rounded-xl px-2.5 py-1.5 text-gray-800 focus:outline-hidden focus:border-indigo-500 cursor-pointer"
                          >
                            {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                              <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                            ))}
                          </select>
                        ) : (
                          renderBadge(member.admin_role)
                        )}
                      </td>

                      <td className="py-4 px-6">
                        <div className="flex flex-wrap gap-1 max-w-md">
                          {member.permissions.can_manage_logistics && (
                            <span className="bg-orange-50 text-orange-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-orange-200">
                              🚚 Logistique &amp; Relais
                            </span>
                          )}
                          {member.permissions.can_moderate_products && (
                            <span className="bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-indigo-200">
                              🛡️ Modération Produits
                            </span>
                          )}
                          {member.permissions.can_moderate_shops && (
                            <span className="bg-purple-50 text-purple-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-purple-200">
                              🏪 Boutiques
                            </span>
                          )}
                          {member.permissions.can_view_finance && (
                            <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-emerald-200">
                              💰 Finances &amp; Commissions
                            </span>
                          )}
                          {member.permissions.can_manage_marketing && (
                            <span className="bg-pink-50 text-pink-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-pink-200">
                              📣 Marketing &amp; Promos
                            </span>
                          )}
                          {member.permissions.can_view_support && (
                            <span className="bg-teal-50 text-teal-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-teal-200">
                              🎧 Support &amp; Litiges
                            </span>
                          )}
                          {member.permissions.can_view_risk && (
                            <span className="bg-red-50 text-red-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-red-200">
                              🛡️ Risques &amp; Sécurité
                            </span>
                          )}
                          {member.permissions.can_edit_cms && (
                            <span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded-lg text-[10px] font-extrabold border border-blue-200">
                              💻 CMS &amp; Bannières
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-6 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setInspectMember(member)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Info size={14} /> Voir Accès
                          </button>

                          {isSuperAdmin && member.admin_role !== "super_admin" && (
                            <button
                              onClick={() => handleDeleteMember(member.id)}
                              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                              title="Révoquer accès"
                            >
                              <Trash2 size={16} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: Matrix View with Live Permission Toggles */}
      {activeTab === "matrix" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
          <div className="p-6 border-b border-gray-100">
            <h2 className="font-extrabold text-base text-gray-900">
              Matrice Granulaire d&apos;Attribution des Droits
            </h2>
            <p className="text-xs text-gray-500 mt-1">
              Les cases cochées en vert sont actives. Cliquez sur une case pour ajouter ou retirer un droit spécifique à un collaborateur.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-600">
              <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <tr>
                  <th className="py-3 px-4 min-w-50">Permission / Domaine</th>
                  {members.map((m) => (
                    <th key={m.id} className="py-3 px-4 text-center min-w-32.5">
                      <div className="font-extrabold text-gray-800 text-[11px] truncate">{m.full_name}</div>
                      <div className="text-[9px] text-gray-400 font-normal">{ROLE_LABELS[m.admin_role]?.label}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {keyPermissionsList.map((perm) => (
                  <tr key={perm.key} className="hover:bg-slate-50/60">
                    <td className="py-3 px-4 font-bold text-gray-900">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-gray-100 text-gray-500 font-bold uppercase">
                          {perm.group}
                        </span>
                        <span>{perm.label}</span>
                      </div>
                    </td>

                    {members.map((m) => {
                      const has = m.permissions[perm.key];
                      const isSuper = m.admin_role === "super_admin";

                      return (
                        <td key={m.id} className="py-3 px-4 text-center">
                          {isSuper ? (
                            <span className="inline-flex items-center justify-center w-7 h-7 rounded-xl bg-amber-50 text-amber-600 font-black text-xs">
                              👑
                            </span>
                          ) : (
                            <button
                              disabled={!isSuperAdmin || savingPermissions === m.id}
                              onClick={() => handleToggleExtraPermission(m.id, perm.key)}
                              className={`w-7 h-7 rounded-xl inline-flex items-center justify-center transition-all cursor-pointer ${
                                has
                                  ? "bg-emerald-500 text-white shadow-xs hover:bg-emerald-600"
                                  : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                              }`}
                              title={has ? "Permission active (Cliquer pour retirer)" : "Permission inactive (Cliquer pour accorder)"}
                            >
                              {has ? <Check size={14} className="stroke-3" /> : <X size={14} />}
                            </button>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: Who Does What Summary View */}
      {activeTab === "who_does_what" && (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xs p-6 space-y-6">
          <div>
            <h2 className="font-extrabold text-base text-gray-900">Vue Synthétique : « Qui Gère Quoi ? »</h2>
            <p className="text-xs text-gray-500 mt-1">
              Répartition opérationnelle en temps réel des responsabilités au sein de l&apos;équipe Kalagban.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { title: "🚚 Logistique & Points Relais", perm: "can_manage_logistics", color: "border-orange-200 bg-orange-50/40" },
              { title: "🛡️ Modération & Qualité Produits", perm: "can_moderate_products", color: "border-indigo-200 bg-indigo-50/40" },
              { title: "🏪 Validation des Boutiques", perm: "can_moderate_shops", color: "border-purple-200 bg-purple-50/40" },
              { title: "💰 Comptabilité & Finances", perm: "can_view_finance", color: "border-emerald-200 bg-emerald-50/40" },
              { title: "📣 Marketing & Promotions", perm: "can_manage_marketing", color: "border-pink-200 bg-pink-50/40" },
              { title: "🎧 Support Client & Litiges", perm: "can_view_support", color: "border-teal-200 bg-teal-50/40" },
              { title: "🛡️ Risques & Sécurité", perm: "can_view_risk", color: "border-red-200 bg-red-50/40" },
              { title: "💻 Éditeur Visuel CMS & Technique", perm: "can_edit_cms", color: "border-blue-200 bg-blue-50/40" },
              { title: "👑 Administration Équipe & RBAC", perm: "can_manage_team", color: "border-amber-200 bg-amber-50/40" },
            ].map((domain, dIdx) => {
              const assignedMembers = members.filter(m => m.permissions[domain.perm as keyof AdminPermissions]);

              return (
                <div key={dIdx} className={`p-5 rounded-3xl border ${domain.color} space-y-3`}>
                  <h3 className="font-extrabold text-sm text-gray-900">{domain.title}</h3>
                  <div className="space-y-1.5">
                    {assignedMembers.length > 0 ? (
                      assignedMembers.map(m => (
                        <div key={m.id} className="flex items-center justify-between bg-white px-3 py-2 rounded-xl border border-gray-100 shadow-2xs">
                          <span className="text-xs font-bold text-gray-800">{m.full_name}</span>
                          <span className="text-[10px] font-extrabold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
                            {ROLE_LABELS[m.admin_role]?.label.split(" ")[0]}
                          </span>
                        </div>
                      ))
                    ) : (
                      <p className="text-xs text-gray-400 italic">Aucun responsable assigné actuellement</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL: Inspect User Access */}
      {inspectMember && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-6 shadow-2xl border border-gray-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-black text-lg text-gray-900">Fiche d&apos;Accès &amp; Permissions</h3>
                <p className="text-xs text-gray-500">{inspectMember.full_name}</p>
              </div>
              <button onClick={() => setInspectMember(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 p-4 rounded-2xl space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Rôle Principal :</span>
                  {renderBadge(inspectMember.admin_role)}
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-gray-500">Identifiant :</span>
                  <span className="text-xs font-mono text-gray-700">{inspectMember.id}</span>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-black uppercase text-gray-400 tracking-wider mb-2">
                  Détail des Permissions Actives
                </h4>
                <div className="space-y-1 max-h-60 overflow-y-auto pr-1">
                  {keyPermissionsList.map((p) => {
                    const has = inspectMember.permissions[p.key];
                    return (
                      <div key={p.key} className="flex items-center justify-between py-1.5 px-3 rounded-xl bg-gray-50 text-xs">
                        <span className="font-medium text-gray-700">{p.label}</span>
                        {has ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <CheckCircle2 size={14} /> Accordé
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1">
                            <XCircle size={14} /> Non accordé
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setInspectMember(null)}
                className="w-full py-3 rounded-2xl bg-gray-900 text-white font-bold text-xs hover:bg-black transition-colors cursor-pointer"
              >
                Fermer la Fiche
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: Add New Collaborator */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-6 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <h3 className="font-black text-lg text-gray-900">Nouveau Collaborateur</h3>
                <p className="text-xs text-gray-500">Ajout d&apos;un profil à l&apos;équipe Kalagban</p>
              </div>
              <button onClick={() => setShowAddModal(false)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateMember} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Nom Complet &amp; Prénoms</label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-3.5 text-gray-400" />
                  <input
                    type="text"
                    required
                    placeholder="Ex: Jean Kouassi"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Rôle Principal</label>
                <select
                  value={formData.admin_role}
                  onChange={(e) => setFormData({ ...formData, admin_role: e.target.value as AdminRole })}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-bold focus:outline-hidden focus:border-indigo-500 focus:bg-white transition-all cursor-pointer"
                >
                  {(Object.keys(ROLE_LABELS) as AdminRole[]).map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r].label}</option>
                  ))}
                </select>
                <p className="text-[10px] text-gray-500 mt-1">
                  {ROLE_LABELS[formData.admin_role]?.description}
                </p>
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 font-bold text-xs hover:bg-gray-200 transition-colors cursor-pointer text-gray-700"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 transition-all cursor-pointer shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  {creating ? <Loader2 size={16} className="animate-spin" /> : "Créer le Profil"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
