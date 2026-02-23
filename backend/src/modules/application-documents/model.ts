import { t } from "elysia";

export const AdminListDocsQuery = t.Object({
  applicationStatusId: t.Optional(t.Numeric()),
  departmentId: t.Optional(t.Numeric()),
  userId: t.Optional(t.String({ minLength: 1 })),

  docTypeId: t.Optional(t.Numeric()),
  validationStatus: t.Optional(
    t.Union([t.Literal("PENDING"), t.Literal("INVALID"), t.Literal("VERIFIED")])
  ),

  q: t.Optional(t.String()),
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),
});

export const AdminGetFileQuery = t.Object({
  key: t.String({ minLength: 1 }),
  disposition: t.Optional(
    t.Union([t.Literal("inline"), t.Literal("attachment")])
  ),
});

export type AdminListDocsQueryType = typeof AdminListDocsQuery.static;
export type AdminGetFileQueryType = typeof AdminGetFileQuery.static;
