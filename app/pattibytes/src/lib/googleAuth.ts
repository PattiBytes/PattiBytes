import { Platform } from 'react-native';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import { supabase } from './supabase';

// Configure Google Sign-In for native platforms
if (Platform.OS !== 'web') {
  GoogleSignin.configure({
    webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    offlineAccess: true,
  });
}

WebBrowser.maybeCompleteAuthSession();

// Google Sign-In for Android/iOS (Native)
async function signInWithGoogleNative() {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    
    if (userInfo.data?.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: userInfo.data.idToken,
      });
      
      if (error) throw error;

      // Check if profile exists, create if not
      const { error: profileError } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', data.user.id)
        .single();

      if (profileError && profileError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        await supabase.from('profiles').insert({
          id: data.user.id,
          full_name: userInfo.data.user.name || 'User',
          avatar_url: userInfo.data.user.photo,
          role: 'user',
        });
      }

      return data;
    } else {
      throw new Error('No ID token present');
    }
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error('Sign in was cancelled');
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error('Sign in is already in progress');
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error('Play services not available or outdated');
    } else {
      throw error;
    }
  }
}

// Google Sign-In for Web
async function signInWithGoogleWeb() {
  try {
    const redirectUri = AuthSession.makeRedirectUri({
      scheme: 'pattibytesexpress',
      path: 'auth/callback',
    });

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUri,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) throw error;

    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(
        data.url,
        redirectUri
      );

      if (result.type === 'success') {
        const url = result.url;
        const params = new URLSearchParams(url.split('#')[1]);
        const accessToken = params.get('access_token');
        const refreshToken = params.get('refresh_token');

        if (accessToken) {
          const { data: sessionData, error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (sessionError) throw sessionError;
          if (!sessionData.user) throw new Error('No user data');

          // Check if profile exists
          const { error: profileError } = await supabase
            .from('profiles')
            .select('id')
            .eq('id', sessionData.user.id)
            .single();

          if (profileError && profileError.code === 'PGRST116') {
            await supabase.from('profiles').insert({
              id: sessionData.user.id,
              full_name: sessionData.user.user_metadata?.full_name || 'User',
              avatar_url: sessionData.user.user_metadata?.avatar_url,
              role: 'user',
            });
          }

          return sessionData;
        }
      } else if (result.type === 'cancel') {
        throw new Error('Sign in was cancelled');
      }
    }
    throw new Error('Could not complete sign in');
  } catch (error) {
    throw error;
  }
}

// Main Google Sign-In function (works on all platforms)
export async function signInWithGoogle() {
  if (Platform.OS === 'web') {
    return await signInWithGoogleWeb();
  } else {
    return await signInWithGoogleNative();
  }
}

// Sign out
export async function signOutGoogle() {
  try {
    if (Platform.OS !== 'web') {
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        // User might not be signed in with Google
        console.log('Google sign out skipped:', e);
      }
    }
    await supabase.auth.signOut();
  } catch (error) {
    console.error('Sign out error:', error);
  }
}
