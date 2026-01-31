import { Elysia } from "elysia";
import { department } from "./department";

const modules = new Elysia({ prefix: "/api/v1" }).use(department);

export default modules;
