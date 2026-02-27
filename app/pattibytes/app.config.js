export default {
  expo: {
    name: "Pattibytes Express",
    slug: "pbexpress",
    scheme: "pattibytesexpress",
    version: "1.0.0",
    orientation: "portrait",
    icon: "./assets/images/icon.png",           // must be real PNG 1024x1024
    userInterfaceStyle: "light",
    splash: {
      image: "./assets/images/icon.png",        // must be real PNG
      resizeMode: "contain",
      backgroundColor: "#FF6B35",
    },
    ios: {
      supportsTablet: false,
      bundleIdentifier: "com.pattibytes.express",
      infoPlist: {
        UIBackgroundModes: ["location", "fetch", "remote-notification"],
      },
    },
    android: {
      adaptiveIcon: {
        foregroundImage: "./assets/images/icon.png",  // must be real PNG
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
      // Uses EAS secret in CI, falls back to local file in dev
      googleServicesFile: process.env.GOOGLE_SERVICES_JSON ?? "./google-services.json",
    },
    web: {
      bundler: "metro",
      output: "static",
    },
    plugins: [
      "expo-router",
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png", // separate white monochrome PNG
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
    ],
    experiments: {
      typedRoutes: false,
    },
    extra: {
      eas: {
        projectId: "6267f6ac-c78a-4b5c-80bc-9502040fbf9c",
      },
      router: {},
    },
    owner: "pattibytes",
  },
};
