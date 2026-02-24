import { Elysia } from "elysia";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { OwnerStudentStatusService } from "./service";

const service = new OwnerStudentStatusService();

export const ownerStudents = new Elysia({
  prefix: "/owner/students",
  tags: ["Owner Students"],
})
  .use(isAuthenticated)
  .put(
    "/:studentUserId/internship-status",
    async ({ session, params: { studentUserId }, body, set }) => {
      const res = await service.updateInternshipStatus(
        session.userId,
        studentUserId,
        body
      );
      set.status = 200;
      return res;
    },
    {
      role: [1, 2],
      params: model.studentUserParams,
      body: model.UpdateStudentInternshipStatusBody,
      detail: {
        summary:
          "Admin or Owner update student internship_status (CANCEL/COMPLETE)",
        description:
          "ทำได้เฉพาะนักศึกษาที่อยู่กองเดียวกัน และนักศึกษาต้องอยู่สถานะ ACTIVE เท่านั้น; CANCEL ต้องส่ง reason เพื่อเก็บลง student_profiles.status_note",
      },
    }
  );
