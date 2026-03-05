// app/pattibytes/src/components/custom-orders/CustomItemList.tsx
import React from 'react';
import { View, Text, TextInput, TouchableOpacity } from 'react-native';
import { CustomOrderItem } from './types';
import { S } from './styles';

type Props = {
  items: CustomOrderItem[];
  onChange: (items: CustomOrderItem[]) => void;
};

export function CustomItemList({ items, onChange }: Props) {
  const update = (idx: number, patch: Partial<CustomOrderItem>) => {
    const next = [...items];
    next[idx] = { ...next[idx], ...patch };
    onChange(next);
  };

  const addRow = () => {
    onChange([
      ...items,
      { id: String(Date.now()), name: '', quantity: 1, notes: '' },
    ]);
  };

  const removeRow = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  return (
    <View style={S.section}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={S.secLabel}>Item list (optional)</Text>
        <TouchableOpacity onPress={addRow}>
          <Text style={{ color: '#2563EB', fontWeight: '700', fontSize: 12 }}>+ Add item</Text>
        </TouchableOpacity>
      </View>

      {items.length === 0 ? (
        <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 8 }}>
          Add each item you want (e.g. “Amul milk 1L × 2”).
        </Text>
      ) : null}

      {items.map((item, idx) => (
        <View
          key={item.id}
          style={{
            marginTop: 10,
            borderWidth: 1,
            borderColor: '#E5E7EB',
            borderRadius: 10,
            padding: 10,
          }}
        >
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#4B5563' }}>
              Item #{idx + 1}
            </Text>
            <TouchableOpacity onPress={() => removeRow(idx)}>
              <Text style={{ fontSize: 11, color: '#EF4444', fontWeight: '700' }}>Remove</Text>
            </TouchableOpacity>
          </View>

          <TextInput
            style={[S.input, { marginTop: 8 }]}
            placeholder="Name / brand (e.g. Milk, Amul, 1L)"
            value={item.name}
            onChangeText={text => update(idx, { name: text })}
            placeholderTextColor="#9CA3AF"
          />

          <View style={{ flexDirection: 'row', marginTop: 8, gap: 10 }}>
            <View style={{ flex: 0.4 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280' }}>Qty</Text>
              <TextInput
                style={[S.input, { marginTop: 4, paddingVertical: 8 }]}
                value={item.quantity ? String(item.quantity) : ''}
                onChangeText={t =>
                  update(idx, {
                    quantity: Number(t.replace(/[^0-9]/g, '')) || 1,
                  })
                }
                keyboardType="numeric"
                placeholder="1"
                placeholderTextColor="#9CA3AF"
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#6B7280' }}>Notes</Text>
              <TextInput
                style={[S.input, { marginTop: 4, paddingVertical: 8 }]}
                placeholder="Brand preference, pack size, etc."
                value={item.notes ?? ''}
                onChangeText={text => update(idx, { notes: text })}
                placeholderTextColor="#9CA3AF"
              />
            </View>
          </View>
        </View>
      ))}
    </View>
  );
}
