import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert, Image } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAppDispatch, useAppSelector } from '../../src/store/hooks';
import { addToCart } from '../../src/features/cart/cartSlice';
import { COLORS } from '../../src/lib/constants';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  image_url: string | null;
  is_veg: boolean;
};

type Restaurant = {
  id: string;
  name: string;
  cuisine_type: string[];
  rating: number;
};

export default function RestaurantMenu() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const dispatch = useAppDispatch();
  const { items: cartItems } = useAppSelector((s) => s.cart);
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadRestaurantAndMenu();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const loadRestaurantAndMenu = async () => {
    const { data: restaurantData } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    const { data: menuData } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', id)
      .order('category');

    if (restaurantData) setRestaurant(restaurantData);
    if (menuData) setMenuItems(menuData);
    setLoading(false);
  };

  const handleAddToCart = (item: MenuItem) => {
    dispatch(addToCart({
      id: item.id,
      menu_item_id: item.id,
      name: item.name,
      price: item.price,
      quantity: 1,
      restaurant_id: restaurant!.id,
      restaurant_name: restaurant!.name
    }));
    Alert.alert('Added to cart', `${item.name} added successfully!`);
  };

  const getItemQuantity = (menuItemId: string) => {
    const cartItem = cartItems.find(i => i.menu_item_id === menuItemId);
    return cartItem?.quantity || 0;
  };

  if (loading) {
    return (
      <View style={styles.loading}>
        <Text>Loading menu...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={styles.restaurantName}>{restaurant?.name}</Text>
          <Text style={styles.cuisines}>{restaurant?.cuisine_type.join(' • ')}</Text>
        </View>
        <Pressable style={styles.cartButton} onPress={() => router.push('/cart')}>
          <Text style={styles.cartIcon}>🛒</Text>
          {cartItems.length > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItems.length}</Text>
            </View>
          )}
        </Pressable>
      </View>

      {/* Menu Items */}
      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.menuItem}>
            <View style={styles.itemInfo}>
              <View style={styles.itemHeader}>
                <Text style={styles.vegIcon}>{item.is_veg ? '🟢' : '🔴'}</Text>
                <Text style={styles.itemName}>{item.name}</Text>
              </View>
              <Text style={styles.itemDesc}>{item.description}</Text>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            </View>

            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={styles.itemImage} />
            )}

            {getItemQuantity(item.id) > 0 ? (
              <View style={styles.quantityControls}>
                <Text style={styles.quantityText}>In cart: {getItemQuantity(item.id)}</Text>
              </View>
            ) : (
              <Pressable
                style={[styles.addButton, !item.is_available && styles.addButtonDisabled]}
                onPress={() => handleAddToCart(item)}
                disabled={!item.is_available}
              >
                <Text style={styles.addButtonText}>
                  {item.is_available ? 'ADD +' : 'Not Available'}
                </Text>
              </Pressable>
            )}
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  loading: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  header: { 
    padding: 16, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12
  },
  backButton: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  restaurantName: { fontSize: 18, fontWeight: '700' },
  cuisines: { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  cartButton: { position: 'relative' },
  cartIcon: { fontSize: 28 },
  cartBadge: { 
    position: 'absolute', 
    top: -4, 
    right: -4, 
    backgroundColor: COLORS.primary, 
    borderRadius: 10, 
    minWidth: 20, 
    height: 20, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  cartBadgeText: { color: '#FFF', fontSize: 12, fontWeight: '700' },
  list: { padding: 16 },
  menuItem: { 
    backgroundColor: '#FFF', 
    padding: 16, 
    borderRadius: 12, 
    marginBottom: 12, 
    flexDirection: 'row',
    elevation: 2 
  },
  itemInfo: { flex: 1, marginRight: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 6 },
  vegIcon: { fontSize: 16, marginRight: 6 },
  itemName: { fontSize: 16, fontWeight: '700' },
  itemDesc: { fontSize: 13, color: COLORS.textLight, marginBottom: 8 },
  itemPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  itemImage: { width: 80, height: 80, borderRadius: 8 },
  addButton: { 
    backgroundColor: COLORS.primary, 
    paddingHorizontal: 16, 
    paddingVertical: 8, 
    borderRadius: 8,
    alignSelf: 'flex-start',
    marginTop: 8
  },
  addButtonDisabled: { backgroundColor: '#CCC' },
  addButtonText: { color: '#FFF', fontWeight: '700', fontSize: 14 },
  quantityControls: { alignSelf: 'flex-start', marginTop: 8 },
  quantityText: { fontSize: 13, color: COLORS.primary, fontWeight: '600' }
});
