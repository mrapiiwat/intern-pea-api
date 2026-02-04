import Elysia from "elysia";
import { ForbiddenError, UnauthorizedError } from "@/common/exceptions";
import { auth } from "@/lib/auth";

export const ROLE_IDS = {
  STUDENT: 1,
  MENTOR: 2,
  ADMIN: 3,
} as const;

type role_value = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];

export const isAuthenticated = new Elysia({ name: "better-auth" })
  .mount(auth.handler)
  .macro({
    auth: {
      async resolve({ request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          throw new UnauthorizedError(
            "Unauthorized: Session not found or expired"
          );
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    },
    role: (roles: role_value | role_value[]) => ({
      async resolve({ request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          throw new UnauthorizedError(
            "Unauthorized: Session not found or expired"
          );
        }

        const allowedRoles = Array.isArray(roles) ? roles : [roles];

        if (!allowedRoles.includes(session.user.roleId as role_value)) {
          throw new ForbiddenError("Forbidden: You do not have permission");
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    }),
  });
