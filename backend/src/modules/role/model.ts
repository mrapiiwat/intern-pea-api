import { t } from "elysia";

export const CreateRoleBody = t.Object({
  name: t.String({
    minLength: 2,
    maxLength: 32,
  }),
  description: t.Optional(t.String()),
});

export const params = t.Object({
  id: t.Numeric(),
});

export const UpdateRoleBody = t.Partial(CreateRoleBody);

export type UpdateRoleBodyType = typeof UpdateRoleBody.static;
export type CreateRoleBodyType = typeof CreateRoleBody.static;
