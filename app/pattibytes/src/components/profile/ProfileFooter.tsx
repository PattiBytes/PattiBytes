import React from "react";
import { View, Text, TouchableOpacity, Linking } from "react-native";
import { useRouter } from "expo-router";
import { S } from "./profileStyles";
import type { LegalPage } from "./types";

interface Props {
  legalPages: LegalPage[];
}

const SLUG_LABELS: Record<string, string> = {
  "privacy-policy":   "Privacy Policy",
  "terms-of-service": "Terms of Service",
  "terms":            "Terms of Service",
  "refund-policy":    "Refund & Cancellation",
  "cookie-policy":    "Cookie Policy",
  "about":            "About Us",
  "contact":          "Contact Us",
};

// Only show these slugs in the footer (skip about/contact)
const FOOTER_SLUGS = [
  "privacy-policy",
  "terms-of-service",
  "terms",
  "refund-policy",
  "cookie-policy",
];

export function ProfileFooter({ legalPages }: Props) {
  const router = useRouter();
  const year = new Date().getFullYear();

  const openLegal = (slug: string) => {
    router.push(`/legal/${slug}` as any);
  };

  const openInstagram = () => {
    Linking.openURL("https://www.instagram.com/thrillyverse").catch(() =>
      Linking.openURL("instagram://user?username=thrillyverse")
    );
  };

  // Filter to only footer-worthy policies, deduplicate terms
  const seenTitles = new Set<string>();
  const footerPolicies = legalPages.filter((p) => {
    if (!p.is_active) return false;
    if (!FOOTER_SLUGS.includes(p.slug)) return false;
    const label = SLUG_LABELS[p.slug] ?? p.title;
    if (seenTitles.has(label)) return false;
    seenTitles.add(label);
    return true;
  });

  return (
    <View style={S.footer}>
      {/* Brand */}
      <Text style={S.footerLogo}>🍗 PBExpress®</Text>

      {/* Tagline — Thrillyverse tappable → Instagram */}
      <Text style={S.footerTagline}>
        {"Developed with ❤️ by "}
        <Text
          style={{ fontWeight: "900", textDecorationLine: "underline" }}
          onPress={openInstagram}
        >
          {"Thrillyverse™"}
        </Text>
        {"\n"}
        {"& PBExpress · PattiBytes Express"}
      </Text>

      {/* Policy links */}
      {footerPolicies.length > 0 && (
        <View style={S.footerPolicies}>
          {footerPolicies.map((p) => (
            <TouchableOpacity key={p.slug} onPress={() => openLegal(p.slug)}>
              <Text style={S.footerLink}>
                {SLUG_LABELS[p.slug] ?? p.title}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Divider */}
      <View
        style={{
          height: 1,
          backgroundColor: "#F3F4F6",
          width: "60%",
          marginTop: 14,
          marginBottom: 10,
        }}
      />

      {/* Copyright — auto year */}
      <Text style={S.footerCopy}>
        {"© "}
        {year}
        {" PattiBytes Express®. All rights reserved.\nThrillyverse™ · Made with ❤️ in Punjab, India"}
      </Text>
    </View>
  );
}