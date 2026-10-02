import { BadGatewayException, Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { z } from 'zod';
import { Settings } from '../common/settings.js';
import { type WalkingRouteQuery } from './dto/walking-route-query.dto.js';
import { NO_ROUTE_STATUSES, RouteDto, WalkingRouteDto } from './dto/walking-route.dto.js';

// Injection token of the HTTP call to Kakao. The tests replace it with saved answers.
export const FETCH = 'FETCH';

const KAKAO_WALK = 'https://dapi.kakao.com/v2/routing/walk';

// Kakao writes a point as [x, y]: the longitude, then the latitude.
const kakaoPointSchema = z.tuple([z.number(), z.number()]);

const kakaoRouteSchema = z.object({
  properties: z.object({ totalDistance: z.number(), totalTime: z.number() }),
  legs: z.array(z.object({ steps: z.array(z.object({ path: z.object({ points: z.array(kakaoPointSchema) }) })) })),
});

// The other statuses come with an empty route, which is not read.
const kakaoAnswerSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('OK'), route: kakaoRouteSchema }),
  z.object({ status: z.enum(NO_ROUTE_STATUSES) }),
]);

type KakaoAnswer = z.infer<typeof kakaoAnswerSchema>;

function walkUrl({ startLatitude, startLongitude, endLatitude, endLongitude }: WalkingRouteQuery): string {
  const query = new URLSearchParams({
    start_x: String(startLongitude),
    start_y: String(startLatitude),
    end_x: String(endLongitude),
    end_y: String(endLatitude),
  });
  return `${KAKAO_WALK}?${query}`;
}

function toRoute({ legs, properties }: z.infer<typeof kakaoRouteSchema>): RouteDto {
  const points = legs.flatMap(({ steps }) => steps.flatMap(({ path }) => path.points));
  // Each step begins at the point where the one before it ended.
  const line = points.filter(
    ([x, y], index) => index === 0 || x !== points[index - 1][0] || y !== points[index - 1][1],
  );
  return {
    line: line.map(([longitude, latitude]) => ({ latitude, longitude })),
    distance: properties.totalDistance,
    duration: properties.totalTime,
  };
}

@Injectable()
export class WalkingRouteService {
  private readonly logger = new Logger(WalkingRouteService.name);
  private readonly key: string;

  constructor(
    @Inject(FETCH) private readonly fetchKakao: typeof fetch,
    settings: ConfigService<Settings, true>,
  ) {
    this.key = settings.get('KAKAO_REST_API_KEY', { infer: true });
  }

  // Every request asks Kakao: its policy forbids keeping a route.
  async find(query: WalkingRouteQuery): Promise<WalkingRouteDto> {
    const answer = await this.ask(query);
    return answer.status === 'OK'
      ? { status: 'OK', route: toRoute(answer.route) }
      : { status: answer.status, route: null };
  }

  // Kakao's answer when it says a route or a status of no route, whatever its HTTP status. Anything else is logged and
  // fails with 502.
  private async ask(query: WalkingRouteQuery): Promise<KakaoAnswer> {
    let failure: string;
    try {
      const response = await this.fetchKakao(walkUrl(query), { headers: { Authorization: `KakaoAK ${this.key}` } });
      const text = await response.text();
      const answer = kakaoAnswerSchema.safeParse(JSON.parse(text));
      if (answer.success) {
        return answer.data;
      }
      failure = `${response.status} ${text}`;
    } catch (error) {
      failure = String(error);
    }
    // In case an error of Kakao's quotes the key.
    this.logger.warn(`Kakao's walking route API failed: ${failure.replaceAll(this.key, 'KAKAO_REST_API_KEY')}`);
    throw new BadGatewayException("Kakao's walking route API failed");
  }
}
