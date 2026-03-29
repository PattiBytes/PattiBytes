// app/legal/_layout.tsx
import { Stack } from 'expo-router';
import { COLORS } from '../../lib/constants';

export default function LegalLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#FFF' },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontWeight: '800', fontSize: 16 },
        headerShadowVisible: false,
        // headerLeft is overridden per-screen in [slug].tsx
      }}
    />
  );
}