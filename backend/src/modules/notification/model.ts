import { t } from "elysia";

export const params = t.Object({
  id: t.Numeric(),
});

export const GetNotificationsQuery = t.Object({
  unreadOnly: t.Optional(t.Boolean()),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 100 })),
  offset: t.Optional(t.Integer({ minimum: 0 })),
});

export const MarkReadBody = t.Object({
  isRead: t.Boolean(),
});

export type GetNotificationsQueryType = typeof GetNotificationsQuery.static;
export type MarkReadBodyType = typeof MarkReadBody.static;
