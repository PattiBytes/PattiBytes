// src/components/profile/Section.tsx
import React from "react";
import { View, Text } from "react-native";
import { makeStyles } from "./profileStyles";
import { useColors } from "../../contexts/ThemeContext";   // ← was: static S

interface Props {
  title:    string;
  children: React.ReactNode;
  right?:   React.ReactNode;
}

export function Section({ title, children, right }: Props) {
  const colors = useColors();      // subscribes to ThemeContext → re-renders on theme change
  const S      = makeStyles(colors);  // fresh styles every render

  return (
    <View style={S.section}>
      <View style={S.sectionHeader}>
        <Text style={S.sectionTitle}>{title}</Text>
        {right ? <View>{right}</View> : null}
      </View>
      {children}
    </View>
  );
}