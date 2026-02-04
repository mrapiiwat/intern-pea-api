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
      const response = await userService.me(userId);

      set.status = 200;
      return response;
    },
    {
      auth: true,
    }
  )
  .get(
    "/staff",
    async ({ set }) => {
      const response = await userService.getStaff();

      set.status = 200;
      return response;
    },
    {
      role: [1, 2],
    }
  )
  .get(
    "/student",
    async ({ set }) => {
      const response = await userService.getStudent();

      set.status = 200;
      return response;
    },
    {
      role: [1, 2],
    }
  );
