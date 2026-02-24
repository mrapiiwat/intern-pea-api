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
      const response = await applicationService.apply(
        session.userId,
        body.positionId
      );
      set.status = 200;
      return response;
    },
    {
      role: [3],
      body: model.CreateApplicationBody,
      detail: {
        summary: "กดสมัคร (ยังไม่สร้างใบสมัคร)",
        description:
          "ตรวจสิทธิ์นักศึกษา + ตรวจประกาศ OPEN แต่ยังไม่สร้าง application_statuses จนกว่าจะส่งข้อมูล skill/expectation",
      },
    }
  )

  .post(
    "/positions/:positionId/information",
    async ({ session, params: { positionId }, body, set }) => {
      const response = await applicationService.submitInformation(
        session.userId,
        Number(positionId),
        body
      );

      set.status = 201;
      return response;
    },
    {
      role: [3],
      params: model.positionParams,
      body: model.ApplicationInformationBody,
      detail: {
        summary: "ส่ง skill/expectation เพื่อสร้างใบสมัคร",
        description:
          "สร้าง application_statuses + application_informations พร้อมกัน และเปลี่ยนสถานะ student จาก IDLE เป็น PENDING",
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
      role: [1, 2],
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
      role: [1, 2],
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
  )

  .get(
    // เส้น student
    "/history/me",
    async ({ session, query, set }) => {
      const res = await applicationService.getMyHistory(
        session.userId,
        query.includeCanceled ?? true
      );
      set.status = 200;
      return res;
    },
    {
      role: [3],
      query: model.HistoryQuery,
      detail: {
        summary: "Student ดูประวัติการสมัครของตัวเอง",
        description: "นักศึกษาดูได้เฉพาะประวัติการสมัครของตนเอง",
      },
    }
  )

  .get(
    // เส้น staff
    "/history/:studentUserId",
    async ({ session, params: { studentUserId }, query, set }) => {
      const res = await applicationService.getStudentHistory(
        session.userId,
        studentUserId,
        query.includeCanceled ?? true
      );
      set.status = 200;
      return res;
    },
    {
      role: [1, 2],
      params: model.studentUserParams,
      query: model.HistoryQuery,
      detail: {
        summary: "Admin/Owner ดูประวัติการสมัครของนักศึกษารายคน",
      },
    }
  )

  .get(
    "/history",
    async ({ session, query, set }) => {
      const res = await applicationService.getAllStudentsHistory(
        session.userId,
        query
      );
      set.status = 200;
      return res;
    },
    {
      role: [1, 2],
      query: model.AllStudentsHistoryQuery,
      detail: {
        summary: "Admin/Owner ดูประวัติการสมัครของนักศึกษาทั้งหมด",
        description:
          "Admin เห็นทั้งหมด, Owner เห็นเฉพาะใบสมัครใน department ของตน (จาก application_statuses.department_id)",
      },
    }
  )

  .put(
    "/:id/cancel",
    async ({ session, params: { id }, set }) => {
      const res = await applicationService.cancelByStudent(
        session.userId,
        Number(id)
      );
      set.status = 200;
      return res;
    },
    {
      role: [3],
      params: model.params,
      detail: {
        summary: "Student ยกเลิกใบสมัคร",
        description: "ทำได้เฉพาะ PENDING_DOCUMENT และต้องยังไม่ส่งเอกสารใดๆ",
      },
    }
  )

  .put(
    "/:id/interview/reject",
    async ({ session, params: { id }, body, set }) => {
      const res = await applicationService.cancelByOwner(
        session.userId,
        Number(id),
        body.reason
      );
      set.status = 200;
      return res;
    },
    {
      role: [1, 2],
      params: model.params,
      body: model.CancelByOwnerBody,
      detail: {
        summary: "Owner ไม่อนุมัติ (ยกเลิกใบสมัคร)",
        description:
          "ใช้ได้ในสถานะ PENDING_INTERVIEW และ PENDING_CONFIRMATION โดยต้องระบุเหตุผล (เก็บใน status_note)",
      },
    }
  );
