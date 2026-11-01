/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';
import { FriendsService } from '../../friends/friends.service.js';
import { QuestsService } from '../../quests/quests.service.js';
import { affiliationOf } from '../../tutorial/affiliation.js';
import { UsersService } from '../../users/users.service.js';
import { CARDS_MAX, noneFound, type Presented, type ToolContext } from '../feature.js';
import { koreaDate } from '../korea-time.js';
import { addDays, lastBookableDate, type Refusal } from './booking-rules.js';
import { type Catalogue, type LibrarySpace, type SpaceStatus, statusOf } from './catalogue.js';
import { type FreeTimePort } from './free-time-port.js';
import { type LibraryCard } from './library-card.js';

// What the 관정도서관 tools share (ADR 0009). The model passes catalogue ids and the User's words; the server checks the
// request against the catalogue and shows a card the phone fills from the library. No tool reads the library, and
// none returns a seat, a booking, a 학번, a registered name or the User's 소속.

export interface LibraryServices {
  catalogue: Catalogue;
  freeTime: FreeTimePort;
  friends: FriendsService;
  quests: QuestsService;
  users: UsersService;
  // LIBRARY_BOOKING_ENABLED.
  enabled: boolean;
}

export const OFFICIAL_SITE = 'https://k-rsv.snu.ac.kr/NEW_SNU_BOOKING/pc/main';

const BOOKING_OFF = {
  result: 'none',
  reason: '관정도서관 예약은 공식 사이트나 앱에서 해 주세요.',
  link: OFFICIAL_SITE,
};

const OLD_APP = noneFound('이 앱 버전에서는 도서관 예약을 할 수 없어요. 앱을 업데이트해 주세요.');

const SUPPORTED = '관정관 2·4층 그룹스터디룸, 6층 관정미디어플렉스의 스튜디오·미디어캐럴·XR, 7·8층 열람실과 노트북존';

const PARTY_NOTE = '파티는 최대 8명까지라 9명 이상 방 예약은 아직 못 해요 — 직접 예약해 주세요';

export const spaceIdInput = z
  .string()
  .trim()
  .min(1)
  .max(40)
  .describe('A catalogue id findLibrarySpace returned in this message.');

// What a library tool answers instead of its own work: booking is turned off, or the app cannot show library cards.
export function gated({ enabled }: LibraryServices, { capabilities }: ToolContext): object | null {
  if (!enabled) {
    return BOOKING_OFF;
  }
  return capabilities.has('library') ? null : OLD_APP;
}

// The reason a space that is not bookable here is answered with.
export function statusReason(space: LibrarySpace | undefined, status: Exclude<SpaceStatus, 'implemented'>): object {
  const name = space?.name ?? '이 공간';
  if (status === 'notOnline') {
    return {
      reason: `${name}은 온라인으로 예약할 수 없어요. 현장에서 이용해요 (현장 이용).`,
      siteNote: space?.whyNot ?? null,
    };
  }
  if (status === 'notEligible') {
    return { reason: `${name}은 대학원생을 위한 곳이에요. 내 정보의 소속이 대학원일 때 예약할 수 있어요.` };
  }
  return { reason: '아직 미구현이에요.', supported: SUPPORTED };
}

function windowWords(space: LibrarySpace, now: Date): string {
  return space.bookingAheadDays === 0
    ? '당일만'
    : `오늘부터 ${space.bookingAheadDays}일 뒤(${lastBookableDate(space, now)})까지`;
}

