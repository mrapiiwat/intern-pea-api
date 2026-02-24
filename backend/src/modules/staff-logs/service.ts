import { and, desc, eq } from "drizzle-orm";
import { ForbiddenError } from "@/common/exceptions";
import { db } from "@/db";
import { departments, roles, staffLogs, users } from "@/db/schema";
import type { GetStaffLogsQueryType } from "./model";

type Tx = Parameters<Parameters<typeof db.transaction>[0]>[0];

type DbOrTx = typeof db | Tx;

export class StaffLogsService {
  async log(conn: DbOrTx, userId: string, action: string) {
    const [me] = await conn
      .select({ id: users.id, roleId: users.roleId })
      .from(users)
      .where(eq(users.id, userId));

    if (!me) throw new ForbiddenError("ไม่พบผู้ใช้งาน");

    if (me.roleId !== 1 && me.roleId !== 2) {
      throw new ForbiddenError("อนุญาตเฉพาะ Admin/Owner");
    }

    await conn.insert(staffLogs).values({
      userId,
      action,
    });
  }

  async findAll(requesterUserId: string, query: GetStaffLogsQueryType) {
    const [me] = await db
      .select({ roleId: users.roleId })
      .from(users)
      .where(eq(users.id, requesterUserId));

    if (!me || (me.roleId !== 1 && me.roleId !== 2)) {
      throw new ForbiddenError("อนุญาตเฉพาะ Admin/Owner");
    }

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;

    const conditions = [];

    if (query.userId) {
      conditions.push(eq(staffLogs.userId, query.userId));
    }

    const whereClause = conditions.length ? and(...conditions) : undefined;

    const rows = await db
      .select({
        id: staffLogs.id,
        action: staffLogs.action,
        createdAt: staffLogs.createdAt,

        userId: users.id,
        fname: users.fname,
        lname: users.lname,

        roleName: roles.name,
        departmentId: departments.id,
        departmentName: departments.deptShort,
      })
      .from(staffLogs)
      .leftJoin(users, eq(users.id, staffLogs.userId))
      .leftJoin(roles, eq(roles.id, users.roleId))
      .leftJoin(departments, eq(departments.id, users.departmentId))
      .where(whereClause)
      .orderBy(desc(staffLogs.createdAt))
      .limit(limit)
      .offset(offset);

    return rows;
  }
}
