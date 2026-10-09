/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { createPublicKey } from 'node:crypto';
import { z } from 'zod';

const port = z.string().pipe(z.coerce.number<string>().int().min(1).max(65535));

// The main server signs access tokens with ES256, whose keys lie on the P-256 curve. Its public key is SPKI PEM text,
// as the main server's `pnpm keys:generate` writes it. createPublicKey also accepts a private key, so the PEM header
// tells the two apart.
const PUBLIC_KEY_HEADER = '-----BEGIN PUBLIC KEY-----';
const es256PublicKey = z.string().refine((pem) => {
  if (!pem.trim().startsWith(PUBLIC_KEY_HEADER)) {
    return false;
  }
  try {
    return createPublicKey(pem).asymmetricKeyDetails?.namedCurve === 'prime256v1';
  } catch {
    return false;
  }
}, `Expected a P-256 public key in PEM, beginning with ${PUBLIC_KEY_HEADER}`);

// Every setting arrives as a string from the environment; the schema converts it to the type the code uses.
export const settingsSchema = z.object({
  PORT: port,
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: port,
  ACCESS_TOKEN_PUBLIC_KEY: es256PublicKey,
});

export type Settings = z.infer<typeof settingsSchema>;
