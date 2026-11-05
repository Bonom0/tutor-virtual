export function formatPercentage(value: number): string {
  return String(Math.round(value * 100)) + '%';
}

export function formatLevel(value: number): string {
  return value.toFixed(2);
}
