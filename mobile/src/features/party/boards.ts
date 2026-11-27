/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by TaeHyun79
 ******************************************************************************/

import type { Board } from '@/api/types';
import type { IconName } from '@/design-system';

// The four boards, in the frame's order, with their names and icons: 찾기's filters and the form's sheet of boards.
export const BOARDS: readonly { key: Board; name: string; icon: IconName }[] = [
  { key: 'meal', name: '식사', icon: 'meal' },
  { key: 'career', name: '진로', icon: 'book' },
  { key: 'hobby', name: '취미', icon: 'flag' },
  { key: 'show', name: '공연', icon: 'calendar' },
];

// "식사 게시판"
export function boardName(board: Board): string {
  return `${BOARDS.find(({ key }) => key === board)?.name ?? ''} 게시판`;
}
