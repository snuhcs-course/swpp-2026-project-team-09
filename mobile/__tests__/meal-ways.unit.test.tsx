/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-23  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactElement, ReactNode } from 'react';
import { apiClient } from '@/api/client';
import { crowdedMealAnswer } from '@/api/mock/data/crowded-meal';
import { SHUTTLE } from '@/api/mock/data/shuttle';
import type { Plan } from '@/api/assistant-types';
import { useMealWays } from '@/screens/main/use-answer-walks';

// A meal Plan's ways (P04 ticket 41, PR 497's review): only a meal answer asks for walks and the shuttle's route.
const CROWDED = crowdedMealAnswer('2026-10-07', '2026-10-06T04:00:00Z');
const BY_SHUTTLE = CROWDED.plans.find(({ place }) => place.label === '자하연식당 2층');

function wrapper({ children }: { children: ReactNode }): ReactElement {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

const getShuttle = jest.spyOn(apiClient, 'getShuttle');
const findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');

beforeEach(() => {
  getShuttle.mockReset().mockResolvedValue(SHUTTLE);
  findWalkingRoute.mockReset().mockResolvedValue({ status: 'ROUTE_RESULT_NOT_FOUND', route: null });
});

// Partitions: no Plan, as for an answer that is not a meal's; a meal Plan with a leg by the shuttle.
describe('the ways asked for', () => {
  it('are none without a meal Plan', async () => {
    const none: Plan | undefined = CROWDED.plans.find(({ place }) => place.label === '없는 식당');
    const { result } = await renderHook(() => useMealWays(none), { wrapper });

    expect(result.current.legs).toEqual([]);
    expect(getShuttle).not.toHaveBeenCalled();
    expect(findWalkingRoute).not.toHaveBeenCalled();
  });

  it("are the shuttle's route and the walks to and from its stops for a leg by the shuttle", async () => {
    const plan: Plan | undefined = BY_SHUTTLE;
    const { result } = await renderHook(() => useMealWays(plan), { wrapper });

    await waitFor(() => {
      expect(result.current.legs.map(({ board, getOff }) => [board.name, getOff.name])).toEqual([
        ['301동', '기숙사삼거리'],
      ]);
    });
    expect(getShuttle).toHaveBeenCalledTimes(1);
    expect(findWalkingRoute).toHaveBeenCalledTimes(3);
  });
});
