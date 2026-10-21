/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The host names the sources container answers for (compose.test.yaml).
const SOURCES = [
  'www.googleapis.com',
  'snuco.snu.ac.kr',
  'snudorm.snu.ac.kr',
  'vet.snu.ac.kr',
  'www.snu.ac.kr',
  'web.busin.co.kr',
  'dapi.kakao.com',
];

// A certificate for the sources container, which the main and worker servers trust through NODE_EXTRA_CA_CERTS.
function makeSourcesCertificate(tls: string): void {
  const names = SOURCES.map((host) => `DNS:${host}`).join(',');
  execFileSync(
    'openssl',
    [
      'req',
      '-x509',
      '-newkey',
      'rsa:2048',
      '-nodes',
      '-days',
      '2',
      '-subj',
      '/CN=flow-tests sources',
      '-addext',
      `subjectAltName=${names}`,
      '-addext',
      'basicConstraints=critical,CA:TRUE',
      '-keyout',
      join(tls, 'sources-key.pem'),
      '-out',
      join(tls, 'sources-cert.pem'),
    ],
    { stdio: 'ignore' },
  );
}

// A value of compose.env, in double quotes so that a key's lines survive as \n.
function envLine(name: string, value: string): string {
  return `${name}="${value.trim().replaceAll('\n', String.raw`\n`)}"`;
}

// Writes a stack's settings into the folder: compose.env with keys and tokens made afresh, so that none is kept in the
// repository, followed by the caller's values, and under tls/ the sources container's certificate and Google's public
// key. Answers the private key of the Google that the sources container stands for.
export function writeSettings(folder: string, values: Record<string, string> = {}): string {
  const tls = join(folder, 'tls');
  mkdirSync(tls, { recursive: true });
  makeSourcesCertificate(tls);
  const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
  writeFileSync(join(tls, 'google-public-key.pem'), google.publicKey.export({ type: 'spki', format: 'pem' }));
  const accessTokens = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const settings = {
    ACCESS_TOKEN_PRIVATE_KEY: String(accessTokens.privateKey.export({ type: 'pkcs8', format: 'pem' })),
    ACCESS_TOKEN_PUBLIC_KEY: String(accessTokens.publicKey.export({ type: 'spki', format: 'pem' })),
    WORKER_TOKEN: randomBytes(32).toString('hex'),
    MATCH_SERVER_TOKEN: randomBytes(32).toString('hex'),
    ...values,
  };
  const lines = Object.entries(settings).map(([name, value]) => envLine(name, value));
  writeFileSync(join(folder, 'compose.env'), `${lines.join('\n')}\n`);
  return String(google.privateKey.export({ type: 'pkcs8', format: 'pem' }));
}
