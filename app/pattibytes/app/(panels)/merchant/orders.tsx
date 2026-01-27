import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  delivery_address: string;
  items: any[];
};

export default function MerchantOrders() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [orders, setOrders] = useState<Order[]>([]);
  const [filter, setFilter] = useState<'pending' | 'active' | 'completed'>('pending');

  useEffect(() => {
    loadOrders();
    
    // Real-time subscription
    const channel = supabase
      .channel('merchant-orders')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'orders',
          filter: `restaurant_id=eq.${profile?.id}`
        }, 
        () => loadOrders()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  const loadOrders = async () => {
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id')
      .eq('merchant_id', profile?.id)
      .single();

    if (!restaurant) return;

    let query = supabase
      .from('orders')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .order('created_at', { ascending: false });

    if (filter === 'pending') {
      query = query.in('status', ['pending', 'confirmed']);
    } else if (filter === 'active') {
      query = query.in('status', ['preparing', 'ready', 'assigned', 'picked_up']);
    } else {
      query = query.in('status', ['delivered', 'cancelled']);
    }

    const { data } = await query;
    if (data) setOrders(data);
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase
      .from('orders')
      .update({ status: newStatus })
      .eq('id', orderId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      loadOrders();
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#FFA000';
      case 'confirmed': return '#4CAF50';
      case 'preparing': return '#2196F3';
      case 'ready': return '#8BC34A';
      case 'delivered': return '#4CAF50';
      case 'cancelled': return '#F44336';
      default: return COLORS.textLight;
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Orders</Text>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        <Pressable 
          style={[styles.filterTab, filter === 'pending' && styles.filterTabActive]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.filterTextActive]}>
            Pending
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.filterTab, filter === 'active' && styles.filterTabActive]}
          onPress={() => setFilter('active')}
        >
          <Text style={[styles.filterText, filter === 'active' && styles.filterTextActive]}>
            Active
          </Text>
        </Pressable>
        <Pressable 
          style={[styles.filterTab, filter === 'completed' && styles.filterTabActive]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.filterTextActive]}>
            Completed
          </Text>
        </Pressable>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.orderCard}>
            <View style={styles.orderHeader}>
              <Text style={styles.orderNumber}>#{item.order_number}</Text>
              <Text style={[styles.status, { color: getStatusColor(item.status) }]}>
                {item.status.toUpperCase()}
              </Text>
            </View>

            <Text style={styles.orderTime}>
              {new Date(item.created_at).toLocaleString()}
            </Text>

            <Text style={styles.orderAddress}>📍 {item.delivery_address}</Text>
            
            <Text style={styles.itemsCount}>
  {Array.isArray(item.items) ? item.items.length : JSON.parse(item.items || '[]').length} items • ₹{item.total_amount}
</Text>

            {/* Action Buttons */}
            {item.status === 'pending' && (
              <View style={styles.actions}>
                <Pressable 
                  style={[styles.actionBtn, { backgroundColor: '#4CAF50' }]}
                  onPress={() => updateOrderStatus(item.id, 'confirmed')}
                >
                  <Text style={styles.actionBtnText}>Accept</Text>
                </Pressable>
                <Pressable 
                  style={[styles.actionBtn, { backgroundColor: '#F44336' }]}
                  onPress={() => updateOrderStatus(item.id, 'rejected')}
                >
                  <Text style={styles.actionBtnText}>Reject</Text>
                </Pressable>
              </View>
            )}

            {item.status === 'confirmed' && (
              <Pressable 
                style={[styles.actionBtn, { backgroundColor: '#2196F3' }]}
                onPress={() => updateOrderStatus(item.id, 'preparing')}
              >
                <Text style={styles.actionBtnText}>Start Preparing</Text>
              </Pressable>
            )}

            {item.status === 'preparing' && (
              <Pressable 
                style={[styles.actionBtn, { backgroundColor: '#8BC34A' }]}
                onPress={() => updateOrderStatus(item.id, 'ready')}
              >
                <Text style={styles.actionBtnText}>Mark Ready</Text>
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
  filterRow: { flexDirection: 'row', padding: 16, gap: 8 },
  filterTab: { flex: 1, padding: 12, borderRadius: 8, borderWidth: 1, borderColor: COLORS.border, alignItems: 'center' },
  filterTabActive: { backgroundColor: COLORS.primary, borderColor: COLORS.primary },
  filterText: { fontWeight: '600', color: COLORS.text },
  filterTextActive: { color: '#FFF' },
  list: { padding: 16 },
  orderCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderNumber: { fontSize: 16, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '700' },
  orderTime: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  orderAddress: { fontSize: 14, marginBottom: 8 },
  itemsCount: { fontSize: 14, color: COLORS.textLight, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#FFF', fontWeight: '600' }
});
