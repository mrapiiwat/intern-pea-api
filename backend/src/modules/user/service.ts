import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";

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
}
