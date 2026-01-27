import React from 'react';
import { Redirect } from 'expo-router';
import { useAppSelector } from '../src/store/hooks';

export default function Index() {
  const { bootstrapped, session } = useAppSelector((s) => s.auth);

  if (!bootstrapped) return null;
  
  if (!session) return <Redirect href="/(auth)/login" />;
  
  // All authenticated users go to main app (tabs)
  return <Redirect href="/(tabs)/home" />;
}
