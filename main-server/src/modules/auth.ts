import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { OAuth2Client, TokenPayload } from "google-auth-library";
import jwt from "jsonwebtoken";
import { randomUUID, timingSafeEqual } from "node:crypto";
import { Database } from "./database";
import { text, uuid } from "./validation";
export function adminEmails() {
  return (process.env.ADMIN_EMAILS || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}
export function userView(row: any) {
  return {
    id: row.id,
    email: row.email,
    displayName: row.display_name,
    avatarUrl: row.avatar_url ?? null,
    role: adminEmails().includes(row.email.toLowerCase()) ? "admin" : "student",
  };
}
export function schoolIdentity(p: TokenPayload | undefined) {
  if (
    !p?.sub ||
    p.email_verified !== true ||
    p.hd !== "snu.ac.kr" ||
    !p.email ||
    !/^[^@]+@snu\.ac\.kr$/i.test(p.email)
  )
    throw new ForbiddenException("Verified snu.ac.kr school account required");
  return p;
}
@Injectable()
export class AuthService {
  private google = new OAuth2Client();
  constructor(private db: Database) {}
  async login(body: any) {
    if (!process.env.GOOGLE_WEB_CLIENT_ID || !process.env.JWT_SECRET)
      throw new ServiceUnavailableException({
        message: "Google OAuth and JWT configuration required",
        code: "CONFIGURATION_REQUIRED",
      });
    const idToken = text(body?.idToken, "idToken", 10000);
    let payload: TokenPayload | undefined;
    try {
      payload = (
        await this.google.verifyIdToken({
          idToken,
          audience: process.env.GOOGLE_WEB_CLIENT_ID,
        })
      ).getPayload();
    } catch {
      throw new UnauthorizedException("Invalid Google identity token");
    }
    const p = schoolIdentity(payload);
    this.db.requireReady();
    const row = await this.db.prisma.user.upsert({
      where: { google_sub: p.sub },
      create: {
        id: randomUUID(),
        google_sub: p.sub,
        email: p.email!.toLowerCase(),
        display_name: p.name || p.email!,
        avatar_url: p.picture || null,
      },
      update: { email: p.email!.toLowerCase(), avatar_url: p.picture || null },
    });
    const user = userView(row);
    return {
      accessToken: jwt.sign(
        { email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { algorithm: "HS256", subject: user.id, expiresIn: "1h" },
      ),
      user,
    };
  }
  async verify(header: unknown) {
    if (!process.env.JWT_SECRET)
      throw new ServiceUnavailableException({
        message: "JWT configuration required",
        code: "CONFIGURATION_REQUIRED",
      });
    if (typeof header !== "string" || !header.startsWith("Bearer "))
      throw new UnauthorizedException("Bearer token required");
    let sub: string;
    try {
      const p = jwt.verify(header.slice(7), process.env.JWT_SECRET, {
        algorithms: ["HS256"],
      });
      if (
        typeof p === "string" ||
        typeof p.sub !== "string" ||
        typeof p.exp !== "number"
      )
        throw Error();
      sub = uuid(p.sub);
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    this.db.requireReady();
    const row = await this.db.prisma.user.findUnique({ where: { id: sub } });
    if (!row) throw new UnauthorizedException("Unknown account");
    return userView(row);
  }
}
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private auth: AuthService) {}
  async canActivate(ctx: ExecutionContext) {
    const req = ctx.switchToHttp().getRequest();
    req.user = await this.auth.verify(req.headers.authorization);
    return true;
  }
}
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    if (ctx.switchToHttp().getRequest().user?.role !== "admin")
      throw new ForbiddenException("Admin account required");
    return true;
  }
}
@Injectable()
export class InternalGuard implements CanActivate {
  canActivate(ctx: ExecutionContext) {
    const expected = process.env.INTERNAL_API_KEY;
    const actual = ctx.switchToHttp().getRequest().headers["x-internal-key"];
    if (
      !expected ||
      typeof actual !== "string" ||
      Buffer.byteLength(actual) !== Buffer.byteLength(expected) ||
      !timingSafeEqual(Buffer.from(actual), Buffer.from(expected))
    )
      throw new UnauthorizedException("Internal authentication required");
    return true;
  }
}
