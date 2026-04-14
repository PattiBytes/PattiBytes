// app/pattibytes/src/components/dashboard/LocationModal.tsx
import React, { useRef, useState } from 'react';
import {
  Modal,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from 'react-native';
import * as Location from 'expo-location';
import { COLORS } from '../../lib/constants';

type LocSugg = {
  place_id: string;
  display_name: string;
  lat: string;
  lon: string;
};

type Props = {
  visible: boolean;
  current: string;
  onClose: () => void;
  onPick: (label: string, lat: number, lng: number) => void;
};

export function LocationModal({
  visible,
  current,
  onClose,
  onPick,
}: Props) {
  const [query, setQuery] = useState('');
  const [suggs, setSuggs] = useState<LocSugg[]>([]);
  const [searching, setSearching] = useState(false);
  const [detecting, setDetecting] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const handleSearch = (q: string) => {
    setQuery(q);
    if (timerRef.current) clearTimeout(timerRef.current);
    if (q.length < 3) {
      setSuggs([]);
      return;
    }

    timerRef.current = setTimeout(async () => {
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY;
      if (!key) return;

      setSearching(true);
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      try {
        const res = await fetch(
          `https://us1.locationiq.com/v1/autocomplete?key=${key}` +
            `&q=${encodeURIComponent(q)}&countrycodes=in&limit=7&format=json`,
          { signal: abortRef.current.signal },
        );
        const data = await res.json();
        setSuggs(Array.isArray(data) ? data : []);
      } catch {
        setSuggs([]);
      } finally {
        setSearching(false);
      }
    }, 500);
  };

  const detectGPS = async () => {
    setDetecting(true);
    try {
      const { status } =
        await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied');
        return;
      }

      const pos = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = pos.coords;
      const key = process.env.EXPO_PUBLIC_LOCATIONIQ_KEY;

      let label = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;

      if (key) {
        try {
          const r = await fetch(
            `https://us1.locationiq.com/v1/reverse?key=${key}` +
              `&lat=${latitude}&lon=${longitude}&format=json`,
          );
          const g = await r.json();
          const city =
            g?.address?.city ??
            g?.address?.town ??
            g?.address?.village;
          if (city) {
            label =
              city + ', ' + (g?.address?.state ?? '');
          }
        } catch {
          // best effort
        }
      }

      onPick(label, latitude, longitude);
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e?.message ?? 'Could not detect location');
    } finally {
      setDetecting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      {/* KeyboardAvoidingView wraps the whole overlay so the sheet adjusts with keyboard */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <View style={S.overlay}>
          {/* Backdrop */}
          <TouchableOpacity
            style={S.backdrop}
            onPress={onClose}
            activeOpacity={1}
          />

          {/* Bottom sheet */}
          <View style={S.sheet}>
            {/* Header */}
            <View style={S.sheetHeader}>
              <Text style={S.sheetTitle}>Change Location</Text>
              <TouchableOpacity
                onPress={onClose}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={S.closeBtn}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Current location */}
            <View style={S.currentRow}>
              <Text style={{ fontSize: 18 }}>📍</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.currentLabel}>Current Location</Text>
                <Text
                  style={S.currentValue}
                  numberOfLines={1}
                >
                  {current}
                </Text>
              </View>
            </View>

            {/* GPS button */}
            <TouchableOpacity
              style={S.gpsBtn}
              onPress={detectGPS}
              disabled={detecting}
              activeOpacity={0.85}
            >
              {detecting ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />
              ) : (
                <Text style={{ fontSize: 20 }}>📡</Text>
              )}
              <Text style={S.gpsBtnText}>
                {detecting
                  ? 'Detecting…'
                  : 'Use my current location (GPS)'}
              </Text>
            </TouchableOpacity>

            {/* Search row */}
            <View style={S.searchRow}>
              <Text
                style={{ fontSize: 16, marginRight: 8 }}
              >
                🔍
              </Text>
              <TextInput
                style={S.searchInput}
                placeholder="Search city, area…"
                value={query}
                onChangeText={handleSearch}
                placeholderTextColor="#9CA3AF"
                returnKeyType="search"
                autoFocus
              />
              {searching ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.primary}
                />
              ) : null}
              {query.length > 0 && !searching ? (
                <TouchableOpacity
                  onPress={() => {
                    setQuery('');
                    setSuggs([]);
                  }}
                >
                  <Text
                    style={{
                      color: '#9CA3AF',
                      fontSize: 16,
                    }}
                  >
                    ✕
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* Suggestions */}
            <ScrollView
              style={{ maxHeight: 280 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {suggs.map((s, i) => (
                <TouchableOpacity
                  key={s.place_id ?? String(i)}
                  style={S.suggRow}
                  onPress={() => {
                    onPick(
                      s.display_name,
                      Number(s.lat),
                      Number(s.lon),
                    );
                    onClose();
                  }}
                >
                  <Text style={{ fontSize: 16, marginTop: 1 }}>
                    📍
                  </Text>
                  <Text style={S.suggText}>
                    {s.display_name}
                  </Text>
                </TouchableOpacity>
              ))}

              {query.length >= 3 &&
              !searching &&
              suggs.length === 0 ? (
                <Text style={S.noResults}>
                  No results found
                </Text>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const S = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  sheet: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#111827',
  },
  closeBtn: {
    fontSize: 22,
    color: '#9CA3AF',
  },
  currentRow: {
    backgroundColor: '#FFF3EE',
    borderRadius: 12,
    padding: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#FED7AA',
  },
  currentLabel: {
    fontSize: 11,
    color: '#6B7280',
    fontWeight: '600',
  },
  currentValue: {
    fontWeight: '800',
    color: COLORS.primary,
    fontSize: 14,
  },
  gpsBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: '#F0FDF4',
    borderRadius: 12,
    padding: 14,
    marginBottom: 14,
    borderWidth: 1.5,
    borderColor: '#BBF7D0',
  },
  gpsBtnText: {
    fontWeight: '700',
    color: '#065F46',
    fontSize: 14,
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 12,
    marginBottom: 8,
    backgroundColor: '#FAFAFA',
  },
  searchInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 14,
    color: '#111827',
  },
  suggRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggText: {
    flex: 1,
    fontSize: 13,
    color: '#111827',
    lineHeight: 19,
  },
  noResults: {
    textAlign: 'center',
    color: '#9CA3AF',
    paddingVertical: 20,
  },
});