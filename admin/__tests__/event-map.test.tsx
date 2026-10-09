/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { screen } from '@testing-library/react';

import { fakeMainServer } from './support/fake-main-server';
import { pointOnMap } from './support/fake-maps';
import { click, COLLECTED, opened, signedInWithPlaces, type } from './support/events';

beforeEach(() => {
  vi.stubEnv('NEXT_PUBLIC_KAKAO_JAVASCRIPT_KEY', 'test-kakao-key');
  signedInWithPlaces();
});

describe('the position on the map', () => {
  it('shows the event’s position as the marker', async () => {
    await opened(COLLECTED);

    expect(screen.getByText('Marker at 37.45487, 126.95407')).toBeVisible();
    expect(screen.queryByLabelText('Latitude')).toBeNull();
  });

  it('sets the position where the map is pointed at, leaving the place name, and saves it', async () => {
    const event = await opened(COLLECTED);

    pointOnMap({ latitude: 37.459_431_234_5, longitude: 126.951_842_987_6 });

    expect(screen.getByText('Marker at 37.459431, 126.951843')).toBeVisible();
    expect(screen.getByLabelText('Place name')).toHaveValue(COLLECTED.place);
    click('Save');
    await vi.waitFor(() => {
      expect(fakeMainServer.storedEvent(event.id)).toMatchObject({ latitude: 37.459431, longitude: 126.951843 });
    });
  });

  it('moves the marker to a chosen Place, and removes it when the position is cleared', async () => {
    await opened({ ...COLLECTED, latitude: null, longitude: null });
    expect(screen.getByText('No marker')).toBeVisible();

    type('Find a Place', '301');
    click('301 제1공학관');
    expect(screen.getByText('Marker at 37.45016, 126.95259')).toBeVisible();

    click('Clear the position');
    expect(screen.getByText('No marker')).toBeVisible();
  });

  it('shows the main server’s message for a position outside the Campus Boundary', async () => {
    await opened(COLLECTED);

    pointOnMap({ latitude: 37.5665, longitude: 126.978 });
    click('Save');

    expect(await screen.findByRole('alert')).toHaveTextContent('The position must be inside the Campus Boundary');
  });
});
