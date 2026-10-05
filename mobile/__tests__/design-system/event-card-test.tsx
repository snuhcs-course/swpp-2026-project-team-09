import { render, screen } from '@testing-library/react-native';

import { Button } from '@/design-system/button';
import { EventCard } from '@/design-system/event-card';

describe('EventCard', () => {
  it('shows what an official event is, when, where, for whom and from where', async () => {
    await render(
      <EventCard
        eligibility="학부생 누구나"
        kind="official"
        source="컴퓨터공학부 공지"
        tags={['#AI커리어', '#채용']}
        time="10월 2일 (목) 18:00–20:00"
        title="AI 커리어 채용설명회"
        venue="301동 118호"
      />,
    );

    expect(screen.getByText('공식 행사')).toBeVisible();
    expect(screen.getByRole('header', { name: 'AI 커리어 채용설명회' })).toBeVisible();
    expect(screen.getByText('10월 2일 (목) 18:00–20:00')).toBeVisible();
    expect(screen.getByText('301동 118호')).toBeVisible();
    expect(screen.getByText('학부생 누구나')).toBeVisible();
    expect(screen.getByText('컴퓨터공학부 공지')).toBeVisible();
    expect(screen.getByText('#채용')).toBeVisible();
  });

  it("names a Private Event as the User's own and carries its actions", async () => {
    await render(<EventCard actions={[<Button key="route">길찾기</Button>]} kind="private" title="스터디룸 예약" />);

    expect(screen.getByText('내 일정')).toBeVisible();
    expect(screen.getByRole('button', { name: '길찾기' })).toBeVisible();
  });
});
