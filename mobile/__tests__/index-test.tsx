import { render, screen } from '@testing-library/react-native';

import PlaceholderScreen from '@/app/index';

describe('placeholder screen', () => {
  it('shows the app name', async () => {
    await render(<PlaceholderScreen />);

    expect(screen.getByText('SNU Now')).toBeVisible();
  });
});
