import { Elysia } from "elysia";

import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { PositionService } from "./service";

const positionService = new PositionService();

export const position = new Elysia({ prefix: "/position", tags: ["Positions"] })
  .use(isAuthenticated)

  .get(
    "/",
    async ({ session, query, set }) => {
      const response = await positionService.findAll(session.userId, query);

      set.status = 200;
      return response;
    },
    {
      auth: true, // role: 1 หรือ 2,3,4--> ในการทำ permission
      query: model.GetPositionsQuery,
      detail: {
        summary: "ดูรายการตำแหน่ง (Owner scope)",
        description:
          "OWNER ดูตำแหน่งที่ประกาศของ Department ตัวเอง (search + pagination)",
      },
    }
  )

  .post(
    "/",
    async ({ session, body, set }) => {
      const response = await positionService.create(session.userId, body);

      set.status = 201;
      return response;
    },
    {
      auth: true,
      body: model.CreatePositionBody,
      detail: {
        summary: "สร้างประกาศตำแหน่งฝึกงาน",
        description:
          "ทำได้เฉพาะ Staff ที่เป็น OWNER และมีสังกัด Department (departmentId จะถูกผูกจากสิทธิ์ ไม่รับจาก body)",
      },
    }
  )

  .put(
    "/:id",
    async ({ params: { id }, body, set, session }) => {
      const response = await positionService.update(session.userId, id, body);

      set.status = 200;
      return response;
    },
    {
      auth: true,
      params: model.params,
      body: model.UpdatePositionBody,
      detail: {
        summary: "แก้ไขประกาศตำแหน่ง",
        description: "แก้ได้เฉพาะตำแหน่งของ Department ตัวเอง",
      },
    }
  )

  .delete(
    "/:id",
    async ({ params: { id }, set, session }) => {
      const response = await positionService.delete(session.userId, id);

      set.status = 200;
      return response;
    },
    {
      auth: true,
      params: model.params,
      detail: {
        summary: "ลบประกาศตำแหน่ง",
        description: "ลบได้เฉพาะตำแหน่งของ Department ตัวเอง",
      },
    }
  );
