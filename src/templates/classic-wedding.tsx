import { CoverImage, DateVenueLines, HeroTitle, OccasionLabel } from "@/components/event/HeroParts";
import { createTemplate } from "./create";

/** Elegant ivory + gold, serif lettering, arched photo inside a double frame. */
export const classicWedding = createTemplate({
  key: "classic-wedding",
  occasions: ["wedding", "engagement"],
  defaultTheme: { accent: "#8a6410", fontPair: "serif" },
  style: { bg: "#fbf6ea", fg: "#2b2110", card: "#fffdf6", muted: "#5c4f36", radius: "0.5rem", ornament: "❖", titleTracking: "0.04em" },
  Hero: ({ event, lang, dict, theme }) => (
    <header className="px-4 py-14 text-center">
      <div
        className="rise mx-auto max-w-xl p-2"
        style={{ border: `1px solid ${theme.accent}` }}
      >
        <div className="px-4 py-10" style={{ border: `3px double ${theme.accent}` }}>
          <OccasionLabel event={event} dict={dict} style={{ color: theme.accent }} />
          <p className="mt-2 text-lg italic text-muted">{dict.event.invitedTo}</p>
          <HeroTitle className="mt-6" style={{ color: theme.accent }}>{event.title}</HeroTitle>
          <p aria-hidden="true" className="my-5 text-xl tracking-[0.6em]" style={{ color: theme.accent }}>✦ ✦ ✦</p>
          <DateVenueLines event={event} lang={lang} dict={dict} />
          {event.coverImageUrl && (
            <CoverImage
              url={event.coverImageUrl}
              className="mx-auto mt-8 h-72 w-56 sm:h-96 sm:w-72"
              style={{ borderRadius: "9999px 9999px 0 0", border: `4px solid ${theme.accent}` }}
            />
          )}
        </div>
      </div>
    </header>
  ),
});
