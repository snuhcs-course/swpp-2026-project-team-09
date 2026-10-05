import type { ConfigContext, ExpoConfig } from 'expo/config';

// The app's configuration is `app.json`, which arrives here as `config`. This file adds what depends on a person's
// settings in `.env`.
//
// Google's sign-in library needs its config plugin for the iOS build alone, where the plugin registers the iOS
// client's reversed ID as a URL scheme. The plugin refuses to run without that scheme, so it is added only when the
// scheme is set: a checkout without `.env` still starts, and the Android build needs no plugin.
export default function appConfig({ config }: ConfigContext): Partial<ExpoConfig> {
  const iosUrlScheme = process.env.GOOGLE_IOS_URL_SCHEME ?? '';
  if (iosUrlScheme === '') {
    return config;
  }
  return {
    ...config,
    plugins: [...(config.plugins ?? []), ['react-native-nitro-google-signin', { iosUrlScheme }]],
  };
}
