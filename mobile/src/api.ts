export const API = process.env.EXPO_PUBLIC_API_URL || "";
export const MATCH = process.env.EXPO_PUBLIC_MATCH_URL || "";
export const SOCKET = process.env.EXPO_PUBLIC_SOCKET_URL || "";
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
let unauthorized: (() => void) | undefined;
export function onUnauthorized(handler: (() => void) | undefined) {
  unauthorized = handler;
}
export async function request<T = any>(
  path: string,
  token?: string,
  method = "GET",
  body?: unknown,
  base = API,
): Promise<T> {
  if (!base) throw new Error("서버 주소 설정이 필요합니다. .env를 확인하세요.");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const response = await fetch(`${base}/v1${path}`, {
      method,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (response.status === 401 && token) unauthorized?.();
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        result.message || `요청 실패 (${response.status})`,
        response.status,
      );
    return result;
  } finally {
    clearTimeout(timeout);
  }
}
export type User = {
  id: string;
  displayName: string;
  email: string;
  avatarUrl: string | null;
  role: string;
};
export type Event = {
  id: string;
  title: string;
  description: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  latitude: number | null;
  longitude: number | null;
  status: string;
};
export type Party = {
  id: string;
  title: string;
  members: User[];
  maxMembers: number;
  sharingEnabled?: boolean;
};
export type Friend = {
  id: string;
  user: User;
  status: string;
  direction: string;
  sharingEnabled: boolean;
};
export type Quest = {
  id: string;
  partyId: string;
  title: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
};
export type Position = {
  user: User;
  latitude: number;
  longitude: number;
  observedAt: string;
};
