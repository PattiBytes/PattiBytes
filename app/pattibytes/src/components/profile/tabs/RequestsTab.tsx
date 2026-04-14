// src/components/profile/tabs/RequestsTab.tsx
import React, { useCallback, useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { S } from '../profileStyles';
import { Section } from '../Section';
import { Pill } from '../Pill';
import { supabase } from '../../../lib/supabase';
import { COLORS } from '../../../lib/constants';

interface AccessRequest {
  id:                   string;
  requested_role:       string | null;
  request_type:         string;
  status:               string;
  notes:                string | null;
  scheduled_deletion_at:string | null;
  created_at:           string;
}

interface Props { userId: string }

export function RequestsTab({ userId }: Props) {
  const [requests,   setRequests]   = useState<AccessRequest[]>([]);
  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState<'merchant' | 'driver' | null>(null);

  const loadRequests = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('access_requests')
      .select(
        'id,requested_role,request_type,status,notes,scheduled_deletion_at,created_at'
      )
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (!error) setRequests((data ?? []) as AccessRequest[]);
    setLoading(false);
  }, [userId]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── Guard: prevent duplicate role requests ──────────────────────────────
  function getRoleRequestState(role: 'merchant' | 'driver') {
    const found = requests.find(
      (r) =>
        r.request_type === 'role_upgrade' &&
        r.requested_role === role
    );
    if (!found) return null;
    return found.status as 'pending' | 'approved' | 'rejected';
  }

  const submitRoleRequest = async (role: 'merchant' | 'driver') => {
    const existingStatus = getRoleRequestState(role);

    if (existingStatus === 'pending') {
      Alert.alert(
        'Already submitted',
        `Your ${role} request is currently under review. We will notify you within 24–48 hours.`
      );
      return;
    }

    if (existingStatus === 'approved') {
      Alert.alert(
        'Already approved',
        `Your ${role} request was already approved. Contact support if you have not been upgraded yet.`
      );
      return;
    }

    const label = role === 'merchant' ? 'Merchant' : 'Delivery Driver';
    Alert.alert(
      `Become a ${label}?`,
      `This will submit a role-upgrade request. Our team reviews within 24–48 hours.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Submit',
          onPress: async () => {
            setSubmitting(role);
            try {
              const now = new Date().toISOString();
              const { error } = await supabase
                .from('access_requests')
                .insert({
                  user_id:        userId,
                  requested_role: role,
                  request_type:   'role_upgrade',
                  status:         'pending',
                  notes:          null,
                  reviewed_by:    null,
                  reviewed_at:    null,
                  created_at:     now,
                  updated_at:     now,
                });
              if (error) throw error;
              Alert.alert(
                'Request submitted ✅',
                `Your ${label} request has been submitted. You'll be notified once reviewed.`
              );
              await loadRequests();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Failed to submit request');
            } finally {
              setSubmitting(null);
            }
          },
        },
      ]
    );
  };

  const cancelDeletion = async () => {
    Alert.alert(
      'Cancel deletion?',
      'Your account will be restored to active status. Are you sure?',
      [
        { text: 'No', style: 'cancel' },
        {
          text: 'Yes, cancel deletion',
          onPress: async () => {
            try {
              const now = new Date().toISOString();

              const { error: reqErr } = await supabase
                .from('access_requests')
                .update({
                  status:      'rejected',
                  notes:       'Cancelled by user',
                  reviewed_at: now,
                  updated_at:  now,
                })
                .eq('user_id',      userId)
                .eq('request_type', 'account_deletion')
                .eq('status',       'pending');
              if (reqErr) throw reqErr;

              const { error: profErr } = await supabase
                .from('profiles')
                .update({ account_status: 'active', updated_at: now })
                .eq('id', userId);
              if (profErr) throw profErr;

              Alert.alert('Done ✅', 'Account deletion has been cancelled.');
              await loadRequests();
            } catch (e: any) {
              Alert.alert('Error', e?.message ?? 'Could not cancel deletion');
            }
          },
        },
      ]
    );
  };

  const statusTone = (s: string) =>
    s === 'approved' ? ('good' as const)
    : s === 'rejected' ? ('bad' as const)
    : ('warn' as const);

  const hasPendingDeletion = requests.some(
    (r) => r.request_type === 'account_deletion' && r.status === 'pending'
  );

  const merchantState = getRoleRequestState('merchant');
  const driverState   = getRoleRequestState('driver');

  // ── Role button helpers ────────────────────────────────────────────────────
  function RoleButton({
    role,
    label,
    emoji,
    existingStatus,
    color,
    bgColor,
    borderColor,
  }: {
    role:           'merchant' | 'driver';
    label:          string;
    emoji:          string;
    existingStatus: ReturnType<typeof getRoleRequestState>;
    color:          string;
    bgColor:        string;
    borderColor:    string;
  }) {
    const isBusy = submitting === role;
    const disabled = isBusy || existingStatus === 'pending' || existingStatus === 'approved';

    const statusSuffix =
      existingStatus === 'pending'  ? ' (Pending)'
      : existingStatus === 'approved' ? ' (Approved ✅)'
      : existingStatus === 'rejected' ? ' (Re-apply)'
      : '';

    return (
      <TouchableOpacity
        style={[
          S.btn,
          { backgroundColor: bgColor, borderWidth: 1.5, borderColor },
          disabled && { opacity: 0.5 },
        ]}
        onPress={() => submitRoleRequest(role)}
        disabled={disabled}
      >
        {isBusy ? (
          <ActivityIndicator color={color} size="small" />
        ) : (
          <Text style={[S.btnTxt, { color }]}>
            {emoji} {label}{statusSuffix}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  return (
    <>
      {/* ── Role upgrade ── */}
      <Section title="Role upgrade requests">
        <Text style={{ color: '#6B7280', lineHeight: 18, marginBottom: 12 }}>
          Apply to become a Merchant or Delivery Driver. Our team reviews within 24–48 hours.
        </Text>
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <RoleButton
            role="merchant"
            label="Become Merchant"
            emoji="🏪"
            existingStatus={merchantState}
            color="#fff"
            bgColor={COLORS.primary}
            borderColor={COLORS.primary}
          />
          <RoleButton
            role="driver"
            label="Become Driver"
            emoji="🛵"
            existingStatus={driverState}
            color="#4338CA"
            bgColor="#EEF2FF"
            borderColor="#C7D2FE"
          />
        </View>

        {/* Inline status hints */}
        {(merchantState || driverState) && (
          <View style={{ marginTop: 12, gap: 4 }}>
            {merchantState === 'pending' && (
              <Text style={{ fontSize: 12, color: '#92400E', fontWeight: '600' }}>
                🕐 Merchant request is under review.
              </Text>
            )}
            {driverState === 'pending' && (
              <Text style={{ fontSize: 12, color: '#1E40AF', fontWeight: '600' }}>
                🕐 Driver request is under review.
              </Text>
            )}
            {merchantState === 'rejected' && (
              <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                ❌ Previous merchant request was rejected — you can re-apply.
              </Text>
            )}
            {driverState === 'rejected' && (
              <Text style={{ fontSize: 12, color: '#991B1B', fontWeight: '600' }}>
                ❌ Previous driver request was rejected — you can re-apply.
              </Text>
            )}
          </View>
        )}
      </Section>

      {/* ── Pending deletion warning ── */}
      {hasPendingDeletion && (
        <Section title="⚠️ Pending account deletion">
          <View style={S.dangerNote}>
            <Text style={S.dangerNoteTxt}>
              Your account is scheduled for permanent deletion. Sign back in before the deletion
              date or tap below to cancel.
            </Text>
          </View>
          {/* Show the exact deletion date */}
          {(() => {
            const del = requests.find(
              (r) => r.request_type === 'account_deletion' && r.status === 'pending'
            );
            return del?.scheduled_deletion_at ? (
              <Text style={{ fontSize: 12, color: '#B91C1C', fontWeight: '700', marginTop: 6 }}>
                Scheduled: {new Date(del.scheduled_deletion_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'long', year: 'numeric',
                })}
              </Text>
            ) : null;
          })()}
          <TouchableOpacity
            style={[S.bigBtn, { marginTop: 12 }]}
            onPress={cancelDeletion}
          >
            <Text style={S.bigBtnTxt}>↩️ Cancel account deletion</Text>
          </TouchableOpacity>
        </Section>
      )}

      {/* ── Request history ── */}
      <Section title="Request history">
        {loading ? (
          <ActivityIndicator color={COLORS.primary} />
        ) : requests.length === 0 ? (
          <Text style={{ color: '#9CA3AF', fontWeight: '700' }}>
            No requests yet.
          </Text>
        ) : (
          requests.map((r) => (
            <View
              key={r.id}
              style={{
                paddingVertical: 12,
                borderBottomWidth: 1,
                borderBottomColor: '#F3F4F6',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontWeight: '800', fontSize: 13, flex: 1 }}>
                  {r.request_type === 'account_deletion'
                    ? '🗑️ Account deletion'
                    : r.request_type === 'role_upgrade'
                    ? `🔼 Role: ${r.requested_role ?? '—'}`
                    : r.request_type}
                </Text>
                <Pill text={r.status.toUpperCase()} tone={statusTone(r.status)} />
              </View>

              <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                {new Date(r.created_at).toLocaleDateString('en-IN', {
                  day: '2-digit', month: 'short', year: 'numeric',
                })}
                {r.scheduled_deletion_at
                  ? ` · Deletion: ${new Date(r.scheduled_deletion_at)
                      .toLocaleDateString('en-IN', {
                        day: '2-digit', month: 'short', year: 'numeric',
                      })}`
                  : ''}
              </Text>

              {r.notes ? (
                <Text style={{ fontSize: 12, color: '#6B7280', marginTop: 3 }}>
                  {r.notes}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </Section>
    </>
  );
}