"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";
import { 
  AdminRole, 
  AdminPermissions, 
  DEFAULT_PERMISSIONS, 
  computePermissions 
} from "./rbac";

export function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{
    id: string;
    email: string;
    full_name: string;
    role: AdminRole;
    permissions: AdminPermissions;
  } | null>(null);

  const fetchAuth = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        setAdminUser(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, full_name, role, admin_role")
        .eq("id", session.user.id)
        .single();

      const effectiveRole = (profile?.admin_role || "super_admin") as AdminRole;

      const { data: permRow } = await supabase
        .from("admin_permissions")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      const permissions = computePermissions(
        effectiveRole,
        permRow || undefined,
        (permRow?.custom_permissions as Record<string, boolean>) || undefined
      );

      setAdminUser({
        id: session.user.id,
        email: session.user.email || "",
        full_name: profile?.full_name || "Administrateur Kalagban",
        role: effectiveRole,
        permissions,
      });
    } catch (err) {
      console.error("Error in useAdminAuth:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchAuth();
    }, 0);

    const channelId = `admin_auth_${Math.random().toString(36).substring(2, 9)}`;
    const channel = supabase
      .channel(channelId)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_permissions" }, () => fetchAuth())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAuth())
      .subscribe();

    return () => {
      clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [fetchAuth]);

  const hasPermission = (key: keyof AdminPermissions): boolean => {
    if (!adminUser) return false;
    if (adminUser.role === "super_admin") return true;
    return !!adminUser.permissions[key];
  };

  return {
    user: adminUser,
    role: adminUser?.role || "moderator",
    permissions: adminUser?.permissions || DEFAULT_PERMISSIONS,
    hasPermission,
    isSuperAdmin: adminUser?.role === "super_admin",
    loading,
    refresh: fetchAuth,
  };
}
