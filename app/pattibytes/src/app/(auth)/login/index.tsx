/* eslint-disable react-hooks/exhaustive-deps */
// app/(auth)/login/index.tsx
import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
  ActivityIndicator, Image, Animated, Linking,
} from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { router } from 'expo-router';
import { supabase } from '../../../lib/supabase';
import { signInWithGoogle } from '../../../lib/googleAuth';
import { signInWithApple, isAppleSignInAvailable } from '../../../lib/appleAuth';
import { COLORS } from '../../../lib/constants';

type AppSettings = { app_name?: string; app_logo_url?: string };

async function fetchAppSettings(): Promise<AppSettings> {
  try {
    const { data } = await supabase
      .from('app_settings')
      .select('app_name,app_logo_url')
      .limit(1)
      .maybeSingle();
    return (data as AppSettings) ?? {};
  } catch {
    return {};
  }
}

async function resolveEmail(input: string): Promise<string> {
  const trimmed = input.trim();
  if (!trimmed) throw new Error('Please enter your email or username.');

  // Direct email — no lookup needed
  if (trimmed.includes('@')) {
    return trimmed.toLowerCase();
  }

  // Username lookup — uses SECURITY DEFINER RPC to bypass RLS
  const { data: email, error } = await supabase
    .rpc('get_email_by_username', { p_username: trimmed });

  if (error) {
    // Network/DB error — not a "not found" error
    throw new Error('Could not look up username. Please try again.');
  }

  if (!email) {
    throw new Error(`No account found for username "${trimmed}".`);
  }

  return String(email).toLowerCase();
}

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [gLoading, setGLoading] = useState(false);
  const [aLoading, setALoading] = useState(false);
  const [error, setError] = useState('');
  const [settings, setSettings] = useState<AppSettings>({});
  const [appleAvail, setAppleAvail] = useState(false);
  const [idFocused, setIdFocused] = useState(false);
  const [pwFocused, setPwFocused] = useState(false);

  const shakeAnim = useRef(new Animated.Value(0)).current;
  const passwordRef = useRef<TextInput>(null);

  const heroAnim = useRef(new Animated.Value(0)).current;
  const guestAnim = useRef(new Animated.Value(0)).current;
  const cardAnim = useRef(new Animated.Value(0)).current;

  const heroY = useRef(new Animated.Value(-12)).current;
  const guestY = useRef(new Animated.Value(12)).current;
  const cardY = useRef(new Animated.Value(18)).current;

  const idBorder = useRef(new Animated.Value(0)).current;
  const pwBorder = useRef(new Animated.Value(0)).current;
  const signInScale = useRef(new Animated.Value(1)).current;
  const guestScale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    fetchAppSettings().then(setSettings);
    isAppleSignInAvailable().then(setAppleAvail);

    Animated.stagger(90, [
      Animated.parallel([
        Animated.timing(heroAnim, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(heroY, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(guestAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.spring(guestY, { toValue: 0, damping: 18, stiffness: 180, useNativeDriver: true }),
      ]),
      Animated.parallel([
        Animated.timing(cardAnim, { toValue: 1, duration: 340, useNativeDriver: true }),
        Animated.spring(cardY, { toValue: 0, damping: 18, stiffness: 170, useNativeDriver: true }),
      ]),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(idBorder, {
      toValue: idFocused ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [idFocused]);

  useEffect(() => {
    Animated.timing(pwBorder, {
      toValue: pwFocused ? 1 : 0,
      duration: 160,
      useNativeDriver: false,
    }).start();
  }, [pwFocused]);

  function shake() {
    Animated.sequence([
      Animated.timing(shakeAnim, { toValue: 10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: -10, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 8, duration: 55, useNativeDriver: true }),
      Animated.timing(shakeAnim, { toValue: 0, duration: 55, useNativeDriver: true }),
    ]).start();
  }

  function pressIn(anim: Animated.Value) {
    Animated.spring(anim, { toValue: 0.96, useNativeDriver: true, speed: 60 }).start();
  }

  function pressOut(anim: Animated.Value) {
    Animated.spring(anim, { toValue: 1, useNativeDriver: true, speed: 60 }).start();
  }

  async function handleLogin() {
    setError('');
    const id = identifier.trim();

    if (!id || !password) {
      setError('Please fill in all fields.');
      shake();
      return;
    }

    setLoading(true);
    try {
      const email = await resolveEmail(id);
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) throw signInError;
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      shake();

      if (/No account found|no account found/i.test(msg)) {
        setError(msg);
      } else if (/invalid login|invalid credentials/i.test(msg)) {
        setError('Incorrect email/username or password.');
      } else if (/email not confirmed/i.test(msg)) {
        setError('Please verify your email first.');
      } else if (/too many/i.test(msg)) {
        setError('Too many attempts. Please wait a moment.');
      } else {
        setError(msg || 'Sign in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogle() {
    setError('');
    setGLoading(true);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (msg === 'Sign in was cancelled') return;
      setError(msg || 'Google sign-in failed.');
    } finally {
      setGLoading(false);
    }
  }

  async function handleApple() {
    setError('');
    setALoading(true);
    try {
      await signInWithApple();
    } catch (err: any) {
      const msg = String(err?.message ?? '');
      if (
        msg === 'Sign in was cancelled' ||
        msg.includes('ERR_CANCELED') ||
        msg.includes('1001')
      ) return;
      setError(msg || 'Apple sign-in failed.');
    } finally {
      setALoading(false);
    }
  }

  const busy = loading || gLoading || aLoading;
  const appName = settings?.app_name || 'PattiBytes Express';
  const logoUrl = settings?.app_logo_url || null;
  const inputLabel = identifier.includes('@')
    ? 'Email'
    : identifier.length > 0
      ? 'Username'
      : 'Email or Username';

  const idBorderColor = idBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  const pwBorderColor = pwBorder.interpolate({
    inputRange: [0, 1],
    outputRange: [COLORS.border, COLORS.primary],
  });

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: COLORS.backgroundLight }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={S.scroll}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <Animated.View
          style={[S.hero, { opacity: heroAnim, transform: [{ translateY: heroY }] }]}
        >
          {logoUrl ? (
            <Image source={{ uri: logoUrl }} style={S.logo} resizeMode="cover" />
          ) : (
            <View style={S.logoFallback}>
              <Text style={S.logoFallbackText}>🍕</Text>
            </View>
          )}

          <Text style={S.appName}>{appName}</Text>
          <Text style={S.tagline}>Fast, Fresh, Delivered</Text>
        </Animated.View>

        <Animated.View style={{ opacity: guestAnim, transform: [{ translateY: guestY }] }}>
          <Animated.View style={{ transform: [{ scale: guestScale }] }}>
            <TouchableOpacity
              style={[S.guestBtn, busy && S.disabled]}
              onPress={() => router.replace('/(customer)/dashboard' as any)}
              onPressIn={() => pressIn(guestScale)}
              onPressOut={() => pressOut(guestScale)}
              disabled={busy}
              activeOpacity={1}
            >
              <Text style={S.guestBtnIcon}>👀</Text>
              <View style={{ flex: 1 }}>
                <Text style={S.guestBtnText}>Browse as Guest</Text>
                <Text style={S.guestBtnSub}>View menu & offers — no account needed</Text>
              </View>
              <Text style={S.guestBtnArrow}>›</Text>
            </TouchableOpacity>
          </Animated.View>

          <View style={S.orRow}>
            <View style={S.divLine} />
            <Text style={S.orLabel}>sign in to order</Text>
            <View style={S.divLine} />
          </View>
        </Animated.View>

        <Animated.View
          style={[
            S.card,
            {
              opacity: cardAnim,
              transform: [{ translateX: shakeAnim }, { translateY: cardY }],
            },
          ]}
        >
          {!!error && (
            <View style={S.errorBanner}>
              <Text style={S.errorText}>⚠️  {error}</Text>
            </View>
          )}

          {appleAvail && (
            <View
              style={[S.appleWrap, busy && { opacity: 0.55 }]}
              pointerEvents={busy ? 'none' : 'auto'}
            >
              {aLoading ? (
                <View style={S.appleBtnFallback}>
                  <ActivityIndicator color="#FFF" />
                  <Text style={S.appleBtnFallbackTxt}>Signing in with Apple…</Text>
                </View>
              ) : (
                <AppleAuthentication.AppleAuthenticationButton
                  buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
                  buttonStyle={AppleAuthentication.AppleAuthenticationButtonStyle.BLACK}
                  cornerRadius={14}
                  style={S.appleBtn}
                  onPress={handleApple}
                />
              )}
            </View>
          )}

          <TouchableOpacity
            style={[S.googleBtn, busy && S.disabled]}
            onPress={handleGoogle}
            disabled={busy}
            activeOpacity={0.8}
          >
            {gLoading ? (
              <ActivityIndicator color={COLORS.text} />
            ) : (
              <>
                <View style={S.gIconWrap}>
                  <Text style={S.gIconText}>G</Text>
                </View>
                <Text style={S.googleBtnText}>Continue with Google</Text>
              </>
            )}
          </TouchableOpacity>

          <View style={S.divider}>
            <View style={S.divLine} />
            <Text style={S.divLabel}>or email / username</Text>
            <View style={S.divLine} />
          </View>

          <Text style={S.label}>{inputLabel}</Text>
          <Animated.View style={[S.inputWrap, { borderColor: idBorderColor }]}>
            <TextInput
              style={S.inputInner}
              value={identifier}
              onChangeText={(v) => {
                setIdentifier(v);
                setError('');
              }}
              onFocus={() => setIdFocused(true)}
              onBlur={() => setIdFocused(false)}
              placeholder="you@example.com or yourname"
              placeholderTextColor={COLORS.textMuted}
              autoCapitalize="none"
              keyboardType={identifier.includes('@') ? 'email-address' : 'default'}
              autoComplete="username"
              returnKeyType="next"
              onSubmitEditing={() => passwordRef.current?.focus()}
              editable={!busy}
            />
          </Animated.View>

          <Text style={S.label}>Password</Text>
          <View style={S.pwRow}>
            <Animated.View style={[S.inputWrap, { flex: 1, borderColor: pwBorderColor }]}>
              <TextInput
                ref={passwordRef}
                style={S.inputInner}
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError('');
                }}
                onFocus={() => setPwFocused(true)}
                onBlur={() => setPwFocused(false)}
                placeholder="••••••••"
                placeholderTextColor={COLORS.textMuted}
                secureTextEntry={!showPw}
                autoComplete="current-password"
                returnKeyType="done"
                onSubmitEditing={handleLogin}
                editable={!busy}
              />
            </Animated.View>

            <TouchableOpacity
              style={S.eyeBtn}
              onPress={() => setShowPw((v) => !v)}
              disabled={busy}
            >
              <Text style={S.eyeIcon}>{showPw ? '🙈' : '👁️'}</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            disabled={busy}
            style={S.forgotWrap}
            onPress={() => router.push('/(auth)/forgot-password' as any)}
          >
            <Text style={S.forgotText}>Forgot password?</Text>
          </TouchableOpacity>

          <Animated.View style={{ transform: [{ scale: signInScale }] }}>
            <TouchableOpacity
              style={[S.signInBtn, busy && S.disabled]}
              onPress={handleLogin}
              onPressIn={() => pressIn(signInScale)}
              onPressOut={() => pressOut(signInScale)}
              disabled={busy}
              activeOpacity={1}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={S.signInBtnText}>Sign In</Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <View style={S.signUpRow}>
            <Text style={S.signUpLabel}>No account? </Text>
            <TouchableOpacity
              disabled={busy}
              onPress={() => router.push('/(auth)/signup' as any)}
            >
              <Text style={S.signUpLink}>Create one</Text>
            </TouchableOpacity>
          </View>

          <View style={S.whyRow}>
            <Text style={S.whyText}>
              🔒 Account needed only for checkout, addresses & order history.
            </Text>
          </View>
        </Animated.View>

        <Text style={S.footer}>
          By signing in you agree to our{' '}
          <Text
            style={S.footerLink}
            onPress={() => router.push('/legal/terms-of-service' as any)}
          >
            Terms
          </Text>{' '}
          and{' '}
          <Text
            style={S.footerLink}
            onPress={() => router.push('/legal/privacy-policy' as any)}
          >
            Privacy Policy
          </Text>
          .{'\n'}
          <Text
            style={{ color: '#9CA3AF' }}
            onPress={() => Linking.openURL('https://www.instagram.com/thrillyverse')}
          >
            Developed with ❤️ by Thrillyverse™
          </Text>
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const S = StyleSheet.create({
  scroll: { flexGrow: 1, padding: 20, paddingTop: 40, justifyContent: 'center' },

  hero: { alignItems: 'center', marginBottom: 22 },
  logo: {
    width: 80, height: 80, borderRadius: 40, marginBottom: 12,
    borderWidth: 3, borderColor: COLORS.primary,
  },
  logoFallback: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#FFF3EE', alignItems: 'center', justifyContent: 'center',
    marginBottom: 12, borderWidth: 3, borderColor: COLORS.primary,
  },
  logoFallbackText: { fontSize: 36 },
  appName: { fontSize: 24, fontWeight: '800', color: COLORS.text, letterSpacing: -0.5 },
  tagline: { fontSize: 12, color: COLORS.textLight, marginTop: 3 },

  guestBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#fff', borderWidth: 1.5, borderColor: COLORS.border,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 16,
    marginBottom: 14, elevation: 1, shadowColor: '#000',
    shadowOpacity: 0.04, shadowRadius: 6, shadowOffset: { width: 0, height: 2 },
  },
  guestBtnIcon: { fontSize: 22 },
  guestBtnText: { fontSize: 15, fontWeight: '800', color: COLORS.text },
  guestBtnSub: { fontSize: 11, color: COLORS.textMuted, marginTop: 1 },
  guestBtnArrow: { fontSize: 22, color: COLORS.textMuted },

  orRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  orLabel: { marginHorizontal: 10, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },

  card: {
    backgroundColor: '#fff', borderRadius: 24, padding: 22,
    elevation: 6, shadowColor: COLORS.primary,
    shadowOpacity: 0.10, shadowRadius: 16, shadowOffset: { width: 0, height: 6 },
  },

  errorBanner: {
    backgroundColor: '#FEF2F2', borderWidth: 1, borderColor: '#FECACA',
    borderRadius: 10, padding: 11, marginBottom: 14,
  },
  errorText: { color: '#DC2626', fontSize: 13, fontWeight: '600' },

  appleWrap: { marginBottom: 11 },
  appleBtn: { width: '100%', height: 50 },
  appleBtnFallback: {
    height: 50, backgroundColor: '#000', borderRadius: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
  },
  appleBtnFallbackTxt: { color: '#FFF', fontWeight: '700', fontSize: 15 },

  googleBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    borderWidth: 1.5, borderColor: '#E5E7EB', borderRadius: 14,
    paddingVertical: 13, marginBottom: 16, backgroundColor: '#FAFAFA',
    elevation: 1, shadowColor: '#000', shadowOpacity: 0.03,
    shadowRadius: 4, shadowOffset: { width: 0, height: 2 },
  },
  gIconWrap: {
    width: 24, height: 24, borderRadius: 5, backgroundColor: '#fff',
    alignItems: 'center', justifyContent: 'center', marginRight: 10,
    borderWidth: 1, borderColor: '#E5E7EB',
  },
  gIconText: { fontSize: 14, fontWeight: '900', color: COLORS.primary },
  googleBtnText: { fontSize: 14, fontWeight: '700', color: COLORS.text },

  divider: { flexDirection: 'row', alignItems: 'center', marginBottom: 14 },
  divLine: { flex: 1, height: 1, backgroundColor: COLORS.border },
  divLabel: { marginHorizontal: 8, color: COLORS.textMuted, fontSize: 11, fontWeight: '600' },

  label: { fontSize: 12, fontWeight: '700', color: COLORS.text, marginBottom: 5 },
  inputWrap: {
    borderWidth: 1.5, borderRadius: 12,
    backgroundColor: COLORS.backgroundLight, marginBottom: 13,
  },
  inputInner: { padding: 13, fontSize: 15, color: COLORS.text },
  pwRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 4 },
  eyeBtn: { padding: 10 },
  eyeIcon: { fontSize: 18 },

  forgotWrap: { alignSelf: 'flex-end', marginBottom: 18 },
  forgotText: { color: COLORS.primary, fontWeight: '700', fontSize: 13 },

  signInBtn: {
    backgroundColor: COLORS.primary, borderRadius: 14, padding: 15, alignItems: 'center',
    elevation: 3, shadowColor: COLORS.primary,
    shadowOpacity: 0.38, shadowRadius: 8, shadowOffset: { width: 0, height: 4 },
  },
  signInBtnText: { color: '#fff', fontWeight: '800', fontSize: 16, letterSpacing: 0.2 },
  disabled: { opacity: 0.55 },

  signUpRow: { flexDirection: 'row', justifyContent: 'center', marginTop: 16 },
  signUpLabel: { color: COLORS.textLight, fontSize: 14 },
  signUpLink: { color: COLORS.primary, fontWeight: '800', fontSize: 14 },

  whyRow: {
    marginTop: 14, paddingTop: 12,
    borderTopWidth: 1, borderTopColor: COLORS.border,
  },
  whyText: {
    fontSize: 11, color: COLORS.textMuted, textAlign: 'center', lineHeight: 16,
  },

  footer: {
    textAlign: 'center', color: COLORS.textMuted,
    fontSize: 11, marginTop: 18, paddingHorizontal: 20, lineHeight: 16,
  },
  footerLink: { color: COLORS.primary, fontWeight: '700' },
});