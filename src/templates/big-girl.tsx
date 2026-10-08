import { CoverImage, DateVenueLines, HeroTitle, OccasionLabel } from "@/components/event/HeroParts";
import { createTemplate } from "./create";

/** Tasteful and warm: soft florals, rounded shapes, family-friendly colours. */
export const bigGirl = createTemplate({
  key: "big-girl",
  occasions: ["big_girl"],
  defaultTheme: { accent: "#b4380f", fontPair: "display" },
  style: { bg: "#fff8ee", fg: "#431a07", card: "#ffffff", muted: "#7a3b1d", radius: "1.75rem", ornament: "✿" },
  Hero: ({ event, lang, dict, theme }) => (
    <header
      className="relative overflow-hidden px-4 pb-14 pt-14 text-center"
      style={{
        background:
          "radial-gradient(circle at 12% 8%, #fde0e6 0 90px, transparent 91px), radial-gradient(circle at 92% 22%, #fde7c0 0 110px, transparent 111px), radial-gradient(circle at 8% 92%, #fcd5d0 0 80px, transparent 81px), #fff3e2",
      }}
    >
      <p aria-hidden="true" className="text-4xl">🌺</p>
      <OccasionLabel event={event} dict={dict} className="mt-2" style={{ color: theme.accent }} />
      <p className="mt-2 text-lg italic text-muted">{dict.event.invitedTo}</p>
      <HeroTitle className="mt-4" style={{ color: theme.accent }}>{event.title}</HeroTitle>
      {event.coverImageUrl && (
        <CoverImage
          url={event.coverImageUrl}
          className="mx-auto mt-8 h-72 w-64 shadow-lg sm:h-96 sm:w-80"
          style={{ borderRadius: "48% 52% 46% 54% / 40% 40% 60% 60%", border: `6px solid ${theme.accent}` }}
        />
      )}
      <DateVenueLines event={event} lang={lang} dict={dict} className="mt-8" />
      <p aria-hidden="true" className="mt-5 text-3xl tracking-[0.5em]">🌼 🌸 🌼</p>
    </header>
  ),
});
