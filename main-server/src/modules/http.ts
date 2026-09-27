import {
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  ServiceUnavailableException,
  UseGuards,
  Module,
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from "@nestjs/common";
import { Request } from "express";
import {
  AuthService,
  AuthGuard,
  AdminGuard,
  InternalGuard,
  userView,
} from "./auth";
import { ImageExtractionProxy } from "./image-extractions";
import { Database } from "./database";
import { EventsService } from "./events";
import { PrivateEventsService } from "./private-events";
import { MeetupsService } from "./meetups";
import { SocialService } from "./social";
import { ProfileService } from "./profile";
import { LocationService } from "./location";
import { bad, bool, uuid } from "./validation";
type AuthRequest = Request & { user: ReturnType<typeof userView> };
@Injectable()
export class CampusService {
  async proxy(path: string, method = "GET") {
    if (!process.env.WORKER_URL || !process.env.INTERNAL_API_KEY)
      throw new ServiceUnavailableException({
        message: "Worker integration configuration required",
        code: "CONFIGURATION_REQUIRED",
      });
    try {
      const response = await fetch(new URL(path, process.env.WORKER_URL), {
        method,
        headers: { "x-internal-key": process.env.INTERNAL_API_KEY },
        signal: AbortSignal.timeout(12000),
      });
      const payload = await response.json();
      if (!response.ok) throw new HttpException(payload, response.status);
      return payload;
    } catch (e) {
      if (e instanceof HttpException) throw e;
      throw new ServiceUnavailableException(
        "Campus integration temporarily unavailable",
      );
    }
  }
}
@Controller()
export class HealthController {
  constructor(private db: Database) {}
  @Get("health") async health() {
    this.db.requireReady();
    try {
      await this.db.prisma.$queryRaw`SELECT 1`;
    } catch {
      throw new ServiceUnavailableException("Database unavailable");
    }
    return {
      status: "ok",
      service: "main-server",
      role: process.env.APP_ROLE || "public",
      authConfigured: Boolean(
        process.env.GOOGLE_WEB_CLIENT_ID && process.env.JWT_SECRET,
      ),
    };
  }
}
@Controller("v1/auth")
export class AuthController {
  constructor(private auth: AuthService) {}
  @Post("google") login(@Body() b: any) {
    return this.auth.login(b);
  }
  @Get("me") @UseGuards(AuthGuard) me(@Req() r: AuthRequest) {
    return r.user;
  }
}
@Controller("v1")
@UseGuards(AuthGuard)
export class PublicController {
  constructor(
    private events: EventsService,
    private social: SocialService,
    private meetups: MeetupsService,
    private privateEvents: PrivateEventsService,
    private location: LocationService,
    private profile: ProfileService,
    private campus: CampusService,
    private imageExtractions: ImageExtractionProxy,
  ) {}
  @Post("me/image-extractions") extractImage(@Body() b: unknown) {
    return this.imageExtractions.extract(b);
  }
  @Get("me/profile") ownProfile(@Req() r: AuthRequest) {
    return this.profile.profile(r.user.id);
  }
  @Patch("me/profile") patchProfile(@Req() r: AuthRequest, @Body() b: any) {
    return this.profile.patchProfile(r.user.id, b);
  }
  @Get("me/timetable") timetable(@Req() r: AuthRequest) {
    return this.profile.timetable(r.user.id);
  }
  @Put("me/timetable") putTimetable(@Req() r: AuthRequest, @Body() b: any) {
    return this.profile.putTimetable(r.user.id, b);
  }
  @Get("events") eventsList() {
    return this.events.list();
  }
  @Get("parties") parties(@Req() r: AuthRequest) {
    return this.social.listParties(r.user.id);
  }
  @Post("parties") createParty(@Req() r: AuthRequest, @Body() b: any) {
    return this.social.createParty(r.user.id, b);
  }
  @Post("parties/:id/join") join(
    @Req() r: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.social.join(r.user.id, id);
  }
  @Delete("parties/:id/membership") leave(
    @Req() r: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.social.leave(r.user.id, id);
  }
  @Patch("parties/:id/sharing") partySharing(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.social.partySharing(r.user.id, id, bool(b?.enabled));
  }
  @Get("private-events") privateEventsList(@Req() r: AuthRequest) {
    return this.privateEvents.list(r.user.id);
  }
  @Post("private-events") createPrivateEvent(
    @Req() r: AuthRequest,
    @Body() b: unknown,
  ) {
    return this.privateEvents.create(r.user.id, b);
  }
  @Patch("private-events/:id") updatePrivateEvent(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.privateEvents.update(r.user.id, id, b);
  }
  @Delete("private-events/:id") deletePrivateEvent(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.privateEvents.remove(r.user.id, id, b);
  }
  @Get("meetups") meetupsList(@Req() r: AuthRequest) {
    return this.meetups.list(r.user.id);
  }
  @Post("meetups") createMeetup(@Req() r: AuthRequest, @Body() b: unknown) {
    return this.meetups.create(r.user.id, b);
  }
  @Post("meetups/:id/respond") respondMeetup(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: unknown,
  ) {
    return this.meetups.respond(r.user.id, id, b);
  }
  @Get("friends") friends(@Req() r: AuthRequest) {
    return this.social.friends(r.user.id);
  }
  @Post("friends") friend(@Req() r: AuthRequest, @Body() b: any) {
    return this.social.requestFriend(r.user.id, b);
  }
  @Post("friends/:id/accept") accept(
    @Req() r: AuthRequest,
    @Param("id") id: string,
  ) {
    return this.social.friendAction(r.user.id, id);
  }
  @Patch("friends/:id/sharing") friendSharing(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.social.friendAction(r.user.id, id, bool(b?.enabled));
  }
  @Get("quests") quests(@Req() r: AuthRequest) {
    return this.social.quests(r.user.id);
  }
  @Post("quests") createQuest(@Req() r: AuthRequest, @Body() b: any) {
    return this.social.saveQuest(r.user.id, b);
  }
  @Patch("quests/:id") updateQuest(
    @Req() r: AuthRequest,
    @Param("id") id: string,
    @Body() b: any,
  ) {
    return this.social.saveQuest(r.user.id, b, id);
  }
  @Patch("me/location-sharing") sharing(@Req() r: AuthRequest, @Body() b: any) {
    return this.location.sharing(r.user.id, bool(b?.enabled));
  }
  @Put("me/location") upload(@Req() r: AuthRequest, @Body() b: any) {
    return this.location.upload(r.user.id, b);
  }
  @Get("locations") locations(@Req() r: AuthRequest) {
    return this.location.list(r.user.id);
  }
  @Get("campus/shuttle") shuttle(@Query("routeId") route = "41946") {
    if (!["41946", "41914"].includes(route)) bad("Unsupported route");
    return this.campus.proxy(`/v1/campus/shuttle?routeId=${route}`);
  }
  @Get("campus/meals") meals(@Query("date") date?: string) {
    if (date && !/^\d{4}-\d\d-\d\d$/.test(date)) bad("Invalid date");
    return this.campus.proxy(`/v1/campus/meals${date ? "?date=" + date : ""}`);
  }
}
@Controller("v1/admin")
@UseGuards(AuthGuard, AdminGuard)
export class AdminController {
  constructor(
    private events: EventsService,
    private campus: CampusService,
  ) {}
  @Get("events") list() {
    return this.events.list(true);
  }
  @Post("events") create(@Body() b: any) {
    return this.events.save(b);
  }
  @Patch("events/:id") update(@Param("id") id: string, @Body() b: any) {
    return this.events.save(b, id);
  }
  @Get("integrations") integrations() {
    return this.campus.proxy("/v1/internal/integrations");
  }
  @Post("integrations/:source/refresh") refresh(
    @Param("source") source: string,
  ) {
    if (!["meals", "shuttle", "events"].includes(source))
      bad("Unsupported source");
    return this.campus.proxy(
      `/v1/internal/integrations/${source}/refresh`,
      "POST",
    );
  }
}
@Controller("v1/internal")
@UseGuards(InternalGuard)
export class InternalController {
  constructor(
    private db: Database,
    private events: EventsService,
    private social: SocialService,
  ) {}
  @Post("events/import") importEvents(@Body() b: any) {
    return this.events.import(b);
  }
  @Post("parties/match") match(@Body() b: any) {
    return this.social.match(b);
  }
  @Get("users/:id") async user(@Param("id") id: string) {
    uuid(id);
    this.db.requireReady();
    const row = await this.db.prisma.user.findUnique({ where: { id } });
    if (!row) throw new HttpException("Account not found", 404);
    return userView(row);
  }
}
export function runtimeControllers(role: string) {
  if (!["public", "admin"].includes(role))
    throw new Error("APP_ROLE must be public or admin");
  return [
    HealthController,
    AuthController,
    ...(role === "admin"
      ? [AdminController]
      : [PublicController, InternalController]),
  ];
}
@Module({
  controllers: runtimeControllers(process.env.APP_ROLE || "public"),
  providers: [
    Database,
    AuthService,
    AuthGuard,
    AdminGuard,
    InternalGuard,
    EventsService,
    SocialService,
    MeetupsService,
    PrivateEventsService,
    LocationService,
    ProfileService,
    CampusService,
    ImageExtractionProxy,
  ],
})
export class AppModule {}
@Catch()
export class Errors implements ExceptionFilter {
  catch(e: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse();
    if (e instanceof HttpException) {
      const body = e.getResponse();
      return res
        .status(e.getStatus())
        .json(typeof body === "string" ? { message: body } : body);
    }
    if ((e as any)?.type === "entity.too.large")
      return res
        .status(413)
        .json({
          code: "REQUEST_TOO_LARGE",
          message: "JSON request must be at most 3 MiB",
        });
    if ((e as any)?.type === "entity.parse.failed")
      return res
        .status(400)
        .json({ code: "INVALID_INPUT", message: "Valid JSON required" });
    const code = (e as any)?.code;
    if (
      code === "23505" ||
      code === "P2002" ||
      (code === "P2010" && (e as any)?.meta?.code === "23505")
    )
      return res.status(409).json({ message: "Conflicting record" });
    console.error(
      "Unhandled request error",
      e instanceof Error ? e.message : "unknown",
    );
    res.status(500).json({ message: "Internal server error" });
  }
}
