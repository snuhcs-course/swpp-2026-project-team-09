/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { INVITATION_CARD } from '@/api/mock/data/invitation-card';
import { color } from '@/design-system';
import { drawingOfScene } from '@/features/assistant/answer-marks';
import { label, MINSU_ID, seen } from '../support/answer-marks';

function scene(): Parameters<typeof drawingOfScene>[0] {
  if (INVITATION_CARD.way === null) {
    throw new Error('The stored card has a way');
  }
  return INVITATION_CARD.way.scene;
}

// Partitions of the scene of 민수's own way in the stored invitation card: the invitee's own dot, the destination
// with its flag at the same point, the Merging Point's flag alone, the routes, and nobody else. Expected values: the
// stored card and the rule of labels in the P02 spec, worked by hand: 301동 lies 144 metres north of 302동 and 5 west,
// 63동 1,163 metres north and 183 west, so no side the rule tries first is blocked.
describe("the marks of an invitee's own way", () => {
  const drawing = drawingOfScene(scene());

  it("draws 민수's own dot at 302동, with his tag at the right", () => {
    expect(seen(drawing, 'answer:me')).toEqual({
      name: '나 · 18분',
      symbol: { type: 'me' },
      label: label('right', 'person', '나 · 18분'),
      planId: null,
    });
    expect(drawing.things.find(({ id }) => id === 'answer:me')?.position).toEqual({
      latitude: 37.44887,
      longitude: 126.95265,
    });
  });

  it('draws the destination as the pick, without a number, with its flag under its title below it', () => {
    expect(seen(drawing, 'answer:pick')).toEqual({
      name: '63동 · 12:33 학생회관식당에서 식사',
      symbol: { type: 'dot', role: 'pick', number: null },
      label: label('below', 'pick', '63동', { line: '12:33 학생회관식당에서 식사' }),
      planId: null,
    });
    expect(drawing.pick).toEqual({ latitude: 37.45932, longitude: 126.95058 });
  });

  it("draws the Merging Point's flag above 301동, with no dot of its own", () => {
    expect(seen(drawing, 'answer:meeting:1')).toEqual({
      name: '12:18 유상과 만남',
      symbol: null,
      label: label('above', 'meeting', '12:18 유상과 만남'),
      planId: null,
    });
  });
});

// Partitions of the same scene's lines and people: each leg, and nobody but the invitee. Expected values: the stored
// card's routes, which are all the User's.
describe("the lines and people of an invitee's own way", () => {
  const drawing = drawingOfScene(scene());

  it('draws one line of the User for each leg, and no other thing or person', () => {
    expect(drawing.lines).toEqual([
      {
        id: 'answer:route:0',
        points: [
          { latitude: 37.44887, longitude: 126.95265 },
          { latitude: 37.45016, longitude: 126.95259 },
        ],
        style: { color: color.snuBlue, width: 5 },
      },
      {
        id: 'answer:route:1',
        points: [
          { latitude: 37.45016, longitude: 126.95259 },
          { latitude: 37.45932, longitude: 126.95058 },
        ],
        style: { color: color.snuBlue, width: 5 },
      },
    ]);
    expect(drawing.things.map(({ id }) => id).toSorted()).toEqual(['answer:me', 'answer:meeting:1', 'answer:pick']);
    expect(drawing.userIds).toEqual([MINSU_ID]);
  });
});
