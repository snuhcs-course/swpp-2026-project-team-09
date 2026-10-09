// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-10-06, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #5 #10 #13 #14 #28 #31 #40 #45
import { createPrivateKey, createPublicKey } from 'node:crypto';
import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

const googleClientId = z.string().endsWith('.apps.googleusercontent.com');

// Access tokens are signed with ES256, whose keys lie on the P-256 curve. The private key is PKCS#8 PEM text and the
// public key SPKI PEM text, as `pnpm keys:generate` writes them. createPublicKey also accepts a private key, so the
// PEM header tells the two apart.
function es256Key(type: 'private' | 'public'): z.ZodString {
  const header = `-----BEGIN ${type.toUpperCase()} KEY-----`;
  return z.string().refine((pem) => {
    if (!pem.trim().startsWith(header)) {
      return false;
    }
    try {
      const key = type === 'private' ? createPrivateKey(pem) : createPublicKey(pem);
      return key.asymmetricKeyDetails?.namedCurve === 'prime256v1';
    } catch {
      return false;
    }
  }, `Expected a P-256 ${type} key in PEM, beginning with ${header}`);
}

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z
  .object({
    PORT: port,
    DATABASE_URL: z.url(),
    REDIS_HOST: z.string().min(1),
    REDIS_PORT: port,
    ACCESS_TOKEN_PRIVATE_KEY: es256Key('private'),
    ACCESS_TOKEN_PUBLIC_KEY: es256Key('public'),
    GOOGLE_APP_CLIENT_ID: googleClientId,
    GOOGLE_ADMIN_CLIENT_ID: googleClientId,
    INITIAL_ADMINISTRATOR_EMAILS: z
      .string()
      .transform((emails) => emails.split(',').map((email) => email.trim().toLowerCase()))
      .pipe(z.array(z.email())),
    KAKAO_REST_API_KEY: z.string().min(1),
    // The secret that the worker server sends with what it collected. Long enough not to be guessed.
    WORKER_TOKEN: z.string().min(32),
    // Where the apps reach this server from outside, such as https://snunow.example. Invite Links are built from it.
    PUBLIC_URL: z.url({ protocol: /^https?$/u }).transform((url) => url.replace(/\/+$/u, '')),
    // The SHA-256 fingerprints of the certificates the Android app is signed with, separated by commas.
    ANDROID_CERTIFICATE_FINGERPRINTS: z
      .string()
      .transform((fingerprints) => fingerprints.split(',').map((fingerprint) => fingerprint.trim().toUpperCase()))
      .pipe(z.array(z.string().regex(/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/u, 'Expected a SHA-256 fingerprint'))),
    // Where the match server is reached, such as http://localhost:3003.
    MATCH_SERVER_URL: z.url(),
    // The secret that this server and the match server send with each call to the other.
    MATCH_SERVER_TOKEN: z.string().min(32),
  })
  .refine(
    (keys) => createPublicKey(keys.ACCESS_TOKEN_PRIVATE_KEY).equals(createPublicKey(keys.ACCESS_TOKEN_PUBLIC_KEY)),
    {
      path: ['ACCESS_TOKEN_PUBLIC_KEY'],
      message: 'Does not match ACCESS_TOKEN_PRIVATE_KEY',
      // Only once every setting passed its own check; zod would run it anyway. A key that is not PEM text would make
      // createPublicKey throw, and comparing keys of different types leaves an OpenSSL error behind that fails the
      // next key Node parses.
      when: ({ issues }) => issues.length === 0,
    },
  )
  // With one client ID in both settings, either sign-in would accept the other's ID token.
  .refine((settings) => settings.GOOGLE_APP_CLIENT_ID !== settings.GOOGLE_ADMIN_CLIENT_ID, {
    path: ['GOOGLE_ADMIN_CLIENT_ID'],
    message: 'Must differ from GOOGLE_APP_CLIENT_ID',
  });

export type Settings = z.infer<typeof settingsSchema>;
