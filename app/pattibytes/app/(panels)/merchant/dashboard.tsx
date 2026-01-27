import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type RestaurantStats = {
  total_orders: number;
  pending_orders: number;
  revenue_today: number;
};

export default function MerchantDashboard() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [stats, setStats] = useState<RestaurantStats>({ total_orders: 0, pending_orders: 0, revenue_today: 0 });
  const [hasRestaurant, setHasRestaurant] = useState(false);

  useEffect(() => {
    checkRestaurant();
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checkRestaurant = async () => {
    const { data } = await supabase
      .from('restaurants')
      .select('id')
      .eq('merchant_id', profile?.id)
      .single();
    
    setHasRestaurant(!!data);
  };

  const loadStats = async () => {
    // Load restaurant stats
    const { data: restaurant } = await supabase
      .from('restaurants')
      .select('id, total_orders')
      .eq('merchant_id', profile?.id)
      .single();

    if (!restaurant) return;

    // Count pending orders
    const { count: pendingCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('restaurant_id', restaurant.id)
      .in('status', ['pending', 'confirmed', 'preparing']);

    // Calculate today's revenue
    const today = new Date().toISOString().split('T')[0];
    const { data: todayOrders } = await supabase
      .from('orders')
      .select('total_amount')
      .eq('restaurant_id', restaurant.id)
      .gte('created_at', today);

    const revenue = todayOrders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

    setStats({
      total_orders: restaurant.total_orders || 0,
      pending_orders: pendingCount || 0,
      revenue_today: revenue
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Merchant Panel</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.welcome}>Welcome, {profile?.full_name || 'Merchant'}!</Text>

        {!hasRestaurant && (
          <View style={styles.setupCard}>
            <Text style={styles.setupTitle}>🏪 Setup Your Restaurant</Text>
            <Text style={styles.setupDesc}>Complete your restaurant profile to start receiving orders</Text>
            <Pressable style={styles.setupButton}>
              <Text style={styles.setupButtonText}>Setup Now</Text>
            </Pressable>
          </View>
        )}

        {hasRestaurant && (
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.pending_orders}</Text>
              <Text style={styles.statLabel}>Pending Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total_orders}</Text>
              <Text style={styles.statLabel}>Total Orders</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>₹{stats.revenue_today}</Text>
              <Text style={styles.statLabel}>Today&apos;s Revenue</Text>
            </View>
          </View>
        )}

        <View style={styles.grid}>
          <Pressable style={styles.card} onPress={() => router.push('/(panels)/merchant/menu' as any)}>
            <Text style={styles.cardIcon}>🍽️</Text>
            <Text style={styles.cardTitle}>Menu</Text>
            <Text style={styles.cardDesc}>Manage your menu items</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => router.push('/(panels)/merchant/orders' as any)}>
            <Text style={styles.cardIcon}>📦</Text>
            <Text style={styles.cardTitle}>Orders</Text>
            <Text style={styles.cardDesc}>View & manage orders</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => router.push('/(panels)/merchant/analytics' as any)}>
            <Text style={styles.cardIcon}>📊</Text>
            <Text style={styles.cardTitle}>Analytics</Text>
            <Text style={styles.cardDesc}>Sales & performance</Text>
          </Pressable>
          <Pressable style={styles.card} onPress={() => router.push('/(panels)/merchant/menu' as any)}>
  <Text style={styles.cardIcon}>📋</Text>
  <Text style={styles.cardTitle}>Menu Management</Text>
  <Text style={styles.cardDesc}>Add, edit, or remove menu items</Text>
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
  setupCard: { backgroundColor: '#FFF3E0', padding: 20, borderRadius: 12, marginBottom: 24 },
  setupTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8 },
  setupDesc: { color: COLORS.textLight, marginBottom: 16 },
  setupButton: { backgroundColor: COLORS.primary, padding: 12, borderRadius: 8, alignItems: 'center' },
  setupButtonText: { color: '#FFF', fontWeight: '600' },
  statsRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 24, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 12, color: COLORS.textLight, marginTop: 4 },
  grid: { gap: 16 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
  cardIcon: { fontSize: 40, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: COLORS.textLight, fontSize: 14 }
});
