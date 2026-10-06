import { screen } from '@testing-library/react';

import { browser } from './support/browser';
import { click, signedInWithPlaces, type } from './support/events';
import { fakeMainServer } from './support/fake-main-server';
import { openNewEvent } from './support/pages';

beforeEach(() => {
  signedInWithPlaces();
});

async function fillIn(): Promise<void> {
  await openNewEvent();
  type('Title', '동아리 공연');
  type('Description', '주최: 관악 밴드 동아리');
  type('Start day', '2026-10-20');
  type('Start time', '19:00');
  type('Find a Place', '62');
  click('62 중앙도서관');
}

describe('creating an event by hand', () => {
  it('creates a Draft from the form and opens its page', async () => {
    await fillIn();

    click('Create the Draft');

    await vi.waitFor(() => {
      expect(browser.location).toMatch(/^\/events\/[0-9a-f-]{36}$/u);
    });
    const [stored] = fakeMainServer.storedEvents();
    expect(browser.location).toBe(`/events/${stored?.id}`);
    expect(stored).toMatchObject({
      title: '동아리 공연',
      description: '주최: 관악 밴드 동아리',
      startsAt: '2026-10-20T19:00:00+09:00',
      place: '중앙도서관',
      latitude: 37.45943,
      state: 'draft',
    });
  });
});

describe('a retry', () => {
  it('sends the same key again on a retry of the same form, so that one Draft is created', async () => {
    fakeMainServer.breaksNextCreation('answer lost');
    await fillIn();

    click('Create the Draft');
    expect(await screen.findByRole('alert')).toHaveTextContent('try again');
    click('Create the Draft');

    await vi.waitFor(() => {
      expect(browser.location).toBeDefined();
    });
    const [first, second] = fakeMainServer.creationKeys;
    expect(second).toBe(first);
    expect(fakeMainServer.storedEvents()).toHaveLength(1);
  });

  it('makes a new key once the form changed after a failure', async () => {
    fakeMainServer.breaksNextCreation('fails');
    await fillIn();

    click('Create the Draft');
    await screen.findByRole('alert');
    type('Title', '관악 밴드 정기 공연');
    click('Create the Draft');

    await vi.waitFor(() => {
      expect(browser.location).toBeDefined();
    });
    const [first, second] = fakeMainServer.creationKeys;
    expect(second).not.toBe(first);
    expect(fakeMainServer.storedEvents()).toMatchObject([{ title: '관악 밴드 정기 공연' }]);
  });
});
