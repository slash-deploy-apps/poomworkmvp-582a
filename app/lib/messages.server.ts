import { and, eq, sql } from 'drizzle-orm';
import { db } from '~/lib/db.server';
import { messages } from '~/db/schema';

/**
 * Returns total unread messages count for a given user (across all peers).
 *
 * Cheap aggregate — used by root loader to show a badge in the global header.
 * Returns 0 when userId is null/undefined or on any DB error to keep the
 * header bulletproof against transient issues.
 */
export async function getUnreadMessagesCount(
  userId: string | null | undefined,
): Promise<number> {
  if (!userId) return 0;
  try {
    const row = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(and(eq(messages.receiverId, userId), eq(messages.isRead, 0)))
      .get();
    return Number(row?.count ?? 0);
  } catch {
    return 0;
  }
}
