// AI-generated with Claude Opus 5.5, 2026-09-28 to 2026-10-05, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 and TaeHyun79 in #2 #4 #5 #13 #14 #40
import { inject } from 'vitest';
import { es256KeyPair, rsaKeyPair } from './keys.js';
import { startApp } from './start-app.js';

describe('Settings', () => {
  const settings = inject('settings');

  it('stops startup and names PORT when it is missing', async () => {
    await expect(startApp({ ...settings, PORT: undefined })).rejects.toThrow('PORT');
  });

  it('stops startup and names PORT when it is not a port number', async () => {
    await expect(startApp({ ...settings, PORT: 'abc' })).rejects.toThrow('PORT');
  });

  it('stops startup and names DATABASE_URL when it is missing', async () => {
    await expect(startApp({ ...settings, DATABASE_URL: undefined })).rejects.toThrow('DATABASE_URL');
  });

  it('stops startup and names REDIS_HOST when it is missing', async () => {
    await expect(startApp({ ...settings, REDIS_HOST: undefined })).rejects.toThrow('REDIS_HOST');
  });

  it('stops startup and names REDIS_PORT when it is not a port number', async () => {
    await expect(startApp({ ...settings, REDIS_PORT: 'abc' })).rejects.toThrow('REDIS_PORT');
  });
});

describe('Access token key settings', () => {
  const settings = inject('settings');

  it('stops startup and names ACCESS_TOKEN_PRIVATE_KEY when it is missing', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PRIVATE_KEY: undefined })).rejects.toThrow(
      'ACCESS_TOKEN_PRIVATE_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PRIVATE_KEY when it is not PEM text', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PRIVATE_KEY: 'not a key' })).rejects.toThrow(
      'ACCESS_TOKEN_PRIVATE_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PRIVATE_KEY when it is not a P-256 key', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PRIVATE_KEY: rsaKeyPair().privateKey })).rejects.toThrow(
      'ACCESS_TOKEN_PRIVATE_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PUBLIC_KEY when it is missing', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PUBLIC_KEY: undefined })).rejects.toThrow(
      'ACCESS_TOKEN_PUBLIC_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PUBLIC_KEY when it holds the private key', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PUBLIC_KEY: settings.ACCESS_TOKEN_PRIVATE_KEY })).rejects.toThrow(
      'ACCESS_TOKEN_PUBLIC_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PUBLIC_KEY when it does not match the private key', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PUBLIC_KEY: es256KeyPair().publicKey })).rejects.toThrow(
      'ACCESS_TOKEN_PUBLIC_KEY',
    );
  });
});

describe('Google client settings', () => {
  const settings = inject('settings');

  it('stops startup and names GOOGLE_APP_CLIENT_ID when it is missing', async () => {
    await expect(startApp({ ...settings, GOOGLE_APP_CLIENT_ID: undefined })).rejects.toThrow('GOOGLE_APP_CLIENT_ID');
  });

  it('stops startup and names GOOGLE_ADMIN_CLIENT_ID when it is missing', async () => {
    await expect(startApp({ ...settings, GOOGLE_ADMIN_CLIENT_ID: undefined })).rejects.toThrow(
      'GOOGLE_ADMIN_CLIENT_ID',
    );
  });

  it('stops startup and names GOOGLE_ADMIN_CLIENT_ID when it holds something other than a client ID', async () => {
    await expect(startApp({ ...settings, GOOGLE_ADMIN_CLIENT_ID: 'secret' })).rejects.toThrow('GOOGLE_ADMIN_CLIENT_ID');
  });

  it("stops startup and names GOOGLE_ADMIN_CLIENT_ID when it is the app's client ID", async () => {
    await expect(startApp({ ...settings, GOOGLE_ADMIN_CLIENT_ID: settings.GOOGLE_APP_CLIENT_ID })).rejects.toThrow(
      'GOOGLE_ADMIN_CLIENT_ID',
    );
  });
});

describe('Initial Administrator settings', () => {
  const settings = inject('settings');

  it('stops startup and names INITIAL_ADMINISTRATOR_EMAILS when it is missing', async () => {
    await expect(startApp({ ...settings, INITIAL_ADMINISTRATOR_EMAILS: undefined })).rejects.toThrow(
      'INITIAL_ADMINISTRATOR_EMAILS',
    );
  });

  it('stops startup and names INITIAL_ADMINISTRATOR_EMAILS when it is empty', async () => {
    await expect(startApp({ ...settings, INITIAL_ADMINISTRATOR_EMAILS: '' })).rejects.toThrow(
      'INITIAL_ADMINISTRATOR_EMAILS',
    );
  });

  it('stops startup and names INITIAL_ADMINISTRATOR_EMAILS when it holds something other than email addresses', async () => {
    await expect(
      startApp({ ...settings, INITIAL_ADMINISTRATOR_EMAILS: 'admin@example.com;second-admin@example.com' }),
    ).rejects.toThrow('INITIAL_ADMINISTRATOR_EMAILS');
  });
});

describe('Invite Link settings', () => {
  const settings = inject('settings');

  it('stops startup and names PUBLIC_URL when it is missing', async () => {
    await expect(startApp({ ...settings, PUBLIC_URL: undefined })).rejects.toThrow('PUBLIC_URL');
  });

  it('stops startup and names PUBLIC_URL when it is not a web address', async () => {
    await expect(startApp({ ...settings, PUBLIC_URL: 'snunow.example' })).rejects.toThrow('PUBLIC_URL');
  });

  it('stops startup and names ANDROID_CERTIFICATE_FINGERPRINTS when it is missing', async () => {
    await expect(startApp({ ...settings, ANDROID_CERTIFICATE_FINGERPRINTS: undefined })).rejects.toThrow(
      'ANDROID_CERTIFICATE_FINGERPRINTS',
    );
  });

  it('stops startup and names ANDROID_CERTIFICATE_FINGERPRINTS when it holds a SHA-1 fingerprint', async () => {
    await expect(
      startApp({
        ...settings,
        ANDROID_CERTIFICATE_FINGERPRINTS: '5E:8F:16:06:2E:A3:CD:2C:4A:0D:54:78:76:BA:A6:F3:8C:AB:F6:25',
      }),
    ).rejects.toThrow('ANDROID_CERTIFICATE_FINGERPRINTS');
  });
});
