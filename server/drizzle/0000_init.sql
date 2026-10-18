CREATE TABLE "aircraft" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"operator_id" uuid NOT NULL,
	"model" text NOT NULL,
	"category" text NOT NULL,
	"tail_number" text NOT NULL,
	"seats" integer NOT NULL,
	"range_nm" integer NOT NULL,
	"cruise_kts" integer DEFAULT 450 NOT NULL,
	"hourly_rate_cents" integer NOT NULL,
	"year_of_manufacture" integer,
	"cabin_height_in" integer,
	"baggage_cu_ft" integer,
	"amenities" text,
	"image" text,
	"active" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "airports" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"city" text NOT NULL,
	"country" text NOT NULL,
	"lat" double precision NOT NULL,
	"lon" double precision NOT NULL
);
--> statement-breakpoint
CREATE TABLE "amenities" (
	"code" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"description" text NOT NULL,
	"price_cents" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "booking_amenities" (
	"booking_id" uuid NOT NULL,
	"code" text NOT NULL,
	"price_cents" integer NOT NULL,
	CONSTRAINT "booking_amenities_booking_id_code_pk" PRIMARY KEY("booking_id","code")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"ref" text NOT NULL,
	"user_id" uuid NOT NULL,
	"company_id" uuid,
	"quote_id" uuid NOT NULL,
	"aircraft_id" uuid NOT NULL,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"depart_at" timestamp with time zone NOT NULL,
	"flight_minutes" integer NOT NULL,
	"passengers" integer NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"flight_cents" integer NOT NULL,
	"amenities_cents" integer DEFAULT 0 NOT NULL,
	"fees_cents" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"payment_method" text,
	"special_requests" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "companies" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"credit_balance_cents" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "ground_transfers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"vehicle" text NOT NULL,
	"destination" text NOT NULL,
	"meet_and_greet" boolean DEFAULT true NOT NULL,
	"price_cents" integer NOT NULL,
	"chauffeur_name" text NOT NULL,
	"plate" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "invoices" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"number" text NOT NULL,
	"company_id" uuid NOT NULL,
	"booking_id" uuid,
	"amount_cents" integer NOT NULL,
	"status" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "messages" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"booking_id" uuid,
	"sender" text NOT NULL,
	"body" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "operators" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"kind" text DEFAULT 'operator' NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"aoc_number" text,
	"country" text,
	"years_in_operation" integer,
	"rating" double precision DEFAULT 4.8 NOT NULL,
	"services" text[] DEFAULT '{}'::text[] NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "otp_codes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"code_hash" text NOT NULL,
	"attempts" integer DEFAULT 0 NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"booking_id" uuid NOT NULL,
	"provider" text DEFAULT 'mock' NOT NULL,
	"method" text NOT NULL,
	"status" text NOT NULL,
	"amount_cents" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quote_requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid,
	"origin" text NOT NULL,
	"destination" text NOT NULL,
	"depart_at" timestamp with time zone NOT NULL,
	"passengers" integer NOT NULL,
	"bags" integer DEFAULT 0 NOT NULL,
	"baggage_kg" integer DEFAULT 0 NOT NULL,
	"distance_nm" integer NOT NULL,
	"status" text DEFAULT 'open' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "quotes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"operator_id" uuid NOT NULL,
	"aircraft_id" uuid NOT NULL,
	"price_cents" integer NOT NULL,
	"standard_price_cents" integer NOT NULL,
	"flight_minutes" integer NOT NULL,
	"status" text DEFAULT 'offered' NOT NULL,
	"operator_confirmed" boolean DEFAULT false NOT NULL,
	"decline_reason" text,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "travelers" (
	"booking_id" uuid NOT NULL,
	"position" integer NOT NULL,
	"full_name" text NOT NULL,
	"passport_enc" text NOT NULL,
	"passport_last4" text NOT NULL,
	"nationality" text NOT NULL,
	"date_of_birth" text NOT NULL,
	"verified" boolean DEFAULT false NOT NULL,
	CONSTRAINT "travelers_booking_id_position_pk" PRIMARY KEY("booking_id","position")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"phone" text,
	"role" text DEFAULT 'passenger' NOT NULL,
	"company_id" uuid,
	"company_role" text,
	"operator_id" uuid,
	"tier" text DEFAULT 'none' NOT NULL,
	"referral_code" text NOT NULL,
	"referred_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "aircraft" ADD CONSTRAINT "aircraft_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_amenities" ADD CONSTRAINT "booking_amenities_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "booking_amenities" ADD CONSTRAINT "booking_amenities_code_amenities_code_fk" FOREIGN KEY ("code") REFERENCES "public"."amenities"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_quote_id_quotes_id_fk" FOREIGN KEY ("quote_id") REFERENCES "public"."quotes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_aircraft_id_aircraft_id_fk" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "ground_transfers" ADD CONSTRAINT "ground_transfers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "messages" ADD CONSTRAINT "messages_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_origin_airports_code_fk" FOREIGN KEY ("origin") REFERENCES "public"."airports"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quote_requests" ADD CONSTRAINT "quote_requests_destination_airports_code_fk" FOREIGN KEY ("destination") REFERENCES "public"."airports"("code") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_request_id_quote_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."quote_requests"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "quotes" ADD CONSTRAINT "quotes_aircraft_id_aircraft_id_fk" FOREIGN KEY ("aircraft_id") REFERENCES "public"."aircraft"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "travelers" ADD CONSTRAINT "travelers_booking_id_bookings_id_fk" FOREIGN KEY ("booking_id") REFERENCES "public"."bookings"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_company_id_companies_id_fk" FOREIGN KEY ("company_id") REFERENCES "public"."companies"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_operator_id_operators_id_fk" FOREIGN KEY ("operator_id") REFERENCES "public"."operators"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "bookings_ref_uq" ON "bookings" USING btree ("ref");--> statement-breakpoint
CREATE INDEX "bookings_user_idx" ON "bookings" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "bookings_company_idx" ON "bookings" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "invoices_number_uq" ON "invoices" USING btree ("number");--> statement-breakpoint
CREATE INDEX "invoices_company_idx" ON "invoices" USING btree ("company_id");--> statement-breakpoint
CREATE INDEX "messages_user_idx" ON "messages" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "otp_email_idx" ON "otp_codes" USING btree ("email");--> statement-breakpoint
CREATE INDEX "qr_status_idx" ON "quote_requests" USING btree ("status");--> statement-breakpoint
CREATE INDEX "quotes_request_idx" ON "quotes" USING btree ("request_id");--> statement-breakpoint
CREATE INDEX "quotes_operator_idx" ON "quotes" USING btree ("operator_id");--> statement-breakpoint
CREATE UNIQUE INDEX "users_email_uq" ON "users" USING btree ("email");--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_uq" ON "users" USING btree ("referral_code");