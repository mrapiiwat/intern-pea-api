import { and, count, eq, ilike, or, type SQL } from "drizzle-orm";
import { NotFoundError } from "elysia";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import {
  departments,
  internshipPositionMentors,
  internshipPositions,
  staffProfiles,
  users,
  offices,
} from "@/db/schema";
import type * as model from "./model";

type MentorDTO = {
  staffId: number;
  name: string;
  email: string | null;
  phoneNumber: string | null;
};

type PositionWithMentors = typeof internshipPositions.$inferSelect & {
  mentors: MentorDTO[];
};

type OwnerDTO = {
  fname: string | null;
  lname: string | null;
  email: string | null;
  phoneNumber: string | null;
};

type DepartmentDTO = {
  id: number;
  deptSap: number;
  deptShort: string | null;
  deptFull: string | null;
  location: string | null;
  officeId: number;
};

type OfficeDTO = {
  id: number;
  name: string;
  shortName: string;
};

type EnrichedPosition = PositionWithMentors & {
  owners: OwnerDTO[];
  department: DepartmentDTO | null;
  office: OfficeDTO | null;
};

export class PositionService {
  private async assertUserExists(userId: string) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId));

    if (!user) throw new ForbiddenError("ไม่พบผู้ใช้งานในระบบ");
  }

  /**
   * ผู้ใช้ต้องมี department_id
   * และเราจะดึง office_id จาก departments เพื่อใช้กับ internship_positions
   */
  private async getUserDepartmentAndOffice(userId: string): Promise<{
    departmentId: number;
    officeId: number;
  }> {
    const [row] = await db
      .select({
        departmentId: users.departmentId,
        officeId: departments.officeId,
      })
      .from(users)
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(eq(users.id, userId));

    if (!row) throw new ForbiddenError("ไม่พบผู้ใช้งานในระบบ");
    if (row.departmentId === null) {
      throw new ForbiddenError("ผู้ใช้งานยังไม่ได้สังกัดแผนก (department)");
    }
    if (row.officeId === null) {
      throw new ForbiddenError("department ของผู้ใช้งานยังไม่ได้ผูกสำนักงาน (office)");
    }

    return { departmentId: row.departmentId, officeId: row.officeId };
  }

  /**
   * GET /position
   * filter ได้ด้วย search, department, office
   * แสดง mentor (หลายคน)
   */
  async findAll(query: model.GetPositionsQueryType) {
    const { page = 1, limit = 10, search, department, office } = query as
      model.GetPositionsQueryType & { office?: number };

    const offset = (page - 1) * limit;
    const filters: SQL[] = [];

    if (department !== undefined) {
      filters.push(eq(internshipPositions.departmentId, department));
    }

    if (office !== undefined) {
      filters.push(eq(internshipPositions.officeId, office));
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
        map.set(id, { ...r.position, mentors: [] });
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

    const departmentIds = [...new Set(positions.map((p) => p.departmentId))];
    const officeIds = [...new Set(positions.map((p) => p.officeId))];

    const owners =
      departmentIds.length > 0
        ? await db
            .select({
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

    // department info (โครงสร้างใหม่)
    const departmentData =
      departmentIds.length > 0
        ? await db
            .select({
              id: departments.id,
              deptSap: departments.deptSap,
              deptShort: departments.deptShort,
              deptFull: departments.deptFull,
              location: departments.location,
              officeId: departments.officeId,
            })
            .from(departments)
            .where(or(...departmentIds.map((dId) => eq(departments.id, dId))))
        : [];

    // office info
    const officeData =
      officeIds.length > 0
        ? await db
            .select({
              id: offices.id,
              name: offices.name,
              shortName: offices.shortName,
            })
            .from(offices)
            .where(or(...officeIds.map((oId) => eq(offices.id, oId))))
        : [];

    const ownersByDept = new Map<number, OwnerDTO[]>();
    for (const o of owners) {
      const deptId = o.departmentId;
      if (deptId === null) continue;

      const list = ownersByDept.get(deptId) ?? [];
      list.push({
        fname: o.fname ?? null,
        lname: o.lname ?? null,
        email: o.email ?? null,
        phoneNumber: o.phoneNumber ?? null,
      });
      ownersByDept.set(deptId, list);
    }

    const enriched: EnrichedPosition[] = positions.map((position) => {
      const dept = departmentData.find((d) => d.id === position.departmentId);
      const off = officeData.find((o) => o.id === position.officeId);

      return {
        ...position,
        owners: ownersByDept.get(position.departmentId) ?? [],
        department: dept
          ? {
              id: dept.id,
              deptSap: dept.deptSap,
              deptShort: dept.deptShort ?? null,
              deptFull: dept.deptFull ?? null,
              location: dept.location ?? null,
              officeId: dept.officeId,
            }
          : null,
        office: off
          ? {
              id: off.id,
              name: off.name,
              shortName: off.shortName,
            }
          : null,
      };
    });

    const [totalResult] = await db
      .select({ count: count() })
      .from(internshipPositions)
      .where(whereClause);

    const total = Number(totalResult.count);
    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;

    return {
      data: enriched,
      meta: { total, page, limit, totalPages, hasNextPage },
    };
  }

  /**
   * POST /position
   * ผูก departmentId + officeId จาก user (derive จาก departments)
   * ผูก mentor หลายคนได้
   */
  async create(userId: string, data: model.CreatePositionBodyType) {
    await this.assertUserExists(userId);
    const { departmentId, officeId } = await this.getUserDepartmentAndOffice(
      userId
    );

    const [position] = await db
      .insert(internshipPositions)
      .values({
        departmentId,
        officeId,

        name: data.name,
        location: data.location ?? null,
        positionCount: data.positionCount ?? null,
        major: data.major ?? null,

        recruitStart: data.recruitStart ?? null,
        recruitEnd: data.recruitEnd ?? null,
        applyStart: data.applyStart ?? null,
        applyEnd: data.applyEnd ?? null,

        resumeRq: data.resumeRq ?? false,
        portfolioRq: data.portfolioRq ?? false,

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
    const { departmentId } = await this.getUserDepartmentAndOffice(userId);

    const [updated] = await db
      .update(internshipPositions)
      .set({
        // อัปเดตเฉพาะ field ที่มีจริงในตาราง
        name: data.name ?? undefined,
        location: data.location ?? undefined,
        positionCount: data.positionCount ?? undefined,
        major: data.major ?? undefined,

        recruitStart: data.recruitStart ?? undefined,
        recruitEnd: data.recruitEnd ?? undefined,
        applyStart: data.applyStart ?? undefined,
        applyEnd: data.applyEnd ?? undefined,

        resumeRq: data.resumeRq ?? undefined,
        portfolioRq: data.portfolioRq ?? undefined,

        jobDetails: data.jobDetails ?? undefined,
        requirement: data.requirement ?? undefined,
        benefits: data.benefits ?? undefined,

        recruitmentStatus: data.recruitmentStatus ?? undefined,
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
    const { departmentId } = await this.getUserDepartmentAndOffice(userId);

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
