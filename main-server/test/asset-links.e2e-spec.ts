// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by fyoon46, reviewed by TaeHyun79 in #40
import { INestApplication } from '@nestjs/common';
import { Server } from 'node:http';
import request from 'supertest';
import { inject } from 'vitest';
import { startApp } from './start-app.js';

const settings = inject('settings');
let app: INestApplication<Server>;

beforeAll(async () => {
  app = await startApp(settings);
});

afterAll(async () => {
  await app.close();
});

describe('The Digital Asset Links file', () => {
  it('lets the app open the links, signed with any of the configured certificates, without a token or a redirect', async () => {
    const response = await request(app.getHttpServer()).get('/.well-known/assetlinks.json');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/^application\/json/u);
    expect(response.body).toEqual([
      {
        relation: ['delegate_permission/common.handle_all_urls'],
        target: {
          namespace: 'android_app',
          package_name: 'com.bonnieandclaude.snunow',
          sha256_cert_fingerprints: [
            'FA:C6:17:45:DC:09:03:78:6F:B9:ED:E6:2A:96:2B:39:9F:73:48:F0:BB:6F:89:9B:83:32:66:75:91:03:3B:9C',
            '14:6D:E9:83:C5:73:06:50:D8:EE:B9:95:2F:34:FC:64:16:A0:83:42:E6:1D:BE:A8:8A:04:96:B2:3F:CF:44:E5',
          ],
        },
      },
    ]);
  });
});
