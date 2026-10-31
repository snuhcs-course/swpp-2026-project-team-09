/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type BoundFunctions, type queries, screen, within } from '@testing-library/react';

import type { JudgedSession, Judgement } from '@/main-server';

import { click, COLLECTED, opened, signedInWithPlaces } from './support/events';
import { fakeMainServer } from './support/fake-main-server';
import { openEvent } from './support/pages';

const SESSION: JudgedSession = {
  start: '2026-10-12T18:30',
  end: '2026-10-12T20:00',
  place: '제1공학관 117호',
  overPeriod: false,
  lines: {
    start: ['일시: 10월 12일(월) 18:30~20:00'],
    end: ['일시: 10월 12일(월) 18:30~20:00'],
    place: ['장소: 301동 117호'],
  },
  placeId: null,
  checks: [
    { name: 'announcesEvent', passed: true },
    { name: 'timeAgrees', passed: true },
  ],
  passed: true,
  globalEventId: null,
};

const JUDGED: Judgement = {
  outcome: 'judged',
  failure: null,
  attempts: 1,
  announcesEvent: true,
  sessions: [SESSION],
  modelId: 'anthropic/claude-haiku-5-5',
  judgedAt: '2026-11-01T03:00:00.000Z',
};

const panel = (): BoundFunctions<typeof queries> => within(screen.getByRole('region', { name: 'Judgement' }));
const sessionPanel = (number: number): BoundFunctions<typeof queries> =>
  within(panel().getByRole('region', { name: `Session ${number}` }));
const checksOf = (number: number): (string | null)[] =>
  within(panel().getByRole('list', { name: `Checks of session ${number}` }))
    .getAllByRole('listitem')
    .map((item) => item.textContent);

beforeEach(() => {
  signedInWithPlaces();
});

describe('a Judgement with an answer', () => {
  it('shows each session’s values, their lines, its checks, the model and the time in Seoul', async () => {
    await opened({ ...COLLECTED, judgement: JUDGED });

    expect(panel().getByText('The AI read 1 session(s) in this post, and 1 passed every check.')).toBeVisible();
    expect(panel().getByText('Model anthropic/claude-haiku-5-5 · 2026-11-01 12:00')).toBeVisible();
    const session = sessionPanel(1);
    expect(session.getByText('2026-10-12T18:30')).toBeVisible();
    expect(session.getByText('2026-10-12T20:00')).toBeVisible();
    expect(session.getByText('제1공학관 117호')).toBeVisible();
    expect(session.getAllByText('일시: 10월 12일(월) 18:30~20:00')).toHaveLength(2);
    expect(session.getByText('장소: 301동 117호')).toBeVisible();
    expect(session.getByText('Passed')).toBeVisible();
    expect(checksOf(1)).toEqual(['announcesEvent: passed', 'timeAgrees: passed']);
  });

  it('names the Place the session matched from the list of Places', async () => {
    const [place] = fakeMainServer.hasPlaces({
      number: '302',
      name: '제2공학관',
      latitude: 37.449,
      longitude: 126.952,
    });

    await opened({ ...COLLECTED, judgement: { ...JUDGED, sessions: [{ ...SESSION, placeId: place?.id ?? null }] } });

    expect(sessionPanel(1).getByText('302 제2공학관')).toBeVisible();
  });
});

describe('what a Judgement holds that the site cannot foresee', () => {
  it('shows a check it does not know as the main server names it, passed or failed', async () => {
    await opened({
      ...COLLECTED,
      judgement: {
        ...JUDGED,
        sessions: [
          {
            ...SESSION,
            passed: false,
            checks: [
              { name: 'aLaterCheck', passed: false },
              { name: 'aLaterCheck', passed: true },
            ],
          },
        ],
      },
    });

    expect(checksOf(1)).toEqual(['aLaterCheck: failed', 'aLaterCheck: passed']);
    expect(sessionPanel(1).getByText('Failed')).toBeVisible();
  });

  it('shows a time the checks could not read as the AI wrote it, and an empty value as a dash', async () => {
    await opened({
      ...COLLECTED,
      judgement: { ...JUDGED, sessions: [{ ...SESSION, start: '다음 주 화요일', end: null, passed: false }] },
    });

    expect(sessionPanel(1).getByText('다음 주 화요일')).toBeVisible();
    expect(sessionPanel(1).getAllByText('—').length).toBeGreaterThan(0);
  });
});

describe('which session of the post this event is', () => {
  it('marks the session of this event, and links the session of another event', async () => {
    const [other] = fakeMainServer.hasGlobalEvents({ title: '2회차', state: 'published' });
    const [event] = fakeMainServer.hasGlobalEvents({ ...COLLECTED, state: 'published', publicationRoute: 'judgement' });
    if (event === undefined || other === undefined) {
      throw new Error('No event was stored.');
    }
    const judgement = {
      ...JUDGED,
      sessions: [
        { ...SESSION, globalEventId: other.id },
        { ...SESSION, globalEventId: event.id },
        { ...SESSION, globalEventId: null, passed: false },
      ],
    };
    fakeMainServer.storedEvents().splice(1, 1, { ...event, judgement });

    await openEvent(event.id);

    expect(sessionPanel(1).getByRole('link', { name: 'Another event' })).toHaveAttribute('href', `/events/${other.id}`);
    expect(sessionPanel(1).queryByText('This event')).toBeNull();
    expect(sessionPanel(2).getByText('This event')).toBeVisible();
    expect(sessionPanel(3).getByText('No event')).toBeVisible();
  });
});

