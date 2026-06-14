/** Pilot promo codes — skip Stripe checkout when the customer enters a valid code at submit. */

function pilotCodes(): string[] {
  const raw = process.env.WISELISTA_PILOT_PROMO_CODES ?? "";
  return raw
    .split(",")
    .map((c) => c.trim().toUpperCase())
    .filter(Boolean);
}

export function isValidPilotPromoCode(code: string | null | undefined): boolean {
  const normalized = code?.trim().toUpperCase();
  if (!normalized) return false;
  const allowed = pilotCodes();
  return allowed.length > 0 && allowed.includes(normalized);
}

export function pilotPromoEnabled(): boolean {
  return pilotCodes().length > 0;
}
