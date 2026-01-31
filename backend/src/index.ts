import { cors } from "@elysiajs/cors";
import { Elysia } from "elysia";
import { errorMiddleware } from "@/middlewares/error.middleware";

const PORT = Bun.env.PORT ? parseInt(Bun.env.PORT, 10) : 8080;
const app = new Elysia()
  .use(errorMiddleware)
  .use(cors())
  .listen(PORT);

console.log(
  `Server is running at http://${app.server?.hostname}:${app.server?.port}`
);
