/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-11-28  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import type { AnswerLabel, AnswerSymbol } from '@/design-system';

// An answer's look's name (moved out of `marker-looks.tsx` for its length), the key its picture is kept under.
// Words may hold the separator of `parts`, so an answer's look is named by a list of what it draws, in a fixed order.
// Every field that changes the picture is part of the name, so that a look never takes another's kept picture.
export function answerName(symbol: AnswerSymbol | null, label: AnswerLabel | null): string {
  const drawn = [
    symbol?.type ?? null,
    symbol?.type === 'face'
      ? [
          symbol.name,
          symbol.dashed,
          ...(symbol.badge === undefined ? [] : [symbol.badge]),
          ...(symbol.exact === true ? ['exact'] : []),
        ]
      : null,
    symbol?.type === 'dot'
      ? [
          symbol.role,
          symbol.number,
          ...(symbol.faded === true ? ['faded'] : []),
          ...[symbol.meal === true ? ['meal'] : [], symbol.study === true ? ['study'] : []].flat(),
          ...(symbol.icon === undefined ? [] : [{ icon: symbol.icon }]),
          // A kind draws its own colour (`kindTone`).
          ...(symbol.kind === undefined ? [] : [{ kind: symbol.kind }]),
        ]
      : null,
    label === null
      ? null
      : [
          label.side,
          label.tone,
          label.title,
          label.line,
          label.number,
          ...(label.shift === undefined ? [] : [label.shift]),
          ...(label.sub === undefined || label.sub === null ? [] : [{ sub: label.sub }]),
          ...(label.note === undefined || label.note === null ? [] : [{ note: label.note }]),
          ...(label.action === undefined || label.action === null ? [] : [{ action: label.action }]),
          ...(label.faded === true ? ['faded'] : []),
          ...(label.meal === true ? ['meal'] : []),
          ...(label.study === true ? ['study'] : []),
          ...(label.clock === true ? ['clock'] : []),
          ...(label.kind === undefined ? [] : [{ kind: label.kind }]),
        ],
  ];
  return `answer:${JSON.stringify(drawn)}`;
}
