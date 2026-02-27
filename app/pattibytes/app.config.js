// app.config.js
export default {
  expo: {
    name: "Pattibytes Express",
    slug: "pbexpress",
    scheme: "pattibytesexpress",
    version: "1.0.0",
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

    web: {
      bundler: "metro",
      output: "static",
    },

    plugins: [
      "expo-router",

      // Expo Notifications config plugin
      [
        "expo-notifications",
        {
          icon: "./assets/images/notification-icon.png",
          color: "#FF6B35",
          sounds: [],
          androidMode: "default",
        },
      ],

      // Location
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "Pattibytes needs your location for delivery tracking.",
          isIosBackgroundLocationEnabled: true,
        },
      ],

      // Build props
      [
        "expo-build-properties",
        {
          android: {
            enableProguardInReleaseBuilds: true,
            enableShrinkResourcesInReleaseBuilds: true,
          },
        },
      ],

      // ✅ Native Google Sign-In (Expo without Firebase)
      // You MUST set iosUrlScheme to the "Reversed client ID"
      // format: com.googleusercontent.apps.xxxxxxxx [web:302]
   [
  "@react-native-google-signin/google-signin",
  {
    iosUrlScheme: process.env.EXPO_PUBLIC_GOOGLE_IOS_URL_SCHEME
  }
]
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
