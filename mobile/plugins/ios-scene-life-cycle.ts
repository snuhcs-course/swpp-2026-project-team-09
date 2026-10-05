import { type ConfigPlugin, withAppDelegate, withInfoPlist } from 'expo/config-plugins';

// An app built with the iOS 27 SDK (Xcode 27) must adopt the scene life cycle, or it quits at launch with "UIScene
// life cycle is required for apps built with this SDK". Expo SDK 57 ships the scene delegate, `ExpoAppSceneDelegate`,
// but its project template, up to 57.0.28, does not use it. This plugin makes the generated project use it:
// - Info.plist names the scene delegate;
// - the app delegate gives the scene delegate its React Native factory, and no longer makes the window and starts
//   React Native itself, which the scene delegate now does.
// Remove it once Expo's template does the same.

const SCENE_DELEGATE = 'EXExpoAppSceneDelegate';

const withSceneManifest: ConfigPlugin = (config) =>
  withInfoPlist(config, (withPlist) => {
    withPlist.modResults.UIApplicationSceneManifest = {
      UIApplicationSupportsMultipleScenes: false,
      UISceneConfigurations: {
        UIWindowSceneSessionRoleApplication: [
          { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: SCENE_DELEGATE },
        ],
      },
    };
    return withPlist;
  });

const DECLARATION = 'class AppDelegate: ExpoAppDelegate {';
const START =
  /\n#if os\(iOS\) \|\| os\(tvOS\)\n\s*window = UIWindow\(frame: UIScreen\.main\.bounds\)\n\s*factory\.startReactNative\([\s\S]*?\)\n#endif\n/u;

const withSceneAppDelegate: ConfigPlugin = (config) =>
  withAppDelegate(config, (withFile) => {
    let source = withFile.modResults.contents;
    if (source.includes('ExpoReactNativeFactoryProvider')) {
      return withFile;
    }
    if (!source.includes(DECLARATION) || !START.test(source)) {
      throw new Error('ios-scene-life-cycle: the AppDelegate template changed; check whether this plugin is needed.');
    }
    source = source.replace(DECLARATION, 'class AppDelegate: ExpoAppDelegate, ExpoReactNativeFactoryProvider {');
    source = source.replace(START, '\n');
    withFile.modResults.contents = source;
    return withFile;
  });

const withIosSceneLifeCycle: ConfigPlugin = (config) => withSceneAppDelegate(withSceneManifest(config));

export default withIosSceneLifeCycle;
