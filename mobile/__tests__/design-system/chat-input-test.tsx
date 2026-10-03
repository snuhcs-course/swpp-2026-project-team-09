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

  it('sends nothing while it is empty or disabled', async () => {
    const onSend = jest.fn<void, [string]>();
    const { rerender } = await render(<ChatInput onSend={onSend} />);

    expect(screen.getByRole('button', { name: '보내기' })).toBeDisabled();

    await rerender(<ChatInput disabled onSend={onSend} />);
    await userEvent.type(screen.getByLabelText('메시지'), '안녕');
    await userEvent.press(screen.getByRole('button', { name: '보내기' }));

    expect(onSend).not.toHaveBeenCalled();
  });
});
