import { and, count, desc, eq, ilike, or, type SQL } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { BadRequestError, ConflictError } from "@/common/exceptions";
import { isObject, isPostgresError } from "@/common/utils/type-guard";
import { db } from "@/db";
import { departments } from "@/db/schema";
import type * as model from "./model";

export class DepartmentService {
  async findAll(query: model.GetDepartmentsQueryType) {
    const {
      page = 1,
      limit = 50,
      search,
      office,
    } = query as model.GetDepartmentsQueryType & { office?: number };

    const offset = (page - 1) * limit;

    const filters: SQL[] = [];

    if (office !== undefined) {
      filters.push(eq(departments.officeId, office));
    }

    if (search) {
      const terms = search.split(" ").filter(Boolean);

      if (terms.length > 0) {
        // ให้แต่ละคำไป match กับหลาย field แล้ว AND รวมกัน
        const perTerm: SQL[] = terms.map(
          (w) =>
            or(
              ilike(departments.deptShort, `%${w}%`),
              ilike(departments.deptFull, `%${w}%`),
              ilike(departments.peaCode, `%${w}%`)
            )!
        );

        filters.push(and(...perTerm)!);
      }
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const data = await db
      .select()
      .from(departments)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(desc(departments.deptSap), desc(departments.id));

    const [totalResult] = await db
      .select({ count: count() })
      .from(departments)
      .where(whereClause);

    const total = Number(totalResult.count);
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
      const payload: typeof departments.$inferInsert = {
        ...data,
        isActive: data.isActive ?? true,
        isDeleted: data.isDeleted ?? false,
      };

      const [newDept] = await db
        .insert(departments)
        .values(payload)
        .returning();

      return newDept;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError("ข้อมูลแผนกซ้ำในระบบ (dept_sap หรือ key อื่นซ้ำ)");
      }

      throw error;
    }
  }

  async update(id: number, data: model.UpdateDepartmentBodyType) {
    try {
      const payload: Partial<typeof departments.$inferInsert> = {
        ...data,
        updatedAt: new Date(),
      };

      const [updatedDept] = await db
        .update(departments)
        .set(payload)
        .where(eq(departments.id, id))
        .returning();

      if (!updatedDept) {
        throw new NotFoundError(`ไม่พบข้อมูลแผนกรหัส ${id}`);
      }

      return updatedDept;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError("ข้อมูลแผนกซ้ำในระบบ (dept_sap หรือ key อื่นซ้ำ)");
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
