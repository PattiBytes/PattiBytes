import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type CartItem = {
  id: string;
  menu_item_id: string;
  name: string;
  price: number;
  quantity: number;
  restaurant_id: string;
  restaurant_name: string;
  special_instructions?: string;
};

type CartState = {
  items: CartItem[];
  restaurant_id: string | null;
};

const initialState: CartState = {
  items: [],
  restaurant_id: null
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existing = state.items.find(i => i.menu_item_id === action.payload.menu_item_id);
      
      if (existing) {
        existing.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
        state.restaurant_id = action.payload.restaurant_id;
      }
    },
    updateQuantity: (state, action: PayloadAction<{ menu_item_id: string; quantity: number }>) => {
      const item = state.items.find(i => i.menu_item_id === action.payload.menu_item_id);
      if (item) {
        item.quantity = action.payload.quantity;
      }
    },
    removeFromCart: (state, action: PayloadAction<string>) => {
      state.items = state.items.filter(i => i.menu_item_id !== action.payload);
      if (state.items.length === 0) {
        state.restaurant_id = null;
      }
    },
    clearCart: (state) => {
      state.items = [];
      state.restaurant_id = null;
    },
    setCart: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      state.restaurant_id = action.payload[0]?.restaurant_id || null;
    }
  }
});

export const { addToCart, updateQuantity, removeFromCart, clearCart, setCart } = cartSlice.actions;
export default cartSlice.reducer;
