// app/legal/_layout.tsx
import { Stack } from "expo-router";
import { COLORS } from "../../lib/constants";

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        // Disables iOS swipe-back gesture — prevents returning to cart/checkout
        gestureEnabled: false,
        headerStyle:      { backgroundColor: "#fff" },
        headerTintColor:  COLORS.text,
        headerTitleStyle: { fontWeight: "800", fontSize: 16 },
        headerShadowVisible: false,
      }}
    />
  );
}