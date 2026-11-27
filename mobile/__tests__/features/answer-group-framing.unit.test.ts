/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { STUDY_GROUP_TO_SEND } from '@/api/mock/data/study-group-answers';
import { faceBox, labelBoxAt, type LabelView, overlaps } from '@/features/assistant/answer-labels';
import { drawingOf } from '@/features/assistant/answer-marks';
import { inView, type MapAvatar, unmadeImage } from '@/map';
import { facesClearOf } from '@/screens/main/use-answer-faces';
import { seen } from '../support/answer-marks';
import { cameraPutting, positionAt, SIZE } from '../support/answer-view';

// The study answer together placed on the map as a meal answer is (P10 ticket 11's pictures: its room's label lay over
// a Friend's face, and the User's own label over the map's credit): its camera keeps every mark, and a face under its
// room's label is left out.

const ROOM = STUDY_GROUP_TO_SEND.plans[0]?.place ?? { latitude: 0, longitude: 0 };
const CAMERA = cameraPutting(ROOM, { x: 200, y: 300 });
const VIEW: LabelView = { camera: CAMERA, size: SIZE, area: { top: 100, right: 395, bottom: 700, left: 16 } };

function face(at: { x: number; y: number }): MapAvatar {
  return {
    id: 'avatar:friend',
    name: '채원',
    position: positionAt(CAMERA, at),
    image: unmadeImage({ kind: 'me' }),
    glideMs: 0,
  };
}

// Partitions: the camera's marks, and a face under the room's label. Expected values: the meal answer's (P04 tickets
// 51 and 84).
describe('The study answer together on the map', () => {
  it('keeps every mark in the camera, as a meal answer does', () => {
    const drawing = drawingOf(STUDY_GROUP_TO_SEND, 0);

    expect(drawing.keep).toEqual(drawing.points);
  });

  it("leaves out a Friend's face under its room's label", () => {
    const drawing = drawingOf(STUDY_GROUP_TO_SEND, 0, undefined, VIEW);
    const { label } = seen(drawing, 'answer:pick');
    if (label === null) {
      throw new Error('The room has no label');
    }
    const box = labelBoxAt(VIEW, ROOM, label);
    const under = face({ x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 });

    expect(overlaps(box, faceBox(VIEW, under.position))).toBe(true);
    expect(facesClearOf([under], drawing, VIEW)).toEqual([]);
  });

  it("keeps a Friend's face clear of its labels", () => {
    const drawing = drawingOf(STUDY_GROUP_TO_SEND, 0, undefined, VIEW);
    const far = face(inView(ROOM, CAMERA, SIZE).x > 300 ? { x: 40, y: 650 } : { x: 380, y: 650 });

    expect(facesClearOf([far], drawing, VIEW)).toEqual([far]);
  });
});
