import { desc, eq } from "drizzle-orm";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/common/exceptions";
import { db } from "@/db";
import {
  applicationInformations,
  applicationStatuses,
  internshipPositions,
  studentProfiles,
  users,
} from "@/db/schema";

export class ApplicationService {
  async create(userId: string, positionId: number) {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .select({
          id: users.id,
          roleId: users.roleId,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งาน");
      if (user.roleId !== 3) throw new ForbiddenError("อนุญาตเฉพาะนักศึกษา");

      const [sp] = await tx
        .select({
          internshipStatus: studentProfiles.internshipStatus,
        })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId));

      if (!sp) throw new ForbiddenError("ไม่พบโปรไฟล์นักศึกษา");

      const okStatuses = new Set(["PENDING", "COMPLETE", "CANCEL"]);
      if (user.departmentId && !okStatuses.has(sp.internshipStatus)) {
        throw new BadRequestError("ไม่สามารถสมัครกองอื่นได้ในสถานะปัจจุบัน");
      }

      const [pos] = await tx
        .select({
          id: internshipPositions.id,
          departmentId: internshipPositions.departmentId,
          recruitmentStatus: internshipPositions.recruitmentStatus,
        })
        .from(internshipPositions)
        .where(eq(internshipPositions.id, positionId));

      if (!pos) throw new NotFoundError("ไม่พบตำแหน่งฝึกงาน");
      if (pos.recruitmentStatus !== "OPEN") {
        throw new BadRequestError("ตำแหน่งฝึกงานนี้ไม่ได้เปิดรับสมัคร");
      }

      const [last] = await tx
        .select({
          round: applicationStatuses.internshipRound,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.userId, userId))
        .orderBy(desc(applicationStatuses.internshipRound))
        .limit(1);

      const nextRound = (last?.round ?? 0) + 1;

      const activeKey = crypto.randomUUID();

      const [created] = await tx
        .insert(applicationStatuses)
        .values({
          userId,
          positionId: pos.id,
          departmentId: pos.departmentId,
          applicationStatus: "PENDING_DOCUMENT",
          internshipRound: nextRound,
          isActive: true,
          activeKey,
        })
        .returning({
          id: applicationStatuses.id,
          applicationStatus: applicationStatuses.applicationStatus,
          internshipRound: applicationStatuses.internshipRound,
          departmentId: applicationStatuses.departmentId,
          positionId: applicationStatuses.positionId,
        });

      return {
        applicationId: created.id,
        applicationStatus: created.applicationStatus,
        internshipRound: created.internshipRound,
        departmentId: created.departmentId,
        positionId: created.positionId,
      };
    });
  }

  async upsertInformation(
    userId: string,
    applicationId: number,
    data: { skill: string; expectation: string }
  ) {
    return await db.transaction(async (tx) => {
      const [app] = await tx
        .select({
          id: applicationStatuses.id,
          ownerUserId: applicationStatuses.userId,
          status: applicationStatuses.applicationStatus,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.id, applicationId));

      if (!app) throw new NotFoundError("ไม่พบใบสมัคร");
      if (app.ownerUserId !== userId)
        throw new ForbiddenError("ไม่มีสิทธิ์เข้าถึงใบสมัครนี้");
      if (app.status !== "PENDING_DOCUMENT")
        throw new BadRequestError("ไม่สามารถแก้ไขข้อมูลในขั้นตอนนี้ได้");

      const [saved] = await tx
        .insert(applicationInformations)
        .values({
          applicationStatusId: applicationId,
          skill: data.skill,
          expectation: data.expectation,
        })
        .onConflictDoUpdate({
          target: applicationInformations.applicationStatusId,
          set: {
            skill: data.skill,
            expectation: data.expectation,
            updatedAt: new Date(),
          },
        })
        .returning({
          applicationStatusId: applicationInformations.applicationStatusId,
          skill: applicationInformations.skill,
          expectation: applicationInformations.expectation,
        });

      return saved;
    });
  }
}
