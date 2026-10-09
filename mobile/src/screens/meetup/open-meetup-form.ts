/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-06  Fable 5.1  prompted by fyoon46
 ******************************************************************************/

import { router } from 'expo-router';

// The Meetup form for one Friend, above the tabs.
export function openMeetupForm(friendId: string, name: string): void {
  router.push({ pathname: '/meetup/[friendId]', params: { friendId, name } });
}
