// AI-generated with Claude Opus 5.5, 2026-10-08, prompted by Jaehyun0320
// The phone's secure storage, kept in memory. A test file puts it in place of `expo-secure-store`:
//
//   jest.mock('expo-secure-store', () => jest.requireActual<typeof SecureStoreFake>('./support/secure-store'));

const stored = new Map<string, string>();

export function getItemAsync(key: string): Promise<string | null> {
  return Promise.resolve(stored.get(key) ?? null);
}

export function setItemAsync(key: string, value: string): Promise<void> {
  stored.set(key, value);
  return Promise.resolve();
}

export function deleteItemAsync(key: string): Promise<void> {
  stored.delete(key);
  return Promise.resolve();
}
