import Elysia from "elysia";
import { ForbiddenError, UnauthorizedError } from "@/common/exceptions";
import { auth } from "@/lib/auth";

// export const ROLE_IDS = {
//   STUDENT: 1,
//   MENTOR: 2,
//   ADMIN: 3,
// } as const;

// type role_value = (typeof ROLE_IDS)[keyof typeof ROLE_IDS];

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
    role: (role: number | number[]) => ({
      async resolve({ request: { headers } }) {
        const session = await auth.api.getSession({
          headers,
        });

        if (!session) {
          throw new UnauthorizedError(
            "Unauthorized: Session not found or expired"
          );
        }

        if (session.user.roleId !== role) {
          throw new ForbiddenError("Forbidden: You do not have permission");
        }

        return {
          user: session.user,
          session: session.session,
        };
      },
    }),
  });
