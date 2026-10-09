// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung, reviewed by Jaehyun0320 in #50
import { render, screen } from '@testing-library/react-native';

import { Avatar } from '@/design-system/avatar';

describe('Avatar', () => {
  it('shows the last two syllables of a Korean name', async () => {
    await render(<Avatar name="홍길동" />);

    expect(screen.getByText('길동')).toBeVisible();
  });

  it('shows the initials of a name in Latin letters', async () => {
    await render(<Avatar name="jane van doe" />);

    expect(screen.getByText('JV')).toBeVisible();
  });

  it('is read by the name and the status', async () => {
    await render(<Avatar name="홍길동" status="free" />);

    expect(screen.getByLabelText('홍길동 · 공강')).toBeVisible();
  });
});
