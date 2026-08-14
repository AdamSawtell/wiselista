/**
 * Professional shot recipes for guided capture.
 * Keep this file in sync with web/src/lib/shot-recipes.ts
 */

export type LensChip = "1x" | "0.5x" | "2x";
export type ShotOrientation = "portrait" | "landscape";

export type ShotRecipe = {
  stance: string;
  lens: LensChip;
  lensLabel: string;
  height: string;
  include: string;
  hide: string;
  orientation: ShotOrientation;
  overlayLine: string;
};

const CHEST = "Chest height (~1.4 m), level with the far wall";

export function isApartmentTemplate(templateId: string | null | undefined): boolean {
  return templateId === "apartment_1" || templateId === "apartment_2";
}

export function isTownhouseTemplate(templateId: string | null | undefined): boolean {
  return templateId === "townhouse";
}

export function lensChipLabel(lens: LensChip): string {
  if (lens === "0.5x") return "0.5×";
  if (lens === "2x") return "2×";
  return "1×";
}

function make(
  lens: LensChip,
  fields: Omit<ShotRecipe, "lens" | "lensLabel"> & { lensLabel?: string }
): ShotRecipe {
  return {
    lens,
    lensLabel: fields.lensLabel ?? lensChipLabel(lens),
    stance: fields.stance,
    height: fields.height,
    include: fields.include,
    hide: fields.hide,
    orientation: fields.orientation,
    overlayLine: fields.overlayLine,
  };
}

const RECIPES = {
  houseFront: make("1x", {
    stance: "Nature strip, 45° to the facade",
    height: CHEST,
    include: "Full house, some sky, driveway edge",
    hide: "Cars, bins, letterbox clutter",
    orientation: "landscape",
    overlayLine: "1× landscape · 3/4 of the facade · verticals straight",
  }),
  apartmentStreet: make("1x", {
    stance: "Across the street or on the footpath, facing the entry",
    height: CHEST,
    include: "Building face and how you arrive",
    hide: "Bins, parked cars tight to the lens",
    orientation: "landscape",
    overlayLine: "1× landscape · building and entry · not ultra-wide",
  }),
  houseRear: make("1x", {
    stance: "Back door or patio, looking out then back at the house",
    height: CHEST,
    include: "Usable outdoor space and the rear of the house",
    hide: "Bins, washing, pool equipment clutter",
    orientation: "landscape",
    overlayLine: "1× landscape · backyard and rear wall",
  }),
  courtyard: make("1x", {
    stance: "From the living or kitchen door into the courtyard",
    height: CHEST,
    include: "Courtyard floor and the enclosing walls",
    hide: "Bins and stored junk",
    orientation: "landscape",
    overlayLine: "1× landscape · courtyard, not a porch ultra-wide",
  }),
  balcony: make("1x", {
    stance: "From the living room through open balcony doors, then one shot on the balcony",
    height: CHEST,
    include: "Balcony space and the outlook",
    hide: "Washing, dead plants, railing clutter",
    orientation: "landscape",
    overlayLine: "1× · balcony and view · railings level",
  }),
  living: make("1x", {
    stance: "Back-left or back-right corner, facing windows",
    height: CHEST,
    include: "Sofa and windows in one frame",
    hide: "Bins, cables, remote piles",
    orientation: "portrait",
    overlayLine: "1× · corner wide · lights on, phone level",
  }),
  kitchen: make("1x", {
    stance: "Doorway or opposite corner",
    height: CHEST,
    include: "Cooktop, benches, run of cupboards",
    hide: "Dishes, tea towels, personal items",
    orientation: "portrait",
    overlayLine: "1× from the door · benches clear · not into a window",
    lensLabel: "1× (0.5× only if galley)",
  }),
  bedroom: make("1x", {
    stance: "From the doorway, bed centred",
    height: CHEST,
    include: "Made bed and one side of the room",
    hide: "Floor clutter, laundry, open wardrobe mess",
    orientation: "portrait",
    overlayLine: "1× from the door · bed centred · never 0.5×",
  }),
  bathroom: make("0.5x", {
    stance: "From the doorway",
    height: CHEST,
    include: "Vanity and shower if they fit",
    hide: "Toiletries, towels, lid up",
    orientation: "portrait",
    overlayLine: "0.5× if small, else 1× · lid down · mirrors wiped",
    lensLabel: "0.5× if small, else 1×",
  }),
  dining: make("1x", {
    stance: "Corner so the table sits in the space",
    height: CHEST,
    include: "Table and surrounding room",
    hide: "Clutter and personal items on the table",
    orientation: "portrait",
    overlayLine: "1× corner · table clear · lights on",
  }),
  study: make("1x", {
    stance: "From the doorway",
    height: CHEST,
    include: "Desk and storage",
    hide: "Cables, papers, screens with private content",
    orientation: "portrait",
    overlayLine: "1× from the door · desk tidy · lights on",
  }),
  laundry: make("0.5x", {
    stance: "From the doorway",
    height: CHEST,
    include: "Washer, dryer, bench if visible",
    hide: "Baskets and clutter on the bench",
    orientation: "portrait",
    overlayLine: "0.5× if tight · benches clear · light on",
    lensLabel: "0.5× if tight, else 1×",
  }),
  garage: make("1x", {
    stance: "Driveway or doorway, door open if safe",
    height: CHEST,
    include: "Width of the space and access",
    hide: "Loose tools and junk in the foreground",
    orientation: "landscape",
    overlayLine: "1× landscape · door open · tidy the floor",
  }),
  other: make("1x", {
    stance: "Fill the frame with the feature",
    height: CHEST,
    include: "The feature you want to show",
    hide: "Clutter at the edges",
    orientation: "portrait",
    overlayLine: "1× · level · lights on",
  }),
} satisfies Record<string, ShotRecipe>;

