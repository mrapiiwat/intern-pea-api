import { sql } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  foreignKey,
  integer,
  numeric,
  pgEnum,
  pgTable,
  serial,
  text,
  timestamp,
  unique,
  varchar,
} from "drizzle-orm/pg-core";

export const appStatusEnum = pgEnum("app_status_enum", [
  "PENDING_DOCUMENT",
  "PENDING_INTERVIEW",
  "PENDING_CONFIRMATION",
  "ACCEPTED",
  "COMPLETE",
]);
export const internshipStatusEnum = pgEnum("internship_status_enum", [
  "NONE",
  "ACTIVE",
  "COMPLETE",
  "CANCEL",
]);
export const leaveRequestEnum = pgEnum("leave_request_enum", [
  "ABSENCE",
  "SICK",
]);
export const leaveStatusEnum = pgEnum("leave_status_enum", [
  "PENDING",
  "APPROVED",
  "REJECTED",
]);
export const recruitmentStatusEnum = pgEnum("recruitment_status_enum", [
  "OPEN",
  "CLOSE",
]);
export const staffRoleEnum = pgEnum("staff_role_enum", [
  "OWNER",
  "MENTOR",
  "ADMIN",
]);
export const validationStatusEnum = pgEnum("validation_status_enum", [
  "INVALID",
  "VERIFIED",
  "REQUESTPENDING",
]);

export const docTypes = pgTable(
  "doc_types",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    isRequired: boolean("is_required"),
    description: text(),
  },
  (table) => [unique("doc_types_name_key").on(table.name)]
);

export const roles = pgTable(
  "roles",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 100 }).notNull(),
    description: text(),
  },
  (table) => [unique("roles_name_key").on(table.name)]
);

export const users = pgTable(
  "users",
  {
    id: varchar({ length: 50 }).primaryKey().notNull(),
    roleId: integer("role_id").notNull(),
    departmentId: integer("department_id"),
    fname: varchar({ length: 100 }),
    lname: varchar({ length: 100 }),
    username: varchar({ length: 100 }),
    phoneNumber: varchar("phone_number", { length: 20 }),
    email: varchar({ length: 150 }),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.roleId],
      foreignColumns: [roles.id],
      name: "users_role_id_fkey",
    }),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "users_department_id_fkey",
    }),
    unique("users_username_key").on(table.username),
    unique("users_phone_number_key").on(table.phoneNumber),
    unique("users_email_key").on(table.email),
  ]
);

export const departments = pgTable(
  "departments",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 150 }).notNull(),
    location: varchar({ length: 255 }),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("departments_name_key").on(table.name)]
);

export const institutions = pgTable(
  "institutions",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 200 }).notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("institutions_name_key").on(table.name)]
);

export const staffProfiles = pgTable(
  "staff_profiles",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    employeeId: varchar("employee_id", { length: 50 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "staff_profiles_user_id_fkey",
    }),
    unique("staff_profiles_user_id_key").on(table.userId),
    unique("staff_profiles_employee_id_key").on(table.employeeId),
  ]
);

export const studentProfiles = pgTable(
  "student_profiles",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    picture: varchar({ length: 255 }),
    hours: numeric({ precision: 10, scale: 2 }),
    institutionId: integer("institution_id").notNull(),
    facultyId: integer("faculty_id"),
    majorId: integer("major_id"),
    startDate: timestamp("start_date", { mode: "string" }),
    endDate: timestamp("end_date", { mode: "string" }),
    isActive: boolean("is_active"),
    studentNote: text("student_note"),
    internshipStatus: internshipStatusEnum("internship_status").notNull(),
    statusNote: text("status_note"),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "student_profiles_user_id_fkey",
    }),
    foreignKey({
      columns: [table.institutionId],
      foreignColumns: [institutions.id],
      name: "student_profiles_institution_id_fkey",
    }),
    foreignKey({
      columns: [table.facultyId],
      foreignColumns: [faculties.id],
      name: "student_profiles_faculty_id_fkey",
    }),
    foreignKey({
      columns: [table.majorId],
      foreignColumns: [majors.id],
      name: "student_profiles_major_id_fkey",
    }),
    unique("student_profiles_user_id_key").on(table.userId),
    unique("student_profiles_picture_key").on(table.picture),
  ]
);

