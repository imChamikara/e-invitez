import { CoverImage, DateVenueLines, HeroTitle, OccasionLabel } from "@/components/event/HeroParts";
import { createTemplate } from "./create";

/** Calm, dignified and simple – generous whitespace, soft saffron accent, no loud decoration. */
export const dana = createTemplate({
  key: "dana",
  occasions: ["dana"],
  defaultTheme: { accent: "#8a5a00", fontPair: "serif" },
  style: { bg: "#faf7f0", fg: "#292524", card: "#ffffff", muted: "#57534e", radius: "0.75rem", ornament: "🪷" },
  Hero: ({ event, lang, dict, theme }) => (
    <header className="px-6 pb-12 pt-20 text-center">
      <p aria-hidden="true" className="text-5xl">🪷</p>
      <OccasionLabel event={event} dict={dict} className="mt-4" style={{ color: theme.accent }} />
      <HeroTitle className="mx-auto mt-5 max-w-lg text-3xl sm:text-5xl">{event.title}</HeroTitle>
      <hr className="mx-auto my-8 w-24 border-t" style={{ borderColor: theme.accent }} />
      <DateVenueLines event={event} lang={lang} dict={dict} />
      {event.coverImageUrl && (
        <CoverImage url={event.coverImageUrl} className="mx-auto mt-8 h-64 w-64 rounded-full" />
      )}
    </header>
  ),
});
