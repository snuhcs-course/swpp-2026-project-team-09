/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { fireEvent, screen, waitFor, within } from '@testing-library/react';

import type { LinkedSession, QueuedSession } from '@/main-server';

import { COLLECTED, opened, signedInWithPlaces } from './support/events';
import { fakeMainServer } from './support/fake-main-server';
import { openQueue } from './support/pages';

const QUEUED: QueuedSession = {
  sessionId: 'session-1',
  number: 1,
  heldFor: 'ai_unsure',
  reason: '제목이 비슷하지만 확실하지 않습니다',
  source: 'snu_events',
  key: '178000',
  address: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=178000',
  draft: {
    id: 'draft-1',
    version: 1,
    title: '새 특강',
    startsAt: '2027-03-10T05:00:00.000Z',
    place: '관정관',
    missing: [],
  },
  candidates: [
    { id: 'event-1', title: '비슷한 특강', startsAt: '2027-03-10T05:00:00.000Z', place: '관정관', state: 'published' },
    { id: 'event-2', title: '취소된 특강', startsAt: '2027-03-10T05:00:00.000Z', place: null, state: 'cancelled' },
  ],
};

const OWN: LinkedSession = {
  sessionId: 'own',
  number: 1,
  source: 'extra_snu',
  key: 'PGM012',
  address: 'https://extra.snu.ac.kr/ptfol/pgm/view.do?dataSeq=PGM012',
  attachedBy: 'own',
  reason: null,
  detachable: false,
};

const ATTACHED: LinkedSession = {
  sessionId: 'attached',
  number: 2,
  source: 'snu_events',
  key: '178000',
  address: 'https://www.snu.ac.kr/snunow/events?md=v&bbsidx=178000',
  attachedBy: 'ai',
  reason: '같은 행사입니다',
  detachable: true,
};

beforeEach(() => {
  signedInWithPlaces();
});

const button = (name: string | RegExp): HTMLElement => screen.getByRole('button', { name });

describe('the queue page', () => {
  it('shows each session with why it waits, what the AI said and its candidates', async () => {
    fakeMainServer.sameEvent.hasQueued(QUEUED);

    await openQueue();

    const card = within(screen.getByRole('listitem', { name: '새 특강' }));
    expect(card.getByRole('link', { name: '새 특강' })).toHaveAttribute('href', '/events/draft-1');
    expect(card.getByRole('link', { name: 'SNU Now 178000, session 1' })).toHaveAttribute('href', QUEUED.address);
    expect(card.getByText('The AI is unsure.')).toBeVisible();
    expect(card.getByText('제목이 비슷하지만 확실하지 않습니다')).toBeVisible();
    expect(card.getByRole('link', { name: '비슷한 특강' })).toHaveAttribute('href', '/events/event-1');
    expect(card.getByText(/Cancelled/u)).toBeVisible();
  });

  it('says so when nothing waits, or a session has no candidate left', async () => {
    await openQueue();
    expect(screen.getByText('No session is waiting.')).toBeVisible();

    fakeMainServer.sameEvent.hasQueued({ ...QUEUED, candidates: [] });
    await openQueue();
    expect(screen.getByText('No event is a candidate now.')).toBeVisible();
  });
});

describe('deciding a queued session', () => {
  it('attaches a session to the candidate chosen', async () => {
    fakeMainServer.sameEvent.hasQueued(QUEUED);
    await openQueue();

    fireEvent.click(button('Attach to 비슷한 특강'));

    await waitFor(() => {
      expect(fakeMainServer.requests).toContain('POST /admin/global-events/queue/session-1/attach event-1');
    });
  });

  it('publishes a session as its own event', async () => {
    fakeMainServer.sameEvent.hasQueued(QUEUED);
    await openQueue();

    fireEvent.click(button('Publish as its own event'));

    await waitFor(() => {
      expect(fakeMainServer.requests).toContain('POST /admin/global-events/queue/session-1/publish');
    });
  });

  it('says what a Draft still needs when publishing is refused, and keeps it in the queue with a link to its page', async () => {
    fakeMainServer.sameEvent.hasQueued({
      ...QUEUED,
      draft: { ...QUEUED.draft, startsAt: null, missing: ['startsAt', 'position'] },
    });
    await openQueue();

    fireEvent.click(button('Publish as its own event'));

    expect(await screen.findByRole('alert')).toHaveTextContent(/Fill them in on its page/u);
    expect(screen.getByRole('link', { name: '새 특강' })).toHaveAttribute('href', '/events/draft-1');
  });

  it('says so when another Administrator decided first', async () => {
    fakeMainServer.sameEvent.hasQueued(QUEUED);
    await openQueue();
    await fakeMainServer.publishQueuedSession(fakeMainServer.signedInAs('kim@snu.ac.kr'), 'session-1', 1);

    fireEvent.click(button('Publish as its own event'));

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another Administrator has decided this session already.',
    );
  });
});

describe('the Source Posts of an event', () => {
  it('lists each with its Source, link, how it was attached and its reason, and only an attached one detaches', async () => {
    const stored = fakeMainServer.hasGlobalEvents(COLLECTED)[0];
    fakeMainServer.sameEvent.hasLinked(stored.id, OWN, ATTACHED);

    await opened(stored);

    const panel = within(screen.getByRole('region', { name: 'Source Posts' }));
    expect(panel.getByRole('link', { name: 'extra.snu PGM012, session 1' })).toHaveAttribute('href', OWN.address);
    expect(panel.getByText('Its own post')).toBeVisible();
    expect(panel.getByText('By the AI')).toBeVisible();
    expect(panel.getByText('같은 행사입니다')).toBeVisible();
    expect(panel.getAllByRole('button', { name: 'Detach' })).toHaveLength(1);
  });

  it('shows no panel for an event an Administrator made', async () => {
    await opened(COLLECTED);

    expect(screen.queryByRole('region', { name: 'Source Posts' })).not.toBeInTheDocument();
  });

  it('detaches after the person confirms, and not before', async () => {
    const stored = fakeMainServer.hasGlobalEvents(COLLECTED)[0];
    fakeMainServer.sameEvent.hasLinked(stored.id, ATTACHED);
    await opened(stored);
    const confirm = vi.spyOn(window, 'confirm').mockReturnValueOnce(false).mockReturnValueOnce(true);

    fireEvent.click(button('Detach'));
    expect(fakeMainServer.requests).not.toContain('POST /admin/global-events/sessions/attached/detach');

    fireEvent.click(button('Detach'));

    await waitFor(() => {
      expect(fakeMainServer.requests).toContain('POST /admin/global-events/sessions/attached/detach');
    });
    expect(confirm).toHaveBeenCalledTimes(2);
  });
});

describe('the flag', () => {
  it('can be taken off from the event page', async () => {
    const event = await opened({ ...COLLECTED, needsAdministrator: true });

    fireEvent.click(button('Mark as looked at'));

    await waitFor(() => {
      expect(fakeMainServer.storedEvent(event.id)?.needsAdministrator).toBe(false);
    });
  });
});
