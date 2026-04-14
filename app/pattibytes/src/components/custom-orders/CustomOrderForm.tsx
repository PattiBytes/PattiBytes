// src/components/custom-orders/CustomOrderForm.tsx
import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, TextInput,
  KeyboardAvoidingView, Platform, Alert, ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { supabase }              from '../../lib/supabase';
import { useAuth }               from '../../contexts/AuthContext';
import { COLORS }                from '../../lib/constants';
import { getDeliveryFeeFromHub } from '../../services/location';
import { getDeliveryPolicy }     from '../../services/deliveryFee';
import { CategoryMultiPicker }   from './CategoryMultiPicker';
import { CustomItemList }        from './CustomItemList';
import { ImagePickerGrid }       from './ImagePickerGrid';
import { AddressPicker }         from './AddressPicker';
import { ProductPicker }         from './ProductPicker';
import { CustomOrderItem, SavedAddressLocal } from './types';
import { generateCustomRef }     from './helpers';
import { S } from './styles';

type Props = { onSubmitted: () => void };

export function CustomOrderForm({ onSubmitted }: Props) {
  const router   = useRouter();
  const { user } = useAuth();

  const [selectedCats, setSelectedCats] = useState<string[]>([]);
  const [description,  setDescription]  = useState('');
  const [budget,       setBudget]       = useState('');
  const [address,      setAddress]      = useState('');
  const [addressId,    setAddressId]    = useState<string | null>(null);
  const [selectedAddr, setSelectedAddr] = useState<SavedAddressLocal | null>(null);
  const [notes,        setNotes]        = useState('');
  const [items,        setItems]        = useState<CustomOrderItem[]>([]);
  // ✅ Holds Cloudinary URLs (https://...) — ImagePickerGrid uploads before returning
  const [imageUrls,    setImageUrls]    = useState<string[]>([]);
  const [submitting,   setSubmitting]   = useState(false);

  // ── Delivery fee state ──────────────────────────────────────────────────────
  const [deliveryFee,       setDeliveryFee]       = useState<number | null>(null);
  const [deliveryDistKm,    setDeliveryDistKm]    = useState<number | null>(null);
  const [deliveryBreakdown, setDeliveryBreakdown] = useState<string>('');
  const [calcingFee,        setCalcingFee]        = useState(false);

  const canSubmit =
    selectedCats.length > 0 &&
    description.trim().length >= 10 &&
    address.trim().length > 0;

  const resetForm = () => {
    setSelectedCats([]); setDescription(''); setBudget('');
    setAddress(''); setAddressId(null); setSelectedAddr(null);
    setNotes(''); setItems([]); setImageUrls([]);
    setDeliveryFee(null); setDeliveryDistKm(null);
    setDeliveryBreakdown(''); setCalcingFee(false);
  };

  // ── Address selected → calculate delivery fee ───────────────────────────────
  const handleAddressSelect = async (
    fullAddress: string,
    id: string | null,
    addr?: SavedAddressLocal,
  ) => {
    setAddress(fullAddress);
    setAddressId(id);
    setSelectedAddr(addr ?? null);
    setDeliveryFee(null);
    setDeliveryBreakdown('');

    const lat = addr?.latitude;
    const lng = addr?.longitude;
    if (!lat || !lng) {
      setDeliveryBreakdown('Fee will be calculated after address is verified');
      return;
    }

    setCalcingFee(true);
    try {
      const policy   = await getDeliveryPolicy();
      const settings = {
        base_delivery_radius_km: policy.base_radius_km,
        per_km_fee_beyond_base:  policy.per_km_fee_beyond_base,
      };
      const result = await getDeliveryFeeFromHub(lat, lng, settings);
      setDeliveryFee(result.fee);
      setDeliveryDistKm(result.distKm);
      setDeliveryBreakdown(result.breakdown);
    } catch {
      setDeliveryFee(35);
      setDeliveryBreakdown('Base delivery fee (location calculation failed)');
    } finally {
      setCalcingFee(false);
    }
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!user?.id) { Alert.alert('Login required'); return; }
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const ref       = generateCustomRef();
      const budgetNum = budget ? parseFloat(budget) : null;
      const subtotal  = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);
      const finalFee  = deliveryFee ?? 35;
      const totalAmt  = budgetNum ?? (subtotal > 0 ? subtotal + finalFee : 0);

      const dbItems = items.map(i => ({
        id:                  i.id,
        name:                i.name,
        quantity:            i.quantity,
        price:               i.price ?? 0,
        note:                i.notes ?? null,
        is_veg:              null,
        is_free:             false,
        category:            i.from_catalog ? (selectedCats[0] ?? null) : null,
        image_url:           null,
        merchant_id:         null,
        menu_item_id:        i.menu_item_id ?? i.id,
        is_custom_product:   i.from_catalog ?? false,
        discount_percentage: 0,
      }));

      // ── 1. Insert custom_order_requests ────────────────────────────────────
      const { data: cor, error: corErr } = await supabase
        .from('custom_order_requests')
        .insert({
          customer_id:      user.id,
          custom_order_ref: ref,
          category:         selectedCats.join(','),
          description:      description.trim(),
          // ✅ Primary image — already a Cloudinary URL, safe to store
          image_url:        imageUrls[0] ?? null,
          // ✅ All uploaded image URLs stored — none lost
          image_urls:       imageUrls.length > 0 ? imageUrls : null,
          items:            dbItems.length ? dbItems : null,
          status:           'pending',
          delivery_address: address.trim(),
          delivery_lat:     selectedAddr?.latitude  ?? null,
          delivery_lng:     selectedAddr?.longitude ?? null,
          total_amount:     totalAmt,
          delivery_fee:     finalFee,
          payment_method:   'cod',
          customer_phone:   selectedAddr?.recipient_phone ?? null,
        })
        .select('id')
        .single();

      if (corErr) throw corErr;

      // ── 2. Insert orders ───────────────────────────────────────────────────
      const { data: order, error: orderErr } = await supabase
        .from('orders')
        .insert({
          customer_id:          user.id,
          merchant_id:          null,
          driver_id:            null,
          status:               'pending',
          subtotal:             subtotal,
          delivery_fee:         finalFee,
          tax:                  0,
          payment_method:       'cod',
          payment_status:       'pending',
          delivery_address:     address.trim(),
          customer_notes:       notes.trim() || null,
          items:                dbItems.length
                                  ? dbItems
                                  : [{ id: 'desc', name: description.trim(), quantity: 1 }],
          total_amount:         totalAmt,
          discount:             0,
          order_type:           'custom',
          customer_phone:       selectedAddr?.recipient_phone ?? null,
          recipient_name:       selectedAddr?.recipient_name  ?? null,
          delivery_latitude:    selectedAddr?.latitude  ?? null,
          delivery_longitude:   selectedAddr?.longitude ?? null,
          delivery_distance_km: deliveryDistKm ?? null,
          delivery_address_id:  addressId ?? null,
          special_instructions: notes.trim() || null,
          custom_order_ref:     ref,
          custom_order_status:  'pending',
          platform_handled:     true,
          custom_category:      selectedCats,
          // ✅ Cloudinary URL — viewable by admins, drivers, anyone
          custom_image_url:     imageUrls[0] ?? null,
          // ✅ All image URLs preserved
          custom_image_urls:    imageUrls.length > 0 ? imageUrls : null,
        })
        .select('id, order_number')
        .single();

      if (orderErr) throw orderErr;

      // ── 3. Back-link ───────────────────────────────────────────────────────
      await supabase
        .from('custom_order_requests')
        .update({ order_id: order.id })
        .eq('id', cor.id);

      // ── 4. Notifications: self + admins ────────────────────────────────────
      const selfNotif = {
        user_id: user.id,
        title:   `Custom request submitted ✅ (${ref})`,
        message: 'We received your order. A quote will be sent shortly.',
        type:    'custom_order_created',
        data:    { order_id: order.id, custom_order_request_id: cor.id, ref },
        body:    description.slice(0, 140),
      };

      const { data: admins } = await supabase
        .from('profiles')
        .select('id')
        .in('role', ['admin', 'superadmin']);

      const adminNotifs = (admins ?? []).map((a: { id: string }) => ({
        user_id: a.id,
        title:   `New custom order ${ref}`,
        message: description.slice(0, 120),
        type:    'custom_order_admin',
        data:    { order_id: order.id, custom_order_request_id: cor.id, customer_id: user.id, ref },
        body:    description.slice(0, 140),
      }));

      await supabase.from('notifications').insert([selfNotif, ...adminNotifs]);

      Alert.alert(
        'Order submitted 🎉',
        `Reference: ${ref}\nDelivery fee: ₹${finalFee}\n\nWe will confirm and quote your custom order shortly.`,
        [
          {
            text: 'View in Orders',
            onPress: () => { resetForm(); onSubmitted(); router.push('/(customer)/orders' as any); },
          },
          {
            text: 'New request',
            onPress: () => { resetForm(); onSubmitted(); },
          },
        ],
      );
    } catch (e: any) {
      Alert.alert('Error', e.message ?? 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const subtotalCalc = items.reduce((s, i) => s + (i.price ?? 0) * i.quantity, 0);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 16, gap: 14, paddingBottom: 60 }}>

        {/* ── Info banner ── */}
        <View style={S.banner}>
          <Text style={{ fontSize: 22, marginRight: 10 }}>💡</Text>
          <View style={{ flex: 1 }}>
            <Text style={{ fontWeight: '800', color: '#92400E', fontSize: 13 }}>
              Can&apos;t find it in the shop?
            </Text>
            <Text style={{ fontSize: 12, color: '#92400E', marginTop: 2, lineHeight: 18 }}>
              Select categories, add an item list or pick from catalog, then submit!
            </Text>
          </View>
          <TouchableOpacity
            style={S.shopLinkBtn}
            onPress={() => router.push('/(customer)/shop' as any)}
          >
            <Text style={{ color: COLORS.primary, fontWeight: '700', fontSize: 11 }}>
              Browse Shop →
            </Text>
          </TouchableOpacity>
        </View>

        <CategoryMultiPicker selected={selectedCats} onChange={setSelectedCats} />
        <ProductPicker selectedCats={selectedCats} items={items} onItemsChange={setItems} />

        {/* ── Description ── */}
        <View style={S.section}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={S.secLabel}>Describe your order</Text>
            <Text style={{
              fontSize: 11, fontWeight: '700',
              color: description.length >= 10 ? '#22C55E' : '#EF4444',
            }}>
              {description.length}/500 {description.length >= 10 ? '✓' : '(min 10)'}
            </Text>
          </View>
          <TextInput
            style={[S.input, { minHeight: 100, textAlignVertical: 'top', marginTop: 8 }]}
            placeholder="Explain clearly — e.g. 1 kg butter chicken + 4 naan, pack properly"
            value={description}
            onChangeText={t => setDescription(t.slice(0, 500))}
            multiline
            numberOfLines={5}
            placeholderTextColor="#9CA3AF"
          />
        </View>

        <CustomItemList items={items} onChange={setItems} />

        {/* ── Budget ── */}
        <View style={S.section}>
          <Text style={S.secLabel}>
            Budget <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</Text>
          </Text>
          <TextInput
            style={[S.input, { marginTop: 8 }]}
            placeholder="₹ Maximum you want to spend"
            value={budget}
            onChangeText={t => setBudget(t.replace(/[^0-9.]/g, ''))}
            keyboardType="numeric"
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* ── Address picker ── */}
        {user?.id && (
          <AddressPicker
            userId={user.id}
            selectedAddress={address}
            selectedAddressId={addressId}
            onSelect={handleAddressSelect}
          />
        )}

        {/* ── Delivery fee card ── */}
        {address.trim().length > 0 && (
          <View style={{
            backgroundColor: calcingFee ? '#F9FAFB' : deliveryFee !== null ? '#F0FDF4' : '#FFFBEB',
            borderRadius: 12, padding: 12, borderWidth: 1.5,
            borderColor: calcingFee ? '#E5E7EB' : deliveryFee !== null ? '#BBF7D0' : '#FDE68A',
          }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={{ fontSize: 18 }}>🚚</Text>
              <View style={{ flex: 1 }}>
                {calcingFee ? (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={{ fontSize: 12, color: '#6B7280' }}>
                      Calculating delivery fee…
                    </Text>
                  </View>
                ) : deliveryFee !== null ? (
                  <>
                    <Text style={{ fontSize: 13, fontWeight: '800', color: '#065F46' }}>
                      Delivery fee: ₹{deliveryFee}
                    </Text>
                    <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>
                      {deliveryBreakdown}
                    </Text>
                  </>
                ) : (
                  <Text style={{ fontSize: 12, color: '#92400E' }}>
                    {deliveryBreakdown || 'Select a saved address with coordinates for accurate fee'}
                  </Text>
                )}
              </View>
            </View>
          </View>
        )}

        {/* ── Special instructions ── */}
        <View style={S.section}>
          <Text style={S.secLabel}>
            Special instructions{' '}
            <Text style={{ color: '#9CA3AF', fontWeight: '400' }}>(optional)</Text>
          </Text>
          <TextInput
            style={[S.input, { minHeight: 60, textAlignVertical: 'top', marginTop: 8 }]}
            placeholder="Any notes for the delivery person or shopper"
            value={notes}
            onChangeText={setNotes}
            multiline
            placeholderTextColor="#9CA3AF"
          />
        </View>

        {/* ✅ imageUrls now contains Cloudinary URLs */}
        <ImagePickerGrid imageUris={imageUrls} onChange={setImageUrls} />

        {/* ── Order summary ── */}
        {canSubmit && (
          <View style={{
            backgroundColor: '#F8F9FA', borderRadius: 12, padding: 14,
            borderWidth: 1, borderColor: '#E5E7EB', gap: 6,
          }}>
            <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827', marginBottom: 2 }}>
              Order Summary
            </Text>
            {subtotalCalc > 0 && (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Items subtotal</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>
                  ₹{subtotalCalc.toFixed(2)}
                </Text>
              </View>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={{ fontSize: 12, color: '#6B7280' }}>Delivery fee</Text>
              {calcingFee
                ? <ActivityIndicator size="small" color={COLORS.primary} />
                : <Text style={{ fontSize: 12, fontWeight: '700', color: '#111827' }}>
                    {deliveryFee !== null ? `₹${deliveryFee}` : '₹35 (est.)'}
                  </Text>}
            </View>
            {budget ? (
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ fontSize: 12, color: '#6B7280' }}>Your budget cap</Text>
                <Text style={{ fontSize: 12, fontWeight: '700', color: COLORS.primary }}>
                  ₹{budget}
                </Text>
              </View>
            ) : null}
            {subtotalCalc > 0 && (
              <>
                <View style={{ height: 1, backgroundColor: '#E5E7EB', marginVertical: 2 }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 13, fontWeight: '800', color: '#111827' }}>
                    Estimated total
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: '900', color: COLORS.primary }}>
                    ₹{(subtotalCalc + (deliveryFee ?? 35)).toFixed(2)}
                  </Text>
                </View>
              </>
            )}
          </View>
        )}

        {/* ── Action buttons ── */}
        <View style={{ flexDirection: 'row', gap: 10 }}>
          <TouchableOpacity style={S.resetBtn} onPress={resetForm}>
            <Text style={{ color: '#6B7280', fontWeight: '700' }}>↺ Reset</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[S.submitBtn, { flex: 1 }, (!canSubmit || submitting || calcingFee) && { opacity: 0.45 }]}
            onPress={handleSubmit}
            disabled={!canSubmit || submitting || calcingFee}
            activeOpacity={0.85}
          >
            {submitting
              ? <ActivityIndicator color="#fff" />
              : <Text style={S.submitBtnTxt}>📤  Submit Custom Order</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  );
}