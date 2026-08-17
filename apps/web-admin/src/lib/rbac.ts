import { useState, useEffect } from "react";
import { supabase } from "./supabase";

export type AdminRole = 
  | "super_admin"
  | "logistician"
  | "accountant"
  | "moderator"
  | "developer"
  | "marketing_manager"
  | "support_agent"
  | "risk_manager"
  | "seller_manager"
  | "analyst";

export interface AdminPermissions {
  // Administration & RBAC
  can_manage_team: boolean;
  can_edit_cms: boolean;

  // Logistique & Relais
  can_manage_logistics: boolean;
  can_view_relays: boolean;
  can_manage_relays: boolean;
  can_view_couriers: boolean;
  can_manage_couriers: boolean;
  can_view_deliveries: boolean;
  can_manage_deliveries: boolean;
  can_assign_couriers: boolean;
  can_manage_routes: boolean;
  can_view_live_map: boolean;
  can_manage_relay_inventory: boolean;
  can_view_logistics_incidents: boolean;

  // Modération & Vendeurs
  can_moderate_products: boolean;
  can_moderate_shops: boolean;

  // Commandes
  can_view_orders: boolean;
  can_manage_orders: boolean;
  can_update_order_status: boolean;
  can_cancel_orders: boolean;
  can_view_customer_order_data: boolean;
  can_view_order_financial_data: boolean;
  can_export_orders: boolean;

  // Finances & Tarification
  can_view_finance: boolean;
  can_view_transactions: boolean;
  can_manage_transactions: boolean;
  can_manage_refunds: boolean;
  can_manage_payouts: boolean;
  can_manage_commissions: boolean;
  can_manage_application_fees: boolean;
  can_view_financial_reports: boolean;
  can_export_financial_reports: boolean;

  // Marketing
  can_manage_marketing: boolean;
  can_manage_campaigns: boolean;
  can_manage_promotions: boolean;
  can_manage_coupons: boolean;
  can_send_marketing_notifications: boolean;
  can_view_marketing_analytics: boolean;

  // Support
  can_view_support: boolean;
  can_manage_support_tickets: boolean;
  can_view_customer_profiles: boolean;
  can_contact_users: boolean;
  can_escalate_support: boolean;

  // Risques & Sécurité
  can_view_risk: boolean;
  can_manage_risk_alerts: boolean;
  can_investigate_risk: boolean;
  can_suspend_accounts: boolean;
  can_view_security_events: boolean;

  // Analytics & Rapports
  can_view_analytics: boolean;
  can_view_logistics_analytics: boolean;
  can_view_financial_analytics: boolean;
  can_view_seller_analytics: boolean;
  can_export_reports: boolean;

  // Notifications & Utilisateurs
  can_send_notifications: boolean;
  can_view_users: boolean;
  can_manage_users: boolean;
}

export const DEFAULT_PERMISSIONS: AdminPermissions = {
  can_manage_team: false,
  can_edit_cms: false,
  can_manage_logistics: false,
  can_view_relays: false,
  can_manage_relays: false,
  can_view_couriers: false,
  can_manage_couriers: false,
  can_view_deliveries: false,
  can_manage_deliveries: false,
  can_assign_couriers: false,
  can_manage_routes: false,
  can_view_live_map: false,
  can_manage_relay_inventory: false,
  can_view_logistics_incidents: false,
  can_moderate_products: false,
  can_moderate_shops: false,
  can_view_orders: true,
  can_manage_orders: false,
  can_update_order_status: false,
  can_cancel_orders: false,
  can_view_customer_order_data: true,
  can_view_order_financial_data: false,
  can_export_orders: false,
  can_view_finance: false,
  can_view_transactions: false,
  can_manage_transactions: false,
  can_manage_refunds: false,
  can_manage_payouts: false,
  can_manage_commissions: false,
  can_manage_application_fees: false,
  can_view_financial_reports: false,
  can_export_financial_reports: false,
  can_manage_marketing: false,
  can_manage_campaigns: false,
  can_manage_promotions: false,
  can_manage_coupons: false,
  can_send_marketing_notifications: false,
  can_view_marketing_analytics: false,
  can_view_support: false,
  can_manage_support_tickets: false,
  can_view_customer_profiles: false,
  can_contact_users: false,
  can_escalate_support: false,
  can_view_risk: false,
  can_manage_risk_alerts: false,
  can_investigate_risk: false,
  can_suspend_accounts: false,
  can_view_security_events: false,
  can_view_analytics: true,
  can_view_logistics_analytics: false,
  can_view_financial_analytics: false,
  can_view_seller_analytics: false,
  can_export_reports: false,
  can_send_notifications: false,
  can_view_users: true,
  can_manage_users: false,
};

