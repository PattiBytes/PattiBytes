import React, { memo, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { COLORS } from '../../lib/constants'

// ── Config ────────────────────────────────────────────────────────────────────
const STAR_LABELS: Record<number, { text: string; emoji: string; color: string }> = {
  1: { text: 'Very poor', emoji: '😢', color: '#EF4444' },
  2: { text: 'Not great',  emoji: '😕', color: '#F97316' },
  3: { text: 'Okay',       emoji: '😐', color: '#F59E0B' },
  4: { text: 'Good',       emoji: '😊', color: '#84CC16' },
  5: { text: 'Excellent',  emoji: '🎉', color: '#22C55E' },
}

const SUB_CATEGORIES = [
  { key: 'food_rating'     as const, emoji: '🍔', label: 'Food quality' },
  { key: 'delivery_rating' as const, emoji: '🚚', label: 'Delivery'     },
  { key: 'driver_rating'   as const, emoji: '🛵', label: 'Driver'       },
]

// ── Sub-components ─────────────────────────────────────────────────────────────
const StarPicker = memo(function StarPicker({
  value,
  size = 38,
  onChange,
}: {
  value: number
  size?: number
  onChange: (n: number) => void
}) {
  return (
    <View style={SP.row}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = i <= value
        return (
          <Pressable
            key={i}
            onPress={() => onChange(i)}
            style={({ pressed }) => ({
              transform: [{ scale: pressed ? 0.88 : filled && i === value ? 1.18 : 1 }],
              opacity: pressed ? 0.8 : 1,
            })}
            hitSlop={8}
          >
            <Text style={[SP.star, { fontSize: size, color: filled ? '#F59E0B' : '#E5E7EB' }]}>
              ★
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
})
const SP = StyleSheet.create({
  row:  { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingVertical: 6 },
  star: { lineHeight: undefined },
})

const MiniStarPicker = memo(function MiniStarPicker({
  value,
  onChange,
}: {
  value: number | null
  onChange: (n: number | null) => void
}) {
  return (
    <View style={{ flexDirection: 'row', gap: 4 }}>
      {[1, 2, 3, 4, 5].map(i => {
        const filled = value !== null && i <= value
        return (
          <Pressable
            key={i}
            onPress={() => onChange(value === i ? null : i)}
            hitSlop={6}
          >
            <Text style={{ fontSize: 22, color: filled ? '#F59E0B' : '#E5E7EB' }}>★</Text>
          </Pressable>
        )
      })}
    </View>
  )
})

// ── Props ─────────────────────────────────────────────────────────────────────
interface ReviewModalProps {
  visible: boolean
  merchantName: string
  onClose: () => void
  onSubmit: (p: {
    rating: number
    comment?: string | null
    food_rating?: number | null
    delivery_rating?: number | null
    driver_rating?: number | null
  }) => Promise<void>
}

// ── Component ─────────────────────────────────────────────────────────────────
function ReviewModal({ visible, merchantName, onClose, onSubmit }: ReviewModalProps) {
  const [step,         setStep]         = useState<1 | 2>(1)
  const [rating,       setRating]       = useState(5)
  const [comment,      setComment]      = useState('')
  const [subRatings,   setSubRatings]   = useState<Record<string, number | null>>({
    food_rating: null,
    delivery_rating: null,
    driver_rating: null,
  })
  const [submitting,   setSubmitting]   = useState(false)

  const label     = useMemo(() => STAR_LABELS[rating] ?? STAR_LABELS[5], [rating])
  const charLeft  = 500 - comment.length
  const charColor = charLeft < 50 ? '#EF4444' : charLeft < 100 ? '#F59E0B' : '#D1D5DB'

  const reset = () => {
    setStep(1)
    setRating(5)
    setComment('')
    setSubRatings({ food_rating: null, delivery_rating: null, driver_rating: null })
    setSubmitting(false)
  }

  const handleClose = () => {
    if (submitting) return
    reset()
    onClose()
  }

  const handleNext = () => {
    if (step === 1) { setStep(2); return }
  }

  const handleBack = () => {
    if (step === 2) setStep(1)
  }

  const handleSubmit = async () => {
    if (submitting) return
    setSubmitting(true)
    try {
      await onSubmit({
        rating,
        comment: comment.trim() || null,
        food_rating:     subRatings.food_rating ?? null,
        delivery_rating: subRatings.delivery_rating ?? null,
        driver_rating:   subRatings.driver_rating ?? null,
      })
      reset()
    } finally {
      setSubmitting(false)
    }
  }

  // Sentiment bar fill (1-5 → 20-100%)
  const barFill   = `${rating * 20}%` as any
  const barColor  = label.color

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={M.overlay} onPress={handleClose}>
          {/* Stop propagation so taps inside don't dismiss */}
          <Pressable style={M.sheet} onPress={e => e.stopPropagation()}>
            <ScrollView
              bounces={false}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {/* Handle */}
              <View style={M.handle} />

              {/* Step indicator */}
              <View style={M.stepRow}>
                {[1, 2].map(s => (
                  <View
                    key={s}
                    style={[M.stepDot, s === step && M.stepDotActive]}
                  />
                ))}
              </View>

              {/* Title */}
              <Text style={M.title}>
                {step === 1 ? `Rate ${merchantName}` : 'Tell us more'}
              </Text>
              <Text style={M.sub}>
                {step === 1
                  ? 'How was your overall experience?'
                  : 'Rate individual aspects (optional)'}
              </Text>

              {/* ── STEP 1: Overall rating ── */}
              {step === 1 && (
                <View style={M.stepCard}>
                  {/* Sentiment bar */}
                  <View style={M.sentimentTrack}>
                    <View style={[M.sentimentFill, { width: barFill, backgroundColor: barColor }]} />
                  </View>

                  <StarPicker value={rating} size={44} onChange={setRating} />

                  {/* Label badge */}
                  <View style={[M.labelBadge, { backgroundColor: label.color + '18', borderColor: label.color + '40' }]}>
                    <Text style={{ fontSize: 22 }}>{label.emoji}</Text>
                    <Text style={[M.labelTxt, { color: label.color }]}>{label.text}</Text>
                  </View>

                  {/* Quick comment */}
                  <View style={M.inputWrap}>
                    <TextInput
                      value={comment}
                      onChangeText={t => setComment(t.slice(0, 500))}
                      placeholder="What stood out? (optional)"
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={4}
                      textAlignVertical="top"
                      style={M.input}
                    />
                    <View style={M.charRow}>
                      <Text style={[M.charCount, { color: charColor }]}>{charLeft}/500</Text>
                    </View>
                  </View>
                </View>
              )}

              {/* ── STEP 2: Sub-ratings ── */}
              {step === 2 && (
                <View style={M.stepCard}>
                  {SUB_CATEGORIES.map(cat => (
                    <View key={cat.key} style={M.subRow}>
                      <View style={M.subLabelWrap}>
                        <Text style={{ fontSize: 20 }}>{cat.emoji}</Text>
                        <Text style={M.subLabel}>{cat.label}</Text>
                      </View>
                      <MiniStarPicker
                        value={subRatings[cat.key] ?? null}
                        onChange={v => setSubRatings(prev => ({ ...prev, [cat.key]: v }))}
                      />
                      {subRatings[cat.key] != null && (
                        <View style={[M.subBadge, { backgroundColor: STAR_LABELS[subRatings[cat.key]!]?.color + '20' }]}>
                          <Text style={{ fontSize: 10, fontWeight: '800', color: STAR_LABELS[subRatings[cat.key]!]?.color }}>
                            {STAR_LABELS[subRatings[cat.key]!]?.text}
                          </Text>
                        </View>
                      )}
                    </View>
                  ))}

                  {/* Summary */}
                  <View style={M.summaryBox}>
                    <Text style={M.summaryTitle}>Your overall rating</Text>
                    <View style={M.summaryRow}>
                      <Text style={[M.summaryNum, { color: label.color }]}>{rating}</Text>
                      <Text style={{ fontSize: 20 }}>{label.emoji}</Text>
                      <Text style={[M.summaryLbl, { color: label.color }]}>{label.text}</Text>
                    </View>
                    {!!comment.trim() && (
                      <Text style={M.summaryComment} numberOfLines={2}>
                        &quot;{comment.trim()}&quot;
                      </Text>
                    )}
                  </View>
                </View>
              )}

              {/* ── Buttons ── */}
              <View style={M.btnRow}>
                {step === 2 && (
                  <Pressable
                    style={[M.btn, M.btnBack]}
                    onPress={handleBack}
                    disabled={submitting}
                  >
                    <Text style={M.btnBackTxt}>← Back</Text>
                  </Pressable>
                )}

                {step === 1 && (
                  <Pressable
                    style={[M.btn, M.btnCancel]}
                    onPress={handleClose}
                    disabled={submitting}
                  >
                    <Text style={M.btnCancelTxt}>Cancel</Text>
                  </Pressable>
                )}

                {step === 1 ? (
                  <Pressable style={[M.btn, M.btnNext]} onPress={handleNext}>
                    <Text style={M.btnNextTxt}>Next →</Text>
                  </Pressable>
                ) : (
                  <Pressable
                    style={[M.btn, M.btnSubmit, submitting && { opacity: 0.6 }]}
                    onPress={handleSubmit}
                    disabled={submitting}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                      <Text style={M.btnSubmitTxt}>Submit Review ✓</Text>
                    )}
                  </Pressable>
                )}
              </View>

              {/* Safe-area bottom pad */}
              <View style={{ height: Platform.OS === 'ios' ? 20 : 8 }} />
            </ScrollView>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  )
}

