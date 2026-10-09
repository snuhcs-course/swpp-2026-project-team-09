/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-09-28  Opus 5.5   prompted by TaeHyun79
 * 2026-09-29  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

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

  it('stops startup and names REDIS_HOST when it is missing', async () => {
    await expect(startApp({ ...settings, REDIS_HOST: undefined })).rejects.toThrow('REDIS_HOST');
  });

  it('stops startup and names REDIS_PORT when it is not a port number', async () => {
    await expect(startApp({ ...settings, REDIS_PORT: 'abc' })).rejects.toThrow('REDIS_PORT');
  });
});

describe('Access token key setting', () => {
  const settings = inject('settings');

  it('stops startup and names ACCESS_TOKEN_PUBLIC_KEY when it is missing', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PUBLIC_KEY: undefined })).rejects.toThrow(
      'ACCESS_TOKEN_PUBLIC_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PUBLIC_KEY when it is not PEM text', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PUBLIC_KEY: 'not a key' })).rejects.toThrow(
      'ACCESS_TOKEN_PUBLIC_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PUBLIC_KEY when it holds a private key', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PUBLIC_KEY: es256KeyPair().privateKey })).rejects.toThrow(
      'ACCESS_TOKEN_PUBLIC_KEY',
    );
  });

  it('stops startup and names ACCESS_TOKEN_PUBLIC_KEY when it is not a P-256 key', async () => {
    await expect(startApp({ ...settings, ACCESS_TOKEN_PUBLIC_KEY: rsaKeyPair().publicKey })).rejects.toThrow(
      'ACCESS_TOKEN_PUBLIC_KEY',
    );
  });
});