export const faculties = pgTable("faculties", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  createdAt: timestamp("created_at", { mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "string" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const majors = pgTable(
  "majors",
  {
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("majors_name_key").on(table.name)]
);

export const sessions = pgTable(
  "sessions",
  {
    id: varchar({ length: 50 }).primaryKey().notNull(),
    expiresAt: timestamp("expires_at", { mode: "string" }).notNull(),
    token: text().notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: varchar("user_id", { length: 50 }).notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "sessions_user_id_fkey",
    }),
    unique("sessions_token_key").on(table.token),
  ]
);

export const accounts = pgTable(
  "accounts",
  {
    id: varchar({ length: 50 }).primaryKey().notNull(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", {
      mode: "string",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      mode: "string",
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "accounts_user_id_fkey",
    }),
  ]
);

export const departmentStaffRoles = pgTable(
  "department_staff_roles",
  {
    id: serial().primaryKey().notNull(),
    departmentId: integer("department_id").notNull(),
    staffId: integer("staff_id").notNull(),
    staffRole: staffRoleEnum("staff_role").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    assignedAt: timestamp("assigned_at", { mode: "string" }).notNull(),
    deletedAt: timestamp("deleted_at", { mode: "string" }),
    note: text(),
  },
  (table) => [
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "department_staff_roles_department_id_fkey",
    }),
    foreignKey({
      columns: [table.staffId],
      foreignColumns: [staffProfiles.id],
      name: "department_staff_roles_staff_id_fkey",
    }),
    unique("department_staff_roles_department_id_staff_id_staff_role_key").on(
      table.staffRole,
      table.staffId,
      table.departmentId
    ),
  ]
);

export const adminLogs = pgTable(
  "admin_logs",
  {
    id: serial().primaryKey().notNull(),
    adminId: varchar("admin_id", { length: 50 }).notNull(),
    action: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.adminId],
      foreignColumns: [users.id],
      name: "admin_logs_admin_id_fkey",
    }),
  ]
);

export const notifications = pgTable(
  "notifications",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    title: varchar({ length: 255 }).notNull(),
    message: text().notNull(),
    isRead: boolean("is_read").default(false),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "notifications_user_id_fkey",
    }),
  ]
);

export const checkTimes = pgTable(
  "check_times",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    time: timestamp({ mode: "string" }),
    typeCheck: varchar("type_check", { length: 20 }).notNull(),
    isLate: boolean("is_late"),
    ip: varchar({ length: 100 }),
    note: text(),
    location: varchar({ length: 255 }),
    latitude: doublePrecision(),
    longitude: doublePrecision(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "check_times_user_id_fkey",
    }),
  ]
);

export const leaveRequests = pgTable(
  "leave_requests",
  {
    id: serial().primaryKey().notNull(),
    leaveRequestType: leaveRequestEnum("leave_request_type").notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    leaveDatetime: timestamp("leave_datetime", { mode: "string" }),
    reason: text(),
    file: varchar({ length: 255 }),
    status: leaveStatusEnum().notNull(),
    approverId: varchar("approver_id", { length: 50 }),
    approvedAt: timestamp("approved_at", { mode: "string" }),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "leave_requests_user_id_fkey",
    }),
    foreignKey({
      columns: [table.approverId],
      foreignColumns: [users.id],
      name: "leave_requests_approver_id_fkey",
    }),
  ]
);

