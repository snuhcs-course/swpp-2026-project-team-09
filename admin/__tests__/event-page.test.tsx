/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { screen, within } from '@testing-library/react';

import { browser } from './support/browser';
import { openEvent } from './support/pages';
import { COLLECTED, opened, signedInWithPlaces, type } from './support/events';

beforeEach(() => {
  signedInWithPlaces();
});

describe('the event’s page', () => {
  it('shows a collected event’s state, its source link, its post number and its text as stored', async () => {
    await opened(COLLECTED);

    const source = screen.getByRole('region', { name: 'Source' });
    expect(screen.getByText('Draft')).toBeVisible();
    const link = within(source).getByRole('link', { name: 'Open the post on the events list' });
    expect(link).toHaveAttribute('href', 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=176525');
    expect(link).toHaveAttribute('target', '_blank');
    expect(within(source).getByText('Post number 176525')).toBeVisible();
    expect(within(source).getByText(/일시: 2026\. 10\. 12\.\(월\) 18:30\s+장소:/u)).toBeVisible();
  });

  it('says that an event made by hand has no source post', async () => {
    await opened({ title: '동아리 공연', description: '주최 측이 보낸 안내' });

    const source = screen.getByRole('region', { name: 'Source' });
    expect(within(source).queryByRole('link')).toBeNull();
    expect(within(source).getByText('Entered by hand, without a source post.')).toBeVisible();
    expect(within(source).getByText('주최 측이 보낸 안내')).toBeVisible();
  });

  it('shows Next.js’s not-found page for an unknown event', async () => {
    await openEvent(crypto.randomUUID());

    expect(browser.notFound).toBe(true);
  });
});

describe('the form of the event’s page', () => {
  it('fills the form with the event, its times in Seoul whatever the time zone', async () => {
    expect(new Date('2026-10-12T09:30:00.000Z').getHours()).not.toBe(18);

    await opened(COLLECTED);

    expect(screen.getByLabelText('Title')).toHaveValue(COLLECTED.title);
    expect(screen.getByLabelText('Description')).toHaveValue(COLLECTED.description);
    expect(screen.getByLabelText('Start day')).toHaveValue('2026-10-12');
    expect(screen.getByLabelText('Start time')).toHaveValue('18:30');
    expect(screen.getByLabelText('End day')).toHaveValue('2026-10-12');
    expect(screen.getByLabelText('End time')).toHaveValue('20:00');
    expect(screen.getByLabelText('Place name')).toHaveValue(COLLECTED.place);
    expect(screen.getByLabelText('Latitude')).toHaveValue(37.45487);
    expect(screen.getByLabelText('Longitude')).toHaveValue(126.95407);
  });

  it('marks a start at 00:00 as possibly a day without its time', async () => {
    await opened({ ...COLLECTED, startsAt: '2026-10-11T15:00:00.000Z', endsAt: null });

    expect(screen.getByText(/A collected start at 00:00 is often a day read without its time/u)).toBeVisible();
    type('Start time', '14:00');
    expect(screen.queryByText(/A collected start at 00:00/u)).toBeNull();
  });
});
