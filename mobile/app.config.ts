export default {
  expo: {
    name: "캠퍼스",
    slug: "campus-prototype",
    scheme: "campus",
    version: "0.1.0",
    orientation: "portrait",
    newArchEnabled: true,
    android: {
      package: "kr.ac.campus.prototype",
      config: {
        googleMaps: { apiKey: process.env.GOOGLE_MAPS_ANDROID_API_KEY || "" },
      },
    },
    plugins: [
      "expo-dev-client",
      "expo-secure-store",
      "@react-native-google-signin/google-signin",
      [
        "expo-location",
        {
          locationAlwaysAndWhenInUsePermission:
            "동의한 친구와 파티원에게 위치를 공유합니다.",
          isAndroidBackgroundLocationEnabled: true,
          isAndroidForegroundServiceEnabled: true,
        },
      ],
    ],
    extra: { mapsConfigured: Boolean(process.env.GOOGLE_MAPS_ANDROID_API_KEY) },
  },
};
