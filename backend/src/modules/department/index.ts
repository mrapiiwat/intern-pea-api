import { Elysia } from "elysia";
import * as model from "./model";
import { DepartmentService } from "./service";

const departmentService = new DepartmentService();

export const department = new Elysia({ prefix: "/dept", tags: ["Departments"] })
  .get(
    "/",
    async ({ query, set }) => {
      const response = departmentService.findAll(query);

      set.status = 200;
      return response;
    },
    {
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
      const response = departmentService.create(body);

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
  .delete(
    "/:id",
    async ({ params: { id }, set }) => {
      const response = departmentService.delete(id);

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
