// backend/src/institution/service.ts
import { and, count, eq, ilike } from "drizzle-orm";
import { NotFoundError } from "elysia";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
} from "@/common/exceptions";
import { isObject, isPostgresError } from "@/common/utils/type-guard";
import { db } from "@/db";
import { institutions, users } from "@/db/schema";
import type * as model from "./model";

export class InstitutionService {
  private async assertUserExists(userId: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งานในระบบ");
  }

  async findAll(query: model.GetInstitutionsQueryType) {
    const { page = 1, limit = 20, search, type } = query;
    const offset = (page - 1) * limit;

    const filters = [];

    if (search) {
      filters.push(ilike(institutions.name, `%${search}%`));
    }

    if (type) {
      filters.push(eq(institutions.institutionsType, type));
    }

    const whereClause = filters.length ? and(...filters) : undefined;

    const data = await db
      .select()
      .from(institutions)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(institutions.name);

    const [totalResult] = await db
      .select({ count: count() })
      .from(institutions)
      .where(whereClause);

    const total = Number(totalResult.count);
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;

    return {
      data,
      meta: { total, page, limit, totalPages, hasNextPage },
    };
  }

  async create(userId: string, data: model.CreateInstitutionBodyType) {
    await this.assertUserExists(userId);

    try {
      const [created] = await db
        .insert(institutions)
        .values({
          institutionsType: data.institutionsType,
          name: data.name,
        })
        .returning();

      return created;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError("ชื่อสถาบันนี้มีอยู่ในระบบแล้ว");
      }

      throw error;
    }
  }

  async update(
    userId: string,
    id: number,
    data: model.UpdateInstitutionBodyType
  ) {
    await this.assertUserExists(userId);

    try {
      const [updated] = await db
        .update(institutions)
        .set({
          ...data,
          updatedAt: new Date(),
        })
        .where(eq(institutions.id, id))
        .returning();

      if (!updated) {
        throw new NotFoundError(`ไม่พบข้อมูลสถาบันรหัส ${id}`);
      }

      return updated;
    } catch (error: unknown) {
      const err = isObject(error) && "cause" in error ? error.cause : error;

      if (isPostgresError(err) && err.code === "23505") {
        throw new ConflictError("ชื่อสถาบันนี้มีอยู่ในระบบแล้ว");
      }

      throw error;
    }
  }

  async delete(userId: string, id: number) {
    await this.assertUserExists(userId);

    try {
      const [deleted] = await db
        .delete(institutions)
        .where(eq(institutions.id, id))
        .returning();

      if (!deleted) {
        throw new NotFoundError(`ไม่พบข้อมูลสถาบันรหัส ${id}`);
      }

      return { success: true, message: "ลบข้อมูลสถาบันเรียบร้อยแล้ว" };
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
