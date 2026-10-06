import type { ReactElement } from 'react';
import { BoardsScreen } from '@/screens/party/boards-screen';

// 전체 파티, above the tabs: `/boards`.
export default function BoardsRoute(): ReactElement {
  return <BoardsScreen />;
}
