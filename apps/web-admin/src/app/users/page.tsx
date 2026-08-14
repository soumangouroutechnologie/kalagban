"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { UserCheck, Search, Loader2, Users, ShoppingBag, ShieldCheck, UserPlus, Eye, Ban, CheckCircle2, X } from "lucide-react";

interface UserProfile {
  id: string;
  full_name?: string;
  phone?: string;
  role?: string;
  admin_role?: string;
  status?: string;
  created_at?: string;
}

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState<"all" | "buyer" | "seller" | "admin">("all");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      // 1. Fetch from profiles
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      // 2. Fetch from shops
      const { data: shopsData } = await supabase
        .from("shops")
        .select("*")
        .order("created_at", { ascending: false });

      const unifiedMap = new Map<string, UserProfile>();

      if (profileData && profileData.length > 0) {
        profileData.forEach((p: any) => {
          const name = p.full_name || (p.first_name ? `${p.first_name} ${p.last_name || ''}`.trim() : '');
          unifiedMap.set(p.id, {
            id: p.id,
            full_name: name,
            phone: p.phone || '',
            role: p.role || (p.admin_role ? 'admin' : 'buyer'),
            admin_role: p.admin_role,
            status: p.status || 'active',
            created_at: p.created_at,
          });
        });
      }

      if (shopsData && shopsData.length > 0) {
        shopsData.forEach((s: any) => {
          const sellerId = s.owner_id || s.id;
          const existing = unifiedMap.get(sellerId);
          unifiedMap.set(sellerId, {
            id: sellerId,
            full_name: existing?.full_name ? `${existing.full_name} (${s.name})` : s.name,
            phone: existing?.phone || s.phone || '',
            role: 'seller',
            admin_role: existing?.admin_role,
            status: s.status || existing?.status || 'active',
            created_at: s.created_at || existing?.created_at,
          });
        });
      }

      setUsers(Array.from(unifiedMap.values()));
    } catch (err) {
      console.error("Error fetching users:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();

    // Supabase Live Realtime Subscription for Users & Shops
    const channel = supabase
      .channel("admin_users_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => {
        fetchUsers();
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "shops" }, () => {
        fetchUsers();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleToggleUserStatus = async (user: UserProfile) => {
    const newStatus = user.status === "suspended" ? "active" : "suspended";
    setUpdatingId(user.id);
    try {
      // Update in profiles if exists
      await supabase
        .from("profiles")
        .update({ status: newStatus })
        .eq("id", user.id);

      // Update in shops if seller
      if (user.role === "seller") {
        await supabase
          .from("shops")
          .update({ status: newStatus })
          .or(`id.eq.${user.id},owner_id.eq.${user.id}`);
      }

      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: newStatus } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => (prev ? { ...prev, status: newStatus } : null));
      }
    } catch (err) {
      console.error("Error updating user status:", err);
    } finally {
      setUpdatingId(null);
    }
  };

  const filteredUsers = users.filter((u) => {
    const q = searchTerm.trim().toLowerCase();
    const matchesSearch =
      !q ||
      (u.full_name && u.full_name.toLowerCase().includes(q)) ||
      (u.phone && u.phone.toLowerCase().includes(q)) ||
      (u.role && u.role.toLowerCase().includes(q)) ||
      (u.admin_role && u.admin_role.toLowerCase().includes(q));

    if (!matchesSearch) return false;

    if (activeTab === "buyer") return u.role === "buyer";
    if (activeTab === "seller") return u.role === "seller";
    if (activeTab === "admin") return !!(u.admin_role || u.role === "admin");
    return true;
  });

  const totalBuyers = users.filter((u) => u.role === "buyer").length;
  const totalSellers = users.filter((u) => u.role === "seller").length;
  const totalAdmins = users.filter((u) => u.admin_role || u.role === "admin").length;

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-6xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <UserCheck size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Utilisateurs &amp; Profils</h1>
            <p className="text-xs text-gray-500 font-medium">Gestion et modération des acheteurs, vendeurs et administrateurs en temps réel</p>
          </div>
        </div>

        <button
          onClick={() => alert("Pour créer un utilisateur de l'équipe d'administration avec des autorisations spécifiques, rendez-vous dans l'onglet 'Gestion Équipe & RBAC'.")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-5 py-3 rounded-2xl flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-indigo-600/20 transition-all shrink-0"
        >
          <UserPlus size={16} /> Nouveau Compte Admin
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-slate-100 text-slate-700 rounded-2xl flex items-center justify-center font-black">
            <Users size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 block">Total Utilisateurs</span>
            <span className="text-2xl font-black text-gray-900">{users.length}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center font-black">
            <UserCheck size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 block">Acheteurs Clients</span>
            <span className="text-2xl font-black text-gray-900">{totalBuyers}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black">
            <ShoppingBag size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 block">Vendeurs / Shops</span>
            <span className="text-2xl font-black text-gray-900">{totalSellers}</span>
          </div>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center font-black">
            <ShieldCheck size={20} />
          </div>
          <div>
            <span className="text-xs font-bold text-gray-500 block">Équipe Admin</span>
            <span className="text-2xl font-black text-gray-900">{totalAdmins}</span>
          </div>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
          {[
            { id: "all", label: `Tous les comptes (${users.length})` },
            { id: "buyer", label: `🛒 Acheteurs (${totalBuyers})` },
            { id: "seller", label: `🏪 Vendeurs (${totalSellers})` },
            { id: "admin", label: `👑 Équipe Admin (${totalAdmins})` },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                  : "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="relative max-w-xs w-full">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Rechercher par nom, tél..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-white border border-gray-200 rounded-2xl pl-10 pr-4 py-2.5 text-xs font-medium outline-none focus:border-indigo-600 shadow-2xs"
          />
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden">
        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center">
            <Loader2 className="animate-spin text-indigo-600 w-10 h-10 mb-3" />
            <p className="text-gray-400 text-xs font-bold animate-pulse">Chargement des comptes en temps réel...</p>
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-gray-400 font-medium text-xs">
            Aucun utilisateur correspondant trouvé.
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-indigo-100 text-indigo-700 rounded-xl flex items-center justify-center font-black text-sm shrink-0">
                    {user.full_name ? user.full_name.charAt(0).toUpperCase() : "U"}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-sm text-gray-900">
                        {user.full_name || "Utilisateur Kalagban"}
                      </h3>
                      {user.status === "suspended" && (
                        <span className="bg-red-50 text-red-600 text-[10px] font-extrabold px-2 py-0.5 rounded-md border border-red-200">
                          Bloqué / Suspendu
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 font-medium">{user.phone || "Téléphone non renseigné"}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div>
                    {user.role === "admin" || user.admin_role ? (
                      <span className="bg-amber-50 text-amber-700 font-extrabold px-3 py-1 rounded-full border border-amber-200 text-xs">
                        Admin ({user.admin_role || "super_admin"}) 👑
                      </span>
                    ) : user.role === "seller" ? (
                      <span className="bg-indigo-50 text-indigo-700 font-extrabold px-3 py-1 rounded-full border border-indigo-200 text-xs">
                        Vendeur 🏪
                      </span>
                    ) : (
                      <span className="bg-emerald-50 text-emerald-700 font-bold px-3 py-1 rounded-full border border-emerald-200 text-xs">
                        Acheteur 🛒
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setSelectedUser(user)}
                      className="p-2 bg-slate-100 hover:bg-slate-200 text-gray-700 rounded-xl cursor-pointer transition-colors"
                      title="Voir la fiche"
                    >
                      <Eye size={15} />
                    </button>

                    <button
                      onClick={() => handleToggleUserStatus(user)}
                      disabled={updatingId === user.id}
                      className={`p-2 rounded-xl text-white font-bold cursor-pointer transition-colors flex items-center justify-center ${
                        user.status === "suspended"
                          ? "bg-emerald-600 hover:bg-emerald-700"
                          : "bg-red-500 hover:bg-red-600"
                      }`}
                      title={user.status === "suspended" ? "Réactiver le compte" : "Suspendre / Bloquer le compte"}
                    >
                      {updatingId === user.id ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : user.status === "suspended" ? (
                        <CheckCircle2 size={15} />
                      ) : (
                        <Ban size={15} />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* USER DETAILS MODAL */}
      {selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
            <button
              onClick={() => setSelectedUser(null)}
              className="absolute top-5 right-5 text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition-colors cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-indigo-600 text-white font-black text-xl rounded-2xl flex items-center justify-center shadow-md">
                {selectedUser.full_name ? selectedUser.full_name.charAt(0).toUpperCase() : "U"}
              </div>
              <div>
                <h3 className="font-extrabold text-lg text-gray-900">
                  {selectedUser.full_name || "Utilisateur Kalagban"}
                </h3>
                <p className="text-xs text-gray-500 font-medium">Fiche profil détaillée</p>
              </div>
            </div>

            <div className="space-y-3 bg-slate-50 p-4 rounded-2xl text-xs">
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-500">ID Utilisateur :</span>
                <span className="font-mono text-gray-900 font-extrabold">{selectedUser.id.substring(0, 13)}...</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-500">Téléphone :</span>
                <span className="font-extrabold text-gray-900">{selectedUser.phone || "Non renseigné"}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-500">Rôle Compte :</span>
                <span className="font-black capitalize text-indigo-600">{selectedUser.admin_role ? `Admin (${selectedUser.admin_role})` : selectedUser.role}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-gray-200/60">
                <span className="font-bold text-gray-500">Statut Compte :</span>
                <span className={`font-black ${selectedUser.status === "suspended" ? "text-red-600" : "text-emerald-600"}`}>
                  {selectedUser.status === "suspended" ? "Bloqué / Suspendu 🔴" : "Actif 🟢"}
                </span>
              </div>
              <div className="flex justify-between py-1">
                <span className="font-bold text-gray-500">Inscrit le :</span>
                <span className="font-medium text-gray-700">
                  {selectedUser.created_at ? new Date(selectedUser.created_at).toLocaleDateString("fr-FR") : "Récent"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={() => handleToggleUserStatus(selectedUser)}
                disabled={updatingId === selectedUser.id}
                className={`flex-1 py-3 rounded-2xl font-black text-xs text-white transition-all cursor-pointer flex items-center justify-center gap-2 ${
                  selectedUser.status === "suspended"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-red-600 hover:bg-red-700"
                }`}
              >
                {selectedUser.status === "suspended" ? (
                  <>
                    <CheckCircle2 size={16} /> Réactiver le Compte
                  </>
                ) : (
                  <>
                    <Ban size={16} /> Bloquer / Suspendre le Compte
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
