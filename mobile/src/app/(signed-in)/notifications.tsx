import type { ReactElement } from 'react';
import { NotificationsScreen } from '@/screens/me/notifications-screen';

// 알림, above the tabs: what waits for the User.
export default function NotificationsRoute(): ReactElement {
  return <NotificationsScreen />;
}
