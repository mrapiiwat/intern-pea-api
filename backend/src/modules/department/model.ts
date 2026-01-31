import { t } from "elysia";

export const GetDepartmentsQuery = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),
  search: t.Optional(t.String()),
});

export const CreateDepartmentBody = t.Object({
  name: t.String({ minLength: 3 }),
  location: t.Optional(t.String()),
  latitude: t.Numeric(),
  longitude: t.Numeric(),
});

export type GetDepartmentsQueryType = typeof GetDepartmentsQuery.static;
export type CreateDepartmentBodyType = typeof CreateDepartmentBody.static;
