import { Elysia } from "elysia";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { ApplicationStatusActionService } from "./service";

const actionService = new ApplicationStatusActionService();

export const applicationStatusActionsModule = new Elysia({
  prefix: "/application-status-actions",
  tags: ["Application Status Actions"],
})
  .use(isAuthenticated)

  .get(
    "/:applicationStatusId",
    async ({ session, params, query, set }) => {
      const rows = await actionService.getByApplicationStatusId(
        session.userId,
        Number(params.applicationStatusId),
        query
      );
      set.status = 200;
      return rows;
    },
    {
      auth: true,
      params: model.ParamsByApplicationStatusId,
      query: model.GetActionsQuery,
      detail: {
        summary: "ดูประวัติการเปลี่ยนสถานะของใบสมัคร (พร้อมผู้กระทำ)",
      },
    }
  )

  .get(
    "/me",
    async ({ session, query, set }) => {
      const rows = await actionService.getMyActions(session.userId, query);
      set.status = 200;
      return rows;
    },
    {
      auth: true,
      query: model.GetMyActionsQuery,
      detail: {
        summary: "ดูประวัติ action ที่ตัวเองทำ",
      },
    }
  );
