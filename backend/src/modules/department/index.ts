import { Elysia } from "elysia";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import * as model from "./model";
import { DepartmentService } from "./service";

const departmentService = new DepartmentService();

export const department = new Elysia({ prefix: "/dept", tags: ["Departments"] })
  .use(isAuthenticated)
  .get(
    "/",
    async ({ query, set }) => {
      const response = await departmentService.findAll(query);

      set.status = 200;
      return response;
    },
    {
      auth: true,
      query: model.GetDepartmentsQuery,
      detail: {
        summary: "ค้นหาข้อมูลแผนก (Search Departments)",
        description:
          "ดึงข้อมูลรายการแผนกทั้งหมด รองรับการค้นหาด้วยชื่อ (Search) และแบ่งหน้า (Pagination)",
      },
    }
  )

  .post(
    "/",
    async ({ body, set }) => {
      const response = await departmentService.create(body);

      set.status = 201;
      return response;
    },
    {
      body: model.CreateDepartmentBody,
      detail: {
        summary: "สร้างแผนกใหม่ (Create Department)",
        description: "เพิ่มข้อมูลแผนกใหม่เข้าสู่ระบบ โดยชื่อแผนก (Name) ห้ามซ้ำกับที่มีอยู่",
      },
    }
  )

  .put(
    "/:id",
    async ({ params: { id }, body, set }) => {
      const response = await departmentService.update(id, body);

      set.status = 200;
      return response;
    },
    {
      params: model.params,
      body: model.UpdateDepartmentBody,
      detail: {
        summary: "แก้ไขข้อมูลแผนก (Update Department)",
        description: "แก้ไขข้อมูลแผนกตาม ID ที่ระบุ (ชื่อห้ามซ้ำกับแผนกอื่น)",
      },
    }
  )

  .delete(
    "/:id",
    async ({ params: { id }, set }) => {
      const response = await departmentService.delete(id);

      set.status = 200;
      return response;
    },
    {
      params: model.params,
      detail: {
        summary: "ลบข้อมูลแผนก (Delete Department)",
        description:
          "ลบข้อมูลแผนกตาม ID ที่ระบุ (จะไม่สามารถลบได้หากมีข้อมูลอื่นอ้างอิงถึงแผนกนี้)",
      },
    }
  );
