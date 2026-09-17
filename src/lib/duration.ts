/** "2d 5h 12m 03s", "5h 12m 03s", "12m 03s", "45s" — shared by every live countdown. */
export function formatDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, "0");

  if (days > 0) return `${days}d ${hours}h ${minutes}m ${ss}s`;
  if (hours > 0) return `${hours}h ${minutes}m ${ss}s`;
  if (minutes > 0) return `${minutes}m ${ss}s`;
  return `${seconds}s`;
}
