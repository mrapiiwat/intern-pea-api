import { Elysia } from "elysia";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { FavoriteService } from "./service";

const favoriteService = new FavoriteService();

export const favorite = new Elysia({ prefix: "/favorite", tags: ["Favorites"] })
  .use(isAuthenticated)

  .get(
    "/",
    async ({ session, query, set }) => {
      const response = await favoriteService.findMyFavorites(
        session.userId,
        query
      );
      set.status = 200;
      return response;
    },
    {
      auth: true,
      query: model.GetFavoritesQuery,
      detail: {
        summary: "ดูรายการ favorite ของฉัน",
        description: "ดึงรายการตำแหน่งที่ผู้ใช้งานกด favorite ไว้ (เฉพาะของตัวเอง)",
      },
    }
  )

  .post(
    "/",
    async ({ session, body, set }) => {
      const response = await favoriteService.create(session.userId, body);
      set.status = 201;
      return response;
    },
    {
      auth: true,
      body: model.CreateFavoriteBody,
      detail: {
        summary: "กด favorite ตำแหน่ง",
        description: "สร้างรายการ favorite ใหม่ (ผูกกับ userId และ positionId)",
      },
    }
  )

  .delete(
    "/:positionId",
    async ({ session, params: { positionId }, set }) => {
      const response = await favoriteService.delete(session.userId, positionId);
      set.status = 200;
      return response;
    },
    {
      auth: true,
      params: model.params,
      detail: {
        summary: "ลบ favorite",
        description: "ลบรายการ favorite ตาม positionId (เฉพาะของตัวเอง)",
      },
    }
  );
