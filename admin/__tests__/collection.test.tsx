import { screen } from '@testing-library/react';

import { fakeMainServer } from './support/fake-main-server';
import { openCollection, rowsOf, signInAs } from './support/pages';

it('lists each Source with its last Collection and last failure in Seoul time, marking the broken ones', async () => {
  fakeMainServer.hasAdministrators('kim@snu.ac.kr');
  signInAs('kim@snu.ac.kr');
  fakeMainServer.hasCollectionStatuses(
    {
      source: 'coop_menus',
      lastSucceededAt: '2026-10-06T01:00:00.000Z',
      lastFailedAt: '2026-10-05T01:00:00.000Z',
      lastFailureReason: 'timeout',
    },
    {
      source: 'snu_events',
      lastSucceededAt: '2026-10-05T15:30:00.000Z',
      lastFailedAt: '2026-10-06T03:00:00.000Z',
      lastFailureReason: 'The page has no list of events',
    },
    { source: 'shuttle_vehicles', lastSucceededAt: null, lastFailedAt: null, lastFailureReason: null },
  );

  await openCollection();

  expect(screen.getByRole('heading', { level: 1, name: 'Collection status' })).toBeVisible();
  expect(rowsOf('Sources')).toEqual([
    ['Co-op menus', 'Working', '2026-10-06 10:00', '2026-10-05 10:00 · timeout'],
    [
      'SNU events list',
      'Failed since the last success',
      '2026-10-06 00:30',
      '2026-10-06 12:00 · The page has no list of events',
    ],
    ['Shuttle vehicles', 'Never collected', '—', '—'],
  ]);
});
