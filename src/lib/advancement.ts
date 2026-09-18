/**
 * A team that's fully eliminated its target (100 points — two kills on the
 * same target team, per the scoring rules) has "advanced." This is purely
 * a display threshold, not tied to the round calendar (src/lib/rounds.ts)
 * or to any automatic re-targeting — it's just "you did what this round
 * asked of you."
 */
export const ADVANCEMENT_POINTS_THRESHOLD = 100;

export function hasAdvanced(points: number): boolean {
  return points >= ADVANCEMENT_POINTS_THRESHOLD;
}
