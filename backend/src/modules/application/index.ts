import { Elysia } from "elysia";

import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { ApplicationService } from "./service";

const applicationService = new ApplicationService();

export const application = new Elysia({
  prefix: "/applications",
  tags: ["Applications"],
})
  .use(isAuthenticated)

  .post(
    "/",
    async ({ session, body, set }) => {
      const response = await applicationService.create(
        session.userId,
        body.positionId
      );

      set.status = 201;
      return response;
    },
    {
      role: [3],
      body: model.CreateApplicationBody,
      detail: {
        summary: "สมัครฝึกงาน",
        description: "นักศึกษากดสมัครฝึกงาน → สร้างใบสมัคร (PENDING_DOCUMENT)",
      },
    }
  )

  .post(
    "/:id/information",
    async ({ session, params: { id }, body, set }) => {
      const response = await applicationService.upsertInformation(
        session.userId,
        Number(id),
        body
      );

      set.status = 200;
      return response;
    },
    {
      role: [3],
      params: model.params,
      body: model.ApplicationInformationBody,
      detail: {
        summary: "กรอกข้อมูลทักษะและสิ่งที่คาดหวัง",
        description: "บันทึก skill และ expectation ของใบสมัคร",
      },
    }
  )

  .post(
    "/:id/documents/transcript",
    async ({ session, params: { id }, body, set }) => {
      const response = await applicationService.uploadTranscript(
        session.userId,
        Number(id),
        body.file
      );

      set.status = 200;
      return response;
    },
    {
      role: [3],
      params: model.params,
      body: model.UploadDocumentBody,
      detail: {
        summary: "อัปโหลด Transcript",
        description: "อัปโหลด Transcript ในขั้นตอน PENDING_DOCUMENT",
      },
    }
  );
