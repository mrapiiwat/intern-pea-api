import { Elysia } from "elysia";
import { application } from "./application";
import { auth } from "./auth";
import { department } from "./department";
import { favorite } from "./favorite";
import { institution } from "./institution";
import { institutionTicketRoutes } from "./institution-ticket/route";
import { position } from "./positions";
import { role } from "./role";
import { user } from "./user";

const modules = new Elysia({ prefix: "/api" })
  .use(department)
  .use(role)
  .use(auth)
  .use(position)
  .use(user)
  .use(institution)
  .use(favorite)
  .use(institutionTicketRoutes)
  .use(application);

export default modules;
