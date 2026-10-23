/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by TaeHyun79
 * 2026-10-23  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { createPublicKey } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { z } from 'zod';
import { writeSettings } from './settings.js';
import { compose, type Stack } from './stack.js';

const composeConfig = z.object({
  name: z.string(),
  services: z.record(z.string(), z.object({ environment: z.record(z.string(), z.string()).optional() })),
});

function parseConfig(printed: string): z.infer<typeof composeConfig> {
  return composeConfig.parse(JSON.parse(printed));
}

const GENERATED = ['ACCESS_TOKEN_PRIVATE_KEY', 'ACCESS_TOKEN_PUBLIC_KEY', 'WORKER_TOKEN'];

// One service that hands on what the settings file holds; `docker compose config` reads it without starting anything.
function probeCompose(names: string[]): string {
  const environment = names.map((name) => `      ${name}: \${${name}}`);
  return ['services:', '  probe:', '    image: busybox', '    environment:', ...environment, ''].join('\n');
}

it('docker compose runs on the flow stack when no stack is named', async () => {
  const config = parseConfig(await compose('config', '--format', 'json'));
  expect(config.name).toBe('snu-now-flow-tests');
  expect(Object.keys(config.services)).toContain('sources');
});

it("a stack of its own project, Compose files and settings file gets the generated values and the caller's", async () => {
  const folder = mkdtempSync(join(tmpdir(), 'flow-tests-stack-'));
  try {
    const googlePrivateKey = writeSettings(folder, { DEPLOY_STATUS_DIR: '/srv/status' });
    writeFileSync(join(folder, 'compose.yaml'), probeCompose([...GENERATED, 'DEPLOY_STATUS_DIR']));
    const probe: Stack = { project: 'snu-now-stack-probe', files: [join(folder, 'compose.yaml')], settings: folder };

    const config = parseConfig(await compose(probe, 'config', '--format', 'json'));
    expect(config.name).toBe('snu-now-stack-probe');
    const environment = config.services.probe?.environment ?? {};
    expect(environment.ACCESS_TOKEN_PRIVATE_KEY).toMatch(/^-----BEGIN PRIVATE KEY-----\n/u);
    expect(environment.ACCESS_TOKEN_PUBLIC_KEY).toMatch(/^-----BEGIN PUBLIC KEY-----\n/u);
    expect(environment.WORKER_TOKEN).toMatch(/^[0-9a-f]{64}$/u);
    expect(environment.DEPLOY_STATUS_DIR).toBe('/srv/status');
    // The answered key signs the Google ID tokens that the stack's sources container checks.
    const googlePublicKey = createPublicKey(googlePrivateKey).export({ type: 'spki', format: 'pem' });
    expect(readFileSync(join(folder, 'tls', 'google-public-key.pem'), 'utf8')).toBe(googlePublicKey);
  } finally {
    rmSync(folder, { recursive: true, force: true });
  }
});
