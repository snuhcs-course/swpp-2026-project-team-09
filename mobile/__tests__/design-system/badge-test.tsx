// AI-generated with Claude Opus 5.5, 2026-10-05, prompted by AhnJinYoung, reviewed by Jaehyun0320 in #50
import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/design-system/badge';

describe('Badge', () => {
  it('shows its words', async () => {
    await render(<Badge tone="live">위치 공유 중</Badge>);

    expect(screen.getByText('위치 공유 중')).toBeVisible();
  });
});