export default memo(ReviewModal)

// ── Styles ────────────────────────────────────────────────────────────────────
const M = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 20 : 12,
    maxHeight: '90%',
  },
  handle: {
    width: 42, height: 5, borderRadius: 3,
    backgroundColor: '#E5E7EB',
    alignSelf: 'center',
    marginTop: 12, marginBottom: 14,
  },

  stepRow:        { flexDirection: 'row', justifyContent: 'center', gap: 6, marginBottom: 16 },
  stepDot:        { width: 6, height: 6, borderRadius: 3, backgroundColor: '#E5E7EB' },
  stepDotActive:  { width: 20, backgroundColor: COLORS.primary },

  title: { fontSize: 20, fontWeight: '900', color: '#1F2937', textAlign: 'center' },
  sub:   { fontSize: 13, color: '#9CA3AF', textAlign: 'center', marginTop: 4, marginBottom: 16, lineHeight: 18 },

  stepCard: { gap: 14 },

  // Sentiment bar
  sentimentTrack: {
    height: 6, backgroundColor: '#F3F4F6',
    borderRadius: 3, overflow: 'hidden',
    marginBottom: 4,
  },
  sentimentFill: { height: '100%', borderRadius: 3 },

  // Label badge
  labelBadge: {
    flexDirection: 'row', alignSelf: 'center', alignItems: 'center',
    borderWidth: 1.5, borderRadius: 22,
    paddingHorizontal: 18, paddingVertical: 8, gap: 8,
  },
  labelTxt: { fontWeight: '900', fontSize: 16 },

  // Comment input
  inputWrap:  { gap: 4 },
  input: {
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    padding: 14, fontSize: 14, color: '#1F2937', minHeight: 100,
  },
  charRow:   { flexDirection: 'row', justifyContent: 'flex-end' },
  charCount: { fontSize: 10, fontWeight: '700' },

  // Sub-rating row
  subRow: {
    backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12,
    gap: 8, borderWidth: 1, borderColor: '#F3F4F6',
  },
  subLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  subLabel:     { fontWeight: '800', color: '#1F2937', fontSize: 13 },
  subBadge: {
    alignSelf: 'flex-start', borderRadius: 999,
    paddingHorizontal: 10, paddingVertical: 3, marginTop: 2,
  },

  // Summary box
  summaryBox: {
    backgroundColor: '#F9FAFB', borderRadius: 14,
    padding: 14, gap: 6, borderWidth: 1, borderColor: '#F3F4F6',
  },
  summaryTitle: { fontSize: 11, color: '#9CA3AF', fontWeight: '800', letterSpacing: 0.5 },
  summaryRow:   { flexDirection: 'row', alignItems: 'center', gap: 8 },
  summaryNum:   { fontSize: 32, fontWeight: '900', lineHeight: 36 },
  summaryLbl:   { fontWeight: '800', fontSize: 15 },
  summaryComment: { color: '#6B7280', fontStyle: 'italic', fontSize: 12, lineHeight: 17 },

  // Buttons
  btnRow:       { flexDirection: 'row', gap: 10, marginTop: 20 },
  btn:          { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  btnCancel:    { backgroundColor: '#F3F4F6', borderWidth: 0 },
  btnCancelTxt: { fontWeight: '800', fontSize: 14, color: '#374151' },
  btnBack:      { backgroundColor: '#F3F4F6', flex: 0, paddingHorizontal: 18 },
  btnBackTxt:   { fontWeight: '800', fontSize: 14, color: '#374151' },
  btnNext:      { flex: 2, backgroundColor: COLORS.primary },
  btnNextTxt:   { fontWeight: '900', fontSize: 15, color: '#FFF' },
  btnSubmit:    { flex: 2, backgroundColor: COLORS.primary },
  btnSubmitTxt: { fontWeight: '900', fontSize: 15, color: '#FFF' },
})