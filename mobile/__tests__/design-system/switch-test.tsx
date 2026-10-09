/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { fireEvent, render, screen } from '@testing-library/react-native';

import { SwitchRow } from '@/design-system/switch';

describe('SwitchRow', () => {
  it('is read as a switch by its label, with its description beside it', async () => {
    await render(
      <SwitchRow description="12명" label="친구와 위치 공유" onValueChange={jest.fn<void, [boolean]>()} value />,
    );

    expect(screen.getByRole('switch', { name: '친구와 위치 공유' })).toBeChecked();
    expect(screen.getByText('12명')).toBeVisible();
  });

  it('passes on the new value', async () => {
    const onValueChange = jest.fn<void, [boolean]>();
    await render(<SwitchRow label="친구와 위치 공유" onValueChange={onValueChange} value={false} />);

    await fireEvent(screen.getByRole('switch', { name: '친구와 위치 공유' }), 'valueChange', true);

    expect(onValueChange).toHaveBeenCalledWith(true);
  });
});
