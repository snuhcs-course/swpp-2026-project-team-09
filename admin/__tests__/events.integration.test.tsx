/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { type BoundFunctions, type queries, screen, within } from '@testing-library/react';

import type { GlobalEvent } from '@/main-server';

import { browser } from './support/browser';
import { fakeMainServer } from './support/fake-main-server';
import { openEvents, rowsOf, signInAs } from './support/pages';

beforeEach(() => {
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
  signInAs('kim@snu.ac.kr');
});

describe('the home page', () => {
  it('lists the Drafts nearest start first, each with what it still needs', async () => {
    fakeMainServer.hasGlobalEvents(
      { title: '연합전공 설명회', place: '132동 103호', latitude: 37.45487, longitude: 126.95407 },
      {
        title: '학생회관 공연',
        startsAt: '2026-10-14T10:00:00.000Z',
        place: '학생회관',
      },
      {
        title: '도서관 특강',
        startsAt: '2026-10-12T09:30:00.000Z',
        latitude: 37.45943,
        longitude: 126.95184,
      },
    );

    await openEvents();

    expect(rowsOf('Drafts')).toEqual([
      ['도서관 특강', '2026-10-12 18:30', '', 'Nothing'],
      ['학생회관 공연', '2026-10-14 19:00', '학생회관', 'Position'],
      ['연합전공 설명회', '', '132동 103호', 'Start'],
    ]);
  });
});

describe('the home page’s marks and links', () => {
  it('lists the published events below the Drafts', async () => {
    fakeMainServer.hasGlobalEvents(
      { title: 'A Draft' },
      {
        title: '관악 축제',
        state: 'published',
        startsAt: '2026-10-20T03:00:00.000Z',
        place: '종합운동장',
        latitude: 37.4629,
        longitude: 126.9543,
        publicationRoute: 'rule',
      },
    );

    await openEvents();

    expect(rowsOf('Published')).toEqual([['관악 축제', '2026-10-20 12:00', '종합운동장', 'Rule']]);
  });

  it('marks a start at 00:00 in Seoul as possibly a day without its time', async () => {
    fakeMainServer.hasGlobalEvents(
      { title: '체육대회', startsAt: '2026-10-11T15:00:00.000Z' },
      { title: '특강', startsAt: '2026-10-12T00:00:00.000Z' },
    );

    await openEvents();

    expect(rowsOf('Drafts').map((row) => row[1])).toEqual([
      '2026-10-12 00:00 · time possibly missing',
      '2026-10-12 09:00',
    ]);
  });

  it('opens an event’s page from its title', async () => {
    const [event] = fakeMainServer.hasGlobalEvents({ title: '도서관 특강' });

    await openEvents();

    expect(screen.getByRole('link', { name: '도서관 특강' })).toHaveAttribute('href', `/events/${event?.id}`);
  });
});

const published = (title: string, publicationRoute: 'administrator' | 'rule' | 'judgement'): Partial<GlobalEvent> => ({
  title,
  state: 'published',
  startsAt: '2026-10-20T03:00:00.000Z',
  publicationRoute,
});

const titlesOf = (name: string): (string | null | undefined)[] => rowsOf(name).map((row) => row[0]);

const routeFilter = (): BoundFunctions<typeof queries> =>
  within(screen.getByRole('navigation', { name: 'Filter by Publication Route' }));

function hasOneEventOfEachRoute(): void {
  fakeMainServer.hasGlobalEvents(
    { title: 'A Draft' },
    published('Entered', 'administrator'),
    published('Judged', 'judgement'),
    published('Read', 'rule'),
  );
}

describe('the Publication Route column', () => {
  it('shows each published event’s route, and no such column on the Drafts', async () => {
    hasOneEventOfEachRoute();

    await openEvents();

    expect(rowsOf('Published').map((row) => row.at(-1))).toEqual(['Administrator', 'Judgement', 'Rule']);
    const drafts = within(screen.getByRole('table', { name: 'Drafts' }));
    expect(drafts.queryByRole('columnheader', { name: 'Publication Route' })).toBeNull();
  });
});

describe('the filter by Publication Route', () => {
  it('links each route, the current one marked', async () => {
    await openEvents();

    expect(routeFilter().getByRole('link', { name: 'All' })).toHaveAttribute('aria-current', 'true');
    expect(routeFilter().getByRole('link', { name: 'All' })).toHaveAttribute('href', '/');
    expect(routeFilter().getByRole('link', { name: 'Administrator' })).toHaveAttribute('href', '/?route=administrator');
    expect(routeFilter().getByRole('link', { name: 'Rule' })).toHaveAttribute('href', '/?route=rule');
    expect(routeFilter().getByRole('link', { name: 'Judgement' })).toHaveAttribute('href', '/?route=judgement');
  });

  it('filters the published events by the route in the address and leaves the Drafts', async () => {
    hasOneEventOfEachRoute();

    await openEvents({ route: 'judgement' });

    expect(titlesOf('Published')).toEqual(['Judged']);
    expect(titlesOf('Drafts')).toEqual(['A Draft']);
    expect(routeFilter().getByRole('link', { name: 'Judgement' })).toHaveAttribute('aria-current', 'true');
    expect(routeFilter().getByRole('link', { name: 'All' })).not.toHaveAttribute('aria-current');
  });

  it('says so when no published event has the route', async () => {
    fakeMainServer.hasGlobalEvents(published('Read', 'rule'));

    await openEvents({ route: 'judgement' });

    expect(screen.queryByRole('table', { name: 'Published' })).toBeNull();
    expect(screen.getByText('No published event still to come has the route Judgement.')).toBeVisible();
  });

  it('shows every published event for a route it does not know', async () => {
    hasOneEventOfEachRoute();

    await openEvents({ route: 'constructor' });

    expect(titlesOf('Published')).toEqual(['Entered', 'Judged', 'Read']);
  });
});

describe('the flag of the home page', () => {
  it('marks a Draft and a published event that an Administrator must look at, and only those', async () => {
    fakeMainServer.hasGlobalEvents(
      { title: 'Flagged Draft', needsAdministrator: true },
      { title: 'Plain Draft' },
      { title: 'Flagged event', state: 'published', needsAdministrator: true, publicationRoute: 'rule' },
      { title: 'Plain event', state: 'published', publicationRoute: 'rule' },
    );

    await openEvents();

    expect(rowsOf('Drafts').map((row) => row[0])).toEqual(['Flagged DraftNeeds an Administrator', 'Plain Draft']);
    expect(rowsOf('Published').map((row) => row[0])).toEqual(['Flagged eventNeeds an Administrator', 'Plain event']);
  });
});

describe('the home page without a session', () => {
  it('sends the person to sign-in and back to the home page', async () => {
    browser.cookies.clear();

    await openEvents();

    expect(browser.location).toBe('/sign-in?next=%2F');
  });
});
