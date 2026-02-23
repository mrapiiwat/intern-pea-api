import { GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import type { SQL } from "drizzle-orm";
import { and, desc, eq, ilike, sql } from "drizzle-orm";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import { applicationDocuments, applicationStatuses } from "@/db/schema";
import { BUCKET_NAME, MINIO_PUBLIC_ENDPOINT, s3Client } from "@/lib/s3";
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

export class AdminApplicationDocumentsService {
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
        sql`(${ilike(applicationDocuments.docFile, like)} OR ${ilike(applicationDocuments.note, like)})`
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

  async getDocumentSignedUrl(
    requesterUserId: string,
    key: string,
    disposition: "inline" | "attachment" = "inline"
  ) {
    const [me] = await db
      .select({ roleId: sql<number>`"users"."role_id"` })
      .from(sql`users`)
      .where(sql`"users"."id" = ${requesterUserId}`);

    if (!me || me.roleId !== 1) throw new ForbiddenError("อนุญาตเฉพาะ Admin");

    const filename = key.split("/").pop() ?? "file";

    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
      ResponseContentDisposition:
        disposition === "inline"
          ? `inline; filename="${filename}"`
          : `attachment; filename="${filename}"`,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 300 });

    const internalBase = Bun.env.MINIO_ENDPOINT ?? "";
    const publicBase = MINIO_PUBLIC_ENDPOINT ?? "";

    const url =
      internalBase && publicBase
        ? signedUrl.replace(internalBase, publicBase)
        : signedUrl;

    return { url, expiresIn: 300, disposition, key };
  }

  async streamDocument(
    requesterUserId: string,
    key: string
  ): Promise<{ body: ReadableStream; contentType: string; filename: string }> {
    const [me] = await db
      .select({ roleId: sql<number>`"users"."role_id"` })
      .from(sql`users`)
      .where(sql`"users"."id" = ${requesterUserId}`);

    if (!me || me.roleId !== 1) throw new ForbiddenError("อนุญาตเฉพาะ Admin");

    const filename = key.split("/").pop() ?? "file";

    const res = await s3Client.send(
      new GetObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
      })
    );

    const body = res.Body as ReadableStream;

    return {
      body,
      contentType: res.ContentType ?? "application/octet-stream",
      filename,
    };
  }
}
