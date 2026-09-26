import { ConflictException } from "@nestjs/common";
import { Prisma } from "../generated/prisma/client";
import { getTimetableAvailability } from "./availability";
import { bad } from "./validation";
import { Transaction } from "./database";

export function validateScheduleWindow(startsAt: Date, endsAt: Date) {
  if (endsAt.getTime() - startsAt.getTime() > 31 * 86400000)
    bad("Schedule duration cannot exceed 31 days");
}
export async function lockScheduleUsers(c: Transaction, userIds: string[]) {
  if (!userIds.length) return;
  await c.$queryRaw`SELECT id FROM users WHERE id IN (${Prisma.join(userIds.map((id) => Prisma.sql`${id}::uuid`))}) ORDER BY id FOR UPDATE`;
}
export async function assertScheduleAvailable(
  c: Transaction,
  userIds: string[],
  startsAt: Date,
  endsAt: Date,
  excludeQuestId?: string,
) {
  validateScheduleWindow(startsAt, endsAt);
  const users = await c.user.findMany({
    where: { id: { in: userIds } },
    select: { timetable: true },
  });
  const busy = users.some(
    (user) =>
      getTimetableAvailability(user.timetable, startsAt, endsAt).busy.length >
      0,
  );
  const conflict = await c.quest.count({
    where: {
      ...(excludeQuestId ? { id: { not: excludeQuestId } } : {}),
      status: "active",
      starts_at: { lt: endsAt },
      ends_at: { gt: startsAt },
      party: { members: { some: { user_id: { in: userIds } } } },
    },
  });
  const privateConflict = await c.privateEvent.count({
    where: {
      owner_id: { in: userIds },
      starts_at: { lt: endsAt },
      ends_at: { gt: startsAt },
    },
  });
  if (busy || conflict || privateConflict)
    throw new ConflictException({
      code: "SCHEDULE_CONFLICT",
      message: "The proposed time conflicts with an existing schedule",
    });
}
