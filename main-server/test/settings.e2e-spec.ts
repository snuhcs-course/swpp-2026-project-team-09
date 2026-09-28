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

  it('stops startup and names GOOGLE_CLIENT_IDS when it is missing', async () => {
    await expect(startApp({ ...settings, GOOGLE_CLIENT_IDS: undefined })).rejects.toThrow('GOOGLE_CLIENT_IDS');
  });

  it('stops startup and names GOOGLE_CLIENT_IDS when it holds something other than client IDs', async () => {
    await expect(
      startApp({ ...settings, GOOGLE_CLIENT_IDS: 'snu-now-app.apps.googleusercontent.com,secret' }),
    ).rejects.toThrow('GOOGLE_CLIENT_IDS');
  });
});
