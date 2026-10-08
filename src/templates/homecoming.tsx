import { CoverImage, DateVenueLines, HeroTitle, OccasionLabel } from "@/components/event/HeroParts";
import { mix } from "@/lib/color";
import { createTemplate } from "./create";

/** Festive rose + leaf green for homecomings and engagements. */
export const homecoming = createTemplate({
  key: "homecoming",
  occasions: ["homecoming", "engagement", "house_warming"],
  defaultTheme: { accent: "#be185d", fontPair: "display" },
  style: { bg: "#fff5f7", fg: "#3b0a22", card: "#ffffff", muted: "#6b2a45", radius: "1.25rem", ornament: "❀" },
  Hero: ({ event, lang, dict, theme }) => (
    <header
      className="px-4 pb-16 pt-14 text-center"
      style={{ background: `linear-gradient(170deg, ${mix(theme.accent, "#000000", 0.35)} 0%, ${theme.accent} 55%, #166534 130%)`, color: theme.onAccent }}
    >
      <p aria-hidden="true" className="text-3xl tracking-[0.4em]">🌸 🌿 🌸</p>
      <OccasionLabel event={event} dict={dict} className="mt-4 opacity-95" />
      {event.coverImageUrl && (
        <CoverImage
          url={event.coverImageUrl}
          className="mx-auto mt-6 h-56 w-56 rounded-full border-8 border-white/80 shadow-xl sm:h-72 sm:w-72"
        />
      )}
      <HeroTitle className="mt-6">{event.title}</HeroTitle>
      <DateVenueLines event={event} lang={lang} dict={dict} className="mt-5" />
      <p aria-hidden="true" className="mt-6 text-3xl tracking-[0.4em]">🌿 🌸 🌿</p>
    </header>
  ),
});