export const ROLE_BASE_PERMISSIONS: Record<AdminRole, Partial<AdminPermissions>> = {
  super_admin: {
    can_manage_team: true,
    can_edit_cms: true,
    can_manage_logistics: true,
    can_view_relays: true,
    can_manage_relays: true,
    can_view_couriers: true,
    can_manage_couriers: true,
    can_view_deliveries: true,
    can_manage_deliveries: true,
    can_assign_couriers: true,
    can_manage_routes: true,
    can_view_live_map: true,
    can_manage_relay_inventory: true,
    can_view_logistics_incidents: true,
    can_moderate_products: true,
    can_moderate_shops: true,
    can_view_orders: true,
    can_manage_orders: true,
    can_update_order_status: true,
    can_cancel_orders: true,
    can_view_customer_order_data: true,
    can_view_order_financial_data: true,
    can_export_orders: true,
    can_view_finance: true,
    can_view_transactions: true,
    can_manage_transactions: true,
    can_manage_refunds: true,
    can_manage_payouts: true,
    can_manage_commissions: true,
    can_manage_application_fees: true,
    can_view_financial_reports: true,
    can_export_financial_reports: true,
    can_manage_marketing: true,
    can_manage_campaigns: true,
    can_manage_promotions: true,
    can_manage_coupons: true,
    can_send_marketing_notifications: true,
    can_view_marketing_analytics: true,
    can_view_support: true,
    can_manage_support_tickets: true,
    can_view_customer_profiles: true,
    can_contact_users: true,
    can_escalate_support: true,
    can_view_risk: true,
    can_manage_risk_alerts: true,
    can_investigate_risk: true,
    can_suspend_accounts: true,
    can_view_security_events: true,
    can_view_analytics: true,
    can_view_logistics_analytics: true,
    can_view_financial_analytics: true,
    can_view_seller_analytics: true,
    can_export_reports: true,
    can_send_notifications: true,
    can_view_users: true,
    can_manage_users: true,
  },
  logistician: {
    can_manage_logistics: true,
    can_view_relays: true,
    can_manage_relays: true,
    can_view_couriers: true,
    can_manage_couriers: true,
    can_view_deliveries: true,
    can_manage_deliveries: true,
    can_assign_couriers: true,
    can_manage_routes: true,
    can_view_live_map: true,
    can_manage_relay_inventory: true,
    can_view_logistics_incidents: true,
    can_view_orders: true,
    can_update_order_status: true,
    can_view_customer_order_data: true,
    can_view_analytics: true,
    can_view_logistics_analytics: true,
    can_view_users: true,
  },
  accountant: {
    can_view_finance: true,
    can_view_transactions: true,
    can_manage_transactions: true,
    can_manage_refunds: true,
    can_manage_payouts: true,
    can_manage_commissions: true,
    can_manage_application_fees: true,
    can_view_financial_reports: true,
    can_export_financial_reports: true,
    can_view_orders: true,
    can_view_order_financial_data: true,
    can_export_orders: true,
    can_view_analytics: true,
    can_view_financial_analytics: true,
    can_export_reports: true,
  },
  moderator: {
    can_moderate_products: true,
    can_moderate_shops: true,
    can_view_orders: true,
    can_view_customer_order_data: true,
    can_view_users: true,
    can_view_analytics: true,
    can_view_seller_analytics: true,
  },
  developer: {
    can_edit_cms: true,
    can_send_notifications: true,
    can_view_analytics: true,
  },
  marketing_manager: {
    can_manage_marketing: true,
    can_manage_campaigns: true,
    can_manage_promotions: true,
    can_manage_coupons: true,
    can_send_marketing_notifications: true,
    can_view_marketing_analytics: true,
    can_view_analytics: true,
    can_view_users: true,
  },
  support_agent: {
    can_view_support: true,
    can_manage_support_tickets: true,
    can_view_customer_profiles: true,
    can_contact_users: true,
    can_escalate_support: true,
    can_view_orders: true,
    can_view_customer_order_data: true,
    can_view_users: true,
  },
  risk_manager: {
    can_view_risk: true,
    can_manage_risk_alerts: true,
    can_investigate_risk: true,
    can_suspend_accounts: true,
    can_view_security_events: true,
    can_view_orders: true,
    can_view_users: true,
  },
  seller_manager: {
    can_moderate_shops: true,
    can_view_orders: true,
    can_view_users: true,
    can_view_seller_analytics: true,
  },
  analyst: {
    can_view_analytics: true,
    can_view_logistics_analytics: true,
    can_view_financial_analytics: true,
    can_view_seller_analytics: true,
    can_export_reports: true,
    can_view_orders: true,
  },
};

