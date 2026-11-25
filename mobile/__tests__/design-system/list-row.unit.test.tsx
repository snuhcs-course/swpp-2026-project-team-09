/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 * 2026-11-25  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import { render, screen, userEvent } from '@testing-library/react-native';

import { Avatar } from '@/design-system/avatar';
import { Button } from '@/design-system/button';
import { ListRow, RoundIcon, SectionHeader } from '@/design-system/list-row';

describe('ListRow', () => {
  it('shows a person with their department, a line and what it offers at the end', async () => {
    await render(
      <ListRow
        aside="컴퓨터공학부"
        leading={<Avatar name="김민준" status="free" />}
        lines={['공강 · 중앙도서관 근처']}
        title="김민준"
        trailing={<Button>만들기</Button>}
      />,
    );

    expect(screen.getByText('김민준')).toBeVisible();
    expect(screen.getByText('컴퓨터공학부')).toBeVisible();
    expect(screen.getByText('공강 · 중앙도서관 근처')).toBeVisible();
    expect(screen.getByRole('button', { name: '만들기' })).toBeVisible();
  });

  it('is one button, read by its label, when it has a press', async () => {
    const onPress = jest.fn<void, []>();
    await render(
      <ListRow
        kicker={{ words: '강의', color: '#555C74' }}
        label="강의 · 자료구조 · 14:00"
        large
        leading={<RoundIcon fill="#555C74" icon="clock" ink="#FFFFFF" />}
        onPress={onPress}
        title="자료구조"
      />,
    );

    await userEvent.press(screen.getByRole('button', { name: '강의 · 자료구조 · 14:00' }));

    expect(onPress).toHaveBeenCalledTimes(1);
    expect(screen.getByText('자료구조')).toHaveStyle({ fontSize: 16 });
  });
});

describe("ListRow's line", () => {
  it('keeps its line of 1 under it, with a press or without, given nothing more', async () => {
    await render(
      <>
        <ListRow leading={null} onPress={jest.fn<void, []>()} title="친구 관리" />
        <ListRow leading={null} title="김민준" trailing={<Button>만들기</Button>} />
      </>,
    );

    expect(screen.getByRole('button', { name: '친구 관리' })).toHaveStyle({ borderBottomWidth: 1 });
    expect(screen.getByRole('button', { name: '만들기' }).parent).toHaveStyle({ borderBottomWidth: 1 });
  });

  it("draws no line under it as a card's last row, whose edge ends it", async () => {
    await render(
      <>
        <ListRow last leading={null} onPress={jest.fn<void, []>()} title="관심사" />
        <ListRow last leading={null} title="관정도서관 로그인" trailing={<Button>로그인</Button>} />
      </>,
    );

    expect(screen.getByRole('button', { name: '관심사' })).not.toHaveStyle({ borderBottomWidth: 1 });
    expect(screen.getByRole('button', { name: '로그인' }).parent).not.toHaveStyle({ borderBottomWidth: 1 });
  });
});

describe('SectionHeader', () => {
  it("is read as a heading over its group's rows", async () => {
    await render(<SectionHeader>공강 · 4</SectionHeader>);

    expect(screen.getByRole('header', { name: '공강 · 4' })).toBeVisible();
  });
});
