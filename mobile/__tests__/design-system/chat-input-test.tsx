/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-05  Opus 5.5   prompted by AhnJinYoung
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { ChatInput } from '@/design-system/chat-input';

describe('ChatInput', () => {
  it('sends what was typed and empties itself', async () => {
    const onSend = jest.fn<void, [string]>();
    await render(<ChatInput onSend={onSend} />);

    await userEvent.type(screen.getByLabelText('메시지'), '빈 자리 있어?');
    await userEvent.press(screen.getByRole('button', { name: '보내기' }));

    expect(onSend).toHaveBeenCalledWith('빈 자리 있어?');
    expect(screen.getByLabelText('메시지')).toHaveDisplayValue('');
  });

  it('sends a suggestion on a press', async () => {
    const onSend = jest.fn<void, [string]>();
    await render(<ChatInput onSend={onSend} suggestions={['오늘 점심 뭐 먹지?', '셔틀 언제 와?']} />);

    await userEvent.press(screen.getByRole('button', { name: '셔틀 언제 와?' }));

    expect(onSend).toHaveBeenCalledWith('셔틀 언제 와?');
  });

  it('sends nothing while it is empty', async () => {
    await render(<ChatInput />);

    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();
  });

  it('keeps what was typed and sends nothing while it is disabled', async () => {
    const onSend = jest.fn<void, [string]>();
    await render(<ChatInput disabled onSend={onSend} suggestions={['오늘 학식 메뉴']} />);

    await userEvent.type(screen.getByLabelText('메시지'), '안녕');
    await userEvent.press(screen.getByRole('button', { name: '보내기' }));
    await userEvent.press(screen.getByRole('button', { name: '오늘 학식 메뉴' }));

    expect(screen.getByLabelText('메시지')).toHaveDisplayValue('안녕');
    expect(onSend).not.toHaveBeenCalled();
  });
});
