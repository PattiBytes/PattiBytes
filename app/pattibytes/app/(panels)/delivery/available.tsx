import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type AvailableOrder = {
  id: string;
  order_number: string;
  restaurant_id: string;
  delivery_address: string;
  total_amount: number;
  delivery_fee: number;
};

export default function AvailableOrders() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [orders, setOrders] = useState<AvailableOrder[]>([]);

  useEffect(() => {
    loadAvailableOrders();

    const channel = supabase
      .channel('available-orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadAvailableOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const loadAvailableOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('status', 'ready')
      .is('delivery_partner_id', null)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  };

  const acceptOrder = async (orderId: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ 
        delivery_partner_id: profile?.id,
        status: 'assigned'
      })
      .eq('id', orderId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', 'Order accepted!');
      loadAvailableOrders();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Available Orders</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <Text style={styles.orderNumber}>#{item.order_number}</Text>
            <Text style={styles.address}>📍 {item.delivery_address}</Text>
            <View style={styles.footer}>
              <Text style={styles.amount}>₹{item.total_amount} • Earn ₹{item.delivery_fee}</Text>
              <Pressable style={styles.acceptBtn} onPress={() => acceptOrder(item.id)}>
                <Text style={styles.acceptText}>Accept</Text>
              </Pressable>
            </View>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { color: COLORS.primary, fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  list: { padding: 16 },
  orderCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  orderNumber: { fontSize: 16, fontWeight: '700', marginBottom: 8 },
  address: { fontSize: 14, marginBottom: 12 },
  footer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  amount: { fontSize: 14, color: COLORS.textLight },
  acceptBtn: { backgroundColor: COLORS.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
  acceptText: { color: '#FFF', fontWeight: '600' }
});
