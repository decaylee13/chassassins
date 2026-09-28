import "server-only";

import { and, eq, isNotNull, lte } from "drizzle-orm";
import { db } from "@/db";
import { days } from "@/db/schema";

/**
 * Lazily applies any staged draft safety whose scheduled start time has
 * passed — no cron job or background worker involved. Call this once near
 * the top of any page that reads `days`, before that read, so whoever
 * loads the page shortly after the scheduled time sees it already live.
 *
 * This is deliberately request-triggered rather than a real scheduled job:
 * it only fires the next time *someone* loads a page that calls it, not on
 * a hard timer. For a small, actively-checked site that's effectively
 * immediate, but if literally nobody visits between the scheduled time and
 * the next visit, the draft stays staged until then. A true cron (e.g.
 * Vercel Cron hitting an API route) would remove that gap entirely, at the
 * cost of real scheduling infrastructure — worth it only if visits become
 * sparse enough for the gap to matter.
 */
export async function autoApplyDueDraftSafety(): Promise<void> {
  const due = await db.query.days.findMany({
    where: and(
      isNotNull(days.draftSafetyText),
      isNotNull(days.draftSafetyStart),
      lte(days.draftSafetyStart, new Date()),
    ),
  });

  for (const day of due) {
    await db
      .update(days)
      .set({
        safetyText: day.draftSafetyText as string,
        safetyStart: day.draftSafetyStart,
        safetyEnd: day.draftSafetyEnd,
        safetyImageUrl: day.draftSafetyImageUrl,
        draftSafetyText: null,
        draftSafetyStart: null,
        draftSafetyEnd: null,
        draftSafetyImageUrl: null,
      })
      .where(eq(days.dayId, day.dayId));
  }
}
