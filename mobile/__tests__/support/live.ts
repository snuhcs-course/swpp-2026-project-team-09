import { act } from '@testing-library/react-native';
import { type FakeSocket, sockets } from './fake-socket';
import { pass } from './app';
import { openMain } from './main';

// The app against the fake main server and a fake socket server. A test file that uses it also mocks `@/auth/google`,
// `expo-secure-store` and `socket.io-client` (`server.ts`, `fake-socket.ts`).

export const SIGN_IN = '서울대학교 구글 계정(@snu.ac.kr)으로 로그인';
export const REPLACED = '다른 기기에서 로그인했어요';

// The one connection, which the main screen's start opened.
export function theSocket(): FakeSocket {
  expect(sockets).toHaveLength(1);
  const [socket] = sockets;
  if (socket === undefined) {
    throw new Error('No connection to the socket server');
  }
  return socket;
}

// What the socket server does, and the time for the app to follow.
export async function socketServer(does: (socket: FakeSocket) => void): Promise<void> {
  await act(() => {
    does(theSocket());
  });
  await pass(0);
}

// The main screen with its connection open.
export async function openLive(): Promise<FakeSocket> {
  await openMain();
  await socketServer((socket) => {
    socket.accept();
  });
  return theSocket();
}
