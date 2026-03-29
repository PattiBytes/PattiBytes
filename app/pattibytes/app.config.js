// app.config.js
const IOS_URL_SCHEME =
  "com.googleusercontent.apps.980629232960-eq8l2m6gmqkkf1iq664a8ff52qvu6nbt";
const EAS_PROJECT_ID = "6267f6ac-c78a-4b5c-80bc-9502040fbf9c";

export default {
  expo: {
    name: "Pattibytes Express",
    slug: "pbexpress",
    scheme: "pattibytesexpress",
    version: "1.0.0",

    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },

    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#FF6B35",
    },

    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.pattibytes.express",

      // ── REQUIRED for Sign in with Apple ──────────────────────────────────
      usesAppleSignIn: true,

      // ── REQUIRED: all permission usage strings ────────────────────────────
      // Apple rejects if any used permission lacks a description
      infoPlist: {
        UIBackgroundModes: ["location", "fetch", "remote-notification"],

        // Location (you already use expo-location)
        NSLocationWhenInUseUsageDescription:
          "Pattibytes needs your location to find nearby restaurants and estimate delivery time.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Pattibytes uses background location to track your delivery in real time.",

        // Camera & Photos — add only if your app lets users upload profile pics or review photos
        NSCameraUsageDescription:
          "Used to take a photo for your profile or attach to a review.",
        NSPhotoLibraryUsageDescription:
          "Used to choose a profile photo or attach an image to your review.",

        // ── Prevents App Store rejection for "missing NSUserTrackingUsageDescription"
        // Only needed if you use any advertising/analytics SDK that uses IDFA.
        // If you have no such SDK, you can remove this line.
        NSUserTrackingUsageDescription:
          "We use anonymous data to improve app performance and show relevant offers.",
      },
    },

    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",
        backgroundColor: "#FF6B35",
      },
      permissions: [
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.ACCESS_COARSE_LOCATION",
        "android.permission.ACCESS_BACKGROUND_LOCATION",
        "android.permission.VIBRATE",
        "android.permission.RECEIVE_BOOT_COMPLETED",
        "android.permission.POST_NOTIFICATIONS",
      ],
      package: "com.pattibytes.express",
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },

    web: { bundler: "metro", output: "single" },

    plugins: [
      "expo-router",

      // ── NEW: Sign in with Apple native plugin ─────────────────────────────
      // Must come before any auth-related plugin
      "expo-apple-authentication",

      [
        "@sentry/react-native/expo",
        {
          url: "https://sentry.io/",
          project: "pattibytes",
          organization: "pattibytes",
        },
      ],

      "@maplibre/maplibre-react-native",
      "expo-dev-client",

      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#FF6B35",
          sounds: [],
          androidMode: "default",
        },
      ],

      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Pattibytes needs your location for delivery tracking.",
          isIosBackgroundLocationEnabled: true,
        },
      ],

      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],

      [
        "@react-native-google-signin/google-signin",
        { iosUrlScheme: IOS_URL_SCHEME },
      ],
    ],

    experiments: { typedRoutes: false },

    extra: {
      eas: { projectId: EAS_PROJECT_ID },
      router: {},
    },

    owner: "pattibytes",
  },
};
