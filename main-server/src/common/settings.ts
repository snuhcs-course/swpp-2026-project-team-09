/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 * 2026-10-02  Opus 5.5   prompted by TaeHyun79
 * 2026-10-03  Opus 5.5   prompted by fyoon46
 * 2026-10-04  Opus 5.5   prompted by fyoon46
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createPrivateKey, createPublicKey } from 'node:crypto';
import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// A count from the environment, or `fallback` when it is not set.
function count(fallback: number): z.ZodType<number> {
  return z.string().default(String(fallback)).pipe(z.coerce.number<string>().int().min(1));
}

// A share of the Users in percent, from 0 to 100, or `fallback` when it is not set.
function percent(fallback: number): z.ZodType<number> {
  return z.string().default(String(fallback)).pipe(z.coerce.number<string>().int().min(0).max(100));
}

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
    // The Assistant's (README.md: Assistant): the OpenRouter key, empty when there is none, and the OpenRouter id of
    // the model, such as anthropic/claude-haiku-5.5.
    OPENROUTER_API_KEY: z.string().default(''),
    ASSISTANT_MODEL: z.string().default(''),
    // The Assistant's limits: the messages a User may send in a day in Korea, and per message the model calls, the
    // time in milliseconds and the tokens the model may write in each call.
    ASSISTANT_DAILY_MESSAGES: count(50),
    ASSISTANT_MAX_STEPS: count(8),
    ASSISTANT_TIMEOUT_MS: count(30_000),
    ASSISTANT_MAX_OUTPUT_TOKENS: count(1000),
    // Whether everyone's aliases answer (P07): false switches them off at once. The share of Users, by a stable hash
    // of their id, who never receive them while they still teach, so that learning can be told from habit.
    ASSISTANT_GLOBAL_ALIASES: z.stringbool().default(true),
    ASSISTANT_ALIAS_HOLDBACK_PERCENT: percent(10),
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
