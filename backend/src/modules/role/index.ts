import { Elysia } from "elysia";
import * as model from "./model";
import { RoleService } from "./service";

const roleService = new RoleService();

export const role = new Elysia({ prefix: "/role", tags: ["Role"] })
  .get(
    "/",
    async ({ set }) => {
      const response = roleService.findAll();

      set.status = 200;
      return response;
    },
    {
      detail: {
        summary: "ค้นหาข้อมูลบทบาททั้งหมด (Get All Roles)",
        description: "ดึงข้อมูลรายชื่อบทบาท (Roles) ทั้งหมดที่มีในระบบ",
      },
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const response = roleService.create(body);

      set.status = 201;
      return response;
    },
    {
      body: model.CreateRoleBody,
      detail: {
        summary: "สร้างบทบาทผู้ใช้งานใหม่ (Create Role)",
        description: "เพิ่มข้อมูลบทบาทใหม่เข้าสู่ระบบ (เช่น Intern, Staff)",
      },
    }
  )
  .put(
    "/:id",
    async ({ params: { id }, body, set }) => {
      const response = await roleService.update(id, body);

      set.status = 200;
      return response;
    },
    {
      params: model.params,
      body: model.UpdateRoleBody,
      detail: {
        summary: "แก้ไขข้อมูลบทบาท (Update Role)",
        description: "แก้ไขชื่อหรือคำอธิบายของบทบาทตาม ID ที่ระบุ (ชื่อห้ามซ้ำกับบทบาทอื่น)",
      },
    }
  )
  .delete(
    "/:id",
    async ({ params: { id }, set }) => {
      const response = await roleService.delete(id);

      set.status = 200;
      return response;
    },
    {
      params: model.params,
      detail: {
        summary: "ลบข้อมูลบทบาท (Delete Role)",
        description:
          "ลบข้อมูลบทบาทออกจากระบบ (จะไม่สามารถลบได้หากมีผู้ใช้งานสังกัดบทบาทนี้อยู่)",
      },
    }
  );
