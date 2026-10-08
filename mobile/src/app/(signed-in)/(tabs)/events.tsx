import { router, useLocalSearchParams } from 'expo-router';
import { type ReactElement, useCallback } from 'react';
import { EventsScreen } from '@/screens/events/events-screen';

// The 행사 tab. `/events?focus=<id>` opens it marked at one Global Event.
export default function EventsRoute(): ReactElement {
  const { focus } = useLocalSearchParams<{ focus?: string }>();
  const onFocused = useCallback(() => {
    router.setParams({ focus: undefined });
  }, []);
  return <EventsScreen focus={focus} onFocused={onFocused} />;
}
