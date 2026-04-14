import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface Props {
  visible: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function BackgroundLocationDisclosure({ visible, onAccept, onDecline }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.sheet}>
          {/* Icon */}
          <View style={styles.iconWrapper}>
            <Ionicons name="location" size={32} color="#FF6B35" />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            Location Access Required
          </Text>

          {/* ✅ THIS IS THE PROMINENT DISCLOSURE — Required by Google Play */}
          <ScrollView style={styles.scroll} showsVerticalScrollIndicator={false}>
            <Text style={styles.body}>
              <Text style={styles.bold}>Pattibytes Express</Text> collects location
              data to enable the following features:
            </Text>

            <View style={styles.featureRow}>
              <Ionicons name="navigate-circle" size={18} color="#FF6B35" />
              <Text style={styles.featureText}>
                <Text style={styles.bold}>Real-time delivery tracking</Text> — your
                delivery driver&apos;s location is tracked continuously so you can follow
                your order live on the map, even when the app is in the background
                or the screen is off.
              </Text>
            </View>

            <View style={styles.featureRow}>
              <Ionicons name="restaurant" size={18} color="#FF6B35" />
              <Text style={styles.featureText}>
                <Text style={styles.bold}>Nearby restaurants</Text> — your location
                is used to show restaurants available in your area and calculate
                accurate delivery fees.
              </Text>
            </View>

            <View style={styles.notice}>
              <Text style={styles.noticeText}>
                📍 <Text style={styles.bold}>Background location</Text> is used
                only during active deliveries to update the live tracking map.
                It is never collected in the background outside of an active
                order. Location data is not shared with third parties.
              </Text>
            </View>

            <Text style={styles.subText}>
              You can change location permissions anytime in your device Settings.
            </Text>
          </ScrollView>

          {/* Buttons */}
          <TouchableOpacity style={styles.acceptBtn} onPress={onAccept}>
            <Text style={styles.acceptText}>Allow Location Access</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.declineBtn} onPress={onDecline}>
            <Text style={styles.declineText}>Not Now</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    maxHeight: "85%",
  },
  iconWrapper: {
    alignSelf: "center",
    backgroundColor: "#FFF0EA",
    borderRadius: 50,
    padding: 14,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1a1a1a",
    textAlign: "center",
    marginBottom: 16,
  },
  scroll: { maxHeight: 280, marginBottom: 20 },
  body: { fontSize: 14, color: "#444", lineHeight: 22, marginBottom: 12 },
  bold: { fontWeight: "700" },
  featureRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 12,
    alignItems: "flex-start",
  },
  featureText: { fontSize: 14, color: "#444", lineHeight: 22, flex: 1 },
  notice: {
    backgroundColor: "#FFF7F4",
    borderRadius: 10,
    padding: 12,
    marginTop: 4,
    marginBottom: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#FF6B35",
  },
  noticeText: { fontSize: 13, color: "#555", lineHeight: 20 },
  subText: { fontSize: 12, color: "#888", textAlign: "center", marginTop: 4 },
  acceptBtn: {
    backgroundColor: "#FF6B35",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  acceptText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  declineBtn: {
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  declineText: { color: "#888", fontSize: 15 },
});