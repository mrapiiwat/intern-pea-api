import { PutObjectCommand } from "@aws-sdk/client-s3";
import { and, count, desc, eq, ilike, inArray, ne, or } from "drizzle-orm";
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
  applicationStatusActions,
  applicationStatuses,
  institutions,
  internshipPositionMentors,
  internshipPositions,
  notifications,
  staffProfiles,
  studentProfiles,
  users,
} from "@/db/schema";
import { BUCKET_NAME, s3Client } from "@/lib/s3";
import { StaffLogsService } from "@/modules/staff-logs/service";
import type * as model from "./model";

const staffLogsService = new StaffLogsService();
type DbTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export class ApplicationService {
  private async logAppStatusAction(
    tx: DbTx,
    applicationStatusId: number,
    actionBy: string,
    oldStatus: string | null,
    newStatus: string
  ) {
    await tx.insert(applicationStatusActions).values({
      applicationStatusId,
      actionBy,
      oldStatus,
      newStatus,
    });
  }

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

      await this.logAppStatusAction(
        tx,
        app.id,
        userId,
        null,
        "PENDING_DOCUMENT"
      );

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

          await this.logAppStatusAction(
            tx,
            applicationId,
            userId,
            "PENDING_DOCUMENT",
            "PENDING_INTERVIEW"
          );

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

      await this.logAppStatusAction(
        tx,
        applicationId,
        ownerUserId,
        "PENDING_INTERVIEW",
        "PENDING_CONFIRMATION"
      );

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

      await staffLogsService.log(
        tx,
        ownerUserId,
        `APPROVE_INTERVIEW applicationId=${applicationId}`
      );

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

      await this.logAppStatusAction(
        tx,
        applicationId,
        ownerUserId,
        "PENDING_CONFIRMATION",
        "PENDING_REQUEST"
      );

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

      await staffLogsService.log(
        tx,
        ownerUserId,
        `CONFIRM_ACCEPT applicationId=${applicationId}`
      );

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

      await this.logAppStatusAction(
        tx,
        applicationId,
        userId,
        "PENDING_REQUEST",
        "PENDING_REVIEW"
      );

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

      await staffLogsService.log(
        tx,
        adminUserId,
        `REVIEW_DOCUMENT applicationId=${applicationId} docTypeId=${docTypeId} status=${status}`
      );

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

          await this.logAppStatusAction(
            tx,
            applicationId,
            adminUserId,
            app.status,
            "PENDING_REQUEST"
          );

          await tx.insert(notifications).values({
            userId: app.userId,
            title: "เอกสารถูกตีกลับ",
            message: `เอกสารถูกตีกลับ กรุณาอัปโหลดใหม่ (Application #${applicationId})`,
            isRead: false,
          });

          await staffLogsService.log(
            tx,
            adminUserId,
            `APPLICATION_STATUS_CHANGE applicationId=${applicationId} to=PENDING_REQUEST`
          );

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

          await this.logAppStatusAction(
            tx,
            applicationId,
            adminUserId,
            app.status,
            "COMPLETE"
          );

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

          await staffLogsService.log(
            tx,
            adminUserId,
            `APPLICATION_STATUS_CHANGE applicationId=${applicationId} to=COMPLETE`
          );

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
          statusNote: applicationStatuses.statusNote,
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
          statusNote: applicationStatuses.statusNote,
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

  async getAllStudentsHistory(
    requesterUserId: string,
    query: model.AllStudentsHistoryQueryType
  ) {
    return await db.transaction(async (tx) => {
      const [req] = await tx
        .select({
          id: users.id,
          roleId: users.roleId,
          departmentId: users.departmentId,
        })
        .from(users)
        .where(eq(users.id, requesterUserId));

      if (!req) throw new ForbiddenError("ไม่พบผู้ใช้งาน");
      if (req.roleId !== 1 && req.roleId !== 2)
        throw new ForbiddenError("อนุญาตเฉพาะ Admin/Owner");

      const page = query.page ?? 1;
      const limit = query.limit ?? 20;
      const offset = (page - 1) * limit;

      const conditions = [];

      // owner เห็นเฉพาะของกองตัวเอง
      if (req.roleId === 2) {
        if (!req.departmentId) throw new ForbiddenError("ไม่มี department");
        conditions.push(eq(applicationStatuses.departmentId, req.departmentId));
      }

      // filter: includeCanceled=false -> ไม่เอา CANCEL
      if (query.includeCanceled === false) {
        conditions.push(ne(applicationStatuses.applicationStatus, "CANCEL"));
      }

      // filter: status
      if (query.status) {
        conditions.push(
          eq(applicationStatuses.applicationStatus, query.status)
        );
      }

      // filter: positionId (ถ้ามีส่งมา)
      if (query.positionId) {
        conditions.push(eq(applicationStatuses.positionId, query.positionId));
      }

      // search
      if (query.q && query.q.trim().length > 0) {
        const like = `%${query.q.trim()}%`;
        conditions.push(
          or(
            ilike(users.fname, like),
            ilike(users.lname, like),
            ilike(users.email, like),
            ilike(users.phoneNumber, like)
          )!
        );
      }

      const whereClause = conditions.length ? and(...conditions) : undefined;

      const rows = await tx
        .select({
          applicationId: applicationStatuses.id,
          applicationStatus: applicationStatuses.applicationStatus,
          internshipRound: applicationStatuses.internshipRound,
          isActive: applicationStatuses.isActive,
          statusNote: applicationStatuses.statusNote,
          createdAt: applicationStatuses.createdAt,
          updatedAt: applicationStatuses.updatedAt,

          studentUserId: users.id,
          fname: users.fname,
          lname: users.lname,
          email: users.email,
          phoneNumber: users.phoneNumber,
          gender: users.gender,

          studentInternshipStatus: studentProfiles.internshipStatus,
          institutionId: studentProfiles.institutionId,
          faculty: studentProfiles.faculty,
          major: studentProfiles.major,
          profileHours: studentProfiles.hours,
          profileStartDate: studentProfiles.startDate,
          profileEndDate: studentProfiles.endDate,
          studentNote: studentProfiles.studentNote,

          institutionName: institutions.name,
          institutionType: institutions.institutionsType,

          infoSkill: applicationInformations.skill,
          infoExpectation: applicationInformations.expectation,
          infoStartDate: applicationInformations.startDate,
          infoEndDate: applicationInformations.endDate,
          infoHours: applicationInformations.hours,

          positionId: internshipPositions.id,
          positionName: internshipPositions.name,
          departmentId: internshipPositions.departmentId,
          officeId: internshipPositions.officeId,
        })
        .from(applicationStatuses)
        .leftJoin(users, eq(users.id, applicationStatuses.userId))
        .leftJoin(studentProfiles, eq(studentProfiles.userId, users.id))
        .leftJoin(
          institutions,
          eq(institutions.id, studentProfiles.institutionId)
        )
        .leftJoin(
          applicationInformations,
          eq(
            applicationInformations.applicationStatusId,
            applicationStatuses.id
          )
        )
        .leftJoin(
          internshipPositions,
          eq(internshipPositions.id, applicationStatuses.positionId)
        )
        .where(whereClause)
        .orderBy(desc(applicationStatuses.updatedAt))
        .limit(limit)
        .offset(offset);

      // Fetch documents for each application
      const appIds = rows.map((r) => r.applicationId);
      const allDocs = appIds.length
        ? await tx
            .select({
              applicationStatusId: applicationDocuments.applicationStatusId,
              docTypeId: applicationDocuments.docTypeId,
              docFile: applicationDocuments.docFile,
              validationStatus: applicationDocuments.validationStatus,
            })
            .from(applicationDocuments)
            .where(inArray(applicationDocuments.applicationStatusId, appIds))
        : [];

      // Fetch mentors for each application
      const allMentors = appIds.length
        ? await tx
            .select({
              applicationStatusId: applicationMentors.applicationStatusId,
              mentorStaffId: applicationMentors.mentorId,
              mentorFname: users.fname,
              mentorLname: users.lname,
              mentorEmail: users.email,
              mentorPhone: users.phoneNumber,
            })
            .from(applicationMentors)
            .leftJoin(
              staffProfiles,
              eq(staffProfiles.id, applicationMentors.mentorId)
            )
            .leftJoin(users, eq(users.id, staffProfiles.userId))
            .where(inArray(applicationMentors.applicationStatusId, appIds))
        : [];

      // Build docs/mentors maps
      const docsMap = new Map<number, typeof allDocs>();
      for (const doc of allDocs) {
        const arr = docsMap.get(doc.applicationStatusId) ?? [];
        arr.push(doc);
        docsMap.set(doc.applicationStatusId, arr);
      }
      const mentorsMap = new Map<number, typeof allMentors>();
      for (const m of allMentors) {
        const arr = mentorsMap.get(m.applicationStatusId) ?? [];
        arr.push(m);
        mentorsMap.set(m.applicationStatusId, arr);
      }

      const data = rows.map((row) => ({
        applicationId: row.applicationId,
        applicationStatus: row.applicationStatus,
        internshipRound: row.internshipRound,
        isActive: row.isActive,
        statusNote: row.statusNote,
        createdAt: row.createdAt,
        updatedAt: row.updatedAt,
        studentUserId: row.studentUserId,
        fname: row.fname,
        lname: row.lname,
        email: row.email,
        phoneNumber: row.phoneNumber,
        gender: row.gender,
        studentInternshipStatus: row.studentInternshipStatus,
        institutionName: row.institutionName,
        institutionType: row.institutionType,
        faculty: row.faculty,
        major: row.major,
        profileHours: row.profileHours,
        profileStartDate: row.profileStartDate,
        profileEndDate: row.profileEndDate,
        studentNote: row.studentNote,
        infoSkill: row.infoSkill,
        infoExpectation: row.infoExpectation,
        infoStartDate: row.infoStartDate,
        infoEndDate: row.infoEndDate,
        infoHours: row.infoHours,
        positionId: row.positionId,
        positionName: row.positionName,
        departmentId: row.departmentId,
        officeId: row.officeId,
        documents: (docsMap.get(row.applicationId) ?? []).map((d) => ({
          docTypeId: d.docTypeId,
          docFile: d.docFile,
          validationStatus: d.validationStatus,
        })),
        mentors: (mentorsMap.get(row.applicationId) ?? []).map((m) => ({
          fname: m.mentorFname,
          lname: m.mentorLname,
          email: m.mentorEmail,
          phone: m.mentorPhone,
        })),
      }));

      const [totalRow] = await tx
        .select({ count: count() })
        .from(applicationStatuses)
        .leftJoin(users, eq(users.id, applicationStatuses.userId))
        .where(whereClause);

      const total = Number(totalRow?.count ?? 0);
      const totalPages = Math.ceil(total / limit);

      return {
        data,
        meta: {
          total,
          page,
          limit,
          totalPages,
          hasNextPage: page < totalPages,
        },
      };
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

      await this.logAppStatusAction(
        tx,
        applicationId,
        userId,
        "PENDING_DOCUMENT",
        "CANCEL"
      );

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

      await this.logAppStatusAction(
        tx,
        applicationId,
        ownerUserId,
        app.status,
        "CANCEL"
      );

      await tx
        .update(studentProfiles)
        .set({ internshipStatus: "IDLE" })
        .where(eq(studentProfiles.userId, app.studentUserId));

      await tx.insert(notifications).values({
        userId: app.studentUserId,
        title: "การสมัครถูกยกเลิก",
        message: `ใบสมัครของคุณถูกยกเลิกโดยกองงาน (Application #${applicationId})`,
        isRead: false,
      });

      await staffLogsService.log(
        tx,
        ownerUserId,
        `CANCEL_BY_OWNER applicationId=${applicationId}`
      );

      return { applicationStatus: "CANCEL" };
    });
  }
}
