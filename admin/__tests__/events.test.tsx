// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { screen } from '@testing-library/react';

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
      },
    );

    await openEvents();

    expect(rowsOf('Published')).toEqual([['관악 축제', '2026-10-20 12:00', '종합운동장']]);
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

describe('the home page without a session', () => {
  it('sends the person to sign-in and back to the home page', async () => {
    browser.cookies.clear();

    await openEvents();

    expect(browser.location).toBe('/sign-in?next=%2F');
  });
});
