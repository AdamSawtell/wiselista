/** Capture brief — shared shot-list logic for mobile guided shoot. */

import { getPlanConfig, normalizePlanTier, type PlanTier } from "./plans";
import { exteriorSlotLabel } from "./shotRecipes";
import type { RoomType } from "../types";

export type CaptureBriefSlot = {
  id: string;
  label: string;
  room_type: RoomType;
  required: boolean;
  sequence: number;
};

export type CaptureBrief = {
  template_id: string;
  bedrooms: number;
  bathrooms: number;
  include_study: boolean;
  include_dining: boolean;
  include_laundry: boolean;
  include_garage: boolean;
  slots: CaptureBriefSlot[];
};

export type BriefTemplateId =
  | "apartment_1"
  | "apartment_2"
  | "house_3"
  | "house_4_study"
  | "house_5"
  | "townhouse"
  | "custom";

export const BRIEF_TEMPLATES = [
  { id: "apartment_1" as const, name: "Apartment (1 bed)", bedrooms: 1, bathrooms: 1 },
  { id: "apartment_2" as const, name: "Apartment (2 bed)", bedrooms: 2, bathrooms: 1 },
  { id: "townhouse" as const, name: "Townhouse (3 bed)", bedrooms: 3, bathrooms: 2, include_garage: true },
  { id: "house_3" as const, name: "House (3 bed)", bedrooms: 3, bathrooms: 2, include_laundry: true },
  {
    id: "house_4_study" as const,
    name: "House (4 bed + study)",
    bedrooms: 4,
    bathrooms: 2,
    include_study: true,
    include_dining: true,
    include_laundry: true,
  },
  {
    id: "house_5" as const,
    name: "Large house (5 bed)",
    bedrooms: 5,
    bathrooms: 3,
    include_dining: true,
    include_laundry: true,
    include_garage: true,
  },
];

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function bedroomLabel(index: number, total: number): string {
  if (total === 1) return "Bedroom";
  if (index === 0) return "Main bedroom";
  return `Bedroom ${index + 1}`;
}

function bathroomLabel(index: number, total: number): string {
  if (total === 1) return "Bathroom";
  if (index === 0) return "Main bathroom";
  if (index === 1 && total >= 2) return "Ensuite";
  return `Bathroom ${index + 1}`;
}

export function buildCaptureBrief(options: {
  template_id: string;
  bedrooms: number;
  bathrooms: number;
  include_study?: boolean;
  include_dining?: boolean;
  include_laundry?: boolean;
  include_garage?: boolean;
}): CaptureBrief {
  const bedrooms = clampInt(options.bedrooms, 0, 8);
  const bathrooms = clampInt(options.bathrooms, 1, 5);
  const include_study = Boolean(options.include_study);
  const include_dining = Boolean(options.include_dining);
  const include_laundry = Boolean(options.include_laundry);
  const include_garage = Boolean(options.include_garage);

  const slots: CaptureBriefSlot[] = [];
  let seq = 0;
  const add = (id: string, label: string, room_type: RoomType, required = true) => {
    slots.push({ id, label, room_type, required, sequence: seq++ });
  };

  add("exterior_front", exteriorSlotLabel("exterior_front", options.template_id), "exterior");
  add("living_room", "Living room", "living_room");
  add("kitchen", "Kitchen", "kitchen");
  if (include_dining) add("dining_room", "Dining room", "living_room");
  for (let i = 0; i < bedrooms; i++) add(`bedroom_${i + 1}`, bedroomLabel(i, bedrooms), "bedroom");
  if (include_study) add("study", "Study / home office", "living_room");
  for (let i = 0; i < bathrooms; i++) add(`bathroom_${i + 1}`, bathroomLabel(i, bathrooms), "bathroom");
  if (include_laundry) add("laundry", "Laundry", "other");
  if (include_garage) add("garage", "Garage / carport", "exterior", false);
  add("exterior_rear", exteriorSlotLabel("exterior_rear", options.template_id), "exterior", false);

  return {
    template_id: options.template_id,
    bedrooms,
    bathrooms,
    include_study,
    include_dining,
    include_laundry,
    include_garage,
    slots,
  };
}

