"use client";

import React from "react";
import { X, ShoppingBag, Plus, Minus, Trash2, ArrowRight } from "lucide-react";
import Link from "next/link";
import { useCart } from "@/context/CartContext";

export default function CartDrawer() {
  const { isCartOpen, setIsCartOpen, cart, updateQuantity, removeFromCart, totalPrice } = useCart();

  if (!isCartOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={() => setIsCartOpen(false)}
      />

      <div className="fixed inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600 font-bold">
                <ShoppingBag size={20} />
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-gray-900">Mon Panier</h2>
                <p className="text-xs text-gray-500 font-medium">{cart.length} produit(s) sélectionné(s)</p>
              </div>
            </div>
            <button 
              onClick={() => setIsCartOpen(false)}
              className="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-200 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Cart Items List */}
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
            {cart.length === 0 ? (
              <div className="my-auto flex flex-col items-center justify-center text-center p-6">
                <div className="w-20 h-20 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 mb-4">
                  <ShoppingBag size={40} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 mb-1">Votre panier est vide</h3>
                <p className="text-sm text-gray-500 max-w-xs mb-6">Découvrez nos superbes produits et ajoutez vos articles préférés.</p>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="bg-indigo-600 text-white font-bold px-6 py-3 rounded-xl shadow-lg shadow-indigo-600/30 hover:bg-indigo-700 transition-all"
                >
                  Explorer la boutique
                </button>
              </div>
            ) : (
              cart.map((item) => (
                <div key={item.id} className="flex gap-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 relative group">
                  <div className="w-20 h-20 bg-white rounded-xl border border-gray-200 overflow-hidden flex items-center justify-center shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                    ) : (
                      <ShoppingBag className="text-gray-300" size={28} />
                    )}
                  </div>
                  <div className="flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start pr-6">
                        <h4 className="font-bold text-gray-900 text-sm line-clamp-1">{item.title}</h4>
                      </div>
                      <p className="text-indigo-600 font-extrabold text-sm mt-0.5">
                        {item.price.toLocaleString("fr-FR")} FCFA
                      </p>
                    </div>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-lg p-1">
                        <button
                          onClick={() => updateQuantity(item.id, -1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Minus size={14} />
                        </button>
                        <span className="text-xs font-extrabold text-gray-900 w-4 text-center">{item.quantity}</span>
                        <button
                          onClick={() => updateQuantity(item.id, 1)}
                          className="w-6 h-6 flex items-center justify-center text-gray-600 hover:bg-gray-100 rounded"
                        >
                          <Plus size={14} />
                        </button>
                      </div>

                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-500 hover:text-red-700 p-1.5 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer / Checkout Button */}
          {cart.length > 0 && (
            <div className="p-6 border-t border-gray-100 bg-white flex flex-col gap-4">
              <div className="flex justify-between items-center text-lg font-black text-gray-900">
                <span>Total</span>
                <span className="text-indigo-600">{totalPrice.toLocaleString("fr-FR")} FCFA</span>
              </div>
              <p className="text-xs text-gray-500">Livraison calculée lors de la validation.</p>
              
              <Link
                href="/checkout"
                onClick={() => setIsCartOpen(false)}
                className="w-full bg-indigo-600 text-white font-bold text-base py-4 rounded-2xl shadow-xl shadow-indigo-600/30 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 group"
              >
                Commander maintenant
                <ArrowRight className="group-hover:translate-x-1 transition-transform" size={18} />
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
