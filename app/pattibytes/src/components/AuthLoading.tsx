import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { APP_NAME, DEVELOPER, COLORS } from '../lib/constants';

export function AuthLoading() {
  return (
    <View style={styles.container}>
      <Text style={styles.logo}>🚀</Text>
      <Text style={styles.title}>{APP_NAME}</Text>
      <ActivityIndicator size="large" color={COLORS.primary} style={styles.loader} />
      <Text style={styles.footer}>Developed by {DEVELOPER}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center'
  },
  logo: {
    fontSize: 80,
    marginBottom: 16
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 8
  },
  loader: {
    marginTop: 24
  },
  footer: {
    position: 'absolute',
    bottom: 40,
    fontSize: 12,
    color: COLORS.textLight
  }
});
