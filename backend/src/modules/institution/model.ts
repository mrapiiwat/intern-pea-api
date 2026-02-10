// backend/src/institution/model.ts
import { t } from "elysia";

export const GetInstitutionsQuery = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),
  search: t.Optional(t.String()),
  type: t.Optional(
    t.Union([
      t.Literal("UNIVERSITY"),
      t.Literal("VOCATIONAL"),
      t.Literal("SCHOOL"),
      t.Literal("OTHERS"),
    ])
  ),
});

export const CreateInstitutionBody = t.Object({
  institutionsType: t.Union([
    t.Literal("UNIVERSITY"),
    t.Literal("VOCATIONAL"),
    t.Literal("SCHOOL"),
    t.Literal("OTHERS"),
  ]),
  name: t.String({ minLength: 2 }),
});

export const params = t.Object({
  id: t.Numeric(),
});

export const UpdateInstitutionBody = t.Partial(CreateInstitutionBody);

export type GetInstitutionsQueryType = typeof GetInstitutionsQuery.static;
export type CreateInstitutionBodyType = typeof CreateInstitutionBody.static;
export type UpdateInstitutionBodyType = typeof UpdateInstitutionBody.static;
