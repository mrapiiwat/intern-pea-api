import { eq } from "drizzle-orm";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "@/common/exceptions";
import { isObject, isPostgresError } from "@/common/utils/type-guard";
import { db } from "@/db";
import { roles } from "@/db/schema";
import type * as model from "./model";

export class RoleService {
  async findAll() {
    return await db.query.roles.findMany();
  }

  async create(data: model.CreateRoleBodyType) {
    try {
      const [newRole] = await db.insert(roles).values(data).returning();

      return newRole;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError(`ชื่อบทบาท "${data.name}" มีอยู่ในระบบแล้ว`);
      }

      throw error;
    }
  }

  async update(id: number, data: model.UpdateRoleBodyType) {
    try {
      const [updatedRole] = await db
        .update(roles)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(roles.id, id))
        .returning();

      if (!updatedRole) {
        throw new NotFoundError(`ไม่พบบทบาทรหัส ${id}`);
      }

      return updatedRole;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError(`ชื่อบทบาท "${data.name}" มีอยู่ในระบบแล้ว`);
      }

      throw error;
    }
  }
  async delete(id: number) {
    try {
      const [deletedRole] = await db
        .delete(roles)
        .where(eq(roles.id, id))
        .returning();

      if (!deletedRole) {
        throw new NotFoundError(`ไม่พบบทบาทรหัส ${id}`);
      }

      return {
        success: true,
        message: "ลบข้อมูลบทบาทเรียบร้อยแล้ว",
      };
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23503") {
        throw new BadRequestError(
          "ไม่สามารถลบบทบาทนี้ได้ เนื่องจากมีผู้ใช้งาน (User) สังกัดบทบาทนี้อยู่"
        );
      }

      throw error;
    }
  }
}
