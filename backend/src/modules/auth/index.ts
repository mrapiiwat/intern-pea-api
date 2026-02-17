import { Elysia } from "elysia";
import * as model from "./model";
import { AuthService } from "./service";

const authService = new AuthService();

export const auth = new Elysia({ prefix: "/auth", tags: ["Authentication"] })
  .post(
    "/sign-up/intern",
    async ({ body, set }) => {
      const response = authService.registerIntern(body);

      set.status = 201;
      return response;
    },
    {
      body: model.RegisterInternBody,
    }
  )

  .post(
    "/sign-in/intern",
    async ({ body, set }) => {
      const response = authService.login(body);

      set.status = 200;
      return response;
    },
    {
      body: model.LoginInternBody,
    }
  )

  .get("/sign-in/keycloak", async ({ set }) => {
    const response = await authService.loginWithKeycloak();

    set.status = 200;
    return response;
  })

  .post("/sign-out", async ({ request, set }) => {
    const response = await authService.logout(request.headers);

    set.status = 200;
    return response;
  });
