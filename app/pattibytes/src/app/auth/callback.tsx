import React, { useEffect, useState } from "react";
import { View, Text, ActivityIndicator } from "react-native";
import * as Linking from "expo-linking";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  const [msg, setMsg] = useState("Completing sign-in...");

  useEffect(() => {
    (async () => {
      try {
        const url = await Linking.getInitialURL();
        if (!url) {
          setMsg("No callback URL found. You can close this screen.");
          router.replace("/(auth)/login" as any);
          return;
        }

        const { error } = await supabase.auth.exchangeCodeForSession(url);
        if (error) {
          setMsg(error.message);
          router.replace("/(auth)/login" as any);
          return;
        }

        // RootGuard will route user to dashboard after profile loads
        router.replace("/" as any);
      } catch (e: any) {
        setMsg(e?.message ?? "Callback failed");
        router.replace("/(auth)/login" as any);
      }
    })();
  }, [router]);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 16 }}>
      <ActivityIndicator />
      <Text style={{ marginTop: 12 }}>{msg}</Text>
    </View>
  );
}
