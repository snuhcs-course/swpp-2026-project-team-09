// AI-generated with Claude Opus 5.5, 2026-10-05 to 2026-10-06, prompted by Jaehyun0320
import { AndroidConfig, type ConfigPlugin, withAndroidManifest, withInfoPlist } from 'expo/config-plugins';

// The app's configuration hands the Kakao native app key to the map module at build time. The key is a setting a
// person fills in: `KAKAO_NATIVE_APP_KEY` in `mobile/.env`, which Expo reads before it builds. It is written into the
// Android manifest and into the iOS app's Info.plist, where the module reads it when the app starts.
const KEY_NAME = 'com.bonnieandclaude.snunow.map.KAKAO_NATIVE_APP_KEY';

const withAndroidKey: ConfigPlugin = (config) =>
  withAndroidManifest(config, (withManifest) => {
    const key = process.env.KAKAO_NATIVE_APP_KEY ?? '';
    if (key === '') {
      console.warn('KAKAO_NATIVE_APP_KEY is empty: the map will not start. Fill it in mobile/.env.');
    }
    const application = AndroidConfig.Manifest.getMainApplicationOrThrow(withManifest.modResults);
    AndroidConfig.Manifest.addMetaDataItemToMainApplication(application, KEY_NAME, key);
    return withManifest;
  });

const withIosKey: ConfigPlugin = (config) =>
  withInfoPlist(config, (withPlist) => {
    const key = process.env.KAKAO_NATIVE_APP_KEY ?? '';
    if (key === '') {
      console.warn('KAKAO_NATIVE_APP_KEY is empty: the map will not start. Fill it in mobile/.env.');
    }
    withPlist.modResults[KEY_NAME] = key;
    return withPlist;
  });

const withSnuNowMap: ConfigPlugin = (config) => withIosKey(withAndroidKey(config));

export default withSnuNowMap;
