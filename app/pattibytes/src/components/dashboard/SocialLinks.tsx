/* eslint-disable @typescript-eslint/no-unused-vars */
// app/pattibytes/src/components/dashboard/SocialLinks.tsx

// ────────────────────────────────────────────────────────────────────────────
import React, { useEffect, useRef, useState } from "react";
import {
  View, Text, TouchableOpacity, StyleSheet,
  Linking, Image, Alert, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { AppSettings } from "./types";
import { COLORS } from "../../lib/constants";

// ── Emoji icons (replaces broken SVG from cdn.simpleicons.org) ────────────────
const SOCIAL_EMOJI: Record<string, string> = {
  instagram: "📸",
  facebook:  "👍",
  youtube:   "▶️",
  x:         "𝕏",
  twitter:   "🐦",
  googlechrome: "🌐",
};

// ── FIX 1: safe Linking helper ─────────────────────────────────────────────────
async function openUrl(url?: string | null) {
  if (!url) return;
  try {
    const canOpen = await Linking.canOpenURL(url);
    if (canOpen) {
      await Linking.openURL(url);
    } else {
      // For https:// URLs canOpenURL may return false on iOS if the scheme
      // is not in LSApplicationQueriesSchemes, but openURL still works.
      await Linking.openURL(url);
    }
  } catch (e: any) {
    console.warn("[SocialLinks] openUrl failed:", url, e?.message);
    Alert.alert(
      "Could not open link",
      `Please visit ${url} in your browser.`,
      [{ text: "OK" }]
    );
  }
}

// ── FIX 3: normalize both snake_case and joined-word field names ───────────────
interface NormalizedSettings {
  app_name?:      string | null;
  app_logo_url?:  string | null;
  instagram_url?: string | null;
  facebook_url?:  string | null;
  youtube_url?:   string | null;
  twitter_url?:   string | null;
  website_url?:   string | null;
  support_phone?: string | null;
  support_email?: string | null;
  custom_links?:  any;
}

function normalizeSettings(s: AppSettings): NormalizedSettings {
  const raw = s as any;
  return {
    app_name:      raw.app_name      ?? raw.appname      ?? null,
    app_logo_url:  raw.app_logo_url  ?? raw.applogourl   ?? null,
    instagram_url: raw.instagram_url ?? raw.instagramurl ?? null,
    facebook_url:  raw.facebook_url  ?? raw.facebookurl  ?? null,
    youtube_url:   raw.youtube_url   ?? raw.youtubeurl   ?? null,
    twitter_url:   raw.twitter_url   ?? raw.twitterurl   ?? null,
    website_url:   raw.website_url   ?? raw.websiteurl   ?? null,
    support_phone: raw.support_phone ?? raw.supportphone ?? null,
    support_email: raw.support_email ?? raw.supportemail ?? null,
    custom_links:  raw.custom_links  ?? raw.customlinks  ?? null,
  };
}

// ── Emoji mapping by slug keywords ────────────────────────────────────────────
const EMOJI_MAP: Record<string, string> = {
  privacy:  "🔒", terms:    "📋", refund:   "🔄", return:   "🔄",
  shipping: "🚚", delivery: "🚚", about:    "ℹ️",  contact:  "💬",
  faq:      "❓", cancel:   "❌", payment:  "💳", cookie:   "🍪",
};
function emojiForSlug(slug: string): string {
  const s = slug.toLowerCase();
  for (const [key, emoji] of Object.entries(EMOJI_MAP)) {
    if (s.includes(key)) return emoji;
  }
  return "📄";
}

const FALLBACK_LEGAL = [
  { slug: "privacy-policy",   title: "Privacy Policy"   },
  { slug: "terms-of-service", title: "Terms of Service" },
  { slug: "refund-policy",    title: "Refund & Returns"  },
  { slug: "contact-us",       title: "Contact Us"        },
];

type LegalLink = { slug: string; title: string };
interface CustomLink { id: string; url: string; title: string; enabled: boolean; logo_url?: string }
interface SocialBtn  { url?: string | null; label: string; icon: string; bg: string }

function getSocials(s: NormalizedSettings): SocialBtn[] {
  return [
    { url: s.instagram_url, label: "Instagram", icon: "instagram",    bg: "#E1306C" },
    { url: s.facebook_url,  label: "Facebook",  icon: "facebook",     bg: "#1877F2" },
    { url: s.youtube_url,   label: "YouTube",   icon: "youtube",      bg: "#FF0000" },
    { url: s.twitter_url,   label: "X",         icon: "x",            bg: "#000000" },
    { url: s.website_url,   label: "Website",   icon: "googlechrome", bg: "#4285F4" },
  ].filter((b) => !!b.url) as SocialBtn[];
}

function getCustomLinks(s: NormalizedSettings): CustomLink[] {
  try {
    const raw = typeof s.custom_links === "string"
      ? JSON.parse(s.custom_links) : s.custom_links;
    if (!Array.isArray(raw)) return [];
    return raw.filter((l: CustomLink) => l.enabled && !!l.url);
  } catch { return []; }
}

interface Props { settings: AppSettings }

export function SocialLinks({ settings }: Props) {
  const router   = useRouter();
  // ✅ FIX 3: normalize once at the top
  const ns       = normalizeSettings(settings);
  const socials  = getSocials(ns);
  const customLinks = getCustomLinks(ns);
  const appName  = ns.app_name ?? "PattiBytes Express®";
  const year     = new Date().getFullYear();

  const [legalLinks,  setLegalLinks]  = useState<LegalLink[]>(FALLBACK_LEGAL);
  const [legalLoaded, setLegalLoaded] = useState(false);

  // ✅ FIX 4 + FIX 5: error handling + mounted guard
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from("legal_pages")
          .select("slug,title")
          .eq("is_active", true)
          .order("created_at", { ascending: true });
        if (!mounted) return;
        if (!error && data && data.length > 0) {
          setLegalLinks(data as LegalLink[]);
        }
        // Always hide shimmer — even on error (fallback links remain visible)
        setLegalLoaded(true);
      } catch {
        if (mounted) setLegalLoaded(true); // hide shimmer on network failure
      }
    })();
    return () => { mounted = false; };
  }, []);

  const goLegal = (slug: string) => router.push((`/legal/${slug}`) as any);

  return (
    <View style={S.root}>
      {/* ── DIVIDER ──────────────────────────────────────────────── */}
      <View style={S.dividerRow}>
        <View style={S.divLine} />
        <Text style={S.divLabel}>{appName}</Text>
        <View style={S.divLine} />
      </View>

      {/* ── BRAND CARD ───────────────────────────────────────────── */}
      <View style={S.card}>
        {ns.app_logo_url ? (
          // ✅ FIX 6: explicit width/height + onError fallback
          <Image
            source={{ uri: ns.app_logo_url }}
            style={S.logo}
            resizeMode="contain"
            onError={() => {/* silently degrade to fallback below */}}
          />
        ) : (
          <View style={S.logoFallback}>
            <Text style={{ fontSize: 34 }}>🍱</Text>
          </View>
        )}
        <Text style={S.brandName}>{appName}</Text>
        <Text style={S.brandTagline}>🚚 Fast, Fresh, Delivered to your doorstep</Text>

        {socials.length > 0 && (
          <View style={S.socialRow}>
            {socials.map((soc) => (
              <TouchableOpacity
                key={soc.label}
                style={[S.socialBtn, { backgroundColor: soc.bg }]}
                // ✅ FIX 1: safe async URL open
                onPress={() => openUrl(soc.url)}
                activeOpacity={0.82}
                accessibilityRole="link"
                accessibilityLabel={`Open ${soc.label}`}
              >
                {/* ✅ FIX 2: emoji replaces broken SVG from simpleicons CDN */}
                <Text style={S.socialIcon}>
                  {SOCIAL_EMOJI[soc.icon] ?? "🔗"}
                </Text>
                <Text style={S.socialLabel}>{soc.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>

      {/* ── SUPPORT CARD ─────────────────────────────────────────── */}
      {(ns.support_phone || ns.support_email) && (
        <View style={S.card}>
          <Text style={S.cardHeading}>Customer Support</Text>
          {ns.support_phone && (
            <TouchableOpacity
              style={S.listRow}
              onPress={() => openUrl(`tel:${ns.support_phone}`)}  // ✅ FIX 1
              activeOpacity={0.82}
            >
              <View style={S.iconWrap}><Text style={S.iconTxt}>📞</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={S.listMeta}>Call Us</Text>
                <Text style={S.listValue}>{ns.support_phone}</Text>
              </View>
              <Text style={S.chevron}>›</Text>
            </TouchableOpacity>
          )}
          {ns.support_phone && ns.support_email && <View style={S.sep} />}
          {ns.support_email && (
            <TouchableOpacity
              style={S.listRow}
              onPress={() => openUrl(`mailto:${ns.support_email}`)}  // ✅ FIX 1
              activeOpacity={0.82}
            >
              <View style={S.iconWrap}><Text style={S.iconTxt}>✉️</Text></View>
              <View style={{ flex: 1 }}>
                <Text style={S.listMeta}>Email Us</Text>
                <Text style={S.listValue} numberOfLines={1}>{ns.support_email}</Text>
              </View>
              <Text style={S.chevron}>›</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {/* ── CUSTOM LINKS CARD ────────────────────────────────────── */}
      {customLinks.length > 0 && (
        <View style={S.card}>
          <Text style={S.cardHeading}>Quick Links</Text>
          {customLinks.map((cl, idx) => (
            <React.Fragment key={cl.id}>
              <TouchableOpacity
                style={S.listRow}
                onPress={() => openUrl(cl.url)}  // ✅ FIX 1
                activeOpacity={0.82}
              >
                {cl.logo_url
                  ? <Image source={{ uri: cl.logo_url }} style={S.customLogo} resizeMode="contain" />
                  : <View style={S.iconWrap}><Text style={S.iconTxt}>🔗</Text></View>
                }
                <Text style={[S.listValue, { flex: 1 }]} numberOfLines={1}>{cl.title}</Text>
                <Text style={S.chevron}>›</Text>
              </TouchableOpacity>
              {idx < customLinks.length - 1 && <View style={S.sep} />}
            </React.Fragment>
          ))}
        </View>
      )}

      {/* ── LEGAL CARD ───────────────────────────────────────────── */}
      <View style={S.card}>
        <Text style={S.cardHeading}>Legal &amp; Policies</Text>
        {legalLinks.map((l, idx) => (
          <React.Fragment key={l.slug}>
            <TouchableOpacity
              style={S.listRow}
              onPress={() => goLegal(l.slug)}
              activeOpacity={0.82}
            >
              <Text style={S.legalEmoji}>{emojiForSlug(l.slug)}</Text>
              <Text style={S.legalLabel}>{l.title}</Text>
              <Text style={S.chevron}>›</Text>
            </TouchableOpacity>
            {idx < legalLinks.length - 1 && <View style={S.sep} />}
          </React.Fragment>
        ))}
        {/* ✅ FIX 4: shimmer is always hidden once query settles (success or error) */}
        {!legalLoaded && <View style={S.legalLoadingBar} />}
      </View>

      {/* ── WEBSITE LINK ─────────────────────────────────────────── */}
      {ns.website_url && (
        <TouchableOpacity
          style={[S.card, S.websiteRow]}
          onPress={() => openUrl(ns.website_url)}  // ✅ FIX 1
          activeOpacity={0.85}
        >
          <Text style={{ fontSize: 18, marginRight: 10 }}>🌐</Text>
          <Text style={S.websiteText} numberOfLines={1}>
            {ns.website_url.replace(/^https?:\/\//, "")}
          </Text>
          <Text style={S.chevron}>›</Text>
        </TouchableOpacity>
      )}

      {/* ── FOOTER ───────────────────────────────────────────────── */}
      <View style={S.footerNote}>
        <Text style={S.footerNoteTxt}>
          {appName}{"  ·  "}
          <Text
            style={{ color: "#7C3AED", fontWeight: "800" }}
            // ✅ FIX 1: safe URL open for Instagram link in footer
            onPress={() => openUrl("https://www.instagram.com/thrillyverse")}
          >
            {"Thrillyverse™"}
          </Text>
        </Text>
        <View style={S.attrRow}>
          <View style={S.attrPill}>
            <Text style={S.attrPillTxt}>⭐ Sponsored by PattiBytes</Text>
          </View>
          <View style={[S.attrPill, { backgroundColor: "#EDE9FE" }]}>
            <Text style={[S.attrPillTxt, { color: "#6D28D9" }]}>
              💻 Developed by Thrillyverse
            </Text>
          </View>
        </View>
        <Text style={S.footerNoteTxt}>© {year} {appName} · All rights reserved</Text>
        <Text style={S.footerNoteTxt}>Made with ❤️ in Dhariwal, Patti, Punjab, India</Text>
      </View>
    </View>
  );
}

const S = StyleSheet.create({
  root:        { paddingHorizontal: 16, paddingBottom: 20 },
  dividerRow:  { flexDirection: "row", alignItems: "center", marginBottom: 14 },
  divLine:     { flex: 1, height: 1, backgroundColor: "#E5E7EB" },
  divLabel:    { marginHorizontal: 10, fontSize: 11, fontWeight: "700",
                 color: "#9CA3AF", letterSpacing: 0.8, textTransform: "uppercase" },
  card:        { backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12,
                 elevation: 1, shadowColor: "#000", shadowOpacity: 0.04,
                 shadowRadius: 4, shadowOffset: { width: 0, height: 1 } },
  logo:        { width: 68, height: 68, borderRadius: 16, alignSelf: "center", marginBottom: 10 },
  logoFallback:{ width: 68, height: 68, borderRadius: 16, backgroundColor: "#FFF3EE",
                 alignItems: "center", justifyContent: "center",
                 alignSelf: "center", marginBottom: 10, borderWidth: 1, borderColor: "#FED7AA" },
  brandName:   { fontSize: 18, fontWeight: "900", color: COLORS.text,
                 textAlign: "center", marginBottom: 4 },
  brandTagline:{ fontSize: 13, color: "#9CA3AF", textAlign: "center",
                 marginBottom: 14, lineHeight: 18 },
  socialRow:   { flexDirection: "row", flexWrap: "wrap", gap: 8, justifyContent: "center" },
  socialBtn:   { flexDirection: "row", alignItems: "center", gap: 6,
                 borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9 },
  socialIcon:  { fontSize: 15 },
  socialLabel: { fontSize: 12, fontWeight: "700", color: "#fff" },
  cardHeading: { fontSize: 16, fontWeight: "900", color: COLORS.text, marginBottom: 12, lineHeight: 22 },
  listRow:     { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 4 },
  iconWrap:    { width: 38, height: 38, borderRadius: 10, backgroundColor: "#FFF3EE",
                 alignItems: "center", justifyContent: "center" },
  iconTxt:     { fontSize: 18 },
  listMeta:    { fontSize: 10, color: "#9CA3AF", fontWeight: "700", marginBottom: 2 },
  listValue:   { fontSize: 14, fontWeight: "800", color: COLORS.text },
  sep:         { height: 1, backgroundColor: "#F3F4F6", marginVertical: 10 },
  chevron:     { fontSize: 20, color: "#D1D5DB", fontWeight: "300" },
  customLogo:  { width: 38, height: 38, borderRadius: 10, borderWidth: 1, borderColor: "#F3F4F6" },
  legalEmoji:  { fontSize: 17, width: 26, textAlign: "center" },
  legalLabel:  { flex: 1, fontSize: 14, fontWeight: "600", color: "#374151", lineHeight: 22 },
  legalLoadingBar: { height: 12, backgroundColor: "#F3F4F6", borderRadius: 6,
                     marginTop: 6, width: "40%" },
  websiteRow:  { flexDirection: "row", alignItems: "center", paddingVertical: 4 },
  websiteText: { flex: 1, fontSize: 14, fontWeight: "700", color: COLORS.primary },
  footerNote:  { alignItems: "center", paddingVertical: 16, gap: 10 },
  footerNoteTxt: { fontSize: 11, color: "#9CA3AF", textAlign: "center", lineHeight: 17 },
  attrRow:     { flexDirection: "row", gap: 8, flexWrap: "wrap", justifyContent: "center" },
  attrPill:    { backgroundColor: "#FFF3EE", borderRadius: 8, paddingHorizontal: 10, paddingVertical: 5 },
  attrPillTxt: { fontSize: 11, fontWeight: "700", color: "#D97706" },
});
