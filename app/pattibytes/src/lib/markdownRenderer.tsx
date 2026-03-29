// lib/markdownRenderer.tsx
// Renders a minimal subset of markdown to React Native elements.
// Handles: #/##/### headings, **bold**, horizontal rules, tables, bullets, paragraphs.
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { COLORS } from './constants';

function renderInline(text: string, key: string | number) {
  // Bold: **text**
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  if (parts.length === 1) return <Text key={key}>{text}</Text>;
  return (
    <Text key={key}>
      {parts.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? (
          <Text key={i} style={{ fontWeight: '800' }}>{p.slice(2, -2)}</Text>
        ) : (
          <Text key={i}>{p}</Text>
        )
      )}
    </Text>
  );
}

export function renderMarkdown(md: string): React.ReactNode[] {
  const lines = md.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Heading
    const h3 = line.match(/^### (.+)/);
    const h2 = line.match(/^## (.+)/);
    const h1 = line.match(/^# (.+)/);

    if (h1) {
      nodes.push(<Text key={i} style={S.h1}>{h1[1]}</Text>);
      i++; continue;
    }
    if (h2) {
      nodes.push(<Text key={i} style={S.h2}>{h2[1]}</Text>);
      i++; continue;
    }
    if (h3) {
      nodes.push(<Text key={i} style={S.h3}>{h3[1]}</Text>);
      i++; continue;
    }

    // HR
    if (/^---+$/.test(line.trim())) {
      nodes.push(<View key={i} style={S.hr} />);
      i++; continue;
    }

    // Bullet
    if (/^[-*] /.test(line)) {
      nodes.push(
        <View key={i} style={S.bulletRow}>
          <Text style={S.bullet}>•</Text>
          <Text style={S.bulletText}>{renderInline(line.slice(2), 0)}</Text>
        </View>
      );
      i++; continue;
    }

    // Table row
    if (line.startsWith('|') && line.endsWith('|')) {
      const cells = line.split('|').filter((c) => c.trim() !== '');
      const isHeader = i > 0 && lines[i - 1]?.startsWith('|');
      const isSeparator = cells.every((c) => /^[-: ]+$/.test(c));
      if (isSeparator) { i++; continue; }
      nodes.push(
        <View key={i} style={[S.tableRow, isHeader && S.tableHeaderRow]}>
          {cells.map((c, ci) => (
            <Text
              key={ci}
              style={[S.tableCell, isHeader && S.tableHeaderCell]}
              numberOfLines={0}
            >
              {c.trim()}
            </Text>
          ))}
        </View>
      );
      i++; continue;
    }

    // Blank line
    if (!line.trim()) { nodes.push(<View key={i} style={{ height: 8 }} />); i++; continue; }

    // Paragraph
    nodes.push(
      <Text key={i} style={S.para}>{renderInline(line, 0)}</Text>
    );
    i++;
  }

  return nodes;
}

const S = StyleSheet.create({
  h1:   { fontSize: 22, fontWeight: '900', color: COLORS.text, marginTop: 20, marginBottom: 8, lineHeight: 30 },
  h2:   { fontSize: 17, fontWeight: '900', color: COLORS.text, marginTop: 18, marginBottom: 6, lineHeight: 24 },
  h3:   { fontSize: 14, fontWeight: '800', color: COLORS.text, marginTop: 14, marginBottom: 4 },
  para: { fontSize: 14, color: '#374151', lineHeight: 22, marginBottom: 4 },
  hr:   { height: 1, backgroundColor: '#E5E7EB', marginVertical: 14 },
  bulletRow:  { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 4, paddingLeft: 4 },
  bullet:     { fontSize: 14, color: COLORS.primary, marginRight: 8, lineHeight: 22 },
  bulletText: { flex: 1, fontSize: 14, color: '#374151', lineHeight: 22 },
  tableRow:       { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', paddingVertical: 6 },
  tableHeaderRow: { backgroundColor: '#F9FAFB' },
  tableCell:      { flex: 1, fontSize: 12, color: '#374151', paddingHorizontal: 6, lineHeight: 18 },
  tableHeaderCell:{ fontWeight: '800', color: COLORS.text },
});
