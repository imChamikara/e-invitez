import type { ComponentType } from "react";
import type { Lang } from "@/config/site";
import type { Dict } from "@/i18n";
import type { EventData, EventTheme, GuestInfo, OccasionType } from "@/lib/types";

/** Every template receives exactly these props. */
export interface TemplateProps {
  /** Event with text already localised for `lang`. */
  event: EventData;
  lang: Lang;
  dict: Dict;
  guest: GuestInfo | null;
  /** Demo / preview mode: forms are shown but nothing is saved. */
  demo: boolean;
  /** Show the "Made with {brand}" footer (free plan). */
  showBranding: boolean;
}

export interface TemplateDefinition {
  key: string;
  /** Occasions this template suits (used to suggest templates in the wizard). */
  occasions: OccasionType[];
  defaultTheme: Required<EventTheme>;
  Component: ComponentType<TemplateProps>;
}
