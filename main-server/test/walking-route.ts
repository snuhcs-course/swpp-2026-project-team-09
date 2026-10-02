import { INestApplication } from '@nestjs/common';
import { readFileSync } from 'node:fs';
import { Server } from 'node:http';
import request from 'supertest';
import { CoordinatesDto } from '../src/walking-route/dto/walking-route.dto.js';
import { withAccessToken } from './sign-in.js';

// The two points of the real calls, as `.scratch/research/external-sources.md` §7.4 gives them.
export const MAIN_GATE = { latitude: 37.4664, longitude: 126.9486 };
export const CENTRAL_LIBRARY = { latitude: 37.4592, longitude: 126.9524 };

export function between(start: CoordinatesDto, end: CoordinatesDto): Record<string, number> {
  return {
    startLatitude: start.latitude,
    startLongitude: start.longitude,
    endLatitude: end.latitude,
    endLongitude: end.longitude,
  };
}

// An answer of Kakao's walking route API as a real call returned it, saved once in test/answers/.
export function savedAnswer(name: string): string {
  return readFileSync(new URL(`answers/${name}.json`, import.meta.url), 'utf8');
}

// The line of the saved walk from the main gate to the central library: the points of its steps in order, the point
// where one step ends and the next begins once.
export const MAIN_GATE_TO_CENTRAL_LIBRARY = [
  { latitude: 37.46632762, longitude: 126.94829436 },
  { latitude: 37.46608837, longitude: 126.94838354 },
  { latitude: 37.46563459, longitude: 126.94860434 },
  { latitude: 37.4656595, longitude: 126.94873451 },
  { latitude: 37.46551197, longitude: 126.94875934 },
  { latitude: 37.46549278, longitude: 126.94865407 },
  { latitude: 37.46467175, longitude: 126.9488115 },
  { latitude: 37.46453715, longitude: 126.94879463 },
  { latitude: 37.46399276, longitude: 126.9489007 },
  { latitude: 37.4629073, longitude: 126.94914155 },
  { latitude: 37.46190787, longitude: 126.94935721 },
  { latitude: 37.46174229, longitude: 126.94975872 },
  { latitude: 37.4616557, longitude: 126.95006474 },
  { latitude: 37.46124609, longitude: 126.95061958 },
  { latitude: 37.46128841, longitude: 126.95084156 },
  { latitude: 37.46062836, longitude: 126.95160079 },
  { latitude: 37.46048814, longitude: 126.9516023 },
  { latitude: 37.46033128, longitude: 126.95168595 },
  { latitude: 37.46024756, longitude: 126.9517439 },
  { latitude: 37.46020374, longitude: 126.95180699 },
  { latitude: 37.46013666, longitude: 126.95197814 },
  { latitude: 37.46006417, longitude: 126.9522538 },
  { latitude: 37.4599959, longitude: 126.95248284 },
  { latitude: 37.45983742, longitude: 126.95290155 },
  { latitude: 37.45978011, longitude: 126.95298345 },
  { latitude: 37.45957025, longitude: 126.95311789 },
  { latitude: 37.45945618, longitude: 126.95309972 },
  { latitude: 37.45924269, longitude: 126.95291319 },
  { latitude: 37.45921167, longitude: 126.95288025 },
  { latitude: 37.45901454, longitude: 126.95262876 },
];

export interface KakaoRequest {
  url: string;
  authorization: string | null;
}

// Answers in Kakao's place when a test gave no answer, so that no test reaches Kakao.
export function refuseKakao(): Promise<Response> {
  return Promise.reject(new Error('The test gave Kakao no answer'));
}

// Stands for Kakao's walking route API: answers every request with the answer it was last given, and keeps each
// request.
export class KakaoStub {
  requests: KakaoRequest[] = [];
  private respond: (signal?: AbortSignal | null) => Promise<Response> = refuseKakao;

  reset(): void {
    this.requests = [];
    this.respond = refuseKakao;
  }

  answers(body: string, status = 200): void {
    this.respond = (): Promise<Response> =>
      Promise.resolve(new Response(body, { status, headers: { 'Content-Type': 'application/json' } }));
  }

  fails(error: Error): void {
    this.respond = (): Promise<Response> => Promise.reject(error);
  }

  // Never answers: the call ends when the caller gives it up, as fetch ends it.
  hangs(): void {
    this.respond = (signal): Promise<Response> =>
      new Promise((_resolve, reject) => {
        signal?.addEventListener('abort', () => {
          const reason: unknown = signal.reason;
          reject(reason instanceof Error ? reason : new Error(String(reason)));
        });
      });
  }

  // Give it to startApp in place of fetch.
  readonly fetch: typeof fetch = (input, init) => {
    const url = input instanceof Request ? input.url : String(input);
    this.requests.push({ url, authorization: new Headers(init?.headers).get('Authorization') });
    return this.respond(init?.signal);
  };
}

export function getWalkingRoute(
  app: INestApplication<Server>,
  accessToken: string | undefined,
  query: Record<string, string | number | undefined>,
): request.Test {
  return withAccessToken(request(app.getHttpServer()).get('/walking-route').query(query), accessToken);
}
