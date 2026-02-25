import { relations } from "drizzle-orm/relations";
import {
  accounts,
  applicationDocuments,
  applicationInformations,
  applicationMentors,
  applicationStatusActions,
  applicationStatuses,
  checkTimes,
  dailyWorkLogs,
  departments,
  docTypes,
  favorites,
  institutions,
  internProjects,
  internshipPositionMentors,
  internshipPositions,
  leaveRequests,
  notifications,
  offices,
  projects,
  roles,
  sessions,
  staffLogs,
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
  staffLogs: many(staffLogs),
  notifications: many(notifications),
  checkTimes: many(checkTimes),
  projects: many(projects),
  internProjects: many(internProjects),
  leaveRequests_userId: many(leaveRequests, {
    relationName: "leaveRequests_userId_users_id",
  }),
  leaveRequests_approverId: many(leaveRequests, {
    relationName: "leaveRequests_approverId_users_id",
  }),
  favorites: many(favorites),
  applicationStatuses: many(applicationStatuses),
  dailyWorkLogs: many(dailyWorkLogs),
  applicationStatusActions: many(applicationStatusActions),
}));

export const rolesRelations = relations(roles, ({ many }) => ({
  users: many(users),
}));

export const officesRelations = relations(offices, ({ many }) => ({
  departments: many(departments),
  internshipPositions: many(internshipPositions),
}));

export const departmentsRelations = relations(departments, ({ one, many }) => ({
  office: one(offices, {
    fields: [departments.officeId],
    references: [offices.id],
  }),
  users: many(users),
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
    applicationMentors: many(applicationMentors),
    dailyWorkLogs: many(dailyWorkLogs),
    internshipPositionMentors: many(internshipPositionMentors),
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
  })
);

export const institutionsRelations = relations(institutions, ({ many }) => ({
  studentProfiles: many(studentProfiles),
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

export const staffLogsRelations = relations(staffLogs, ({ one }) => ({
  user: one(users, {
    fields: [staffLogs.userId],
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
    fields: [leaveRequests.approvedBy],
    references: [users.id],
    relationName: "leaveRequests_approverId_users_id",
  }),
}));

export const internshipPositionsRelations = relations(
  internshipPositions,
  ({ one, many }) => ({
    office: one(offices, {
      fields: [internshipPositions.officeId],
      references: [offices.id],
    }),
    department: one(departments, {
      fields: [internshipPositions.departmentId],
      references: [departments.id],
    }),
    mentors: many(internshipPositionMentors),
    favorites: many(favorites),
    applicationStatuses: many(applicationStatuses),
  })
);

export const internshipPositionMentorsRelations = relations(
  internshipPositionMentors,
  ({ one }) => ({
    position: one(internshipPositions, {
      fields: [internshipPositionMentors.positionId],
      references: [internshipPositions.id],
    }),

    mentorStaff: one(staffProfiles, {
      fields: [internshipPositionMentors.mentorStaffId],
      references: [staffProfiles.id],
    }),
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
    applicationStatusActions: many(applicationStatusActions),
  })
);

export const applicationStatusActionsRelations = relations(
  applicationStatusActions,
  ({ one }) => ({
    applicationStatus: one(applicationStatuses, {
      fields: [applicationStatusActions.applicationStatusId],
      references: [applicationStatuses.id],
    }),
    user: one(users, {
      fields: [applicationStatusActions.actionBy],
      references: [users.id],
    }),
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

export const projectsRelations = relations(projects, ({ one, many }) => ({
  owner: one(users, {
    fields: [projects.projectOwner],
    references: [users.id],
  }),
  internProjects: many(internProjects),
  dailyWorkLogs: many(dailyWorkLogs),
}));

export const internProjectsRelations = relations(internProjects, ({ one }) => ({
  project: one(projects, {
    fields: [internProjects.projectId],
    references: [projects.id],
  }),
  user: one(users, {
    fields: [internProjects.userId],
    references: [users.id],
  }),
}));

export const dailyWorkLogsRelations = relations(dailyWorkLogs, ({ one }) => ({
  user: one(users, {
    fields: [dailyWorkLogs.userId],
    references: [users.id],
  }),
  project: one(projects, {
    fields: [dailyWorkLogs.projectId],
    references: [projects.id],
  }),
  staffProfile: one(staffProfiles, {
    fields: [dailyWorkLogs.approveBy],
    references: [staffProfiles.id],
  }),
}));
