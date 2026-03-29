import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { S } from "../profileStyles";
import { Section } from "../Section";
import { Pill } from "../Pill";
import { AddressEditorModal } from "../AddressEditorModal";
import type { AddressRow } from "../types";
import type { NormalizedAddress } from "../helpers";

interface Props {
  addresses: NormalizedAddress[];
  addrModalOpen: boolean;
  addrEditing: NormalizedAddress | null;
  setAddrEditing: (a: NormalizedAddress | null) => void;
  setAddrModalOpen: (v: boolean) => void;
  setDefaultAddress: (id: string) => void;
  deleteAddress: (id: string) => void;
  upsertAddress: (payload: Partial<AddressRow>) => Promise<void>;
}

export function AddressesTab({
  addresses,
  addrModalOpen,
  addrEditing,
  setAddrEditing,
  setAddrModalOpen,
  setDefaultAddress,
  deleteAddress,
  upsertAddress,
}: Props) {
  return (
    <>
      <Section
        title="Saved addresses"
        right={
          <TouchableOpacity
            onPress={() => {
              setAddrEditing(null);
              setAddrModalOpen(true);
            }}
          >
            <Text style={S.linkTxt}>+ Add</Text>
          </TouchableOpacity>
        }
      >
        {addresses.length === 0 ? (
          <View style={{ alignItems: "center", paddingVertical: 28 }}>
            <Text style={{ fontSize: 44, marginBottom: 10 }}>📍</Text>
            <Text style={{ color: "#6B7280", fontWeight: "700", fontSize: 14 }}>
              No saved addresses yet.
            </Text>
            <TouchableOpacity
              onPress={() => {
                setAddrEditing(null);
                setAddrModalOpen(true);
              }}
              style={[S.bigBtn, { paddingHorizontal: 28, marginTop: 14 }]}
            >
              <Text style={S.bigBtnTxt}>Add your first address</Text>
            </TouchableOpacity>
          </View>
        ) : (
          addresses.map((a) => (
            <View
              key={a.id}
              style={[S.addrCard, a.isDefault && S.addrCardDefault]}
            >
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                <Text style={S.addrTitle}>
                  {a.label === "Home"
                    ? "🏠"
                    : a.label === "Work"
                    ? "💼"
                    : "📍"}{" "}
                  {a.label}
                </Text>
                {a.isDefault ? <Pill text="DEFAULT" tone="warn" /> : null}
              </View>
              <Text style={S.addrText} numberOfLines={3}>
                {a.address}
              </Text>
              {a.recipientName || a.recipientPhone ? (
                <Text style={S.addrMeta}>
                  {[a.recipientName, a.recipientPhone]
                    .filter(Boolean)
                    .join(" · ")}
                </Text>
              ) : null}
              {a.landmark ? (
                <Text style={S.addrMeta}>📌 Near {a.landmark}</Text>
              ) : null}
              {a.deliveryInstructions ? (
                <Text style={S.addrInstr} numberOfLines={2}>
                  💡 {a.deliveryInstructions}
                </Text>
              ) : null}

              <View style={S.addrBtnRow}>
                {!a.isDefault ? (
                  <TouchableOpacity
                    style={[S.smallBtn, S.smallBtnSoft]}
                    onPress={() => setDefaultAddress(a.id)}
                  >
                    <Text style={S.smallBtnTxt}>Set default</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={{ flex: 1 }} />
                )}
                <TouchableOpacity
                  style={[S.smallBtn, S.smallBtnSoft]}
                  onPress={() => {
                    setAddrEditing(a);
                    setAddrModalOpen(true);
                  }}
                >
                  <Text style={S.smallBtnTxt}>✏️ Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[S.smallBtn, S.smallBtnDanger]}
                  onPress={() => deleteAddress(a.id)}
                >
                  <Text style={[S.smallBtnTxt, { color: "#B91C1C" }]}>
                    🗑️ Delete
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </Section>

      <AddressEditorModal
        open={addrModalOpen}
        onClose={() => setAddrModalOpen(false)}
        initial={addrEditing}
        onSave={upsertAddress}
      />
    </>
  );
}