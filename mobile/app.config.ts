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
    },
    plugins: [
      "expo-dev-client",
      // Expo composes mods inside-out: remove legacy keys after the wrapper runs.
      "./src/map/withNaverMapNative",
      ["@mj-studio/react-native-naver-map", { client_id: process.env.NAVER_MAP_CLIENT_ID?.trim() || "" }],
      ["expo-build-properties", { android: { extraMavenRepos: ["https://repository.map.naver.com/archive/maven"] } }],
      "./plugins/withLocalPrototypeNetwork",
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
    extra: { mapsConfigured: Boolean(process.env.NAVER_MAP_CLIENT_ID?.trim()) },
  },
};
