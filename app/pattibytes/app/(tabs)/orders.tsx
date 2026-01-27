
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../src/lib/supabase';
import { useAppSelector } from '../../src/store/hooks';
import { COLORS } from '../../src/lib/constants';

type Order = {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
};

export default function Orders() {
  const { profile } = useAppSelector((s) => s.auth);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    loadOrders();

    const channel = supabase
      .channel('my-orders')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'orders', filter: `user_id=eq.${profile?.id}` }, 
        loadOrders
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadOrders = async () => {
    const { data } = await supabase
      .from('orders')
      .select('*')
      .eq('user_id', profile?.id)
      .order('created_at', { ascending: false });

    if (data) setOrders(data);
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: '#FFA000',
      confirmed: '#4CAF50',
      preparing: '#2196F3',
      ready: '#8BC34A',
      assigned: '#9C27B0',
      picked_up: '#FF9800',
      delivered: '#4CAF50',
      cancelled: '#F44336'
    };
    return colors[status] || COLORS.textLight;
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>My Orders</Text>
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
            <Text style={styles.orderAmount}>₹{item.total_amount}</Text>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>No orders yet</Text>
            <Text style={styles.emptySubtext}>Start exploring restaurants!</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: '700' },
  list: { padding: 16 },
  orderCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  orderHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  orderNumber: { fontSize: 16, fontWeight: '700' },
  status: { fontSize: 12, fontWeight: '700' },
  orderTime: { fontSize: 12, color: COLORS.textLight, marginBottom: 8 },
  orderAmount: { fontSize: 18, fontWeight: '700', color: COLORS.primary },
  empty: { alignItems: 'center', paddingTop: 60 },
  emptyText: { fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySubtext: { color: COLORS.textLight }
});
