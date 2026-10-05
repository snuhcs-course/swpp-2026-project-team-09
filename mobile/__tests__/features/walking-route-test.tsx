import { act, renderHook } from '@testing-library/react-native';
import { startFresh } from '../support/mocks';
import { freshWrapper, settle } from '../support/queries';
import { apiClient } from '@/api/client';
import { useWalkingRoute } from '@/features/map/use-walking-route';

// The walking route is asked when the User asks, from where the User is at that moment.

const GATE = { latitude: 37.45905, longitude: 126.9512 };
const STUDENT_CENTRE = { latitude: 37.45907, longitude: 126.95023 };
const LIBRARY = { latitude: 37.4594, longitude: 126.95199 };

let wrapper = freshWrapper();

beforeEach(async () => {
  jest.useFakeTimers();
  wrapper = freshWrapper();
  await startFresh();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('the walking route', () => {
  it('asks nothing before the User asks', async () => {
    const findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
    const { result } = await renderHook(useWalkingRoute, { wrapper });

    await settle();

    expect(findWalkingRoute).not.toHaveBeenCalled();
    expect(result.current).toMatchObject({ route: undefined, isPending: false, isError: false });
  });

  it('is loading, and then goes from the start to the destination', async () => {
    const { result } = await renderHook(useWalkingRoute, { wrapper });

    await act(() => {
      result.current.ask(GATE, STUDENT_CENTRE);
    });
    expect(result.current.isPending).toBe(true);
    await settle();

    const line = result.current.route?.route?.line ?? [];
    expect(result.current.route?.status).toBe('OK');
    expect(line.at(0)).toEqual(GATE);
    expect(line.at(-1)).toEqual(STUDENT_CENTRE);
  });

  it('is replaced by the route to another destination', async () => {
    const { result } = await renderHook(useWalkingRoute, { wrapper });
    await act(() => {
      result.current.ask(GATE, STUDENT_CENTRE);
    });
    await settle();

    await act(() => {
      result.current.ask(GATE, LIBRARY);
    });
    expect(result.current.route).toBeUndefined();
    await settle();

    expect(result.current.route?.route?.line.at(-1)).toEqual(LIBRARY);
  });
});

describe('the walking route between two askings', () => {
  it('asks nothing more when the screen is drawn again', async () => {
    const findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
    const { result, rerender } = await renderHook(useWalkingRoute, { wrapper });
    await act(() => {
      result.current.ask(GATE, STUDENT_CENTRE);
    });
    await settle();

    await rerender({});
    await settle();

    expect(findWalkingRoute).toHaveBeenCalledTimes(1);
    expect(result.current.route?.route?.line.at(0)).toEqual(GATE);
  });

  it('asks again from the new place when the User asks again', async () => {
    const findWalkingRoute = jest.spyOn(apiClient, 'findWalkingRoute');
    const { result } = await renderHook(useWalkingRoute, { wrapper });
    await act(() => {
      result.current.ask(GATE, STUDENT_CENTRE);
    });
    await settle();

    await act(() => {
      result.current.ask(LIBRARY, STUDENT_CENTRE);
    });
    await settle();

    expect(findWalkingRoute).toHaveBeenCalledTimes(2);
    expect(result.current.route?.route?.line.at(0)).toEqual(LIBRARY);
  });
});

describe('the walking route that is dropped or not found', () => {
  it('has no route once it is cleared', async () => {
    const { result } = await renderHook(useWalkingRoute, { wrapper });
    await act(() => {
      result.current.ask(GATE, STUDENT_CENTRE);
    });
    await settle();

    await act(() => {
      result.current.clear();
    });

    expect(result.current).toMatchObject({ route: undefined, isPending: false, isError: false });
  });

  it('is told of a failure', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'findWalkingRoute';
    const { result } = await renderHook(useWalkingRoute, { wrapper });

    await act(() => {
      result.current.ask(GATE, STUDENT_CENTRE);
    });
    await settle();

    expect(result.current).toMatchObject({ route: undefined, isPending: false, isError: true });
  });
});
