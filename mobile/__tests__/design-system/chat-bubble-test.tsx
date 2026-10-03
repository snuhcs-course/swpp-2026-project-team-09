import { render, screen } from '@testing-library/react-native';

import { ChatBubble } from '@/design-system/chat-bubble';

describe('ChatBubble', () => {
  it('shows a message and its time', async () => {
    await render(
      <ChatBubble role="assistant" time="오후 2:10">
        목요일 17시 이후가 둘 다 비어 있어요.
      </ChatBubble>,
    );

    expect(screen.getByText('목요일 17시 이후가 둘 다 비어 있어요.')).toBeVisible();
    expect(screen.getByText('오후 2:10')).toBeVisible();
  });
});
