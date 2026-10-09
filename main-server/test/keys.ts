/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-29  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { generateKeyPairSync } from 'node:crypto';

interface PemKeyPair {
  privateKey: string;
  publicKey: string;
}

// The kind of key pair the main server signs access tokens with.
export function es256KeyPair(): PemKeyPair {
  return generateKeyPairSync('ec', {
    namedCurve: 'P-256',
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
}

// The kind of key pair Google signs ID tokens with.
export function rsaKeyPair(): PemKeyPair {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
}
