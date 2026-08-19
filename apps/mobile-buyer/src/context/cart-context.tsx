import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface CartItem {
  id: string;
  title: string;
  price: number;
  old_price?: number;
  image_url: string;
  shop_id: string;
  shop_name?: string;
  quantity: number;
  max_stock?: number;
  selected_variant?: Record<string, string>;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: Omit<CartItem, 'quantity'>, quantity?: number) => void;
  removeFromCart: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  totalItems: number;
  totalAmount: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

const CART_STORAGE_KEY = '@kalagban_mobile_cart';

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    loadCart();
  }, []);

  useEffect(() => {
    saveCart(items);
  }, [items]);

  const loadCart = async () => {
    try {
      const stored = await AsyncStorage.getItem(CART_STORAGE_KEY);
      if (stored) {
        setItems(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load cart', e);
    }
  };

  const saveCart = async (cartItems: CartItem[]) => {
    try {
      await AsyncStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cartItems));
    } catch (e) {
      console.error('Failed to save cart', e);
    }
  };

  const addToCart = (newItem: Omit<CartItem, 'quantity'>, qty = 1) => {
    const maxAllowed = newItem.max_stock !== undefined ? Math.max(0, newItem.max_stock) : Infinity;
    if (maxAllowed <= 0) return;

    setItems((prevItems) => {
      const existingIndex = prevItems.findIndex((item) => item.id === newItem.id);
      if (existingIndex > -1) {
        const updated = [...prevItems];
        const currentCap = newItem.max_stock ?? updated[existingIndex].max_stock ?? Infinity;
        const newTotal = updated[existingIndex].quantity + qty;
        updated[existingIndex].quantity = Math.min(newTotal, currentCap);
        if (newItem.max_stock !== undefined) {
          updated[existingIndex].max_stock = newItem.max_stock;
        }
        return updated;
      }
      return [...prevItems, { ...newItem, quantity: Math.min(qty, maxAllowed) }];
    });
  };

  const removeFromCart = (id: string) => {
    setItems((prevItems) => prevItems.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(id);
      return;
    }
    setItems((prevItems) =>
      prevItems.map((item) => {
        if (item.id === id) {
          const cap = item.max_stock !== undefined ? item.max_stock : Infinity;
          return { ...item, quantity: Math.min(quantity, cap) };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setItems([]);
  };

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        totalItems,
        totalAmount,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};
