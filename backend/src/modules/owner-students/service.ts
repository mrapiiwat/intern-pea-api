import { eq } from "drizzle-orm";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/common/exceptions";
import { db } from "@/db";
import { studentProfiles, users } from "@/db/schema";
import type { UpdateStudentInternshipStatusBodyType } from "./model";

export class OwnerStudentStatusService {
  async updateInternshipStatus(
    ownerUserId: string,
    studentUserId: string,
    body: UpdateStudentInternshipStatusBodyType
  ) {
    return await db.transaction(async (tx) => {
      // check role + department
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

      // check student user exists + same department
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

      // rule: cannot update other department
      if (stuUser.departmentId !== owner.departmentId) {
        throw new ForbiddenError("ไม่สามารถจัดการนักศึกษาต่างกองได้");
      }

      // check student profile + must be ACTIVE
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

      // rule: only CANCEL/COMPLETE already enforced by schema
      const nextStatus = body.status;

      // rule: if CANCEL must have reason
      if (nextStatus === "CANCEL") {
        const reason = body.reason?.trim();
        if (!reason) throw new BadRequestError("กรุณาระบุเหตุผลการ CANCEL");

        await tx
          .update(studentProfiles)
          .set({
            internshipStatus: "CANCEL",
            statusNote: reason,
            // updatedAt: new Date(), // ถ้าคอลัมน์มี
          })
          .where(eq(studentProfiles.userId, studentUserId));

        return { studentUserId, internshipStatus: "CANCEL" };
      }

      // COMPLETE
      await tx
        .update(studentProfiles)
        .set({
          internshipStatus: "COMPLETE",
          // statusNote: null
        })
        .where(eq(studentProfiles.userId, studentUserId));

      return { studentUserId, internshipStatus: "COMPLETE" };
    });
  }
}
