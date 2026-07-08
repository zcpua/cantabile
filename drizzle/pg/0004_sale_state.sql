CREATE TABLE "notification_credits" (
	"openid" text NOT NULL,
	"performance_id" text NOT NULL,
	"kind" text NOT NULL,
	"granted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"consumed_at" timestamp with time zone,
	"attempts" integer DEFAULT 0 NOT NULL,
	"failed_at" timestamp with time zone,
	CONSTRAINT "notification_credits_openid_performance_id_kind_pk" PRIMARY KEY("openid","performance_id","kind")
);
--> statement-breakpoint
CREATE TABLE "sale_state_transitions" (
	"id" integer PRIMARY KEY GENERATED ALWAYS AS IDENTITY (sequence name "sale_state_transitions_id_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 2147483647 START WITH 1 CACHE 1),
	"performance_id" text NOT NULL,
	"from_state" text NOT NULL,
	"to_state" text NOT NULL,
	"detected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"notified_at" timestamp with time zone
);
--> statement-breakpoint
ALTER TABLE "performances" ADD COLUMN "sale_state" text DEFAULT 'unknown' NOT NULL;--> statement-breakpoint
ALTER TABLE "notification_credits" ADD CONSTRAINT "notification_credits_openid_users_openid_fk" FOREIGN KEY ("openid") REFERENCES "public"."users"("openid") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notification_credits" ADD CONSTRAINT "notification_credits_performance_id_performances_id_fk" FOREIGN KEY ("performance_id") REFERENCES "public"."performances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sale_state_transitions" ADD CONSTRAINT "sale_state_transitions_performance_id_performances_id_fk" FOREIGN KEY ("performance_id") REFERENCES "public"."performances"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "notification_credits_pending_idx" ON "notification_credits" USING btree ("performance_id","kind");--> statement-breakpoint
CREATE UNIQUE INDEX "sale_state_transitions_event_unique" ON "sale_state_transitions" USING btree ("performance_id","from_state","to_state","detected_at");--> statement-breakpoint
CREATE INDEX "sale_state_transitions_pending_idx" ON "sale_state_transitions" USING btree ("to_state","notified_at");--> statement-breakpoint
CREATE INDEX "performances_sale_state_idx" ON "performances" USING btree ("sale_state");