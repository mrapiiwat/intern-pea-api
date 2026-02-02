import { eq } from "drizzle-orm";
import {
  BadRequestError,
  ForbiddenError,
  InternalServerError,
} from "@/common/exceptions";
import { db } from "@/db";
import { studentProfiles, users } from "@/db/schema";
import { auth } from "@/lib/auth";
import type * as model from "./model";

const ROLE_INTERN = 2;

export class AuthService {
  async registerIntern(data: model.RegisterInternBodyType) {
    const authResponse = await auth.api.signUpEmail({
      body: {
        email: data.email,
        password: data.password,
        name: data.fname,
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
      throw new InternalServerError("Failed to create user account.");
    }

    const userId = authResponse.user.id;

    try {
      return await db.transaction(async (tx) => {
        await tx.insert(studentProfiles).values({
          userId: userId,
          institutionId: data.institutionId,
          facultyId: data.facultyId,
          major: data.major,
          hours: String(data.totalHours),
          internshipStatus: "NONE",
          isActive: true,
          startDate: data.startDate || null,
          endDate: data.endDate || null,
        });

        return { success: true, message: "Intern registration successful" };
      });
    } catch (error) {
      console.error(
        "Profile creation failed. Rolling back user:",
        userId,
        error
      );

      try {
        await db.delete(users).where(eq(users.id, userId));
      } catch (rollbackError) {
        console.error(
          `FATAL: Orphan user created! ID: ${userId}`,
          rollbackError
        );
      }

      throw new BadRequestError(
        "Failed to create student profile. The account creation has been rolled back. Please verify your information and try again."
      );
    }
  }

  async login(data: model.LoginInternBodyType) {
    try {
      const result = await auth.api.signInUsername({
        body: {
          username: data.phoneNumber,
          password: data.password,
        },
      });

      if (!result?.user) {
        throw new BadRequestError("Invalid phone number or password");
      }

      return {
        success: true,
        message: "Login successful",
      };
    } catch (error) {
      if (error instanceof BadRequestError || error instanceof ForbiddenError) {
        throw error;
      }

      throw new BadRequestError("Login failed. Please try again later");
    }
  }

  async logout(headers: Headers) {
    const response = await auth.api.signOut({
      headers: headers,
      asResponse: true,
    });

    return response;
  }
}
