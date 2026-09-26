import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import * as SecureStore from "expo-secure-store";
import { API, ApiError, request } from "./api";
export const TOKEN_KEY = "campus-token";
const CONSENT_KEY = "campus-upload-consent";
export async function setUploadConsent(enabled: boolean) {
  if (enabled) await SecureStore.setItemAsync(CONSENT_KEY, "yes");
  else await SecureStore.deleteItemAsync(CONSENT_KEY);
}
const TASK = "campus-location-upload";
TaskManager.defineTask<{ locations: Location.LocationObject[] }>(
  TASK,
  async ({ data, error }) => {
    if (error || !data || !API.startsWith("https://")) return;
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (!token) {
      await stopLocation();
      return;
    }
    const position = data.locations.at(-1);
    if (position)
      await upload(token, position).catch(async (error) => {
        if (
          error instanceof ApiError &&
          (error.status === 401 || error.status === 403)
        ) {
          await setUploadConsent(false);
          await stopLocation();
          if (error.status === 401)
            await SecureStore.deleteItemAsync(TOKEN_KEY);
        }
      });
  },
);
export async function upload(token: string, position: Location.LocationObject) {
  if ((await SecureStore.getItemAsync(CONSENT_KEY)) !== "yes") return;
  return request("/me/location", token, "PUT", {
    latitude: position.coords.latitude,
    longitude: position.coords.longitude,
    accuracyM: position.coords.accuracy ?? 100,
    observedAt: new Date(position.timestamp).toISOString(),
  });
}
export async function stopLocation() {
  if (await Location.hasStartedLocationUpdatesAsync(TASK))
    await Location.stopLocationUpdatesAsync(TASK);
}
export async function startBackground() {
  if (!API.startsWith("https://"))
    throw new Error("백그라운드 공유에는 HTTPS API 주소가 필요합니다.");
  const permission = await Location.requestBackgroundPermissionsAsync();
  if (permission.status !== "granted")
    throw new Error("설정에서 항상 위치 허용이 필요합니다.");
  if ((await SecureStore.getItemAsync(CONSENT_KEY)) !== "yes") return;
  await Location.startLocationUpdatesAsync(TASK, {
    accuracy: Location.Accuracy.Balanced,
    distanceInterval: 30,
    timeInterval: 30000,
    foregroundService: {
      notificationTitle: "캠퍼스 위치 공유",
      notificationBody: "동의한 관계에 위치를 공유하고 있습니다.",
    },
    pausesUpdatesAutomatically: true,
  });
}
