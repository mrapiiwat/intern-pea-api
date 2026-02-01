import { Elysia } from "elysia";
import { department } from "./department";
import { role } from "./role";

const modules = new Elysia({ prefix: "/api/v1" }).use(department).use(role);

export default modules;
