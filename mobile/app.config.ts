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

const ANCHOR = /^(\s*config = use_native_modules)/mu;

const withGooglePods: ConfigPlugin = (config) =>
  withPodfile(config, (withFile) => {
    const podfile = withFile.modResults.contents;
    if (podfile.includes("pod 'AppCheckCore'")) {
      return withFile;
    }
    // The lines go before this one. Without it they would be left out silently, and `pod install` would fail later on
    // `AppCheckCore` with no word of why.
    if (!ANCHOR.test(podfile)) {
      throw new Error(
        "withGooglePods: the Podfile has no `config = use_native_modules` line. Expo's Podfile template changed; check where Google's pods now go.",
      );
    }
    withFile.modResults.contents = podfile.replace(ANCHOR, `${GOOGLE_PODS}\n$1`);
    return withFile;
  });

// Android opens an Invite Link, `https://<host>/invite/<token>`, in the app through App Links, which it verifies
// against the main server's `/.well-known/assetlinks.json`. Without the host the build declares no App Link, and
// links open the app only through its scheme, `snunow://invite/<token>`.
function withInviteLinks(config: ExpoConfig, host: string): ExpoConfig {
  if (host === '') {
    return config;
  }
  const inviteLinks = {
    action: 'VIEW',
    autoVerify: true,
    data: [{ scheme: 'https', host, pathPrefix: '/invite/' }],
    category: ['BROWSABLE', 'DEFAULT'],
  };
  return {
    ...config,
    android: { ...config.android, intentFilters: [...(config.android?.intentFilters ?? []), inviteLinks] },
  };
}

export default function appConfig({ config: fromJson }: ConfigContext): Partial<ExpoConfig> {
  // `app.json` names both; they are repeated only because a plugin takes a whole configuration.
  const named = { ...fromJson, name: fromJson.name ?? 'SNU Now', slug: fromJson.slug ?? 'snu-now' };
  const config = withInviteLinks(named, (process.env.INVITE_LINK_HOST ?? '').trim());
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME ?? '';
  if (iosUrlScheme === '') {
    return withGooglePods(config);
  }
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['react-native-nitro-google-signin', { iosUrlScheme }]],
  };
}
