export type Point = { lat: number; lon: number };

const R_NM = 3440.065;

/** Great-circle distance in nautical miles. */
export function distanceNm(a: Point, b: Point): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * R_NM * Math.asin(Math.sqrt(h));
}

/** Block time: cruise leg plus a fixed allowance for taxi, climb and descent. */
export function flightMinutes(nm: number, cruiseKts: number): number {
  return Math.round((nm / cruiseKts) * 60 + 20);
}

export const POSITIONING_HOURS = 0.6;
export const FEES_RATE = 0.09;

/** Charter quote: hourly rate × (block hours + positioning), rounded up to $100. */
export function quotePriceCents(hourlyRateCents: number, minutes: number): number {
  const raw = hourlyRateCents * (minutes / 60 + POSITIONING_HOURS);
  return Math.ceil(raw / 10_000) * 10_000;
}

export function feesCents(flightCents: number): number {
  return Math.round(flightCents * FEES_RATE);
}

/** Aircraft can fly the leg non-stop with a 10% reserve. */
export function inRange(rangeNm: number, nm: number): boolean {
  return rangeNm >= nm * 1.1;
}

export const VEHICLES = {
  sclass: { name: "Mercedes-Benz S-Class", priceCents: 45_000, seats: 3 },
  rover: { name: "Range Rover Autobiography", priceCents: 52_000, seats: 4 },
  ghost: { name: "Rolls-Royce Ghost", priceCents: 89_000, seats: 3 },
} as const;

export const TIERS = {
  silver: { name: "Silver", priceCents: 250_000, perks: ["Flexible booking", "Standard catering", "Limited empty-leg access"] },
  gold: { name: "Gold", priceCents: 500_000, perks: ["Priority booking", "Complimentary premium catering", "Empty-leg access", "Dedicated concierge"] },
  elite: { name: "Elite", priceCents: 1_000_000, perks: ["Global priority, 24h guarantee", "Gourmet catering", "Exclusive terminal access", "Personal travel manager"] },
} as const;
