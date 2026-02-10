import { Elysia } from "elysia";
import { auth } from "./auth";
import { department } from "./department";
import { institution } from "./institution";
import { position } from "./positions";
import { role } from "./role";
import { user } from "./user";

const modules = new Elysia({ prefix: "/api" })
  .use(department)
  .use(role)
  .use(auth)
  .use(position)
  .use(user)
  .use(institution);

export default modules;
