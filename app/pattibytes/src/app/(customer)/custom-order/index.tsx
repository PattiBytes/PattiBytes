// src/app/(customer)/custom-order/index.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { View, TouchableOpacity, Text } from 'react-native';
import { Stack } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { useAuth } from '../../../contexts/AuthContext';
import { COLORS } from '../../../lib/constants';
import { CustomOrderForm }    from '../../../components/custom-orders/CustomOrderForm';
import { CustomOrderHistory } from '../../../components/custom-orders/CustomOrderHistory';
import { CustomOrderRecord }  from '../../../components/custom-orders/types';
import { S }                  from '../../../components/custom-orders/styles';

export default function CustomOrderScreen() {
  const { user } = useAuth();
  const [tab, setTab]               = useState<'request' | 'history'>('request');
  const [loadingPast, setLoadingPast] = useState(true);
  const [pastOrders, setPastOrders]  = useState<CustomOrderRecord[]>([]);

  const loadPastOrders = useCallback(async () => {
    if (!user?.id) return;
    setLoadingPast(true);

    const { data } = await supabase
      .from('custom_order_requests')
      .select(`
        id,
        order_id,
        customer_id,
        custom_order_ref,
        category,
        description,
        image_url,
        items,
        status,
        quoted_amount,
        quote_message,
        delivery_address,
        delivery_lat,
        delivery_lng,
        total_amount,
        delivery_fee,
        payment_method,
        customer_phone,
        created_at
      `)
      .eq('customer_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20);

   setPastOrders(
  (data ?? []).map((row: any): CustomOrderRecord => ({
    id:               row.id,
    order_id:         row.order_id,
    linked_order_id:  row.order_id,        // ← same value, satisfies both fields
    customer_id:      row.customer_id,
    custom_order_ref: row.custom_order_ref,
    category:         row.category,
    description:      row.description,
    image_url:        row.image_url,
    items:            row.items,
    status:           row.status,
    quoted_amount:    row.quoted_amount,
    quote_message:    row.quote_message,
    delivery_address: row.delivery_address,
    delivery_lat:     row.delivery_lat,
    delivery_lng:     row.delivery_lng,
    total_amount:     row.total_amount,
    delivery_fee:     row.delivery_fee,
    payment_method:   row.payment_method,
    customer_phone:   row.customer_phone,
    created_at:       row.created_at,      // ← was row.createdat before, now correct
    budget:           null,
    custom_category:  row.category ? row.category.split(',') : [],
  })),
);

    setLoadingPast(false);
  }, [user?.id]);

  useEffect(() => { loadPastOrders(); }, [loadPastOrders]);

  return (
    <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
      <Stack.Screen options={{
        title: 'Custom order',
        headerStyle: { backgroundColor: COLORS.primary },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: '800' },
      }} />

      <View style={S.tabBar}>
        {([
          { key: 'request', label: 'New request', emoji: '📝' },
          { key: 'history', label: 'My requests', emoji: '📋' },
        ] as const).map(t => (
          <TouchableOpacity
            key={t.key}
            style={[S.tabItem, tab === t.key && S.tabActive]}
            onPress={() => setTab(t.key)}
            activeOpacity={0.8}
          >
            <Text style={{ fontSize: 18 }}>{t.emoji}</Text>
            <Text style={[S.tabTxt, tab === t.key && S.tabTxtActive]}>{t.label}</Text>
            {tab === t.key && <View style={S.tabLine} />}
          </TouchableOpacity>
        ))}
      </View>

      {tab === 'request' ? (
        <CustomOrderForm
          onSubmitted={() => { loadPastOrders(); setTab('history'); }}
        />
      ) : (
        <CustomOrderHistory
          loading={loadingPast}
          orders={pastOrders}
          onRefresh={loadPastOrders}
        />
      )}
    </View>
  );
}
