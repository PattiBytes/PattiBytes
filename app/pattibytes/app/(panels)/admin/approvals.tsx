import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Pressable, StyleSheet, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../../src/lib/supabase';
import { useAppSelector } from '../../../src/store/hooks';
import { COLORS } from '../../../src/lib/constants';

type PendingUser = {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  created_at: string;
};

export default function Approvals() {
  const router = useRouter();
  const { profile } = useAppSelector((s) => s.auth);
  const [pending, setPending] = useState<PendingUser[]>([]);

  useEffect(() => {
    loadPending();
  }, []);

  const loadPending = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('approval_status', 'pending')
      .in('role', ['merchant', 'delivery'])
      .order('created_at', { ascending: false });

    if (data) setPending(data);
  };

  const handleApproval = async (userId: string, approved: boolean) => {
    const { error } = await supabase
      .from('profiles')
      .update({ 
        approval_status: approved ? 'approved' : 'rejected',
        approved_by: profile?.id,
        approved_at: new Date().toISOString()
      })
      .eq('id', userId);

    if (error) {
      Alert.alert('Error', error.message);
    } else {
      Alert.alert('Success', `User ${approved ? 'approved' : 'rejected'}`);
      loadPending();
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Pressable onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </Pressable>
        <Text style={styles.title}>Pending Approvals</Text>
      </View>

      <FlatList
        data={pending}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.name}>{item.full_name || item.email}</Text>
            <Text style={styles.role}>{item.role.toUpperCase()}</Text>
            <Text style={styles.date}>{new Date(item.created_at).toLocaleDateString()}</Text>
            
            <View style={styles.actions}>
              <Pressable 
                style={[styles.btn, { backgroundColor: '#4CAF50' }]}
                onPress={() => handleApproval(item.id, true)}
              >
                <Text style={styles.btnText}>Approve</Text>
              </Pressable>
              <Pressable 
                style={[styles.btn, { backgroundColor: '#F44336' }]}
                onPress={() => handleApproval(item.id, false)}
              >
                <Text style={styles.btnText}>Reject</Text>
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
  card: { backgroundColor: '#FFF', padding: 16, borderRadius: 12, marginBottom: 12, elevation: 2 },
  name: { fontSize: 16, fontWeight: '700', marginBottom: 4 },
  role: { fontSize: 12, color: COLORS.primary, fontWeight: '600', marginBottom: 4 },
  date: { fontSize: 12, color: COLORS.textLight, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 8 },
  btn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: '600' }
});
