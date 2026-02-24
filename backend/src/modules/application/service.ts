import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, desc, eq } from "drizzle-orm";
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
  applicationMentors,
  applicationStatuses,
  internshipPositionMentors,
  internshipPositions,
  notifications,
  studentProfiles,
  users,
} from "@/db/schema";
import { BUCKET_NAME, s3Client } from "@/lib/s3";

export class ApplicationService {
  async apply(userId: string, positionId: number) {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

      const [sp] = await tx
        .select({ internshipStatus: studentProfiles.internshipStatus })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId));

      if (!sp) throw new ForbiddenError("ไม่พบโปรไฟล์นักศึกษา");

      const okStatuses = new Set(["IDLE", "COMPLETE", "CANCEL"]);
      if (!okStatuses.has(sp.internshipStatus)) {
        throw new BadRequestError("ไม่สามารถสมัครกองอื่นได้ในสถานะปัจจุบัน");
      }

      const [pos] = await tx
        .select({
          id: internshipPositions.id,
          departmentId: internshipPositions.departmentId,
          recruitmentStatus: internshipPositions.recruitmentStatus,
          resumeRq: internshipPositions.resumeRq,
          portfolioRq: internshipPositions.portfolioRq,
        })
        .from(internshipPositions)
        .where(eq(internshipPositions.id, positionId));

      if (!pos) throw new NotFoundError("ไม่พบตำแหน่งฝึกงาน");
      if (pos.recruitmentStatus !== "OPEN") {
        throw new BadRequestError("ตำแหน่งฝึกงานนี้ไม่ได้เปิดรับสมัคร");
      }

      return {
        positionId: pos.id,
        departmentId: pos.departmentId,
        resumeRq: pos.resumeRq,
        portfolioRq: pos.portfolioRq,
        nextStep: "SUBMIT_INFORMATION",
      };
    });
  }

  async submitInformation(
    userId: string,
    positionId: number,
    data: {
      skill: string;
      expectation: string;
      startDate: Date;
      endDate: Date;
      hours: number;
    }
  ) {
    return await db.transaction(async (tx) => {
      const [user] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));

      if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

      const [sp] = await tx
        .select({ internshipStatus: studentProfiles.internshipStatus })
        .from(studentProfiles)
        .where(eq(studentProfiles.userId, userId));

      if (!sp) throw new ForbiddenError("ไม่พบโปรไฟล์นักศึกษา");

      const okStatuses = new Set(["IDLE", "COMPLETE", "CANCEL"]);
      if (!okStatuses.has(sp.internshipStatus)) {
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
        .select({ round: applicationStatuses.internshipRound })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.userId, userId))
        .orderBy(desc(applicationStatuses.internshipRound))
        .limit(1);

      const nextRound = (last?.round ?? 0) + 1;

      if (!data.startDate || !data.endDate) {
        throw new BadRequestError("กรุณาระบุ startDate และ endDate");
      }
      if (data.endDate < data.startDate) {
        throw new BadRequestError("endDate ต้องมากกว่าหรือเท่ากับ startDate");
      }

      if (data.hours === undefined || data.hours === null) {
        throw new BadRequestError("กรุณาระบุ hours");
      }

      const [app] = await tx
        .insert(applicationStatuses)
        .values({
          userId,
          positionId: pos.id,
          departmentId: pos.departmentId,
          applicationStatus: "PENDING_DOCUMENT",
          internshipRound: nextRound,
          isActive: true,
          activeKey: crypto.randomUUID(),
        })
        .returning({
          id: applicationStatuses.id,
          applicationStatus: applicationStatuses.applicationStatus,
        });

      await tx.insert(applicationInformations).values({
        applicationStatusId: app.id,
        skill: data.skill,
        expectation: data.expectation,
        startDate: data.startDate,
        endDate: data.endDate,
        hours: String(data.hours),
      });

      await tx
        .update(studentProfiles)
        .set({ internshipStatus: "PENDING" })
        .where(eq(studentProfiles.userId, userId));

      return {
        applicationId: app.id,
        applicationStatus: app.applicationStatus,
      };
    });
  }

  async uploadRequiredDocument(
    userId: string,
    applicationId: number,
    docTypeId: 1 | 2 | 3,
    file: File
  ) {
    return await db.transaction(async (tx) => {
      const [app] = await tx
        .select({
          id: applicationStatuses.id,
          ownerUserId: applicationStatuses.userId,
          status: applicationStatuses.applicationStatus,
          positionId: applicationStatuses.positionId,
          departmentId: applicationStatuses.departmentId,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.id, applicationId));

      if (!app) throw new NotFoundError("ไม่พบใบสมัคร");
      if (app.ownerUserId !== userId)
        throw new ForbiddenError("ไม่มีสิทธิ์เข้าถึงใบสมัครนี้");

      const canUploadStatuses = new Set([
        "PENDING_DOCUMENT",
        "PENDING_REQUEST",
      ]);
      if (!canUploadStatuses.has(app.status)) {
        throw new BadRequestError("ไม่อยู่ในขั้นตอนรอยื่นเอกสาร");
      }

      const [pos] = await tx
        .select({
          resumeRq: internshipPositions.resumeRq,
          portfolioRq: internshipPositions.portfolioRq,
        })
        .from(internshipPositions)
        .where(eq(internshipPositions.id, app.positionId));

      if (!pos) throw new NotFoundError("ไม่พบตำแหน่งฝึกงาน");

      if (docTypeId === 2 && !pos.resumeRq) {
        throw new BadRequestError("ตำแหน่งนี้ไม่ได้ require Resume");
      }
      if (docTypeId === 3 && !pos.portfolioRq) {
        throw new BadRequestError("ตำแหน่งนี้ไม่ได้ require Portfolio");
      }

      const ext = file.name.split(".").pop() || "bin";
      const filename = `${uuidv4()}.${ext}`;
      const s3Key = `applications/${applicationId}/${docTypeId}/${filename}`;

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

      const nextValidationStatus =
        app.status === "PENDING_DOCUMENT" ? "VERIFIED" : "PENDING";

      await tx
        .insert(applicationDocuments)
        .values({
          applicationStatusId: applicationId,
          docTypeId,
          docFile: s3Key,
          validationStatus: nextValidationStatus,
          note: null,
        })
        .onConflictDoUpdate({
          target: [
            applicationDocuments.applicationStatusId,
            applicationDocuments.docTypeId,
          ],
          set: {
            docFile: s3Key,
            validationStatus: nextValidationStatus,
            note: null,
            updatedAt: new Date(),
          },
        });

      if (app.status === "PENDING_DOCUMENT") {
        const requiredDocTypeIds: number[] = [1];
        if (pos.resumeRq) requiredDocTypeIds.push(2);
        if (pos.portfolioRq) requiredDocTypeIds.push(3);

        const uploaded = await tx
          .select({ docTypeId: applicationDocuments.docTypeId })
          .from(applicationDocuments)
          .where(eq(applicationDocuments.applicationStatusId, applicationId));

        const uploadedSet = new Set(uploaded.map((d) => d.docTypeId));
        const isComplete = requiredDocTypeIds.every((id) =>
          uploadedSet.has(id)
        );

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
            .set({ internshipStatus: "INTERVIEW" })
            .where(eq(studentProfiles.userId, userId));

          const owners = await tx
            .select({ id: users.id })
            .from(users)
            .where(
              and(eq(users.roleId, 2), eq(users.departmentId, app.departmentId))
            );

          if (owners.length > 0) {
            await tx.insert(notifications).values(
              owners.map((o) => ({
                userId: o.id,
                title: "มีใบสมัครใหม่รอสัมภาษณ์",
                message: `มีนักศึกษาส่งเอกสารครบแล้ว (Application #${applicationId})`,
                isRead: false,
              }))
            );
          }
        }

        return {
          key: s3Key,
          docTypeId,
          validationStatus: nextValidationStatus,
          applicationStatus: isComplete
            ? "PENDING_INTERVIEW"
            : "PENDING_DOCUMENT",
        };
      }

      return {
        key: s3Key,
        docTypeId,
        validationStatus: nextValidationStatus,
        applicationStatus: "PENDING_REQUEST",
      };
    });
  }

  async approveInterview(ownerUserId: string, applicationId: number) {
    return await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({ departmentId: users.departmentId })
        .from(users)
        .where(eq(users.id, ownerUserId));

      if (!owner?.departmentId) throw new ForbiddenError("ไม่มีสิทธิ์อนุมัติ");

      const [app] = await tx
        .select({
          id: applicationStatuses.id,
          status: applicationStatuses.applicationStatus,
          departmentId: applicationStatuses.departmentId,
          userId: applicationStatuses.userId,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.id, applicationId));

      if (!app) throw new NotFoundError("ไม่พบใบสมัคร");
      if (app.status !== "PENDING_INTERVIEW")
        throw new BadRequestError("สถานะไม่ถูกต้อง");
      if (app.departmentId !== owner.departmentId)
        throw new ForbiddenError("ไม่ใช่กองของตน");

      await tx
        .update(applicationStatuses)
        .set({
          applicationStatus: "PENDING_CONFIRMATION",
          updatedAt: new Date(),
        })
        .where(eq(applicationStatuses.id, applicationId));

      await tx
        .update(studentProfiles)
        .set({ internshipStatus: "REVIEW" })
        .where(eq(studentProfiles.userId, app.userId));

      await tx.insert(notifications).values({
        userId: app.userId,
        title: "อัปเดตสถานะการสมัคร",
        message: `คุณผ่านขั้นตอนสัมภาษณ์แล้ว (Application #${applicationId})`,
        isRead: false,
      });

      return { applicationStatus: "PENDING_CONFIRMATION" };
    });
  }

  async confirmAccept(ownerUserId: string, applicationId: number) {
    return await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({ departmentId: users.departmentId })
        .from(users)
        .where(eq(users.id, ownerUserId));

      if (!owner?.departmentId) throw new ForbiddenError("ไม่มีสิทธิ์อนุมัติ");

      const [app] = await tx
        .select({
          id: applicationStatuses.id,
          status: applicationStatuses.applicationStatus,
          departmentId: applicationStatuses.departmentId,
          userId: applicationStatuses.userId,
          positionId: applicationStatuses.positionId,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.id, applicationId));

      if (!app) throw new NotFoundError("ไม่พบใบสมัคร");
      if (app.status !== "PENDING_CONFIRMATION")
        throw new BadRequestError("สถานะไม่ถูกต้อง");
      if (app.departmentId !== owner.departmentId)
        throw new ForbiddenError("ไม่ใช่กองของตน");

      await tx
        .update(applicationStatuses)
        .set({
          applicationStatus: "PENDING_REQUEST",
          updatedAt: new Date(),
        })
        .where(eq(applicationStatuses.id, applicationId));

      await tx
        .update(studentProfiles)
        .set({ internshipStatus: "ACCEPT" })
        .where(eq(studentProfiles.userId, app.userId));

      await tx
        .update(users)
        .set({ departmentId: app.departmentId })
        .where(eq(users.id, app.userId));

      const mentors = await tx
        .select({
          mentorStaffId: internshipPositionMentors.mentorStaffId,
        })
        .from(internshipPositionMentors)
        .where(eq(internshipPositionMentors.positionId, app.positionId));

      if (mentors.length > 0) {
        await tx
          .insert(applicationMentors)
          .values(
            mentors.map((m) => ({
              applicationStatusId: applicationId,
              mentorId: m.mentorStaffId,
            }))
          )
          .onConflictDoNothing();
      }

      await tx.insert(notifications).values({
        userId: app.userId,
        title: "อัปเดตสถานะการสมัคร",
        message: `คุณได้รับการตอบรับแล้ว กรุณายื่นเอกสารขอความอนุเคราะห์ (Application #${applicationId})`,
        isRead: false,
      });

      return {
        applicationStatus: "PENDING_REQUEST",
        mentorsLinked: mentors.length,
      };
    });
  }

  async uploadRequestLetter(userId: string, applicationId: number, file: File) {
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
      if (app.status !== "PENDING_REQUEST")
        throw new BadRequestError("ไม่อยู่ในขั้นตอนรอยื่นเอกสารขอความอนุเคราะห์");

      const ext = file.name.split(".").pop() || "bin";
      const filename = `${uuidv4()}.${ext}`;
      const s3Key = `applications/${applicationId}/4/${filename}`;

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
          docTypeId: 4,
          docFile: s3Key,
          validationStatus: "PENDING",
          note: null,
        })
        .onConflictDoUpdate({
          target: [
            applicationDocuments.applicationStatusId,
            applicationDocuments.docTypeId,
          ],
          set: {
            docFile: s3Key,
            validationStatus: "PENDING",
            note: null,
            updatedAt: new Date(),
          },
        });

      await tx
        .update(applicationStatuses)
        .set({
          applicationStatus: "PENDING_REVIEW",
          updatedAt: new Date(),
        })
        .where(eq(applicationStatuses.id, applicationId));

      const admins = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.roleId, 1));

      if (admins.length > 0) {
        await tx.insert(notifications).values(
          admins.map((a) => ({
            userId: a.id,
            title: "มีเอกสารรอตรวจสอบ",
            message: `มีนักศึกษาส่งเอกสารขอความอนุเคราะห์แล้ว (Application #${applicationId})`,
            isRead: false,
          }))
        );
      }

      return {
        key: s3Key,
        validationStatus: "PENDING",
        applicationStatus: "PENDING_REVIEW",
      };
    });
  }

  async reviewDocument(
    adminUserId: string,
    applicationId: number,
    docTypeId: 1 | 2 | 3 | 4,
    status: "VERIFIED" | "INVALID",
    note?: string
  ) {
    return await db.transaction(async (tx) => {
      const [adminUser] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, adminUserId));

      if (!adminUser) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

      const [app] = await tx
        .select({
          id: applicationStatuses.id,
          userId: applicationStatuses.userId,
          status: applicationStatuses.applicationStatus,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.id, applicationId));

      if (!app) throw new NotFoundError("ไม่พบใบสมัคร");
      if (app.status !== "PENDING_REVIEW" && app.status !== "PENDING_REQUEST") {
        throw new BadRequestError(
          "สถานะไม่ถูกต้องสำหรับการตรวจเอกสาร โปรดรอถึงขั้นตอนตรวจสอบเอกสารขอความอนุเคราะห์"
        );
      }

      const [doc] = await tx
        .select({ id: applicationDocuments.id })
        .from(applicationDocuments)
        .where(
          and(
            eq(applicationDocuments.applicationStatusId, applicationId),
            eq(applicationDocuments.docTypeId, docTypeId)
          )
        );

      if (!doc) throw new NotFoundError("ไม่พบเอกสาร");

      await tx
        .update(applicationDocuments)
        .set({
          validationStatus: status,
          note: status === "INVALID" ? (note ?? null) : null,
          updatedAt: new Date(),
        })
        .where(eq(applicationDocuments.id, doc.id));

      const isAfterRequestStage =
        app.status === "PENDING_REQUEST" || app.status === "PENDING_REVIEW";

      if (status === "INVALID") {
        if (isAfterRequestStage) {
          await tx
            .update(applicationStatuses)
            .set({
              applicationStatus: "PENDING_REQUEST",
              updatedAt: new Date(),
            })
            .where(eq(applicationStatuses.id, applicationId));

          await tx.insert(notifications).values({
            userId: app.userId,
            title: "เอกสารถูกตีกลับ",
            message: `เอกสารถูกตีกลับ กรุณาอัปโหลดใหม่ (Application #${applicationId})`,
            isRead: false,
          });

          return { applicationStatus: "PENDING_REQUEST" };
        }

        return { applicationStatus: app.status };
      }

      if (status === "VERIFIED" && isAfterRequestStage) {
        const docs = await tx
          .select({
            validationStatus: applicationDocuments.validationStatus,
          })
          .from(applicationDocuments)
          .where(eq(applicationDocuments.applicationStatusId, applicationId));

        const allVerified = docs.every(
          (d) => d.validationStatus === "VERIFIED"
        );

        if (allVerified) {
          await tx
            .update(applicationStatuses)
            .set({
              applicationStatus: "COMPLETE",
              updatedAt: new Date(),
            })
            .where(eq(applicationStatuses.id, applicationId));

          await tx
            .update(studentProfiles)
            .set({ internshipStatus: "ACTIVE" })
            .where(eq(studentProfiles.userId, app.userId));

          await tx.insert(notifications).values({
            userId: app.userId,
            title: "การสมัครเสร็จสมบูรณ์",
            message: `เอกสารผ่านการตรวจสอบครบแล้ว การสมัครเสร็จสมบูรณ์ (Application #${applicationId})`,
            isRead: false,
          });

          return { applicationStatus: "COMPLETE" };
        }
      }

      return { applicationStatus: app.status };
    });
  }

  async getMyHistory(userId: string, includeCanceled = true) {
    return await db.transaction(async (tx) => {
      const [me] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));

      if (!me) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

      const whereClause = includeCanceled
        ? eq(applicationStatuses.userId, userId)
        : and(
            eq(applicationStatuses.userId, userId),
            eq(applicationStatuses.applicationStatus, "CANCEL")
          );

      const rows = await tx
        .select({
          applicationId: applicationStatuses.id,
          applicationStatus: applicationStatuses.applicationStatus,
          internshipRound: applicationStatuses.internshipRound,
          isActive: applicationStatuses.isActive,
          createdAt: applicationStatuses.createdAt,
          updatedAt: applicationStatuses.updatedAt,

          positionId: internshipPositions.id,
          positionName: internshipPositions.name,
          positionDepartmentId: internshipPositions.departmentId,
          positionOfficeId: internshipPositions.officeId,
        })
        .from(applicationStatuses)
        .leftJoin(
          internshipPositions,
          eq(internshipPositions.id, applicationStatuses.positionId)
        )
        .where(whereClause)
        .orderBy(desc(applicationStatuses.internshipRound));

      return rows;
    });
  }

  async getStudentHistory(
    requesterUserId: string,
    studentUserId: string,
    _includeCanceled = true
  ) {
    return await db.transaction(async (tx) => {
      const [req] = await tx
        .select({
          id: users.id,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(eq(users.id, requesterUserId));

      if (!req) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

      const [student] = await tx
        .select({ departmentId: users.departmentId })
        .from(users)
        .where(eq(users.id, studentUserId));

      if (!student) throw new NotFoundError("ไม่พบนักศึกษา");

      if (
        req.departmentId &&
        student.departmentId &&
        req.departmentId !== student.departmentId
      ) {
        throw new ForbiddenError("ไม่ใช่กองของตน");
      }

      const rows = await tx
        .select({
          applicationId: applicationStatuses.id,
          applicationStatus: applicationStatuses.applicationStatus,
          internshipRound: applicationStatuses.internshipRound,
          isActive: applicationStatuses.isActive,
          createdAt: applicationStatuses.createdAt,
          updatedAt: applicationStatuses.updatedAt,

          positionId: internshipPositions.id,
          positionName: internshipPositions.name,
          positionDepartmentId: internshipPositions.departmentId,
          positionOfficeId: internshipPositions.officeId,
        })
        .from(applicationStatuses)
        .leftJoin(
          internshipPositions,
          eq(internshipPositions.id, applicationStatuses.positionId)
        )
        .where(eq(applicationStatuses.userId, studentUserId))
        .orderBy(desc(applicationStatuses.internshipRound));

      return rows;
    });
  }

  async reviewRequestLetter(
    adminUserId: string,
    applicationId: number,
    status: "VERIFIED" | "INVALID",
    note?: string
  ) {
    return this.reviewDocument(adminUserId, applicationId, 4, status, note);
  }

  async cancelByStudent(userId: string, applicationId: number) {
    return await db.transaction(async (tx) => {
      const [me] = await tx
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, userId));

      if (!me) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

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

      if (app.status !== "PENDING_DOCUMENT") {
        throw new BadRequestError("ยกเลิกได้เฉพาะก่อนส่งเอกสาร (PENDING_DOCUMENT)");
      }

      // ต้องยังไม่ส่งเอกสารใดๆ
      const [doc] = await tx
        .select({ id: applicationDocuments.id })
        .from(applicationDocuments)
        .where(eq(applicationDocuments.applicationStatusId, applicationId))
        .limit(1);

      if (doc) {
        throw new BadRequestError("ไม่สามารถยกเลิกได้ เพราะมีการส่งเอกสารแล้ว");
      }

      await tx
        .update(applicationStatuses)
        .set({
          applicationStatus: "CANCEL",
          statusNote: null,
          updatedAt: new Date(),
        })
        .where(eq(applicationStatuses.id, applicationId));

      await tx
        .update(studentProfiles)
        .set({ internshipStatus: "CANCEL" })
        .where(eq(studentProfiles.userId, userId));

      return { applicationStatus: "CANCEL" };
    });
  }

  async cancelByOwner(
    ownerUserId: string,
    applicationId: number,
    reason: string
  ) {
    return await db.transaction(async (tx) => {
      const [owner] = await tx
        .select({ id: users.id, departmentId: users.departmentId })
        .from(users)
        .where(eq(users.id, ownerUserId));

      if (!owner) throw new ForbiddenError("ไม่พบผู้ใช้งาน");
      if (!owner.departmentId) throw new ForbiddenError("ไม่มีสิทธิ์อนุมัติ");

      const [app] = await tx
        .select({
          id: applicationStatuses.id,
          status: applicationStatuses.applicationStatus,
          departmentId: applicationStatuses.departmentId,
          studentUserId: applicationStatuses.userId,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.id, applicationId));

      if (!app) throw new NotFoundError("ไม่พบใบสมัคร");

      const canCancel = new Set(["PENDING_INTERVIEW", "PENDING_CONFIRMATION"]);
      if (!canCancel.has(app.status)) {
        throw new BadRequestError("สถานะไม่ถูกต้องสำหรับการไม่อนุมัติ");
      }

      if (app.departmentId !== owner.departmentId) {
        throw new ForbiddenError("ไม่ใช่กองของตน");
      }

      if (!reason || reason.trim().length === 0) {
        throw new BadRequestError("กรุณาระบุเหตุผล");
      }

      await tx
        .update(applicationStatuses)
        .set({
          applicationStatus: "CANCEL",
          statusNote: reason.trim(),
          updatedAt: new Date(),
        })
        .where(eq(applicationStatuses.id, applicationId));

      await tx
        .update(studentProfiles)
        .set({ internshipStatus: "CANCEL" })
        .where(eq(studentProfiles.userId, app.studentUserId));

      await tx.insert(notifications).values({
        userId: app.studentUserId,
        title: "การสมัครถูกยกเลิก",
        message: `ใบสมัครของคุณถูกยกเลิกโดยกองงาน (Application #${applicationId})`,
        isRead: false,
      });

      return { applicationStatus: "CANCEL" };
    });
  }
}
