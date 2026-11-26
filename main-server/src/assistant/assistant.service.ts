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
 * 2026-11-21  Opus 5.5   prompted by fyoon46
 * 2026-11-22  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by fyoon46
 * 2026-11-26  Opus 5.5   prompted by AhnJinYoung
 * 2026-11-27  Opus 5.5   prompted by fyoon46
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
import { PrismaService } from '../common/prisma.service.js';
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
import { UsageService } from '../usage/usage.service.js';
import { UsersService } from '../users/users.service.js';
import { causeOf, RUN_OBSERVER, runFeature, type RunLimits, type RunObserver } from './adapter.js';
import { chatAssistant, type ChatAssistantServices } from './chat/chat-assistant.js';
import { NO_CONTEXT, type RequestContext } from './dto/answer.dto.js';
import { type AssistantReplyDto } from './dto/assistant-messages.dto.js';
import { replyBody } from './reply-body.js';
import { type ChatMessage, type ClientCapability, type Feature, type FeatureReply } from './feature.js';
import { UserDayService } from './free-time/user-day.service.js';
import { koreaDate } from './korea-time.js';
import { friendMentions } from './mentions.js';
import { ModelPort } from './model-port.js';
import { type Catalogue, LIBRARY_CATALOGUE } from './library/catalogue.js';
import { FREE_TIME_PORT, type FreeTimePort } from './library/free-time-port.js';
import { type LibraryServices } from './library/library-tools.js';
import { type SeatStay, seatStayNow } from './library/seat-stay-now.js';
import { LookupServices } from './lookup/lookup-services.js';
import { MadePartyService } from './tools/made-party.js';
import { PlanAnswersService } from './plan-answers.service.js';

// The latest messages the model is given. Earlier ones are dropped, so that a long conversation does not make every
// message cost more.
export const HISTORY_MAX = 20;

// A day's count outlives its day in Korea, whatever the server's clock, and is then dropped.
const COUNT_LIFETIME_SECONDS = 2 * 24 * 60 * 60;

@Injectable()
export class AssistantService {
  private readonly logger = new Logger(AssistantService.name);
  // The chat of each kind of app, by `chatKey`.
  private readonly chats: ReadonlyMap<string, Feature>;
  private readonly dailyMessages: number;
  private readonly limits: RunLimits;
  // The line of what is ahead, which an app that draws answers has the model read each turn.
  private readonly ahead: (userId: string, now: Date) => Promise<string[]>;

  private readonly friendViews: FriendViewService;

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
    prisma: PrismaService,
    tutorial: TutorialService,
    plans: PlanAnswersService,
    lookups: LookupServices,
    interests: InterestsService,
    madeParties: MadePartyService,
    private readonly usage: UsageService,
    // Only the benchmark binds one (main-server/eval).
    @Optional() @Inject(RUN_OBSERVER) private readonly observer?: RunObserver,
  ) {
    this.ahead = (userId: string, now: Date): Promise<string[]> => lookups.days.ahead(userId, now);
    this.friendViews = friends;
    const services = {
      menus,
      shuttle,
      globalEvents,
      recruiting,
      friends,
      places,
      freeTime: { days, recruiting, globalEvents, places: placeLookup, travel, friends, menus, restaurantPlaces },
      library: libraryOf(settings, prisma, { catalogue, freeTime, friends, quests, users, days, placeLookup, travel }),
      tutorial,
      plans,
      lookups,
      interests,
      madeParties,
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
    const ahead = capabilities.includes('answer') ? await this.ahead(userId, now) : [];
    try {
      const mentions = await friendMentions(this.friendViews, userId, context.mentions);
      const reply = await runFeature(
        chosen.model,
        this.chatFor(capabilities),
        { userId, now, capabilities, context: { ...context, mentions }, ahead },
        latest,
        this.limits,
        this.observer,
      );
      if (reply.noTextFinishReason !== null) {
        this.logger.warn(fixedSentenceLog(reply, reply.noTextFinishReason));
      }
      return this.answered(userId, reply);
    } catch (error) {
      this.logger.warn(`The Assistant did not answer: ${causeOf(error)}`);
      throw unavailable();
    }
  }

  // The reply as the app reads it, once the Assistant has answered, with its usage event (README.md: Usage data).
  private answered(userId: string, reply: FeatureReply): AssistantReplyDto {
    this.usage.sent(userId, 'assistant_reply_completed', {});
    return replyBody(reply);
  }

  private chatFor(capabilities: readonly ClientCapability[]): Feature {
    const drawing = capabilities.includes('answer') ? drawingOf(capabilities) : null;
    const chat = this.chats.get(chatKey(drawing));
    if (chat === undefined) {
      throw new Error(`No chat for ${chatKey(drawing)}`);
    }
    return chat;
  }

  // Counts the User's message in their day in Korea, and answers how many they have sent that day.
  private async countMessage(userId: string, now: Date): Promise<number> {
    const key = `assistant:messages:${userId}:${koreaDate(now)}`;
    const sent = await this.redis.incr(key);
    await this.redis.expire(key, COUNT_LIFETIME_SECONDS);
    return sent;
  }
}

