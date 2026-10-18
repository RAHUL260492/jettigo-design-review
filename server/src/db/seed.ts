import { count, eq, sql } from "drizzle-orm";
import { newReferralCode } from "../routes/auth.js";
import type { DB } from "./client.js";
import { aircraft, airports, amenities, companies, operators, users } from "./schema.js";

// Most popular private-aviation cities. Names match the app's route pickers.
const AIRPORTS = [
  { code: "LCY", name: "London City", city: "London", country: "United Kingdom", lat: 51.5053, lon: 0.0553 },
  { code: "BQH", name: "London Biggin Hill", city: "London", country: "United Kingdom", lat: 51.3308, lon: 0.0325 },
  { code: "FAB", name: "Farnborough", city: "Farnborough", country: "United Kingdom", lat: 51.2758, lon: -0.7763 },
  { code: "LBG", name: "Paris Le Bourget", city: "Paris", country: "France", lat: 48.9694, lon: 2.4414 },
  { code: "NCE", name: "Nice Côte d'Azur", city: "Nice", country: "France", lat: 43.6584, lon: 7.2159 },
  { code: "GVA", name: "Geneva", city: "Geneva", country: "Switzerland", lat: 46.2381, lon: 6.1089 },
  { code: "ZRH", name: "Zurich", city: "Zurich", country: "Switzerland", lat: 47.4647, lon: 8.5492 },
  { code: "LIN", name: "Milan Linate", city: "Milan", country: "Italy", lat: 45.4451, lon: 9.2767 },
  { code: "CIA", name: "Rome Ciampino", city: "Rome", country: "Italy", lat: 41.7994, lon: 12.5949 },
  { code: "MUC", name: "Munich", city: "Munich", country: "Germany", lat: 48.3538, lon: 11.7861 },
  { code: "IBZ", name: "Ibiza", city: "Ibiza", country: "Spain", lat: 38.8729, lon: 1.3731 },
  { code: "PMI", name: "Palma de Mallorca", city: "Palma", country: "Spain", lat: 39.5517, lon: 2.7388 },
  { code: "DWC", name: "Dubai", city: "Dubai", country: "United Arab Emirates", lat: 24.8961, lon: 55.1614 },
  { code: "AUH", name: "Abu Dhabi", city: "Abu Dhabi", country: "United Arab Emirates", lat: 24.433, lon: 54.6511 },
  { code: "DOH", name: "Doha", city: "Doha", country: "Qatar", lat: 25.2731, lon: 51.6081 },
  { code: "RUH", name: "Riyadh", city: "Riyadh", country: "Saudi Arabia", lat: 24.9576, lon: 46.6988 },
  { code: "BOM", name: "Mumbai", city: "Mumbai", country: "India", lat: 19.0896, lon: 72.8656 },
  { code: "DEL", name: "Delhi", city: "Delhi", country: "India", lat: 28.5562, lon: 77.1 },
  { code: "BLR", name: "Bengaluru", city: "Bengaluru", country: "India", lat: 13.1986, lon: 77.7066 },
  { code: "HYD", name: "Hyderabad", city: "Hyderabad", country: "India", lat: 17.2403, lon: 78.4294 },
  { code: "GOX", name: "Goa", city: "Goa", country: "India", lat: 15.7444, lon: 73.8606 },
  { code: "MLE", name: "Malé, Maldives", city: "Malé", country: "Maldives", lat: 4.1918, lon: 73.5291 },
  { code: "XSP", name: "Singapore Seletar", city: "Singapore", country: "Singapore", lat: 1.4169, lon: 103.8678 },
  { code: "HKG", name: "Hong Kong", city: "Hong Kong", country: "Hong Kong", lat: 22.308, lon: 113.9185 },
  { code: "TEB", name: "New York Teterboro", city: "New York", country: "United States", lat: 40.85, lon: -74.0608 },
  { code: "VNY", name: "Los Angeles Van Nuys", city: "Los Angeles", country: "United States", lat: 34.2098, lon: -118.49 },
  { code: "OPF", name: "Miami Opa-locka", city: "Miami", country: "United States", lat: 25.907, lon: -80.2784 },
  { code: "ASE", name: "Aspen", city: "Aspen", country: "United States", lat: 39.2232, lon: -106.8689 },
];

const AMENITIES = [
  { code: "menu", name: "Gourmet tasting menu", category: "dining" as const, description: "Multi-course menu by Michelin-starred chefs", priceCents: 0 },
  { code: "wine", name: "Fine wines & spirits", category: "dining" as const, description: "Rare vintages and premium spirits", priceCents: 35_000 },
  { code: "wifi", name: "High-speed Starlink Wi-Fi", category: "entertainment" as const, description: "Low-latency internet for streaming and calls", priceCents: 0 },
  { code: "sound", name: "Premium sound system", category: "entertainment" as const, description: "Audiophile-grade cabin audio", priceCents: 25_000 },
  { code: "linen", name: "Luxury linens", category: "comfort" as const, description: "Egyptian cotton bedding and cashmere throws", priceCents: 0 },
  { code: "masks", name: "Silk sleep kits", category: "comfort" as const, description: "Silk masks, slippers and aromatherapy", priceCents: 7_500 },
];

