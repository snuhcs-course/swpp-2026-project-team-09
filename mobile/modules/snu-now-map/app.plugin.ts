import { AndroidConfig, type ConfigPlugin, withAndroidManifest } from 'expo/config-plugins';

// The app's configuration hands the Kakao native app key to the map module at build time. The key is a setting a
// person fills in: `KAKAO_NATIVE_APP_KEY` in `mobile/.env`, which Expo reads before it builds. It is written into the
// Android manifest, where the module reads it when the app starts.
const KEY_NAME = 'com.bonnieandclaude.snunow.map.KAKAO_NATIVE_APP_KEY';

const withSnuNowMap: ConfigPlugin = (config) =>
  withAndroidManifest(config, (withManifest) => {
    const key = process.env.KAKAO_NATIVE_APP_KEY ?? '';
    if (key === '') {
      console.warn('KAKAO_NATIVE_APP_KEY is empty: the map will not start. Fill it in mobile/.env.');
    }
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(withManifest.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, KEY_NAME, key);
    return withManifest;
  });

export default withSnuNowMap;
