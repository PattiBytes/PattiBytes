// src/lib/notificationHandler.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform, AppState, AppStateStatus } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { supabase } from "./supabase";

// ─── Environment checks ───────────────────────────────────────────────────────
export const isExpoGo =
  Constants.appOwnership === "expo" ||
  (Constants as any).executionEnvironment === "storeClient";

export const canUsePush = Device.isDevice && !isExpoGo;

// ─── Registration guard ───────────────────────────────────────────────────────
const PUSH_TOKEN_KEY = "pb_push_token";
let _registrationInProgress = false;

export function resetPushRegistration() {
  _registrationInProgress = false;
  AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
}

// ─── Lazy-load expo-notifications (safe in Expo Go) ───────────────────────────
function getNotif() {
  if (!canUsePush) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    return null;
  }
}

// ─── Init handler — call ONCE at app startup ─────────────────────────────────
export function initNotificationHandler() {
  const N = getNotif();
  if (!N) return;

  N.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

// ─── Register ─────────────────────────────────────────────────────────────────
export async function registerForPushNotifications(
  userId: string
): Promise<string | null> {
  const N = getNotif();
  if (!N) return null;

  // ✅ LOCK FIRST — before any async operation
  // This is the critical fix: all 3 concurrent callers check this synchronously.
  // Previously the lock was set AFTER the async AsyncStorage.getItem,
  // so all 3 callers passed the check before any could set it.
  if (_registrationInProgress) return null;
  _registrationInProgress = true;

  try {
    // ✅ Check AsyncStorage — survives Metro hot reloads in dev
    const cached = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
    if (cached) {
      // Silently keep DB fresh — no log spam
      await supabase.from("push_tokens").upsert(
        {
          user_id:         userId,
          expo_push_token: cached,
          platform:        Platform.OS,
          device_id:       Device.deviceName ?? null,
          is_active:       true,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "expo_push_token" }
      );
      return cached;
    }

    // ── Permissions ───────────────────────────────────────────────────────────
    const { status: existing } = await N.getPermissionsAsync();
    let finalStatus = existing;
    if (existing !== "granted") {
      const { status } = await N.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== "granted") {
      console.log("[push] Permission denied");
      return null;
    }

    // ── Get Expo push token ───────────────────────────────────────────────────
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const tokenData = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    if (!token) return null;

    // ── Android notification channels ─────────────────────────────────────────
    if (Platform.OS === "android") {
      await N.setNotificationChannelAsync("default", {
        name: "General",
        importance: N.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6B00",
        sound: "default",
      });
      await N.setNotificationChannelAsync("orders", {
        name: "Order Updates",
        importance: N.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: "#FF6B00",
        sound: "default",
      });
      await N.setNotificationChannelAsync("promotions", {
        name: "Promotions & Offers",
        importance: N.AndroidImportance.DEFAULT,
        vibrationPattern: [0, 100],
        lightColor: "#22C55E",
        sound: "default",
      });
    }

    // ── Upsert into push_tokens ───────────────────────────────────────────────
    const { error: tokenError } = await supabase
      .from("push_tokens")
      .upsert(
        {
          user_id:         userId,
          expo_push_token: token,
          platform:        Platform.OS,
          device_id:       Device.deviceName ?? null,
          is_active:       true,
          updated_at:      new Date().toISOString(),
        },
        { onConflict: "expo_push_token" }
      );
    if (tokenError) console.warn("[push] Token upsert error:", tokenError.message);

    // ── Mirror to profiles for quick server-side lookups ──────────────────────
    await supabase
      .from("profiles")
      .update({
        push_token:            token,
        push_token_platform:   Platform.OS,
        push_token_updated_at: new Date().toISOString(),
        expo_push_token:       token,
      })
      .eq("id", userId);

    // ✅ Persist to AsyncStorage — survives hot reloads in dev
    await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);
    console.log("[push] Registered:", token);
    return token;

  } catch (e: any) {
    console.error("[push] Registration error:", e?.message);
    return null;
  } finally {
    _registrationInProgress = false; // ✅ always release lock
  }
}

// ─── Deregister (on logout) ───────────────────────────────────────────────────
export async function deregisterPushToken(userId: string): Promise<void> {
  const N = getNotif();
  if (!N) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;

    const { data: token } = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );

    if (token) {
      await supabase
        .from("push_tokens")
        .update({ is_active: false, updated_at: new Date().toISOString() })
        .eq("expo_push_token", token)
        .eq("user_id", userId);

      await supabase
        .from("profiles")
        .update({
          push_token:            null,
          expo_push_token:       null,
          push_token_platform:   null,
          push_token_updated_at: new Date().toISOString(),
        })
        .eq("id", userId);
    }
  } catch {
    // Silent — never block logout
  } finally {
    resetPushRegistration();
  }
}

// ─── Foreground re-registration (1-hour cooldown) ────────────────────────────
export function setupForegroundReregistration(userId: string): () => void {
  let lastState = AppState.currentState;
  let lastRegistered = 0;

  const sub = AppState.addEventListener(
    "change",
    async (next: AppStateStatus) => {
      if (lastState.match(/inactive|background/) && next === "active") {
        const now = Date.now();
        if (now - lastRegistered > 60 * 60 * 1000) {
          lastRegistered = now;
          await AsyncStorage.removeItem(PUSH_TOKEN_KEY).catch(() => {});
          await registerForPushNotifications(userId);
        }
      }
      lastState = next;
    }
  );

  return () => sub.remove();
}

// ─── Safe listener wrappers (no-ops in Expo Go) ───────────────────────────────
export function addReceivedListener(cb: (n: any) => void) {
  const N = getNotif();
  if (!N) return { remove: () => {} };
  return N.addNotificationReceivedListener(cb);
}

export function addResponseListener(cb: (r: any) => void) {
  const N = getNotif();
  if (!N) return { remove: () => {} };
  return N.addNotificationResponseReceivedListener(cb);
}
