import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  applicationInformations,
  applicationStatuses,
  studentProfiles,
  users,
} from "@/db/schema";

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

    if (user.roleId === ROLE_INTERN) {
      const [latestApp] = await db
        .select({
          applicationStatusId: applicationStatuses.id,
        })
        .from(applicationStatuses)
        .where(eq(applicationStatuses.userId, userId))
        .orderBy(desc(applicationStatuses.internshipRound))
        .limit(1);

      let latestInfo: {
        startDate: Date | string | null;
        endDate: Date | string | null;
        hours: string | null;
      } | null = null;

      if (latestApp?.applicationStatusId) {
        const [info] = await db
          .select({
            startDate: applicationInformations.startDate,
            endDate: applicationInformations.endDate,
            hours: applicationInformations.hours,
          })
          .from(applicationInformations)
          .where(
            eq(
              applicationInformations.applicationStatusId,
              latestApp.applicationStatusId
            )
          )
          .limit(1);

        if (info) latestInfo = info;
      }

      const { studentProfiles, staffProfiles, ...userData } = user;

      const profile = Array.isArray(studentProfiles)
        ? studentProfiles[0]
        : studentProfiles;

      const mergedProfile = profile
        ? {
            ...profile,
            hours: latestInfo?.hours ?? null,
            startDate: latestInfo?.startDate ?? null,
            endDate: latestInfo?.endDate ?? null,
          }
        : {
            hours: latestInfo?.hours ?? null,
            startDate: latestInfo?.startDate ?? null,
            endDate: latestInfo?.endDate ?? null,
          };

      return {
        ...userData,
        profile: mergedProfile,
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
        ? and(eq(users.roleId, ROLE_STAFF), eq(users.departmentId, departmentId))
        : eq(users.roleId, ROLE_STAFF),
      with: {
        staffProfiles: true,
      },
    });

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

  async updateUser(
    userId: string,
    data: {
      fname?: string;
      lname?: string;
      email?: string;
      phoneNumber?: string;
    }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.fname !== undefined) updateData.fname = data.fname;
    if (data.lname !== undefined) updateData.lname = data.lname;
    if (data.email !== undefined) updateData.email = data.email;
    if (data.phoneNumber !== undefined) updateData.phoneNumber = data.phoneNumber;

    const [updated] = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();

    if (!updated) {
      throw new Error("User not found");
    }

    return updated;
  }

  async updateStudentProfile(
    userId: string,
    data: {
      hours?: number;
      faculty?: string;
      major?: string;
      studentNote?: string;
      startDate?: string;
      endDate?: string;
    }
  ) {
    const updateData: Record<string, unknown> = {};
    if (data.hours !== undefined) updateData.hours = String(data.hours);
    if (data.faculty !== undefined) updateData.faculty = data.faculty;
    if (data.major !== undefined) updateData.major = data.major;
    if (data.studentNote !== undefined) updateData.studentNote = data.studentNote;
    if (data.startDate !== undefined) updateData.startDate = data.startDate;
    if (data.endDate !== undefined) updateData.endDate = data.endDate;

    const [updated] = await db
      .update(studentProfiles)
      .set(updateData)
      .where(eq(studentProfiles.userId, userId))
      .returning();

    if (!updated) {
      throw new Error("Student profile not found");
    }

    return updated;
  }
}