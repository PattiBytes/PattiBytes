// src/hooks/useNotifications.ts
import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "expo-router";
import { useAuth } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import { addReceivedListener, addResponseListener } from "../lib/notificationHandler";

export type AppNotification = {
  id: string;
  user_id: string;
  title: string | null;
  message: string | null;
  body: string | null;
  type: string | null;
  data: any;
  is_read: boolean;
  created_at: string;
  read_at: string | null;
  sent_push: boolean;
};

export function useNotifications() {
  const { user } = useAuth();
  const router = useRouter();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      const rows = (data ?? []) as AppNotification[];
      setNotifications(rows);
      setUnreadCount(rows.filter((n) => !n.is_read).length);
    } catch (e: any) {
      console.error("[notifications] load error:", e?.message);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;

    load();

    // ── Realtime: new notification inserted ──
    channelRef.current = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const n = payload.new as AppNotification;
          setNotifications((prev) => [n, ...prev]);
          setUnreadCount((c) => c + 1);
        }
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const updated = payload.new as AppNotification;
          setNotifications((prev) =>
            prev.map((n) => (n.id === updated.id ? updated : n))
          );
          // Recalculate unread
          setNotifications((prev) => {
            setUnreadCount(prev.filter((n) => !n.is_read).length);
            return prev;
          });
        }
      )
      .subscribe();

    // ── In-foreground push received → refresh ──
    const recSub = addReceivedListener(() => load());

    // ── Notification tapped → navigate ──
    const resSub = addResponseListener((response) => {
      const data = response?.notification?.request?.content?.data as any;
      if (!data) return;
      if (data.type === "order" || data.order_id || data.orderId) {
        const orderId = data.orderId ?? data.order_id;
        if (orderId) router.push(`/(customer)/orders/${orderId}` as any);
      }
      if (data.notificationId) {
        void markAsRead(data.notificationId);
      }
    });

    return () => {
      if (channelRef.current) supabase.removeChannel(channelRef.current);
      recSub.remove();
      resSub.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, load, router]);

  const markAsRead = useCallback(async (notifId: string) => {
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("id", notifId);
    // Optimistic update
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === notifId ? { ...n, is_read: true, read_at: new Date().toISOString() } : n
      )
    );
    setUnreadCount((c) => Math.max(0, c - 1));
  }, []);

  const markAllAsRead = useCallback(async () => {
    if (!user?.id) return;
    await supabase
      .from("notifications")
      .update({ is_read: true, read_at: new Date().toISOString() })
      .eq("user_id", user.id)
      .eq("is_read", false);
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }, [user?.id]);

  return {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    refresh: load,
  };
}
