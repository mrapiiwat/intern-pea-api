import { t } from "elysia";

export const CreateStaffLogBody = t.Object({
  action: t.String({ minLength: 1 }),
});

export const GetStaffLogsQuery = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),
  userId: t.Optional(t.String()),
});

export type GetStaffLogsQueryType = typeof GetStaffLogsQuery.static;
