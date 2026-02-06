import { and, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import { departments, internshipPositions, users } from "@/db/schema";
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
  // async findAll(userId: string, query: model.GetPositionsQueryType) { // ต้อง log-in ก่อนถึงจะเห็น positions
  // await this.assertUserExists(userId);
  async findAll(query: model.GetPositionsQueryType) {
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

    const positions = await db
      .select()
      .from(internshipPositions)
      .where(whereClause)
      .limit(limit)
      .offset(offset)
      .orderBy(internshipPositions.id);

    // Get unique department IDs
    const departmentIds = [...new Set(positions.map((p) => p.departmentId))];

    // Fetch owners (roleId = 2) for each department
    const owners =
      departmentIds.length > 0
        ? await db
            .select({
              id: users.id,
              departmentId: users.departmentId,
              fname: users.fname,
              lname: users.lname,
              email: users.email,
              phoneNumber: users.phoneNumber,
            })
            .from(users)
            .where(
              and(
                eq(users.roleId, 2), // owner role
                or(...departmentIds.map((dId) => eq(users.departmentId, dId)))
              )
            )
        : [];

    // Fetch department names
    const departmentData =
      departmentIds.length > 0
        ? await db
            .select({
              id: departments.id,
              name: departments.name,
              location: departments.location,
            })
            .from(departments)
            .where(or(...departmentIds.map((dId) => eq(departments.id, dId))))
        : [];

    // Map positions with owner and department info
    const data = positions.map((position) => {
      const owner = owners.find(
        (o) => o.departmentId === position.departmentId
      );
      const dept = departmentData.find((d) => d.id === position.departmentId);

      return {
        ...position,
        owner: owner
          ? {
              id: owner.id,
              fname: owner.fname,
              lname: owner.lname,
              email: owner.email,
              phoneNumber: owner.phoneNumber,
            }
          : null,
        department: dept
          ? {
              id: dept.id,
              name: dept.name,
              location: dept.location,
            }
          : null,
      };
    });

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
    await this.assertUserExists(userId);
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
    await this.assertUserExists(userId);
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
    await this.assertUserExists(userId);
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
