export function minutesFromNow(minutes: number) {
  return new Date(Date.now() + minutes * 60_000);
}

