import { eq, sql } from "drizzle-orm";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/common/exceptions";
import { db } from "@/db";
import {
  applicationStatuses,
  internshipPositions,
  studentProfiles,
  users,
} from "@/db/schema";
import type { UpdateStudentInternshipStatusBodyType } from "./model";

export class OwnerStudentStatusService {
  async updateInternshipStatus(
    ownerUserId: string,
    studentUserId: string,
    body: UpdateStudentInternshipStatusBodyType
  ) {
    return await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({
          roleId: users.roleId,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(eq(users.id, ownerUserId));

      if (!owner) throw new ForbiddenError("ไม่พบผู้ใช้งาน");
      if (owner.roleId === 3)
        throw new ForbiddenError("อนุญาตเฉพาะ Admin, Owner");
      if (!owner.departmentId) throw new ForbiddenError("Owner ไม่ได้สังกัดกอง");

      const [stuUser] = await tx
        .select({
          id: users.id,
          roleId: users.roleId,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(eq(users.id, studentUserId));

      if (!stuUser) throw new NotFoundError("ไม่พบนักศึกษา");
      if (stuUser.roleId !== 3) throw new BadRequestError("ผู้ใช้นี้ไม่ใช่นักศึกษา");

      if (stuUser.departmentId !== owner.departmentId) {
        throw new ForbiddenError("ไม่สามารถจัดการนักศึกษาต่างกองได้");
      }

      const [sp] = await tx
        .select({
          id: studentProfiles.id,
          internshipStatus: studentProfiles.internshipStatus,
        })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, studentUserId));

      if (!sp) throw new NotFoundError("ไม่พบโปรไฟล์นักศึกษา");

      if (sp.internshipStatus !== "ACTIVE") {
        throw new BadRequestError(
          "เปลี่ยนสถานะได้เฉพาะนักศึกษาที่อยู่ในสถานะ ACTIVE เท่านั้น"
        );
      }

      const [app] = await tx
        .select({
          positionId: applicationStatuses.positionId,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.userId, studentUserId))
        .limit(1);

      if (!app) throw new NotFoundError("ไม่พบข้อมูลการสมัครของนักศึกษา");

      const nextStatus = body.status;

      if (nextStatus === "CANCEL") {
        const reason = body.reason?.trim();
        if (!reason) throw new BadRequestError("กรุณาระบุเหตุผลการ CANCEL");

        await tx
          .update(internshipPositions)
          .set({
            acceptedCount: sql`${internshipPositions.acceptedCount} - 1`,
          })
          .where(eq(internshipPositions.id, app.positionId));

        await tx
          .update(studentProfiles)
          .set({
            internshipStatus: "CANCEL",
            statusNote: reason,
          })
          .where(eq(studentProfiles.userId, studentUserId));

        return { studentUserId, internshipStatus: "CANCEL" };
      }

      await tx
        .update(internshipPositions)
        .set({
          acceptedCount: sql`${internshipPositions.acceptedCount} - 1`,
        })
        .where(eq(internshipPositions.id, app.positionId));

      await tx
        .update(studentProfiles)
        .set({
          internshipStatus: "COMPLETE",
        })
        .where(eq(studentProfiles.userId, studentUserId));

      return { studentUserId, internshipStatus: "COMPLETE" };
    });
  }
}
