import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { genericOAuth, username } from "better-auth/plugins";
import type { InferSelectModel } from "drizzle-orm";
import { db } from "@/db";
import * as schema from "@/db/schema";

type user = InferSelectModel<typeof schema.users>;
type session = InferSelectModel<typeof schema.sessions>;

const tempStaffData = new Map<string, string>();

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: {
      user: schema.users,
      session: schema.sessions,
      account: schema.accounts,
      verification: schema.verification,
    },
  }),

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },

  plugins: [
    username(),
    genericOAuth({
      config: [
        {
          providerId: "keycloak",
          clientId: Bun.env.KEYCLOAK_CLIENT_ID!,
          clientSecret: Bun.env.KEYCLOAK_CLIENT_SECRET,
          discoveryUrl: Bun.env.KEYCLOAK_DISCOVERY_URL,

          scopes: [
            "openid",
            "profile",
            "email",
            "phone",
            "address",
            "offline_access",
          ],
          mapProfileToUser: async (profile) => {
            const employeeId =
              profile.employee_id || profile.preferred_username;

            if (employeeId && profile.email) {
              tempStaffData.set(profile.email, employeeId);
            }

            return {
              roleId: 2,
              departmentId: 1,
              fname:
                profile.given_name || profile.name?.split(" ")[0] || "Unknown",
              lname:
                profile.family_name ||
                profile.name?.split(" ").slice(1).join(" ") ||
                "",
              emailVerified: profile.email_verified || false,
              gender: "OTHER",
              username:
                profile.preferred_username || profile.email?.split("@")[0],
              displayUsername: profile.name || profile.preferred_username,
              phoneNumber: profile.phone_number || null,
            };
          },
        },
      ],
    }),
  ],

  databaseHooks: {
    user: {
      create: {
        after: async (user) => {
          const employeeId = tempStaffData.get(user.email);

          if (employeeId) {
            try {
              await db.insert(schema.staffProfiles).values({
                userId: user.id,
                employeeId: employeeId,
              });
            } catch (error) {
              console.error("Failed to create staff_profile:", error);
            } finally {
              tempStaffData.delete(user.email);
            }
          }
        },
      },
    },
  },

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
    session: async ({ session, user }: { session: session; user: user }) => {
      return {
        session,
        user,
      };
    },
  },

  advanced: {
    cookiePrefix: "better-auth",
    useSecureCookies: false,
    defaultCookieAttributes: {
      sameSite: "lax",
      secure: false,
    },
    crossDomain: {
      enabled: true,
    },
  },

  baseURL: Bun.env.BETTER_AUTH_BASE_URL,
  secret: Bun.env.BETTER_AUTH_SECRET,
  trustedOrigins: ["http://localhost:8080", "http://127.0.0.1:8080", "http://localhost:3000"],
});

export type Auth = typeof auth;
