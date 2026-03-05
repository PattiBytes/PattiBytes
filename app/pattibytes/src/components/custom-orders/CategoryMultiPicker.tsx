// app/pattibytes/src/components/custom-orders/CategoryMultiPicker.tsx
import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { CATEGORIES } from './helpers';
import { S } from './styles';

type Props = {
  selected: string[];
  onChange: (next: string[]) => void;
};

export function CategoryMultiPicker({ selected, onChange }: Props) {
  const toggle = (id: string) => {
    if (selected.includes(id)) {
      onChange(selected.filter(x => x !== id));
    } else {
      onChange([...selected, id]);
    }
  };

  return (
    <View style={S.section}>
      <Text style={S.secLabel}>What do you need?</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 }}>
        {CATEGORIES.map((c) => {
          const active = selected.includes(c.id);
          return (
            <TouchableOpacity
              key={c.id}
              style={[S.catPill, active && S.catPillActive]}
              onPress={() => toggle(c.id)}
              activeOpacity={0.8}
            >
              <Text style={{ fontSize: 22 }}>{c.emoji}</Text>
              <Text style={[S.catPillLabel, active && { color: '#fff' }]}>{c.label}</Text>
              <Text
                style={[
                  S.catPillDesc,
                  active && { color: 'rgba(255,255,255,0.8)' },
                ]}
              >
                {c.desc}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}
