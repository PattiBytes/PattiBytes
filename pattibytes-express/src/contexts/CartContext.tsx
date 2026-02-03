'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { cartService, type Cart, type CartItem } from '@/services/cart';

interface CartContextType {
  cart: Cart | null;
  itemCount: number;
  addToCart: (item: CartItem, merchantName: string) => boolean;
  updateQuantity: (itemId: string, quantity: number) => void;
  removeFromCart: (itemId: string) => void;
  clearCart: () => void;
  refreshCart: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [itemCount, setItemCount] = useState(0);

  const refreshCart = useCallback(() => {
    const currentCart = cartService.getCart();
    setCart(currentCart);
    setItemCount(cartService.getItemCount());
  }, []);

  // Initial load + listen for in-app cart updates
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refreshCart();

    const handleCartUpdate = () => refreshCart();
    window.addEventListener('cartUpdated', handleCartUpdate);

    return () => {
      window.removeEventListener('cartUpdated', handleCartUpdate);
    };
  }, [refreshCart]);

  // Sync across tabs/windows (localStorage changes)
  useEffect(() => {
    const handleStorage = (e: StorageEvent) => {
      // Cart is stored under this key in your app. [file:302]
      if (e.key === 'pattibytescart') refreshCart();
    };

    window.addEventListener('storage', handleStorage);
    return () => window.removeEventListener('storage', handleStorage);
  }, [refreshCart]);

  const addToCart = useCallback(
    (item: CartItem, merchantName: string): boolean => {
      const success = cartService.addItem(item, merchantName);
      if (success) refreshCart();
      return success;
    },
    [refreshCart]
  );

  const updateQuantity = useCallback(
    (itemId: string, quantity: number) => {
      cartService.updateItemQuantity(itemId, quantity);
      refreshCart();
    },
    [refreshCart]
  );

  const removeFromCart = useCallback(
    (itemId: string) => {
      cartService.removeItem(itemId);
      refreshCart();
    },
    [refreshCart]
  );

  const clearCart = useCallback(() => {
    cartService.clearCart();

    // Optional: prevents stale checkout state if user clears cart from cart page. [file:302]
    try {
      sessionStorage.removeItem('checkoutdata');
    } catch {
      // ignore
    }

    refreshCart();
  }, [refreshCart]);

  const value = useMemo<CartContextType>(
    () => ({
      cart,
      itemCount,
      addToCart,
      updateQuantity,
      removeFromCart,
      clearCart,
      refreshCart,
    }),
    [cart, itemCount, addToCart, updateQuantity, removeFromCart, clearCart, refreshCart]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
