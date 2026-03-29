import React from "react";
import { View, Text } from "react-native";
import { S } from "./profileStyles";

interface Props {
  title: string;
  children: React.ReactNode;
  right?: React.ReactNode;
}

export function Section({ title, children, right }: Props) {
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