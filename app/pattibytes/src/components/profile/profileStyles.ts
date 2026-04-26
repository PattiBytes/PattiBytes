import { StyleSheet } from "react-native";
import { COLORS } from '../../lib/constants'
import { ThemeColors, getThemeById, DEFAULT_THEME_ID } from "../../lib/themes";

export function makeStyles(c: ThemeColors) {
  return StyleSheet.create({
    center: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: COLORS.backgroundLight,
    },

    // ─── Hero ───
    hero: {
      backgroundColor: COLORS.primary,
      paddingTop: 48,
      paddingBottom: 24,
      alignItems: "center",
      borderBottomLeftRadius: 28,
      borderBottomRightRadius: 28,
    },
    avatar: {
      width: 96,
      height: 96,
      borderRadius: 48,
      borderWidth: 3,
      borderColor: "#fff",
    },
    avatarPlaceholder: {
      width: 96,
      height: 96,
      borderRadius: 48,
      backgroundColor: "rgba(255,255,255,0.22)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 3,
      borderColor: "#fff",
    },
    cameraBtn: {
      position: "absolute",
      right: 0,
      bottom: 0,
      width: 30,
      height: 30,
      borderRadius: 15,
      backgroundColor: "rgba(0,0,0,0.32)",
      alignItems: "center",
      justifyContent: "center",
      borderWidth: 2,
      borderColor: "#fff",
    },
    heroName: { fontSize: 22, fontWeight: "900", color: "#fff", marginTop: 6 },
    heroUsername: {
      fontSize: 13,
      color: "rgba(255,255,255,0.70)",
      marginTop: 2,
    },
    heroEmail: { fontSize: 13, color: "rgba(255,255,255,0.82)", marginTop: 2 },
    pillRow: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
      flexWrap: "wrap",
      justifyContent: "center",
    },
    pill: {
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderRadius: 10,
    },
    pillTxt: { fontSize: 11, fontWeight: "900" },
    trustBarWrap: { width: "86%", marginTop: 12 },
    trustBarBg: {
      height: 10,
      borderRadius: 8,
      backgroundColor: "rgba(255,255,255,0.25)",
      overflow: "hidden",
    },
    trustBarFill: { height: 10, backgroundColor: "#fff" },
    trustTxt: {
      marginTop: 6,
      fontSize: 11,
      fontWeight: "800",
      color: "rgba(255,255,255,0.85)",
      textAlign: "center",
    },

    // ─── Stats ───
    statsRow: {
      flexDirection: "row",
      marginHorizontal: 16,
      marginTop: 12,
      backgroundColor: COLORS.card,
      borderRadius: 16,
      overflow: "hidden",
      elevation: 2,
      shadowColor: "#000",
      shadowOpacity: 0.05,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
    },
    statCard: { flex: 1, alignItems: "center", paddingVertical: 16 },
    statDivider: { borderRightWidth: 1, borderRightColor: COLORS.border },
    statVal: { fontSize: 16, fontWeight: "900", color: COLORS.text },
    statLbl: { fontSize: 10, color: COLORS.textMuted, fontWeight: "700", marginTop: 2 },

    // ─── Tab bar ───
    tabRow: {
      flexDirection: "row",
      gap: 4,
      marginHorizontal: 16,
      marginTop: 10,
      padding: 6,
      backgroundColor: COLORS.card,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: COLORS.border,
    },
    tabBtn: {
      flex: 1,
      paddingVertical: 9,
      borderRadius: 12,
      alignItems: "center",
      backgroundColor: COLORS.backgroundLight,
    },
    tabBtnActive: {
      backgroundColor: COLORS.primaryBg,
      borderWidth: 1.5,
      borderColor: COLORS.primaryBorder,
    },
    tabTxt: { fontSize: 9, fontWeight: "800", color: COLORS.textMuted, marginTop: 2 },
    tabTxtActive: { color: COLORS.primary },

    // ─── Section card ───
    section: {
      backgroundColor: COLORS.card,
      marginHorizontal: 16,
      marginTop: 10,
      borderRadius: 16,
      padding: 16,
      elevation: 1,
      shadowColor: "#000",
      shadowOpacity: 0.04,
      shadowRadius: 4,
      shadowOffset: { width: 0, height: 1 },
    },
    sectionHeader: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: 12,
    },
    sectionTitle: { fontSize: 15, fontWeight: "900", color: COLORS.text },
    linkTxt: { color: COLORS.primary, fontWeight: "900" },

    // ─── Form fields ───
    fieldLbl: {
      marginTop: 10,
      marginBottom: 5,
      fontSize: 12,
      fontWeight: "900",
      color: COLORS.textLight,
    },
    input: {
      borderWidth: 1.5,
      borderColor: COLORS.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 11,
      fontSize: 14,
      color: COLORS.text,
      backgroundColor: COLORS.backgroundLight,
    },
    inputDisabled: { backgroundColor: COLORS.backgroundOffset, color: COLORS.textMuted },
    inputRow: { flexDirection: "row", gap: 8, alignItems: "center" },

    // ─── Info rows ───
    infoRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderFaint,
    },
    infoLabel: { fontSize: 13, color: COLORS.textMuted, fontWeight: "800" },
    infoVal: {
      fontSize: 13,
      color: COLORS.text,
      fontWeight: "800",
      maxWidth: "62%",
      textAlign: "right",
    },
    navRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderFaint,
    },

    // ─── Address cards ───
    addrCard: {
      backgroundColor: COLORS.backgroundLight,
      borderRadius: 14,
      padding: 14,
      borderWidth: 1.5,
      borderColor: COLORS.border,
      marginBottom: 10,
    },
    addrCardDefault: { borderColor: COLORS.primaryBorder, backgroundColor: COLORS.primaryBg },
    addrTitle: { fontSize: 14, fontWeight: "900", color: COLORS.text },
    addrText: {
      marginTop: 6,
      fontSize: 12,
      color: COLORS.textLight,
      lineHeight: 18,
    },
    addrMeta: { marginTop: 4, fontSize: 11, color: COLORS.textMuted, fontWeight: "700" },
    addrInstr: {
      marginTop: 4,
      fontSize: 11,
      color: "#92400E",
      fontWeight: "700",
    },
    addrBtnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
    smallBtn: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 10,
      borderWidth: 1.5,
    },
    smallBtnSoft: { borderColor: COLORS.border, backgroundColor: COLORS.backgroundLight },
    smallBtnDanger: { borderColor: "#FECACA", backgroundColor: "#FEF2F2" },
    smallBtnTxt: { fontSize: 12, fontWeight: "800", color: COLORS.text },

    // ─── Notification toggles ───
    toggleRow: {
      flexDirection: "row",
      alignItems: "center",
      paddingVertical: 14,
      borderBottomWidth: 1,
      borderBottomColor: COLORS.borderFaint,
    },
    toggleTitle: { fontSize: 14, fontWeight: "800", color: COLORS.text },
    toggleSub: { fontSize: 12, color: COLORS.textMuted, marginTop: 2 },
    helperTxt: { fontSize: 11, color: COLORS.textMuted, marginTop: 14, lineHeight: 16 },

    // ─── Buttons ───
    bigBtn: {
      marginTop: 14,
      backgroundColor: COLORS.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: "center",
    },
    bigBtnTxt: { color: "#fff", fontWeight: "900", fontSize: 15 },
    btn: { flex: 1, paddingVertical: 13, borderRadius: 12, alignItems: "center" },
    btnPrimary: { backgroundColor: COLORS.primary },
    btnDanger: { backgroundColor: "#EF4444" },
    btnGhost: { backgroundColor: COLORS.backgroundOffset },
    btnTxt: { fontWeight: "800", fontSize: 14 },

    // ─── Bottom bar ───
    bottomBar: {
      position: "absolute",
      bottom: 0,
      left: 0,
      right: 0,
      backgroundColor: COLORS.card,
      padding: 16,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      shadowColor: "#000",
      shadowOpacity: 0.06,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: -2 },
      elevation: 4,
    },
    signOutBtn: {
      borderWidth: 1.5,
      borderColor: "#FECACA",
      borderRadius: 14,
      padding: 14,
      alignItems: "center",
      backgroundColor: "#FEF2F2",
    },

    // ─── Modals ───
    modalOverlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.55)",
      justifyContent: "center",
      alignItems: "center",
      padding: 16,
    },
    modalCard: {
      backgroundColor: COLORS.card,
      borderRadius: 20,
      padding: 22,
      width: "100%",
      elevation: 16,
      shadowColor: "#000",
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 4 },
    },
    modalTitle: {
      fontSize: 18,
      fontWeight: "900",
      color: COLORS.text,
      marginBottom: 14,
    },
    emailNote: {
      backgroundColor: "#EFF6FF",
      borderRadius: 10,
      padding: 10,
      marginTop: 8,
      borderWidth: 1,
      borderColor: "#BFDBFE",
    },
    emailNoteTxt: { fontSize: 12, color: "#1E40AF", lineHeight: 18 },
    dangerNote: {
      backgroundColor: "#FEF2F2",
      borderRadius: 10,
      padding: 12,
      marginTop: 8,
      borderWidth: 1,
      borderColor: "#FECACA",
    },
    dangerNoteTxt: { fontSize: 12, color: "#B91C1C", lineHeight: 18 },

    // ─── Hints ───
    hint: { fontSize: 11, color: COLORS.textMuted, marginTop: 4 },
    hintOk: { fontSize: 11, color: "#10B981", marginTop: 4 },
    hintErr: { fontSize: 11, color: "#EF4444", marginTop: 4 },

    // ─── Label chips ───
    labelRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
    labelChip: {
      flex: 1,
      paddingVertical: 10,
      borderRadius: 12,
      alignItems: "center",
      borderWidth: 1.5,
      borderColor: COLORS.border,
      backgroundColor: COLORS.backgroundLight,
    },
    labelChipActive: { borderColor: COLORS.primary, backgroundColor: COLORS.primaryBg },
    labelChipTxt: { fontSize: 11, fontWeight: "800", marginTop: 2 },

    // ─── Footer ───
    footer: {
      alignItems: "center",
      paddingVertical: 24,
      paddingHorizontal: 16,
      marginTop: 8,
      marginBottom: 4,
    },
    footerLogo: {
      fontSize: 22,
      fontWeight: "900",
      color: COLORS.primary,
      letterSpacing: 1,
    },
    footerTagline: {
      fontSize: 11,
      color: COLORS.textMuted,
      marginTop: 4,
      textAlign: "center",
      lineHeight: 16,
    },
    footerPolicies: {
      flexDirection: "row",
      flexWrap: "wrap",
      justifyContent: "center",
      gap: 12,
      marginTop: 12,
    },
    footerLink: {
      fontSize: 11,
      color: COLORS.primary,
      fontWeight: "700",
      textDecorationLine: "underline",
    },
    footerCopy: {
      fontSize: 10,
      color: COLORS.textFaint,
      marginTop: 12,
      textAlign: "center",
      lineHeight: 15,
    },
  });
}

export const S = makeStyles(getThemeById(DEFAULT_THEME_ID).colors);