export const internshipPositions = pgTable(
  "internship_positions",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 255 }).notNull(),
    departmentId: integer("department_id").notNull(),
    location: varchar({ length: 255 }),
    positionCount: integer("position_count"),
    majorId: integer("major_id"),
    applyStart: timestamp("apply_start", { mode: "string" }),
    applyEnd: timestamp("apply_end", { mode: "string" }),
    jobDetails: text("job_details"),
    requirement: text(),
    benefits: text(),
    recruitmentStatus: recruitmentStatusEnum("recruitment_status").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "internship_positions_department_id_fkey",
    }),
    foreignKey({
      columns: [table.majorId],
      foreignColumns: [majors.id],
      name: "internship_positions_major_id_fkey",
    }),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    positionId: integer("position_id").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "favorites_user_id_fkey",
    }),
    foreignKey({
      columns: [table.positionId],
      foreignColumns: [internshipPositions.id],
      name: "favorites_position_id_fkey",
    }),
    unique("favorites_user_id_position_id_key").on(
      table.userId,
      table.positionId
    ),
  ]
);

export const applicationStatuses = pgTable(
  "application_statuses",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    departmentId: integer("department_id").notNull(),
    positionId: integer("position_id").notNull(),
    applicationStatus: appStatusEnum("application_status").notNull(),
    internshipRound: integer("internship_round").notNull(),
    isActive: boolean("is_active").default(true).notNull(),
    activeKey: varchar("active_key", { length: 50 }),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "application_statuses_user_id_fkey",
    }),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "application_statuses_department_id_fkey",
    }),
    foreignKey({
      columns: [table.positionId],
      foreignColumns: [internshipPositions.id],
      name: "application_statuses_position_id_fkey",
    }),
    unique("application_statuses_user_id_internship_round_key").on(
      table.userId,
      table.internshipRound
    ),
    unique("application_statuses_user_id_department_id_active_key_key").on(
      table.userId,
      table.departmentId,
      table.activeKey
    ),
  ]
);

export const applicationInformations = pgTable(
  "application_informations",
  {
    id: serial().primaryKey().notNull(),
    applicationStatusId: integer("application_status_id").notNull(),
    skill: text(),
    expectation: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.applicationStatusId],
      foreignColumns: [applicationStatuses.id],
      name: "application_informations_application_status_id_fkey",
    }),
    unique("application_informations_application_status_id_key").on(
      table.applicationStatusId
    ),
  ]
);

export const applicationDocuments = pgTable(
  "application_documents",
  {
    id: serial().primaryKey().notNull(),
    applicationStatusId: integer("application_status_id").notNull(),
    docTypeId: integer("doc_type_id").notNull(),
    docFile: varchar("doc_file", { length: 255 }).notNull(),
    validationStatus: validationStatusEnum("validation_status").notNull(),
    note: text(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.applicationStatusId],
      foreignColumns: [applicationStatuses.id],
      name: "application_documents_application_status_id_fkey",
    }),
    foreignKey({
      columns: [table.docTypeId],
      foreignColumns: [docTypes.id],
      name: "application_documents_doc_type_id_fkey",
    }),
    unique("application_documents_application_status_id_doc_type_id_key").on(
      table.docTypeId,
      table.applicationStatusId
    ),
  ]
);

export const applicationMentors = pgTable(
  "application_mentors",
  {
    id: serial().primaryKey().notNull(),
    applicationStatusId: integer("application_status_id").notNull(),
    mentorId: integer("mentor_id").notNull(),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.applicationStatusId],
      foreignColumns: [applicationStatuses.id],
      name: "application_mentors_application_status_id_fkey",
    }),
    foreignKey({
      columns: [table.mentorId],
      foreignColumns: [staffProfiles.id],
      name: "application_mentors_mentor_id_fkey",
    }),
    unique("application_mentors_application_status_id_mentor_id_key").on(
      table.mentorId,
      table.applicationStatusId
    ),
  ]
);

export const dailyWorkLogs = pgTable(
  "daily_work_logs",
  {
    userId: varchar("user_id", { length: 50 }).notNull(),
    workDate: timestamp("work_date", { mode: "string" }).notNull(),
    content: text(),
    mentorComment: text("mentor_comment"),
    isApprove: boolean("is_approve").default(false).notNull(),
    approveBy: integer("approve_by"),
    createdAt: timestamp("created_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "string" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "daily_work_logs_user_id_fkey",
    }),
    foreignKey({
      columns: [table.approveBy],
      foreignColumns: [staffProfiles.id],
      name: "daily_work_logs_approve_by_fkey",
    }),
  ]
);
