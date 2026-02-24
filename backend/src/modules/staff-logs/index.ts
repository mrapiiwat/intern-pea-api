// staff-logs/index.ts
import { Elysia } from "elysia";
import { db } from "@/db";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { StaffLogsService } from "./service";

const service = new StaffLogsService();

export const staffLogs = new Elysia({
  prefix: "/staff-logs",
  tags: ["Staff Logs"],
})
  .use(isAuthenticated)
  .post(
    "/",
    async ({ session, body, set }) => {
      await service.log(db, session.userId, body.action);
      set.status = 201;
      return { success: true };
    },
    {
      role: [1, 2],
      body: model.CreateStaffLogBody,
    }
  )

  .get(
    "/",
    async ({ session, query, set }) => {
      const rows = await service.findAll(session.userId, query);
      set.status = 200;
      return rows;
    },
    {
      role: [1, 2], // Admin, Owner
      query: model.GetStaffLogsQuery,
      detail: {
        summary: "List staff logs",
        description: "ดู log การกระทำของ Admin และ Owner",
      },
    }
  );
