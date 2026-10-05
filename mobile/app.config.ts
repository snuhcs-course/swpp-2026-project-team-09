import type { ConfigContext, ExpoConfig } from 'expo/config';
import { type ConfigPlugin, withPodfile } from 'expo/config-plugins';

// The app's configuration is `app.json`, which arrives here as `config`. This file adds what depends on a person's
// settings in `.env`.
//
// Google's sign-in library needs its config plugin for the iOS build alone, where the plugin registers the iOS
// client's reversed ID as a URL scheme. The plugin refuses to run without that scheme, so it is added only when the
// scheme is set: a checkout without `.env` still starts, and the Android build needs no plugin.
//
// The plugin also lets CocoaPods link three of Google's pods as static libraries, which the iOS build needs whether or
// not the scheme is set. Without the scheme, `withGooglePods` does that part alone, with the same lines.
const GOOGLE_PODS = [
  "  pod 'AppCheckCore', :modular_headers => true",
  "  pod 'GoogleUtilities', :modular_headers => true",
  "  pod 'RecaptchaInterop', :modular_headers => true",
].join('\n');

const withGooglePods: ConfigPlugin = (config) =>
  withPodfile(config, (withFile) => {
    const podfile = withFile.modResults.contents;
    if (!podfile.includes("pod 'AppCheckCore'")) {
      withFile.modResults.contents = podfile.replace(/^(\s*config = use_native_modules)/mu, `${GOOGLE_PODS}\n$1`);
    }
    return withFile;
  });

export default function appConfig({ config }: ConfigContext): Partial<ExpoConfig> {
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME ?? '';
  if (iosUrlScheme === '') {
    // `app.json` names both; they are repeated only because a plugin takes a whole configuration.
    return withGooglePods({ ...config, name: config.name ?? 'SNU Now', slug: config.slug ?? 'snu-now' });
  }
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['react-native-nitro-google-signin', { iosUrlScheme }]],
  };
}
