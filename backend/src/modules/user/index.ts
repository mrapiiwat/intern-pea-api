import { Elysia, t } from "elysia";
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
    async ({ set, query }) => {
      const departmentId = query.departmentId
        ? Number(query.departmentId)
        : undefined;
      const response = await userService.getStaff(departmentId);

      set.status = 200;
      return response;
    },
    {
      role: [1, 2],
      query: t.Object({
        departmentId: t.Optional(t.Numeric()),
      }),
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
  )
  .put(
    "/update",
    async ({ body, set, session }) => {
      const userId = session.userId;
      const response = await userService.updateUser(userId, body);

      set.status = 200;
      return response;
    },
    {
      auth: true,
      body: t.Object({
        fname: t.Optional(t.String()),
        lname: t.Optional(t.String()),
        email: t.Optional(t.String()),
        phoneNumber: t.Optional(t.String()),
      }),
    }
  )
  .put(
    "/student-profile",
    async ({ body, set, session }) => {
      const userId = session.userId;
      const response = await userService.updateStudentProfile(userId, body);

      set.status = 200;
      return response;
    },
    {
      auth: true,
      body: t.Object({
        hours: t.Optional(t.Number()),
        faculty: t.Optional(t.String()),
        major: t.Optional(t.String()),
        startDate: t.Optional(t.String()),
        endDate: t.Optional(t.String()),
      }),
    }
  );
