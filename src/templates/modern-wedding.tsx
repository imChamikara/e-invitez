import { CoverImage, DateVenueLines, HeroTitle, OccasionLabel } from "@/components/event/HeroParts";
import { createTemplate } from "./create";

/** Minimal and airy: full-width photo, big light type, thin rules. */
export const modernWedding = createTemplate({
  key: "modern-wedding",
  occasions: ["wedding", "engagement"],
  defaultTheme: { accent: "#0f766e", fontPair: "sans" },
  style: { bg: "#ffffff", fg: "#111827", card: "#f9fafb", muted: "#4b5563", radius: "0.25rem", uppercaseTitles: true, titleTracking: "0.18em" },
  Hero: ({ event, lang, dict, theme }) => (
    <header>
      {event.coverImageUrl ? (
        <CoverImage url={event.coverImageUrl} className="h-[60vh] max-h-[560px] w-full" />
      ) : (
        <div className="h-24" />
      )}
      <div className="mx-auto max-w-xl px-6 py-10">
        <OccasionLabel event={event} dict={dict} style={{ color: theme.accent }} />
        <HeroTitle className="mt-4 font-light">{event.title}</HeroTitle>
        <hr className="my-6 w-16 border-t-2" style={{ borderColor: theme.accent }} />
        <DateVenueLines event={event} lang={lang} dict={dict} />
      </div>
    </header>
  ),
});
