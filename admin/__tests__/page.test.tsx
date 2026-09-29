import { render, screen } from '@testing-library/react';

import PlaceholderPage from '@/app/page';

describe('placeholder page', () => {
  it('shows the site name', () => {
    render(<PlaceholderPage />);

    expect(screen.getByRole('heading', { level: 1, name: 'SNU Now Admin' })).toBeVisible();
  });
});
