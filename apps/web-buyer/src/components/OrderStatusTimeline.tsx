"use client";

import React from "react";
import { CheckCircle2, Clock, Truck, Package, MapPin, KeyRound, Sparkles } from "lucide-react";

interface OrderStatusTimelineProps {
  orderStatus: string; // 'pending' | 'confirmed' | 'preparing' | 'in_transit' | 'delivered' | 'cancelled'
  relayStatus?: string | null; // 'pending_deposit' | 'deposited' | 'picked_up'
  deliveryType?: string | null; // 'pickup_point' | 'home_delivery'
  pickupCode?: string | null;
  createdAt?: string;
  updatedAt?: string;
}

export default function OrderStatusTimeline({
  orderStatus = "pending",
  relayStatus,
  deliveryType = "pickup_point",
  pickupCode,
  createdAt,
}: OrderStatusTimelineProps) {
  // Determine Step Index (1 to 6)
  // Step 1: COMMANDE EFFECTUÉE
  // Step 2: EN ATTENTE DE CONFIRMATION
  // Step 3: EN ATTENTE D'EXPÉDITION
  // Step 4: EN COURS D'EXPÉDITION
  // Step 5: PRÊT À RÉCUPÉRER (POINT RELAIS)
  // Step 6: COLIS LIVRÉ

  let currentStep = 1;

  if (orderStatus === "delivered" || relayStatus === "picked_up") {
    currentStep = 6;
  } else if (relayStatus === "deposited") {
    currentStep = 5;
  } else if (orderStatus === "in_transit" || orderStatus === "shipped") {
    currentStep = 4;
  } else if (orderStatus === "preparing" || orderStatus === "processing") {
    currentStep = 3;
  } else if (orderStatus === "confirmed") {
    currentStep = 2;
  } else {
    currentStep = 1;
  }

  const formattedDate = createdAt 
    ? new Date(createdAt).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" })
    : "Aujourd'hui";

  const steps = [
    {
      id: 1,
      title: "COMMANDE EFFECTUÉE",
      description: "Votre commande a été enregistrée avec succès sur Kalagban.",
      date: formattedDate,
      icon: CheckCircle2
    },
    {
      id: 2,
      title: "EN ATTENTE DE CONFIRMATION",
      description: "La boutique partenaire valide la disponibilité de vos articles.",
      date: currentStep >= 2 ? formattedDate : "--",
      icon: Clock
    },
    {
      id: 3,
      title: "EN ATTENTE D'EXPÉDITION",
      description: "Le vendeur prépare votre colis et édite le bordereau de livraison.",
      date: currentStep >= 3 ? formattedDate : "--",
      icon: Package
    },
    {
      id: 4,
      title: "EN COURS D'EXPÉDITION",
      description: "Le livreur achemine votre colis vers votre Point Relais de proximité.",
      date: currentStep >= 4 ? formattedDate : "--",
      icon: Truck
    },
    {
      id: 5,
      title: deliveryType === "pickup_point" ? "PRÊT À RÉCUPÉRER AU POINT RELAIS" : "ARRIVÉE CENTRE DE DISTRIBUTION",
      description: deliveryType === "pickup_point" 
        ? "Votre colis est stocké en étagère sécurisée. Présentez votre Code OTP au gérant."
        : "Le coursier est en route vers votre adresse de livraison.",
      date: currentStep >= 5 ? formattedDate : "--",
      icon: MapPin,
      showOtp: deliveryType === "pickup_point" && pickupCode
    },
    {
      id: 6,
      title: "COLIS LIVRÉ",
      description: "Votre commande a été remise en main propre. Merci pour votre confiance !",
      date: currentStep >= 6 ? formattedDate : "--",
      icon: CheckCircle2
    }
  ];

  return (
    <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-sm space-y-6 font-sans">
      
      {/* Timeline Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-gray-100">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Suivi de Commande en Temps Réel</span>
          </div>
          <h3 className="text-xl font-black text-gray-900 tracking-tight">État de la commande</h3>
        </div>

        {pickupCode && currentStep >= 5 && currentStep < 6 && (
          <div className="px-4 py-2 bg-amber-500 text-slate-950 font-black text-xs rounded-2xl flex items-center gap-2 shadow-md shadow-amber-500/20 border border-amber-400">
            <KeyRound className="w-4 h-4 text-slate-950" />
            <span>CODE OTP : {pickupCode}</span>
          </div>
        )}
      </div>

      {/* Vertical Animated Timeline List (Jumia Inspired) */}
      <div className="relative pl-6 space-y-8 before:absolute before:left-3 before:top-3 before:bottom-3 before:w-1 before:bg-gray-100 before:rounded-full">
        {steps.map((step) => {
          const isDone = currentStep > step.id;
          const isCurrent = currentStep === step.id;
          const isPending = currentStep < step.id;

          return (
            <div key={step.id} className="relative flex items-start group">
              
              {/* Connector Point Icon */}
              <div 
                className={`absolute -left-6 top-0 w-7 h-7 rounded-full flex items-center justify-center transition-all duration-300 ${
                  isDone 
                    ? "bg-emerald-500 text-white shadow-md shadow-emerald-500/30" 
                    : isCurrent 
                    ? "bg-indigo-600 text-white ring-4 ring-indigo-100 animate-pulse shadow-lg shadow-indigo-600/30" 
                    : "bg-gray-100 text-gray-400 border border-gray-200"
                }`}
              >
                {isDone ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="text-xs font-black">{step.id}</span>
                )}
              </div>

              {/* Step Content */}
              <div className="pl-4 space-y-1.5 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span 
                    className={`inline-block px-3 py-1 rounded-lg text-xs font-black tracking-wider uppercase transition-colors ${
                      isDone 
                        ? "bg-emerald-50 text-emerald-700 border border-emerald-200" 
                        : isCurrent 
                        ? "bg-indigo-600 text-white shadow-sm" 
                        : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    {step.title}
                  </span>
                  <span className="text-xs font-mono font-extrabold text-gray-400">{step.date}</span>
                </div>

                <p className={`text-xs leading-relaxed font-medium ${isCurrent ? "text-gray-900 font-bold" : "text-gray-500"}`}>
                  {step.description}
                </p>

                {/* Display OTP Highlight Banner inside Step 5 if active */}
                {step.showOtp && (
                  <div className="mt-3 p-4 rounded-2xl bg-linear-to-r from-amber-500 via-amber-400 to-amber-500 text-slate-950 shadow-md border border-amber-300 space-y-1">
                    <div className="flex items-center gap-2">
                      <KeyRound className="w-4 h-4 text-slate-950" />
                      <span className="text-xs font-black uppercase tracking-wider">Votre Code OTP à présenter au Gérant :</span>
                    </div>
                    <p className="text-3xl font-black font-mono tracking-widest text-slate-950 text-center py-1">
                      {pickupCode}
                    </p>
                  </div>
                )}
              </div>

            </div>
          );
        })}
      </div>

    </div>
  );
}
