/**
 * Classic assassins-game targeting: shuffle the active teams into one random
 * cycle, each team hunts the next team in the ring. No two teams share a
 * target, and nobody targets themselves (guaranteed as long as there are at
 * least 2 teams).
 */
export function buildTargetRing<T>(teams: T[]): Array<{ team: T; target: T }> {
  const shuffled = [...teams];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled.map((team, i) => ({
    team,
    target: shuffled[(i + 1) % shuffled.length],
  }));
}
