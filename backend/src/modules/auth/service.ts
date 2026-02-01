import { eq } from "drizzle-orm";
import { db } from "@/db";
import { studentProfiles, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import type { RegisterInternBodyType } from "./model";

const ROLE_INTERN = 2;

export class AuthService {
  async registerIntern(data: RegisterInternBodyType) {
    const authResponse = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: `${data.fname} ${data.lname}`,
        username: data.phoneNumber,
        fname: data.fname,
        lname: data.lname,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        roleId: ROLE_INTERN,
        departmentId: null,
      },
    });

    if (!authResponse?.user) {
      throw new Error("FAILED_TO_CREATE_USER");
    }

    try {
      await db.insert(studentProfiles).values({
        userId: authResponse.user.id,
        institutionId: data.institutionId,
        facultyId: data.facultyId,
        major: data.major,
        hours: data.totalHours.toString(),
        internshipStatus: "NONE",
        isActive: true,
        startDate: data.startDate || null,
        endDate: data.endDate || null,
      });
    } catch (error) {
      console.error("Profile creation failed, rolling back user:", error);
      await db.delete(users).where(eq(users.id, authResponse.user.id));

      throw new Error("FAILED_TO_CREATE_PROFILE");
    }

    return authResponse.user;
  }
}
