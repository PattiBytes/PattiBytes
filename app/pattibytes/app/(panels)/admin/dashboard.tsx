import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { COLORS } from '../../../src/lib/constants';

type AdminStats = {
  pending_approvals: number;
  total_restaurants: number;
  total_orders: number;
  total_users: number;
};

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState<AdminStats>({ pending_approvals: 0, total_restaurants: 0, total_orders: 0, total_users: 0 });

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const { count: pendingCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true })
      .eq('approval_status', 'pending');

    const { count: restaurantCount } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true });

    const { count: orderCount } = await supabase
      .from('orders')
      .select('*', { count: 'exact', head: true });

    const { count: userCount } = await supabase
      .from('profiles')
      .select('*', { count: 'exact', head: true });

    setStats({
      pending_approvals: pendingCount || 0,
      total_restaurants: restaurantCount || 0,
      total_orders: orderCount || 0,
      total_users: userCount || 0
    });
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Admin Panel</Text>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.welcome}>Admin Dashboard 🔐</Text>

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pending_approvals}</Text>
            <Text style={styles.statLabel}>Pending Approvals</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_users}</Text>
            <Text style={styles.statLabel}>Total Users</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_restaurants}</Text>
            <Text style={styles.statLabel}>Restaurants</Text>
          </View>
          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.total_orders}</Text>
            <Text style={styles.statLabel}>Total Orders</Text>
          </View>
        </View>

        <View style={styles.grid}>
          <Pressable style={styles.card} onPress={() => router.push('/(panels)/admin/approvals' as any)}>
            <Text style={styles.cardIcon}>✅</Text>
            <Text style={styles.cardTitle}>Approvals</Text>
            <Text style={styles.cardDesc}>Approve merchants & delivery partners</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => router.push('/(panels)/admin/users' as any)}>
            <Text style={styles.cardIcon}>👥</Text>
            <Text style={styles.cardTitle}>Users</Text>
            <Text style={styles.cardDesc}>Manage all users</Text>
          </Pressable>

          <Pressable style={styles.card} onPress={() => router.push('/(panels)/admin/restaurants' as any)}>
            <Text style={styles.cardIcon}>🏪</Text>
            <Text style={styles.cardTitle}>Restaurants</Text>
            <Text style={styles.cardDesc}>Manage restaurants</Text>
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
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 24 },
  statCard: { flex: 1, minWidth: '45%', backgroundColor: '#FFF', padding: 16, borderRadius: 12, alignItems: 'center', elevation: 2 },
  statValue: { fontSize: 28, fontWeight: '800', color: COLORS.primary },
  statLabel: { fontSize: 11, color: COLORS.textLight, marginTop: 4, textAlign: 'center' },
  grid: { gap: 16 },
  card: { backgroundColor: '#FFF', padding: 20, borderRadius: 12, elevation: 2 },
  cardIcon: { fontSize: 40, marginBottom: 12 },
  cardTitle: { fontSize: 18, fontWeight: '700', marginBottom: 4 },
  cardDesc: { color: COLORS.textLight, fontSize: 14 }
});
