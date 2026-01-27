import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Alert
} from 'react-native';
import { useRouter } from 'expo-router';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { updateQuantity, removeFromCart, clearCart } from '../src/features/cart/cartSlice';
import { supabase } from '../src/lib/supabase';
import { COLORS } from '../src/lib/constants';

export default function Cart() {
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items } = useAppSelector((s) => s.cart);
  const { profile } = useAppSelector((s) => s.auth);
  
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const deliveryFee = 40;
  const tax = subtotal * 0.05; // 5% GST
  const total = subtotal + deliveryFee + tax;

  const handleQuantityChange = (menuItemId: string, newQty: number) => {
    if (newQty === 0) {
      dispatch(removeFromCart(menuItemId));
    } else {
      dispatch(updateQuantity({ menu_item_id: menuItemId, quantity: newQty }));
    }
  };

  const handleCheckout = async () => {
    if (items.length === 0) return;

    setLoading(true);

    try {
      // Create order
      const orderNumber = `ORD${Date.now()}`;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data: orderData, error: orderError } = await supabase
        .from('orders')
        .insert({
          user_id: profile?.id,
          restaurant_id: items[0].restaurant_id,
          order_number: orderNumber,
          items: JSON.stringify(items),
          subtotal,
          delivery_fee: deliveryFee,
          tax,
          total_amount: total,
          status: 'pending',
          delivery_address: 'User Address', // Will be dynamic
          special_instructions: specialInstructions,
          payment_method: 'cash_on_delivery'
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // Create notification for merchant
      const { data: restaurant } = await supabase
        .from('restaurants')
        .select('merchant_id')
        .eq('id', items[0].restaurant_id)
        .single();

      if (restaurant) {
        await supabase.from('notifications').insert({
          user_id: restaurant.merchant_id,
          title: 'New Order Received! 🎉',
          message: `Order #${orderNumber} - ₹${total}`,
          type: 'order'
        });
      }

      // Create notification for customer
      await supabase.from('notifications').insert({
        user_id: profile?.id,
        title: 'Order Placed Successfully! ✅',
        message: `Your order #${orderNumber} is being prepared`,
        type: 'order'
      });

      dispatch(clearCart());
      
      Alert.alert(
        'Order Placed! 🎉',
        `Order #${orderNumber}\nTotal: ₹${total}`,
        [{ text: 'OK', onPress: () => router.replace('/(tabs)/orders') }]
      );

    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  if (items.length === 0) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable onPress={() => router.back()}>
            <Text style={styles.backButton}>← Back</Text>
          </Pressable>
          <Text style={styles.title}>Cart</Text>
        </View>
        <View style={styles.empty}>
          <Text style={styles.emptyIcon}>🛒</Text>
          <Text style={styles.emptyText}>Your cart is empty</Text>
          <Text style={styles.emptySubtext}>Add items to get started</Text>
          <Pressable style={styles.browseButton} onPress={() => router.back()}>
            <Text style={styles.browseButtonText}>Browse Restaurants</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Cart ({items.length})</Text>
        <Pressable onPress={() => dispatch(clearCart())}>
          <Text style={styles.clearButton}>Clear</Text>
        </Pressable>
      </View>

      <FlatList
        data={items}
        keyExtractor={(item) => item.menu_item_id}
        contentContainerStyle={styles.list}
        ListHeaderComponent={
          <View style={styles.restaurantBanner}>
            <Text style={styles.restaurantIcon}>🏪</Text>
            <Text style={styles.restaurantName}>{items[0].restaurant_name}</Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={styles.cartItem}>
            <View style={styles.itemInfo}>
              <Text style={styles.itemName}>{item.name}</Text>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            </View>

            <View style={styles.quantityControls}>
              <Pressable
                style={styles.qtyButton}
                onPress={() => handleQuantityChange(item.menu_item_id, item.quantity - 1)}
              >
                <Text style={styles.qtyButtonText}>−</Text>
              </Pressable>
              <Text style={styles.quantity}>{item.quantity}</Text>
              <Pressable
                style={styles.qtyButton}
                onPress={() => handleQuantityChange(item.menu_item_id, item.quantity + 1)}
              >
                <Text style={styles.qtyButtonText}>+</Text>
              </Pressable>
            </View>

            <Text style={styles.itemTotal}>₹{item.price * item.quantity}</Text>
          </View>
        )}
        ListFooterComponent={
          <View>
            {/* Special Instructions */}
            <View style={styles.instructionsBox}>
              <Text style={styles.instructionsLabel}>Special Instructions</Text>
              <TextInput
                placeholder="Any special requests? (Optional)"
                value={specialInstructions}
                onChangeText={setSpecialInstructions}
                style={styles.instructionsInput}
                multiline
              />
            </View>

            {/* Bill Summary */}
            <View style={styles.billSummary}>
              <Text style={styles.billTitle}>Bill Summary</Text>
              
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Subtotal</Text>
                <Text style={styles.billValue}>₹{subtotal.toFixed(2)}</Text>
              </View>
              
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Delivery Fee</Text>
                <Text style={styles.billValue}>₹{deliveryFee}</Text>
              </View>
              
              <View style={styles.billRow}>
                <Text style={styles.billLabel}>Taxes (5%)</Text>
                <Text style={styles.billValue}>₹{tax.toFixed(2)}</Text>
              </View>
              
              <View style={[styles.billRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total</Text>
                <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        }
      />

      {/* Checkout Button */}
      <View style={styles.footer}>
        <Pressable
          style={[styles.checkoutButton, loading && styles.checkoutButtonDisabled]}
          onPress={handleCheckout}
          disabled={loading}
        >
          <Text style={styles.checkoutButtonText}>
            {loading ? 'Placing Order...' : `Place Order • ₹${total.toFixed(2)}`}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: 16,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between'
  },
  backButton: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  clearButton: { color: '#F44336', fontSize: 14, fontWeight: '600' },
  empty: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 40 },
  emptyIcon: { fontSize: 80, marginBottom: 16 },
  emptyText: { fontSize: 20, fontWeight: '700', marginBottom: 8 },
  emptySubtext: { fontSize: 14, color: COLORS.textLight, marginBottom: 24 },
  browseButton: { backgroundColor: COLORS.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12 },
  browseButtonText: { color: '#FFF', fontWeight: '700', fontSize: 16 },
  list: { padding: 16 },
  restaurantBanner: {
    backgroundColor: COLORS.primary,
    padding: 16,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16
  },
  restaurantIcon: { fontSize: 32, marginRight: 12 },
  restaurantName: { fontSize: 18, fontWeight: '700', color: '#FFF' },
  cartItem: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    elevation: 2
  },
  itemInfo: { flex: 1 },
  itemName: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  itemPrice: { fontSize: 14, color: COLORS.textLight },
  quantityControls: { flexDirection: 'row', alignItems: 'center', marginRight: 16 },
  qtyButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  qtyButtonText: { color: '#FFF', fontSize: 20, fontWeight: '700' },
  quantity: { fontSize: 16, fontWeight: '700', marginHorizontal: 12, minWidth: 20, textAlign: 'center' },
  itemTotal: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  instructionsBox: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  instructionsLabel: { fontSize: 14, fontWeight: '600', marginBottom: 8 },
  instructionsInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    minHeight: 60,
    textAlignVertical: 'top'
  },
  billSummary: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16 },
  billTitle: { fontSize: 16, fontWeight: '700', marginBottom: 12 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  billLabel: { fontSize: 14, color: COLORS.textLight },
  billValue: { fontSize: 14, fontWeight: '600' },
  totalRow: { marginTop: 8, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
  totalLabel: { fontSize: 16, fontWeight: '700' },
  totalValue: { fontSize: 18, fontWeight: '800', color: COLORS.primary },
  footer: { padding: 16, backgroundColor: '#FFF', borderTopWidth: 1, borderTopColor: COLORS.border },
  checkoutButton: { backgroundColor: COLORS.primary, padding: 16, borderRadius: 12, alignItems: 'center' },
  checkoutButtonDisabled: { opacity: 0.6 },
  checkoutButtonText: { color: '#FFF', fontSize: 18, fontWeight: '700' }
});
