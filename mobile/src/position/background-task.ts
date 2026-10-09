// AI-generated with Claude Fable 5.1, 2026-10-08, prompted by fyoon46
import type { LocationObject } from 'expo-location';
import * as TaskManager from 'expo-task-manager';
import { listenToSession } from '@/session/session-events';
import { BACKGROUND_TASK, stopBackground } from './background';
import { uploadInBackground } from './background-upload';

// Imported by the bundle's entry (`index.ts`), before the screens: Android may start the app for the task alone.

TaskManager.defineTask<{ locations: LocationObject[] }>(BACKGROUND_TASK, async ({ data, error }) => {
  if (error !== null) {
    return;
  }
  await uploadInBackground(
    data.locations.map(({ coords: { latitude, longitude, accuracy }, timestamp }) => ({
      position: { latitude, longitude },
      accuracy,
      measuredAt: timestamp,
    })),
  );
});

// Whatever ended the Session, nothing is sent after it, and the next User on the phone chooses again.
listenToSession((event) => {
  if (event.kind === 'ended') {
    void stopBackground(true);
  }
});
