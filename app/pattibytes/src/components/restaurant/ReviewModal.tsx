import React, { useMemo, useState } from 'react';
import {
  View, Text, StyleSheet, Modal, KeyboardAvoidingView,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  Platform, TextInput, Pressable, ActivityIndicator, ScrollView,
} from 'react-native';
import { COLORS } from '../../lib/constants';

// ── Star labels ───────────────────────────────────────────────────────────────
const STAR_LABELS: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: 'Poor',      emoji: '😢', color: '#EF4444' },
  2: { text: 'Not great', emoji: '😕', color: '#F97316' },
  3: { text: 'Okay',      emoji: '😐', color: '#F59E0B' },
  4: { text: 'Good',      emoji: '😊', color: '#84CC16' },
  5: { text: 'Excellent', emoji: '🎉', color: '#22C55E' },
}

function StarPicker({ value, onChange }: { value: number; onChange: (n: number) => void }) {
  return (
    <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 12, paddingVertical: 10 }}>
      {[1, 2, 3, 4, 5].map(i => (
        <Pressable
          key={i}
          onPress={() => onChange(i)}
          style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.9 : i === value ? 1.15 : 1 }] })}
        >
          <Text style={{ fontSize: 36, color: i <= value ? '#F59E0B' : '#D1D5DB' }}>★</Text>
        </Pressable>
      ))}
    </View>
  )
}

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  visible:      boolean
  merchantName: string
  onClose:      () => void
  onSubmit:     (p: { rating: number; comment?: string | null }) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────
export default function ReviewModal({ visible, merchantName, onClose, onSubmit }: Props) {
  const [rating,     setRating]     = useState(5)
  const [comment,    setComment]    = useState('')
  const [submitting, setSubmitting] = useState(false)

  const label = useMemo(() => STAR_LABELS[rating] ?? STAR_LABELS[5], [rating])

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit({ rating, comment: comment.trim() || null })
      setComment('')
      setRating(5)
    } finally {
      setSubmitting(false)
    }
  }

  const handleClose = () => {
    if (submitting) return
    setComment('')
    setRating(5)
    onClose()
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={S.overlay} onPress={handleClose}>
          <Pressable style={S.sheet} onPress={e => e.stopPropagation()}>
            {/* Handle bar */}
            <View style={S.handle} />

            <Text style={S.title}>Rate {merchantName}</Text>
            <Text style={S.sub}>How was your experience? Your review helps others.</Text>

            {/* Stars */}
            <StarPicker value={rating} onChange={setRating} />

            {/* Label */}
            <View style={[S.labelBadge, { backgroundColor: label.color + '20', borderColor: label.color + '40' }]}>
              <Text style={{ fontSize: 20 }}>{label.emoji}</Text>
              <Text style={{ fontWeight: '900', color: label.color, fontSize: 16, marginLeft: 6 }}>
                {label.text}
              </Text>
            </View>

            {/* Comment */}
            <TextInput
              value={comment}
              onChangeText={setComment}
              placeholder="Share what you liked or what could be better... (optional)"
              placeholderTextColor="#9CA3AF"
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={S.input}
              maxLength={500}
            />
            <Text style={{ fontSize: 10, color: '#D1D5DB', textAlign: 'right', marginTop: 4 }}>
              {comment.length}/500
            </Text>

            {/* Buttons */}
            <View style={S.btnRow}>
              <Pressable
                style={[S.btn, S.btnCancel]}
                onPress={handleClose}
                disabled={submitting}
              >
                <Text style={S.btnCancelTxt}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[S.btn, S.btnSubmit, submitting && { opacity: 0.6 }]}
                onPress={handleSubmit}
                disabled={submitting}
              >
                {submitting
                  ? <ActivityIndicator color="#FFF" size="small" />
                  : <Text style={S.btnSubmitTxt}>Submit Review</Text>
                }
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

const S = StyleSheet.create({
  overlay:     { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheet:       { backgroundColor: '#FFF', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: Platform.OS === 'ios' ? 44 : 32, gap: 4 },
  handle:      { width: 40, height: 4, borderRadius: 2, backgroundColor: '#E5E7EB', alignSelf: 'center', marginBottom: 16 },
  title:       { fontSize: 18, fontWeight: '900', color: '#1F2937', textAlign: 'center' },
  sub:         { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4 },
  labelBadge:  { flexDirection: 'row', alignSelf: 'center', alignItems: 'center', borderWidth: 1.5, borderRadius: 20, paddingHorizontal: 16, paddingVertical: 8, marginVertical: 8 },
  input:       { borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14, padding: 14, fontSize: 14, color: '#1F2937', minHeight: 110, marginTop: 6 },
  btnRow:      { flexDirection: 'row', gap: 10, marginTop: 16 },
  btn:         { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  btnCancel:   { backgroundColor: '#F3F4F6' },
  btnCancelTxt:{ fontWeight: '800', fontSize: 14, color: '#374151' },
  btnSubmit:   { flex: 2, backgroundColor: COLORS.primary },
  btnSubmitTxt:{ fontWeight: '900', fontSize: 15, color: '#FFF' },
})
