"use client";

import React, { useState, useEffect } from "react";
import { SlidersHorizontal, RotateCcw, Banknote, Sparkles, X, Check } from "lucide-react";

interface PriceRangeFilterProps {
  minPrice: number;
  maxPrice: number;
  minLimit: number;
  maxLimit: number;
  onChange: (min: number, max: number) => void;
  onReset: () => void;
  productCount?: number;
  isMobileModal?: boolean;
  onCloseMobile?: () => void;
}

export function formatFcfa(amount: number): string {
  return amount.toLocaleString("fr-FR").replace(/\s/g, " ") + " FCFA";
}

export default function PriceRangeFilter({
  minPrice,
  maxPrice,
  minLimit,
  maxLimit,
  onChange,
  onReset,
  productCount,
  isMobileModal = false,
  onCloseMobile,
}: PriceRangeFilterProps) {
  const [localMin, setLocalMin] = useState(minPrice);
  const [localMax, setLocalMax] = useState(maxPrice);
  const [inputMinStr, setInputMinStr] = useState(minPrice.toString());
  const [inputMaxStr, setInputMaxStr] = useState(maxPrice.toString());

  // Synchronize when external bounds change
  useEffect(() => {
    setLocalMin(minPrice);
    setLocalMax(maxPrice);
    setInputMinStr(minPrice.toString());
    setInputMaxStr(maxPrice.toString());
  }, [minPrice, maxPrice]);

  const step = Math.max(500, Math.floor((maxLimit - minLimit) / 100) || 500);

  const rangeSpan = Math.max(maxLimit - minLimit, 1);
  const minPercent = Math.min(Math.max(((localMin - minLimit) / rangeSpan) * 100, 0), 100);
  const maxPercent = Math.min(Math.max(((localMax - minLimit) / rangeSpan) * 100, 0), 100);

  const isFiltered = localMin > minLimit || localMax < maxLimit;

  // Handle Slider Min Change
  const handleMinSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.min(Number(e.target.value), localMax - step);
    const clamped = Math.max(val, minLimit);
    setLocalMin(clamped);
    setInputMinStr(clamped.toString());
    onChange(clamped, localMax);
  };

  // Handle Slider Max Change
  const handleMaxSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Math.max(Number(e.target.value), localMin + step);
    const clamped = Math.min(val, maxLimit);
    setLocalMax(clamped);
    setInputMaxStr(clamped.toString());
    onChange(localMin, clamped);
  };

  // Handle Manual Min Input Blur/Commit
  const handleMinInputCommit = () => {
    let parsed = parseInt(inputMinStr.replace(/\D/g, ""), 10);
    if (isNaN(parsed)) parsed = minLimit;
    parsed = Math.max(minLimit, Math.min(parsed, localMax - step));
    setLocalMin(parsed);
    setInputMinStr(parsed.toString());
    onChange(parsed, localMax);
  };

  // Handle Manual Max Input Blur/Commit
  const handleMaxInputCommit = () => {
    let parsed = parseInt(inputMaxStr.replace(/\D/g, ""), 10);
    if (isNaN(parsed)) parsed = maxLimit;
    parsed = Math.min(maxLimit, Math.max(parsed, localMin + step));
    setLocalMax(parsed);
    setInputMaxStr(parsed.toString());
    onChange(localMin, parsed);
  };

  // Quick Preset Handlers
  const handlePreset = (min: number, max: number) => {
    const clampedMin = Math.max(minLimit, min);
    const clampedMax = Math.min(maxLimit, max);
    setLocalMin(clampedMin);
    setLocalMax(clampedMax);
    setInputMinStr(clampedMin.toString());
    setInputMaxStr(clampedMax.toString());
    onChange(clampedMin, clampedMax);
  };

  const content = (
    <div className="flex flex-col gap-4">
      {/* Header with Title & Reset Button */}
      <div className="flex items-center justify-between pb-3 border-b border-gray-100/90">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-xl bg-purple-50 text-[#6d28d9] flex items-center justify-center shadow-xs">
            <Banknote size={15} />
          </div>
          <div>
            <h3 className="text-xs font-black uppercase tracking-wider text-gray-900">
              Budget &amp; Prix
            </h3>
            <span className="text-[10px] text-gray-400 font-medium">
              {productCount !== undefined ? `${productCount} article(s) trouvé(s)` : "Filtrage dynamique"}
            </span>
          </div>
        </div>

        {isFiltered && (
          <button
            onClick={() => {
              setLocalMin(minLimit);
              setLocalMax(maxLimit);
              setInputMinStr(minLimit.toString());
              setInputMaxStr(maxLimit.toString());
              onReset();
            }}
            title="Réinitialiser le filtre de prix"
            className="text-[11px] font-extrabold text-[#6d28d9] hover:text-purple-800 bg-purple-50 hover:bg-purple-100 px-2.5 py-1 rounded-lg transition-all flex items-center gap-1 cursor-pointer animate-fade-in"
          >
            <RotateCcw size={12} /> Réinit.
          </button>
        )}
      </div>

      {/* Floating Dynamic Value Tags */}
      <div className="bg-linear-to-r from-purple-50/80 via-[#f5f3ff] to-indigo-50/80 rounded-2xl p-3 border border-purple-100/70 flex items-center justify-between shadow-xs">
        <div className="flex flex-col">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-600/80">Min</span>
          <span className="text-xs sm:text-sm font-black text-gray-900 tracking-tight">
            {formatFcfa(localMin)}
          </span>
        </div>

        <div className="h-6 w-px bg-purple-200/80 mx-2" />

        <div className="flex flex-col text-right">
          <span className="text-[9px] font-extrabold uppercase tracking-wider text-purple-600/80">Max</span>
          <span className="text-xs sm:text-sm font-black text-[#6d28d9] tracking-tight">
            {formatFcfa(localMax)}
          </span>
        </div>
      </div>

      {/* Modern Interactive Dual Range Slider */}
      <div className="py-2 px-1">
        <div className="kalagban-range-slider relative h-8 flex items-center">
          {/* Inactive Background Rail */}
          <div className="absolute w-full h-2 bg-gray-200/80 rounded-full overflow-hidden" />

          {/* Active Highlighted Purple Track */}
          <div
            className="absolute h-2 bg-linear-to-r from-[#6d28d9] via-[#7c3aed] to-indigo-600 rounded-full shadow-xs transition-all"
            style={{
              left: `${minPercent}%`,
              width: `${Math.max(maxPercent - minPercent, 0)}%`,
            }}
          />

          {/* Dual Range Native Sliders */}
          <input
            type="range"
            min={minLimit}
            max={maxLimit}
            step={step}
            value={localMin}
            onChange={handleMinSliderChange}
            className="kalagban-range-input z-30"
            aria-label="Prix minimum"
          />

          <input
            type="range"
            min={minLimit}
            max={maxLimit}
            step={step}
            value={localMax}
            onChange={handleMaxSliderChange}
            className="kalagban-range-input z-40"
            aria-label="Prix maximum"
          />
        </div>

        {/* Dynamic Bounds Labels */}
        <div className="flex justify-between text-[10px] font-bold text-gray-400 px-0.5 mt-0.5">
          <span>{minLimit.toLocaleString("fr-FR")} F</span>
          <span>{maxLimit.toLocaleString("fr-FR")} F</span>
        </div>
      </div>

      {/* Manual Input Fields (Min - Max) */}
      <div className="grid grid-cols-2 gap-2.5 pt-1">
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500">De (FCFA)</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={inputMinStr}
              onChange={(e) => setInputMinStr(e.target.value)}
              onBlur={handleMinInputCommit}
              onKeyDown={(e) => e.key === "Enter" && handleMinInputCommit()}
              placeholder={minLimit.toString()}
              className="w-full bg-gray-50/90 border border-gray-200/90 text-gray-900 font-bold text-xs rounded-xl py-2 px-2.5 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/40 focus:border-[#6d28d9] transition-all"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-gray-500">À (FCFA)</label>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={inputMaxStr}
              onChange={(e) => setInputMaxStr(e.target.value)}
              onBlur={handleMaxInputCommit}
              onKeyDown={(e) => e.key === "Enter" && handleMaxInputCommit()}
              placeholder={maxLimit.toString()}
              className="w-full bg-gray-50/90 border border-gray-200/90 text-gray-900 font-bold text-xs rounded-xl py-2 px-2.5 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/40 focus:border-[#6d28d9] transition-all"
            />
          </div>
        </div>
      </div>

      {/* Quick Select Presets Chips */}
      <div className="flex flex-col gap-1.5 pt-2 border-t border-gray-100/90">
        <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400">
          Sélections Rapides
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => handlePreset(minLimit, 10000)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100/80 hover:bg-purple-100 hover:text-[#6d28d9] text-gray-600 transition-colors cursor-pointer border border-transparent hover:border-purple-200"
          >
            &lt; 10 000 F
          </button>
          <button
            type="button"
            onClick={() => handlePreset(10000, 50000)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100/80 hover:bg-purple-100 hover:text-[#6d28d9] text-gray-600 transition-colors cursor-pointer border border-transparent hover:border-purple-200"
          >
            10k - 50k F
          </button>
          <button
            type="button"
            onClick={() => handlePreset(50000, 200000)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100/80 hover:bg-purple-100 hover:text-[#6d28d9] text-gray-600 transition-colors cursor-pointer border border-transparent hover:border-purple-200"
          >
            50k - 200k F
          </button>
          <button
            type="button"
            onClick={() => handlePreset(200000, maxLimit)}
            className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-gray-100/80 hover:bg-purple-100 hover:text-[#6d28d9] text-gray-600 transition-colors cursor-pointer border border-transparent hover:border-purple-200"
          >
            &gt; 200k F
          </button>
        </div>
      </div>
    </div>
  );

  if (isMobileModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/60 backdrop-blur-xs animate-fade-in">
        <div className="w-full max-w-md bg-white rounded-t-3xl sm:rounded-3xl p-6 border border-gray-100 shadow-2xl animate-slide-up flex flex-col gap-4">
          <div className="flex items-center justify-between pb-2">
            <span className="text-base font-black text-gray-900 flex items-center gap-2">
              <SlidersHorizontal size={18} className="text-[#6d28d9]" /> Filtrer par Prix
            </span>
            <button
              onClick={onCloseMobile}
              className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>

          {content}

          <button
            onClick={onCloseMobile}
            className="w-full mt-2 bg-[#6d28d9] hover:bg-[#5b21b6] text-white font-extrabold py-3.5 rounded-2xl shadow-lg shadow-purple-500/25 flex items-center justify-center gap-2 text-sm cursor-pointer transition-all"
          >
            <Check size={16} /> Appliquer le filtre
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-3xl p-5 border border-gray-100/90 shadow-xs">
      {content}
    </div>
  );
}
