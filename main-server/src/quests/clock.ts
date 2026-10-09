// AI-generated with Claude Opus 5.5, 2026-10-06, prompted by fyoon46, reviewed by TaeHyun79 in #41 #44
// The time by which a Sub Quest is ended and a Meetup expires. A test replaces `now` to move it:
// `vi.spyOn(app.get(CLOCK), 'now')`.
export const CLOCK = 'CLOCK';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
