import { createPrivateKey, createPublicKey } from 'node:crypto';
import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

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
    // The OAuth client IDs whose Google ID tokens may sign in, separated by commas: the app's and the admin site's.
    GOOGLE_CLIENT_IDS: z
      .string()
      .transform((ids) => ids.split(',').map((id) => id.trim()))
      .pipe(z.array(z.string().endsWith('.apps.googleusercontent.com'))),
    // The email addresses of the Administrators, separated by commas. Only SNU accounts sign in, so an address outside
    // snu.ac.kr is a mistake. Compared without regard to case, so they are kept in lower case.
    ADMINISTRATOR_EMAILS: z
      .string()
      .transform((emails) => emails.split(',').map((email) => email.trim().toLowerCase()))
      .pipe(z.array(z.email().endsWith('@snu.ac.kr'))),
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
  );

export type Settings = z.infer<typeof settingsSchema>;
