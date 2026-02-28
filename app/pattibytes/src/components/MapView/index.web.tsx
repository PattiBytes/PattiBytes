// src/components/MapView/index.web.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function MapViewStub({ style }: { style?: any }) {
  return (
    <View style={[S.placeholder, style]}>
      <Text style={S.txt}>🗺️ Map unavailable on web</Text>
    </View>
  );
}

export const Marker    = () => null;
export const Polyline  = () => null;
export const Circle    = () => null;
export const Callout   = () => null;
export const PROVIDER_GOOGLE = "google";

const S = StyleSheet.create({
  placeholder: {
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    minHeight: 160,
  },
  txt: { color: "#9CA3AF", fontSize: 14, fontWeight: "700" },
});
