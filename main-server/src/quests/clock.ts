// The time by which a Sub Quest is ended. A test replaces `now` to move it: `vi.spyOn(app.get(CLOCK), 'now')`.
export const CLOCK = 'CLOCK';

export interface Clock {
  now(): Date;
}

export const systemClock: Clock = { now: () => new Date() };
