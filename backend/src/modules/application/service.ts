import { PutObjectCommand } from "@aws-sdk/client-s3";
import { desc, eq } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";
import {
  BadRequestError,
  ForbiddenError,
  NotFoundError,
} from "@/common/exceptions";
import { db } from "@/db";
import {
  applicationDocuments,
  applicationInformations,
  applicationStatuses,
  internshipPositions,
  studentProfiles,
  users,
} from "@/db/schema";
import { BUCKET_NAME, s3Client } from "@/lib/s3";

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

  async uploadTranscript(userId: string, applicationId: number, file: File) {
    return await db.transaction(async (tx) => {
      const [app] = await tx
        .select({
          id: applicationStatuses.id,
          ownerUserId: applicationStatuses.userId,
          status: applicationStatuses.applicationStatus,
          positionId: applicationStatuses.positionId,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.id, applicationId));

      if (!app) throw new NotFoundError("ไม่พบใบสมัคร");
      if (app.ownerUserId !== userId)
        throw new ForbiddenError("ไม่มีสิทธิ์เข้าถึงใบสมัครนี้");
      if (app.status !== "PENDING_DOCUMENT")
        throw new BadRequestError("ไม่อยู่ในขั้นตอนรอยื่นเอกสาร");

      const [pos] = await tx
        .select({
          resumeRq: internshipPositions.resumeRq,
          portfolioRq: internshipPositions.portfolioRq,
        })
        .from(internshipPositions)
        .where(eq(internshipPositions.id, app.positionId));

      if (!pos) throw new NotFoundError("ไม่พบตำแหน่งฝึกงาน");

      const ext = file.name.split(".").pop() || "bin";
      const filename = `${uuidv4()}.${ext}`;
      const s3Key = `applications/${applicationId}/1/${filename}`;

      const arrayBuffer = await file.arrayBuffer();
      const buffer = new Uint8Array(arrayBuffer);

      await s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET_NAME,
          Key: s3Key,
          Body: buffer,
          ContentType: file.type,
        })
      );

      await tx
        .insert(applicationDocuments)
        .values({
          applicationStatusId: applicationId,
          docTypeId: 1,
          docFile: s3Key,
          validationStatus: "VERIFIED",
          note: null,
        })
        .onConflictDoUpdate({
          target: [
            applicationDocuments.applicationStatusId,
            applicationDocuments.docTypeId,
          ],
          set: {
            docFile: s3Key,
            validationStatus: "VERIFIED",
            note: null,
            updatedAt: new Date(),
          },
        });

      const requiredDocTypeIds: number[] = [1];
      if (pos.resumeRq) requiredDocTypeIds.push(2);
      if (pos.portfolioRq) requiredDocTypeIds.push(3);

      const uploaded = await tx
        .select({
          docTypeId: applicationDocuments.docTypeId,
        })
        .from(applicationDocuments)
        .where(eq(applicationDocuments.applicationStatusId, applicationId));

      const uploadedSet = new Set(uploaded.map((d) => d.docTypeId));
      const isComplete = requiredDocTypeIds.every((id) => uploadedSet.has(id));

      if (isComplete) {
        await tx
          .update(applicationStatuses)
          .set({
            applicationStatus: "PENDING_INTERVIEW",
            updatedAt: new Date(),
          })
          .where(eq(applicationStatuses.id, applicationId));

        await tx
          .update(studentProfiles)
          .set({
            internshipStatus: "INTERVIEW",
          })
          .where(eq(studentProfiles.userId, userId));
      }

      return {
        key: s3Key,
        validationStatus: "VERIFIED",
        applicationStatus: isComplete
          ? "PENDING_INTERVIEW"
          : "PENDING_DOCUMENT",
      };
    });
  }
}
