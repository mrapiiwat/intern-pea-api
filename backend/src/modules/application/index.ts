import { Elysia } from "elysia";

import { BadRequestError } from "@/common/exceptions";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { ApplicationService } from "./service";

const applicationService = new ApplicationService();

const DOC_TYPE_MAP = {
  transcript: 1,
  resume: 2,
  portfolio: 3,
  "request-letter": 4,
} as const;

type DocTypeName = keyof typeof DOC_TYPE_MAP;

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
      const response = await applicationService.uploadRequiredDocument(
        session.userId,
        Number(id),
        1,
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
  )

  .post(
    "/:id/documents/resume",
    async ({ session, params: { id }, body, set }) => {
      const response = await applicationService.uploadRequiredDocument(
        session.userId,
        Number(id),
        2,
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
        summary: "อัปโหลด Resume",
        description:
          "อัปโหลด Resume ในขั้นตอน PENDING_DOCUMENT (เฉพาะตำแหน่งที่ require)",
      },
    }
  )

  .post(
    "/:id/documents/portfolio",
    async ({ session, params: { id }, body, set }) => {
      const response = await applicationService.uploadRequiredDocument(
        session.userId,
        Number(id),
        3,
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
        summary: "อัปโหลด Portfolio",
        description:
          "อัปโหลด Portfolio ในขั้นตอน PENDING_DOCUMENT (เฉพาะตำแหน่งที่ require)",
      },
    }
  )

  .put(
    "/:id/interview/approve",
    async ({ session, params: { id }, set }) => {
      const res = await applicationService.approveInterview(
        session.userId,
        Number(id)
      );
      set.status = 200;
      return res;
    },
    {
      role: [2],
      params: model.params,
      detail: {
        summary: "Owner อนุมัติผ่านสัมภาษณ์",
      },
    }
  )

  .put(
    "/:id/confirm/accept",
    async ({ session, params: { id }, set }) => {
      const res = await applicationService.confirmAccept(
        session.userId,
        Number(id)
      );
      set.status = 200;
      return res;
    },
    {
      role: [2],
      params: model.params,
      detail: {
        summary: "Owner ยืนยันรับนักศึกษา",
      },
    }
  )

  .post(
    "/:id/documents/request-letter",
    async ({ session, params: { id }, body, set }) => {
      const response = await applicationService.uploadRequestLetter(
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
        summary: "อัปโหลดเอกสารขอความอนุเคราะห์",
      },
    }
  )

  .put(
    "/:id/documents/:docType/review",
    async ({ session, params: { id, docType }, body, set }) => {
      const docTypeId = DOC_TYPE_MAP[docType as DocTypeName];

      if (!docTypeId) {
        throw new BadRequestError("docType ไม่ถูกต้อง");
      }

      const res = await applicationService.reviewDocument(
        session.userId,
        Number(id),
        docTypeId,
        body.status,
        body.note
      );

      set.status = 200;
      return res;
    },
    {
      role: [1],
      params: model.reviewDocByNameParams,
      body: model.ReviewDocumentBody,
      detail: {
        summary:
          "Admin ตรวจเอกสาร (transcript/resume/portfolio/request-letter)",
      },
    }
  );
