import { t } from "elysia";

export const ParamsByApplicationStatusId = t.Object({
  applicationStatusId: t.Numeric(),
});

export const GetActionsQuery = t.Object({
  actionId: t.Optional(t.Numeric()),
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 200 })),
  offset: t.Optional(t.Integer({ minimum: 0 })),
});

export const GetMyActionsQuery = t.Object({
  limit: t.Optional(t.Integer({ minimum: 1, maximum: 200 })),
  offset: t.Optional(t.Integer({ minimum: 0 })),
});

export type GetActionsQueryType = typeof GetActionsQuery.static;
export type GetMyActionsQueryType = typeof GetMyActionsQuery.static;
