import { renderHook } from '@testing-library/react-native';
import { startFresh } from '../support/mocks';
import { freshWrapper, settle } from '../support/queries';
import { apiClient } from '@/api/client';
import { useFriends } from '@/features/friends/use-friends';
import { useMapCards } from '@/features/map/use-map-cards';
import { useQuestRows } from '@/features/quests/use-quest-rows';

// One entry of the cache per operation: what the hooks share, and what a screen is told when one operation fails.

let wrapper = freshWrapper();

function kinds(cards: readonly { kind: string }[] | undefined): string[] {
  return [...new Set(cards?.map(({ kind }) => kind))];
}

beforeEach(async () => {
  jest.useFakeTimers();
  wrapper = freshWrapper();
  await startFresh();
});

afterEach(() => {
  jest.restoreAllMocks();
  jest.useRealTimers();
});

describe('two screens that need the same operation', () => {
  it('ask it once', async () => {
    const listFriends = jest.spyOn(apiClient, 'listFriends');
    const listPositions = jest.spyOn(apiClient, 'listPositions');
    const listFriendStatuses = jest.spyOn(apiClient, 'listFriendStatuses');
    const getMyParty = jest.spyOn(apiClient, 'getMyParty');
    const friends = await renderHook(useFriends, { wrapper });
    const cards = await renderHook(useMapCards, { wrapper });
    await renderHook(useQuestRows, { wrapper });

    await settle();

    expect(friends.result.current.data).toHaveLength(12);
    expect(cards.result.current.data).toHaveLength(14);
    expect(listFriends).toHaveBeenCalledTimes(1);
    expect(listPositions).toHaveBeenCalledTimes(1);
    expect(listFriendStatuses).toHaveBeenCalledTimes(1);
    expect(getMyParty).toHaveBeenCalledTimes(1);
  });
});

describe("a failure of an operation of the app's own", () => {
  it('leaves the friend list, each Friend shown by what the main server says', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listFriendStatuses';
    const { result } = await renderHook(useFriends, { wrapper });

    await settle();

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toHaveLength(12);
    expect(result.current.data?.find(({ id }) => id === 'f1')).toMatchObject({ presence: 'free', line: '공강' });
  });

  it('leaves the cards of the map, a Global Event without its announcer', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listGlobalEventAnnouncers,listFriendStatuses';
    const { result } = await renderHook(useMapCards, { wrapper });

    await settle();

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toHaveLength(14);
    expect(result.current.data?.find(({ id }) => id === 'event:e1')).toMatchObject({ subLabel: '공식 행사' });
  });
});

describe('a failure of one operation of the map', () => {
  it('takes the Global Events off, keeps the other cards and is told', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listGlobalEvents';
    const { result } = await renderHook(useMapCards, { wrapper });

    await settle();

    expect(result.current.isPending).toBe(false);
    expect(result.current.isError).toBe(true);
    expect(kinds(result.current.data)).toEqual(['party', 'shared-quest', 'friend', 'party-member']);
  });

  it("takes off the cards that the User's Party words", async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'getMyParty';
    const { result } = await renderHook(useMapCards, { wrapper });

    await settle();

    expect(result.current.isError).toBe(true);
    expect(kinds(result.current.data)).toEqual(['global-event', 'friend']);
  });

  it("takes off Friends and the Party's members when the Friends are not known", async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listFriends';
    const { result } = await renderHook(useMapCards, { wrapper });

    await settle();

    expect(result.current.isError).toBe(true);
    expect(kinds(result.current.data)).toEqual(['global-event', 'party', 'shared-quest']);
  });
});

describe('asking again after a failure', () => {
  it('asks the failed operation alone, and the map has every card', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listGlobalEvents';
    const listGlobalEvents = jest.spyOn(apiClient, 'listGlobalEvents');
    const listFriends = jest.spyOn(apiClient, 'listFriends');
    const { result } = await renderHook(useMapCards, { wrapper });
    await settle();

    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_MOCK_FAIL');
    result.current.refetch();
    await settle();

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toHaveLength(14);
    expect(listGlobalEvents).toHaveBeenCalledTimes(2);
    expect(listFriends).toHaveBeenCalledTimes(1);
  });

  it('gives the Quest list its rows', async () => {
    process.env.EXPO_PUBLIC_MOCK_FAIL = 'listParties';
    const { result } = await renderHook(useQuestRows, { wrapper });
    await settle();
    expect(result.current.isError).toBe(true);
    expect(result.current.data).toBeUndefined();

    Reflect.deleteProperty(process.env, 'EXPO_PUBLIC_MOCK_FAIL');
    result.current.refetch();
    await settle();

    expect(result.current.isError).toBe(false);
    expect(result.current.data).toHaveLength(3);
  });

  it('asks every operation when none failed', async () => {
    const listPositions = jest.spyOn(apiClient, 'listPositions');
    const { result } = await renderHook(useFriends, { wrapper });
    await settle();

    result.current.refetch();
    await settle();

    expect(listPositions).toHaveBeenCalledTimes(2);
    expect(result.current.data).toHaveLength(12);
  });
});
