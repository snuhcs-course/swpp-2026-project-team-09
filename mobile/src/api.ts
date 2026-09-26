export const API = process.env.EXPO_PUBLIC_API_URL || "";
export const MATCH = process.env.EXPO_PUBLIC_MATCH_URL || "";
export const SOCKET = process.env.EXPO_PUBLIC_SOCKET_URL || "";
export class ApiError extends Error {
  status: number;
  code?: string;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}
let unauthorized: ((failedToken: string) => void) | undefined;
export function onUnauthorized(
  handler: ((failedToken: string) => void) | undefined,
) {
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
    if (response.status === 401 && token) unauthorized?.(token);
    const result = await response.json();
    if (!response.ok)
      throw new ApiError(
        result.message || `요청 실패 (${response.status})`,
        response.status,
        typeof result.code === "string" ? result.code : undefined,
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
  visibility?: "public" | "private";
  id: string;
  title: string;
  members: User[];
  maxMembers: number;
  sharingEnabled?: boolean;
  eventId: string | null;
  memberCount: number;
  isMember: boolean;
};
export type Friend = {
  id: string;
  user: User;
  status: string;
  direction: string;
  sharingEnabled: boolean;
};
export type Quest = {
  version: number;
  status: "active" | "cancelled";
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

export type MatchRequest = {
  id: string;
  activity: string;
  status: string;
  explanation?: string;
  aiStatus?: string;
  partyId: string | null;
  timeStart: string;
  timeEnd: string;
};
export type Meals = {
  date: string;
  status: string;
  message?: string;
  sourceUrl: string;
  fetchedAt: string;
  items: {
    restaurant: string;
    breakfast: string;
    lunch: string;
    dinner: string;
  }[];
};
export type Shuttle = {
  status: string;
  message?: string;
  sourceUrl: string;
  fetchedAt: string;
  observedAt: null;
  vehicles: { id: string; x: number; y: number; label: string }[];
  stops: { name: string; x: number; y: number }[];
};

export type Meetup = {
  id: string;
  sender: User;
  recipient: User;
  title: string;
  startsAt: string;
  endsAt: string;
  locationName: string;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  version: number;
  partyId: string | null;
  questId: string | null;
  createdAt: string;
};
