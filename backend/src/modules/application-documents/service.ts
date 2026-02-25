import { GetObjectCommand } from "@aws-sdk/client-s3";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import { applicationDocuments, applicationStatuses, users } from "@/db/schema";
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

function docTypeLabel(docTypeId: number) {
  switch (docTypeId) {
    case 1:
      return "TRANSCRIPT";
    case 2:
      return "RESUME";
    case 3:
      return "PORTFOLIO";
    case 4:
      return "REQUEST_LETTER";
    default:
      return "DOCUMENT";
  }
}

function parseApplicationIdFromKey(key: string): number | null {
  // expected: applications/{applicationId}/{docTypeId}/{filename}
  const parts = key.split("/");
  if (parts.length < 4) return null;
  if (parts[0] !== "applications") return null;

  const id = Number(parts[1]);
  return Number.isFinite(id) ? id : null;
}

function parseDocTypeIdFromKey(key: string): number | null {
  // expected: applications/{applicationId}/{docTypeId}/{filename}
  const parts = key.split("/");
  if (parts.length < 4) return null;
  if (parts[0] !== "applications") return null;

  const id = Number(parts[2]);
  return Number.isFinite(id) ? id : null;
}

function getExtFromKey(key: string): string {
  const name = key.split("/").pop() ?? "";
  const idx = name.lastIndexOf(".");
  return idx >= 0 ? name.slice(idx + 1) : "bin";
}

function normalizeName(input: string) {
  return input
    .normalize("NFC")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\p{L}\p{M}\p{N}_-]/gu, "");
}

function formatDateYYYYMMDD(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

function toAsciiFilename(input: string, fallback = "file") {
  const base = input
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");

  return base.length > 0 ? base : fallback;
}

function contentDispositionInline(filenameUtf8: string) {
  const ascii = toAsciiFilename(filenameUtf8, "file");
  const encoded = encodeURIComponent(filenameUtf8);
  return `inline; filename="${ascii}"; filename*=UTF-8''${encoded}`;
}

export class ApplicationDocumentsService {
  async findAllDocuments(
    requesterUserId: string,
    query: AdminListDocsQueryType
  ) {
    const [me] = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, requesterUserId));

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
      filename: r.docFile?.split("/").pop() ?? "file",
    }));
  }

  async streamDocument(
    requesterUserId: string,
    key: string
  ): Promise<{
    body: ReadableStream;
    contentType: string;
    filename: string;
    contentDisposition: string;
  }> {
    const [me] = await db
      .select({
        roleId: users.roleId,
        departmentId: users.departmentId,
      })
      .from(users)
      .where(eq(users.id, requesterUserId));

    if (!me) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

    const applicationId = parseApplicationIdFromKey(key);
    const docTypeIdFromKey = parseDocTypeIdFromKey(key);
    if (!applicationId || !docTypeIdFromKey)
      throw new ForbiddenError("key ไม่ถูกต้อง");

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

    const [docRow] = await db
      .select({
        docTypeId: applicationDocuments.docTypeId,
        createdAt: applicationDocuments.createdAt,
        updatedAt: applicationDocuments.updatedAt,
      })
      .from(applicationDocuments)
      .where(eq(applicationDocuments.docFile, key));

    const [student] = await db
      .select({
        fname: users.fname,
        lname: users.lname,
      })
      .from(users)
      .where(eq(users.id, app.userId));

    const ext = getExtFromKey(key);

    const dateBase =
      (docRow?.updatedAt as unknown as Date | undefined) ??
      (docRow?.createdAt as unknown as Date | undefined) ??
      new Date();

    const docType = docTypeLabel(docRow?.docTypeId ?? docTypeIdFromKey);

    const fname = normalizeName(student?.fname ?? "student");
    const lname = normalizeName(student?.lname ?? "unknown");

    const filename = `${fname}_${lname}_${docType}_${formatDateYYYYMMDD(
      dateBase
    )}.${ext}`;

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
      contentDisposition: contentDispositionInline(filename),
    };
  }
}
