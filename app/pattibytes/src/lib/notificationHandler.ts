// src/lib/notificationHandler.ts
import Constants from "expo-constants";
import * as Device from "expo-device";
import { Platform, AppState, AppStateStatus } from "react-native";
import { supabase } from "./supabase";

export const isExpoGo =
  Constants.appOwnership === "expo" ||
  (Constants as any).executionEnvironment === "storeClient";

export const canUsePush = Device.isDevice && !isExpoGo;

/** Lazy-load expo-notifications — safe in Expo Go (returns null) */
function getNotif() {
  if (!canUsePush) return null;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    return require("expo-notifications") as typeof import("expo-notifications");
  } catch {
    return null;
  }
}

/**
 * Register for push notifications.
 * - Sets foreground handler
 * - Requests permission
 * - Gets Expo push token
 * - Sets Android channels (orders, promotions, default)
 * - Upserts token into `push_tokens` table  ← FIXED (was device_push_tokens)
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  const N = getNotif();
  if (!N) return null;

  try {
    // Foreground notification behaviour
    
   

    // Permission
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

    // Expo push token
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const tokenData = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    const token = tokenData.data;
    if (!token) return null;

    // Android channels
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

    // ── Upsert token into push_tokens ── (FIXED table name)
    const { error } = await supabase.from("push_tokens").upsert(
      {
        user_id: userId,
        expo_push_token: token,
        platform: Platform.OS,
        device_id: Device.deviceName ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "expo_push_token" }
    );
    if (error) console.warn("[push] Token upsert error:", error.message);

    console.log("[push] Registered:", token);
    return token;
  } catch (e: any) {
    console.error("[push] Registration error:", e?.message);
    return null;
  }
}

/** Remove token from push_tokens on logout */
export async function deregisterPushToken(userId: string): Promise<void> {
  const N = getNotif();
  if (!N) return;
  try {
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      (Constants as any).easConfig?.projectId;
    const { data } = await N.getExpoPushTokenAsync(
      projectId ? { projectId } : undefined
    );
    if (data) {
      await supabase
        .from("push_tokens")                    // ← FIXED
        .delete()
        .eq("expo_push_token", data)
        .eq("user_id", userId);
    }
  } catch {
    // Silent — don't block logout
  }
}

/** Safe addNotificationReceivedListener — no-ops in Expo Go */
export function addReceivedListener(cb: (n: any) => void) {
  const N = getNotif();
  if (!N) return { remove: () => {} };
  return N.addNotificationReceivedListener(cb);
}

/** Safe addNotificationResponseReceivedListener — no-ops in Expo Go */
export function addResponseListener(cb: (r: any) => void) {
  const N = getNotif();
  if (!N) return { remove: () => {} };
  return N.addNotificationResponseReceivedListener(cb);
}

/** Re-register when app returns to foreground (token can rotate) */
export function setupForegroundReregistration(userId: string): () => void {
  let lastState = AppState.currentState;
  const sub = AppState.addEventListener("change", async (next: AppStateStatus) => {
    if (lastState.match(/inactive|background/) && next === "active") {
      await registerForPushNotifications(userId);
    }
    lastState = next;
  });
  return () => sub.remove();
}

export function initNotificationHandler() {
  const N = getNotif();
  if (!N) return; // safe in Expo Go

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