// What the model is told of a space: catalogue facts only.
export function spaceAnswer(id: string, space: LibrarySpace | undefined, status: SpaceStatus, now: Date): object {
  const base = { id, name: space?.name ?? null, floor: space?.floor ?? null, status };
  if (space === undefined || status !== 'implemented') {
    return { ...base, ...statusReason(space, status === 'implemented' ? 'unsupported' : status) };
  }
  return {
    ...base,
    unit: space.unit,
    purpose: space.purpose,
    hours: space.hours,
    durations: { min: space.minMinutes, max: space.maxMinutes, step: space.stepMinutes },
    window: windowWords(space, now),
    capacity: space.capacity,
    useDescOptions: space.useDescOptions,
    needsPledge: space.pledge !== null,
    equipment: space.equipmentGroups.map(({ id: group, equipment, rooms }) => ({ id: group, equipment, rooms })),
    ...(space.capacity !== null && space.capacity.min > 8 ? { note: PARTY_NOTE } : {}),
  };
}

// The User's 소속, read on the server only when a space depends on it, and never returned.
export async function affiliationFor(
  users: UsersService,
  userId: string,
  spaces: readonly (LibrarySpace | undefined)[],
): Promise<string | null> {
  const needed = spaces.some((space) => (space?.forAffiliation ?? null) !== null);
  return needed ? affiliationOf(await users.findById(userId)) : null;
}

// The space of a found id, or what to answer instead: that booking is off, or the space's status with its reason.
export async function bookableSpace(
  services: LibraryServices,
  spaceId: string,
  context: ToolContext,
): Promise<{ space: LibrarySpace } | { answer: object }> {
  const blocked = gated(services, context);
  if (blocked !== null) {
    return { answer: blocked };
  }
  context.found.refuseUnfound('librarySpace', [spaceId]);
  const space = services.catalogue.byId.get(spaceId);
  const status = statusOf(space, await affiliationFor(services.users, context.userId, [space]));
  if (space === undefined || status !== 'implemented') {
    return { answer: { result: status, ...statusReason(space, status === 'implemented' ? 'unsupported' : status) } };
  }
  return { space };
}

// The space a cancel or return card names, if any: one findLibrarySpace returned in this message.
export function targetSpace(
  { catalogue }: LibraryServices,
  spaceId: string | undefined,
  context: ToolContext,
): LibrarySpace | null {
  if (spaceId === undefined) {
    return null;
  }
  context.found.refuseUnfound('librarySpace', [spaceId]);
  return catalogue.byId.get(spaceId) ?? null;
}

// How the catalogue summary marks a space, from the catalogue alone.
function statusWords(space: LibrarySpace): string {
  if (space.forAffiliation === 'graduate') {
    return '대학원생 전용';
  }
  return { implemented: 'bookable', notOnline: '현장 이용', unsupported: '미구현', notEligible: '대학원생 전용' }[
    statusOf(space, space.forAffiliation)
  ];
}

// The catalogue summary the model reads to choose ids: every space, bookable or not, by id, floor, name, purpose and
// aliases.
export function catalogueSummary({ spaces }: Catalogue): string {
  return spaces
    .map((space) => {
      const floor = space.floor === null ? '' : ` (${space.floor}층)`;
      const aliases = space.aliases.length === 0 ? '' : ` 별칭: ${[...new Set(space.aliases)].join(', ')}`;
      const purpose = space.purpose === '' ? '' : ` ${space.purpose}`;
      return `- ${space.id}${floor} ${space.name} [${statusWords(space)}]:${purpose}${aliases}`;
    })
    .join('\n');
}

// Adds the card to the reply once, by its key.
export function showCard(presented: Presented, card: LibraryCard): void {
  const shown = presented.cards.some((each) => each.kind === 'library' && each.library.key === card.library.key);
  if (shown) {
    return;
  }
  if (presented.cards.length + 1 > CARDS_MAX) {
    throw new Error(`A reply shows at most ${CARDS_MAX} cards, and nothing was shown.`);
  }
  presented.cards.push(card);
}

export function refused(refusals: Refusal[]): object {
  return { result: 'refused', refusals };
}

// 오늘, 내일 and 모레, or the date.
export function dayWords(date: string, now: Date): string {
  const today = koreaDate(now);
  const words: Record<string, string> = { [today]: '오늘', [addDays(today, 1)]: '내일', [addDays(today, 2)]: '모레' };
  return words[date] ?? date;
}
