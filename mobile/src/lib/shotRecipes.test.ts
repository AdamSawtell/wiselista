import {
  getShotRecipe,
  isApartmentTemplate,
  recipeTipLines,
  type LensChip,
} from "./shotRecipes";
import { briefFromTemplate } from "./captureBrief";

describe("shotRecipes", () => {
  it("house front is 1x landscape 3/4 facade", () => {
    const recipe = getShotRecipe("exterior_front", "exterior", "house_3");
    expect(recipe.lens).toBe("1x");
    expect(recipe.orientation).toBe("landscape");
    expect(recipe.stance.toLowerCase()).toMatch(/45|facade|nature strip/);
    expect(recipe.overlayLine).toMatch(/landscape/i);
  });

  it("apartment front is building/street, not house facade copy", () => {
    const house = getShotRecipe("exterior_front", "exterior", "house_3");
    const apt = getShotRecipe("exterior_front", "exterior", "apartment_1");
    expect(isApartmentTemplate("apartment_2")).toBe(true);
    expect(apt.include.toLowerCase()).toMatch(/building/);
    expect(apt.stance.toLowerCase()).not.toMatch(/nature strip/);
    expect(apt.overlayLine).not.toBe(house.overlayLine);
  });

  it("bedroom recipes never recommend 0.5x", () => {
    const slots = ["bedroom", "bedroom_1", "bedroom_3"];
    for (const id of slots) {
      const recipe = getShotRecipe(id, "bedroom", "house_3");
      expect(recipe.lens).toBe("1x");
      expect(recipe.lensLabel.toLowerCase()).not.toMatch(/0\.5/);
    }
  });

  it("bathroom may use 0.5x when the room is small", () => {
    const recipe = getShotRecipe("bathroom_1", "bathroom", "house_3");
    expect(["0.5x", "1x"]).toContain(recipe.lens);
    expect(recipe.lensLabel).toMatch(/0\.5/);
  });

  it("returns four tip lines for every default house_3 slot", () => {
    const brief = briefFromTemplate("house_3");
    for (const slot of brief.slots) {
      const lines = recipeTipLines(getShotRecipe(slot.id, slot.room_type, brief.template_id));
      expect(lines.length).toBe(4);
      expect(lines.every((line) => line.length >= 8)).toBe(true);
    }
  });

  it("keeps lens chips in the phone vocabulary", () => {
    const allowed: LensChip[] = ["1x", "0.5x", "2x"];
    const recipe = getShotRecipe("living_room", "living_room", "house_3");
    expect(allowed).toContain(recipe.lens);
  });
});
