/*******************************************************************************
 * AI-generated with Claude
 *
 * 2026-10-17  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-18  Opus 5.5   prompted by Jaehyun0320
 * 2026-10-22  Opus 5.5   prompted by AhnJinYoung
 * 2026-10-31  Opus 5.5   prompted by TaeHyun79
 * 2026-11-01  Opus 5.5   prompted by Jaehyun0320
 * 2026-11-02  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-14  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by fyoon46
 * 2026-11-15  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-16  Opus 5.5   prompted by fyoon46
 ******************************************************************************/

import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  Logger,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Redis } from 'ioredis';
import { REDIS } from '../common/redis.module.js';
import { type Settings } from '../common/settings.js';
import { FriendViewService } from '../friends/friend-view.service.js';
import { MenusService } from '../menus/menus.service.js';
import { RestaurantPlaces } from '../menus/restaurant-places.js';
import { GlobalEventsService } from '../global-events/global-events.service.js';
import { InterestsService } from '../interests/interests.service.js';
import { PlaceLookup } from '../places/place-lookup.js';
import { PlacesService } from '../places/places.service.js';
import { CLOCK, type Clock } from '../quests/clock.js';
import { QuestsService } from '../quests/quests.service.js';
import { RecruitingService } from '../quests/recruiting.service.js';
import { ShuttleService } from '../shuttle/shuttle.service.js';
import { TRAVEL_PROVIDER, type TravelProvider } from '../travel/travel.js';
import { TutorialService } from '../tutorial/tutorial.service.js';
import { UsersService } from '../users/users.service.js';
import { causeOf, RUN_OBSERVER, runFeature, type RunLimits, type RunObserver } from './adapter.js';
import { chatAssistant, type ChatAssistantServices } from './chat/chat-assistant.js';
import { NO_CONTEXT, type RequestContext } from './dto/answer.dto.js';
import { type AssistantReplyDto } from './dto/assistant-messages.dto.js';
import { type ChatMessage, type ClientCapability, type Feature, type FeatureReply } from './feature.js';
import { UserDayService } from './free-time/user-day.service.js';
import { koreaDate } from './korea-time.js';
import { ModelPort } from './model-port.js';
import { type Catalogue, LIBRARY_CATALOGUE } from './library/catalogue.js';
import { FREE_TIME_PORT, type FreeTimePort } from './library/free-time-port.js';
import { LookupServices } from './lookup/lookup-services.js';
import { PlanAnswersService } from './plan-answers.service.js';

// The latest messages the model is given. Earlier ones are dropped, so that a long conversation does not make every
// message cost more.
export const HISTORY_MAX = 20;

