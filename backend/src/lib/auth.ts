import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { eq, type InferSelectModel } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

type User = InferSelectModel<typeof schema.users>;
type Session = InferSelectModel<typeof schema.sessions>;

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [username()],

  user: {
    additionalFields: {
      roleId: { type: "number", required: true },
      departmentId: { type: "number", required: false },
      fname: { type: "string" },
      lname: { type: "string" },
      phoneNumber: { type: "string" },
      gender: { type: "string" },
    },
    fields: {
      name: "fname",
      image: undefined,
      username: "phoneNumber",
      emailVerified: undefined,
    },
  },

  callbacks: {
    session: async ({ session, user }: { session: Session; user: User }) => {
      const profile = await db.query.studentProfiles.findFirst({
        where: eq(schema.studentProfiles.userId, user.id),
        columns: {
          image: true,
        },
      });

      return {
        session,
        user: {
          ...user,
          image: profile?.image || undefined,
        },
      };
    },
  },

  baseURL: Bun.env.BETTER_AUTH_BASE_URL,
  secret: Bun.env.BETTER_AUTH_SECRET,
});
