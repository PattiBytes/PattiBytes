import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { COLORS } from '../../lib/constants'
import { STATUS_ORDER } from './constants'

interface Step { key: string; label: string; emoji: string }
interface Props { timeline: Step[]; status: string }

export default function OrderTimeline({ timeline, status }: Props) {
  const currentStep = STATUS_ORDER.indexOf(status)

  return (
    <View style={S.section}>
      <Text style={S.title}>📍 Order Progress</Text>
      {timeline.map((step, idx) => {
        const stepIdx   = STATUS_ORDER.indexOf(step.key)
        const done      = stepIdx <= currentStep
        const isCurrent = step.key === status || (step.key === 'picked_up' && status === 'assigned')
        const nextDone  = idx < timeline.length - 1 &&
          STATUS_ORDER.indexOf(timeline[idx + 1].key) <= currentStep

        return (
          <View key={step.key} style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
            <View style={{ alignItems: 'center', width: 40 }}>
              <View style={[S.dot, done && S.dotDone, isCurrent && S.dotCurrent, !done && S.dotPending]}>
                {done
                  ? <Text style={{ fontSize: 14 }}>{step.emoji}</Text>
                  : <View style={S.dotEmpty} />
                }
              </View>
              {idx < timeline.length - 1 && (
                <View style={[S.line, nextDone && S.lineDone]} />
              )}
            </View>
            <View style={{ flex: 1, paddingLeft: 12, paddingBottom: 22, paddingTop: 4 }}>
              <Text style={[S.label, done && S.labelDone, isCurrent && S.labelCurrent]}>
                {step.label}
              </Text>
              {isCurrent && (
                <Text style={{ fontSize: 11, color: COLORS.primary, marginTop: 2, fontWeight: '600' }}>
                  ● Current status
                </Text>
              )}
            </View>
          </View>
        )
      })}
    </View>
  )
}

const S = StyleSheet.create({
  section:     { backgroundColor: '#fff', marginHorizontal: 16, marginTop: 10, borderRadius: 16, padding: 16, elevation: 1, shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  title:       { fontSize: 15, fontWeight: '800', color: '#1F2937', marginBottom: 16 },
  dot:         { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  dotDone:     { backgroundColor: '#D1FAE5', borderWidth: 2, borderColor: '#10B981' },
  dotCurrent:  { backgroundColor: '#FFF3EE', borderWidth: 2.5, borderColor: COLORS.primary },
  dotPending:  { backgroundColor: '#F3F4F6', borderWidth: 2, borderColor: '#D1D5DB' },
  dotEmpty:    { width: 10, height: 10, borderRadius: 5, backgroundColor: '#D1D5DB' },
  line:        { width: 2, height: 28, backgroundColor: '#E5E7EB', marginTop: 2 },
  lineDone:    { backgroundColor: '#10B981' },
  label:       { fontSize: 14, color: '#9CA3AF', fontWeight: '500' },
  labelDone:   { color: '#1F2937', fontWeight: '700' },
  labelCurrent:{ color: COLORS.primary, fontWeight: '800' },
})
