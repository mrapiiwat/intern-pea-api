import { t } from "elysia";

export const params = t.Object({
  id: t.Numeric(),
});

export const positionParams = t.Object({
  positionId: t.Numeric(),
});

export const CreateApplicationBody = t.Object({
  positionId: t.Integer({ minimum: 1 }),
});

export const ApplicationInformationBody = t.Object({
  skill: t.String({ minLength: 1 }),
  expectation: t.String({ minLength: 1 }),
  startDate: t.Date(),
  endDate: t.Date(),
  hours: t.Numeric(),
});

export const UploadDocumentBody = t.Object({
  file: t.File(),
});

export const ReviewDocumentBody = t.Object({
  status: t.Union([t.Literal("VERIFIED"), t.Literal("INVALID")]),
  note: t.Optional(t.String()),
});

export const reviewDocByNameParams = t.Object({
  id: t.Numeric(),
  docType: t.Union([
    t.Literal("transcript"),
    t.Literal("resume"),
    t.Literal("portfolio"),
    t.Literal("request-letter"),
  ]),
});

export const studentUserParams = t.Object({
  studentUserId: t.String({ minLength: 1 }),
});

export const HistoryQuery = t.Object({
  includeCanceled: t.Optional(t.Boolean()),
});

export const CancelByOwnerBody = t.Object({
  reason: t.String({ minLength: 1 }),
});

export const AllStudentsHistoryQuery = t.Object({
  includeCanceled: t.Optional(t.Boolean({ default: true })),

  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),

  status: t.Optional(
    t.Union([
      t.Literal("PENDING_DOCUMENT"),
      t.Literal("PENDING_INTERVIEW"),
      t.Literal("PENDING_CONFIRMATION"),
      t.Literal("PENDING_REQUEST"),
      t.Literal("PENDING_REVIEW"),
      t.Literal("COMPLETE"),
      t.Literal("CANCEL"),
    ])
  ),
  positionId: t.Optional(t.Numeric()),
  q: t.Optional(t.String()),
});

export type UploadDocumentBodyType = typeof UploadDocumentBody.static;
export type CreateApplicationBodyType = typeof CreateApplicationBody.static;
export type ApplicationInformationBodyType =
  typeof ApplicationInformationBody.static;
export type HistoryQueryType = typeof HistoryQuery.static;
export type CancelByOwnerBodyType = typeof CancelByOwnerBody.static;
export type AllStudentsHistoryQueryType = typeof AllStudentsHistoryQuery.static;
