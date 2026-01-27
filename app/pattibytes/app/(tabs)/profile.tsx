import React from 'react';
import { View, Text, Pressable, StyleSheet, Alert, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../src/lib/supabase';
import { useAppSelector } from '../../src/store/hooks';
import { COLORS, APP_NAME, DEVELOPER } from '../../src/lib/constants';

export default function Profile() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await supabase.auth.signOut();
          router.replace('/(auth)/login');
        }
      }
    ]);
  };

  const navigateToPanel = () => {
    if (profile?.role === 'merchant') router.push('/(panels)/merchant/dashboard' as any);
    else if (profile?.role === 'delivery') router.push('/(panels)/delivery/dashboard' as any);
    else if (profile?.role === 'admin' || profile?.is_superadmin) router.push('/(panels)/admin/dashboard' as any);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <View style={styles.content}>
        {/* Profile Card */}
        <View style={styles.profileCard}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {profile?.full_name?.charAt(0)?.toUpperCase() || profile?.email?.charAt(0)?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.name}>{profile?.full_name || 'User'}</Text>
          <Text style={styles.email}>{profile?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{profile?.role?.toUpperCase()}</Text>
          </View>
        </View>

        {/* Panel Access */}
        {profile?.role && profile.role !== 'customer' && (
          <Pressable style={styles.panelCard} onPress={navigateToPanel}>
            <Text style={styles.panelIcon}>
              {profile.role === 'admin' ? '🔐' : profile.role === 'merchant' ? '🏪' : '🚴'}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.panelTitle}>
                {profile.role === 'admin' ? 'Admin Panel' : profile.role === 'merchant' ? 'Merchant Panel' : 'Delivery Panel'}
              </Text>
              <Text style={styles.panelDesc}>Manage your {profile.role} operations</Text>
            </View>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
        )}

        {/* Account Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account Information</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Email</Text>
            <Text style={styles.infoValue}>{profile?.email}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Phone</Text>
            <Text style={styles.infoValue}>{profile?.phone || 'Not added'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Role</Text>
            <Text style={styles.infoValue}>{profile?.role}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Status</Text>
            <Text style={[styles.infoValue, { color: profile?.approval_status === 'approved' ? '#4CAF50' : '#FFA000' }]}>
              {profile?.approval_status}
            </Text>
          </View>
        </View>

        {/* Actions */}
        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </Pressable>

        {/* Footer */}
        <Text style={styles.footer}>
          {APP_NAME} v1.0.0{'\n'}Developed by {DEVELOPER}
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: { padding: 16, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  title: { fontSize: 24, fontWeight: '700' },
  content: { padding: 16 },
  profileCard: { backgroundColor: '#FFF', padding: 24, borderRadius: 16, alignItems: 'center', marginBottom: 16, elevation: 2 },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: COLORS.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 12 },
  avatarText: { fontSize: 32, fontWeight: '700', color: '#FFF' },
  name: { fontSize: 20, fontWeight: '700', marginBottom: 4 },
  email: { fontSize: 14, color: COLORS.textLight, marginBottom: 12 },
  roleBadge: { backgroundColor: '#E3F2FD', paddingHorizontal: 16, paddingVertical: 6, borderRadius: 16 },
  roleText: { fontSize: 12, fontWeight: '700', color: '#2196F3' },
  panelCard: { backgroundColor: COLORS.primary, padding: 20, borderRadius: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 16, elevation: 2 },
  panelIcon: { fontSize: 32, marginRight: 16 },
  panelTitle: { fontSize: 16, fontWeight: '700', color: '#FFF', marginBottom: 4 },
  panelDesc: { fontSize: 12, color: 'rgba(255,255,255,0.8)' },
  arrow: { fontSize: 24, color: '#FFF' },
  section: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 16, elevation: 2 },
  sectionTitle: { fontSize: 16, fontWeight: '700', marginBottom: 16 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: COLORS.border },
  infoLabel: { fontSize: 14, color: COLORS.textLight },
  infoValue: { fontSize: 14, fontWeight: '600' },
  logoutButton: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, borderWidth: 1, borderColor: '#F44336', alignItems: 'center', marginBottom: 16 },
  logoutText: { color: '#F44336', fontWeight: '700', fontSize: 16 },
  footer: { textAlign: 'center', fontSize: 12, color: COLORS.textLight, marginTop: 20, marginBottom: 40 }
});