export function getShotRecipe(
  slotId: string,
  roomType: string,
  templateId: string | null | undefined = "house_3"
): ShotRecipe {
  if (slotId === "exterior_front") {
    return isApartmentTemplate(templateId) ? RECIPES.apartmentStreet : RECIPES.houseFront;
  }
  if (slotId === "exterior_rear") {
    if (isApartmentTemplate(templateId)) return RECIPES.balcony;
    if (isTownhouseTemplate(templateId)) return RECIPES.courtyard;
    return RECIPES.houseRear;
  }
  if (slotId === "garage") return RECIPES.garage;
  if (slotId === "dining_room") return RECIPES.dining;
  if (slotId === "study") return RECIPES.study;
  if (slotId === "laundry") return RECIPES.laundry;
  if (slotId.startsWith("bedroom")) return RECIPES.bedroom;
  if (slotId.startsWith("bathroom")) return RECIPES.bathroom;
  if (slotId === "kitchen") return RECIPES.kitchen;
  if (slotId === "living_room") return RECIPES.living;

  if (roomType === "exterior") {
    return isApartmentTemplate(templateId) ? RECIPES.apartmentStreet : RECIPES.houseFront;
  }
  if (roomType === "bedroom") return RECIPES.bedroom;
  if (roomType === "bathroom") return RECIPES.bathroom;
  if (roomType === "kitchen") return RECIPES.kitchen;
  if (roomType === "living_room") return RECIPES.living;
  return RECIPES.other;
}

export function recipeTipLines(recipe: ShotRecipe): string[] {
  return [
    `${recipe.stance} · ${recipe.height}`,
    `Lens: ${recipe.lensLabel}`,
    `Include: ${recipe.include}`,
    `Hide: ${recipe.hide}`,
  ];
}

export function exteriorSlotLabel(
  slotId: "exterior_front" | "exterior_rear",
  templateId: string | null | undefined
): string {
  if (slotId === "exterior_front") {
    return isApartmentTemplate(templateId) ? "Building / street" : "Front of house";
  }
  if (isApartmentTemplate(templateId)) return "Balcony / outlook";
  if (isTownhouseTemplate(templateId)) return "Courtyard / rear";
  return "Backyard / rear exterior";
}