// A day's count outlives its day in Korea, whatever the server's clock, and is then dropped.
const COUNT_LIFETIME_SECONDS = 2 * 24 * 60 * 60;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  // The chat of each kind of app.
  private readonly chats: Record<ChatKind, Feature>;
  private readonly dailyMessages: number;
  private readonly limits: RunLimits;

  constructor(
    private readonly models: ModelPort,
    @Inject(REDIS) private readonly redis: Redis,
    @Inject(CLOCK) private readonly clock: Clock,
    settings: ConfigService<Settings, true>,
    menus: MenusService,
    shuttle: ShuttleService,
    globalEvents: GlobalEventsService,
    recruiting: RecruitingService,
    friends: FriendViewService,
    places: PlacesService,
    placeLookup: PlaceLookup,
    days: UserDayService,
    restaurantPlaces: RestaurantPlaces,
    @Inject(TRAVEL_PROVIDER) travel: TravelProvider,
    @Inject(LIBRARY_CATALOGUE) catalogue: Catalogue,
    @Inject(FREE_TIME_PORT) freeTime: FreeTimePort,
    quests: QuestsService,
    users: UsersService,
    tutorial: TutorialService,
    plans: PlanAnswersService,
    lookups: LookupServices,
    interests: InterestsService,
    // Only the benchmark binds one (main-server/eval).
    @Optional() @Inject(RUN_OBSERVER) private readonly observer?: RunObserver,
  ) {
    const enabled = settings.get('LIBRARY_BOOKING_ENABLED', { infer: true });
    const services = {
      menus,
      shuttle,
      globalEvents,
      recruiting,
      friends,
      places,
      freeTime: { days, recruiting, globalEvents, places: placeLookup, travel, friends, menus, restaurantPlaces },
      library: { catalogue, freeTime, friends, quests, users, arrival: { days, places: placeLookup, travel }, enabled },
      tutorial,
      plans,
      lookups,
      interests,
    };
    this.chats = chatsOf(services);
    this.dailyMessages = settings.get('ASSISTANT_DAILY_MESSAGES', { infer: true });
    this.limits = limitsOf(settings);
  }

  // The reply, or one error reply whatever failed: 503 when the Assistant cannot answer, 429 once the User's messages
  // of the day are used up. The log says why, never what anyone wrote.
  async reply(
    userId: string,
    messages: readonly ChatMessage[],
    capabilities: readonly ClientCapability[] = [],
    context: RequestContext = NO_CONTEXT,
  ): Promise<AssistantReplyDto> {
    // Read once, so that every model call of this answer uses the same key, whatever a minute's check reloads meanwhile.
    const chosen = this.models.chosen();
    if (chosen === null) {
      this.logger.warn('The Assistant did not answer: the server has no key by the name llm.key gives');
      throw unavailable();
    }
    const now = this.clock.now();
    const sent = await this.countMessage(userId, now);
    if (sent > this.dailyMessages) {
      this.logger.log(`A User reached the daily limit of ${this.dailyMessages} messages`);
      throw new HttpException("Today's messages are used up", HttpStatus.TOO_MANY_REQUESTS);
    }
    const latest = messages.slice(-HISTORY_MAX);
    try {
      const reply = await runFeature(
        chosen.model,
        this.chatFor(capabilities),
        { userId, now, capabilities, context },
        latest,
        this.limits,
        this.observer,
      );
      if (reply.noTextFinishReason !== null) {
        this.logger.warn(fixedSentenceLog(reply, reply.noTextFinishReason));
      }
      const { text, mapButtons, cards, proposal, answer, lookup, refusal, offers = [] } = reply;
      return { text, mapButtons, cards, proposal, answer, lookup, refusal, ...(offers.length === 0 ? {} : { offers }) };
    } catch (error) {
      this.logger.warn(`The Assistant did not answer: ${causeOf(error)}`);
      throw unavailable();
    }
  }

  private chatFor(capabilities: readonly ClientCapability[]): Feature {
    if (!capabilities.includes('answer')) {
      return this.chats.plain;
    }
    const drawn = capabilities.includes('events') ? 'events' : 'answer';
    const meet = capabilities.includes('meet') ? '-meet' : '';
    const area = capabilities.includes('area') ? '-area' : '';
    return this.chats[`${drawn}${meet}${area}` as const];
  }

  // Counts the User's message in their day in Korea, and answers how many they have sent that day.
  private async countMessage(userId: string, now: Date): Promise<number> {
    const key = `assistant:messages:${userId}:${koreaDate(now)}`;
    const sent = await this.redis.incr(key);
    await this.redis.expire(key, COUNT_LIFETIME_SECONDS);
    return sent;
  }
}

// The chat of an app that does not draw answers, and of one that does, by what else it draws: a day's events, a meet,
// and the visible area's study spaces.
type Drawn = 'answer' | 'events';
type ChatKind = 'plain' | Drawn | `${Drawn}-meet` | `${Drawn}-area` | `${Drawn}-meet-area`;

function chatsOf(services: ChatAssistantServices): Record<ChatKind, Feature> {
  const chat = (drawsEvents: boolean, drawsMeets: boolean, drawsArea: boolean): Feature =>
    chatAssistant(services, { drawsAnswers: true, drawsEvents, drawsMeets, drawsArea });
  return {
    plain: chatAssistant(services),
    answer: chat(false, false, false),
    events: chat(true, false, false),
    'answer-meet': chat(false, true, false),
    'events-meet': chat(true, true, false),
    'answer-area': chat(false, false, true),
    'events-area': chat(true, false, true),
    'answer-meet-area': chat(false, true, true),
    'events-meet-area': chat(true, true, true),
  };
}

function limitsOf(settings: ConfigService<Settings, true>): RunLimits {
  return {
    maxSteps: settings.get('ASSISTANT_MAX_STEPS', { infer: true }),
    timeoutMs: settings.get('ASSISTANT_TIMEOUT_MS', { infer: true }),
    maxOutputTokens: settings.get('ASSISTANT_MAX_OUTPUT_TOKENS', { infer: true }),
  };
}

// That a reply had no text of the model's: how many things it showed, never what they were.
function fixedSentenceLog({ cards, mapButtons, proposal }: FeatureReply, finishReason: string): string {
  const shown = `${cards.length} cards, ${mapButtons.length} map buttons, ${proposal === null ? 'no' : 'a'} Proposal`;
  return `The Assistant answered with its fixed sentence: no step had text (finish reason ${finishReason}, ${shown})`;
}

function unavailable(): ServiceUnavailableException {
  return new ServiceUnavailableException('The Assistant cannot answer now');
}
