export function usagePercentage(used: number, limit: number) {
  if (limit <= 0) return used > 0 ? 100 : 0;
  return Math.max(0, Math.min(100, Math.round((used / limit) * 100)));
}
