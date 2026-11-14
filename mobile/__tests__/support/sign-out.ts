/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-14  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { userEvent } from '@testing-library/react-native';
import { askGoogle } from '@/auth/google';
import { pass, screen } from './app';
import type { FakeServer, Reply } from './fake-server';
import { idTokenOf } from './id-token';
import { SIGN_IN } from './live';
import { TOKENS } from './server';

type User = ReturnType<typeof userEvent.setup>;

const SIGNED_OUT: Reply = { status: 204 };

// 로그아웃 on 내 정보, confirmed in its dialog, with the main server's answer to it.
export async function signOut(user: User, server: FakeServer, reply: Reply = SIGNED_OUT): Promise<void> {
  server.on('POST /auth/sign-out', reply);
  await user.press(screen.getByRole('tab', { name: /^내 정보/u }));
  await pass(500);
  await user.press(screen.getByRole('button', { name: '로그아웃' }));
  const confirm = screen.getAllByRole('button', { name: '로그아웃' }).at(-1);
  if (confirm === undefined) {
    throw new Error('The dialog has no 로그아웃');
  }
  await user.press(confirm);
  await pass(500);
}

// The sign-in screen's button, with Google and the main server answering. The test file mocks `@/auth/google`.
export async function signIn(user: User, server: FakeServer): Promise<void> {
  server.on('POST /auth/google', { status: 200, body: { ...TOKENS, onboarding: { completed: true } } });
  jest.mocked(askGoogle).mockResolvedValue({
    kind: 'token',
    idToken: idTokenOf({ email: 'gildong@snu.ac.kr', hd: 'snu.ac.kr', name: '홍길동' }),
  });
  await user.press(screen.getByRole('button', { name: SIGN_IN }));
  await pass(1000);
  await pass(1000);
}
