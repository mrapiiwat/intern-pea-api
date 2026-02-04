import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { ROLE_IDS } from "@/middlewares/auth.middleware";

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

    let profile = null;
    if (user.roleId === ROLE_IDS.STUDENT) {
      profile = user.studentProfiles;
    } else {
      profile = user.studentProfiles;
    }

    return {
      ...user,
      profile: profile,
    };
  }
}