export const ROLE_LABELS: Record<AdminRole, { label: string; icon: string; description: string; badgeColor: string }> = {
  super_admin: {
    label: "Super Administrateur 👑",
    icon: "Crown",
    description: "Contrôle absolu : Gestion complète de l'équipe, des finances, de la logistique et de la sécurité.",
    badgeColor: "bg-amber-50 text-amber-700 border-amber-200",
  },
  logistician: {
    label: "Logisticien / Logisticienne 🚚",
    icon: "Truck",
    description: "Gestion opérationnelle : Supervision des Points Relais, gestion des livreurs, flux de colis et tournées.",
    badgeColor: "bg-orange-50 text-orange-700 border-orange-200",
  },
  accountant: {
    label: "Comptable / Financier 💰",
    icon: "DollarSign",
    description: "Gestion financière : Trésorerie, commissions Kalagban (5%), frais d'application, payouts et règlements.",
    badgeColor: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  moderator: {
    label: "Modérateur Admin 🛡️",
    icon: "ShieldAlert",
    description: "Qualité & Conformité : Validation des boutiques vendeurs, modération des produits et respect de la charte.",
    badgeColor: "bg-indigo-50 text-indigo-700 border-indigo-200",
  },
  developer: {
    label: "Développeur / Ingénieur 💻",
    icon: "Code",
    description: "Technique & CMS : Personnalisation visuelle du CMS, bannières, intégrations et bon fonctionnement.",
    badgeColor: "bg-blue-50 text-blue-700 border-blue-200",
  },
  marketing_manager: {
    label: "Responsable Marketing 📣",
    icon: "Megaphone",
    description: "Croissance & Ventes : Campagnes promotionnelles, codes promos, ventes flash et notifications push.",
    badgeColor: "bg-pink-50 text-pink-700 border-pink-200",
  },
  support_agent: {
    label: "Agent Support & Litiges 🎧",
    icon: "Headphones",
    description: "Relation Client : Traitement des réclamations, assistance acheteurs/vendeurs et médiation.",
    badgeColor: "bg-teal-50 text-teal-700 border-teal-200",
  },
  risk_manager: {
    label: "Gestionnaire des Risques 🛡️",
    icon: "ShieldCheck",
    description: "Sécurité & Anti-Fraude : Détection des transactions suspectes, blocage d'adresses et investigations.",
    badgeColor: "bg-red-50 text-red-700 border-red-200",
  },
  seller_manager: {
    label: "Gestionnaire Vendeurs 🏪",
    icon: "Store",
    description: "Accompagnement Marchands : Suivi des ventes, onboarding des créateurs et vérification KYC.",
    badgeColor: "bg-purple-50 text-purple-700 border-purple-200",
  },
  analyst: {
    label: "Data Analyst 📊",
    icon: "BarChart3",
    description: "Analyse Stratégique : Métriques de conversion, rapports d'activité et exports de données.",
    badgeColor: "bg-cyan-50 text-cyan-700 border-cyan-200",
  },
};

export function computePermissions(
  role?: string,
  dbPermissions?: Partial<AdminPermissions>,
  customPermissions?: Record<string, boolean>
): AdminPermissions {
  const normalizedRole = (role || "moderator") as AdminRole;
  const base = ROLE_BASE_PERMISSIONS[normalizedRole] || ROLE_BASE_PERMISSIONS.moderator;

  return {
    ...DEFAULT_PERMISSIONS,
    ...base,
    ...(dbPermissions || {}),
    ...(customPermissions || {}),
  };
}

export function useAdminAuth() {
  const [loading, setLoading] = useState(true);
  const [adminUser, setAdminUser] = useState<{
    id: string;
    email: string;
    full_name: string;
    role: AdminRole;
    permissions: AdminPermissions;
  } | null>(null);

  const fetchAuth = async () => {
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
  };

  useEffect(() => {
    fetchAuth();

    const channel = supabase
      .channel("admin_auth_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_permissions" }, () => fetchAuth())
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => fetchAuth())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

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
