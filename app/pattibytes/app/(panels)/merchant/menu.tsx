import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  Modal,
  Alert,
  Switch
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  category: string;
  is_available: boolean;
  is_veg: boolean;
};

export default function MerchantMenu() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [editing, setEditing] = useState<MenuItem | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [category, setCategory] = useState('');
  const [isVeg, setIsVeg] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);

  useEffect(() => {
    loadMenu();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadMenu = async () => {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('merchant_id', profile?.id)
      .single();

    if (!restaurant) return;

    const { data } = await supabase
      .from('menu_items')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('category');

    if (data) setMenuItems(data);
  };

  const openAddModal = () => {
    setEditing(null);
    setName('');
    setDescription('');
    setPrice('');
    setCategory('');
    setIsVeg(true);
    setIsAvailable(true);
    setModalVisible(true);
  };

  const openEditModal = (item: MenuItem) => {
    setEditing(item);
    setName(item.name);
    setDescription(item.description);
    setPrice(item.price.toString());
    setCategory(item.category);
    setIsVeg(item.is_veg);
    setIsAvailable(item.is_available);
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (!name || !price || !category) {
      Alert.alert('Error', 'Please fill all required fields');
      return;
    }

    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('merchant_id', profile?.id)
      .single();

    if (!restaurant) return;

    const menuData = {
      restaurant_id: restaurant.id,
      name,
      description,
      price: parseFloat(price),
      category,
      is_veg: isVeg,
      is_available: isAvailable
    };

    if (editing) {
      // Update
      const { error } = await supabase
        .from('menu_items')
        .update(menuData)
        .eq('id', editing.id);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Menu item updated!');
        setModalVisible(false);
        loadMenu();
      }
    } else {
      // Create
      const { error } = await supabase
        .from('menu_items')
        .insert(menuData);

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Menu item added!');
        setModalVisible(false);
        loadMenu();
      }
    }
  };

  const handleDelete = async (id: string) => {
    Alert.alert(
      'Delete Item',
      'Are you sure you want to delete this item?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const { error } = await supabase
              .from('menu_items')
              .delete()
              .eq('id', id);

            if (error) {
              Alert.alert('Error', error.message);
            } else {
              loadMenu();
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Menu Management</Text>
        <Pressable onPress={openAddModal}>
          <Text style={styles.addButton}>+ Add</Text>
        </Pressable>
      </View>

      <FlatList
        data={menuItems}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.menuItem}>
            <View style={styles.itemHeader}>
              <Text style={styles.vegIcon}>{item.is_veg ? '🟢' : '🔴'}</Text>
              <View style={{ flex: 1 }}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.itemCategory}>{item.category}</Text>
              </View>
              <Text style={styles.itemPrice}>₹{item.price}</Text>
            </View>

            <Text style={styles.itemDesc}>{item.description}</Text>

            <View style={styles.itemFooter}>
              <Text style={[styles.availability, { color: item.is_available ? '#4CAF50' : '#F44336' }]}>
                {item.is_available ? '✓ Available' : '✗ Not Available'}
              </Text>
              <View style={styles.actions}>
                <Pressable onPress={() => openEditModal(item)}>
                  <Text style={styles.editBtn}>Edit</Text>
                </Pressable>
                <Pressable onPress={() => handleDelete(item.id)}>
                  <Text style={styles.deleteBtn}>Delete</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      />

      {/* Add/Edit Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{editing ? 'Edit Item' : 'Add New Item'}</Text>

            <TextInput
              placeholder="Item Name *"
              value={name}
              onChangeText={setName}
              style={styles.input}
            />

            <TextInput
              placeholder="Description"
              value={description}
              onChangeText={setDescription}
              style={styles.input}
              multiline
            />

            <TextInput
              placeholder="Price *"
              value={price}
              onChangeText={setPrice}
              keyboardType="numeric"
              style={styles.input}
            />

            <TextInput
              placeholder="Category * (e.g., Starters, Main Course)"
              value={category}
              onChangeText={setCategory}
              style={styles.input}
            />

            <View style={styles.switchRow}>
              <Text>Vegetarian</Text>
              <Switch value={isVeg} onValueChange={setIsVeg} />
            </View>

            <View style={styles.switchRow}>
              <Text>Available</Text>
              <Switch value={isAvailable} onValueChange={setIsAvailable} />
            </View>

            <View style={styles.modalActions}>
              <Pressable
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalButton, styles.saveButton]}
                onPress={handleSave}
              >
                <Text style={styles.saveButtonText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF'
  },
  backButton: { color: COLORS.primary, fontSize: 16, fontWeight: '600' },
  title: { fontSize: 20, fontWeight: '700', flex: 1, textAlign: 'center' },
  addButton: { color: COLORS.primary, fontSize: 16, fontWeight: '700' },
  list: { padding: 16 },
  menuItem: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  vegIcon: { fontSize: 16, marginRight: 8 },
  itemName: { fontSize: 16, fontWeight: '700', marginBottom: 2 },
  itemCategory: { fontSize: 12, color: COLORS.textLight },
  itemPrice: { fontSize: 16, fontWeight: '700', color: COLORS.primary },
  itemDesc: { fontSize: 14, color: COLORS.textLight, marginBottom: 12 },
  itemFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  availability: { fontSize: 13, fontWeight: '600' },
  actions: { flexDirection: 'row', gap: 16 },
  editBtn: { color: '#2196F3', fontWeight: '600' },
  deleteBtn: { color: '#F44336', fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 16, padding: 24 },
  modalTitle: { fontSize: 20, fontWeight: '700', marginBottom: 20, textAlign: 'center' },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    marginBottom: 12
  },
  switchRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 12 },
  modalButton: { flex: 1, padding: 14, borderRadius: 8, alignItems: 'center' },
  cancelButton: { backgroundColor: '#E0E0E0' },
  saveButton: { backgroundColor: COLORS.primary },
  cancelButtonText: { fontWeight: '600' },
  saveButtonText: { color: '#FFF', fontWeight: '600' }
});
