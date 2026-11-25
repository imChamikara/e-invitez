/** Maximum lengths, shared by the server schema (lib/validation) and the editor's browser checks. */
export const TEXT_LIMITS = {
  title: 160,
  story: 4000,
  venueName: 200,
  venueAddress: 400,
  mapsUrl: 500,
  sectionTitle: 160,
  sectionDescription: 1000,
  password: 100,
} as const;

/** Length in Unicode characters, the way the server schema counts it (an emoji is 1, not 2). */
export const textLength = (value: string) => [...value].length;
