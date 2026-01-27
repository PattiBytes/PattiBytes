import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type DeliveryStats = {
  today_deliveries: number;
  today_earnings: number;
  active_orders: number;
};

export default function DeliveryDashboard() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [stats, setStats] = useState<DeliveryStats>({ today_deliveries: 0, today_earnings: 0, active_orders: 0 });

  useEffect(() => {
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadStats = async () => {
    const today = new Date().toISOString().split('T')[0];

    // Today's deliveries
    const { count: todayCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_partner_id', profile?.id)
      .eq('status', 'delivered')
      .gte('created_at', today);

    // Active orders
    const { count: activeCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('delivery_partner_id', profile?.id)
      .in('status', ['assigned', 'picked_up']);

    // Today's earnings (example: ₹50 per delivery)
    const earnings = (todayCount || 0) * 50;

    setStats({
      today_deliveries: todayCount || 0,
      today_earnings: earnings,
      active_orders: activeCount || 0
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Delivery Panel</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.welcome}>Hi, {profile?.full_name || 'Partner'}! 🚴</Text>

        <View style={styles.statsRow}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.active_orders}</Text>
            <Text style={styles.statLabel}>Active</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.today_deliveries}</Text>
            <Text style={styles.statLabel}>Today</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>₹{stats.today_earnings}</Text>
            <Text style={styles.statLabel}>Earnings</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <Pressable style={styles.card} onPress={() => router.push('/(panels)/delivery/available' as any)}>
            <Text style={styles.cardIcon}>📦</Text>
            <Text style={styles.cardTitle}>Available Orders</Text>
            <Text style={styles.cardDesc}>Accept delivery requests</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => router.push('/(panels)/delivery/active' as any)}>
            <Text style={styles.cardIcon}>🚴</Text>
            <Text style={styles.cardTitle}>Active Deliveries</Text>
            <Text style={styles.cardDesc}>Track ongoing orders</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => router.push('/(panels)/delivery/earnings' as any)}>
            <Text style={styles.cardIcon}>💰</Text>
            <Text style={styles.cardTitle}>Earnings</Text>
            <Text style={styles.cardDesc}>View payment history</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border, flexDirection: 'row', alignItems: 'center', gap: 16 },
  backButton: { color: COLORS.primary, fontSize: 16 },
  title: { fontSize: 20, fontWeight: '700' },
  content: { flex: 1, padding: 16 },
  welcome: { fontSize: 24, fontWeight: '700', marginBottom: 24 },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  grid: { gap: 16 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 2 },
  cardIcon: { fontSize: 40, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: COLORS.textLight, fontSize: 14 }
});
