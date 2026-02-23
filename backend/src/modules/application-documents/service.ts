import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import { applicationDocuments, applicationStatuses } from "@/db/schema";
import { BUCKET_NAME, s3Client } from "@/lib/s3";
import type { AdminListDocsQueryType } from "./model";

function docTypeName(docTypeId: number) {
  switch (docTypeId) {
    case 1:
      return "transcript";
    case 2:
      return "resume";
    case 3:
      return "portfolio";
    case 4:
      return "request-letter";
    default:
      return "unknown";
  }
}

function parseApplicationIdFromKey(key: string): number | null {
  // expected: applications/{applicationId}/{docTypeId}/{filename}
  const parts = key.split("/");
  if (parts.length < 2) return null;
  if (parts[0] !== "applications") return null;

  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
}

export class ApplicationDocumentsService {
  async findAllDocuments(
    requesterUserId: string,
    query: AdminListDocsQueryType
  ) {
    const [me] = await db
      .select({ roleId: sql<number>`"users"."role_id"` })
      .from(sql`users`)
      .where(sql`"users"."id" = ${requesterUserId}`);

    if (!me || me.roleId !== 1) throw new ForbiddenError("อนุญาตเฉพาะ Admin");

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions: SQL[] = [];

    if (query.applicationStatusId) {
      conditions.push(
        eq(applicationDocuments.applicationStatusId, query.applicationStatusId)
      );
    }
    if (query.docTypeId) {
      conditions.push(eq(applicationDocuments.docTypeId, query.docTypeId));
    }
    if (query.validationStatus) {
      conditions.push(
        eq(applicationDocuments.validationStatus, query.validationStatus)
      );
    }
    if (query.departmentId) {
      conditions.push(eq(applicationStatuses.departmentId, query.departmentId));
    }
    if (query.userId) {
      conditions.push(eq(applicationStatuses.userId, query.userId));
    }
    if (query.q && query.q.trim().length > 0) {
      const like = `%${query.q.trim()}%`;
      conditions.push(
        sql`(${ilike(applicationDocuments.docFile, like)} OR ${ilike(
          applicationDocuments.note,
          like
        )})`
      );
    }

    const where = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: applicationDocuments.id,
        applicationStatusId: applicationDocuments.applicationStatusId,
        userId: applicationStatuses.userId,
        departmentId: applicationStatuses.departmentId,

        docTypeId: applicationDocuments.docTypeId,
        docFile: applicationDocuments.docFile,
        validationStatus: applicationDocuments.validationStatus,
        note: applicationDocuments.note,

        createdAt: applicationDocuments.createdAt,
        updatedAt: applicationDocuments.updatedAt,
      })
      .from(applicationDocuments)
      .leftJoin(
        applicationStatuses,
        eq(applicationStatuses.id, applicationDocuments.applicationStatusId)
      )
      .where(where)
      .orderBy(desc(applicationDocuments.updatedAt))
      .limit(limit)
      .offset(offset);

    return rows.map((r) => ({
      ...r,
      docType: docTypeName(r.docTypeId),
    }));
  }

  async streamDocument(
    requesterUserId: string,
    key: string
  ): Promise<{ body: ReadableStream; contentType: string; filename: string }> {
    const [me] = await db
      .select({
        roleId: sql<number>`"users"."role_id"`,
        departmentId: sql<number | null>`"users"."department_id"`,
      })
      .from(sql`users`)
      .where(sql`"users"."id" = ${requesterUserId}`);

    if (!me) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

    const applicationId = parseApplicationIdFromKey(key);
    if (!applicationId) throw new ForbiddenError("key ไม่ถูกต้อง");

    const [app] = await db
      .select({
        userId: applicationStatuses.userId,
        departmentId: applicationStatuses.departmentId,
      })
      .from(applicationStatuses)
      .where(eq(applicationStatuses.id, applicationId));

    if (!app) throw new ForbiddenError("ไม่พบใบสมัคร");

    const isAdmin = me.roleId === 1;
    const isOwnerSameDept =
      me.roleId === 2 &&
      me.departmentId != null &&
      me.departmentId === app.departmentId;
    const isStudentOwner = me.roleId === 3 && requesterUserId === app.userId;

    if (!isAdmin && !isOwnerSameDept && !isStudentOwner) {
      throw new ForbiddenError("ไม่มีสิทธิ์เข้าถึงเอกสารนี้");
    }

    const filename = key.split("/").pop() ?? "file";

    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    return {
      body: res.Body as ReadableStream,
      contentType: res.ContentType ?? "application/octet-stream",
      filename,
    };
  }
}
