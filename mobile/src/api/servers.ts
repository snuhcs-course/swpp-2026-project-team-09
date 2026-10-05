import { googleAvailable } from '@/auth/google';
import { namedSignInEnding } from '@/dev-settings';

// Where the app reaches the team's servers, from `mobile/.env`. Each variable is read by its full name, because the
// bundler replaces only those. A trailing slash is dropped, so that a path can follow.

function address(value: string | undefined): string {
  return (value ?? '').trim().replace(/\/+$/u, '');
}

// The main server's address, such as "http://10.0.2.2:3000" for a main server on the computer that runs the Android
// emulator. "" when it is not set.
export function mainServerUrl(): string {
  return address(process.env.EXPO_PUBLIC_MAIN_SERVER_URL);
}

// The socket server's address, such as "http://10.0.2.2:3001". "" when it is not set.
export function socketServerUrl(): string {
  return address(process.env.EXPO_PUBLIC_SOCKET_SERVER_URL);
}

// Whether the app asks the main server. Only a build that signs in with Google can, since the main server takes only
// Google's ID token, and only when the main server's address is set. Expo Go, the web and the tests, a build without
// the address, and a build whose sign-in a development setting makes the mock keep the mocks.
export function asksMainServer(): boolean {
  return mainServerUrl() !== '' && googleAvailable() && namedSignInEnding() === null;
}
