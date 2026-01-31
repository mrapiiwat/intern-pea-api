import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { logger } from "elysia-logger";
import { errorMiddleware } from "@/middlewares/error.middleware";
import modules from "./modules";

const PORT = Bun.env.PORT ? parseInt(Bun.env.PORT, 10) : 8080;
const app = new Elysia()
  .use(logger())
  .use(errorMiddleware)
  .use(cors())
  .use(modules)
  .listen(PORT);

console.log(
  `Server is running at http://${app.server?.hostname}:${app.server?.port}`
);
