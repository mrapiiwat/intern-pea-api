import { Elysia, t } from "elysia";

import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { ApplicationDocumentsService } from "./service";

const service = new ApplicationDocumentsService();

export const ApplicationDocuments = new Elysia({
  prefix: "/application-documents",
  tags: ["Application Documents"],
})
  .use(isAuthenticated)

  .get(
    "/",
    async ({ session, query, set }) => {
      const rows = await service.findAllDocuments(session.userId, query);

      set.status = 200;
      return rows;
    },
    {
      role: [1],
      query: model.AdminListDocsQuery,
      detail: {
        summary: "Admin list application documents (findAll + filters)",
        description:
          "แสดงเอกสารทั้งหมดในระบบ โดยสามารถ filter/search ได้ด้วย applicationStatusId, departmentId, userId, docTypeId, validationStatus, q, page, limit",
      },
    }
  )

  .get(
    "/file",
    async ({ session, query, set }) => {
      const { body, contentType, filename } = await service.streamDocument(
        session.userId,
        query.key
      );

      set.headers["Content-Type"] = contentType;
      set.headers["Content-Disposition"] = query.download
        ? `attachment; filename="${filename}"`
        : `inline; filename="${filename}"`;

      set.status = 200;
      return body;
    },
    {
      auth: true,
      query: t.Object({
        key: t.String({ minLength: 1 }),
        download: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "preview/download document file",
        description: "คืนไฟล์จาก MinIO ผ่าน backend เพื่อให้ preview/download",
      },
    }
  );
