import { and, count, eq, ilike } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import { internshipPositions, users } from "@/db/schema";
import type * as model from "./model";

export class PositionService {
  private async getUserDepartmentId(userId: string) {
    const [user] = await db
      .select({ id: users.id, departmentId: users.departmentId })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งานในระบบ");

    if (!user.departmentId) {
      throw new ForbiddenError("ผู้ใช้งานยังไม่ได้สังกัดแผนก (department)");
    }

    return user.departmentId;
  }

  async findAll(userId: string, query: model.GetPositionsQueryType) {
    const departmentId = await this.getUserDepartmentId(userId);

    const { page = 1, limit = 20, search } = query;
    const offset = (page - 1) * limit;

    const whereClause = and(
      eq(internshipPositions.departmentId, departmentId),
      search ? ilike(internshipPositions.name, `%${search}%`) : undefined
    );

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
