import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Modal, KeyboardAvoidingView, Platform, TextInput, Pressable, ActivityIndicator } from 'react-native';
import { COLORS } from '../../lib/constants';
import StarRating from '../ui/StarRating';

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 8 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Pressable key={i} onPress={() => onChange(i)}>
          <Text style={{ fontSize: 34, color: i <= value ? '#F59E0B' : '#D1D5DB' }}>★</Text>
        </Pressable>
      ))}
    </View>
  );
}

export default function ReviewModal({
  visible,
  merchantName,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  merchantName: string;
  onClose: () => void;
  onSubmit: (p: { rating: number; comment?: string | null }) => Promise<void>;
}) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const label = useMemo(() => {
    if (rating <= 1) return 'Poor';
    if (rating === 2) return 'Not great';
    if (rating === 3) return 'Okay';
    if (rating === 4) return 'Good';
    return 'Excellent';
  }, [rating]);

  async function handleSubmit() {
    if (submitting) return;
    setSubmitting(true);
    try {
      await onSubmit({ rating, comment: comment.trim() ? comment.trim() : null });
      setComment('');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={S.overlay}>
          <View style={S.sheet}>
            <Text style={S.title}>Rate {merchantName}</Text>
            <Text style={S.sub}>How was your experience?</Text>

            <StarPicker value={rating} onChange={setRating} />
            <View style={{ alignItems: 'center', marginTop: 4 }}>
              <StarRating rating={rating} size={18} />
              <Text style={{ marginTop: 8, fontWeight: '900', color: COLORS.text }}>{label}</Text>
            </View>

            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Write a short review (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={S.input}
            />

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 16 }}>
              <Pressable style={[S.btn, { backgroundColor: '#F3F4F6', flex: 1 }]} onPress={onClose} disabled={submitting}>
                <Text style={[S.btnTxt, { color: '#374151' }]}>Cancel</Text>
              </Pressable>

              <Pressable style={[S.btn, { backgroundColor: COLORS.primary, flex: 2, opacity: submitting ? 0.6 : 1 }]} onPress={handleSubmit} disabled={submitting}>
                {submitting ? <ActivityIndicator color="#FFF" /> : <Text style={[S.btnTxt, { color: '#FFF' }]}>Submit</Text>}
              </Pressable>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#FFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: 36 },
  title: { fontSize: 18, fontWeight: '900', color: COLORS.text, textAlign: 'center' },
  sub: { fontSize: 13, color: COLORS.textLight, textAlign: 'center', marginTop: 6, marginBottom: 8 },
  input: { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 12, padding: 13, fontSize: 14, color: COLORS.text, minHeight: 100, marginTop: 14 },
  btn: { alignItems: 'center', paddingVertical: 13, borderRadius: 12 },
  btnTxt: { fontWeight: '900', fontSize: 15 },
});
