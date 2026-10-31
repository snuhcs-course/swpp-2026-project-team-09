/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-31  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { POST_SOURCE_NAMES, POST_SOURCES } from '../src/global-events/post-sources.js';

describe('The settings of a Source with posts', () => {
  it.each([
    ['snu_events', 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=178226', '178226'],
    ['extra_snu', 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM012002382', 'PGM012002382'],
  ] as const)('name the key of a post of %s in a link', (source, link, key) => {
    expect(POST_SOURCES[source].postKeyInLink.exec(link)?.[1]).toBe(key);
  });

  it.each([
    ['snu_events', 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM012002382'],
    ['extra_snu', 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=178226'],
  ] as const)("do not take another Source's link for a post of %s", (source, link) => {
    expect(POST_SOURCES[source].postKeyInLink.exec(link)).toBeNull();
  });

  it('cover exactly the Sources a Collection message may name', () => {
    expect(Object.keys(POST_SOURCES).toSorted()).toEqual([...POST_SOURCE_NAMES].toSorted());
  });
});
