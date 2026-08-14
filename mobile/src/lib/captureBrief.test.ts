import { briefFromTemplate, firstIncompleteStepIndex, orderedSlots } from "./captureBrief";

describe("captureBrief", () => {
  it("relabels apartment exteriors", () => {
    const apt = briefFromTemplate("apartment_1");
    const front = apt.slots.find((s) => s.id === "exterior_front");
    const rear = apt.slots.find((s) => s.id === "exterior_rear");
    expect(front?.label).toBe("Building / street");
    expect(rear?.label).toBe("Balcony / outlook");
  });

  it("keeps house front of house label", () => {
    const house = briefFromTemplate("house_3");
    expect(house.slots[0]?.label).toBe("Front of house");
  });

  it("resumes at the first required empty slot", () => {
    const slots = orderedSlots(briefFromTemplate("house_3"));
    const filled = ["exterior_front", "living_room"];
    const index = firstIncompleteStepIndex(slots, filled);
    expect(slots[index]?.id).toBe("kitchen");
  });

  it("skips filled required rooms and lands on the next gap", () => {
    const slots = orderedSlots(briefFromTemplate("apartment_1"));
    const filled = slots.filter((s) => s.required).map((s) => s.id);
    expect(firstIncompleteStepIndex(slots, filled)).toBe(
      slots.findIndex((s) => !s.required)
    );
  });
});
