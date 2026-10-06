import { router } from 'expo-router';

// The Meetup form for one Friend, above the tabs.
export function openMeetupForm(friendId: string, name: string): void {
  router.push({ pathname: '/meetup/[friendId]', params: { friendId, name } });
}
