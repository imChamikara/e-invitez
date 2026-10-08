import { CoverImage, DateVenueLines, HeroTitle, OccasionLabel } from "@/components/event/HeroParts";
import { mix } from "@/lib/color";
import { createTemplate } from "./create";

const CONFETTI =
  "radial-gradient(circle, #f43f5e 0 6px, transparent 7px) 0 0 / 70px 70px, radial-gradient(circle, #facc15 0 5px, transparent 6px) 35px 20px / 70px 70px, radial-gradient(circle, #22d3ee 0 5px, transparent 6px) 15px 45px / 70px 70px";

/** Playful and colourful – works for toddlers and for grown-ups. */
export const birthday = createTemplate({
  key: "birthday",
  occasions: ["birthday", "baby_shower"],
  defaultTheme: { accent: "#6d28d9", fontPair: "display" },
  style: { bg: "#fffbeb", fg: "#1e1b4b", card: "#ffffff", muted: "#4c4a73", radius: "1.5rem", ornament: "★", uppercaseTitles: false },
  Hero: ({ event, lang, dict, theme }) => (
    <header
      className="px-4 pb-14 pt-14 text-center"
      style={{ background: `${CONFETTI}, linear-gradient(160deg, ${mix(theme.accent, "#000000", 0.2)}, ${theme.accent})`, color: theme.onAccent }}
    >
      <p aria-hidden="true" className="text-5xl">🎈🎂🎈</p>
      <OccasionLabel event={event} dict={dict} className="mt-3" />
      <HeroTitle className="mt-3 font-extrabold drop-shadow-[0_3px_0_rgba(0,0,0,0.25)]">{event.title}</HeroTitle>
      {event.coverImageUrl && (
        <CoverImage
          url={event.coverImageUrl}
          className="mx-auto mt-8 h-64 w-64 rotate-2 border-8 border-white shadow-xl sm:h-80 sm:w-80"
          style={{ borderRadius: "1.5rem" }}
        />
      )}
      <div className="mx-auto mt-8 inline-block rounded-3xl bg-white px-6 py-4 text-ink shadow-lg" style={{ color: "#1e1b4b" }}>
        <DateVenueLines event={event} lang={lang} dict={dict} />
      </div>
      <p aria-hidden="true" className="mt-6 text-4xl">🎉 🎁 🎉</p>
    </header>
  ),
});
