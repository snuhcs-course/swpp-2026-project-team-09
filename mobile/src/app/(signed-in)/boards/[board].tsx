// AI-generated with Claude Opus 5.5, 2026-10-08, prompted by fyoon46
import { Redirect, useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { isBoard } from '@/features/party/boards';
import { BoardScreen } from '@/screens/party/board-screen';

// A board, above the tabs: `/boards/meal`. Another name leads to 전체 파티.
export default function BoardRoute(): ReactElement {
  const { board } = useLocalSearchParams<{ board: string }>();
  return isBoard(board) ? <BoardScreen board={board} /> : <Redirect href="/boards" />;
}
