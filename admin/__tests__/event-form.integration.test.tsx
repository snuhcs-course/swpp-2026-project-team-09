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

describe('choosing a Place', () => {
  it('finds a Place by number and sets the place name and the position to it', async () => {
    await opened({ title: '특강' });

    type('Find a Place', '301');
    click('301 제1공학관');

    expect(screen.getByLabelText('Place name')).toHaveValue('제1공학관');
    expect(screen.getByLabelText('Latitude')).toHaveValue(37.45016);
    expect(screen.getByLabelText('Longitude')).toHaveValue(126.95259);
  });

  it('finds a Place by name, and the place name can then be edited', async () => {
    await opened({ title: '특강' });

    type('Find a Place', '도서관');
    expect(screen.queryByRole('button', { name: '301 제1공학관' })).toBeNull();
    click('62 중앙도서관');
    type('Place name', '중앙도서관 4층 세미나실');

    expect(screen.getByLabelText('Place name')).toHaveValue('중앙도서관 4층 세미나실');
    expect(screen.getByLabelText('Latitude')).toHaveValue(37.45943);
  });

  it('clears the position', async () => {
    await opened(COLLECTED);

    click('Clear the position');

    expect(screen.getByLabelText('Latitude')).toHaveValue(null);
    expect(screen.getByLabelText('Longitude')).toHaveValue(null);
  });
});

describe('the form’s messages before sending', () => {
  it('asks for a title and sends nothing without one', async () => {
    const event = await opened(COLLECTED);

    type('Title', '   ');
    click('Save');

    expect(screen.getByText('Enter a title.')).toBeVisible();
    expect(fakeMainServer.requests).not.toContain(`PATCH /admin/global-events/${event.id}`);
  });

  it('says that the end must come after the start', async () => {
    await opened(COLLECTED);

    type('End time', '18:30');

    expect(screen.getByText('The end must be after the start.')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  it('asks for both the day and the time', async () => {
    await opened(COLLECTED);

    type('Start time', '');

    expect(screen.getByText('Enter both the day and the time.')).toBeVisible();
  });
});

describe('the publish button', () => {
  it.each([
    ['a title', { title: '' }, 'To publish, add a title.'],
    ['a start', { startsAt: null, endsAt: null }, 'To publish, add a start.'],
    ['a position', { latitude: null, longitude: null }, 'To publish, add a position.'],
    [
      'a start and a position',
      { startsAt: null, endsAt: null, latitude: null },
      'To publish, add a start and a position.',
    ],
  ])('is disabled without %s and says so', async (_case, change, reason) => {
    await opened({ ...COLLECTED, ...change });

    expect(screen.getByRole('button', { name: 'Publish' })).toBeDisabled();
    expect(screen.getByText(reason)).toBeVisible();
  });

  it('is enabled once the form has a title, a start and a position', async () => {
    await opened({ ...COLLECTED, startsAt: null, endsAt: null, latitude: null, longitude: null });

    type('Start day', '2026-10-12');
    type('Start time', '18:30');
    type('Find a Place', '301');
    click('301 제1공학관');

    expect(screen.getByRole('button', { name: 'Publish' })).toBeEnabled();
    expect(screen.queryByText(/To publish, add/u)).toBeNull();
  });
});
