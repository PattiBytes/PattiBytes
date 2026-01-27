import React, { useEffect } from 'react';
import 'react-native-gesture-handler';
import { Stack } from 'expo-router';
import { Provider } from 'react-redux';
import * as SplashScreen from 'expo-splash-screen';
import { store } from '../src/store';
import { useAppDispatch, useAppSelector } from '../src/store/hooks';
import { bootstrapAuth, fetchMyProfile, setSession } from '../src/features/auth/authSlice';
import { supabase } from '../src/lib/supabase';
import { AuthLoading } from '../src/components/AuthLoading';
import registerForPushNotifications from '../src/lib/notifications';

SplashScreen.preventAutoHideAsync();

function AuthListener() {
  const dispatch = useAppDispatch();
  const { bootstrapped } = useAppSelector((s) => s.auth);

  useEffect(() => {
    dispatch(bootstrapAuth())
      .unwrap()
      .then(async (sess) => {
        if (sess) {
          dispatch(fetchMyProfile());
          // Register for push notifications
          try {
            await registerForPushNotifications(sess.user.id);
          } catch (error) {
            console.log('Push notification registration failed:', error);
          }
        }
      })
      .finally(() => {
        SplashScreen.hideAsync();
      });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      dispatch(setSession(session ?? null));
      if (session) dispatch(fetchMyProfile());
    });

    return () => sub.subscription.unsubscribe();
  }, [dispatch]);

  if (!bootstrapped) return <AuthLoading />;

  return null;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AuthListener />
      <Stack screenOptions={{ headerShown: false }} />
    </Provider>
  );
}
