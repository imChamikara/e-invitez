"use client";

import { useNow } from "./useNow";

export interface LiveLabels {
  startsIn: string; // contains {time}
  now: string;
  done: string;
  d: string;
  h: string;
  m: string;
}

const HOUR = 3600_000;

/** Per-item countdown for the programme timeline ("Starts in 2h 15m" → "Happening now" → "Completed"). */
export function LiveStatus({ startsAt, labels }: { startsAt: string; labels: LiveLabels }) {
  const now = useNow(30_000);
  if (now === null) return null;
  const diff = new Date(startsAt).getTime() - now;

  let text: string;
  if (diff <= -3 * HOUR) text = labels.done;
  else if (diff <= 0) text = labels.now;
  else {
    const mins = Math.ceil(diff / 60_000);
    const d = Math.floor(mins / 1440);
    const h = Math.floor((mins % 1440) / 60);
    const m = mins % 60;
    const time = d > 0 ? `${d}${labels.d} ${h}${labels.h}` : h > 0 ? `${h}${labels.h} ${m}${labels.m}` : `${m}${labels.m}`;
    text = labels.startsIn.replace("{time}", time);
  }
  const live = diff <= 0 && diff > -3 * HOUR;
  return (
    <span className={`mt-1 inline-block rounded-full px-3 py-0.5 text-sm font-semibold ${live ? "bg-accent text-on-accent" : "bg-alt text-muted"}`}>
      {text}
    </span>
  );
}
