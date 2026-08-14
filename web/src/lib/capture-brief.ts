/**
 * Capture brief — agent-defined shot list for a property.
 * Drives customer magic link, guided mobile shoot, and submit checklist.
 */

import { getPlanConfig, type PlanTier } from "@/lib/plans";
import { exteriorSlotLabel } from "@/lib/shot-recipes";

export type ClaidRoomType =
  | "living_room"
  | "kitchen"
  | "bedroom"
  | "bathroom"
  | "exterior"
  | "other";

export type CaptureBriefSlot = {
  id: string;
  label: string;
  room_type: ClaidRoomType;
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

export type BriefTemplate = {
  id: BriefTemplateId;
  name: string;
  description: string;
  bedrooms: number;
  bathrooms: number;
  include_study?: boolean;
  include_dining?: boolean;
  include_laundry?: boolean;
  include_garage?: boolean;
};

export const BRIEF_TEMPLATES: BriefTemplate[] = [
  {
    id: "apartment_1",
    name: "Apartment (1 bed)",
    description: "Front, living, kitchen, bedroom, bathroom",
    bedrooms: 1,
    bathrooms: 1,
  },
  {
    id: "apartment_2",
    name: "Apartment (2 bed)",
    description: "Front, living, kitchen, 2 bedrooms, bathroom",
    bedrooms: 2,
    bathrooms: 1,
  },
  {
    id: "townhouse",
    name: "Townhouse (3 bed)",
    description: "Front, living, kitchen, 3 beds, 2 baths, garage",
    bedrooms: 3,
    bathrooms: 2,
    include_garage: true,
  },
  {
    id: "house_3",
    name: "House (3 bed)",
    description: "Front, living, kitchen, 3 beds, 2 baths, laundry",
    bedrooms: 3,
    bathrooms: 2,
    include_laundry: true,
  },
  {
    id: "house_4_study",
    name: "House (4 bed + study)",
    description: "Full family home with study and front/rear exterior",
    bedrooms: 4,
    bathrooms: 2,
    include_study: true,
    include_dining: true,
    include_laundry: true,
  },
  {
    id: "house_5",
    name: "Large house (5 bed)",
    description: "5 bedrooms, 3 bathrooms, dining, laundry, garage",
    bedrooms: 5,
    bathrooms: 3,
    include_dining: true,
    include_laundry: true,
    include_garage: true,
  },
  {
    id: "custom",
    name: "Custom",
    description: "Set bedrooms, bathrooms, and optional rooms yourself",
    bedrooms: 3,
    bathrooms: 2,
  },
];

export type BriefBuildOptions = {
  template_id: BriefTemplateId | string;
  bedrooms: number;
  bathrooms: number;
  include_study?: boolean;
  include_dining?: boolean;
  include_laundry?: boolean;
  include_garage?: boolean;
};

function clampInt(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

function bathroomLabel(index: number, total: number): string {
  if (total === 1) return "Bathroom";
  if (index === 0) return "Main bathroom";
  if (index === 1 && total >= 2) return "Ensuite";
  return `Bathroom ${index + 1}`;
}

function bedroomLabel(index: number, total: number): string {
  if (total === 1) return "Bedroom";
  if (index === 0) return "Main bedroom";
  return `Bedroom ${index + 1}`;
}

/** Build ordered shot slots from property configuration. */
export function buildCaptureBrief(options: BriefBuildOptions): CaptureBrief {
  const bedrooms = clampInt(options.bedrooms, 0, 8);
  const bathrooms = clampInt(options.bathrooms, 1, 5);
  const include_study = Boolean(options.include_study);
  const include_dining = Boolean(options.include_dining);
  const include_laundry = Boolean(options.include_laundry);
  const include_garage = Boolean(options.include_garage);

  const slots: CaptureBriefSlot[] = [];
  let seq = 0;

  const add = (id: string, label: string, room_type: ClaidRoomType, required = true) => {
    slots.push({ id, label, room_type, required, sequence: seq++ });
  };

  add("exterior_front", exteriorSlotLabel("exterior_front", options.template_id), "exterior");
  add("living_room", "Living room", "living_room");
  add("kitchen", "Kitchen", "kitchen");
  if (include_dining) add("dining_room", "Dining room", "living_room");

  for (let i = 0; i < bedrooms; i++) {
    add(`bedroom_${i + 1}`, bedroomLabel(i, bedrooms), "bedroom");
  }

  if (include_study) add("study", "Study / home office", "living_room");

  for (let i = 0; i < bathrooms; i++) {
    add(`bathroom_${i + 1}`, bathroomLabel(i, bathrooms), "bathroom");
  }

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
  const t = BRIEF_TEMPLATES.find((x) => x.id === templateId) ?? BRIEF_TEMPLATES.find((x) => x.id === "house_3")!;
  return buildCaptureBrief({
    template_id: t.id,
    bedrooms: t.bedrooms,
    bathrooms: t.bathrooms,
    include_study: t.include_study,
    include_dining: t.include_dining,
    include_laundry: t.include_laundry,
    include_garage: t.include_garage,
  });
}

export function defaultCaptureBrief(): CaptureBrief {
  return briefFromTemplate("house_3");
}

export function parseCaptureBrief(raw: unknown): CaptureBrief | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.slots)) return null;

  const slots: CaptureBriefSlot[] = o.slots
    .map((s, i) => {
      if (!s || typeof s !== "object") return null;
      const slot = s as Record<string, unknown>;
      const id = typeof slot.id === "string" ? slot.id : `slot_${i}`;
      const label = typeof slot.label === "string" ? slot.label : "Photo";
      const room_type = typeof slot.room_type === "string" ? slot.room_type : "other";
      if (!isClaidRoomType(room_type)) return null;
      return {
        id,
        label,
        room_type,
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

function isClaidRoomType(v: string): v is ClaidRoomType {
  return ["living_room", "kitchen", "bedroom", "bathroom", "exterior", "other"].includes(v);
}

export function orderedSlots(brief: CaptureBrief): CaptureBriefSlot[] {
  return [...brief.slots].sort((a, b) => a.sequence - b.sequence);
}

export function firstIncompleteStepIndex(
  slots: Array<{ id: string; required: boolean }>,
  filledSlotIds: Iterable<string | null | undefined>
): number {
  if (!slots.length) return 0;
  const filled = new Set<string>();
  for (const id of filledSlotIds) {
    if (id) filled.add(id);
  }
  const requiredMiss = slots.findIndex((s) => s.required && !filled.has(s.id));
  if (requiredMiss >= 0) return requiredMiss;
  const anyMiss = slots.findIndex((s) => !filled.has(s.id));
  return anyMiss >= 0 ? anyMiss : 0;
}

export function requiredSlotCount(brief: CaptureBrief): number {
  return brief.slots.filter((s) => s.required).length;
}

export function totalSlotCount(brief: CaptureBrief): number {
  return brief.slots.length;
}

export function validateBriefForPlan(
  brief: CaptureBrief,
  planTier: PlanTier | string | null | undefined
): { ok: true } | { ok: false; error: string } {
  const plan = getPlanConfig(planTier);
  const required = requiredSlotCount(brief);
  const total = totalSlotCount(brief);

  if (required < 1) {
    return { ok: false, error: "Add at least one required photo to the shot list." };
  }
  if (required > plan.maxPhotos) {
    return {
      ok: false,
      error: `${plan.name} allows up to ${plan.maxPhotos} photos. Your required shot list has ${required} — remove rooms or upgrade to Pro.`,
    };
  }
  if (total > plan.maxPhotos) {
    return {
      ok: false,
      error: `Shot list has ${total} slots but ${plan.name} allows ${plan.maxPhotos} photos total.`,
    };
  }
  return { ok: true };
}

export type BriefProgress = {
  requiredTotal: number;
  requiredFilled: number;
  optionalTotal: number;
  optionalFilled: number;
  filledSlotIds: Set<string>;
};

export function computeBriefProgress(
  brief: CaptureBrief,
  filledSlotIds: Iterable<string | null | undefined>
): BriefProgress {
  const filled = new Set<string>();
  for (const id of filledSlotIds) {
    if (id) filled.add(id);
  }

  let requiredTotal = 0;
  let requiredFilled = 0;
  let optionalTotal = 0;
  let optionalFilled = 0;

  for (const slot of brief.slots) {
    const done = filled.has(slot.id);
    if (slot.required) {
      requiredTotal++;
      if (done) requiredFilled++;
    } else {
      optionalTotal++;
      if (done) optionalFilled++;
    }
  }

  return { requiredTotal, requiredFilled, optionalTotal, optionalFilled, filledSlotIds: filled };
}

export function isBriefComplete(progress: BriefProgress): boolean {
  return progress.requiredFilled >= progress.requiredTotal && progress.requiredTotal > 0;
}

/** Progress from slot list only (customer session / checklist views). */
export function progressForSlots(
  slots: Array<{ id: string; required: boolean }>,
  filledSlotIds: Iterable<string | null | undefined>
): BriefProgress {
  const brief = {
    ...defaultCaptureBrief(),
    slots: slots.map((s, i) => ({
      id: s.id,
      label: s.id,
      room_type: "other" as ClaidRoomType,
      required: s.required,
      sequence: i,
    })),
  };
  return computeBriefProgress(brief, filledSlotIds);
}
