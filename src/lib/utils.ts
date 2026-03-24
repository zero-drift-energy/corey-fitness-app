import { format, parseISO, differenceInMinutes } from 'date-fns';

export function formatDate(date: string): string {
  return format(parseISO(date), 'dd MMM yyyy');
}

export function formatDateShort(date: string): string {
  return format(parseISO(date), 'dd MMM');
}

export function formatTime(time: string): string {
  return format(parseISO(time), 'HH:mm');
}

export function today(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

export function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return format(d, 'yyyy-MM-dd');
}

export function sleepDuration(bedtime: string, wakeTime: string): number {
  return differenceInMinutes(parseISO(wakeTime), parseISO(bedtime));
}

export function minutesToHoursStr(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

export function getRecoveryColor(status: string): string {
  switch (status) {
    case 'green': return '#22c55e';
    case 'amber': return '#f59e0b';
    case 'red': return '#ef4444';
    default: return '#6b7280';
  }
}

export function getIntensityColor(intensity: number): string {
  if (intensity <= 3) return '#22c55e';
  if (intensity <= 5) return '#84cc16';
  if (intensity <= 7) return '#f59e0b';
  if (intensity <= 8) return '#f97316';
  return '#ef4444';
}

export function generateId(): string {
  return crypto.randomUUID();
}
