import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

const id = () => uuid("id").primaryKey().default(sql`gen_random_uuid()`);
const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

export const companies = pgTable("companies", {
  id: id(),
  name: text("name").notNull(),
  creditBalanceCents: integer("credit_balance_cents").notNull().default(0),
  createdAt: createdAt(),
});

export const operators = pgTable("operators", {
  id: id(),
  name: text("name").notNull(),
  kind: text("kind", { enum: ["operator", "provider"] }).notNull().default("operator"),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).notNull().default("pending"),
  aocNumber: text("aoc_number"),
  country: text("country"),
  yearsInOperation: integer("years_in_operation"),
  rating: doublePrecision("rating").notNull().default(4.8),
  services: text("services").array().notNull().default(sql`'{}'::text[]`),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    email: text("email").notNull(),
    name: text("name"),
    phone: text("phone"),
    role: text("role", { enum: ["passenger", "operator", "admin"] }).notNull().default("passenger"),
    companyId: uuid("company_id").references(() => companies.id),
    companyRole: text("company_role", { enum: ["admin", "booker", "traveler"] }),
    operatorId: uuid("operator_id").references(() => operators.id),
    tier: text("tier", { enum: ["none", "silver", "gold", "elite"] }).notNull().default("none"),
    referralCode: text("referral_code").notNull(),
    referredBy: uuid("referred_by"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("users_email_uq").on(t.email), uniqueIndex("users_referral_uq").on(t.referralCode)],
);

export const otpCodes = pgTable(
  "otp_codes",
  {
    id: id(),
    email: text("email").notNull(),
    codeHash: text("code_hash").notNull(),
    attempts: integer("attempts").notNull().default(0),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    consumedAt: timestamp("consumed_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("otp_email_idx").on(t.email)],
);

export const airports = pgTable("airports", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  city: text("city").notNull(),
  country: text("country").notNull(),
  lat: doublePrecision("lat").notNull(),
  lon: doublePrecision("lon").notNull(),
});

export const aircraft = pgTable("aircraft", {
  id: id(),
  operatorId: uuid("operator_id").notNull().references(() => operators.id),
  model: text("model").notNull(),
  category: text("category", { enum: ["light", "mid", "heavy", "ulr", "helicopter"] }).notNull(),
  tailNumber: text("tail_number").notNull(),
  seats: integer("seats").notNull(),
  rangeNm: integer("range_nm").notNull(),
  cruiseKts: integer("cruise_kts").notNull().default(450),
  hourlyRateCents: integer("hourly_rate_cents").notNull(),
  yearOfManufacture: integer("year_of_manufacture"),
  cabinHeightIn: integer("cabin_height_in"),
  baggageCuFt: integer("baggage_cu_ft"),
  amenities: text("amenities"),
  image: text("image"),
  active: boolean("active").notNull().default(true),
  createdAt: createdAt(),
});

export const amenities = pgTable("amenities", {
  code: text("code").primaryKey(),
  name: text("name").notNull(),
  category: text("category", { enum: ["dining", "entertainment", "comfort"] }).notNull(),
  description: text("description").notNull(),
  priceCents: integer("price_cents").notNull().default(0),
});

export const quoteRequests = pgTable(
  "quote_requests",
  {
    id: id(),
    userId: uuid("user_id").references(() => users.id),
    origin: text("origin").notNull().references(() => airports.code),
    destination: text("destination").notNull().references(() => airports.code),
    departAt: timestamp("depart_at", { withTimezone: true }).notNull(),
    passengers: integer("passengers").notNull(),
    bags: integer("bags").notNull().default(0),
    baggageKg: integer("baggage_kg").notNull().default(0),
    distanceNm: integer("distance_nm").notNull(),
    status: text("status", { enum: ["open", "booked", "expired"] }).notNull().default("open"),
    createdAt: createdAt(),
  },
  (t) => [index("qr_status_idx").on(t.status)],
);

export const quotes = pgTable(
  "quotes",
  {
    id: id(),
    requestId: uuid("request_id").notNull().references(() => quoteRequests.id),
    operatorId: uuid("operator_id").notNull().references(() => operators.id),
    aircraftId: uuid("aircraft_id").notNull().references(() => aircraft.id),
    priceCents: integer("price_cents").notNull(),
    standardPriceCents: integer("standard_price_cents").notNull(),
    flightMinutes: integer("flight_minutes").notNull(),
    status: text("status", { enum: ["offered", "countered", "declined", "accepted", "expired"] }).notNull().default("offered"),
    operatorConfirmed: boolean("operator_confirmed").notNull().default(false),
    declineReason: text("decline_reason"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("quotes_request_idx").on(t.requestId), index("quotes_operator_idx").on(t.operatorId)],
);

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    ref: text("ref").notNull(),
    userId: uuid("user_id").notNull().references(() => users.id),
    companyId: uuid("company_id").references(() => companies.id),
    quoteId: uuid("quote_id").notNull().references(() => quotes.id),
    aircraftId: uuid("aircraft_id").notNull().references(() => aircraft.id),
    origin: text("origin").notNull(),
    destination: text("destination").notNull(),
    departAt: timestamp("depart_at", { withTimezone: true }).notNull(),
    flightMinutes: integer("flight_minutes").notNull(),
    passengers: integer("passengers").notNull(),
    status: text("status", { enum: ["draft", "pending_payment", "confirmed", "cancelled"] }).notNull().default("draft"),
    flightCents: integer("flight_cents").notNull(),
    amenitiesCents: integer("amenities_cents").notNull().default(0),
    feesCents: integer("fees_cents").notNull(),
    totalCents: integer("total_cents").notNull(),
    paymentMethod: text("payment_method", { enum: ["card", "wire", "credits"] }),
    specialRequests: text("special_requests"),
    createdAt: createdAt(),
  },
  (t) => [uniqueIndex("bookings_ref_uq").on(t.ref), index("bookings_user_idx").on(t.userId), index("bookings_company_idx").on(t.companyId)],
);

