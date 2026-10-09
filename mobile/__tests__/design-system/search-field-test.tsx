/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';
import { type ReactElement, useState } from 'react';

import { SearchField } from '@/design-system/search-field';

function Search(): ReactElement {
  const [value, setValue] = useState('');
  return <SearchField label="친구 검색" onChangeText={setValue} placeholder="이름, 학과 검색" value={value} />;
}

describe('SearchField', () => {
  it('is read by its label and shows its placeholder', async () => {
    await render(<Search />);

    expect(screen.getByLabelText('친구 검색')).toBeVisible();
    expect(screen.getByPlaceholderText('이름, 학과 검색')).toBeVisible();
    expect(screen.queryByRole('button', { name: '지우기' })).toBeNull();
  });

  it('offers "지우기" while it holds words, which empties it', async () => {
    const user = userEvent.setup();
    await render(<Search />);

    await user.type(screen.getByLabelText('친구 검색'), '김민');
    expect(screen.getByLabelText('친구 검색')).toHaveDisplayValue('김민');
    await user.press(screen.getByRole('button', { name: '지우기' }));

    expect(screen.getByLabelText('친구 검색')).toHaveDisplayValue('');
    expect(screen.queryByRole('button', { name: '지우기' })).toBeNull();
  });
});
