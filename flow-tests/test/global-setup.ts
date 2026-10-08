import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, randomBytes } from 'node:crypto';
import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import type { TestProject } from 'vitest/node';
import { compose, STACK_FILES } from './stack.js';

declare module 'vitest' {
  export interface ProvidedContext {
    mainServer: string;
    socketServer: string;
    googlePrivateKey: string;
  }
}

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

const TLS = `${STACK_FILES}tls/`;

// A certificate for the sources container, which the main and worker servers trust through NODE_EXTRA_CA_CERTS.
function makeSourcesCertificate(): void {
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
      `${TLS}sources-key.pem`,
      '-out',
      `${TLS}sources-cert.pem`,
    ],
    { stdio: 'ignore' },
  );
}

// A value of compose.env, in double quotes so that a key's lines survive as \n.
function envLine(name: string, value: string): string {
  return `${name}="${value.trim().replaceAll('\n', String.raw`\n`)}"`;
}

// Keys and secrets made afresh for each run, so that none is kept in the repository. Answers the private key of the
// Google that the sources container stands for.
function makeStackFiles(): string {
  rmSync(STACK_FILES, { recursive: true, force: true });
  mkdirSync(TLS, { recursive: true });
  makeSourcesCertificate();
  const google = generateKeyPairSync('rsa', { modulusLength: 2048 });
  writeFileSync(`${TLS}google-public-key.pem`, google.publicKey.export({ type: 'spki', format: 'pem' }));
  const accessTokens = generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const env = [
    envLine('ACCESS_TOKEN_PRIVATE_KEY', String(accessTokens.privateKey.export({ type: 'pkcs8', format: 'pem' }))),
    envLine('ACCESS_TOKEN_PUBLIC_KEY', String(accessTokens.publicKey.export({ type: 'spki', format: 'pem' }))),
    envLine('WORKER_TOKEN', randomBytes(32).toString('hex')),
    envLine('MATCH_SERVER_TOKEN', randomBytes(32).toString('hex')),
  ];
  writeFileSync(`${STACK_FILES}compose.env`, `${env.join('\n')}\n`);
  return String(google.privateKey.export({ type: 'pkcs8', format: 'pem' }));
}

async function published(service: string, port: number): Promise<string> {
  return `http://${(await compose('port', service, String(port))).trim()}`;
}

async function removeStack(): Promise<void> {
  await compose('down', '--volumes', '--remove-orphans');
}

// Builds and starts the stack, and removes it with its volumes after the flows.
export default async function setup({ provide }: TestProject): Promise<() => Promise<void>> {
  const googlePrivateKey = makeStackFiles();
  // A stack that an interrupted run left would keep the files it started with.
  await removeStack();
  try {
    await compose('up', '--build', '--wait', '--wait-timeout', '900');
  } catch (error) {
    console.error(await compose('logs', '--no-color', '--tail', '100'));
    await removeStack();
    throw error;
  }
  provide('mainServer', await published('main-server', 3000));
  provide('socketServer', await published('socket-server', 3001));
  provide('googlePrivateKey', googlePrivateKey);
  return removeStack;
}
