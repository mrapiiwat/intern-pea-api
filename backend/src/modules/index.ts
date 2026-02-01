import { Elysia } from "elysia";
import { auth } from "./auth";
import { department } from "./department";
import { role } from "./role";

const modules = new Elysia({ prefix: "/api" })
  .use(department)
  .use(role)
  .use(auth);

export default modules;
