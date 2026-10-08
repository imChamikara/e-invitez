import { formatLongDate } from "@/lib/format";
import { createTemplate } from "./create";

export const placeholder = createTemplate({
  key: "placeholder",
  occasions: [],
  defaultTheme: { accent: "#9a3412", fontPair: "serif" },
  style: { bg: "#fffaf5", fg: "#1c1917", card: "#ffffff", muted: "#57534e" },
  Hero: ({ event, lang }) => (
    <header className="px-4 py-20 text-center">
      <h1 className="text-4xl">{event.title}</h1>
      {event.eventDate && <p className="mt-4">{formatLongDate(event.eventDate, lang)}</p>}
    </header>
  ),
});
