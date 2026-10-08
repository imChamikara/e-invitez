import { ImageResponse } from "next/og";
import { siteConfig } from "@/config/site";
import { getDict } from "@/i18n";
import { localizeEvent } from "@/lib/event-utils";
import { getEventBySlug } from "@/lib/events";
import { formatLongDate } from "@/lib/format";
import { getTemplate } from "@/templates/registry";

export const alt = "Event invitation";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

async function font(file: string): Promise<ArrayBuffer> {
  return fetch(new URL(`../../../assets/fonts/${file}`, import.meta.url)).then((r) => r.arrayBuffer());
}

/** Per-event WhatsApp / social preview: names, date, occasion – in the event's default language. */
export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const raw = await getEventBySlug(slug);
  const lang = raw?.languageDefault ?? "en";
  const event = raw ? localizeEvent(raw, lang) : null;
  const dict = getDict(lang);
  const accent = event?.theme.accent ?? getTemplate(raw?.templateKey ?? "").defaultTheme.accent;

  const title = event?.title ?? siteConfig.name;
  const occasion = event ? dict.common.occasions[event.occasionType] : "";
  const when = event?.eventDate ? formatLongDate(event.eventDate, lang) : "";
  const where = event?.venueName ?? "";

  const [latin, si, ta] = await Promise.all([font("og-latin.ttf"), font("og-si.ttf"), font("og-ta.ttf")]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 64,
          color: "#ffffff",
          background: `linear-gradient(135deg, #1c1917 0%, ${accent} 140%)`,
          fontFamily: "Roboto, Noto Sans Sinhala, Noto Sans Tamil",
        }}
      >
        <div style={{ fontSize: 34, letterSpacing: 4, textTransform: "uppercase", opacity: 0.85, display: "flex" }}>
          {occasion}
        </div>
        <div style={{ fontSize: title.length > 28 ? 72 : 96, fontWeight: 700, margin: "28px 0", lineHeight: 1.3, display: "flex" }}>
          {title}
        </div>
        {when && <div style={{ fontSize: 40, display: "flex" }}>{when}</div>}
        {where && <div style={{ fontSize: 32, opacity: 0.85, marginTop: 12, display: "flex" }}>{where}</div>}
        <div style={{ position: "absolute", bottom: 32, fontSize: 26, opacity: 0.7, display: "flex" }}>{siteConfig.name}</div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Roboto", data: latin, weight: 700, style: "normal" },
        { name: "Noto Sans Sinhala", data: si, weight: 700, style: "normal" },
        { name: "Noto Sans Tamil", data: ta, weight: 700, style: "normal" },
      ],
    },
  );
}
