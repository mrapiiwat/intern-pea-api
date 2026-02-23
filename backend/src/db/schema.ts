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
  uniqueIndex,
  varchar,
} from "drizzle-orm/pg-core";

export const appStatusEnum = pgEnum("app_status_enum", [
  "PENDING_DOCUMENT",
  "PENDING_INTERVIEW",
  "PENDING_CONFIRMATION",
  "PENDING_REQUEST",
  "PENDING_REVIEW",
  "COMPLETE",
  "CANCEL",
]);
export const internshipStatusEnum = pgEnum("internship_status_enum", [
  "IDLE",
  "PENDING",
  "INTERVIEW",
  "REVIEW",
  "ACCEPT",
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
  "PENDING",
  "INVALID",
  "VERIFIED",
]);
export const genderEnum = pgEnum("gender_enum", ["MALE", "FEMALE", "OTHER"]);

export const institutionsTypesEnum = pgEnum("institutions_types", [
  "UNIVERSITY",
  "VOCATIONAL",
  "SCHOOL",
  "OTHERS",
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
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
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
    displayUsername: text("display_username"),
    phoneNumber: varchar("phone_number", { length: 20 }),
    email: varchar({ length: 150 }),
    gender: genderEnum("gender"),
    emailVerified: boolean("email_verified").notNull().default(false),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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

export const offices = pgTable(
  "offices",
  {
    id: serial().primaryKey().notNull(),
    name: varchar({ length: 200 }).notNull(),
    shortName: varchar("short_name", { length: 50 }).notNull(),
    managerName: varchar("manager_name", { length: 150 }).notNull(),
    managerContact: varchar("manager_contact", { length: 255 }).notNull(),
    latitude: doublePrecision().notNull(),
    longitude: doublePrecision().notNull(),
    address: text().notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("offices_short_name_key").on(table.shortName)]
);

export const departments = pgTable(
  "departments",
  {
    id: serial().primaryKey().notNull(),

    deptSap: integer("dept_sap").notNull(),
    deptChangeCode: varchar("dept_change_code", { length: 20 }), // แทน BPCHAR(20)
    deptUpper: integer("dept_upper"),

    deptShort1: text("dept_short1"),
    deptShort2: text("dept_short2"),
    deptShort3: text("dept_short3"),
    deptShort4: text("dept_short4"),
    deptShort5: text("dept_short5"),
    deptShort6: text("dept_short6"),
    deptShort7: text("dept_short7"),
    deptShort: text("dept_short"),

    deptFull1: text("dept_full1"),
    deptFull2: text("dept_full2"),
    deptFull3: text("dept_full3"),
    deptFull4: text("dept_full4"),
    deptFull5: text("dept_full5"),
    deptFull6: text("dept_full6"),
    deptFull7: text("dept_full7"),
    deptFull: text("dept_full"),

    costCenterCode: varchar("cost_center_code", { length: 20 }), // แทน BPCHAR(20)
    costCenterName: text("cost_center_name"),

    peaCode: varchar("pea_code", { length: 6 }),
    businessPlace: varchar("business_place", { length: 4 }),
    businessArea: varchar("business_area", { length: 4 }),

    resourceCode: varchar("resource_code", { length: 5 }), // แทน BPCHAR(5)
    resourceName: text("resource_name"),

    taxBranch: varchar("tax_branch", { length: 30 }),

    isActive: boolean("is_active").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    createdBy: varchar("created_by", { length: 20 }), // แทน BPCHAR(20)
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedBy: varchar("updated_by", { length: 20 }).notNull(), // แทน BPCHAR(20)
    isDeleted: boolean("is_deleted").default(false),

    deptStableCode: text("dept_stable_code"),
    deptSapShort: text("dept_sap_short"),
    deptSapFull: text("dept_sap_full"),

    deptFullEng1: text("dept_full_eng1"),
    deptFullEng2: text("dept_full_eng2"),
    deptFullEng3: text("dept_full_eng3"),
    deptFullEng4: text("dept_full_eng4"),
    deptFullEng5: text("dept_full_eng5"),
    deptFullEng6: text("dept_full_eng6"),
    deptFullEng7: text("dept_full_eng7"),

    deptOrder: varchar("dept_order", { length: 10 }), // แทน BPCHAR(10)
    flgDelimit: varchar("flg_delimit", { length: 5 }), // แทน BPCHAR(5)
    delimitEffectivedt: timestamp("delimit_effectivedt", { mode: "string" }),
    gsberCctr: text("gsber_cctr"),

    deptLev2: integer("dept_lev2"),
    deptLev3: integer("dept_lev3"),
    seq: integer("seq"),

    location: text("location"),

    officeId: integer("office_id").notNull(),
  },
  (table) => [
    unique("departments_dept_sap_key").on(table.deptSap),

    foreignKey({
      columns: [table.officeId],
      foreignColumns: [offices.id],
      name: "departments_office_id_fkey",
    }),

    foreignKey({
      columns: [table.deptUpper],
      foreignColumns: [table.deptSap],
      name: "departments_dept_upper_fkey",
    }),
  ]
);

export const institutions = pgTable("institutions", {
  id: serial("id").primaryKey().notNull(),
  institutionsType: institutionsTypesEnum("institutions_type"),
  name: varchar("name", { length: 200 }).notNull(),
  createdAt: timestamp("created_at", { mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

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
    id: serial("id").primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull().unique(),
    image: varchar("image", { length: 255 }).unique(),
    hours: numeric("hours", { precision: 10, scale: 2 }),
    institutionId: integer("institution_id").notNull(),

    faculty: varchar("faculty"),
    major: varchar("major"),

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
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.institutionId],
      foreignColumns: [institutions.id],
      name: "student_profiles_institution_id_fkey",
    }),
  ]
);

export const faculties = pgTable("faculties", {
  id: serial().primaryKey().notNull(),
  name: text().notNull(),
  createdAt: timestamp("created_at", { mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
  updatedAt: timestamp("updated_at", { mode: "date" })
    .default(sql`CURRENT_TIMESTAMP`)
    .notNull(),
});

export const sessions = pgTable(
  "sessions",
  {
    id: varchar({ length: 50 }).primaryKey().notNull(),
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    token: text().notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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

export const verification = pgTable(
  "verification",
  {
    id: text("id").primaryKey(),
    identifier: text().notNull(), // email/phone หรือ identifier
    value: text().notNull(), // token / code ที่ใช้ verify
    expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [unique("verifications_value_key").on(table.value)]
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
      mode: "date",
    }),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at", {
      mode: "date",
    }),
    scope: text(),
    password: text(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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

export const adminLogs = pgTable(
  "admin_logs",
  {
    id: serial().primaryKey().notNull(),
    adminId: varchar("admin_id", { length: 50 }).notNull(),
    action: text(),
    createdAt: timestamp("created_at", { mode: "date" })
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
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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

    officeId: integer("office_id").notNull(),
    departmentId: integer("department_id").notNull(),

    location: varchar({ length: 255 }),
    positionCount: integer("position_count"),
    major: varchar("major", { length: 255 }),

    recruitStart: timestamp("recruit_start", { mode: "string" }),
    recruitEnd: timestamp("recruit_end", { mode: "string" }),
    applyStart: timestamp("apply_start", { mode: "string" }),
    applyEnd: timestamp("apply_end", { mode: "string" }),

    resumeRq: boolean("resume_rq").notNull().default(false),
    portfolioRq: boolean("portfolio_rq").notNull().default(false),

    jobDetails: text("job_details"),
    requirement: text(),
    benefits: text(),

    recruitmentStatus: recruitmentStatusEnum("recruitment_status").notNull(),

    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.officeId],
      foreignColumns: [offices.id],
      name: "internship_positions_office_id_fkey",
    }),
    foreignKey({
      columns: [table.departmentId],
      foreignColumns: [departments.id],
      name: "internship_positions_department_id_fkey",
    }),
  ]
);

export const internshipPositionMentors = pgTable(
  "internship_position_mentors",
  {
    id: serial().primaryKey().notNull(),
    positionId: integer("position_id").notNull(), // added
    mentorStaffId: integer("mentor_staff_id").notNull(), // added
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(), // added
  },
  (table) => [
    uniqueIndex(
      "internship_position_mentors_position_id_mentor_staff_id_key"
    ).on(table.positionId, table.mentorStaffId),

    foreignKey({
      columns: [table.positionId],
      foreignColumns: [internshipPositions.id],
      name: "internship_position_mentors_position_id_fkey",
    }),

    foreignKey({
      columns: [table.mentorStaffId],
      foreignColumns: [staffProfiles.id],
      name: "internship_position_mentors_mentor_staff_id_fkey",
    }),
  ]
);

export const favorites = pgTable(
  "favorites",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    positionId: integer("position_id").notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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
    statusNote: text("status_note"),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
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

export const projects = pgTable(
  "projects",
  {
    id: serial().primaryKey().notNull(),
    name: text().notNull(),
    description: text(),
    isFinish: boolean("is_finish").default(false).notNull(),
    projectOwner: varchar("project_owner", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectOwner],
      foreignColumns: [users.id],
      name: "projects_project_owner_fkey",
    }),
  ]
);

export const internProjects = pgTable(
  "intern_projects",
  {
    id: serial().primaryKey().notNull(),
    projectId: integer("project_id").notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "intern_projects_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "intern_projects_user_id_fkey",
    }).onDelete("cascade"),
    unique("intern_projects_unique").on(table.projectId, table.userId),
  ]
);

export const dailyWorkLogs = pgTable(
  "daily_work_logs",
  {
    id: serial().primaryKey().notNull(),
    userId: varchar("user_id", { length: 50 }).notNull(),
    projectId: integer("project_id").notNull(),
    workDate: timestamp("work_date", { mode: "string" }).notNull(),
    content: text(),
    mentorComment: text("mentor_comment"),
    isApprove: boolean("is_approve").default(false).notNull(),
    approveBy: integer("approve_by"),
    createdAt: timestamp("created_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
    updatedAt: timestamp("updated_at", { mode: "date" })
      .default(sql`CURRENT_TIMESTAMP`)
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "daily_work_logs_user_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.projectId],
      foreignColumns: [projects.id],
      name: "daily_work_logs_project_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.approveBy],
      foreignColumns: [staffProfiles.id],
      name: "daily_work_logs_approve_by_fkey",
    }),
  ]
);
