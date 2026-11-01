/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { matchedPlace } from '../src/global-events/judgement-checks.js';
import { POST_SOURCES } from '../src/global-events/post-sources.js';
import { type PlaceDto } from '../src/places/dto/place.dto.js';

const PLACES: PlaceDto[] = [{ id: 'b', name: '제1공학관', number: '301', latitude: 37.45, longitude: 126.95 }];

const NAME_IS_NOT_GWANAK = { buildingNumberIsGwanak: true, placeNameIsGwanak: false, postKeyInLink: /x/u };
const NAME_IS_GWANAK = { ...NAME_IS_NOT_GWANAK, placeNameIsGwanak: true };

describe("a place named only by a Place's name", () => {
  it('matches only where the Source takes the name as Gwanak', () => {
    expect(matchedPlace('제1공학관 117호', NAME_IS_NOT_GWANAK, PLACES)).toBeNull();
    expect(matchedPlace('제1공학관 117호', NAME_IS_GWANAK, PLACES)?.id).toBe('b');
  });

  it.each(['수원캠퍼스 제1공학관', '연건 제1공학관', '서울시 강남구 제1공학관', '온라인'])(
    'still refuses %s',
    (place) => {
      expect(matchedPlace(place, NAME_IS_GWANAK, PLACES)).toBeNull();
    },
  );

  it('is the setting of extra.snu and not of SNU Now', () => {
    expect(POST_SOURCES.extra_snu.placeNameIsGwanak).toBe(true);
    expect(POST_SOURCES.snu_events.placeNameIsGwanak).toBe(false);
  });
});
