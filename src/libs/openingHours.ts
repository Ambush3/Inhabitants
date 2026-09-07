const DAY_NAMES = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];

type TimeRange = { start: number; end: number };

function dayIndex(value: string): number {
  return DAY_NAMES.findIndex((day) => day.toLowerCase() === value.toLowerCase());
}

function parseTime(value: string): number | null {
  const match = value.trim().match(/^(\d{1,2})(?::(\d{2}))?\s*(am|pm)?$/i);
  if (!match) return null;
  let hour = Number(match[1]);
  const minute = Number(match[2] ?? '0');
  const meridiem = match[3]?.toLowerCase();
  if (minute > 59 || hour > 24 || (meridiem && hour > 12)) return null;
  if (meridiem === 'am' && hour === 12) hour = 0;
  if (meridiem === 'pm' && hour !== 12) hour += 12;
  if (hour === 24 && minute !== 0) return null;
  return hour * 60 + minute;
}

function parseTimeRanges(value: string): TimeRange[] {
  return value.split(',').flatMap((range) => {
    const [startText, endText] = range.trim().split('-');
    if (!startText || !endText) return [];
    const start = parseTime(startText);
    const end = parseTime(endText);
    return start == null || end == null ? [] : [{ start, end }];
  });
}

function parseDays(value: string): number[] {
  const normalized = value.replace(/\s/g, '');
  if (!normalized) return DAY_NAMES.map((_, index) => index);
  return normalized.split(',').flatMap((part) => {
    const [from, to] = part.split('-');
    const start = dayIndex(from);
    const end = dayIndex(to ?? from);
    if (start < 0 || end < 0) return [];
    if (start <= end) return DAY_NAMES.map((_, index) => index).filter((index) => index >= start && index <= end);
    return DAY_NAMES.map((_, index) => index).filter((index) => index >= start || index <= end);
  });
}

/** Returns true when clearly open, false when clearly closed, or null when unknown. */
export function isOpenNow(hours: string | null | undefined, now = new Date()): boolean | null {
  if (!hours?.trim()) return null;
  const normalized = hours.trim().toLowerCase();
  if (normalized === '24/7' || normalized === 'always_open') return true;
  if (/^(off|closed|unknown|opening_hours unavailable)$/.test(normalized)) return false;

  const day = (now.getDay() + 6) % 7;
  const minute = now.getHours() * 60 + now.getMinutes();
  let foundSchedule = false;

  for (const clause of hours.split(';')) {
    const trimmed = clause.trim();
    if (!trimmed) continue;
    const match = trimmed.match(/^(?:(Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(Mo|Tu|We|Th|Fr|Sa|Su))?(?:\s*,\s*(?:Mo|Tu|We|Th|Fr|Sa|Su)(?:\s*-\s*(?:Mo|Tu|We|Th|Fr|Sa|Su))?)*)?\s+(.+)$/i);
    const timeText = match?.[3] ?? trimmed;
    const daysText = match?.[1] ? trimmed.slice(0, trimmed.lastIndexOf(timeText)).trim() : '';
    const days = parseDays(daysText);
    const ranges = /^(off|closed)$/i.test(timeText) ? [] : parseTimeRanges(timeText);
    if (ranges.length === 0 && !/^(off|closed)$/i.test(timeText)) continue;
    foundSchedule = true;
    if (!days.includes(day)) continue;
    for (const range of ranges) {
      if (range.start <= range.end && minute >= range.start && minute < range.end) return true;
      if (range.start > range.end && (minute >= range.start || minute < range.end)) return true;
    }
  }
  return foundSchedule ? false : null;
}

export function openStatusLabel(hours: string | null | undefined, now = new Date()): string | null {
  const status = isOpenNow(hours, now);
  return status == null ? null : status ? 'Open now' : 'Closed now';
}
