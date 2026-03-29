import React from "react";
import { View, Text } from "react-native";
import { S } from "./profileStyles";

type Tone = "default" | "good" | "bad" | "warn";

interface Props {
  text: string;
  tone?: Tone;
}

export function Pill({ text, tone = "default" }: Props) {
  const bg =
    tone === "good"
      ? "#ECFDF5"
      : tone === "bad"
      ? "#FEF2F2"
      : tone === "warn"
      ? "#FFFBEB"
      : "rgba(255,255,255,0.2)";
  const bd =
    tone === "good"
      ? "#A7F3D0"
      : tone === "bad"
      ? "#FECACA"
      : tone === "warn"
      ? "#FDE68A"
      : "rgba(255,255,255,0.35)";
  const tx =
    tone === "good"
      ? "#065F46"
      : tone === "bad"
      ? "#B91C1C"
      : tone === "warn"
      ? "#92400E"
      : "#fff";

  return (
    <View style={[S.pill, { backgroundColor: bg, borderColor: bd }]}>
      <Text style={[S.pillTxt, { color: tx }]}>{text}</Text>
    </View>
  );
}