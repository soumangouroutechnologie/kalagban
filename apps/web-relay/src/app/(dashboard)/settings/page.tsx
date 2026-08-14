"use client";

import { useState, useEffect } from "react";
import { Building2, MapPin, Phone, Clock, Lock, ShieldCheck, MessageSquare, CheckCircle2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

export default function RelaySettingsPage() {
  const [relayCode, setRelayCode] = useState("REL-PARTENAIRE");
  const [name, setName] = useState("Boutique Partenaire Kalagban");
  const [manager, setManager] = useState("Gérant Certifié");
  const [phone, setPhone] = useState("+225 -- -- -- --");
  const [address, setAddress] = useState("Abidjan, Côte d'Ivoire");
  const [hours, setHours] = useState("08:00 - 20:00 (Du Lundi au Samedi)");
  const [capacity, setCapacity] = useState("100");
  const [status, setStatus] = useState("active");

  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestMessage, setRequestMessage] = useState("");
  const [requestSent, setRequestSent] = useState(false);

  useEffect(() => {
    const fetchRelayData = async () => {
      const code = localStorage.getItem("kalagban_relay_code");
      if (code) {
        setRelayCode(code);

        const { data } = await supabase
          .from("pickup_points")
          .select("*")
          .eq("code", code)
          .maybeSingle();

        if (data) {
          if (data.name) setName(data.name);
          if (data.manager_name) setManager(data.manager_name);
          if (data.phone) setPhone(data.phone);
          if (data.address) setAddress(`${data.address} (${data.commune})`);
          if (data.max_capacity) setCapacity(data.max_capacity.toString());
          if (data.status) setStatus(data.status);
        }
      }
    };

    fetchRelayData();
  }, []);

  const handleSendModificationRequest = (e: React.FormEvent) => {
    e.preventDefault();
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setShowRequestModal(false);
      setRequestMessage("");
    }, 3000);
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-gray-900 tracking-tight">Informations & Fiche du Point Relais</h1>
          <p className="text-gray-500 text-xs font-medium mt-1">Fiche officielle enregistrée et auditée par l'Administration Kalagban.</p>
        </div>

        <div className="flex items-center space-x-2 bg-amber-50 border border-amber-200 rounded-2xl p-3 text-xs font-extrabold text-amber-900 shadow-xs">
          <Lock className="w-4 h-4 text-amber-700 shrink-0" />
          <span>Fiche Verrouillée — Modification par Admin uniquement</span>
        </div>
      </div>

      {/* Security Banner Notice */}
      <div className="bg-linear-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 text-white space-y-3 shadow-md border border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
            <Lock className="w-4 h-4" />
          </div>
          <h3 className="font-extrabold text-sm text-white uppercase tracking-wider">Sécurité & Supervision Furtive</h3>
        </div>
        <p className="text-xs text-gray-300 leading-relaxed font-medium">
          Afin de garantir la sécurité des colis et de prévenir toute modification non autorisée, les informations officielles de votre Point Relais (Enseigne, Gérant, Adresse, Capacité) sont **verrouillées** et gérées exclusivement à distance par l'Administration Kalagban. Pour toute mise à jour de vos coordonnées ou de vos horaires, veuillez envoyer une demande officielle.
        </p>
      </div>

      {/* Read-Only Information Form */}
      <div className="bg-white border border-gray-100 rounded-3xl p-6 sm:p-8 shadow-xs space-y-6">
        <div className="flex items-center justify-between pb-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-gray-900 text-sm">Identifiant Officiel : <span className="font-mono text-indigo-600 font-black">{relayCode}</span></h3>
              <p className="text-xs text-gray-500 font-medium">Statut Réseau : <span className="text-emerald-600 font-bold uppercase">{status === "active" ? "Actif & Certifié" : status}</span></p>
            </div>
          </div>

          <ShieldCheck className="w-6 h-6 text-emerald-500" />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Nom de l'Enseigne / Boutique</span>
              <Lock className="w-3 h-3 text-gray-400" />
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={name}
                className="w-full bg-gray-100/80 border border-gray-200 text-gray-700 rounded-2xl p-3.5 pl-11 text-xs font-bold cursor-not-allowed"
              />
              <Building2 className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Nom du Responsable Gérant</span>
              <Lock className="w-3 h-3 text-gray-400" />
            </label>
            <input
              type="text"
              disabled
              value={manager}
              className="w-full bg-gray-100/80 border border-gray-200 text-gray-700 rounded-2xl p-3.5 text-xs font-bold cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Téléphone Joignable</span>
              <Lock className="w-3 h-3 text-gray-400" />
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={phone}
                className="w-full bg-gray-100/80 border border-gray-200 text-gray-700 rounded-2xl p-3.5 pl-11 text-xs font-mono font-bold cursor-not-allowed"
              />
              <Phone className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Capacité Max Stockage (Colis)</span>
              <Lock className="w-3 h-3 text-gray-400" />
            </label>
            <input
              type="text"
              disabled
              value={`${capacity} colis autorisés`}
              className="w-full bg-gray-100/80 border border-gray-200 text-gray-700 rounded-2xl p-3.5 text-xs font-mono font-bold cursor-not-allowed"
            />
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Adresse Précise & Repère géographique</span>
              <Lock className="w-3 h-3 text-gray-400" />
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={address}
                className="w-full bg-gray-100/80 border border-gray-200 text-gray-700 rounded-2xl p-3.5 pl-11 text-xs font-bold cursor-not-allowed"
              />
              <MapPin className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
            </div>
          </div>

          <div className="md:col-span-2 space-y-2">
            <label className="text-xs font-bold text-gray-500 uppercase tracking-wider flex items-center justify-between">
              <span>Horaires d'Ouverture au Public</span>
              <Lock className="w-3 h-3 text-gray-400" />
            </label>
            <div className="relative">
              <input
                type="text"
                disabled
                value={hours}
                className="w-full bg-gray-100/80 border border-gray-200 text-gray-700 rounded-2xl p-3.5 pl-11 text-xs font-bold cursor-not-allowed"
              />
              <Clock className="w-4 h-4 text-gray-400 absolute left-4 top-4" />
            </div>
          </div>
        </div>

        <div className="pt-6 border-t border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-xs font-medium text-gray-500">
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>Fiche sous contrôle continu du siège Kalagban</span>
          </div>

          <button
            type="button"
            onClick={() => setShowRequestModal(true)}
            className="py-3.5 px-6 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-md shadow-indigo-600/20 transition-all flex items-center gap-2 cursor-pointer shrink-0"
          >
            <MessageSquare className="w-4 h-4" />
            <span>Demander une Modification à l'Admin</span>
          </button>
        </div>
      </div>

      {/* Request Modification Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-5 border border-gray-100">
            <div className="flex items-center justify-between pb-3 border-b border-gray-100">
              <h3 className="font-extrabold text-gray-900 text-base">Demande de Modification de Coordonnées</h3>
              <button 
                onClick={() => setShowRequestModal(false)}
                className="text-gray-400 hover:text-gray-600 font-black text-lg"
              >
                ✕
              </button>
            </div>

            {requestSent ? (
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Demande transmise avec succès à l'Équipe Administrateur Kalagban !</span>
              </div>
            ) : (
              <form onSubmit={handleSendModificationRequest} className="space-y-4">
                <p className="text-xs text-gray-500 font-medium">
                  Décrivez la modification souhaitée (ex: Changement de numéro de téléphone, changement d'horaires ou réajustement d'adresse).
                </p>

                <div>
                  <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-2">Message à l'Admin</label>
                  <textarea
                    rows={4}
                    value={requestMessage}
                    onChange={(e) => setRequestMessage(e.target.value)}
                    placeholder="Veuillez modifier mon numéro joignable en +225 07 11..."
                    className="w-full bg-gray-50 border border-gray-200 text-gray-900 rounded-2xl p-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-600/40 focus:border-indigo-600"
                    required
                  ></textarea>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowRequestModal(false)}
                    className="px-5 py-3 rounded-2xl border border-gray-200 text-gray-700 text-xs font-bold hover:bg-gray-50 transition-colors"
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-extrabold shadow-md shadow-indigo-600/20 transition-all"
                  >
                    Envoyer la Demande
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
