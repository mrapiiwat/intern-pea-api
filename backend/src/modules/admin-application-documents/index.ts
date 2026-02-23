import { Elysia, t } from "elysia";

import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { AdminApplicationDocumentsService } from "./service";

const service = new AdminApplicationDocumentsService();

export const adminApplicationDocuments = new Elysia({
  prefix: "/admin/application-documents",
  tags: ["Admin Application Documents"],
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
      role: [1],
      query: t.Object({
        key: t.String({ minLength: 1 }),
        download: t.Optional(t.Boolean()),
      }),
      detail: {
        summary: "Admin preview/download document file",
        description:
          "คืนไฟล์จาก MinIO ผ่าน backend เพื่อให้ preview/download ได้โดยไม่เจอ SignatureDoesNotMatch",
      },
    }
  );
