 
/**
 * 3-step account deletion flow
 *  Step 1 – Warning + optional reason
 *  Step 2 – Type DELETE to confirm
 *  Step 3 – Submits with request_type='account_deletion', requested_role='customer'
 *            (satisfies access_requested_role_check constraint), 30-day grace period
 *  Signs out the user immediately after insert succeeds.
 */

import React, { useMemo, useState } from 'react';
import {
  Modal, View, Text, TextInput,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { S } from './profileStyles';

interface Props {
  open:    boolean;
  userId:  string;
  onClose: () => void;
}

type Step = 1 | 2;

export function AccountDeletionModal({ open, userId, onClose }: Props) {
  const router = useRouter();

  const [step,        setStep]        = useState<Step>(1);
  const [confirmText, setConfirmText] = useState('');
  const [reason,      setReason]      = useState('');
  const [loading,     setLoading]     = useState(false);

  const scheduledDatePreview = useMemo(() => {
    return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-IN');
  }, []);

  function reset() {
    setStep(1);
    setConfirmText('');
    setReason('');
    setLoading(false);
  }

  function handleClose() {
    reset();
    onClose();
  }

  async function submitDeletion() {
    if (!userId) return;
    setLoading(true);

    try {
      const nowIso              = new Date().toISOString();
      const scheduledDeletionAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

      // ── Guard: no duplicate pending deletion ───────────────────────────────
      const { data: existingPending, error: checkErr } = await supabase
        .from('access_requests')
        .select('id, scheduled_deletion_at')
        .eq('user_id', userId)
        .eq('request_type', 'account_deletion')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (checkErr) throw checkErr;

      if (existingPending?.id) {
        await supabase.auth.signOut();
        Alert.alert(
          'Already requested',
          `Your account is already scheduled for deletion on ${new Date(
            existingPending.scheduled_deletion_at,
          ).toLocaleDateString('en-IN')}.`,
          [{
            text: 'OK',
            onPress: () => { handleClose(); router.replace('/(auth)/login' as any); },
          }],
        );
        return;
      }

      // ── Insert deletion request ────────────────────────────────────────────
      // requested_role MUST be a valid enum value to satisfy
      // the CHECK constraint access_requested_role_check.
      // For account_deletion we use 'customer' as a neutral placeholder.
      const { error: reqErr } = await supabase
        .from('access_requests')
        .insert({
          user_id:                userId,
          requested_role:         'customer',   // ← satisfies CHECK constraint
          status:                 'pending',
          notes:                  reason.trim() || null,
          reviewed_by:            null,
          reviewed_at:            null,
          created_at:             nowIso,
          updated_at:             nowIso,
          request_type:           'account_deletion',
          scheduled_deletion_at:  scheduledDeletionAt,
          cancellation_reason:    null,
        });

      if (reqErr) throw reqErr;

      // ── Mark profile as pending deletion ──────────────────────────────────
       
    const { error: profErr } = await supabase
  .from('profiles')
  .update({
    account_status: 'pending deletion',
    updated_at: nowIso,
  })
  .eq('id', userId);

if (profErr) {
  // Non-fatal: deletion request was already inserted.
  // Log it but don't block the flow — user should still be signed out.
  console.warn('[AccountDeletion] Profile status update failed:', profErr.message);
}

await supabase.auth.signOut();

      Alert.alert(
        '🗑️ Request submitted',
        `Your account is scheduled for deletion on ${new Date(scheduledDeletionAt)
          .toLocaleDateString('en-IN')}.\n\nAdmins have been notified. Sign back in within 30 days to cancel.`,
        [{
          text: 'OK',
          onPress: () => { handleClose(); router.replace('/(auth)/login' as any); },
        }],
      );
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not submit deletion request. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (!open) return null;

  return (
    <Modal transparent animationType="fade" visible={open} onRequestClose={handleClose}>
      <View style={S.modalOverlay}>
        <View style={S.modalCard}>

          {/* ── Step 1: Warning ── */}
          {step === 1 && (
            <>
              <Text style={[S.modalTitle, { color: '#B91C1C' }]}>Delete Account</Text>

              <View style={S.dangerNote}>
                <Text style={S.dangerNoteTxt}>
                  This will schedule your account for permanent deletion in{' '}
                  <Text style={{ fontWeight: '900' }}>30 days</Text>. All your orders,
                  addresses, and data will be{' '}
                  <Text style={{ fontWeight: '900' }}>permanently erased</Text>.{'\n\n'}
                  Planned deletion date:{' '}
                  <Text style={{ fontWeight: '900' }}>{scheduledDatePreview}</Text>.{'\n\n'}
                  You can cancel this by signing back in before that date.
                </Text>
              </View>

              <Text style={S.fieldLbl}>Reason for leaving (optional)</Text>
              <TextInput
                style={[S.input, { minHeight: 64, textAlignVertical: 'top' }]}
                value={reason}
                onChangeText={setReason}
                placeholder="Tell us why you're leaving..."
                placeholderTextColor="#9CA3AF"
                multiline
              />

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity style={[S.btn, S.btnGhost]} onPress={handleClose}>
                  <Text style={[S.btnTxt, { color: '#6B7280' }]}>Keep account</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[S.btn, { backgroundColor: '#FEF2F2', borderWidth: 1.5, borderColor: '#FECACA' }]}
                  onPress={() => setStep(2)}
                >
                  <Text style={[S.btnTxt, { color: '#B91C1C' }]}>Continue →</Text>
                </TouchableOpacity>
              </View>
            </>
          )}

          {/* ── Step 2: Confirm ── */}
          {step === 2 && (
            <>
              <Text style={[S.modalTitle, { color: '#B91C1C' }]}>Confirm Deletion</Text>

              <Text style={{ fontSize: 14, color: '#4B5563', lineHeight: 20, marginBottom: 12 }}>
                Type{' '}
                <Text style={{ fontWeight: '900', color: '#B91C1C' }}>DELETE</Text>
                {' '}in capital letters to confirm you understand this action is irreversible.
              </Text>

              <TextInput
                style={[
                  S.input,
                  { borderColor: confirmText === 'DELETE' ? '#10B981' : '#FECACA' },
                ]}
                value={confirmText}
                onChangeText={(v) => setConfirmText(v.toUpperCase())}
                placeholder="Type DELETE here"
                autoCapitalize="characters"
                placeholderTextColor="#9CA3AF"
              />

              {!!confirmText && confirmText !== 'DELETE' && (
                <Text style={S.hintErr}>Type DELETE exactly</Text>
              )}
              {confirmText === 'DELETE' && (
                <Text style={S.hintOk}>✓ Confirmed</Text>
              )}

              <View style={{ flexDirection: 'row', gap: 10, marginTop: 18 }}>
                <TouchableOpacity style={[S.btn, S.btnGhost]} onPress={() => setStep(1)}>
                  <Text style={[S.btnTxt, { color: '#6B7280' }]}>← Back</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    S.btn,
                    S.btnDanger,
                    (confirmText !== 'DELETE' || loading) && { opacity: 0.4 },
                  ]}
                  onPress={submitDeletion}
                  disabled={confirmText !== 'DELETE' || loading}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" size="small" />
                    : <Text style={[S.btnTxt, { color: '#fff' }]}>Delete my account</Text>
                  }
                </TouchableOpacity>
              </View>
            </>
          )}

        </View>
      </View>
    </Modal>
  );
}