import Link from "next/link";
import type { ReactNode } from "react";
import { siteConfig } from "@/config/site";
import { eventUrl, safeUrl } from "@/lib/event-utils";
import { formatLongDate, formatTime } from "@/lib/format";
import { format } from "@/i18n";
import type { TemplateProps } from "@/templates/types";
import { Countdown } from "./Countdown";
import { LiveStatus } from "./LiveStatus";
import { RsvpForm } from "./RsvpForm";
import { Section } from "./Section";
import { ShareButtons } from "./ShareButtons";
import { WishForm } from "./WishForm";

export type SectionKey = "greeting" | "countdown" | "story" | "timeline" | "venue" | "gallery" | "rsvp" | "wishes" | "share";
export const DEFAULT_ORDER: SectionKey[] = ["greeting", "countdown", "story", "timeline", "venue", "gallery", "rsvp", "wishes", "share"];

/**
 * The shared guest-facing sections. Templates render their own hero and then
 * drop in <EventBody/>; styling comes entirely from the CSS variables the
 * template sets on its wrapper (--accent, --bg, --card, --radius, --ornament …).
 */
export function EventBody({
  event,
  lang,
  dict,
  guest,
  demo,
  order = DEFAULT_ORDER,
  shareUrl,
}: TemplateProps & { order?: SectionKey[]; shareUrl?: string }) {
  const d = dict.event;
  const url = shareUrl ?? eventUrl(event.slug);
  let n = 0; // alternates section backgrounds
  const alt = () => n++ % 2 === 1;

  const blocks: Record<SectionKey, () => ReactNode> = {
    greeting: () =>
      guest ? (
        <Section key="greeting">
          <p className="card heading-font p-5 text-center text-xl">
            {format(d.dear, { name: guest.name })}{" "}
            {guest.expectedCount > 1 ? format(d.expectMany, { count: guest.expectedCount }) : d.expectOne}
          </p>
        </Section>
      ) : null,

    countdown: () =>
      event.eventDate ? (
        <Section key="countdown" id="countdown" title={d.countdown.title} alt={alt()}>
          <Countdown target={event.eventDate} labels={d.countdown} />
        </Section>
      ) : null,

    story: () =>
      event.story ? (
        <Section key="story" id="story" title={d.story} alt={alt()}>
          <p className="whitespace-pre-line text-center leading-relaxed">{event.story}</p>
        </Section>
      ) : null,

    timeline: () =>
      event.sections.length ? (
        <Section key="timeline" id="timeline" title={d.timeline.title} alt={alt()}>
          <ol className="space-y-4">
            {event.sections.map((s) => (
              <li key={s.id} className="card p-4">
                {s.startsAt && (
                  <p className="font-semibold text-accent">
                    {formatTime(s.startsAt, lang)}
                    <span className="font-normal text-muted"> · {formatLongDate(s.startsAt, lang)}</span>
                  </p>
                )}
                <h3 className="heading-font text-xl">{s.title}</h3>
                {s.description && <p className="mt-1 text-muted">{s.description}</p>}
                {s.startsAt && <LiveStatus startsAt={s.startsAt} labels={d.timeline} />}
              </li>
            ))}
          </ol>
        </Section>
      ) : null,

    venue: () => {
      if (!event.venueName && !event.venueAddress) return null;
      const link =
        safeUrl(event.mapsUrl) ??
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${event.venueName} ${event.venueAddress}`.trim())}`;
      return (
        <Section key="venue" id="venue" title={d.venue.title} alt={alt()}>
          <div className="card p-5 text-center">
            {event.venueName && <h3 className="heading-font text-2xl">{event.venueName}</h3>}
            {event.venueAddress && <p className="mt-1 text-muted">{event.venueAddress}</p>}
            <a href={link} target="_blank" rel="noopener noreferrer" className="btn-accent mt-4">
              📍 {d.venue.openMaps}
            </a>
          </div>
        </Section>
      );
    },

    gallery: () =>
      event.photos.length ? (
        <Section key="gallery" id="gallery" title={d.gallery.title} alt={alt()}>
          <ul className="grid grid-cols-2 gap-2">
            {event.photos.map((p, i) => (
              <li key={p.id}>
                <a href={p.url} target="_blank" rel="noopener noreferrer" className="block overflow-hidden" style={{ borderRadius: "var(--radius)" }}>
                  {/* Plain <img>: photos are pre-compressed WebP, lazy-loaded, no JS needed. */}
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={p.url}
                    alt={format(d.gallery.photo, { n: i + 1 })}
                    width={800}
                    height={600}
                    loading="lazy"
                    decoding="async"
                    className="aspect-[4/3] w-full bg-alt object-cover"
                  />
                </a>
              </li>
            ))}
          </ul>
        </Section>
      ) : null,

    rsvp: () =>
      event.rsvpEnabled ? (
        <Section key="rsvp" id="rsvp" title={d.rsvp.title} alt={alt()}>
          <RsvpForm slug={event.slug} guest={guest} demo={demo} labels={d.rsvp} />
        </Section>
      ) : null,

    wishes: () =>
      event.wishesEnabled ? (
        <Section key="wishes" id="wishes" title={d.wishes.title} alt={alt()}>
          {event.wishes.length ? (
            <ul className="mb-6 space-y-3">
              {event.wishes.map((w) => (
                <li key={w.id} className="card p-4">
                  <p className="whitespace-pre-line">{w.message}</p>
                  <p className="mt-1 font-semibold text-accent">— {w.name}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mb-6 text-center text-muted">{d.wishes.empty}</p>
          )}
          <WishForm slug={event.slug} demo={demo} labels={d.wishes} />
        </Section>
      ) : null,

    share: () => (
      <Section key="share" id="share" title={d.share.title} alt={alt()}>
        <ShareButtons url={url} text={format(d.share.text, { title: event.title })} labels={d.share} />
      </Section>
    ),
  };

  return <>{order.map((k) => blocks[k]())}</>;
}

/** "Made with {brand}" – shown for free-plan events. */
export function BrandFooter({ dict, show }: { dict: TemplateProps["dict"]; show: boolean }) {
  if (!show) return <div className="h-6" />;
  return (
    <footer className="px-4 py-8 text-center text-sm text-muted">
      <Link href="/" className="tap inline-flex items-center underline">
        {format(dict.common.madeWith, { brand: siteConfig.name })}
      </Link>
    </footer>
  );
}
