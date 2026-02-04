import { and, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import { internshipPositions, users } from "@/db/schema";
import type * as model from "./model";

export class PositionService {
  private async assertUserExists(userId: string) {
    // check user อยู่ในระบบไหม
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งานในระบบ");
  }

  private async getUserDepartmentId(userId: string): Promise<number> {
    const [user] = await db
      .select({ id: users.id, departmentId: users.departmentId })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งานในระบบ");

    if (user.departmentId === null) {
      throw new ForbiddenError("ผู้ใช้งานยังไม่ได้สังกัดแผนก (department)");
    }

    return user.departmentId;
  }

  /**
   * GET /position เห็นทั้งหมด (ทุก department)
   * - filter department ได้ ถ้า user ส่ง query มาเอง
   */
  async findAll(userId: string, query: model.GetPositionsQueryType) {
    await this.assertUserExists(userId);

    const { page = 1, limit = 10, search, department } = query;
    const offset = (page - 1) * limit;

    const filters: SQL[] = [];

    if (department !== undefined) {
      filters.push(eq(internshipPositions.departmentId, department));
    }

    if (search) {
      const terms = search.split(" ").filter(Boolean);
      if (terms.length > 0) {
        const searchFilters = terms.map((w) =>
          ilike(internshipPositions.name, `%${w}%`)
        );
        filters.push(or(...searchFilters)!);
      }
    }

    const whereClause = filters.length > 0 ? and(...filters) : undefined;

    const data = await db
      .select()
      .from(internshipPositions)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(internshipPositions.id);

    const [totalResult] = await db
      .select({ count: count() })
      .from(internshipPositions)
      .where(whereClause);

    const total = totalResult.count;
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;

    return { data, meta: { total, page, limit, totalPages, hasNextPage } };
  }

  /**
   * POST /position ผูก departmentId จาก user.departmentId อัตโนมัติ
   */
  async create(userId: string, data: model.CreatePositionBodyType) {
    const departmentId = await this.getUserDepartmentId(userId);

    const [position] = await db
      .insert(internshipPositions)
      .values({
        departmentId,
        name: data.name,
        location: data.location ?? null,
        positionCount: data.positionCount ?? null,
        major: data.major ?? null,
        applyStart: data.applyStart ?? null,
        applyEnd: data.applyEnd ?? null,
        jobDetails: data.jobDetails ?? null,
        requirement: data.requirement ?? null,
        benefits: data.benefits ?? null,
        recruitmentStatus: data.recruitmentStatus,
      })
      .returning();

    return position;
  }

  /**
   * PUT /position/:id แก้ได้เฉพาะตำแหน่งใน department ของตัวเอง
   */
  async update(userId: string, id: number, data: model.UpdatePositionBodyType) {
    const departmentId = await this.getUserDepartmentId(userId);

    const [updated] = await db
      .update(internshipPositions)
      .set({
        ...data,
        applyStart: data.applyStart ?? undefined,
        applyEnd: data.applyEnd ?? undefined,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(internshipPositions.id, id),
          eq(internshipPositions.departmentId, departmentId)
        )
      )
      .returning();

    if (!updated) throw new NotFoundError(`ไม่พบตำแหน่งรหัส ${id}`);

    return updated;
  }

  /**
   * DELETE /position/:id ลบได้เฉพาะตำแหน่งใน department ของตัวเอง
   */
  async delete(userId: string, id: number) {
    const departmentId = await this.getUserDepartmentId(userId);

    const [deleted] = await db
      .delete(internshipPositions)
      .where(
        and(
          eq(internshipPositions.id, id),
          eq(internshipPositions.departmentId, departmentId)
        )
      )
      .returning();

    if (!deleted) throw new NotFoundError(`ไม่พบตำแหน่งรหัส ${id}`);

    return { success: true, message: "ลบตำแหน่งเรียบร้อยแล้ว" };
  }
}
