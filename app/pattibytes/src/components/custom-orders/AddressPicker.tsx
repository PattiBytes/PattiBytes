// src/components/custom-orders/AddressPicker.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, TextInput,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';
import { SavedAddressLocal } from './types';
import { formatSavedAddress } from './helpers';
import { S } from './styles';

type Props = {
  userId: string;
  selectedAddress: string;
  selectedAddressId: string | null;
  onSelect: (address: string, id: string | null, addr?: SavedAddressLocal) => void;
};

export function AddressPicker({ userId, selectedAddress, selectedAddressId, onSelect }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [saved, setSaved] = useState<SavedAddressLocal[]>([]);
  const [loading, setLoading] = useState(false);
  const [manualMode, setManualMode] = useState(false);
  const [manualText, setManualText] = useState(selectedAddress);

  const loadAddresses = async () => {
    setLoading(true);
    // Table: saved_addresses, columns: snake_case
    const { data, error } = await supabase
      .from('saved_addresses')
      .select(`
        id,
        label,
        recipient_name,
        recipient_phone,
        address,
        apartment_floor,
        landmark,
        latitude,
        longitude,
        city,
        state,
        postal_code,
        is_default,
        delivery_instructions
      `)
      .eq('customer_id', userId)
      .order('is_default', { ascending: false })
      .order('created_at', { ascending: false });

    if (!error) {
      setSaved((data ?? []) as SavedAddressLocal[]);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (showModal) loadAddresses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal]);

  const pickSaved = (a: SavedAddressLocal) => {
    const full = formatSavedAddress(a);
    onSelect(full, a.id, a);
    setManualText(full);
    setShowModal(false);
  };

  const confirmManual = () => {
    if (manualText.trim()) {
      onSelect(manualText.trim(), null);
    }
    setShowModal(false);
  };

  return (
    <>
      <View style={S.section}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <Text style={S.secLabel}>Delivery address</Text>
          <TouchableOpacity onPress={() => setShowModal(true)}>
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 12 }}>
              {selectedAddress ? '✏️ Change' : '📍 Select'}
            </Text>
          </TouchableOpacity>
        </View>

        {selectedAddress ? (
          <View style={{
            backgroundColor: '#F0FDF4', borderRadius: 10, padding: 10,
            borderWidth: 1.5, borderColor: '#BBF7D0',
          }}>
            <Text style={{ fontSize: 12, fontWeight: '700', color: '#065F46', marginBottom: 2 }}>
              {selectedAddressId ? '📍 Saved address' : '✏️ Manual address'}
            </Text>
            <Text style={{ fontSize: 13, color: '#374151', lineHeight: 18 }}>
              {selectedAddress}
            </Text>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => setShowModal(true)}
            style={{
              borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 10,
              borderStyle: 'dashed', padding: 14, alignItems: 'center',
            }}
          >
            <Text style={{ fontSize: 22, marginBottom: 4 }}>📍</Text>
            <Text style={{ color: '#9CA3AF', fontSize: 13 }}>Tap to select delivery address</Text>
          </TouchableOpacity>
        )}
      </View>

      <Modal
        visible={showModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowModal(false)}
      >
        <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: COLORS.primary, paddingHorizontal: 16,
            paddingVertical: 14, paddingTop: 50,
          }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Delivery Address</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 40 }}>
            {/* Manage link */}
            <TouchableOpacity
              onPress={() => { setShowModal(false); router.push('/(customer)/addresses' as any); }}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#EEF2FF', borderRadius: 12, padding: 12,
                borderWidth: 1.5, borderColor: '#A5B4FC',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>🏠</Text>
                <Text style={{ color: '#4338CA', fontWeight: '700', fontSize: 13 }}>
                  Manage saved addresses
                </Text>
              </View>
              <Text style={{ color: '#4338CA', fontWeight: '800' }}>→</Text>
            </TouchableOpacity>

            {loading ? (
              <ActivityIndicator color={COLORS.primary} style={{ marginVertical: 20 }} />
            ) : saved.length > 0 ? (
              <>
                <Text style={{ fontSize: 12, fontWeight: '800', color: '#6B7280', letterSpacing: 0.5 }}>
                  SAVED ADDRESSES
                </Text>
                {saved.map(a => (
                  <TouchableOpacity
                    key={a.id}
                    onPress={() => pickSaved(a)}
                    style={[
                      {
                        backgroundColor: '#fff', borderRadius: 14, padding: 14,
                        borderWidth: 1.5, borderColor: '#E5E7EB', elevation: 1,
                      },
                      selectedAddressId === a.id && {
                        borderColor: COLORS.primary, backgroundColor: '#FFF3EE',
                      },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 16 }}>
                          {a.label?.toLowerCase() === 'home' ? '🏠' :
                           a.label?.toLowerCase() === 'work' ? '💼' : '📍'}
                        </Text>
                        <Text style={{ fontWeight: '800', color: '#111827', fontSize: 13 }}>{a.label}</Text>
                        {a.is_default && (
                          <View style={{
                            backgroundColor: '#FFF3EE', borderRadius: 6,
                            paddingHorizontal: 6, paddingVertical: 2,
                            borderWidth: 1, borderColor: COLORS.primary,
                          }}>
                            <Text style={{ color: COLORS.primary, fontSize: 9, fontWeight: '800' }}>DEFAULT</Text>
                          </View>
                        )}
                      </View>
                      {selectedAddressId === a.id && (
                        <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 16 }}>✓</Text>
                      )}
                    </View>
                    <Text style={{ fontSize: 12, color: '#374151', lineHeight: 18 }}>
                      {formatSavedAddress(a)}
                    </Text>
                    {a.recipient_name ? (
                      <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>
                        👤 {a.recipient_name}{a.recipient_phone ? ` · ${a.recipient_phone}` : ''}
                      </Text>
                    ) : null}
                    {a.delivery_instructions ? (
                      <Text style={{ fontSize: 11, color: '#F59E0B', marginTop: 3 }}>
                        📋 {a.delivery_instructions}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                ))}
              </>
            ) : (
              <View style={{
                backgroundColor: '#fff', borderRadius: 12, padding: 20,
                alignItems: 'center', borderWidth: 1, borderColor: '#E5E7EB',
              }}>
                <Text style={{ fontSize: 36, marginBottom: 8 }}>📍</Text>
                <Text style={{ fontWeight: '700', color: '#374151', marginBottom: 4 }}>No saved addresses</Text>
                <Text style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center' }}>
                  Add addresses from the Addresses page for faster checkout.
                </Text>
              </View>
            )}

            {/* Manual entry */}
            <TouchableOpacity
              onPress={() => setManualMode(v => !v)}
              style={{
                flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
                backgroundColor: '#fff', borderRadius: 12, padding: 12,
                borderWidth: 1.5, borderColor: '#E5E7EB',
              }}
            >
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 18 }}>✏️</Text>
                <Text style={{ color: '#374151', fontWeight: '700', fontSize: 13 }}>Enter address manually</Text>
              </View>
              <Text style={{ color: '#9CA3AF', fontWeight: '800' }}>{manualMode ? '▲' : '▼'}</Text>
            </TouchableOpacity>

            {manualMode && (
              <View style={{
                backgroundColor: '#fff', borderRadius: 12, padding: 14,
                borderWidth: 1.5, borderColor: '#E5E7EB',
              }}>
                <TextInput
                  style={[S.input, { minHeight: 90, textAlignVertical: 'top' }]}
                  placeholder="Full address with landmark, city, pincode"
                  value={manualText}
                  onChangeText={setManualText}
                  multiline
                  placeholderTextColor="#9CA3AF"
                />
                <TouchableOpacity
                  onPress={confirmManual}
                  disabled={!manualText.trim()}
                  style={{
                    marginTop: 10, backgroundColor: COLORS.primary,
                    borderRadius: 10, padding: 12, alignItems: 'center',
                    opacity: manualText.trim() ? 1 : 0.4,
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '800' }}>Use this address</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </Modal>
    </>
  );
}
