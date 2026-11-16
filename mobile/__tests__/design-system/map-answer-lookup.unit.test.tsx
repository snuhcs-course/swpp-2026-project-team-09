/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import { render, screen } from '@testing-library/react-native';

import { type AnswerLabel, color, MapAnswerMark, mapText } from '@/design-system';

function labelOf(tone: AnswerLabel['tone'], title: string, line: string | null = null): AnswerLabel {
  return { side: 'above', tone, title, line, number: null };
}

// Partitions: a shuttle stop's dot and label. Expected values: the looks agreed with package B (P01 ticket 11).
describe("MapAnswerMark: a shuttle stop's look", () => {
  it("draws a stop as a small round of the shuttle's colour", async () => {
    await render(<MapAnswerMark label={null} symbol={{ type: 'dot', role: 'stop', number: null }} testID="mark" />);

    expect(screen.getByTestId('mark:dot')).toHaveStyle({ width: 14, height: 14, backgroundColor: color.svcShuttle });
  });

  it("shows the stop's name in ink and the shuttle's time in the shuttle's colour", async () => {
    await render(<MapAnswerMark label={labelOf('stop', '301동 정류장', '16:45 셔틀')} symbol={null} testID="mark" />);

    expect(screen.getByText('301동 정류장')).toHaveStyle({ color: color.ink });
    expect(screen.getByText('16:45 셔틀')).toHaveStyle({ color: color.svcShuttle });
    expect(screen.getByTestId('mark:label')).toHaveStyle({ backgroundColor: color.surface });
  });
});

// Partitions: the flags of setting out, of being late, and of the shuttle. Expected values: the looks agreed with
// package B.
describe("MapAnswerMark: a way's flags", () => {
  it.each([
    ['setting out', 'leave', '12:45 나서기', color.ink, color.surface],
    ['being late', 'late', '13:05 도착 · 5분 늦어요', color.danger, color.dangerSoft],
    ['the shuttle', 'shuttle', '셔틀 · 신소재공동연구소 지남', color.svcShuttle, color.svcShuttleSoft],
  ] as const)(
    'shows the flag of %s in bold words of its colour on its ground',
    async (_, tone, title, words, ground) => {
      await render(<MapAnswerMark label={labelOf(tone, title)} symbol={null} testID="mark" />);

      expect(screen.getByText(title)).toHaveStyle({ color: words, fontFamily: mapText.smallTitle.fontFamily });
      expect(screen.getByTestId('mark:label')).toHaveStyle({ backgroundColor: ground });
    },
  );
});
