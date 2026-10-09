// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { RoomScreen } from '@/screens/room/room-screen';

// A Quest's room, above the tabs: `/room/<questId>`.
export default function RoomRoute(): ReactElement {
  const { questId } = useLocalSearchParams<{ questId: string }>();
  return <RoomScreen questId={questId} />;
}
