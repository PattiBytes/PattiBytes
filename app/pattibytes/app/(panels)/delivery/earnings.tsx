import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type Earning = {
  id: string;
  order_number: string;
  amount: number;
  created_at: string;
};

export default function Earnings() {
  const { profile } = useAppSelector((s) => s.auth);
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [totalEarnings, setTotalEarnings] = useState(0);

  useEffect(() => {
    loadEarnings();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEarnings = async () => {
    const { data } = await supabase
      .from('orders')
      .select('id, order_number, delivery_fee, created_at')
      .eq('delivery_partner_id', profile?.id)
      .eq('status', 'delivered')
      .order('created_at', { ascending: false });

    if (data) {
      const formattedEarnings = data.map(order => ({
        id: order.id,
        order_number: order.order_number,
        amount: order.delivery_fee || 50,
        created_at: order.created_at
      }));
      
      setEarnings(formattedEarnings);
      const total = formattedEarnings.reduce((sum, e) => sum + e.amount, 0);
      setTotalEarnings(total);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Earnings</Text>
      </View>

      <View style={styles.totalCard}>
        <Text style={styles.totalLabel}>Total Earnings</Text>
        <Text style={styles.totalAmount}>₹{totalEarnings}</Text>
      </View>

      <FlatList
        data={earnings}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.earningCard}>
            <View>
              <Text style={styles.orderNumber}>#{item.order_number}</Text>
              <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.amount}>+₹{item.amount}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: '700' },
  totalCard: { margin: 16, padding: 24, backgroundColor: COLORS.primary, borderRadius: 16, alignItems: 'center' },
  totalLabel: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginBottom: 8 },
  totalAmount: { color: '#FFF', fontSize: 36, fontWeight: '800' },
  list: { padding: 16 },
  earningCard: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', elevation: 2 },
  orderNumber: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  date: { fontSize: 12, color: COLORS.textLight },
  amount: { fontSize: 18, fontWeight: '700', color: '#4CAF50' }
});
