import { render, screen } from '@testing-library/react-native';
import { Text } from 'react-native';

import { BottomSheet } from '@/design-system/bottom-sheet';

describe('BottomSheet', () => {
  it('shows its title and what it holds', async () => {
    await render(
      <BottomSheet title="근처 행사">
        <Text>AI 커리어 채용설명회</Text>
      </BottomSheet>,
    );

    expect(screen.getByRole('header', { name: '근처 행사' })).toBeVisible();
    expect(screen.getByText('AI 커리어 채용설명회')).toBeVisible();
  });
});
