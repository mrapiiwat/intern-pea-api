import { t } from "elysia";

export const params = t.Object({
  id: t.Numeric(),
});

export const CreateApplicationBody = t.Object({
  positionId: t.Integer({ minimum: 1 }),
});

export const ApplicationInformationBody = t.Object({
  skill: t.String({ minLength: 1 }),
  expectation: t.String({ minLength: 1 }),
});

export const UploadDocumentBody = t.Object({
  file: t.File(),
});

export const ReviewRequestLetterBody = t.Object({
  status: t.Union([t.Literal("VERIFIED"), t.Literal("INVALID")]),
  note: t.Optional(t.String()),
});

export type UploadDocumentBodyType = typeof UploadDocumentBody.static;
export type CreateApplicationBodyType = typeof CreateApplicationBody.static;
export type ApplicationInformationBodyType =
  typeof ApplicationInformationBody.static;
