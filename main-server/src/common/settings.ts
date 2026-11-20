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
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-20  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { createPrivateKey, createPublicKey } from 'node:crypto';
import { z } from 'zod';
// .ts, not .js: `pnpm eval` loads this file in plain Node, which does not map .js to .ts.
import { aiKeysOf } from './llm-keys.ts';

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

// The AI's other keys by name, as the Release writes them from the llm-key-<name> parameters
// (infra/production/README.md: The AI's keys): a JSON object of name to key, {} or empty when there is none. A refusal
// never repeats the text, since JSON.parse's own message would quote part of it. `default` is OPENROUTER_API_KEY's.
const llmKeys = z
  .string()
  .default('{}')
  .transform((text, context): unknown => {
    try {
      return text.trim() === '' ? {} : JSON.parse(text);
    } catch {
      context.addIssue({ code: 'custom', message: 'Expected a JSON object of key names to keys' });
      return z.NEVER;
    }
  })
  .pipe(
    z.record(
      z
        .string()
        .regex(/^[a-z0-9-]+$/u, 'Expected key names of lowercase letters, digits and dashes')
        .refine((name) => name !== 'default', 'The key named default is OPENROUTER_API_KEY'),
      z.string().min(1, 'Expected a non-empty key'),
    ),
  );

export const MODEL_CACHE_MODES = ['breakpoints', 'auto', 'off'] as const;
export type ModelCache = (typeof MODEL_CACHE_MODES)[number];

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
    // The AI's keys (README.md: Assistant): the OpenRouter key, the one `llm.key` names `default`, empty when there is
    // none, and the others by name. The global setting `llm.key` chooses among them, and each provider's model is a
    // constant (src/common/llm-keys.ts).
    OPENROUTER_API_KEY: z.string().default(''),
    LLM_KEYS: llmKeys,
    // What the Anthropic requests cache: "breakpoints" marks the end of the constant prompt and caches the chat's
    // conversation automatically, "auto" caches every request automatically only, "off" caches nothing. The server
    // keeps the default; the others are there for the evaluations' --cache.
    MODEL_CACHE: z.enum(MODEL_CACHE_MODES).default('breakpoints'),
    // The Assistant's limits: the messages a User may send in a day in Korea, and per message the model calls, the
    // time in milliseconds and the tokens the model may write in each call. Its reasoning counts towards those tokens,
    // and at 1,000 it could use them all and leave no answer (eval/p5/r0a.md).
    ASSISTANT_DAILY_MESSAGES: count(50),
    ASSISTANT_MAX_STEPS: count(8),
    ASSISTANT_TIMEOUT_MS: count(30_000),
    ASSISTANT_MAX_OUTPUT_TOKENS: count(4000),
    // Reading a timetable screenshot (P15-52): the readings a User may ask for in a day in Korea; the time in
    // milliseconds over all of a reading's model calls, under the phone's own 25 s (the slowest of the experiment's
    // readings took about 23 s); and per model call the tokens the model may write, its reasoning included. The
    // experiment's calls wrote at most about 4,900 tokens (eval/timetable-reading/answers), so 6,000 leaves room
    // without letting a call run long.
    TIMETABLE_READING_DAILY: count(10),
    TIMETABLE_READING_TIMEOUT_MS: count(24_000),
    TIMETABLE_READING_MAX_OUTPUT_TOKENS: count(6000),
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
    // How often, in seconds, the main server sends the Notifications whose time has come. 0 never sends them by itself,
    // so an empty value is refused rather than read as 0.
    NOTIFICATIONS_TICK_SECONDS: z.string().regex(/^\d+$/u).default('15').pipe(z.coerce.number<string>().max(3600)),
    // How often, in seconds, the topics of new events and recruiting Quests are read (README.md: Interests). 0 never,
    // so an empty value is refused rather than read as 0.
    TOPICS_TICK_SECONDS: z.string().regex(/^\d+$/u).default('60').pipe(z.coerce.number<string>().max(3600)),
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
  // Refused at the start, so that a Release shows the mistake and no try of a Judgement is used on it: a step that asks
  // the model needs a key whose provider its value tells. Only once every setting passed its own check, so that
  // LLM_KEYS is a record.
  .refine(({ AUTOMATIC_JUDGEMENT, ...keys }) => !AUTOMATIC_JUDGEMENT || aiKeysOf(keys).offered.length > 0, {
    path: ['AUTOMATIC_JUDGEMENT'],
    message: 'Needs OPENROUTER_API_KEY or a key in LLM_KEYS',
    when: ({ issues }) => issues.length === 0,
  })
  .refine(({ SAME_EVENT_AI_CHOICE, ...keys }) => !SAME_EVENT_AI_CHOICE || aiKeysOf(keys).offered.length > 0, {
    path: ['SAME_EVENT_AI_CHOICE'],
    message: 'Needs OPENROUTER_API_KEY or a key in LLM_KEYS',
    when: ({ issues }) => issues.length === 0,
  })
  // With one client ID in both settings, either sign-in would accept the other's ID token.
  .refine((settings) => settings.GOOGLE_APP_CLIENT_ID !== settings.GOOGLE_ADMIN_CLIENT_ID, {
    path: ['GOOGLE_ADMIN_CLIENT_ID'],
    message: 'Must differ from GOOGLE_APP_CLIENT_ID',
  });

export type Settings = z.infer<typeof settingsSchema>;
