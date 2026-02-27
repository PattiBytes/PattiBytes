// app.config.js
const IOS_URL_SCHEME = "com.googleusercontent.apps.980629232960-eq8l2m6gmqkkf1iq664a8ff52qvu6nbt";
const EAS_PROJECT_ID = "6267f6ac-c78a-4b5c-80bc-9502040fbf9c";

export default {
  expo: {
    name: "Pattibytes Express",
    slug: "pbexpress",
    scheme: "pattibytesexpress",
    version: "1.0.0",

    // ✅ required for EAS Update
    updates: {
      url: `https://u.expo.dev/${EAS_PROJECT_ID}`,
    },
    // ✅ recommended policy for most apps
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
      infoPlist: {
        UIBackgroundModes: ["location", "fetch", "remote-notification"],
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

    web: { bundler: "metro", output: "static" },

    plugins: [
      "expo-router",
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
