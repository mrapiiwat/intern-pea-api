import { Elysia } from "elysia";
import { isAuthenticated } from "@/middlewares/auth.middleware";
import { UserService } from "./service";

const userService = new UserService();

export const user = new Elysia({ prefix: "/user", tags: ["user"] })
  .use(isAuthenticated)
  .get(
    "/profile",
    async ({ set, session }) => {
      const userId = session.userId;
      const response = userService.me(userId);

      set.status = 200;
      return response;
    },
    {
      auth: true,
    }
  );
