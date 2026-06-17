// src/context/CartContext.js
import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { cartAPI } from '../api/services';
import { useAuth } from './AuthContext';

const CartContext = createContext(null);

function cartReducer(state, action) {
  switch (action.type) {
    case 'SET_CART':
      return { items: action.payload.items, total: action.payload.total };
    case 'CLEAR':
      return { items: [], total: 0 };
    default:
      return state;
  }
}

export function CartProvider({ children }) {
  const { user } = useAuth();
  const [cart, dispatch] = useReducer(cartReducer, { items: [], total: 0 });

  const fetchCart = useCallback(async () => {
    if (!user) { dispatch({ type: 'CLEAR' }); return; }
    try {
      const res = await cartAPI.get();
      dispatch({ type: 'SET_CART', payload: res.data });
    } catch { /* silent – user may just be browsing */ }
  }, [user]);

  // Reload cart whenever auth state changes
  useEffect(() => { fetchCart(); }, [fetchCart]);

  const addItem = async (product_id, quantity = 1) => {
    await cartAPI.add({ product_id, quantity });
    fetchCart();
  };

  const updateItem = async (id, quantity) => {
    await cartAPI.update(id, quantity);
    fetchCart();
  };

  const removeItem = async (id) => {
    await cartAPI.remove(id);
    fetchCart();
  };

  const clearCart = async () => {
    await cartAPI.clear();
    dispatch({ type: 'CLEAR' });
  };

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return (
    <CartContext.Provider value={{ cart, itemCount, addItem, updateItem, removeItem, clearCart, fetchCart }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);