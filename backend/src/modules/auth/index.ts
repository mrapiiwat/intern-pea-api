import { Elysia } from "elysia";
import * as model from "./model";
import { AuthService } from "./service";

const authService = new AuthService();

export const auth = new Elysia({
  prefix: "/auth",
  tags: ["Authentication"],
}).post(
  "/sign-up/intern",
  async ({ body, set }) => {
    const response = authService.registerIntern(body);

    set.status = 201;
    return response;
  },
  {
    body: model.RegisterInternBody,
  }
);
