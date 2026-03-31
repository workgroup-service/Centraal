/**
 * @author Cursor
 *
 * Converts milliseconds to GitLab duration string format.
 * GitLab accepts: weeks (w), days (d), hours (h), minutes (m), seconds (s).
 * Example: 5400000 ms → "1h30m"
 */

export function formatDurationForGitLab(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  if (totalSeconds <= 0) return "0m";

  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;

  const parts: string[] = [];
  if (h > 0) parts.push(`${h}h`);
  if (m > 0) parts.push(`${m}m`);
  if (parts.length === 0 && s > 0) parts.push(`${s}s`);

  return parts.join("") || "0m";
}
