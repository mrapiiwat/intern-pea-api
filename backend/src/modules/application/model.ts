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

export type UploadDocumentBodyType = typeof UploadDocumentBody.static;
export type CreateApplicationBodyType = typeof CreateApplicationBody.static;
export type ApplicationInformationBodyType =
  typeof ApplicationInformationBody.static;
export type HistoryQueryType = typeof HistoryQuery.static;
export type CancelByOwnerBodyType = typeof CancelByOwnerBody.static;
