/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { act } from '@testing-library/react-native';
import { router } from 'expo-router';
import { pass, screen } from './app';
import { openMain } from './main';

type User = Awaited<ReturnType<typeof openMain>>;

// Opens the main screen, then a friend screen above it, as 내 정보's rows will.
export async function openFriendScreen(
  address: '/me/friends' | '/me/friends/requests' | '/me/friends/add',
): Promise<User> {
  const user = await openMain();
  await act(() => {
    router.push(address);
  });
  await pass(500);
  return user;
}

// The Friends in 친구 관리, by the names on their switches, in the list's order.
export function friendRows(): string[] {
  return screen
    .getAllByRole('switch', { name: /님과 위치 공유$/u })
    .map((row) => String(row.props.accessibilityLabel).replace('님과 위치 공유', ''));
}