// What an app that draws answers draws besides: a day's events, a meet, the visible area's study spaces, ranked study
// places, and the study answer together.
interface Drawing {
  drawsEvents: boolean;
  drawsMeets: boolean;
  drawsArea: boolean;
  drawsStudy: boolean;
  drawsStudyGroup: boolean;
}

const drawingOf = (capabilities: readonly ClientCapability[]): Drawing => ({
  drawsEvents: capabilities.includes('events'),
  drawsMeets: capabilities.includes('meet'),
  drawsArea: capabilities.includes('area'),
  drawsStudy: capabilities.includes('study-plan'),
  drawsStudyGroup: capabilities.includes('study-group'),
});

const FLAGS = ['drawsEvents', 'drawsMeets', 'drawsArea', 'drawsStudy', 'drawsStudyGroup'] as const;

// "plain" for an app that does not draw answers, else what it draws, such as "answer drawsEvents drawsArea".
const chatKey = (drawing: Drawing | null): string =>
  drawing === null ? 'plain' : ['answer', ...FLAGS.filter((flag) => drawing[flag])].join(' ');

const BOTH = [false, true];

// Every drawing: each flag on or off.
const DRAWINGS: Drawing[] = BOTH.flatMap((drawsEvents) =>
  BOTH.flatMap((drawsMeets) =>
    BOTH.flatMap((drawsArea) =>
      BOTH.flatMap((drawsStudy) =>
        BOTH.map((drawsStudyGroup) => ({ drawsEvents, drawsMeets, drawsArea, drawsStudy, drawsStudyGroup })),
      ),
    ),
  ),
);

function chatsOf(services: ChatAssistantServices): Map<string, Feature> {
  return new Map([
    [chatKey(null), chatAssistant(services)],
    ...DRAWINGS.map((drawing): [string, Feature] => [
      chatKey(drawing),
      chatAssistant(services, { drawsAnswers: true, ...drawing }),
    ]),
  ]);
}

type LibraryParts = Pick<LibraryServices, 'catalogue' | 'freeTime' | 'friends' | 'quests' | 'users'> & {
  days: UserDayService;
  placeLookup: PlaceLookup;
  travel: TravelProvider;
};

// What the 관정도서관 tools are given: LIBRARY_BOOKING_ENABLED, and the User's seat stay read through `prisma`.
function libraryOf(
  settings: ConfigService<Settings, true>,
  prisma: PrismaService,
  { days, placeLookup, travel, ...parts }: LibraryParts,
): LibraryServices {
  return {
    ...parts,
    arrival: { days, places: placeLookup, travel },
    seatStay: (userId: string, now: Date): Promise<SeatStay | null> => seatStayNow(prisma, userId, now),
    enabled: settings.get('LIBRARY_BOOKING_ENABLED', { infer: true }),
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
