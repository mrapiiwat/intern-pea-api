import { t } from "elysia";

export const params = t.Object({
  id: t.Numeric(),
});

export type ParamsType = typeof params.static;
