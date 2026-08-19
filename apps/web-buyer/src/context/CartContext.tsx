"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export interface CartItem {
  id: string; // product id + variant key
  productId: string;
  shopId: string;
  title: string;
  price: number;
  oldPrice?: number | null;
  image?: string | null;
  quantity: number;
  selectedOptions?: Record<string, string>;
  maxStock?: number | null;
}

interface CartContextType {
  cart: CartItem[];
  addToCart: (item: Omit<CartItem, "id">) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, delta: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalPrice: number;
  isCartOpen: boolean;
  setIsCartOpen: (open: boolean) => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider = ({ children }: { children: React.ReactNode }) => {
  const [cart, setCart] = useState<CartItem[]>(() => {
    if (typeof window !== "undefined") {
      try {
        const savedCart = localStorage.getItem("kalagban_buyer_cart");
        if (savedCart) {
          return JSON.parse(savedCart);
        }
      } catch (err) {
        console.error("Error loading cart:", err);
      }
    }
    return [];
  });
  const [isCartOpen, setIsCartOpen] = useState(false);

  // Save cart to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("kalagban_buyer_cart", JSON.stringify(cart));
    } catch (err) {
      console.error("Error saving cart:", err);
    }
  }, [cart]);

  const addToCart = (newItem: Omit<CartItem, "id">) => {
    const maxAllowed = newItem.maxStock !== undefined && newItem.maxStock !== null ? Math.max(0, newItem.maxStock) : Infinity;
    if (maxAllowed <= 0) return;

    const itemKey = `${newItem.productId}-${JSON.stringify(newItem.selectedOptions || {})}`;
    setCart((prev) => {
      const existingIndex = prev.findIndex((item) => item.id === itemKey);
      if (existingIndex > -1) {
        const updated = [...prev];
        const currentStockCap = newItem.maxStock !== undefined && newItem.maxStock !== null 
          ? newItem.maxStock 
          : (updated[existingIndex].maxStock ?? Infinity);

        const newTotalQty = updated[existingIndex].quantity + newItem.quantity;
        updated[existingIndex].quantity = Math.min(newTotalQty, currentStockCap);
        if (newItem.maxStock !== undefined) {
          updated[existingIndex].maxStock = newItem.maxStock;
        }
        return updated;
      } else {
        const initialQty = Math.min(newItem.quantity, maxAllowed);
        return [...prev, { ...newItem, id: itemKey, quantity: initialQty }];
      }
    });
    setIsCartOpen(true);
  };

  const removeFromCart = (id: string) => {
    setCart((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.id === id) {
            const maxAllowed = item.maxStock !== undefined && item.maxStock !== null 
              ? Math.max(1, item.maxStock) 
              : Infinity;

            const newQty = item.quantity + delta;
            if (newQty <= 0) return null;
            return { ...item, quantity: Math.min(newQty, maxAllowed) };
          }
          return item;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
  const totalPrice = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        cart,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalPrice,
        isCartOpen,
        setIsCartOpen,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};
