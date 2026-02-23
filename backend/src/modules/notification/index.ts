import { Elysia } from "elysia";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { NotificationService } from "./service";

const notificationService = new NotificationService();

export const notification = new Elysia({
  prefix: "/notifications",
  tags: ["Notifications"],
})
  .use(isAuthenticated)

  .get(
    "/",
    async ({ session, query, set }) => {
      const rows = await notificationService.getMyNotifications(
        session.userId,
        query
      );
      set.status = 200;
      return rows;
    },
    {
      auth: true,
      query: model.GetNotificationsQuery,
      detail: {
        summary: "ดู notifications ของตัวเอง",
      },
    }
  )

  .put(
    "/:id/read",
    async ({ session, params: { id }, body, set }) => {
      const updated = await notificationService.markRead(
        session.userId,
        Number(id),
        body.isRead
      );
      set.status = 200;
      return updated;
    },
    {
      auth: true,
      params: model.params,
      body: model.MarkReadBody,
      detail: {
        summary: "ตั้งค่าอ่านแล้ว/ยังไม่อ่าน",
      },
    }
  )

  .put(
    "/read-all",
    async ({ session, set }) => {
      const res = await notificationService.markAllRead(session.userId);
      set.status = 200;
      return res;
    },
    {
      auth: true,
      detail: {
        summary: "อ่านทั้งหมด",
      },
    }
  );
