import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

const ROLE_STAFF = 2;
const ROLE_INTERN = 3;

export class UserService {
  async me(userId: string) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, userId),
      with: {
        staffProfiles: true,
        studentProfiles: true,
      },
    });

    if (!user) {
      throw new Error("User not found");
    }

    if (user.roleId === 3) {
      const { studentProfiles, staffProfiles, ...userData } = user;
      return {
        ...userData,
        profile: studentProfiles,
      };
    }

    const { staffProfiles, studentProfiles, ...userData } = user;
    return {
      ...userData,
      profile: staffProfiles,
    };
  }

  async getStaff(departmentId?: number) {
    const staffUsers = await db.query.users.findMany({
      where: departmentId
        ? and(
            eq(users.roleId, ROLE_STAFF),
            eq(users.departmentId, departmentId)
          )
        : eq(users.roleId, ROLE_STAFF),
      with: {
        staffProfiles: true,
      },
    });

    // Return staffProfileId at top level for frontend mentorStaffIds
    // staffProfiles is array (one-to-many), get first element
    return staffUsers.map((user) => {
      const { staffProfiles, ...userData } = user;
      const profile = Array.isArray(staffProfiles)
        ? staffProfiles[0]
        : staffProfiles;
      return {
        ...userData,
        staffProfileId: profile?.id || null,
      };
    });
  }

  async getStudent() {
    return db.query.users.findMany({
      where: eq(users.roleId, ROLE_INTERN),
    });
  }
}
