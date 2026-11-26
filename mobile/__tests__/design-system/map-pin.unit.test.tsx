/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-26  Opus 5.5   prompted by Jaehyun0320
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { MapPin } from '@/design-system/map-pin';
import { QuestRound } from '@/design-system/quest-round';

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

  it("draws the User's own position at three quarters of its size from far away", async () => {
    await render(<MapPin kind="me" small />);

    expect(screen.getByLabelText('내 위치')).toHaveStyle({ width: 36, height: 36 });
  });

  it('shows a Friend as an Avatar with the status', async () => {
    await render(<MapPin kind="friend" name="김서연" status="moving" />);

    expect(screen.getByText('서연')).toBeVisible();
    expect(screen.getByLabelText('김서연 · 이동 중')).toBeVisible();
  });
});

// Partitions: the three tones, on the map and on the whole screen.
describe('QuestRound', () => {
  it.each([false, true])('tells 공개 from 비공개 by an icon a screen reader names, on the map: %s', async (onMap) => {
    await render(
      <>
        <QuestRound onMap={onMap} tone="open" />
        <QuestRound onMap={onMap} tone="closed" />
        <QuestRound onMap={onMap} tone="class" />
      </>,
    );

    expect(screen.getByLabelText('공개')).toBeVisible();
    expect(screen.getByLabelText('비공개')).toBeVisible();
    expect(screen.getByLabelText('강의')).toBeVisible();
  });
});
