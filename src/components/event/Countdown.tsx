"use client";

import { useNow } from "./useNow";

export interface CountdownLabels {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
  started: string;
  ended: string;
}

const HALF_DAY = 12 * 3600_000;

/** Live countdown to `target` (ISO). Falls back to a message once the event starts. */
export function Countdown({ target, labels }: { target: string; labels: CountdownLabels }) {
  const now = useNow(1000);
  const end = new Date(target).getTime();
  const diff = now === null ? null : end - now;

  if (diff !== null && diff <= 0) {
    return (
      <p className="heading-font text-center text-2xl" role="status">
        {-diff < HALF_DAY ? labels.started : labels.ended}
      </p>
    );
  }

  const total = diff === null ? null : Math.floor(diff / 1000);
  const parts: [string, number | null][] = [
    [labels.days, total === null ? null : Math.floor(total / 86400)],
    [labels.hours, total === null ? null : Math.floor((total % 86400) / 3600)],
    [labels.minutes, total === null ? null : Math.floor((total % 3600) / 60)],
    [labels.seconds, total === null ? null : total % 60],
  ];

  return (
    <div className="grid grid-cols-4 gap-2 text-center" role="timer" aria-label={labels.days}>
      {parts.map(([label, value]) => (
        <div key={label} className="card px-1 py-3">
          <div className="heading-font text-3xl font-bold tabular-nums text-accent sm:text-4xl">
            {value === null ? "–" : String(value).padStart(2, "0")}
          </div>
          <div className="mt-1 text-sm text-muted">{label}</div>
        </div>
      ))}
    </div>
  );
}
