import { useLocalSearchParams } from 'expo-router';
import type { ReactElement } from 'react';
import { InviteScreen } from '@/screens/friends/invite-screen';

// An Invite Link's accept screen, above the tabs: `<PUBLIC_URL>/invite/<token>` and `snunow://invite/<token>` open it.
// A User who is not signed in yet sees it once they are (the signed-in place's layout).
export default function InviteRoute(): ReactElement {
  const { token } = useLocalSearchParams<{ token: string }>();
  return <InviteScreen key={token} token={token} />;
}
