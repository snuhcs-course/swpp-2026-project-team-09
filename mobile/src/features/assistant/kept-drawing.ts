/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerReply, MapScene } from '@/api/assistant-types';
import type { LatLng } from '@/api/types';
import { type AnswerDrawing, offset } from './answer-drawing';
import { drawingOfScene } from './answer-marks';
import type { LabelView } from './answer-labels';
import { NO_STANDINGS } from './invited-friends';

// What the map shows once 그대로 두기 left the Quest already set as it is (P04 ticket 20): its tag and the User's own
// mark of the Plan at `planIndex`, without the minutes to a pick that is gone, which the camera fits as it fits a
// Plan; with no mark of the User's, the tag alone, and the camera stays where it was. Null when the Quest has no point.
export function keptDrawingOf(
  answer: AnswerReply,
  planIndex: number,
  view: LabelView | null = null,
): AnswerDrawing | null {
  const people = answer.plans[planIndex]?.scene.people ?? [];
  const me = people
    .filter((person) => person.me)
    .map(({ userId, name, at, source }) => ({ userId, name, me: true, at, source, tag: null }));
  const scene: MapScene = { places: [], people: me, routes: [], flags: [] };
  const drawing = drawingOfScene(scene, view, {
    number: null,
    plans: [],
    standings: NO_STANDINGS,
    kept: answer.planSet,
  });
  if (!drawing.things.some(({ id }) => id === 'answer:kept')) {
    return null;
  }
  return me.length === 0 ? { ...drawing, points: [] } : drawing;
}

// How far the tag's words reach to their side, in metres, and how far up or down a Friend's face may stand and still
// cover them: a face is a pin drawn above its point.
const KEPT_WORDS = { along: 400, across: 120 };

// Whether a Friend's face at a position would cover the words of the tag of a Quest already set, which reach to one
// side of its point: it then gives way, as one near any of the Plan's own marks does, for the map draws every face
// above every mark.
export function nearKeptWords({ things }: Pick<AnswerDrawing, 'things'>, position: LatLng): boolean {
  const kept = things.find(({ id }) => id === 'answer:kept');
  const side = kept?.look.kind === 'answer' ? kept.look.label?.side : undefined;
  if (kept === undefined || (side !== 'left' && side !== 'right')) {
    return false;
  }
  const { east, north } = offset(kept.position, position);
  const along = side === 'right' ? east : -east;
  return along > 0 && along <= KEPT_WORDS.along && Math.abs(north) <= KEPT_WORDS.across;
}
