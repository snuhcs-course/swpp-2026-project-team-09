import { screen } from '@testing-library/react';

import { fakeMainServer } from './support/fake-main-server';
import { click, COLLECTED, opened, signedInWithPlaces, type } from './support/events';

let token: string;

beforeEach(() => {
  token = signedInWithPlaces();
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('a change the main server refuses', () => {
  it('shows a 400 with the main server’s message', async () => {
    await opened(COLLECTED);

    type('Latitude', '37.6');
    click('Save');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'The main server did not accept the change: latitude: The position must be inside the Campus Boundary',
    );
  });

  it('shows what a published event would be missing', async () => {
    await opened({ ...COLLECTED, state: 'published' });

    click('Clear the position');
    click('Save');

    expect(await screen.findByRole('alert')).toHaveTextContent('A published event needs a position.');
  });

  it('shows the event’s current state when another Administrator changed it', async () => {
    const event = await opened(COLLECTED);
    await fakeMainServer.changeGlobalEventState(token, event.id, 'discard', 1);

    click('Publish');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'This event is discarded now, so this change cannot be made.',
    );
  });
});

describe('a change after another Administrator’s', () => {
  it('warns that another Administrator changed the event, keeps the input and loads the current version', async () => {
    const event = await opened(COLLECTED);
    await fakeMainServer.editGlobalEvent(token, event.id, 1, {
      title: '다른 관리자가 고친 제목',
      description: COLLECTED.description ?? '',
      startsAt: COLLECTED.startsAt ?? null,
      endsAt: COLLECTED.endsAt ?? null,
      place: COLLECTED.place ?? null,
      latitude: COLLECTED.latitude ?? null,
      longitude: COLLECTED.longitude ?? null,
    });

    type('Title', '내가 고친 제목');
    click('Save');

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Another Administrator changed this event after you opened it.',
    );
    expect(screen.getByLabelText('Title')).toHaveValue('내가 고친 제목');
    expect(fakeMainServer.storedEvent(event.id)?.title).toBe('다른 관리자가 고친 제목');

    click('Load the current version');

    await vi.waitFor(() => {
      expect(screen.getByLabelText('Title')).toHaveValue('다른 관리자가 고친 제목');
    });
    expect(screen.queryByRole('alert')).toBeNull();
  });
});
