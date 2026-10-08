import type { CSSProperties } from "react";
import type { Lang } from "@/config/site";
import type { Dict } from "@/i18n";
import { formatLongDate, formatTime } from "@/lib/format";
import type { EventData } from "@/lib/types";

/** Small reusable hero building blocks shared by the templates. */

export function OccasionLabel({ event, dict, className = "", style }: { event: EventData; dict: Dict; className?: string; style?: CSSProperties }) {
  return (
    <p className={`text-base font-semibold uppercase tracking-[0.2em] ${className}`} style={style}>
      {dict.common.occasions[event.occasionType]}
    </p>
  );
}

export function DateVenueLines({ event, lang, dict, className = "" }: { event: EventData; lang: Lang; dict: Dict; className?: string }) {
  return (
    <div className={className}>
      <p className="heading-font text-xl sm:text-2xl">
        {event.eventDate ? formatLongDate(event.eventDate, lang) : dict.event.dateTbc}
      </p>
      {event.eventDate && <p className="mt-0.5 text-lg opacity-90">{formatTime(event.eventDate, lang)}</p>}
      {event.venueName && <p className="mt-2 text-lg opacity-90">{event.venueName}</p>}
    </div>
  );
}

/** Cover photo: eager + high priority because it is the first thing guests see. */
export function CoverImage({ url, className = "", style }: { url: string | null; className?: string; style?: CSSProperties }) {
  if (!url) return null;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" width={800} height={1000} fetchPriority="high" decoding="async" className={`object-cover ${className}`} style={style} />
  );
}

/** Title that survives long Sinhala / Tamil names on a 360px screen. */
export function HeroTitle({ children, className = "", style }: { children: string; className?: string; style?: CSSProperties }) {
  return (
    <h1 className={`heading-font text-balance text-4xl leading-tight sm:text-6xl ${className}`} style={style}>
      {children}
    </h1>
  );
}