describe('a Draft whose sessions failed', () => {
  it('keeps a Draft whose sessions failed publishable by hand, beside its post', async () => {
    await opened({
      ...COLLECTED,
      judgement: {
        ...JUDGED,
        sessions: [{ ...SESSION, passed: false, checks: [{ name: 'placeMatches', passed: false }] }],
      },
    });

    expect(panel().getByText('The AI read 1 session(s) in this post, and 0 passed every check.')).toBeVisible();
    expect(checksOf(1)).toEqual(['placeMatches: failed']);
    expect(screen.getByRole('region', { name: 'Source' })).toBeVisible();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
  });
});

describe('a post called no event', () => {
  it('says a post was called no event, with the model and the time, and leaves it to publish or discard', async () => {
    await opened({
      ...COLLECTED,
      judgement: { ...JUDGED, outcome: 'no_event', announcesEvent: false, sessions: [] },
    });

    expect(panel().getByText(/The AI called this post no event/u)).toBeVisible();
    expect(panel().getByText('Model anthropic/claude-haiku-5-5 · 2026-11-01 12:00')).toBeVisible();
    expect(panel().queryByRole('region')).toBeNull();
    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Discard' })).toBeEnabled();
  });

  it('claims nothing about the form on an event that has none', async () => {
    await opened({
      ...COLLECTED,
      state: 'discarded',
      judgement: { ...JUDGED, outcome: 'no_event', announcesEvent: false, sessions: [] },
    });

    expect(panel().getByText('The AI called this post no event, so the Judgement publishes nothing.')).toBeVisible();
    expect(screen.queryByRole('button', { name: 'Publish' })).toBeNull();
  });

  it('shows what the AI read of a post it called no event', async () => {
    await opened({
      ...COLLECTED,
      judgement: {
        ...JUDGED,
        outcome: 'no_event',
        announcesEvent: false,
        sessions: [{ ...SESSION, passed: false, checks: [{ name: 'announcesEvent', passed: false }] }],
      },
    });

    expect(sessionPanel(1).getByText('2026-10-12T18:30')).toBeVisible();
    expect(checksOf(1)).toEqual(['announcesEvent: failed']);
  });
});

describe('a Judgement without an answer', () => {
  it.each([
    [1, /A try is left for the next Collection of its Source/u],
    [2, /It will not be tried again/u],
  ])('says why a Judgement could not be made, at try %i', async (attempts, next) => {
    await opened({
      ...COLLECTED,
      judgement: {
        ...JUDGED,
        outcome: 'failed',
        failure: 'APICallError: HTTP 402',
        attempts,
        announcesEvent: null,
        sessions: [],
        modelId: null,
      },
    });

    expect(panel().getByText(new RegExp(`APICallError: HTTP 402\\. Try ${attempts} of 2`, 'u'))).toBeVisible();
    expect(panel().getByText(next)).toBeVisible();
    expect(panel().queryByRole('region')).toBeNull();
    expect(panel().getByText('Model — · 2026-11-01 12:00')).toBeVisible();
  });

  it('says a try is running, without the time of the try before it', async () => {
    await opened({
      ...COLLECTED,
      judgement: { ...JUDGED, outcome: null, attempts: 2, announcesEvent: null, sessions: [], modelId: null },
    });

    expect(panel().getByText(/No answer yet: try 2 of 2 is running/u)).toBeVisible();
    expect(panel().queryByText(/Model/u)).toBeNull();
    expect(panel().queryByText(/2026-11-01/u)).toBeNull();
  });

  it('shows no panel for an event without a Judgement', async () => {
    await opened(COLLECTED);

    expect(screen.queryByRole('region', { name: 'Judgement' })).toBeNull();
  });
});

describe('the way back from the event’s page', () => {
  it.each([
    [{ route: 'judgement' }, '/?route=judgement'],
    [{}, '/'],
    [{ route: 'constructor' }, '/'],
  ])('with %j goes to %s', async (query, href) => {
    const [event] = fakeMainServer.hasGlobalEvents(COLLECTED);

    await openEvent(event?.id ?? '', query);

    expect(screen.getByRole('link', { name: '← Events' })).toHaveAttribute('href', href);
  });
});

describe('the event’s page, for its route and flag', () => {
  it('shows the Publication Route and the flag', async () => {
    await opened({ ...COLLECTED, state: 'published', publicationRoute: 'judgement', needsAdministrator: true });

    expect(screen.getByText('Publication Route: Judgement')).toBeVisible();
    expect(screen.getByText('Needs an Administrator')).toBeVisible();
  });

  it('shows neither on a Draft without the flag', async () => {
    await opened(COLLECTED);

    expect(screen.queryByText(/Publication Route/u)).toBeNull();
    expect(screen.queryByText('Needs an Administrator')).toBeNull();
  });

  it('cancels an event a Judgement published as any other, keeping its route and its Judgement', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const event = await opened({
      ...COLLECTED,
      state: 'published',
      publicationRoute: 'judgement',
      judgement: JUDGED,
    });

    click('Cancel the event');

    expect(await screen.findByText('Cancelled')).toBeVisible();
    expect(fakeMainServer.requests).toContain(`POST /admin/global-events/${event.id}/cancel`);
    expect(fakeMainServer.storedEvent(event.id)).toMatchObject({ state: 'cancelled', publicationRoute: 'judgement' });
    expect(screen.getByText('Publication Route: Judgement')).toBeVisible();
    expect(screen.getByRole('region', { name: 'Judgement' })).toBeVisible();
  });
});
