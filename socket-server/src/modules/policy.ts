import jwt, { JwtPayload } from 'jsonwebtoken';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PUBLIC = new Set(['event.changed', 'campus.changed']);
const PRIVATE = new Set(['party.changed', 'friend.changed', 'quest.changed', 'location.changed', 'sharing.changed', 'match.changed', 'meetup.changed']);
export function authenticate(token: unknown, secret = process.env.JWT_SECRET): string {
  if (!secret || typeof token !== 'string') throw new Error('Authentication required');
  const claims = jwt.verify(token, secret, { algorithms: ['HS256'] }) as JwtPayload;
  if (!claims || typeof claims.sub !== 'string' || !UUID.test(claims.sub) || !Number.isInteger(claims.exp) || !['student', 'admin'].includes(claims.role)) throw new Error('Invalid token');
  return claims.sub;
}
export function parseHint(raw: string): { rooms: string[]; payload: Record<string, unknown> } | null {
  try {
    if (raw.length > 32768) return null;
    const x = JSON.parse(raw);
    if (!x || typeof x.id !== 'string' || x.id.length > 200 || typeof x.type !== 'string' || !x.audience) return null;
    if (!PUBLIC.has(x.type) && !PRIVATE.has(x.type)) return null;
    let rooms: string[];
    if (x.audience.kind === 'public' && PUBLIC.has(x.type)) rooms = ['events:public'];
    else if (x.audience.kind === 'users' && Array.isArray(x.audience.userIds) && x.audience.userIds.length > 0 && x.audience.userIds.length <= 1000 && x.audience.userIds.every((v: unknown) => typeof v === 'string' && UUID.test(v))) rooms = [...new Set<string>(x.audience.userIds)].map(id => `user:${id}`);
    else return null;
    const payload: Record<string, unknown> = { id: x.id, type: x.type };
    if (typeof x.entityId === 'string' && x.entityId.length <= 200) payload.entityId = x.entityId;
    if (Number.isSafeInteger(x.version) && x.version >= 0) payload.version = x.version;
    return { rooms, payload };
  } catch { return null; }
}