export function briefFromTemplate(templateId: BriefTemplateId | string): CaptureBrief {
  const t = BRIEF_TEMPLATES.find((x) => x.id === templateId) ?? BRIEF_TEMPLATES[3];
  return buildCaptureBrief({
    template_id: t.id,
    bedrooms: t.bedrooms,
    bathrooms: t.bathrooms,
    include_study: "include_study" in t ? t.include_study : false,
    include_dining: "include_dining" in t ? t.include_dining : false,
    include_laundry: "include_laundry" in t ? t.include_laundry : false,
    include_garage: "include_garage" in t ? t.include_garage : false,
  });
}

export function defaultCaptureBrief(): CaptureBrief {
  return briefFromTemplate("house_3");
}

export function parseCaptureBrief(raw: unknown): CaptureBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.slots)) return null;

  const slots = o.slots
    .map((s, i) => {
      if (!s || typeof s !== "object") return null;
      const slot = s as Record<string, unknown>;
      return {
        id: typeof slot.id === "string" ? slot.id : `slot_${i}`,
        label: typeof slot.label === "string" ? slot.label : "Photo",
        room_type: (typeof slot.room_type === "string" ? slot.room_type : "other") as RoomType,
        required: slot.required !== false,
        sequence: typeof slot.sequence === "number" ? slot.sequence : i,
      };
    })
    .filter(Boolean) as CaptureBriefSlot[];

  if (!slots.length) return null;
  slots.sort((a, b) => a.sequence - b.sequence);

  return {
    template_id: typeof o.template_id === "string" ? o.template_id : "custom",
    bedrooms: typeof o.bedrooms === "number" ? o.bedrooms : 3,
    bathrooms: typeof o.bathrooms === "number" ? o.bathrooms : 2,
    include_study: Boolean(o.include_study),
    include_dining: Boolean(o.include_dining),
    include_laundry: Boolean(o.include_laundry),
    include_garage: Boolean(o.include_garage),
    slots,
  };
}

export function resolveCaptureBrief(raw: unknown): CaptureBrief {
  return parseCaptureBrief(raw) ?? defaultCaptureBrief();
}

export function orderedSlots(brief: CaptureBrief): CaptureBriefSlot[] {
  return [...brief.slots].sort((a, b) => a.sequence - b.sequence);
}

export function filledSlotIdSet(ids: Iterable<string | null | undefined>): Set<string> {
  const filled = new Set<string>();
  for (const id of ids) {
    if (id) filled.add(id);
  }
  return filled;
}

/** First required empty slot, else first empty optional, else 0. */
export function firstIncompleteStepIndex(
  slots: Array<{ id: string; required: boolean }>,
  filledSlotIds: Iterable<string | null | undefined>
): number {
  if (!slots.length) return 0;
  const filled = filledSlotIdSet(filledSlotIds);
  const requiredMiss = slots.findIndex((s) => s.required && !filled.has(s.id));
  if (requiredMiss >= 0) return requiredMiss;
  const anyMiss = slots.findIndex((s) => !filled.has(s.id));
  return anyMiss >= 0 ? anyMiss : 0;
}

export function validateBriefForPlan(
  brief: CaptureBrief,
  planTier: PlanTier | string | null | undefined
): { ok: true } | { ok: false; error: string } {
  const plan = getPlanConfig(normalizePlanTier(planTier as PlanTier));
  const required = brief.slots.filter((s) => s.required).length;
  const total = brief.slots.length;
  if (required < 1) return { ok: false, error: "Add at least one required photo." };
  if (required > plan.maxPhotos) {
    return { ok: false, error: `${plan.name} allows up to ${plan.maxPhotos} photos.` };
  }
  if (total > plan.maxPhotos) {
    return { ok: false, error: `Shot list has ${total} slots but ${plan.name} allows ${plan.maxPhotos}.` };
  }
  return { ok: true };
}
