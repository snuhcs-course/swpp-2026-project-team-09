/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { MeetupFormScreen } from '@/screens/meetup/meetup-form-screen';

// Proposing a Meetup to the Friend `friendId`, named `?name=`, above the tabs.
export default function MeetupRoute(): ReactElement {
  const { friendId, name } = useLocalSearchParams<{ friendId: string; name?: string }>();
  return <MeetupFormScreen friend={{ id: friendId, name: name ?? '' }} />;
}
