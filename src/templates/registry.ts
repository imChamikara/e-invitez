import { placeholder } from "./placeholder";
import type { TemplateDefinition } from "./types";

/** Register every template here: one line per template. */
export const TEMPLATES: TemplateDefinition[] = [placeholder];

const byKey = new Map(TEMPLATES.map((t) => [t.key, t]));

export function getTemplate(key: string): TemplateDefinition {
  return byKey.get(key) ?? TEMPLATES[0];
}
