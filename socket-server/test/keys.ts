// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #5 #11
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

// A key pair of another kind, not on the P-256 curve.
export function rsaKeyPair(): PemKeyPair {
  return generateKeyPairSync('rsa', {
    modulusLength: 2048,
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    publicKeyEncoding: { type: 'spki', format: 'pem' },
  });
}
