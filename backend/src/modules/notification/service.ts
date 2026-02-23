import { and, desc, eq } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "@/common/exceptions";
import { db } from "@/db";
import { notifications, users } from "@/db/schema";

export class NotificationService {
  async create(userId: string, title: string, message: string) {
    const [created] = await db
      .insert(notifications)
      .values({
        userId,
        title,
        message,
        isRead: false,
      })
      .returning({
        id: notifications.id,
        userId: notifications.userId,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
      });

    return created;
  }

  async createMany(userIds: string[], title: string, message: string) {
    const uniq = Array.from(new Set(userIds)).filter(Boolean);
    if (uniq.length === 0) return { count: 0 };

    await db.insert(notifications).values(
      uniq.map((uid) => ({
        userId: uid,
        title,
        message,
        isRead: false,
      }))
    );

    return { count: uniq.length };
  }

  async getMyNotifications(
    userId: string,
    query?: { unreadOnly?: boolean; limit?: number; offset?: number }
  ) {
    const limit = query?.limit ?? 20;
    const offset = query?.offset ?? 0;

    const where = query?.unreadOnly
      ? and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      : eq(notifications.userId, userId);

    const rows = await db
      .select({
        id: notifications.id,
        title: notifications.title,
        message: notifications.message,
        isRead: notifications.isRead,
        createdAt: notifications.createdAt,
        updatedAt: notifications.updatedAt,
      })
      .from(notifications)
      .where(where)
      .orderBy(desc(notifications.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  async markRead(userId: string, notificationId: number, isRead: boolean) {
    const [row] = await db
      .select({ id: notifications.id, owner: notifications.userId })
      .from(notifications)
      .where(eq(notifications.id, notificationId));

    if (!row) throw new NotFoundError("ไม่พบ notification");
    if (row.owner !== userId) throw new ForbiddenError("ไม่มีสิทธิ์");

    const [updated] = await db
      .update(notifications)
      .set({ isRead, updatedAt: new Date() })
      .where(eq(notifications.id, notificationId))
      .returning({
        id: notifications.id,
        isRead: notifications.isRead,
        updatedAt: notifications.updatedAt,
      });

    return updated;
  }

  async markAllRead(userId: string) {
    await db
      .update(notifications)
      .set({ isRead: true, updatedAt: new Date() })
      .where(
        and(eq(notifications.userId, userId), eq(notifications.isRead, false))
      );

    return { success: true };
  }

  async getAdminUserIds() {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.roleId, 1));
    return rows.map((r) => r.id);
  }

  async getOwnerUserIdsByDepartment(departmentId: number) {
    const rows = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.roleId, 2), eq(users.departmentId, departmentId)));
    return rows.map((r) => r.id);
  }
}
