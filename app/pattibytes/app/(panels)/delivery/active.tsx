import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type ActiveOrder = {
  id: string;
  order_number: string;
  status: string;
  delivery_address: string;
  total_amount: number;
};

export default function ActiveDeliveries() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [orders, setOrders] = useState<ActiveOrder[]>([]);

  useEffect(() => {
    loadActiveOrders();

    const channel = supabase
      .channel('active-deliveries')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, loadActiveOrders)
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadActiveOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('delivery_partner_id', profile?.id)
      .in('status', ['assigned', 'picked_up'])
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  };

  const updateStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadActiveOrders();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Active Deliveries</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>#{item.order_number}</Text>
              <Text style={[styles.status, { color: item.status === 'assigned' ? '#2196F3' : '#FF9800' }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.address}>📍 {item.delivery_address}</Text>
            <Text style={styles.amount}>₹{item.total_amount}</Text>

            {item.status === 'assigned' && (
              <Pressable 
                style={styles.actionBtn}
                onPress={() => updateStatus(item.id, 'picked_up')}
              >
                <Text style={styles.actionText}>Mark Picked Up</Text>
              </Pressable>
            )}

            {item.status === 'picked_up' && (
              <Pressable 
                style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                onPress={() => updateStatus(item.id, 'delivered')}
              >
                <Text style={styles.actionText}>Mark Delivered</Text>
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
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { color: COLORS.primary, fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  list: { padding: 16 },
  orderCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderNumber: { fontSize: 16, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '700' },
  address: { fontSize: 14, marginBottom: 8 },
  amount: { fontSize: 16, fontWeight: '700', color: COLORS.primary, marginBottom: 12 },
  actionBtn: { backgroundColor: COLORS.primary, padding: 14, borderRadius: 8, alignItems: 'center' },
  actionText: { color: '#FFF', fontWeight: '600' }
});
