import { t } from "elysia";

export const GetPositionsQuery = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 10 })),
  search: t.Optional(t.String()),
  department: t.Optional(t.Numeric()),
  office: t.Optional(t.Numeric()), 
});

export const CreatePositionBody = t.Object({
  name: t.String({ minLength: 2 }),
  location: t.Optional(t.String()),
  positionCount: t.Optional(t.Numeric()),
  major: t.Optional(t.String()),

  recruitStart: t.Optional(t.String()),
  recruitEnd: t.Optional(t.String()), 

  applyStart: t.Optional(t.String()),
  applyEnd: t.Optional(t.String()),

  resumeRq: t.Optional(t.Boolean()),
  portfolioRq: t.Optional(t.Boolean()),

  jobDetails: t.Optional(t.String()),
  requirement: t.Optional(t.String()),
  benefits: t.Optional(t.String()),

  recruitmentStatus: t.Union([t.Literal("OPEN"), t.Literal("CLOSE")]),
  mentorStaffIds: t.Array(t.Numeric(), { minItems: 1 }),
});

export const params = t.Object({
  id: t.Numeric(),
});

export const UpdatePositionBody = t.Partial(
  t.Intersect([
    t.Omit(CreatePositionBody, ["mentorStaffIds"]),
    t.Object({
      mentorStaffIds: t.Optional(t.Array(t.Numeric(), { minItems: 1 })),
    }),
  ])
);

export type GetPositionsQueryType = typeof GetPositionsQuery.static;
export type CreatePositionBodyType = typeof CreatePositionBody.static;
export type UpdatePositionBodyType = typeof UpdatePositionBody.static;
