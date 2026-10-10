CREATE TYPE "public"."itinerary_status" AS ENUM('upcoming', 'traveling', 'completed');--> statement-breakpoint
CREATE TYPE "public"."share_permission" AS ENUM('view', 'edit');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"day_id" uuid NOT NULL,
	"title" varchar(200) NOT NULL,
	"location_name" varchar(300),
	"latitude" double precision,
	"longitude" double precision,
	"start_time" varchar(5),
	"end_time" varchar(5),
	"notes" text,
	"order_index" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itineraries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"owner_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"destination" varchar(200) NOT NULL,
	"emotion" varchar(10) DEFAULT '🗺️' NOT NULL,
	"cover_color" varchar(7),
	"start_date" varchar(10) NOT NULL,
	"end_date" varchar(10) NOT NULL,
	"status" "itinerary_status" DEFAULT 'upcoming' NOT NULL,
	"is_public" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_days" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"day_number" integer NOT NULL,
	"date" varchar(10) NOT NULL,
	"title" varchar(150),
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_shares" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"itinerary_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"shared_with_id" uuid NOT NULL,
	"permission" "share_permission" DEFAULT 'view' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" varchar(100) NOT NULL,
	"username" varchar(50) NOT NULL,
	"email" varchar(255) NOT NULL,
	"password_hash" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username"),
	CONSTRAINT "users_email_unique" UNIQUE("email")
);

CREATE TABLE IF NOT EXISTS "password_reset_tokens" (
  "id"         uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"    uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "token"      varchar(64) NOT NULL UNIQUE,
  "expires_at" timestamp NOT NULL,
  "used_at"    timestamp,
  "created_at" timestamp DEFAULT now() NOT NULL
);
 
CREATE TYPE "waypoint_category" AS ENUM (
  'general', 'water', 'camp', 'danger', 'viewpoint', 'shelter', 'food'
);
 
CREATE TABLE IF NOT EXISTS "waypoints" (
  "id"           uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "user_id"      uuid NOT NULL REFERENCES "users"("id") ON DELETE CASCADE,
  "itinerary_id" uuid REFERENCES "itineraries"("id") ON DELETE SET NULL,
  "name"         varchar(150) NOT NULL,
  "category"     "waypoint_category" DEFAULT 'general' NOT NULL,
  "latitude"     double precision NOT NULL,
  "longitude"    double precision NOT NULL,
  "altitude"     double precision,
  "notes"        text,
  "created_at"   timestamp DEFAULT now() NOT NULL
);

--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_day_id_itinerary_days_id_fk" FOREIGN KEY ("day_id") REFERENCES "public"."itinerary_days"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itineraries" ADD CONSTRAINT "itineraries_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_days" ADD CONSTRAINT "itinerary_days_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_shares" ADD CONSTRAINT "itinerary_shares_itinerary_id_itineraries_id_fk" FOREIGN KEY ("itinerary_id") REFERENCES "public"."itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_shares" ADD CONSTRAINT "itinerary_shares_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_shares" ADD CONSTRAINT "itinerary_shares_shared_with_id_users_id_fk" FOREIGN KEY ("shared_with_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;