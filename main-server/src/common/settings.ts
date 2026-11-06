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
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-02  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-04  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { createPrivateKey, createPublicKey } from 'node:crypto';
import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// A count from the environment, or `fallback` when it is not set.
function count(fallback: number): z.ZodType<number> {
  return z.string().default(String(fallback)).pipe(z.coerce.number<string>().int().min(1));
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

export const MODEL_PROVIDERS = ['anthropic', 'openrouter'] as const;
export type ModelProvider = (typeof MODEL_PROVIDERS)[number];

export const MODEL_CACHE_MODES = ['breakpoints', 'auto', 'off'] as const;
export type ModelCache = (typeof MODEL_CACHE_MODES)[number];

// The settings that hold each provider's key and model id.
export const MODEL_SETTINGS = {
  anthropic: { key: 'ANTHROPIC_API_KEY', model: 'ANTHROPIC_MODEL' },
  openrouter: { key: 'OPENROUTER_API_KEY', model: 'ASSISTANT_MODEL' },
} as const;

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
    // Who the model is called through (README.md: Assistant, spec A01): the Anthropic API, or OpenRouter until
    // Iteration 4. Each has its own key, empty when there is none, and its own model id, so that one provider's id is
    // never sent to the other: claude-haiku-5-5 for Anthropic, anthropic/claude-haiku-5.5 for OpenRouter.
    MODEL_PROVIDER: z.enum(MODEL_PROVIDERS).default('anthropic'),
    ANTHROPIC_API_KEY: z.string().default(''),
    ANTHROPIC_MODEL: z.string().default(''),
    OPENROUTER_API_KEY: z.string().default(''),
    ASSISTANT_MODEL: z.string().default(''),
    // What the Anthropic requests cache: "breakpoints" marks the end of the constant prompt and caches the chat's
    // conversation automatically, "auto" caches every request automatically only, "off" caches nothing. Production
    // keeps the default; the others are there for A01's caching experiment.
    MODEL_CACHE: z.enum(MODEL_CACHE_MODES).default('breakpoints'),
    // The Assistant's limits: the messages a User may send in a day in Korea, and per message the model calls, the
    // time in milliseconds and the tokens the model may write in each call. Its reasoning counts towards those tokens,
    // and at 1,000 it could use them all and leave no answer (eval/p5/r0a.md).
    ASSISTANT_DAILY_MESSAGES: count(50),
    ASSISTANT_MAX_STEPS: count(8),
    ASSISTANT_TIMEOUT_MS: count(30_000),
    ASSISTANT_MAX_OUTPUT_TOKENS: count(4000),
    // Whether the step after a Collection publishes what it read. "off" leaves every session a Draft: it is turned off
    // when automatic publication is found to make mistakes (infra/production/README.md).
    AUTOMATIC_PUBLICATION: z
      .enum(['on', 'off'])
      .default('on')
      .transform((value) => value === 'on'),
    // Whether that step asks the model about the Drafts the rules left. "off" calls no model and sends no post out
    // (infra/production/README.md says when to turn it on). Each Judgement's call has its own limits: the time in
    // milliseconds and the tokens the model may write.
    AUTOMATIC_JUDGEMENT: z
      .enum(['on', 'off'])
      .default('off')
      .transform((value) => value === 'on'),
    // Whether that step attaches a session to an event by an equal title and start. "off" publishes both, since a wrong
    // attachment hides an event from Users, until evaluation B has measured it (infra/production/README.md).
    SAME_EVENT_TITLE_RULE: z
      .enum(['on', 'off'])
      .default('off')
      .transform((value) => value === 'on'),
    // Whether that step asks the model about the candidates the rules leave. "off" calls no model and sends no post out,
    // until evaluation B has measured it and the posts may be sent (infra/production/README.md).
    SAME_EVENT_AI_CHOICE: z
      .enum(['on', 'off'])
      .default('off')
      .transform((value) => value === 'on'),
    // Whether the Assistant books 관정도서관 through the phone's library cards. "false" turns it off without a release
    // (P06): the library tools answer with the official site and no card, and the tutorial's 관정 quest is completed
    // by its button.
    LIBRARY_BOOKING_ENABLED: z
      .enum(['true', 'false'])
      .default('true')
      .transform((value) => value === 'true'),
    // Whether the tutorial's 관정 quest is completed by the phone's check of the User's library bookings (P06-05), as
    // content/tutorial.yaml holds it, while LIBRARY_BOOKING_ENABLED is on too. "false" serves it as a button quest,
    // completed by 완료했어요 as every other quest is (P13).
    TUTORIAL_KWANJEONG_CHECK: z
      .enum(['true', 'false'])
      .default('false')
      .transform((value) => value === 'true'),
    JUDGEMENT_TIMEOUT_MS: count(60_000),
    JUDGEMENT_MAX_OUTPUT_TOKENS: count(4000),
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
  // Refused at the start, so that a Release shows the mistake and no try of a Judgement is used on it: the chosen
  // provider's key and model.
  .superRefine((settings, context) => {
    const { key, model } = MODEL_SETTINGS[settings.MODEL_PROVIDER];
    if (settings[key] !== '' && settings[model] !== '') {
      return;
    }
    for (const step of ['AUTOMATIC_JUDGEMENT', 'SAME_EVENT_AI_CHOICE'] as const) {
      if (settings[step]) {
        context.addIssue({ code: 'custom', path: [step], message: `Needs ${key} and ${model}` });
      }
    }
  })
  // With one client ID in both settings, either sign-in would accept the other's ID token.
  .refine((settings) => settings.GOOGLE_APP_CLIENT_ID !== settings.GOOGLE_ADMIN_CLIENT_ID, {
    path: ['GOOGLE_ADMIN_CLIENT_ID'],
    message: 'Must differ from GOOGLE_APP_CLIENT_ID',
  });

export type Settings = z.infer<typeof settingsSchema>;
