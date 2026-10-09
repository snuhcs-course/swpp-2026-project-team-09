/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react';

import { fakeMainServer } from './support/fake-main-server';
import { click, COLLECTED, opened, signedInWithPlaces, type } from './support/events';

beforeEach(() => {
  signedInWithPlaces();
});

describe('saving', () => {
  it('saves the form with the version the page loaded and shows the saved event', async () => {
    const event = await opened(COLLECTED);

    type('Title', '지능형통신 연합전공 설명회');
    type('Start time', '19:00');
    type('End time', '');
    type('End day', '');
    click('Save');

    expect(await screen.findByRole('heading', { level: 1, name: '지능형통신 연합전공 설명회' })).toBeVisible();
    expect(fakeMainServer.storedEvent(event.id)).toMatchObject({
      title: '지능형통신 연합전공 설명회',
      startsAt: '2026-10-12T19:00:00+09:00',
      endsAt: null,
      version: 2,
      state: 'draft',
    });
    expect(screen.getByLabelText('Start time')).toHaveValue('19:00');
  });

  it('says on a published event that Users see a saved change at once', async () => {
    const event = await opened({ ...COLLECTED, state: 'published' });

    expect(screen.getByText('Users see a saved change at once.')).toBeVisible();
    type('Place name', '이충웅홀');
    click('Save');

    await vi.waitFor(() => {
      expect(fakeMainServer.storedEvent(event.id)).toMatchObject({ place: '이충웅홀', version: 2, state: 'published' });
    });
  });
});

describe('publishing', () => {
  it('saves a Draft and then publishes it once the person confirms', async () => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const event = await opened(COLLECTED);

    type('Title', '연합전공 설명회');
    click('Publish');

    expect(window.confirm).toHaveBeenCalledWith('Publish this event? Users see it on their map at once.');
    expect(await screen.findByText('Published')).toBeVisible();
    expect(fakeMainServer.storedEvent(event.id)).toMatchObject({
      title: '연합전공 설명회',
      state: 'published',
      version: 3,
    });
  });
});

describe('discarding and cancelling', () => {
  beforeEach(() => {
    vi.spyOn(window, 'confirm').mockReturnValue(true);
  });

  it('discards a Draft once the person confirms, and shows it without the controls', async () => {
    const event = await opened(COLLECTED);

    click('Discard');

    expect(window.confirm).toHaveBeenCalledWith('Discard this Draft? It will never be published.');
    expect(await screen.findByText('Discarded')).toBeVisible();
    expect(fakeMainServer.storedEvent(event.id)).toMatchObject({ state: 'discarded', version: 2 });
    expect(screen.queryByRole('button', { name: /Save|Publish|Discard|Cancel/u })).toBeNull();
    expect(screen.queryByRole('textbox')).toBeNull();
  });

  it('sends nothing when the person does not confirm', async () => {
    vi.mocked(window.confirm).mockReturnValue(false);
    const event = await opened(COLLECTED);

    click('Discard');

    expect(fakeMainServer.requests).not.toContain(`POST /admin/global-events/${event.id}/discard`);
  });

  it('cancels a published event once the person confirms, and shows it without the controls', async () => {
    const event = await opened({ ...COLLECTED, state: 'published' });

    click('Cancel the event');

    expect(window.confirm).toHaveBeenCalledWith(
      'Cancel this event? Users and the Holders of its Quests will see it cancelled. This cannot be undone.',
    );
    expect(await screen.findByText('Cancelled')).toBeVisible();
    expect(fakeMainServer.storedEvent(event.id)).toMatchObject({ state: 'cancelled', version: 2 });
    expect(screen.queryByRole('button', { name: /Save|Publish|Discard|Cancel/u })).toBeNull();
    expect(screen.getByText('2026-10-12 18:30')).toBeVisible();
  });
});
