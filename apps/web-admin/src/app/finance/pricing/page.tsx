"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { 
  Sliders, 
  ArrowLeft, 
  Edit3, 
  Save, 
  Clock, 
  ShieldCheck, 
  DollarSign, 
  CheckCircle2, 
  AlertCircle, 
  History, 
  X,
  FileText
} from "lucide-react";
import { useAdminAuth } from "@/lib/rbac";

interface PricingRule {
  id: string;
  rule_key: string;
  name: string;
  description: string;
  category: string;
  value_type: "percentage" | "fixed_amount" | "tiered";
  current_value: number;
  config: any;
  updated_by?: string;
  updated_at?: string;
}

interface PricingAuditLog {
  id: string;
  rule_key: string;
  old_value: number;
  new_value: number;
  admin_name: string;
  reason: string;
  created_at: string;
}

export default function PricingRulesPage() {
  const { user, isSuperAdmin, hasPermission } = useAdminAuth();

  const [rules, setRules] = useState<PricingRule[]>([]);
  const [auditLogs, setAuditLogs] = useState<PricingAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  // Edit Modal State
  const [editingRule, setEditingRule] = useState<PricingRule | null>(null);
  const [newValue, setNewValue] = useState<number>(0);
  const [auditReason, setAuditReason] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchPricingData = async () => {
    setLoading(true);
    try {
      // 1. Fetch rules
      const { data: rulesData } = await supabase
        .from("platform_pricing_rules")
        .select("*")
        .order("created_at", { ascending: true });

      if (rulesData) {
        setRules(rulesData);
      }

      // 2. Fetch audit logs
      const { data: logsData } = await supabase
        .from("pricing_audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(20);

      if (logsData) {
        setAuditLogs(logsData);
      }
    } catch (err) {
      console.error("Error fetching pricing rules:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPricingData();

    const channel = supabase
      .channel("pricing_rules_realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "platform_pricing_rules" }, () => fetchPricingData())
      .on("postgres_changes", { event: "*", schema: "public", table: "pricing_audit_logs" }, () => fetchPricingData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleOpenEdit = (rule: PricingRule) => {
    setEditingRule(rule);
    setNewValue(rule.current_value);
    setAuditReason("");
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRule) return;
    if (!auditReason.trim()) {
      alert("Veuillez obligatoirement justifier le motif de cette modification tarifaire.");
      return;
    }

    setSaving(true);
    try {
      const adminName = user?.full_name || "Admin Kalagban";

      // 1. Update rule
      await supabase
        .from("platform_pricing_rules")
        .update({
          current_value: newValue,
          updated_by: adminName,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingRule.id);

      // 2. Write audit log
      await supabase
        .from("pricing_audit_logs")
        .insert({
          rule_key: editingRule.rule_key,
          old_value: editingRule.current_value,
          new_value: newValue,
          admin_id: user?.id || null,
          admin_name: adminName,
          reason: auditReason.trim(),
        });

      setEditingRule(null);
      fetchPricingData();
    } catch (err: any) {
      alert("Erreur lors de la mise à jour : " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="flex-1 p-6 sm:p-10 max-w-7xl w-full mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-gray-100 shadow-xs">
        <div className="flex items-center gap-3">
          <Link
            href="/finance"
            className="p-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-2xl transition-colors"
            title="Retour aux finances"
          >
            <ArrowLeft size={18} />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-gray-900 tracking-tight">Tarification &amp; Barèmes de Commission</h1>
            <p className="text-xs text-gray-500 font-medium">
              Configuration dynamique des taux, frais de service et traçabilité d&apos;audit
            </p>
          </div>
        </div>
      </div>

      {/* Rules Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {rules.map((rule) => (
          <div key={rule.id} className="bg-white p-6 rounded-3xl border border-gray-100 shadow-xs space-y-4 flex flex-col justify-between">
            <div className="space-y-2">
              <div className="flex items-start justify-between gap-2">
                <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700">
                  {rule.category}
                </span>
                {rule.updated_at && (
                  <span className="text-[10px] text-gray-400 font-medium">
                    Modifié le {new Date(rule.updated_at).toLocaleDateString("fr-FR")}
                  </span>
                )}
              </div>

              <h3 className="font-extrabold text-sm text-gray-900">{rule.name}</h3>
              <p className="text-xs text-gray-500">{rule.description}</p>
            </div>

            <div className="pt-3 border-t border-gray-100 flex items-baseline justify-between">
              <div>
                <span className="text-2xl font-black text-gray-900">
                  {rule.current_value}
                </span>
                <span className="text-xs font-bold text-gray-500 ml-1">
                  {rule.value_type === "percentage" ? "%" : "FCFA"}
                </span>
              </div>

              <button
                onClick={() => handleOpenEdit(rule)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Edit3 size={14} /> Modifier le Taux
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Pricing Audit Log Trail */}
      <div className="bg-white rounded-3xl border border-gray-100 shadow-xs overflow-hidden p-6 space-y-4">
        <div className="flex items-center gap-2">
          <History size={18} className="text-indigo-600" />
          <h2 className="font-extrabold text-base text-gray-900">
            Journal d&apos;Audit des Changements Tarifaires
          </h2>
        </div>
        <p className="text-xs text-gray-500">
          Historique immuable consignant chaque révision de barème avec justificatif d&apos;autorisation.
        </p>

        <div className="overflow-x-auto pt-2">
          <table className="w-full text-left text-xs text-gray-600">
            <thead className="bg-gray-50 text-[10px] font-black text-gray-400 uppercase tracking-wider border-b border-gray-100">
              <tr>
                <th className="py-3 px-4">Date &amp; Heure</th>
                <th className="py-3 px-4">Règle Tarifaire</th>
                <th className="py-3 px-4">Ancien Taux → Nouveau Taux</th>
                <th className="py-3 px-4">Responsable</th>
                <th className="py-3 px-4">Motif Justificatif</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {auditLogs.length > 0 ? (
                auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50/60">
                    <td className="py-3.5 px-4 font-mono text-[11px] text-gray-500">
                      {new Date(log.created_at).toLocaleDateString("fr-FR")} à {new Date(log.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-900">
                      {log.rule_key}
                    </td>
                    <td className="py-3.5 px-4 font-black text-indigo-600">
                      {log.old_value} → {log.new_value}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-gray-700">
                      {log.admin_name}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600 italic">
                      « {log.reason} »
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                    Aucune modification enregistrée à ce jour.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: Edit Pricing Rule */}
      {editingRule && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full space-y-4 shadow-2xl border border-gray-100">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <div>
                <h3 className="font-black text-lg text-gray-900">Modifier le Barème</h3>
                <p className="text-xs text-gray-500">{editingRule.name}</p>
              </div>
              <button onClick={() => setEditingRule(null)} className="text-gray-400 hover:text-gray-700 cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Nouvelle Valeur ({editingRule.value_type === "percentage" ? "%" : "FCFA"})
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={newValue}
                  onChange={(e) => setNewValue(parseFloat(e.target.value) || 0)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-sm font-black focus:outline-hidden focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Motif d&apos;Audit Obligatoire
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Ex: Décision du conseil d'administration du 17/08 - Promotion rentrée des classes..."
                  value={auditReason}
                  onChange={(e) => setAuditReason(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-gray-50 border border-gray-200 text-xs font-semibold focus:outline-hidden focus:border-indigo-500"
                />
                <p className="text-[10px] text-gray-400 mt-1">
                  🔒 Cette raison sera consignée de manière immuable dans le registre d&apos;audit.
                </p>
              </div>

              <div className="flex gap-3 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setEditingRule(null)}
                  className="flex-1 py-3 rounded-2xl bg-gray-100 font-bold text-xs hover:bg-gray-200 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-3 rounded-2xl bg-indigo-600 text-white font-bold text-xs hover:bg-indigo-700 shadow-md cursor-pointer"
                >
                  {saving ? "Enregistrement..." : "Valider & Auditer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
