// app/legal/[slug].tsx
import React, { useEffect, useState } from "react";
import {
  View, Text, ScrollView, ActivityIndicator, StyleSheet,
  TouchableOpacity, Linking, Platform,
} from "react-native";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { supabase } from "../../lib/supabase";
import { COLORS } from "../../lib/constants";

// ── version column does NOT exist in legal_pages — removed from type + query
type LegalPageFull = {
  id: string;
  slug: string;
  title: string;
  content: string;
  updated_at: string | null;
};

export default function LegalPageScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const router = useRouter();
  const [page, setPage]       = useState<LegalPageFull | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [dbError, setDbError]   = useState<string | null>(null);

  useEffect(() => {
    if (!slug) { setNotFound(true); setLoading(false); return; }
    (async () => {
      setLoading(true);
      setNotFound(false);
      setDbError(null);

      // ✅ version column removed — only query columns that exist
      const { data, error } = await supabase
        .from("legal_pages")
        .select("id,slug,title,content,updated_at")
        .eq("slug", slug)
        .eq("is_active", true)
        .maybeSingle();

      if (error) {
        console.error("[legal/slug] Supabase error:", error.message, "| slug:", slug);
        setDbError(error.message);
        setNotFound(true);
      } else if (!data) {
        setNotFound(true);
      } else {
        setPage(data as LegalPageFull);
      }
      setLoading(false);
    })();
  }, [slug]);

  // ── Smart back: go back in stack, or fall to customer dashboard ──────────
  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(customer)/dashboard" as any);
    }
  };

  if (loading) {
    return (
      <View style={LS.center}>
        <Stack.Screen options={{ title: "Loading..." }} />
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  if (notFound || !page) {
    return (
      <View style={LS.center}>
        <Stack.Screen
          options={{
            title: "Not Found",
            headerLeft: () => (
              <TouchableOpacity onPress={handleBack} style={{ paddingHorizontal: 8 }}>
                <Text style={{ color: COLORS.primary, fontWeight: "800", fontSize: 15 }}>
                  ← Back
                </Text>
              </TouchableOpacity>
            ),
          }}
        />
        <Text style={{ fontSize: 48, marginBottom: 12 }}>📄</Text>
        <Text style={LS.notFoundTitle}>Policy not found</Text>
        <Text style={LS.notFoundSub}>
          The page <Text style={{ fontWeight: "800" }}>&quot;{slug}&quot;</Text> could not
          be found or is not currently active.
        </Text>
        {dbError ? (
          <Text style={LS.dbErrorTxt}>DB: {dbError}</Text>
        ) : null}
        <TouchableOpacity style={LS.backBtn} onPress={handleBack}>
          <Text style={LS.backBtnTxt}>← Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const lastUpdated = page.updated_at
    ? new Date(page.updated_at).toLocaleDateString("en-IN", {
        day: "numeric", month: "long", year: "numeric",
      })
    : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#F8F9FA" }}>
      <Stack.Screen
        options={{
          title: page.title,
          headerStyle: { backgroundColor: "#fff" },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontWeight: "800", fontSize: 16 },
          headerShadowVisible: false,
          // ✅ Override back button so it never lands on cart
          headerLeft: () => (
            <TouchableOpacity onPress={handleBack} style={{ paddingHorizontal: 8 }}>
              <Text style={{ color: COLORS.primary, fontWeight: "800", fontSize: 15 }}>
                ← Back
              </Text>
            </TouchableOpacity>
          ),
        }}
      />

      <ScrollView
        contentContainerStyle={LS.scroll}
        showsVerticalScrollIndicator={false}
      >
        {/* Header card */}
        <View style={LS.headerCard}>
          <Text style={LS.pageTitle}>{page.title}</Text>
          {lastUpdated ? (
            <View style={LS.metaRow}>
              <Text style={LS.metaTxt}>Updated {lastUpdated}</Text>
            </View>
          ) : null}
        </View>

        {/* Content */}
        <View style={LS.contentCard}>
          <LegalContentRenderer content={page.content} />
        </View>

        {/* Footer note */}
        <View style={LS.footerNote}>
          <Text style={LS.footerNoteTxt}>
            PattiBytes Express® · Thrillyverse™
          </Text>
          <Text style={LS.footerNoteTxt}>{"Questions? "}</Text>
          <TouchableOpacity
            onPress={() => Linking.openURL("mailto:support@pattibytes.com")}
          >
            <Text style={[LS.footerNoteTxt, {
              color: COLORS.primary,
              textDecorationLine: "underline",
              fontWeight: "700",
            }]}>
              support@pattibytes.com
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// ─────────────────────────────────────────────────────
// Markdown-lite renderer
// Handles: # ## ###, - bullets, 1. lists,
//          **bold**, |tables|, --- dividers,
//          [text](url) / [text](mailto:) inline links
// ─────────────────────────────────────────────────────
function LegalContentRenderer({ content }: { content: string }) {
  const lines = content.split("\n");
  const elements: React.ReactNode[] = [];
  let key = 0;
  let i = 0;

  while (i < lines.length) {
    const raw = lines[i];
    const line = raw.trimEnd();

    // Blank line → spacer
    if (!line.trim()) {
      elements.push(<View key={key++} style={{ height: 6 }} />);
      i++; continue;
    }

    // Horizontal rule ---
    if (/^---+$/.test(line.trim())) {
      elements.push(<View key={key++} style={LS.hr} />);
      i++; continue;
    }

    // Table: header row followed by separator |---|
    if (
      /^\|.*\|$/.test(line) &&
      /^\|[-| :]+\|$/.test((lines[i + 1] ?? "").trim())
    ) {
      const headers = line.split("|").filter((c) => c.trim()).map((c) => c.trim());
      i += 2;
      const tableRows: string[][] = [];
      while (i < lines.length && /^\|.*\|$/.test(lines[i]?.trimEnd() ?? "")) {
        tableRows.push(
          lines[i].split("|").filter((c) => c.trim()).map((c) => c.trim())
        );
        i++;
      }
      elements.push(
        <View key={key++} style={LS.table}>
          <View style={[LS.tableRow, LS.tableHeader]}>
            {headers.map((h, hi) => (
              <Text key={hi} style={[LS.tableCell, LS.tableHeaderCell]}>
                {h}
              </Text>
            ))}
          </View>
          {tableRows.map((row, ri) => (
            <View
              key={ri}
              style={[LS.tableRow, ri % 2 === 1 && LS.tableRowAlt]}
            >
              {row.map((cell, ci) => (
                <Text key={ci} style={LS.tableCell}>
                  {renderInline(cell)}
                </Text>
              ))}
            </View>
          ))}
        </View>
      );
      continue;
    }

    // Headings
    if (line.startsWith("### ")) {
      elements.push(<Text key={key++} style={LS.h3}>{line.slice(4)}</Text>);
      i++; continue;
    }
    if (line.startsWith("## ")) {
      elements.push(<Text key={key++} style={LS.h2}>{line.slice(3)}</Text>);
      i++; continue;
    }
    if (line.startsWith("# ")) {
      elements.push(<Text key={key++} style={LS.h1}>{line.slice(2)}</Text>);
      i++; continue;
    }

    // Bullet list - / • / *
    if (/^[-•*]\s/.test(line)) {
      elements.push(
        <View key={key++} style={LS.bulletRow}>
          <Text style={LS.bullet}>•</Text>
          <Text style={LS.bulletTxt}>{renderInline(line.slice(2))}</Text>
        </View>
      );
      i++; continue;
    }

    // Numbered list
    const numMatch = line.match(/^(\d+)\.\s(.*)$/);
    if (numMatch) {
      elements.push(
        <View key={key++} style={LS.bulletRow}>
          <Text style={LS.bulletNum}>{numMatch[1]}.</Text>
          <Text style={LS.bulletTxt}>{renderInline(numMatch[2])}</Text>
        </View>
      );
      i++; continue;
    }

    // Plain paragraph
    elements.push(
      <Text key={key++} style={LS.body}>
        {renderInline(line)}
      </Text>
    );
    i++;
  }

  return <>{elements}</>;
}

// Renders **bold** and [label](url/mailto:) inline
function renderInline(text: string): React.ReactNode {
  const parts: React.ReactNode[] = [];
  const regex =
    /\*\*(.+?)\*\*|\[(.+?)\]\((https?:\/\/[^)]+|mailto:[^)]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  let k = 0;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(<Text key={k++}>{text.slice(last, match.index)}</Text>);
    }
    if (match[1]) {
      parts.push(
        <Text key={k++} style={{ fontWeight: "800", color: "#111827" }}>
          {match[1]}
        </Text>
      );
    } else if (match[2] && match[3]) {
      const url = match[3];
      parts.push(
        <Text
          key={k++}
          style={{ color: COLORS.primary, textDecorationLine: "underline" }}
          onPress={() => Linking.openURL(url)}
        >
          {match[2]}
        </Text>
      );
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) {
    parts.push(<Text key={k++}>{text.slice(last)}</Text>);
  }

  return parts.length === 0
    ? text
    : parts.length === 1
    ? parts[0]
    : parts;
}

const LS = StyleSheet.create({
  center: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#F8F9FA", padding: 24,
  },
  notFoundTitle: {
    fontSize: 20, fontWeight: "900", color: "#111827",
    marginBottom: 8, textAlign: "center",
  },
  notFoundSub: {
    fontSize: 14, color: "#6B7280",
    textAlign: "center", lineHeight: 20,
  },
  dbErrorTxt: {
    fontSize: 11, color: "#EF4444", marginTop: 8,
    textAlign: "center", fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  backBtn: {
    marginTop: 20, backgroundColor: COLORS.primary,
    borderRadius: 12, paddingVertical: 12, paddingHorizontal: 24,
  },
  backBtnTxt: { color: "#fff", fontWeight: "800", fontSize: 14 },

  scroll: { padding: 16, paddingBottom: 48 },

  headerCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18, marginBottom: 12,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },
  pageTitle: {
    fontSize: 22, fontWeight: "900", color: COLORS.text, lineHeight: 28,
  },
  metaRow: { flexDirection: "row", alignItems: "center", marginTop: 8 },
  metaTxt: { fontSize: 11, color: "#9CA3AF", fontWeight: "700" },

  contentCard: {
    backgroundColor: "#fff", borderRadius: 16, padding: 18,
    elevation: 1, shadowColor: "#000", shadowOpacity: 0.04,
    shadowRadius: 4, shadowOffset: { width: 0, height: 1 },
  },

  h1: {
    fontSize: 19, fontWeight: "900", color: COLORS.text,
    marginTop: 18, marginBottom: 6, lineHeight: 26,
  },
  h2: {
    fontSize: 16, fontWeight: "900", color: COLORS.text,
    marginTop: 14, marginBottom: 4, lineHeight: 22,
  },
  h3: {
    fontSize: 14, fontWeight: "800", color: "#374151",
    marginTop: 10, marginBottom: 4, lineHeight: 20,
  },
  body: { fontSize: 14, color: "#374151", lineHeight: 22, marginBottom: 2 },

  bulletRow: {
    flexDirection: "row", marginBottom: 5,
    paddingLeft: 4, alignItems: "flex-start",
  },
  bullet: {
    color: COLORS.primary, fontSize: 18, lineHeight: 22,
    marginRight: 8, fontWeight: "900",
  },
  bulletNum: {
    color: COLORS.primary, fontSize: 13, fontWeight: "900",
    marginRight: 8, lineHeight: 22, minWidth: 22,
  },
  bulletTxt: { flex: 1, fontSize: 14, color: "#374151", lineHeight: 22 },

  hr: { height: 1, backgroundColor: "#E5E7EB", marginVertical: 14 },

  table: {
    marginVertical: 10, borderWidth: 1, borderColor: "#E5E7EB",
    borderRadius: 8, overflow: "hidden",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 1, borderBottomColor: "#F3F4F6",
  },
  tableRowAlt: { backgroundColor: "#F9FAFB" },
  tableHeader: { backgroundColor: "#FFF3EE" },
  tableCell: {
    flex: 1, padding: 10, fontSize: 12,
    color: "#374151", lineHeight: 18,
  },
  tableHeaderCell: {
    fontWeight: "900", color: COLORS.primary, fontSize: 12,
  },

  footerNote: {
    marginTop: 16, alignItems: "center",
    paddingVertical: 14, gap: 2,
  },
  footerNoteTxt: {
    fontSize: 11, color: "#9CA3AF",
    textAlign: "center", lineHeight: 17,
  },
});