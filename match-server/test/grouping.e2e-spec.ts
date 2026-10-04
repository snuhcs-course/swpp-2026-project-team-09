import { type Candidate } from '../src/matching/grouping.js';
import { HashtagGrouping } from '../src/matching/hashtag-grouping.js';

// Requests named by their ids, arriving a minute apart in the order given.
function requests(...hashtags: string[][]): Candidate[] {
  return hashtags.map((tags, index) => ({
    id: `r${index + 1}`,
    hashtags: tags,
    arrivedAt: new Date(Date.UTC(2026, 9, 4, 8, index)),
  }));
}

async function groupsOf(pool: Candidate[], size: number): Promise<string[][]> {
  const groups = await new HashtagGrouping().group(pool, size);
  return groups.map((group) => group.map(({ id }) => id));
}

describe('Grouping by hashtags', () => {
  it('puts together the requests that share hashtags', async () => {
    const pool = requests(['jazz', '보드게임'], ['soccer'], ['running'], ['jazz'], ['soccer', 'running']);

    expect(await groupsOf(pool, 2)).toEqual([
      ['r1', 'r4'],
      ['r2', 'r5'],
    ]);
  });

  it('takes the request that shares the most hashtags with the group, the earlier on a tie', async () => {
    const pool = requests(['a', 'b', 'c'], ['a'], ['a', 'b'], ['c'], ['a', 'b'], ['z']);

    expect(await groupsOf(pool, 3)).toEqual([
      ['r1', 'r3', 'r5'],
      ['r2', 'r4', 'r6'],
    ]);
  });

  it('groups in the order of arrival when the requests share no hashtag', async () => {
    const pool = requests([], ['jazz'], [], ['soccer']).toReversed();

    expect(await groupsOf(pool, 2)).toEqual([
      ['r1', 'r2'],
      ['r3', 'r4'],
    ]);
  });

  it('forms as many groups as the pool fills, and leaves the rest to wait', async () => {
    const pool = requests(['jazz'], [], ['soccer'], ['jazz'], [], ['soccer'], ['chess']);

    expect(await groupsOf(pool, 3)).toEqual([
      ['r1', 'r4', 'r2'],
      ['r3', 'r6', 'r5'],
    ]);
  });

  it('leaves out the request that shares the least when one is left over', async () => {
    const pool = requests(['jazz'], ['soccer'], ['jazz']);

    expect(await groupsOf(pool, 2)).toEqual([['r1', 'r3']]);
  });

  it('forms no group of a pool smaller than one group', async () => {
    expect(await groupsOf(requests(['jazz'], ['jazz']), 3)).toEqual([]);
  });
});
