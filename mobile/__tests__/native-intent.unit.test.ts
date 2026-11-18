/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { clearInitialURL, getLinkingURL } from 'expo-linking';
import { Platform } from 'react-native';
import { redirectSystemPath } from '@/app/+native-intent';
import { keep } from '@/storage/kept';

// The router's hook for the address the system opens the app with, with expo-linking's held address and the phone's
// storage as stand-ins.

jest.mock('expo-linking', () => ({ getLinkingURL: jest.fn(), clearInitialURL: jest.fn() }));
jest.mock('@/storage/kept', () => ({ keep: jest.fn() }));

const TOKEN = 'k3J9xQ';
const HTTPS_LINK = `https://api.snunow.com/invite/${TOKEN}`;
const SCHEME_LINK = `snunow://invite/${TOKEN}`;
const ROOT = 'snunow:///';

// What expo-linking holds: the address that started the app, or the last one opened while it ran.
let held: string | null = null;

beforeEach(() => {
  held = null;
  jest.mocked(getLinkingURL).mockImplementation(() => held);
  jest.mocked(clearInitialURL).mockImplementation(() => {
    held = null;
  });
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

describe('on Android', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'android');
  });

  it.each([
    ['https', HTTPS_LINK],
    ['snunow', SCHEME_LINK],
  ])('keeps the token of an %s link that started the app, from the held address, and clears it', (_, link) => {
    held = link;

    // The router may have stopped waiting for React Native and start at the root.
    expect(redirectSystemPath({ path: ROOT, initial: true })).toBe(ROOT);

    expect(keep).toHaveBeenCalledWith({ inviteToken: TOKEN });
    expect(held).toBeNull();
  });

  it('keeps nothing for a link opened while the app runs, and clears the held address', () => {
    held = SCHEME_LINK;

    expect(redirectSystemPath({ path: SCHEME_LINK, initial: false })).toBe(SCHEME_LINK);

    expect(keep).not.toHaveBeenCalled();
    expect(held).toBeNull();
  });

  it('does not keep a link opened while the app ran at a later start of the screens in the same process', () => {
    held = SCHEME_LINK;
    redirectSystemPath({ path: SCHEME_LINK, initial: false });

    expect(redirectSystemPath({ path: ROOT, initial: true })).toBe(ROOT);

    expect(keep).not.toHaveBeenCalled();
  });

  it('keeps nothing at a start from the home screen', () => {
    expect(redirectSystemPath({ path: ROOT, initial: true })).toBe(ROOT);

    expect(keep).not.toHaveBeenCalled();
  });
});

describe('on iOS', () => {
  beforeEach(() => {
    jest.replaceProperty(Platform, 'OS', 'ios');
  });

  it('keeps the token of the path that started the app, and leaves expo-linking alone', () => {
    expect(redirectSystemPath({ path: HTTPS_LINK, initial: true })).toBe(HTTPS_LINK);

    expect(keep).toHaveBeenCalledWith({ inviteToken: TOKEN });
    expect(getLinkingURL).not.toHaveBeenCalled();
    expect(clearInitialURL).not.toHaveBeenCalled();
  });

  it('keeps nothing for a path that is no Invite Link, nor for a link opened while the app runs', () => {
    expect(redirectSystemPath({ path: '/main', initial: true })).toBe('/main');
    expect(redirectSystemPath({ path: SCHEME_LINK, initial: false })).toBe(SCHEME_LINK);

    expect(keep).not.toHaveBeenCalled();
  });
});
