import React from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { S } from "../profileStyles";
import { Section } from "../Section";
import { AccountDeletionModal } from "../AccountDeletionModal";

interface Props {
  userId: string;
  pwd: { a: string; b: string };
  setPwd: (updater: (p: any) => any) => void;
  savingPwd: boolean;
  updatePassword: () => void;
  showDeleteModal: boolean;
  setShowDeleteModal: (v: boolean) => void;
}

export function SecurityTab({
  userId,
  pwd,
  setPwd,
  savingPwd,
  updatePassword,
  showDeleteModal,
  setShowDeleteModal,
}: Props) {
  return (
    <>
      <Section title="Change password">
        <Text style={S.fieldLbl}>New password</Text>
        <TextInput
          style={S.input}
          value={pwd.a}
          onChangeText={(v) => setPwd((p) => ({ ...p, a: v }))}
          placeholder="Min 6 characters"
          secureTextEntry
          placeholderTextColor="#9CA3AF"
        />
        <Text style={S.fieldLbl}>Confirm password</Text>
        <TextInput
          style={S.input}
          value={pwd.b}
          onChangeText={(v) => setPwd((p) => ({ ...p, b: v }))}
          placeholder="Repeat password"
          secureTextEntry
          placeholderTextColor="#9CA3AF"
        />
        {pwd.a && pwd.b && pwd.a !== pwd.b ? (
          <Text style={[S.hintErr, { marginTop: 6 }]}>
            Passwords don&apos;t match
          </Text>
        ) : null}
        <TouchableOpacity
          style={[S.bigBtn, savingPwd && { opacity: 0.7 }]}
          onPress={updatePassword}
          disabled={savingPwd}
        >
          {savingPwd ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={S.bigBtnTxt}>Update password</Text>
          )}
        </TouchableOpacity>
      </Section>

      <Section title="Danger zone">
        <View style={S.dangerNote}>
          <Text style={S.dangerNoteTxt}>
            ⚠️ Deleting your account is permanent after a 30-day grace period.
            All your orders, addresses, and data will be erased. You can cancel
            by logging back in before the date.
          </Text>
        </View>
        <TouchableOpacity
          style={[
            S.bigBtn,
            {
              backgroundColor: "#FEF2F2",
              borderWidth: 1.5,
              borderColor: "#FECACA",
            },
          ]}
          onPress={() => setShowDeleteModal(true)}
        >
          <Text style={[S.bigBtnTxt, { color: "#B91C1C" }]}>
            🗑️ Request account deletion
          </Text>
        </TouchableOpacity>
      </Section>

      <AccountDeletionModal
        open={showDeleteModal}
        userId={userId}
        onClose={() => setShowDeleteModal(false)}
      />
    </>
  );
}