export const travelers = pgTable(
  "travelers",
  {
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    fullName: text("full_name").notNull(),
    passportEnc: text("passport_enc").notNull(),
    passportLast4: text("passport_last4").notNull(),
    nationality: text("nationality").notNull(),
    dateOfBirth: text("date_of_birth").notNull(),
    verified: boolean("verified").notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.position] })],
);

export const bookingAmenities = pgTable(
  "booking_amenities",
  {
    bookingId: uuid("booking_id").notNull().references(() => bookings.id, { onDelete: "cascade" }),
    code: text("code").notNull().references(() => amenities.code),
    priceCents: integer("price_cents").notNull(),
  },
  (t) => [primaryKey({ columns: [t.bookingId, t.code] })],
);

export const payments = pgTable("payments", {
  id: id(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  provider: text("provider").notNull().default("mock"),
  method: text("method", { enum: ["card", "wire", "credits"] }).notNull(),
  status: text("status", { enum: ["pending", "succeeded", "failed"] }).notNull(),
  amountCents: integer("amount_cents").notNull(),
  createdAt: createdAt(),
});

export const groundTransfers = pgTable("ground_transfers", {
  id: id(),
  bookingId: uuid("booking_id").notNull().references(() => bookings.id),
  vehicle: text("vehicle", { enum: ["sclass", "rover", "ghost"] }).notNull(),
  destination: text("destination").notNull(),
  meetAndGreet: boolean("meet_and_greet").notNull().default(true),
  priceCents: integer("price_cents").notNull(),
  chauffeurName: text("chauffeur_name").notNull(),
  plate: text("plate").notNull(),
  createdAt: createdAt(),
});

export const messages = pgTable(
  "messages",
  {
    id: id(),
    userId: uuid("user_id").notNull().references(() => users.id),
    bookingId: uuid("booking_id").references(() => bookings.id),
    sender: text("sender", { enum: ["user", "concierge"] }).notNull(),
    body: text("body").notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("messages_user_idx").on(t.userId)],
);

export const invoices = pgTable(
  "invoices",
  {
    id: id(),
    number: text("number").notNull(),
    companyId: uuid("company_id").notNull().references(() => companies.id),
    bookingId: uuid("booking_id").references(() => bookings.id),
    amountCents: integer("amount_cents").notNull(),
    status: text("status", { enum: ["paid", "pending", "processing"] }).notNull(),
    issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("invoices_number_uq").on(t.number), index("invoices_company_idx").on(t.companyId)],
);
