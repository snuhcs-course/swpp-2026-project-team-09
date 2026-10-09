// AI-generated with Claude Opus 5.5, 2026-10-02, prompted by TaeHyun79 and fyoon46, reviewed by fyoon46 in #28
import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Settings } from '../common/settings.js';
import { KakaoWalkAnswer, kakaoCodesSchema, kakaoWalkAnswerSchema } from './dto/kakao-walk-answer.dto.js';
import { type WalkingRouteQuery } from './dto/walking-route-query.dto.js';
import { toRouteDto, WalkingRouteAnswerDto } from './dto/walking-route.dto.js';

// Injection token of the HTTP call to Kakao. The tests replace it with saved answers.
export const FETCH_KAKAO = 'FETCH_KAKAO';

const KAKAO_WALK = 'https://dapi.kakao.com/v2/routing/walk';

// Without a limit of its own, fetch waits 300 seconds for an answer, and so does the User.
const KAKAO_TIMEOUT_MS = 5000;

function walkUrl({ startLatitude, startLongitude, endLatitude, endLongitude }: WalkingRouteQuery): string {
  const query = new URLSearchParams({
    start_x: String(startLongitude),
    start_y: String(startLatitude),
    end_x: String(endLongitude),
    end_y: String(endLatitude),
  });
  return `${KAKAO_WALK}?${query}`;
}

@Injectable()
export class WalkingRouteService {
  private readonly logger = new Logger(WalkingRouteService.name);
  private readonly key: string;

  constructor(
    @Inject(FETCH_KAKAO) private readonly fetchKakao: typeof fetch,
    settings: ConfigService<Settings, true>,
  ) {
    this.key = settings.get('KAKAO_REST_API_KEY', { infer: true });
  }

  async find(query: WalkingRouteQuery): Promise<WalkingRouteAnswerDto> {
    const answer = await this.ask(query);
    return answer.status === 'OK'
      ? { status: 'OK', route: toRouteDto(answer.route) }
      : { status: answer.status, route: null };
  }

  // Kakao answers SAME_POINT with 200 like a route, so an answer is read by what it says, not by its HTTP status.
  private async ask(query: WalkingRouteQuery): Promise<KakaoWalkAnswer> {
    let failure: string;
    try {
      const response = await this.fetchKakao(walkUrl(query), {
        headers: { Authorization: `KakaoAK ${this.key}` },
        signal: AbortSignal.timeout(KAKAO_TIMEOUT_MS),
      });
      const body: unknown = await response.json().catch(() => null);
      const answer = kakaoWalkAnswerSchema.safeParse(body);
      if (answer.success) {
        return answer.data;
      }
      failure = `HTTP ${response.status} ${JSON.stringify(kakaoCodesSchema.safeParse(body).data ?? {})}`;
    } catch (error) {
      failure = String(error);
    }
    this.logger.warn(`Kakao's walking route API failed: ${failure}`);
    throw new BadGatewayException("Kakao's walking route API failed.");
  }
}
