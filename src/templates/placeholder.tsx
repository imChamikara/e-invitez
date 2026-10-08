import { formatLongDate } from "@/lib/format";
import type { TemplateDefinition, TemplateProps } from "./types";

function Placeholder({ event, lang }: TemplateProps) {
  return (
    <main className="event-root fp-serif min-h-dvh p-8 text-center">
      <h1 className="text-4xl">{event.title}</h1>
      {event.eventDate && <p className="mt-4">{formatLongDate(event.eventDate, lang)}</p>}
    </main>
  );
}

export const placeholder: TemplateDefinition = {
  key: "placeholder",
  occasions: [],
  defaultTheme: { accent: "#9a3412", fontPair: "serif" },
  Component: Placeholder,
};
