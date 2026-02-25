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
    async ({ query, session, set }) => {
      const { body, contentType, contentDisposition } =
        await service.streamDocument(session.userId, query.key);

      set.headers["content-type"] = contentType;
      set.headers["content-disposition"] = contentDisposition;
      set.headers["cache-control"] = "no-store";

      return body;
    },
    {
      auth: true,
      query: t.Object({
        key: t.String(),
      }),
    }
  );
