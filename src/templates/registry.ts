import { bigGirl } from "./big-girl";
import { birthday } from "./birthday";
import { classicWedding } from "./classic-wedding";
import { dana } from "./dana";
import { homecoming } from "./homecoming";
import { modernWedding } from "./modern-wedding";
import type { TemplateDefinition } from "./types";

/**
 * Template registry. To add a template: create src/templates/<name>.tsx with
 * createTemplate({...}), then add ONE line to this list (and its name to the
 * i18n "templates" keys + a demo sample in src/lib/demo-data.ts).
 */
export const TEMPLATES: TemplateDefinition[] = [classicWedding, modernWedding, homecoming, bigGirl, birthday, dana];

const byKey = new Map(TEMPLATES.map((t) => [t.key, t]));

/** Unknown keys fall back to the first template so old events never break. */
export function getTemplate(key: string): TemplateDefinition {
  return byKey.get(key) ?? TEMPLATES[0];
}
