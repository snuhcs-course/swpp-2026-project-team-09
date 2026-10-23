/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { Badge } from '@/design-system/badge';

describe('Badge', () => {
  it('shows its words', async () => {
    await render(<Badge tone="live">위치 공유 중</Badge>);

    expect(screen.getByText('위치 공유 중')).toBeVisible();
  });
});
