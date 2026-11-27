/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-27  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';
import { color, font, text } from '@/design-system';
import { AnswerLines } from '@/screens/main/answer/answer-lines';
import { FailedLines } from '@/screens/main/answer/failed-and-waiting';
import { ReplyLines } from '@/screens/main/answer/refusal-reply';
import { Notes, Said } from '@/screens/main/library/library-parts';

// The answer's sentence has one type (P01 ticket 19, from the user's phone: "배고파" at 13:05 said its no-plan line
// large and bold): the model's words are `text.bodyLg` regular in ink, and the server's lines that stand in their place
// are drawn the same, their strong words keeping their emphasis.

const SENTENCE = { ...text.bodyLg, color: color.ink };
const LINE = [
  { text: '점심 시간에는 ', strong: false },
  { text: '비는 시간', strong: true },
  { text: '이 없어요', strong: false },
];

describe("the server's lines in the place of the answer's sentence", () => {
  it("are drawn in the sentence's type, the strong words in bold and the key colour", async () => {
    await render(<AnswerLines lines={[LINE]} />);

    expect(screen.getByText('점심 시간에는 비는 시간이 없어요')).toHaveStyle(SENTENCE);
    expect(screen.getByText('비는 시간')).toHaveStyle({ fontFamily: font.bold, color: color.snuBlue });
  });

  it("draw a refusal's first line in the sentence's type, and its second as the muted note it was", async () => {
    const second = [
      { text: '다른 시간을 ', strong: false },
      { text: '말해 주세요', strong: false },
    ];
    await render(<ReplyLines lines={[LINE, second]} />);

    expect(screen.getByText('점심 시간에는 비는 시간이 없어요')).toHaveStyle(SENTENCE);
    expect(screen.getByText('다른 시간을 말해 주세요')).toHaveStyle({ ...text.body, color: color.inkMuted });
  });
});

describe("a refusal's lines over a Plan, a Lookup or a made card", () => {
  it('read as a refusal reads: the first as the sentence, the rest as the muted note under it', async () => {
    const own = [{ text: '학생회관식당 11:50 점심', strong: false }];
    const second = [
      { text: '대신 ', strong: false },
      { text: '가까운 곳이에요', strong: false },
    ];
    await render(<AnswerLines lines={[LINE, second, own]} refusal={2} />);

    expect(screen.getByText('점심 시간에는 비는 시간이 없어요')).toHaveStyle(SENTENCE);
    expect(screen.getByText('대신 가까운 곳이에요')).toHaveStyle({ ...text.body, color: color.inkMuted });
  });
});

describe("a library card's words", () => {
  it('say an outcome as the sentence, a failure in the smaller failure line in red, and the notes small', async () => {
    await render(
      <>
        <Said>예약을 취소했어요.</Said>
        <Said tone="danger">취소하지 못했어요</Said>
        <Notes notes={['좌석은 30분 안에 확인해야 해요']} />
      </>,
    );

    expect(screen.getByText('예약을 취소했어요.')).toHaveStyle(SENTENCE);
    expect(screen.getByText('취소하지 못했어요')).toHaveStyle({ ...text.body, color: color.danger });
    expect(screen.getByText(/30분 안에/u)).toHaveStyle({ ...text.caption, color: color.inkMuted });
  });
});

describe("a request's failure in the answer's place", () => {
  it('says its first line in red, as every failure line, and the rest as the note under it', async () => {
    await render(<FailedLines text={'답을 가져오지 못했어요.\n쓴 말은 입력칸에 그대로 있어요.'} />);

    // Each line is a Text over its one run: the line's style is on the run's parent.
    expect(screen.getByText('답을 가져오지 못했어요.').parent).toHaveStyle({ ...text.body, color: color.danger });
    expect(screen.getByText('쓴 말은 입력칸에 그대로 있어요.').parent).toHaveStyle({
      ...text.body,
      color: color.inkMuted,
    });
  });
});
