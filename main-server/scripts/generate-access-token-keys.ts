// AI-generated with Claude Opus 5.5, 2026-09-29, prompted by TaeHyun79, reviewed by fyoon46 in #5
import { generateKeyPairSync } from 'node:crypto';

// Prints a new ES256 key pair for access tokens as two .env lines: `pnpm keys:generate >> .env`.
// Each key is PEM text on one line, with \n where the lines break. Node and Docker Compose read it back as PEM.
const { privateKey, publicKey } = generateKeyPairSync('ec', {
  namedCurve: 'P-256',
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
});

for (const [name, pem] of [
  ['ACCESS_TOKEN_PRIVATE_KEY', privateKey],
  ['ACCESS_TOKEN_PUBLIC_KEY', publicKey],
]) {
  console.log(`${name}="${pem.trim().replaceAll('\n', String.raw`\n`)}"`);
}
