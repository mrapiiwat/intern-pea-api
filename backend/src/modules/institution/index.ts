// backend/src/institution/index.ts
import { Elysia } from "elysia";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { InstitutionService } from "./service";

const institutionService = new InstitutionService();

export const institution = new Elysia({
  prefix: "/institution",
  tags: ["Institutions"],
})
  .use(isAuthenticated)

  .get(
    "/",
    async ({ query, set }) => {
      const response = await institutionService.findAll(query);

      set.status = 200;
      return response;
    },
    {
      query: model.GetInstitutionsQuery,
      detail: {
        summary: "ค้นหารายชื่อสถาบัน (Search Institutions)",
        description:
          "ดึงข้อมูลรายการสถาบันทั้งหมด รองรับค้นหาด้วยชื่อ (Search), filter ตามประเภท (Type) และแบ่งหน้า (Pagination)",
      },
    }
  )

  .post(
    "/",
    async ({ body, set }) => {
      const response = await institutionService.create(body);

      set.status = 201;
      return response;
    },
    {
      body: model.CreateInstitutionBody,
      detail: {
        summary: "สร้างสถาบันใหม่ (Create Institution)",
        description: "เพิ่มข้อมูลสถาบันใหม่เข้าสู่ระบบ (ชื่อห้ามซ้ำ)",
      },
    }
  )

  .put(
    "/:id",
    async ({ params: { id }, body, set, session }) => {
      const response = await institutionService.update(
        session.userId,
        id,
        body
      );

      set.status = 200;
      return response;
    },
    {
      role: [1],
      params: model.params,
      body: model.UpdateInstitutionBody,
      detail: {
        summary: "แก้ไขสถาบัน (Update Institution)",
        description: "แก้ไขข้อมูลสถาบันตาม ID ที่ระบุ (ชื่อห้ามซ้ำกับรายการอื่น)",
      },
    }
  )

  .delete(
    "/:id",
    async ({ params: { id }, set, session }) => {
      const response = await institutionService.delete(session.userId, id);

      set.status = 200;
      return response;
    },
    {
      role: [1],
      params: model.params,
      detail: {
        summary: "ลบสถาบัน (Delete Institution)",
        description:
          "ลบข้อมูลสถาบันตาม ID ที่ระบุ (ลบไม่ได้ถ้ามีข้อมูลอื่นอ้างอิงอยู่ เช่น student_profiles)",
      },
    }
  );
