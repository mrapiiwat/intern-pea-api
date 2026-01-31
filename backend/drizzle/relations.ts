import { relations } from "drizzle-orm/relations";
import {
  accounts,
  adminLogs,
  applicationDocuments,
  applicationInformations,
  applicationMentors,
  applicationStatuses,
  checkTimes,
  dailyWorkLogs,
  departmentStaffRoles,
  departments,
  docTypes,
  faculties,
  favorites,
  institutions,
  internshipPositions,
  leaveRequests,
  majors,
  notifications,
  roles,
  sessions,
  staffProfiles,
  studentProfiles,
  users,
} from "./schema";

export const usersRelations = relations(users, ({ one, many }) => ({
  role: one(roles, {
    fields: [users.roleId],
    references: [roles.id],
  }),
  department: one(departments, {
    fields: [users.departmentId],
    references: [departments.id],
  }),
  staffProfiles: many(staffProfiles),
  studentProfiles: many(studentProfiles),
  sessions: many(sessions),
  accounts: many(accounts),
  adminLogs: many(adminLogs),
  notifications: many(notifications),
  checkTimes: many(checkTimes),
  leaveRequests_userId: many(leaveRequests, {
    relationName: "leaveRequests_userId_users_id",
  }),
  leaveRequests_approverId: many(leaveRequests, {
    relationName: "leaveRequests_approverId_users_id",
  }),
  favorites: many(favorites),
  applicationStatuses: many(applicationStatuses),
  dailyWorkLogs: many(dailyWorkLogs),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const departmentsRelations = relations(departments, ({ many }) => ({
  users: many(users),
  departmentStaffRoles: many(departmentStaffRoles),
  internshipPositions: many(internshipPositions),
  applicationStatuses: many(applicationStatuses),
}));

export const staffProfilesRelations = relations(
  staffProfiles,
  ({ one, many }) => ({
    user: one(users, {
      fields: [staffProfiles.userId],
      references: [users.id],
    }),
    departmentStaffRoles: many(departmentStaffRoles),
    applicationMentors: many(applicationMentors),
    dailyWorkLogs: many(dailyWorkLogs),
  })
);

export const studentProfilesRelations = relations(
  studentProfiles,
  ({ one }) => ({
    user: one(users, {
      fields: [studentProfiles.userId],
      references: [users.id],
    }),
    institution: one(institutions, {
      fields: [studentProfiles.institutionId],
      references: [institutions.id],
    }),
    faculty: one(faculties, {
      fields: [studentProfiles.facultyId],
      references: [faculties.id],
    }),
    major: one(majors, {
      fields: [studentProfiles.majorId],
      references: [majors.id],
    }),
  })
);

export const institutionsRelations = relations(institutions, ({ many }) => ({
  studentProfiles: many(studentProfiles),
}));

export const facultiesRelations = relations(faculties, ({ many }) => ({
  studentProfiles: many(studentProfiles),
}));

export const majorsRelations = relations(majors, ({ many }) => ({
  studentProfiles: many(studentProfiles),
  internshipPositions: many(internshipPositions),
}));

export const sessionsRelations = relations(sessions, ({ one }) => ({
  user: one(users, {
    fields: [sessions.userId],
    references: [users.id],
  }),
}));

export const accountsRelations = relations(accounts, ({ one }) => ({
  user: one(users, {
    fields: [accounts.userId],
    references: [users.id],
  }),
}));

export const departmentStaffRolesRelations = relations(
  departmentStaffRoles,
  ({ one }) => ({
    department: one(departments, {
      fields: [departmentStaffRoles.departmentId],
      references: [departments.id],
    }),
    staffProfile: one(staffProfiles, {
      fields: [departmentStaffRoles.staffId],
      references: [staffProfiles.id],
    }),
  })
);

export const adminLogsRelations = relations(adminLogs, ({ one }) => ({
  user: one(users, {
    fields: [adminLogs.adminId],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const checkTimesRelations = relations(checkTimes, ({ one }) => ({
  user: one(users, {
    fields: [checkTimes.userId],
    references: [users.id],
  }),
}));

export const leaveRequestsRelations = relations(leaveRequests, ({ one }) => ({
  user_userId: one(users, {
    fields: [leaveRequests.userId],
    references: [users.id],
    relationName: "leaveRequests_userId_users_id",
  }),
  user_approverId: one(users, {
    fields: [leaveRequests.approverId],
    references: [users.id],
    relationName: "leaveRequests_approverId_users_id",
  }),
}));

export const internshipPositionsRelations = relations(
  internshipPositions,
  ({ one, many }) => ({
    department: one(departments, {
      fields: [internshipPositions.departmentId],
      references: [departments.id],
    }),
    major: one(majors, {
      fields: [internshipPositions.majorId],
      references: [majors.id],
    }),
    favorites: many(favorites),
    applicationStatuses: many(applicationStatuses),
  })
);

export const favoritesRelations = relations(favorites, ({ one }) => ({
  user: one(users, {
    fields: [favorites.userId],
    references: [users.id],
  }),
  internshipPosition: one(internshipPositions, {
    fields: [favorites.positionId],
    references: [internshipPositions.id],
  }),
}));

export const applicationStatusesRelations = relations(
  applicationStatuses,
  ({ one, many }) => ({
    user: one(users, {
      fields: [applicationStatuses.userId],
      references: [users.id],
    }),
    department: one(departments, {
      fields: [applicationStatuses.departmentId],
      references: [departments.id],
    }),
    internshipPosition: one(internshipPositions, {
      fields: [applicationStatuses.positionId],
      references: [internshipPositions.id],
    }),
    applicationInformations: many(applicationInformations),
    applicationDocuments: many(applicationDocuments),
    applicationMentors: many(applicationMentors),
  })
);

export const applicationInformationsRelations = relations(
  applicationInformations,
  ({ one }) => ({
    applicationStatus: one(applicationStatuses, {
      fields: [applicationInformations.applicationStatusId],
      references: [applicationStatuses.id],
    }),
  })
);

export const applicationDocumentsRelations = relations(
  applicationDocuments,
  ({ one }) => ({
    applicationStatus: one(applicationStatuses, {
      fields: [applicationDocuments.applicationStatusId],
      references: [applicationStatuses.id],
    }),
    docType: one(docTypes, {
      fields: [applicationDocuments.docTypeId],
      references: [docTypes.id],
    }),
  })
);

export const docTypesRelations = relations(docTypes, ({ many }) => ({
  applicationDocuments: many(applicationDocuments),
}));

export const applicationMentorsRelations = relations(
  applicationMentors,
  ({ one }) => ({
    applicationStatus: one(applicationStatuses, {
      fields: [applicationMentors.applicationStatusId],
      references: [applicationStatuses.id],
    }),
    staffProfile: one(staffProfiles, {
      fields: [applicationMentors.mentorId],
      references: [staffProfiles.id],
    }),
  })
);

export const dailyWorkLogsRelations = relations(dailyWorkLogs, ({ one }) => ({
  user: one(users, {
    fields: [dailyWorkLogs.userId],
    references: [users.id],
  }),
  staffProfile: one(staffProfiles, {
    fields: [dailyWorkLogs.approveBy],
    references: [staffProfiles.id],
  }),
}));
