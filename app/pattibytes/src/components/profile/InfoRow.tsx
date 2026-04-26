// src/components/profile/InfoRow.tsx
import React from "react";
import { View, Text } from "react-native";
import { makeStyles } from "./profileStyles";
import { useColors } from "../../contexts/ThemeContext";   // ← was: static S

interface Props {
  label: string;
  value: string;
}

export function InfoRow({ label, value }: Props) {
  const colors = useColors();      // live theme
  const S      = makeStyles(colors);  // fresh styles

  return (
    <View style={S.infoRow}>
      <Text style={S.infoLabel}>{label}</Text>
      <Text style={S.infoVal} numberOfLines={2}>
        {value || "—"}
      </Text>
    </View>
  );
}