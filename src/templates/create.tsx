import type { ComponentType } from "react";
import { EventBody, type SectionKey } from "@/components/event/EventBody";
import { EventShell, resolveTheme, type ResolvedTheme, type TemplateStyle } from "@/components/event/EventShell";
import { siteConfig } from "@/config/site";
import type { OccasionType } from "@/lib/types";
import type { TemplateDefinition, TemplateProps } from "./types";

export interface TemplateSpec {
  key: string;
  occasions: OccasionType[];
  defaultTheme: TemplateDefinition["defaultTheme"];
  style: TemplateStyle;
  /** Order of the shared sections (defaults to the standard order). */
  order?: SectionKey[];
  /** The only part that is really unique per template. */
  Hero: ComponentType<TemplateProps & { theme: ResolvedTheme; style: TemplateStyle }>;
}

/** Builds a complete template from a style + hero. Everything else is shared. */
export function createTemplate(spec: TemplateSpec): TemplateDefinition {
  function Template(props: TemplateProps) {
    const theme = resolveTheme(props, spec, spec.style);
    const shareUrl = props.demo ? `${siteConfig.domain}/demo/${spec.key}` : undefined;
    return (
      <EventShell props={props} theme={theme} style={spec.style}>
        <spec.Hero {...props} theme={theme} style={spec.style} />
        <EventBody {...props} order={spec.order} shareUrl={shareUrl} />
      </EventShell>
    );
  }
  return { key: spec.key, occasions: spec.occasions, defaultTheme: spec.defaultTheme, Component: Template };
}
