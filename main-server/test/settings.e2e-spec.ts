import { startApp } from './start-app.js';

describe('Settings', () => {
  it('stops startup and names PORT when it is missing', async () => {
    await expect(startApp({ PORT: undefined })).rejects.toThrow('PORT');
  });

  it('stops startup and names PORT when it is not a port number', async () => {
    await expect(startApp({ PORT: 'abc' })).rejects.toThrow('PORT');
  });
});
