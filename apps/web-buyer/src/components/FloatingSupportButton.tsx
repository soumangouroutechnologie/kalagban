"use client";

import React, { useState } from "react";
import { Headphones } from "lucide-react";
import ContactSupportModal from "@/components/ContactSupportModal";

export default function FloatingSupportButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        aria-label="Contacter le Support Kalagban"
        className="fixed bottom-6 right-6 z-40 bg-slate-900 hover:bg-indigo-600 text-white p-3.5 sm:px-4 sm:py-3 rounded-full shadow-xl hover:shadow-indigo-500/25 transition-all flex items-center gap-2 group cursor-pointer border border-white/20 active:scale-95"
      >
        <div className="w-6 h-6 rounded-full bg-indigo-500/30 flex items-center justify-center text-indigo-300 group-hover:text-white transition-colors">
          <Headphones size={15} />
        </div>
        <span className="hidden sm:inline text-xs font-bold tracking-wide">
          Besoin d&apos;aide ?
        </span>
      </button>

      <ContactSupportModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        userType="buyer"
      />
    </>
  );
}
