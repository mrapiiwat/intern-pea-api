import Elysia from "elysia";
import { UnauthorizedError } from "@/common/exceptions";
import { auth } from "@/lib/auth";

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
  });
