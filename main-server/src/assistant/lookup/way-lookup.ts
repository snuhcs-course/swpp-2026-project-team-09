/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { type AnswerLine, type Lookup, type MapScene } from '../dto/answer.dto.js';
import { withTopic } from '../gathering/answer-words.js';
import { PlaceNaming } from '../gathering/place-naming.js';
import { type Way, type WayArgs, wayOf } from './way.js';

export { type WayArgs } from './way.js';

// The words of a way, and what the map draws of it. Only the labels are sent to the model.

export type WayAnswer =
  // How the start and the Place are called.
  | { result: 'found'; way: Way; lookup: Lookup; labels: { from: string; to: string } }
  | { result: 'none'; reason: 'no-start' };

const plain = (text: string): AnswerLine => [{ text, strong: false }];

class WayNaming extends PlaceNaming {
  constructor(private readonly args: WayArgs) {
    super(args.placeOf);
  }

  // The Place asked about, by its name and number when it has both, since the User may have asked by either.
  asked(placeId: string): { name: string; label: string } {
    const { number, name } = this.args.placeOf(placeId);
    return { name, label: number === null ? name : `${name}(${number}동)` };
  }
}

function sceneOf({ start, toPlaceId, walkMinutes }: Way, args: WayArgs, naming: WayNaming): MapScene {
  const { me, location } = args;
  const { label } = naming.asked(toPlaceId);
  const here = start.basis === 'location' ? (location?.at ?? null) : null;
  const to = naming.position(toPlaceId);
  return {
    people: [
      {
        userId: me.userId,
        name: me.name,
        me: true,
        at: here ?? naming.position(start.placeId),
        source: here === null ? 'timetable' : 'exact',
        tag: '나',
      },
    ],
    places: [{ place: naming.labelledPoint(toPlaceId, label), role: 'pick', tag: label }],
    routes:
      walkMinutes > 0
        ? [{ userId: me.userId, role: 'me', from: naming.position(start.placeId), to, minutes: walkMinutes }]
        : [],
    flags: [{ at: to, text: `${label} · 걸어서 ${walkMinutes}분`, role: 'place' }],
  };
}

function lookupOf(way: Way, args: WayArgs, naming: WayNaming): Lookup {
  const { start, toPlaceId, walkMinutes } = way;
  const { name, label } = naming.asked(toPlaceId);
  const from = naming.placeLabel(start.placeId);
  const fromWords = start.basis === 'location' ? `지금 있는 ${from}` : from;
  return {
    kind: 'way',
    chips: [{ kind: 'origin', text: `${from}에서`, userId: null }],
    lines: [
      [
        { text: label, strong: true },
        // The particle follows the name, outside the parentheses.
        { text: `${withTopic(name).slice(name.length)} 여기예요`, strong: false },
      ],
      plain(`${fromWords}에서 걸어서 ${walkMinutes}분`),
    ],
    basis: [`${from} → ${label} 걸어서 ${walkMinutes}분 · 앱의 도보표`],
    scene: sceneOf(way, args, naming),
    band: null,
    actions: [{ kind: 'guide', to: naming.labelledPoint(toPlaceId, label) }],
  };
}

export function wayAnswer(args: WayArgs): WayAnswer {
  const way = wayOf(args);
  if (way === null) {
    return { result: 'none', reason: 'no-start' };
  }
  const naming = new WayNaming(args);
  const labels = { from: naming.placeLabel(way.start.placeId), to: naming.asked(way.toPlaceId).label };
  return { result: 'found', way, lookup: lookupOf(way, args, naming), labels };
}
