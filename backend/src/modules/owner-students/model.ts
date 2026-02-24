import { t } from "elysia";

export const studentUserParams = t.Object({
  studentUserId: t.String({ minLength: 1 }),
});

export const UpdateStudentInternshipStatusBody = t.Object({
  status: t.Union([t.Literal("CANCEL"), t.Literal("COMPLETE")]),
  reason: t.Optional(t.String({ minLength: 1 })), // required only if CANCEL
});

export type UpdateStudentInternshipStatusBodyType =
  typeof UpdateStudentInternshipStatusBody.static;
