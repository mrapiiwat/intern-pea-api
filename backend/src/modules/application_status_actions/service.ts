import { desc, eq } from "drizzle-orm";
import { ForbiddenError, NotFoundError } from "@/common/exceptions";
import { db } from "@/db";
import {
  applicationStatusActions,
  applicationStatuses,
  users,
} from "@/db/schema";
import type * as model from "./model";

export class ApplicationStatusActionService {
  async create(params: {
    applicationStatusId: number;
    actionBy: string; // userId
    oldStatus: string | null;
    newStatus: string;
  }) {
    const [created] = await db
      .insert(applicationStatusActions)
      .values({
        applicationStatusId: params.applicationStatusId,
        actionBy: params.actionBy,
        oldStatus: params.oldStatus,
        newStatus: params.newStatus,
      })
      .returning({
        id: applicationStatusActions.id,
        applicationStatusId: applicationStatusActions.applicationStatusId,
        actionBy: applicationStatusActions.actionBy,
        oldStatus: applicationStatusActions.oldStatus,
        newStatus: applicationStatusActions.newStatus,
        createdAt: applicationStatusActions.createdAt,
      });

    return created;
  }

  // timeline ของ application_status หนึ่งรายการ
  async getByApplicationStatusId(
    requesterId: string,
    applicationStatusId: number,
    query?: model.GetActionsQueryType
  ) {
    const limit = query?.limit ?? 50;
    const offset = query?.offset ?? 0;

    // หาใบสมัคร
    const [app] = await db
      .select({
        id: applicationStatuses.id,
        ownerUserId: applicationStatuses.userId,
        departmentId: applicationStatuses.departmentId,
      })
      .from(applicationStatuses)
      .where(eq(applicationStatuses.id, applicationStatusId));

    if (!app) throw new NotFoundError("ไม่พบ application_status");

    // role ของ requester
    const [me] = await db
      .select({
        id: users.id,
        roleId: users.roleId,
        departmentId: users.departmentId,
      })
      .from(users)
      .where(eq(users.id, requesterId));

    if (!me) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

    const isStudentOwner = requesterId === app.ownerUserId;
    const isAdmin = me.roleId === 1;
    const isOwnerSameDept =
      me.roleId === 2 && me.departmentId === app.departmentId;

    if (!isStudentOwner && !isAdmin && !isOwnerSameDept) {
      throw new ForbiddenError("ไม่มีสิทธิ์ดูประวัติใบสมัครนี้");
    }

    // join users เพื่อเอาข้อมูลคนกระทำ
    const rows = await db
      .select({
        id: applicationStatusActions.id,
        applicationStatusId: applicationStatusActions.applicationStatusId,
        oldStatus: applicationStatusActions.oldStatus,
        newStatus: applicationStatusActions.newStatus,
        createdAt: applicationStatusActions.createdAt,
        actor: {
          id: users.id,
          fname: users.fname,
          lname: users.lname,
          displayUsername: users.displayUsername,
          roleId: users.roleId,
          departmentId: users.departmentId,
        },
      })
      .from(applicationStatusActions)
      .innerJoin(users, eq(users.id, applicationStatusActions.actionBy))
      .where(
        eq(applicationStatusActions.applicationStatusId, applicationStatusId)
      )
      .orderBy(desc(applicationStatusActions.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }

  // action ที่ me เป็นคนทำ
  async getMyActions(userId: string, query?: model.GetMyActionsQueryType) {
    const limit = query?.limit ?? 50;
    const offset = query?.offset ?? 0;

    const rows = await db
      .select({
        id: applicationStatusActions.id,
        applicationStatusId: applicationStatusActions.applicationStatusId,
        oldStatus: applicationStatusActions.oldStatus,
        newStatus: applicationStatusActions.newStatus,
        createdAt: applicationStatusActions.createdAt,
      })
      .from(applicationStatusActions)
      .where(eq(applicationStatusActions.actionBy, userId))
      .orderBy(desc(applicationStatusActions.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }
}
