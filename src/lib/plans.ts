import type { PlanKey } from "@/config/site";

/** Feature gating by plan. No payments yet – plan is set manually on profiles. */
export interface PlanFeatures {
  maxPhotos: number;
  maxGuests: number;
  maxSections: number;
  removeBranding: boolean;
  passwordProtection: boolean;
  csvExport: boolean;
  customThemeColour: boolean;
}

export const PLAN_FEATURES: Record<PlanKey, PlanFeatures> = {
  free: {
    maxPhotos: 6,
    maxGuests: 30,
    maxSections: 6,
    removeBranding: false,
    passwordProtection: false,
    csvExport: false,
    customThemeColour: false,
  },
  standard: {
    maxPhotos: 20,
    maxGuests: 200,
    maxSections: 15,
    removeBranding: true,
    passwordProtection: true,
    csvExport: true,
    customThemeColour: true,
  },
  premium: {
    maxPhotos: 60,
    maxGuests: 1000,
    maxSections: 30,
    removeBranding: true,
    passwordProtection: true,
    csvExport: true,
    customThemeColour: true,
  },
};

export function featuresFor(plan: PlanKey): PlanFeatures {
  return PLAN_FEATURES[plan] ?? PLAN_FEATURES.free;
}
