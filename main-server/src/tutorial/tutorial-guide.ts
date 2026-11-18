/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-18  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { z } from 'zod';

// A Tutorial Quest's guide on the map (the canvas's `MainTutorialCard*` and `MainTut*` boards, P15 ticket 53): what
// the app draws in place of the quest's sheet. Only the app reads it; the Assistant does not.

const text = z.string().trim().min(1);
const url = z.url({ protocol: /^https?$/u });

// The icons a guide and a quest may name: the app draws each one. A name outside the list stops the server's start.
export const TUTORIAL_ICONS = [
  'idcard',
  'bowl',
  'box',
  'laptop',
  'book',
  'grade',
  'spark',
  'download',
  'bus',
  'moon',
  'cross',
  'heart',
  'art',
  'music',
  'mountain',
  'bank',
  'calendar',
  'clock',
  'info',
  'phone',
  'monitor',
  'check',
] as const;

export const iconSchema = z.enum(TUTORIAL_ICONS);

// Where a step's pin stands: a Place of the shared seed by its number, or a point.
export const guidePlaceSchema = z.union([
  z.strictObject({ place: text }),
  z.strictObject({
    point: z.strictObject({ latitude: z.number().min(-90).max(90), longitude: z.number().min(-180).max(180) }),
  }),
]);

// A fact of a step in a few words, after its icon ("평일 09:00–17:50").
const chipSchema = z.strictObject({ icon: iconSchema, words: text });

// A row of an online step: one press on a site or an app, in order. `note` stands at its right ("여기서 신청"); a row
// with `url` opens that address.
const rowSchema = z.strictObject({ words: text, note: text.optional(), url: url.optional() });

// A step's button: 길찾기 to the step's place, a site, or words sent to the Assistant. The server leaves the last out
// while 관정 booking is off, as it does a quest's `ask`.
const actionSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('route'), words: text }),
  z.strictObject({ kind: z.literal('link'), words: text, url }),
  z.strictObject({ kind: z.literal('ask'), words: text, ask: text }),
]);

// One of several places of a step, each a chip: its pin, if it has a Place, and its own facts.
const spotSchema = z.strictObject({
  name: text,
  sub: text.optional(),
  place: guidePlaceSchema.optional(),
  chips: z.array(chipSchema).optional(),
});

const stepSchema = z.strictObject({
  // The words of its tab in the bottom panel.
  tab: text,
  title: text,
  // 선택: a step the User may leave out.
  optional: z.boolean().optional(),
  // Paragraphs over the step.
  about: z.array(text).optional(),
  place: guidePlaceSchema.optional(),
  // The place's name and its line under it. The name is also the pin's label.
  name: text.optional(),
  sub: text.optional(),
  // A guide of places side by side shows the name in its bubble only with this.
  showName: z.boolean().optional(),
  // What the pin holds in place of the step's number, such as 🍚.
  pinText: text.optional(),
  // The large link button of a step that is done on a site.
  link: z.strictObject({ words: text, url }).optional(),
  rows: z.array(rowSchema).optional(),
  chips: z.array(chipSchema).optional(),
  actions: z.array(actionSchema).optional(),
  spots: z.array(spotSchema).optional(),
});

// One kind to choose before the steps, such as 일반 학생증 or 금융 학생증.
const kindSchema = z.strictObject({
  key: text,
  // The chip in the bar, which chooses again.
  label: text,
  icon: iconSchema,
  title: text,
  // The places on the way, in order, under the title.
  route: z.array(text).min(1),
  steps: z.array(stepSchema).min(1),
});

export const guideSchema = z
  .strictObject({
    // Its steps are places side by side, any of which completes the quest: no numbers, ✓ 완료 on every step.
    together: z.boolean().optional(),
    // Paragraphs over every step.
    about: z.array(text).optional(),
    // The map fits the guide's places without the User's position (관악산).
    withoutUser: z.boolean().optional(),
    steps: z.array(stepSchema).min(1).optional(),
    kinds: z.array(kindSchema).min(2).optional(),
  })
  .refine(({ steps, kinds }) => (steps === undefined) !== (kinds === undefined), 'Expected `steps` or `kinds`');

export type TutorialGuide = z.infer<typeof guideSchema>;
type GuideStep = z.infer<typeof stepSchema>;

function withoutAsk(step: GuideStep): GuideStep {
  return step.actions === undefined ? step : { ...step, actions: step.actions.filter(({ kind }) => kind !== 'ask') };
}

// The guide as served while 관정 booking is off: no button asks the Assistant, which then cannot book.
export function guideWithoutAsk(guide: TutorialGuide): TutorialGuide {
  return {
    ...guide,
    ...(guide.steps === undefined ? {} : { steps: guide.steps.map(withoutAsk) }),
    ...(guide.kinds === undefined
      ? {}
      : { kinds: guide.kinds.map((kind) => ({ ...kind, steps: kind.steps.map(withoutAsk) })) }),
  };
}

// Every place a guide names, for the content's check against the seed.
export function guidePlaces(guide: TutorialGuide): z.infer<typeof guidePlaceSchema>[] {
  const steps = [...(guide.steps ?? []), ...(guide.kinds ?? []).flatMap(({ steps: kindSteps }) => kindSteps)];
  const places: z.infer<typeof guidePlaceSchema>[] = [];
  for (const { place, spots } of steps) {
    if (place !== undefined) {
      places.push(place);
    }
    for (const spot of spots ?? []) {
      if (spot.place !== undefined) {
        places.push(spot.place);
      }
    }
  }
  return places;
}
