// src/components/custom-orders/ProductPicker.tsx
import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Modal, ScrollView,
  ActivityIndicator, Image,
} from 'react-native';
import { supabase } from '../../lib/supabase';
import { COLORS } from '../../lib/constants';
import { CatalogProduct, CustomOrderItem } from './types';
import { S } from './styles';

type Props = {
  selectedCats: string[];
  items: CustomOrderItem[];
  onItemsChange: (items: CustomOrderItem[]) => void;
};

export function ProductPicker({ selectedCats, items, onItemsChange }: Props) {
  const [showModal, setShowModal] = useState(false);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [qtys, setQtys] = useState<Record<string, number>>({});

  const loadProducts = async () => {
    if (!selectedCats.length) return;
    setLoading(true);
    const { data } = await supabase
      .from('customproducts')
      .select('id, name, category, price, unit, imageurl, description, isactive')
      .in('category', selectedCats)
      .eq('isactive', true)
      .order('name');
    setProducts((data ?? []) as CatalogProduct[]);
    // Initialize qty map from already-added items
    const init: Record<string, number> = {};
    items.forEach(i => { if (i.from_catalog) init[i.id] = i.quantity; });
    setQtys(init);
    setLoading(false);
  };

  useEffect(() => {
    if (showModal) loadProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showModal, selectedCats]);

  const setQty = (id: string, qty: number) => {
    setQtys(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[id];
      else next[id] = qty;
      return next;
    });
  };

  const confirmSelection = () => {
    // Remove previous catalog items, keep manual items
    const manualItems = items.filter(i => !i.from_catalog);
    const catalogItems: CustomOrderItem[] = products
      .filter(p => qtys[p.id] > 0)
      .map(p => ({
        id: p.id,
        name: p.name,
        quantity: qtys[p.id],
        unit: p.unit,
        price: p.price,
        from_catalog: true,
      }));
    onItemsChange([...manualItems, ...catalogItems]);
    setShowModal(false);
  };

  const catalogItemCount = items.filter(i => i.from_catalog).length;

  if (!selectedCats.length) return null;

  return (
    <>
      <TouchableOpacity
        onPress={() => setShowModal(true)}
        style={[S.section, {
          flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        }]}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
          <Text style={{ fontSize: 22 }}>🛒</Text>
          <View>
            <Text style={S.secLabel}>Pick from catalog</Text>
            <Text style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>
              {catalogItemCount > 0
                ? `${catalogItemCount} product(s) selected`
                : 'Browse & add products for your categories'}
            </Text>
          </View>
        </View>
        <View style={{
          backgroundColor: COLORS.primary, borderRadius: 8,
          paddingHorizontal: 10, paddingVertical: 6,
        }}>
          <Text style={{ color: '#fff', fontWeight: '700', fontSize: 11 }}>Browse →</Text>
        </View>
      </TouchableOpacity>

      <Modal visible={showModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowModal(false)}>
        <View style={{ flex: 1, backgroundColor: '#F8F9FA' }}>
          {/* Header */}
          <View style={{
            flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
            backgroundColor: COLORS.primary, paddingHorizontal: 16, paddingVertical: 14,
            paddingTop: 50,
          }}>
            <Text style={{ color: '#fff', fontWeight: '800', fontSize: 16 }}>Catalog Products</Text>
            <TouchableOpacity onPress={() => setShowModal(false)}>
              <Text style={{ color: '#fff', fontSize: 20, fontWeight: '300' }}>✕</Text>
            </TouchableOpacity>
          </View>

          {loading ? (
            <ActivityIndicator color={COLORS.primary} style={{ marginTop: 40 }} />
          ) : products.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 60 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>📦</Text>
              <Text style={{ fontWeight: '800', color: '#374151', fontSize: 15 }}>No catalog products</Text>
              <Text style={{ color: '#9CA3AF', marginTop: 6, textAlign: 'center', paddingHorizontal: 30 }}>
                No products available for the selected categories. Add items manually instead.
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: 14, gap: 10, paddingBottom: 100 }}>
              {products.map(p => {
                const qty = qtys[p.id] ?? 0;
                return (
                  <View
                    key={p.id}
                    style={[
                      S.histCard,
                      qty > 0 && { borderWidth: 1.5, borderColor: COLORS.primary },
                    ]}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                      {p.imageurl ? (
                        <Image
                          source={{ uri: p.imageurl }}
                          style={{ width: 60, height: 60, borderRadius: 10 }}
                          resizeMode="cover"
                        />
                      ) : (
                        <View style={{
                          width: 60, height: 60, borderRadius: 10,
                          backgroundColor: '#F3F4F6', alignItems: 'center', justifyContent: 'center',
                        }}>
                          <Text style={{ fontSize: 28 }}>📦</Text>
                        </View>
                      )}
                      <View style={{ flex: 1 }}>
                        <Text style={{ fontWeight: '800', color: '#111827', fontSize: 13 }}>{p.name}</Text>
                        <Text style={{ fontSize: 11, color: '#6B7280', marginTop: 2 }}>{p.description}</Text>
                        <Text style={{ fontSize: 13, fontWeight: '800', color: COLORS.primary, marginTop: 4 }}>
                          ₹{p.price} / {p.unit}
                        </Text>
                      </View>
                      {/* Qty stepper */}
                      <View style={{ alignItems: 'center', gap: 6 }}>
                        {qty > 0 ? (
                          <View style={{
                            flexDirection: 'row', alignItems: 'center',
                            borderWidth: 1.5, borderColor: COLORS.primary, borderRadius: 8,
                          }}>
                            <TouchableOpacity
                              onPress={() => setQty(p.id, qty - 1)}
                              style={{ width: 30, height: 32, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 18 }}>−</Text>
                            </TouchableOpacity>
                            <Text style={{ width: 28, textAlign: 'center', fontWeight: '800', color: COLORS.primary }}>
                              {qty}
                            </Text>
                            <TouchableOpacity
                              onPress={() => setQty(p.id, qty + 1)}
                              style={{ width: 30, height: 32, alignItems: 'center', justifyContent: 'center' }}
                            >
                              <Text style={{ color: COLORS.primary, fontWeight: '800', fontSize: 18 }}>+</Text>
                            </TouchableOpacity>
                          </View>
                        ) : (
                          <TouchableOpacity
                            onPress={() => setQty(p.id, 1)}
                            style={{
                              backgroundColor: COLORS.primary, borderRadius: 8,
                              paddingHorizontal: 12, paddingVertical: 8,
                            }}
                          >
                            <Text style={{ color: '#fff', fontWeight: '700', fontSize: 12 }}>+ Add</Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>
                );
              })}
            </ScrollView>
          )}

          {/* Confirm bar */}
          {!loading && products.length > 0 && (
            <View style={{
              position: 'absolute', bottom: 0, left: 0, right: 0,
              backgroundColor: '#fff', padding: 16, paddingBottom: 30,
              borderTopWidth: 1, borderTopColor: '#F3F4F6', elevation: 10,
            }}>
              <TouchableOpacity
                onPress={confirmSelection}
                style={{
                  backgroundColor: COLORS.primary, borderRadius: 14, padding: 16, alignItems: 'center',
                }}
              >
                <Text style={{ color: '#fff', fontWeight: '800', fontSize: 15 }}>
                  ✓ Add selected ({Object.values(qtys).reduce((a, b) => a + b, 0)} items)
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </Modal>
    </>
  );
}
