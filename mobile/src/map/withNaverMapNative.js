const { AndroidConfig, withAndroidManifest, withInfoPlist } = require("expo/config-plugins");

// Wrapper 2.9.0 writes both current and legacy credentials. This app uses only
// the current Naver Cloud Maps API, so do not retain the legacy credential keys.
module.exports = function withNaverMapNative(config) {
  config = withAndroidManifest(config, (result) => {
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(result.modResults);
    application["meta-data"] = (application["meta-data"] || []).filter(
      (item) => item.$["android:name"] !== "com.naver.maps.map.CLIENT_ID",
    );
    return result;
  });
  return withInfoPlist(config, (result) => {
    delete result.modResults.NMFClientId;
    return result;
  });
};
