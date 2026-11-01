/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { screen, within } from '@testing-library/react';

import { fakeMainServer } from './support/fake-main-server';
import { openCollection, rowsOf, signInAs } from './support/pages';

beforeEach(() => {
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
  signInAs('kim@snu.ac.kr');
});

it('lists each Source with its last Collection and last failure in Seoul time, marking the broken ones', async () => {
  fakeMainServer.hasCollectionStatuses(
    {
      source: 'coop_menus',
      lastSucceededAt: '2026-10-06T01:00:00.000Z',
      lastFailedAt: '2026-10-05T01:00:00.000Z',
      lastFailureReason: 'timeout',
      lastSkippedPosts: null,
    },
    {
      source: 'snu_events',
      lastSucceededAt: '2026-10-05T15:30:00.000Z',
      lastFailedAt: '2026-10-06T03:00:00.000Z',
      lastFailureReason: 'The page has no list of events',
      lastSkippedPosts: null,
    },
    {
      source: 'extra_snu',
      lastSucceededAt: '2026-10-06T06:00:00.000Z',
      lastFailedAt: null,
      lastFailureReason: null,
      lastSkippedPosts: 2,
    },
    {
      source: 'shuttle_vehicles',
      lastSucceededAt: null,
      lastFailedAt: null,
      lastFailureReason: null,
      lastSkippedPosts: null,
    },
  );

  await openCollection();

  expect(screen.getByRole('heading', { level: 1, name: 'Collection status' })).toBeVisible();
  expect(rowsOf('Sources')).toEqual([
    ['Co-op menus', 'Working', '2026-10-06 10:00', '2026-10-05 10:00 · timeout', '—'],
    [
      'SNU events list',
      'Failed since the last success',
      '2026-10-06 00:30',
      '2026-10-06 12:00 · The page has no list of events',
      '—',
    ],
    ['extra.snu programmes', 'Working', '2026-10-06 15:00', '—', '2'],
    ['Shuttle vehicles', 'Never collected', '—', '—', '—'],
  ]);
});

const POST = {
  source: 'snu_events',
  key: '178226',
  address: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=178226',
  stepFinished: false,
  stepFailure: null,
  stepFailedAt: null,
  judgementFailure: null,
  judgementAttempts: 0,
  drafts: [],
};

describe('the unsettled posts', () => {
  it('lists a post the step failed on, one it has not finished and one whose Judgement could not be made', async () => {
    const draft = crypto.randomUUID();
    fakeMainServer.hasUnsettledPosts(
      { ...POST, stepFailure: 'PrismaClientKnownRequestError', stepFailedAt: '2026-11-01T01:00:00.000Z' },
      { ...POST, key: '178227' },
      {
        ...POST,
        source: 'extra_snu',
        key: '4411',
        stepFinished: true,
        judgementFailure: 'APICallError: HTTP 402',
        judgementAttempts: 2,
        drafts: [{ id: draft, title: '창업 특강' }],
      },
    );

    await openCollection();

    expect(rowsOf('Unsettled posts')).toEqual([
      ['SNU events list · Post 178226', 'Failed 2026-11-01 10:00 · PrismaClientKnownRequestError', '—', '—'],
      ['SNU events list · Post 178227', 'Not finished', '—', '—'],
      ['extra.snu programmes · Post 4411', 'Finished', 'Tries used: 2 of 2 · APICallError: HTTP 402', '창업 특강'],
    ]);
    expect(screen.getByRole('link', { name: 'Post 178226' })).toHaveAttribute('href', POST.address);
    const table = within(screen.getByRole('table', { name: 'Unsettled posts' }));
    expect(table.getByRole('link', { name: '창업 특강' })).toHaveAttribute('href', `/events/${draft}`);
  });
});

describe('the unsettled posts, at their edges', () => {
  it('shows a Source it does not know as the main server names it', async () => {
    fakeMainServer.hasUnsettledPosts({ ...POST, source: 'a_later_source' });

    await openCollection();

    expect(rowsOf('Unsettled posts')[0]?.[0]).toBe('a_later_source · Post 178226');
  });

  it('says when every post is settled', async () => {
    await openCollection();

    expect(screen.queryByRole('table', { name: 'Unsettled posts' })).toBeNull();
    expect(screen.getByText('Every post is settled.')).toBeVisible();
  });
});
