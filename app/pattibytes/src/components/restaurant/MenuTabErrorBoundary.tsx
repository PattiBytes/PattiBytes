// src/components/restaurant/MenuTabErrorBoundary.tsx
import React from 'react';
import { View, Text } from 'react-native';

export class MenuTabErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  componentDidCatch(e: Error) { console.error('[MenuTab crash]', e); }

  render() {
    if (this.state.hasError)
      return (
        <View style={{ padding: 24, alignItems: 'center' }}>
          <Text style={{ fontSize: 20 }}>🍽️</Text>
          <Text style={{ fontWeight: '800', marginTop: 8 }}>
            Menu failed to load
          </Text>
          <Text style={{ color: '#6B7280', marginTop: 4 }}>
            Pull down to refresh
          </Text>
        </View>
      );
    return this.props.children;
  }
}