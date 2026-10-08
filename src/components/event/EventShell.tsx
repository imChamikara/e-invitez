import type { CSSProperties, ReactNode } from "react";
import { featuresFor } from "@/lib/plans";
import { ensureContrast, mix, readableOn } from "@/lib/color";
import { LanguageSwitcher } from "@/components/ui/LanguageSwitcher";
import type { TemplateDefinition, TemplateProps } from "@/templates/types";
import { BrandFooter } from "./EventBody";

export interface TemplateStyle {
  /** Page, text, card and muted-text colours (muted must reach 4.5:1 on bg). */
  bg: string;
  fg: string;
  card: string;
  muted: string;
  /** CSS length for card / button corners. */
  radius?: string;
  /** Decorative glyph(s) under each section title, e.g. "✦". */
  ornament?: string;
  uppercaseTitles?: boolean;
  titleTracking?: string;
}

export interface ResolvedTheme {
  accent: string;
  onAccent: string;
  fontPair: "serif" | "sans" | "display";
}

/** Combines template defaults with the owner's theme options, enforcing plan limits and contrast. */
export function resolveTheme(props: TemplateProps, def: Pick<TemplateDefinition, "defaultTheme">, style: TemplateStyle): ResolvedTheme {
  const { event } = props;
  const custom = featuresFor(event.plan).customThemeColour;
  const wanted = (custom && event.theme.accent) || def.defaultTheme.accent;
  const accent = ensureContrast(wanted, style.bg);
  return {
    accent,
    onAccent: readableOn(accent),
    fontPair: event.theme.fontPair ?? def.defaultTheme.fontPair,
  };
}

/**
 * Common page frame for every template: theme variables, language toggle,
 * preview banner and the free-plan footer. Children = hero + EventBody.
 */
export function EventShell({
  props,
  theme,
  style,
  children,
}: {
  props: TemplateProps;
  theme: ResolvedTheme;
  style: TemplateStyle;
  children: ReactNode;
}) {
  const { event, lang, dict, showBranding } = props;
  const vars = {
    "--accent": theme.accent,
    "--on-accent": theme.onAccent,
    "--bg": style.bg,
    "--fg": style.fg,
    "--card": style.card,
    "--muted": style.muted,
    "--alt": mix(theme.accent, style.bg, 0.92),
    "--line": mix(theme.accent, style.bg, 0.72),
    "--radius": style.radius ?? "1rem",
    "--ornament": style.ornament ? `"${style.ornament}"` : '""',
    "--title-case": style.uppercaseTitles ? "uppercase" : "none",
    "--title-tracking": style.titleTracking ?? "0",
  } as CSSProperties;

  return (
    <div lang={lang} className={`event-root relative fp-${theme.fontPair} min-h-dvh`} style={vars}>
      {!event.isPublished && (
        <p className="bg-ink px-4 py-2 text-center text-sm font-semibold text-white" role="status">
          {dict.event.previewBanner}
        </p>
      )}
      <div className="absolute right-3 top-3 z-20 text-sm">
        <LanguageSwitcher current={lang} label={dict.common.language} className="bg-black/65 text-white" />
      </div>
      <main id="main">{children}</main>
      <BrandFooter dict={dict} show={showBranding} />
    </div>
  );
}
