-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE TYPE "public"."app_status_enum" AS ENUM('PENDING_DOCUMENT', 'PENDING_INTERVIEW', 'PENDING_CONFIRMATION', 'ACCEPTED', 'COMPLETE');--> statement-breakpoint
CREATE TYPE "public"."internship_status_enum" AS ENUM('NONE', 'ACTIVE', 'COMPLETE', 'CANCEL');--> statement-breakpoint
CREATE TYPE "public"."leave_request_enum" AS ENUM('ABSENCE', 'SICK');--> statement-breakpoint
CREATE TYPE "public"."leave_status_enum" AS ENUM('PENDING', 'APPROVED', 'REJECTED');--> statement-breakpoint
CREATE TYPE "public"."recruitment_status_enum" AS ENUM('OPEN', 'CLOSE');--> statement-breakpoint
CREATE TYPE "public"."staff_role_enum" AS ENUM('OWNER', 'MENTOR', 'ADMIN');--> statement-breakpoint
CREATE TYPE "public"."validation_status_enum" AS ENUM('INVALID', 'VERIFIED', 'REQUESTPENDING');--> statement-breakpoint
CREATE TABLE "doc_types" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"is_required" boolean,
	"description" text,
	CONSTRAINT "doc_types_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(100) NOT NULL,
	"description" text,
	CONSTRAINT "roles_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"role_id" integer NOT NULL,
	"department_id" integer,
	"fname" varchar(100),
	"lname" varchar(100),
	"username" varchar(100),
	"phone_number" varchar(20),
	"email" varchar(150),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "users_username_key" UNIQUE("username"),
	CONSTRAINT "users_phone_number_key" UNIQUE("phone_number"),
	CONSTRAINT "users_email_key" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "departments" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(150) NOT NULL,
	"location" varchar(255),
	"latitude" double precision NOT NULL,
	"longitude" double precision NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "departments_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "institutions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(200) NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "institutions_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "staff_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"employee_id" varchar(50) NOT NULL,
	CONSTRAINT "staff_profiles_user_id_key" UNIQUE("user_id"),
	CONSTRAINT "staff_profiles_employee_id_key" UNIQUE("employee_id")
);
--> statement-breakpoint
CREATE TABLE "student_profiles" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"picture" varchar(255),
	"hours" numeric(10, 2),
	"institution_id" integer NOT NULL,
	"faculty_id" integer,
	"major_id" integer,
	"start_date" timestamp,
	"end_date" timestamp,
	"is_active" boolean,
	"student_note" text,
	"internship_status" "internship_status_enum" NOT NULL,
	"status_note" text,
	CONSTRAINT "student_profiles_user_id_key" UNIQUE("user_id"),
	CONSTRAINT "student_profiles_picture_key" UNIQUE("picture")
);
--> statement-breakpoint
CREATE TABLE "faculties" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "majors" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "majors_name_key" UNIQUE("name")
);
--> statement-breakpoint
CREATE TABLE "sessions" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"expires_at" timestamp NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"user_id" varchar(50) NOT NULL,
	CONSTRAINT "sessions_token_key" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "accounts" (
	"id" varchar(50) PRIMARY KEY NOT NULL,
	"account_id" text NOT NULL,
	"provider_id" text NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"access_token" text,
	"refresh_token" text,
	"id_token" text,
	"access_token_expires_at" timestamp,
	"refresh_token_expires_at" timestamp,
	"scope" text,
	"password" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "department_staff_roles" (
	"id" serial PRIMARY KEY NOT NULL,
	"department_id" integer NOT NULL,
	"staff_id" integer NOT NULL,
	"staff_role" "staff_role_enum" NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"assigned_at" timestamp NOT NULL,
	"deleted_at" timestamp,
	"note" text,
	CONSTRAINT "department_staff_roles_department_id_staff_id_staff_role_key" UNIQUE("staff_role","staff_id","department_id")
);
--> statement-breakpoint
CREATE TABLE "admin_logs" (
	"id" serial PRIMARY KEY NOT NULL,
	"admin_id" varchar(50) NOT NULL,
	"action" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "notifications" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"title" varchar(255) NOT NULL,
	"message" text NOT NULL,
	"is_read" boolean DEFAULT false,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "check_times" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"time" timestamp,
	"type_check" varchar(20) NOT NULL,
	"is_late" boolean,
	"ip" varchar(100),
	"note" text,
	"location" varchar(255),
	"latitude" double precision,
	"longitude" double precision
);
--> statement-breakpoint
CREATE TABLE "leave_requests" (
	"id" serial PRIMARY KEY NOT NULL,
	"leave_request_type" "leave_request_enum" NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"leave_datetime" timestamp,
	"reason" text,
	"file" varchar(255),
	"status" "leave_status_enum" NOT NULL,
	"approver_id" varchar(50),
	"approved_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "internship_positions" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"department_id" integer NOT NULL,
	"location" varchar(255),
	"position_count" integer,
	"major_id" integer,
	"apply_start" timestamp,
	"apply_end" timestamp,
	"job_details" text,
	"requirement" text,
	"benefits" text,
	"recruitment_status" "recruitment_status_enum" NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE TABLE "favorites" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"position_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "favorites_user_id_position_id_key" UNIQUE("user_id","position_id")
);
--> statement-breakpoint
CREATE TABLE "application_statuses" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(50) NOT NULL,
	"department_id" integer NOT NULL,
	"position_id" integer NOT NULL,
	"application_status" "app_status_enum" NOT NULL,
	"internship_round" integer NOT NULL,
	"is_active" boolean DEFAULT true NOT NULL,
	"active_key" varchar(50),
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "application_statuses_user_id_internship_round_key" UNIQUE("user_id","internship_round"),
	CONSTRAINT "application_statuses_user_id_department_id_active_key_key" UNIQUE("user_id","department_id","active_key")
);
--> statement-breakpoint
CREATE TABLE "application_informations" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_status_id" integer NOT NULL,
	"skill" text,
	"expectation" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "application_informations_application_status_id_key" UNIQUE("application_status_id")
);
--> statement-breakpoint
CREATE TABLE "application_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_status_id" integer NOT NULL,
	"doc_type_id" integer NOT NULL,
	"doc_file" varchar(255) NOT NULL,
	"validation_status" "validation_status_enum" NOT NULL,
	"note" text,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "application_documents_application_status_id_doc_type_id_key" UNIQUE("doc_type_id","application_status_id")
);
--> statement-breakpoint
CREATE TABLE "application_mentors" (
	"id" serial PRIMARY KEY NOT NULL,
	"application_status_id" integer NOT NULL,
	"mentor_id" integer NOT NULL,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	CONSTRAINT "application_mentors_application_status_id_mentor_id_key" UNIQUE("mentor_id","application_status_id")
);
--> statement-breakpoint
CREATE TABLE "daily_work_logs" (
	"user_id" varchar(50) NOT NULL,
	"work_date" timestamp NOT NULL,
	"content" text,
	"mentor_comment" text,
	"is_approve" boolean DEFAULT false NOT NULL,
	"approve_by" integer,
	"created_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL,
	"updated_at" timestamp DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "public"."roles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "staff_profiles" ADD CONSTRAINT "staff_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_institution_id_fkey" FOREIGN KEY ("institution_id") REFERENCES "public"."institutions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_faculty_id_fkey" FOREIGN KEY ("faculty_id") REFERENCES "public"."faculties"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_staff_roles" ADD CONSTRAINT "department_staff_roles_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "department_staff_roles" ADD CONSTRAINT "department_staff_roles_staff_id_fkey" FOREIGN KEY ("staff_id") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_logs" ADD CONSTRAINT "admin_logs_admin_id_fkey" FOREIGN KEY ("admin_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "check_times" ADD CONSTRAINT "check_times_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "leave_requests" ADD CONSTRAINT "leave_requests_approver_id_fkey" FOREIGN KEY ("approver_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_positions" ADD CONSTRAINT "internship_positions_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "internship_positions" ADD CONSTRAINT "internship_positions_major_id_fkey" FOREIGN KEY ("major_id") REFERENCES "public"."majors"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."internship_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_statuses" ADD CONSTRAINT "application_statuses_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_statuses" ADD CONSTRAINT "application_statuses_department_id_fkey" FOREIGN KEY ("department_id") REFERENCES "public"."departments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_statuses" ADD CONSTRAINT "application_statuses_position_id_fkey" FOREIGN KEY ("position_id") REFERENCES "public"."internship_positions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_informations" ADD CONSTRAINT "application_informations_application_status_id_fkey" FOREIGN KEY ("application_status_id") REFERENCES "public"."application_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_application_status_id_fkey" FOREIGN KEY ("application_status_id") REFERENCES "public"."application_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_documents" ADD CONSTRAINT "application_documents_doc_type_id_fkey" FOREIGN KEY ("doc_type_id") REFERENCES "public"."doc_types"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_mentors" ADD CONSTRAINT "application_mentors_application_status_id_fkey" FOREIGN KEY ("application_status_id") REFERENCES "public"."application_statuses"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "application_mentors" ADD CONSTRAINT "application_mentors_mentor_id_fkey" FOREIGN KEY ("mentor_id") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_work_logs" ADD CONSTRAINT "daily_work_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "daily_work_logs" ADD CONSTRAINT "daily_work_logs_approve_by_fkey" FOREIGN KEY ("approve_by") REFERENCES "public"."staff_profiles"("id") ON DELETE no action ON UPDATE no action;
*/