/** Reference data every environment needs. Safe to run repeatedly. */
export async function seedReference(db: DB) {
  // Upsert so name and coordinate updates reach existing databases.
  await db
    .insert(airports)
    .values(AIRPORTS)
    .onConflictDoUpdate({
      target: airports.code,
      set: { name: sql`excluded.name`, city: sql`excluded.city`, country: sql`excluded.country`, lat: sql`excluded.lat`, lon: sql`excluded.lon` },
    });
  await db.insert(amenities).values(AMENITIES).onConflictDoNothing();
}

/** Demo operators, fleet, company and accounts. Runs only on an empty database. */
export async function seedDemo(db: DB) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`lock table operators in exclusive mode`);
    const [ops] = await tx.select({ n: count() }).from(operators);
    if ((ops?.n ?? 0) > 0) return false;
  
    const [riviera, alpine, atlas] = await tx
      .insert(operators)
      .values([
        { name: "Riviera Air Charter", status: "approved", aocNumber: "UK-AOC-2231", country: "United Kingdom", yearsInOperation: 14, rating: 4.9 },
        { name: "Alpine Executive Jets", status: "approved", aocNumber: "CH-AOC-0918", country: "Switzerland", yearsInOperation: 22, rating: 5.0 },
        { name: "Atlas Private Aviation", status: "approved", aocNumber: "FR-AOC-4410", country: "France", yearsInOperation: 9, rating: 4.8 },
      ])
      .returning();
  
    await tx.insert(aircraft).values([
      { operatorId: riviera!.id, model: "Cessna Citation Longitude", category: "mid", tailNumber: "G-RVLN", seats: 12, rangeNm: 3500, cruiseKts: 430, hourlyRateCents: 550_000, yearOfManufacture: 2022, cabinHeightIn: 72, baggageCuFt: 112, amenities: "Wi-Fi, flat-floor cabin", image: "jet-longitude" },
      { operatorId: riviera!.id, model: "Cessna Citation Latitude", category: "mid", tailNumber: "G-RVRA", seats: 9, rangeNm: 2700, cruiseKts: 420, hourlyRateCents: 450_000, yearOfManufacture: 2021, cabinHeightIn: 72, baggageCuFt: 127, amenities: "Wi-Fi, galley", image: "jet-latitude" },
      { operatorId: alpine!.id, model: "Gulfstream G650", category: "ulr", tailNumber: "HB-JGO", seats: 16, rangeNm: 7000, cruiseKts: 488, hourlyRateCents: 850_000, yearOfManufacture: 2022, cabinHeightIn: 77, baggageCuFt: 195, amenities: "Wi-Fi, full-flat bed, shower", image: "jet-g650" },
      { operatorId: alpine!.id, model: "Bombardier Global 7500", category: "ulr", tailNumber: "HB-GLX", seats: 19, rangeNm: 7700, cruiseKts: 488, hourlyRateCents: 980_000, yearOfManufacture: 2023, cabinHeightIn: 74, baggageCuFt: 195, amenities: "4K cinema, conference suite, full galley", image: "jet-global7500" },
      { operatorId: atlas!.id, model: "Dassault Falcon 8X", category: "heavy", tailNumber: "F-HATL", seats: 14, rangeNm: 6450, cruiseKts: 460, hourlyRateCents: 790_000, yearOfManufacture: 2021, cabinHeightIn: 74, baggageCuFt: 140, amenities: "Ka-band Wi-Fi, lounge, en-suite", image: "opt-3" },
    ]);
  
    const [thompson] = await tx.insert(companies).values({ name: "Thompson Holdings", creditBalanceCents: 145_000_000 }).returning();
  
    const people = [
      { email: "james@thompson.co", name: "James Thompson", companyId: thompson!.id, companyRole: "admin" as const, tier: "gold" as const },
      { email: "sarah@thompson.co", name: "Sarah Lee", companyId: thompson!.id, companyRole: "admin" as const },
      { email: "john@thompson.co", name: "John Kim", companyId: thompson!.id, companyRole: "traveler" as const },
      { email: "mark@thompson.co", name: "Mark Davis", companyId: thompson!.id, companyRole: "booker" as const },
      { email: "ops@rivieraair.com", name: "Riviera Ops Desk", role: "operator" as const, operatorId: riviera!.id },
      { email: "admin@jettigo.app", name: "Jettigo Admin", role: "admin" as const },
    ];
    for (const p of people) await tx.insert(users).values({ ...p, referralCode: await newReferralCode(tx) }).onConflictDoNothing();
    return true;
  });
}

export async function isSeeded(db: DB) {
  const [r] = await db.select({ n: count() }).from(airports).where(eq(airports.code, "LCY"));
  return (r?.n ?? 0) > 0;
}
