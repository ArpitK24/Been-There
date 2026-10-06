CREATE TYPE "public"."activity_type" AS ENUM('VISITED', 'ORDERED');--> statement-breakpoint
CREATE TYPE "public"."connection_status" AS ENUM('PENDING', 'ACCEPTED', 'REJECTED', 'BLOCKED', 'REMOVED');--> statement-breakpoint
CREATE TYPE "public"."recommendation_status" AS ENUM('RECOMMEND', 'NEUTRAL', 'DO_NOT_RECOMMEND');--> statement-breakpoint
CREATE TYPE "public"."visibility_level" AS ENUM('PRIVATE', 'CONNECTIONS');--> statement-breakpoint
CREATE TABLE "activities" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"place_id" uuid NOT NULL,
	"type" "activity_type" DEFAULT 'VISITED' NOT NULL,
	"recommendation" "recommendation_status" DEFAULT 'RECOMMEND' NOT NULL,
	"visit_count" integer DEFAULT 1 NOT NULL,
	"activity_date" date NOT NULL,
	"visibility" "visibility_level" DEFAULT 'CONNECTIONS' NOT NULL,
	"note" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_positive_visit_count" CHECK ("activities"."visit_count" >= 1)
);
--> statement-breakpoint
CREATE TABLE "connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"requester_id" uuid NOT NULL,
	"recipient_id" uuid NOT NULL,
	"status" "connection_status" DEFAULT 'PENDING' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "chk_no_self_connection" CHECK ("connections"."requester_id" <> "connections"."recipient_id")
);
--> statement-breakpoint
CREATE TABLE "places" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"provider" text NOT NULL,
	"provider_place_id" text NOT NULL,
	"name" text NOT NULL,
	"category" text NOT NULL,
	"address" text NOT NULL,
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"branch" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "privacy_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"activity_default_visibility" "visibility_level" DEFAULT 'CONNECTIONS' NOT NULL,
	"hide_precise_locations" boolean DEFAULT false NOT NULL,
	"hide_exact_timestamps" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "privacy_settings_user_id_unique" UNIQUE("user_id")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"username" text NOT NULL,
	"display_name" text NOT NULL,
	"avatar_url" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "users_username_unique" UNIQUE("username")
);
--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "activities" ADD CONSTRAINT "activities_place_id_places_id_fk" FOREIGN KEY ("place_id") REFERENCES "public"."places"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_requester_id_users_id_fk" FOREIGN KEY ("requester_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "connections" ADD CONSTRAINT "connections_recipient_id_users_id_fk" FOREIGN KEY ("recipient_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "privacy_settings" ADD CONSTRAINT "privacy_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_user_place_activity" ON "activities" USING btree ("user_id","place_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_connection_pair" ON "connections" USING btree (LEAST("requester_id", "recipient_id"),GREATEST("requester_id", "recipient_id"));--> statement-breakpoint
CREATE UNIQUE INDEX "idx_unique_provider_place" ON "places" USING btree ("provider","provider_place_id");