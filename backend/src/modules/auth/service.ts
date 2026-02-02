import { eq } from "drizzle-orm";
import { BadRequestError, InternalServerError } from "@/common/exceptions";
import { db } from "@/db";
import { accounts, sessions, studentProfiles, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import type * as model from "./model";

const ROLE_INTERN = 2;

export class AuthService {
  async registerIntern(data: model.RegisterInternBodyType) {
    const authResponse = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: `${data.fname} ${data.lname}`,
        fname: data.fname,
        lname: data.lname,
        phoneNumber: data.phoneNumber,
        gender: data.gender,
        roleId: ROLE_INTERN,
        departmentId: null,
        username: data.phoneNumber,
        displayUsername: `${data.fname} ${data.lname}`,
      },
    });

    if (!authResponse?.user) {
      throw new InternalServerError("FAILED_TO_CREATE_USER");
    }

    try {
      return await db.transaction(async (tx) => {
        await tx.insert(studentProfiles).values({
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

        return { success: true, message: "Registration successful" };
      });
    } catch (error: unknown) {
      console.log(error);

      await db
        .delete(sessions)
        .where(eq(sessions.userId, authResponse.user.id));

      await db
        .delete(accounts)
        .where(eq(accounts.userId, authResponse.user.id));

      await db.delete(users).where(eq(users.id, authResponse.user.id));

      throw new BadRequestError("FAILED_TO_CREATE_PROFILE");
    }
  }

  async login(data: model.LoginInternBodyType) {
    const response = await auth.api.signInUsername({
      body: {
        username: data.phoneNumber,
        password: data.password,
      },
    });

    if (!response?.user) {
      throw new InternalServerError("INVALID_CREDENTIALS");
    }

    return { token: response.token };
  }
}
