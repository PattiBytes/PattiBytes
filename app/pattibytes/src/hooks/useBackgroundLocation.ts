import { useState, useEffect } from "react";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";

const DISCLOSURE_KEY = "bg_location_disclosure_shown";

export function useBackgroundLocation() {
  const [showDisclosure, setShowDisclosure] = useState(false);
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);

  useEffect(() => {
    checkAndRequest();
  }, []);

  async function checkAndRequest() {
    // Check if already granted
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { status: fg } = await Location.getForegroundPermissionsAsync();
    const { status: bg } = await Location.getBackgroundPermissionsAsync();

    if (bg === "granted") {
      setPermissionStatus("granted");
      return;
    }

    // Check if we already showed disclosure
    const disclosed = await AsyncStorage.getItem(DISCLOSURE_KEY);
    if (!disclosed) {
      setShowDisclosure(true); // Show our custom dialog first
    }
  }

  async function onUserAccepted() {
    await AsyncStorage.setItem(DISCLOSURE_KEY, "true");
    setShowDisclosure(false);

    // Step 1: Request foreground first (required before background)
    const { status: fg } = await Location.requestForegroundPermissionsAsync();
    if (fg !== "granted") {
      setPermissionStatus("denied");
      return;
    }

    // Step 2: Then request background
    const { status: bg } = await Location.requestBackgroundPermissionsAsync();
    setPermissionStatus(bg);
  }

  async function onUserDeclined() {
    await AsyncStorage.setItem(DISCLOSURE_KEY, "declined");
    setShowDisclosure(false);
    setPermissionStatus("denied");
  }

  return { showDisclosure, permissionStatus, onUserAccepted, onUserDeclined };
}