import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, ActivityIndicator, Image,
} from 'react-native';
import { router, Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { COLORS } from '../../../lib/constants';
import type { UserRole } from '../../../lib/navigateByRole';

/* ─────────────────────────── types ──────────────────────────── */
interface DashStats {
  totalOrders: number;
  pendingOrders: number;
  todayRevenue: number;
  activeUsers: number;
  pendingMerchants: number;
  pendingDrivers: number;
  totalMerchants: number;
  totalDrivers: number;
}

interface RecentOrder {
  id: string;
  ordernumber: number;
  status: string;
  totalamount: number;
  createdat: string;
  customerName?: string;
  merchantName?: string;
}

/* ─────────────────── role meta helpers ──────────────────────── */
const ROLE_META: Record<string, { label: string; emoji: string; color: string }> = {
  superadmin: { label: 'Super Admin',    emoji: '👑', color: '#7C3AED' },
  admin:      { label: 'Admin',          emoji: '🛡️', color: '#2563EB' },
  merchant:   { label: 'Merchant',       emoji: '🏪', color: '#EA580C' },
};

const STATUS_COLOR: Record<string, string> = {
  pending:   '#F59E0B',
  confirmed: '#3B82F6',
  preparing: '#8B5CF6',
  ready:     '#10B981',
  assigned:  '#06B6D4',
  delivered: '#16A34A',
  cancelled: '#EF4444',
};

/* ──────────────────────────── component ─────────────────────── */
export default function AdminDashboard() {
  const { user, profile } = useAuth();
  const role = (profile?.role ?? 'admin') as UserRole;
  const meta = ROLE_META[role] ?? ROLE_META.admin;

  const [stats,        setStats]        = useState<DashStats | null>(null);
  const [recent,       setRecent]       = useState<RecentOrder[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [refreshing,   setRefreshing]   = useState(false);
  const [merchantInfo, setMerchantInfo] = useState<{ businessname: string; logourl: string | null } | null>(null);

  /* ── load ── */
  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      if (role === 'merchant') {
        await loadMerchantDash();
      } else {
        await loadAdminDash();
      }
    } finally {
      setLoading(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, role]);

  /* ── merchant-specific load ── */
  async function loadMerchantDash() {
    const { data: m } = await supabase
      .from('merchants')
      .select('id, businessname, logourl')
      .eq('userid', user!.id)
      .maybeSingle();

    if (!m) return;
    setMerchantInfo({ businessname: m.businessname, logourl: m.logourl });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [ordersRes, todayRes] = await Promise.all([
      supabase
        .from('orders')
        .select('id, ordernumber, status, totalamount, createdat, customerid')
        .eq('merchantid', m.id)
        .order('createdat', { ascending: false })
        .limit(10),
      supabase
        .from('orders')
        .select('totalamount')
        .eq('merchantid', m.id)
        .eq('status', 'delivered')
        .gte('createdat', today.toISOString()),
    ]);

    const orders   = ordersRes.data ?? [];
    const todayRev = (todayRes.data ?? []).reduce((s: number, o: any) => s + Number(o.totalamount ?? 0), 0);

    setStats({
      totalOrders:      orders.length,
      pendingOrders:    orders.filter((o: any) => ['pending', 'confirmed', 'preparing'].includes(o.status)).length,
      todayRevenue:     todayRev,
      activeUsers:      0,
      pendingMerchants: 0,
      pendingDrivers:   0,
      totalMerchants:   0,
      totalDrivers:     0,
    });
    setRecent(orders.slice(0, 6) as RecentOrder[]);
  }

  /* ── admin / superadmin load ── */
  async function loadAdminDash() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [
      allOrdersRes, todayRevRes, pendingMerchantsRes,
      pendingDriversRes, totalMerchantsRes, totalDriversRes,
      recentOrdersRes, activeUsersRes,
    ] = await Promise.all([
      supabase.from('orders').select('id, status', { count: 'exact' }),
      supabase.from('orders').select('totalamount').eq('status', 'delivered').gte('createdat', today.toISOString()),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'merchant').eq('approval_status', 'pending'),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'driver').eq('approval_status', 'pending'),
      supabase.from('merchants').select('id', { count: 'exact' }).eq('is_active', true),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'driver').eq('approval_status', 'approved'),
      supabase
        .from('orders')
        .select('id, ordernumber, status, totalamount, createdat')
        .order('createdat', { ascending: false })
        .limit(8),
      supabase.from('profiles').select('id', { count: 'exact' }).eq('role', 'customer').eq('is_active', true),
    ]);

    const todayRev = (todayRevRes.data ?? []).reduce((s: number, o: any) => s + Number(o.totalamount ?? 0), 0);

    setStats({
      totalOrders:      allOrdersRes.count ?? 0,
      pendingOrders:    (allOrdersRes.data ?? []).filter((o: any) => o.status === 'pending').length,
      todayRevenue:     todayRev,
      activeUsers:      activeUsersRes.count ?? 0,
      pendingMerchants: pendingMerchantsRes.count ?? 0,
      pendingDrivers:   pendingDriversRes.count ?? 0,
      totalMerchants:   totalMerchantsRes.count ?? 0,
      totalDrivers:     totalDriversRes.count ?? 0,
    });
    setRecent(recentOrdersRes.data as RecentOrder[] ?? []);
  }

  useEffect(() => { void load(); }, [load]);

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login' as any);
  }

  /* ─── loading screen ─── */
  if (loading) {
    return (
      <View style={S.loader}>
        <ActivityIndicator size="large" color={COLORS.primary} />
        <Text style={S.loaderTxt}>Loading dashboard…</Text>
      </View>
    );
  }

  /* ─── render ─── */
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        style={S.root}
        contentContainerStyle={S.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />}
      >

        {/* ── Header ── */}
        <View style={[S.header, { backgroundColor: meta.color }]}>
          <View style={S.headerLeft}>
            {role === 'merchant' && merchantInfo?.logourl ? (
              <Image source={{ uri: merchantInfo.logourl }} style={S.headerAvatar} />
            ) : (
              <View style={[S.headerAvatarFallback, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
                <Text style={{ fontSize: 28 }}>{meta.emoji}</Text>
              </View>
            )}
            <View style={{ flex: 1 }}>
              <Text style={S.headerRole}>{meta.label} Panel</Text>
              <Text style={S.headerName} numberOfLines={1}>
                {role === 'merchant' ? (merchantInfo?.businessname ?? 'My Restaurant') : (profile?.full_name ?? 'Admin')}
              </Text>
              <Text style={S.headerEmail} numberOfLines={1}>{user?.email}</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleSignOut} style={S.signOutBtn}>
            <Text style={S.signOutTxt}>Sign Out</Text>
          </TouchableOpacity>
        </View>

        {/* ── Quick Actions ── */}
        <View style={S.section}>
          <Text style={S.sectionTitle}>Quick Actions</Text>
          <View style={S.quickGrid}>
            {role === 'merchant' ? (
              <>
                <QuickAction emoji="📦" label="Orders"    onPress={() => router.push('/(admin)/orders'  as any)} color="#FEF3C7" />
                <QuickAction emoji="🍽️" label="Menu"      onPress={() => router.push('/(admin)/menu'    as any)} color="#DCFCE7" />
                <QuickAction emoji="📊" label="Analytics" onPress={() => router.push('/(admin)/analytics' as any)} color="#EDE9FE" />
                <QuickAction emoji="⚙️" label="Settings"  onPress={() => router.push('/(admin)/settings' as any)} color="#F3F4F6" />
              </>
            ) : (
              <>
                <QuickAction emoji="👥" label="Users"     onPress={() => router.push('/(admin)/users'     as any)} color="#DBEAFE" />
                <QuickAction emoji="🏪" label="Merchants" onPress={() => router.push('/(admin)/merchants' as any)} color="#FEF3C7" />
                <QuickAction emoji="🛵" label="Drivers"   onPress={() => router.push('/(admin)/drivers'   as any)} color="#DCFCE7" />
                <QuickAction emoji="📦" label="Orders"    onPress={() => router.push('/(admin)/orders'    as any)} color="#FCE7F3" />
                {role === 'superadmin' && (
                  <>
                    <QuickAction emoji="💰" label="Finance"   onPress={() => router.push('/(admin)/finance'   as any)} color="#EDE9FE" />
                    <QuickAction emoji="⚙️" label="Settings"  onPress={() => router.push('/(admin)/settings'  as any)} color="#F3F4F6" />
                    <QuickAction emoji="🎟️" label="Promos"    onPress={() => router.push('/(admin)/promos'    as any)} color="#FFF7ED" />
                    <QuickAction emoji="📢" label="Notify"    onPress={() => router.push('/(admin)/notify'    as any)} color="#F0FDF4" />
                  </>
                )}
              </>
            )}
          </View>
        </View>

        {/* ── Approval Alerts (admin / superadmin only) ── */}
        {role !== 'merchant' && stats && (stats.pendingMerchants > 0 || stats.pendingDrivers > 0) && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>⚠️ Pending Approvals</Text>
            {stats.pendingMerchants > 0 && (
              <TouchableOpacity
                style={[S.alertCard, { borderLeftColor: '#F59E0B' }]}
                onPress={() => router.push('/(admin)/merchants' as any)}
              >
                <Text style={S.alertEmoji}>🏪</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.alertTitle}>{stats.pendingMerchants} Merchant{stats.pendingMerchants > 1 ? 's' : ''} Awaiting Approval</Text>
                  <Text style={S.alertSub}>Tap to review and approve</Text>
                </View>
                <Text style={S.alertArrow}>›</Text>
              </TouchableOpacity>
            )}
            {stats.pendingDrivers > 0 && (
              <TouchableOpacity
                style={[S.alertCard, { borderLeftColor: '#3B82F6' }]}
                onPress={() => router.push('/(admin)/drivers' as any)}
              >
                <Text style={S.alertEmoji}>🛵</Text>
                <View style={{ flex: 1 }}>
                  <Text style={S.alertTitle}>{stats.pendingDrivers} Driver{stats.pendingDrivers > 1 ? 's' : ''} Awaiting Approval</Text>
                  <Text style={S.alertSub}>Tap to review and approve</Text>
                </View>
                <Text style={S.alertArrow}>›</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* ── Stats ── */}
        {stats && (
          <View style={S.section}>
            <Text style={S.sectionTitle}>Overview</Text>
            <View style={S.statsGrid}>
              <StatCard label="Total Orders"   value={String(stats.totalOrders)}   emoji="📦" bg="#FEF3C7" />
              <StatCard label="Pending"        value={String(stats.pendingOrders)}  emoji="⏳" bg="#DBEAFE" />
              <StatCard label="Today Revenue"  value={`₹${stats.todayRevenue.toFixed(0)}`} emoji="💰" bg="#DCFCE7" />
              {role === 'merchant'
                ? <StatCard label="Active Menu"  value="–"  emoji="🍽️" bg="#EDE9FE" />
                : <StatCard label="Customers"    value={String(stats.activeUsers)}    emoji="👤" bg="#FCE7F3" />
              }
              {role !== 'merchant' && (
                <>
                  <StatCard label="Merchants" value={String(stats.totalMerchants)} emoji="🏪" bg="#FFF7ED" />
                  <StatCard label="Drivers"   value={String(stats.totalDrivers)}   emoji="🛵" bg="#F0FDF4" />
                </>
              )}
            </View>
          </View>
        )}

        {/* ── Recent Orders ── */}
        {recent.length > 0 && (
          <View style={S.section}>
            <View style={S.sectionHeader}>
              <Text style={S.sectionTitle}>Recent Orders</Text>
              <TouchableOpacity onPress={() => router.push('/(admin)/orders' as any)}>
                <Text style={S.seeAll}>See All ›</Text>
              </TouchableOpacity>
            </View>
            {recent.map(order => (
              <TouchableOpacity
                key={order.id}
                style={S.orderRow}
                onPress={() => router.push({ pathname: '/(admin)/orders/[id]', params: { id: order.id } } as any)}
                activeOpacity={0.75}
              >
                <View style={[S.orderDot, { backgroundColor: STATUS_COLOR[order.status] ?? '#9CA3AF' }]} />
                <View style={{ flex: 1 }}>
                  <Text style={S.orderNum}>#{order.ordernumber}</Text>
                  <Text style={S.orderStatus}>{order.status.replace(/_/g, ' ').toUpperCase()}</Text>
                </View>
                <Text style={S.orderAmt}>₹{Number(order.totalamount ?? 0).toFixed(0)}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {/* Spacer */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </>
  );
}

/* ── Sub-components ── */
function QuickAction({ emoji, label, onPress, color }: {
  emoji: string; label: string; onPress: () => void; color: string;
}) {
  return (
    <TouchableOpacity style={[S.qaCard, { backgroundColor: color }]} onPress={onPress} activeOpacity={0.75}>
      <Text style={S.qaEmoji}>{emoji}</Text>
      <Text style={S.qaLabel}>{label}</Text>
    </TouchableOpacity>
  );
}

function StatCard({ label, value, emoji, bg }: {
  label: string; value: string; emoji: string; bg: string;
}) {
  return (
    <View style={[S.statCard, { backgroundColor: bg }]}>
      <Text style={S.statEmoji}>{emoji}</Text>
      <Text style={S.statValue}>{value}</Text>
      <Text style={S.statLabel}>{label}</Text>
    </View>
  );
}

/* ── Styles ── */
const S = StyleSheet.create({
  root:    { flex: 1, backgroundColor: '#F8F8FB' },
  content: { paddingBottom: 20 },
  loader:  { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loaderTxt: { color: COLORS.textLight, fontSize: 14 },

  /* header */
  header: {
    paddingTop: 56, paddingBottom: 24, paddingHorizontal: 20,
    flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between',
    borderBottomLeftRadius: 28, borderBottomRightRadius: 28,
  },
  headerLeft:          { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  headerAvatar:        { width: 56, height: 56, borderRadius: 28, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)' },
  headerAvatarFallback:{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  headerRole:          { fontSize: 11, fontWeight: '700', color: 'rgba(255,255,255,0.75)', letterSpacing: 1, textTransform: 'uppercase' },
  headerName:          { fontSize: 20, fontWeight: '800', color: '#FFF', marginTop: 2 },
  headerEmail:         { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginTop: 2 },
  signOutBtn:          { paddingVertical: 6, paddingHorizontal: 14, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 4 },
  signOutTxt:          { color: '#FFF', fontSize: 12, fontWeight: '700' },

  /* section */
  section:       { paddingHorizontal: 16, marginTop: 22 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle:  { fontSize: 15, fontWeight: '800', color: COLORS.text, marginBottom: 12 },
  seeAll:        { fontSize: 13, fontWeight: '700', color: COLORS.primary },

  /* quick actions */
  quickGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  qaCard:    { width: '22%', minWidth: 74, aspectRatio: 1, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 4 },
  qaEmoji:   { fontSize: 26 },
  qaLabel:   { fontSize: 11, fontWeight: '700', color: COLORS.text, textAlign: 'center' },

  /* alert */
  alertCard:  {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 16, padding: 14,
    borderLeftWidth: 4, marginBottom: 10,
    elevation: 2, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  alertEmoji: { fontSize: 24 },
  alertTitle: { fontSize: 13, fontWeight: '800', color: COLORS.text },
  alertSub:   { fontSize: 12, color: COLORS.textLight, marginTop: 2 },
  alertArrow: { fontSize: 22, color: COLORS.textLight },

  /* stats */
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  statCard:  { width: '30%', flexGrow: 1, borderRadius: 18, padding: 14, alignItems: 'center', gap: 4 },
  statEmoji: { fontSize: 22 },
  statValue: { fontSize: 20, fontWeight: '800', color: COLORS.text },
  statLabel: { fontSize: 10, fontWeight: '700', color: COLORS.textLight, textAlign: 'center' },

  /* orders */
  orderRow: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.03, shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  orderDot:    { width: 10, height: 10, borderRadius: 5 },
  orderNum:    { fontSize: 13, fontWeight: '800', color: COLORS.text },
  orderStatus: { fontSize: 11, color: COLORS.textLight, marginTop: 2, fontWeight: '600' },
  orderAmt:    { fontSize: 14, fontWeight: '800', color: COLORS.primary },
});