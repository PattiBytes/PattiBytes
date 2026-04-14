// app.config.js
const IOS_URL_SCHEME =
  "com.googleusercontent.apps.980629232960-eq8l2m6gmqkkf1iq664a8ff52qvu6nbt";
const EAS_PROJECT_ID = "6267f6ac-c78a-4b5c-80bc-9502040fbf9c";

export default {
  expo: {
    name: "Pattibytes Express",
    slug: "pbexpress",
    scheme: "pattibytesexpress",
    version: "1.1.0",

    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    runtimeVersion: {
      policy: "appVersion",
    },

    newArchEnabled: true,
    orientation: "portrait",
    icon: "./assets/images/icon.png",
    userInterfaceStyle: "light",
    assetBundlePatterns: ["**/*"],

    splash: {
      image: "./assets/images/icon.png",
      resizeMode: "contain",
      backgroundColor: "#FF6B35",
    },

    // ── iOS ──────────────────────────────────────────────────────────────────
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.pattibytes.express",
      // EAS autoIncrement (appVersionSource: remote) manages this automatically.
      // Only manually bump if submitting outside EAS.
      buildNumber: "1",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_PLIST ?? "./GoogleService-Info.plist",
      usesAppleSignIn: true,
      appStoreUrl: "https://apps.apple.com/app/id6761598840",

      infoPlist: {
        UIBackgroundModes: ["location", "remote-notification"],
        NSLocationWhenInUseUsageDescription:
          "Pattibytes needs your location to find nearby restaurants and estimate delivery time.",
        NSLocationAlwaysAndWhenInUseUsageDescription:
          "Pattibytes uses background location to track your delivery in real time.",
        NSCameraUsageDescription:
          "Used to take a photo for your profile or attach to a review.",
        NSPhotoLibraryUsageDescription:
          "Used to choose a profile photo or attach an image to your review.",
        NSPhotoLibraryAddUsageDescription:
          "Used to save your order receipt or images to your photo library.",
        ITSAppUsesNonExemptEncryption: false,
        CFBundleURLTypes: [
          {
            CFBundleURLSchemes: [
              "pattibytesexpress",
              IOS_URL_SCHEME,
            ],
          },
        ],
      },

      // iOS 17+ Privacy Manifest — required to avoid hard App Store rejection
      privacyManifests: {
        NSPrivacyAccessedAPITypes: [
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryUserDefaults",
            NSPrivacyAccessedAPITypeReasons: ["CA92.1"],
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategoryFileTimestamp",
            NSPrivacyAccessedAPITypeReasons: ["C617.1"],
          },
          {
            NSPrivacyAccessedAPIType:
              "NSPrivacyAccessedAPICategorySystemBootTime",
            NSPrivacyAccessedAPITypeReasons: ["35F9.1"],
          },
        ],
      },
    },

    // ── Android ──────────────────────────────────────────────────────────────
    android: {
      // ✅ FIX — edgeToEdgeEnabled belongs HERE in expo.android,
      // NOT inside expo-build-properties plugin (where it has no effect).
      // Prevents app content from rendering behind system nav bar on Android 15+.
      edgeToEdgeEnabled: false,

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
        "android.permission.CAMERA",
        "android.permission.READ_MEDIA_IMAGES",     // Android 13+
        "android.permission.READ_EXTERNAL_STORAGE", // Android 12 and below
      ],

      package: "com.pattibytes.express",
      googleServicesFile:
        process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",

      // ✅ FIX — host field cannot contain a slash ("/").
      // "auth/callback" was silently breaking all deep links on Android.
      // Split into host + pathPrefix instead.
      intentFilters: [
  {
    action: 'VIEW',
    autoVerify: true,
    data: [
      {
        scheme: 'pattibytesexpress',
        host: 'auth',
        pathPrefix: '/callback',
      },
    ],
    category: ['BROWSABLE', 'DEFAULT'],
  },
  {
    action: 'VIEW',
    data: [
      {
        scheme: 'pattibytesexpress',
        host: 'open',
      },
      {
        scheme: 'https',
        host: 'pbexpress.pattibytes.com',
      },
    ],
    category: ['BROWSABLE', 'DEFAULT'],
  },
],
    },

    web: { bundler: "metro", output: "single" },

    // ── Plugins ──────────────────────────────────────────────────────────────
    plugins: [
      "expo-router",

      // Sign in with Apple — must stay before any other auth plugin
      "expo-apple-authentication",

      [
        "@sentry/react-native/expo",
        {
          url:          "https://sentry.io/",
          project:      "pattibytes",
          organization: "pattibytes",
        },
      ],

      "@maplibre/maplibre-react-native",
      "expo-dev-client",

      [
        "expo-notifications",
        {
          icon:        "./assets/images/notification-icon.png",
          color:       "#FF6B35",
          sounds:      [],
          androidMode: "default",
        },
      ],

      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Pattibytes needs your location for delivery tracking.",
          isIosBackgroundLocationEnabled:     true,
          isAndroidBackgroundLocationEnabled: true,
        },
      ],

      [
        "expo-build-properties",
        {
          android: {
            // ✅ FIX — edgeToEdgeEnabled removed from here (wrong location).
            // It is now set in expo.android above where it actually works.
            enableProguardInReleaseBuilds:       true,
            enableShrinkResourcesInReleaseBuilds: true,
            compileSdkVersion: 35,
            targetSdkVersion:  35,
            minSdkVersion:     24,
          },
          ios: {
            deploymentTarget: "16.0",
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