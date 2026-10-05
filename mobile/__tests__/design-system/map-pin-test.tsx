import { render, screen } from '@testing-library/react-native';

import { MapPin } from '@/design-system/map-pin';

describe('MapPin', () => {
  it('shows its label and its count', async () => {
    await render(<MapPin count={3} kind="party" label="보드게임" />);

    expect(screen.getByText('보드게임')).toBeVisible();
    expect(screen.getByText('3')).toBeVisible();
    expect(screen.getByLabelText('보드게임 3')).toBeVisible();
  });

  it('is read by its kind when it has no label', async () => {
    await render(<MapPin kind="dining" />);

    expect(screen.getByLabelText('식당')).toBeVisible();
  });

  it("marks the User's own position", async () => {
    await render(<MapPin kind="me" />);

    expect(screen.getByLabelText('내 위치')).toBeVisible();
  });

  it('shows a Friend as an Avatar with the status', async () => {
    await render(<MapPin kind="friend" name="김서연" status="moving" />);

    expect(screen.getByText('서연')).toBeVisible();
    expect(screen.getByLabelText('김서연 · 이동 중')).toBeVisible();
  });
});
