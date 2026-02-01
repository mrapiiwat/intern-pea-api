import { count, eq, ilike } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { BadRequestError, ConflictError } from "@/common/exceptions";
import { isObject, isPostgresError } from "@/common/utils/type-guard";
import { db } from "@/db";
import { departments } from "@/db/schema";
import type * as model from "./model";

export class DepartmentService {
  async findAll(query: model.GetDepartmentsQueryType) {
    const { page = 1, limit = 20, search } = query;
    const offset = (page - 1) * limit;

    const whereClause = search
      ? ilike(departments.name, `%${search}%`)
      : undefined;

    const data = await db
      .select()
      .from(departments)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(departments.name);

    const [totalResult] = await db
      .select({ count: count() })
      .from(departments)
      .where(whereClause);

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages,
        hasNextPage,
      },
    };
  }

  async create(data: model.CreateDepartmentBodyType) {
    try {
      const [newDept] = await db.insert(departments).values(data).returning();

      return newDept;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError("ชื่อแผนกนี้มีอยู่ในระบบแล้ว");
      }

      throw error;
    }
  }

  async update(id: number, data: model.UpdateDepartmentBodyType) {
    try {
      const [updatedDept] = await db
        .update(departments)
        .set({
          ...data,
          updatedAt: new Date().toISOString(),
        })
        .where(eq(departments.id, id))
        .returning();

      if (!updatedDept) {
        throw new NotFoundError(`ไม่พบข้อมูลแผนกรหัส ${id}`);
      }

      return updatedDept;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError("ชื่อแผนกนี้มีอยู่ในระบบแล้ว");
      }

      throw error;
    }
  }

  async delete(id: number) {
    try {
      const [deletedDept] = await db
        .delete(departments)
        .where(eq(departments.id, id))
        .returning();

      if (!deletedDept) {
        throw new NotFoundError(`ไม่พบข้อมูลแผนกรหัส ${id}`);
      }

      return {
        success: true,
        message: "ลบข้อมูลแผนกเรียบร้อยแล้ว",
      };
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23503") {
        throw new BadRequestError(
          "ไม่สามารถลบข้อมูลนี้ได้ เนื่องจากข้อมูลถูกใช้งานอยู่ในส่วนอื่น (Foreign Key Constraint)"
        );
      }

      throw error;
    }
  }
}
