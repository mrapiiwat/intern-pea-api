import { and, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import {
  internshipPositionMentors,
  internshipPositions,
  staffProfiles,
  users,
  departments
} from "@/db/schema";
import type * as model from "./model";

type MentorDTO = {
  // รูปแบบข้อมูล mentor ที่ส่งให้ API
  staffId: number;
  name: string;
  email: string | null;
  phoneNumber: string | null;
};

type PositionWithMentors = typeof internshipPositions.$inferSelect & {
  mentors: MentorDTO[];
};

export class PositionService {
  private async assertUserExists(userId: string) {
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
   * GET /position
   * เห็นทุก department
   * filter ได้ด้วย search และ department
   * แสดง mentor (หลายคน)
   */
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

  const whereClause = filters.length ? and(...filters) : undefined;

  const rows = await db
    .select({
      position: internshipPositions,
      mentorStaffId: internshipPositionMentors.mentorStaffId,
      mentorFname: users.fname,
      mentorLname: users.lname,
      mentorEmail: users.email,
      mentorPhone: users.phoneNumber,
    })
    .from(internshipPositions)
    .leftJoin(
      internshipPositionMentors,
      eq(internshipPositionMentors.positionId, internshipPositions.id)
    )
    .leftJoin(
      staffProfiles,
      eq(staffProfiles.id, internshipPositionMentors.mentorStaffId)
    )
    .leftJoin(users, eq(users.id, staffProfiles.userId))
    .where(whereClause)
    .limit(limit)
    .offset(offset)
    .orderBy(internshipPositions.id);

  // รวม mentors ให้เป็นตำแหน่งละก้อน
  const map = new Map<number, PositionWithMentors>();

  for (const r of rows) {
    const id = r.position.id;

    if (!map.has(id)) {
      map.set(id, {
        ...r.position,
        mentors: [],
      });
    }

    if (r.mentorStaffId) {
      map.get(id)!.mentors.push({
        staffId: r.mentorStaffId,
        name: `${r.mentorFname ?? ""} ${r.mentorLname ?? ""}`.trim(),
        email: r.mentorEmail,
        phoneNumber: r.mentorPhone,
      });
    }
  }

  const positions = Array.from(map.values());

  // ดึง departmentIds จาก positions (มี departmentId แน่นอน)
  const departmentIds = [...new Set(positions.map((p) => p.departmentId))];

  // owners (roleId = 2) ของแต่ละ department
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
              eq(users.roleId, 2),
              or(...departmentIds.map((dId) => eq(users.departmentId, dId)))
            )
          )
      : [];

  // department info
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

  // enrich ใส่ owner/department
  const enriched = positions.map((position) => {
    const owner = owners.find((o) => o.departmentId === position.departmentId);
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

  const total = Number(totalResult.count); // กัน count เป็น string/bigint
  const totalPages = Math.ceil(total / limit);
  const hasNextPage = page < totalPages;

  return {
    data: enriched,
    meta: { total, page, limit, totalPages, hasNextPage },
  };
}


  /**
   * POST /position
   * ผูก departmentId จาก user
   * ผูก mentor หลายคนได้
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

    if (data.mentorStaffIds && data.mentorStaffIds.length > 0) {
      await db.insert(internshipPositionMentors).values(
        data.mentorStaffIds.map((mentorStaffId) => ({
          positionId: position.id,
          mentorStaffId,
        }))
      );
    }

    return position;
  }

  /**
   * PUT /position/:id
   * แก้ได้เฉพาะ position ใน department ของตัวเอง
   * mentor set ใหม่ทั้งชุด
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

    if (data.mentorStaffIds) {
      await db
        .delete(internshipPositionMentors)
        .where(eq(internshipPositionMentors.positionId, id));

      if (data.mentorStaffIds.length > 0) {
        await db.insert(internshipPositionMentors).values(
          data.mentorStaffIds.map((mentorStaffId) => ({
            positionId: id,
            mentorStaffId,
          }))
        );
      }
    }

    return updated;
  }

  /**
   * DELETE /position/:id
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
