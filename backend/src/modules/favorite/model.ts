import { t } from "elysia";

export const GetFavoritesQuery = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),
});

export const CreateFavoriteBody = t.Object({
  positionId: t.Numeric(),
});

export const params = t.Object({
  positionId: t.Numeric(),
});

export type GetFavoritesQueryType = typeof GetFavoritesQuery.static;
export type CreateFavoriteBodyType = typeof CreateFavoriteBody.static;
