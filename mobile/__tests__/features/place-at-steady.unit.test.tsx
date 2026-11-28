/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { apiClient } from '@/api/client';
import type { PlaceAt } from '@/api/room-types';
import type { LatLng } from '@/api/types';
import { usePlaceAt } from '@/features/places/use-place-at';

// The user (2026-11-28), on 파티 만들기 → 장소 검색 → 지도에서 직접 고르기: "지도를 옮기다 보면 순간적으로 껌뻑이면서 하단
// 카드가 표시돼." Each time the map came to rest the card's words went blank and its button grey until the main
// server answered for the new point. The words of the last answer stay while the next is asked; only a press waits
// for the new one.

const ENGINEERING_1 = { id: 'p301', number: '301', name: '제1공학관', latitude: 37.45016, longitude: 126.95259 };
const ENGINEERING_2 = { id: 'p302', number: '302', name: '제2공학관', latitude: 37.44885, longitude: 126.95252 };
const AT_301: LatLng = { latitude: 37.4502, longitude: 126.9526 };
const AT_302: LatLng = { latitude: 37.4489, longitude: 126.9525 };

let answers: ((at: PlaceAt) => void)[] = [];

beforeEach(() => {
  answers = [];
  jest.spyOn(apiClient, 'findPlaceAt').mockImplementation(
    () =>
      new Promise<PlaceAt>((resolve) => {
        answers.push(resolve);
      }),
  );
});

afterEach(() => {
  jest.restoreAllMocks();
});

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

async function answer(at: PlaceAt): Promise<void> {
  await act(async () => {
    answers.shift()?.(at);
    await Promise.resolve();
  });
}

describe('usePlaceAt while the map moves', () => {
  it("keeps the last place's words while the next point is asked, and takes the new ones once they come", async () => {
    const view = await renderHook(({ point }: { point: LatLng | null }) => usePlaceAt(point), {
      initialProps: { point: AT_301 },
      wrapper,
    });
    await answer({ place: ENGINEERING_1, relation: 'inside' });
    expect(view.result.current.shown?.words).toBe('제1공학관 301동');
    expect(view.result.current.chosen?.words).toBe('제1공학관 301동');

    await view.rerender({ point: AT_302 });
    expect(view.result.current.shown?.words).toBe('제1공학관 301동');
    expect(view.result.current.chosen).toBeUndefined();

    await answer({ place: ENGINEERING_2, relation: 'inside' });
    expect(view.result.current.shown?.words).toBe('제2공학관 302동');
    expect(view.result.current.chosen?.words).toBe('제2공학관 302동');
  });

  it('shows nothing for a point outside the campus', async () => {
    const view = await renderHook(({ point }: { point: LatLng | null }) => usePlaceAt(point), {
      initialProps: { point: AT_301 },
      wrapper,
    });
    await answer({ place: ENGINEERING_1, relation: 'inside' });

    await view.rerender({ point: null });

    expect(view.result.current.shown).toBeUndefined();
    expect(view.result.current.chosen).toBeUndefined();
  });
});
