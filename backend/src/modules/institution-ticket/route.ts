import Elysia from "elysia";
import * as model from "./model";
import { InstitutionTicketService } from "./service";

const service = new InstitutionTicketService();

export const institutionTicketRoutes = new Elysia({
  prefix: "/institution_ticket",
}).get(
  "/:id",
  ({ params, set }) => {
    set.headers["Cache-Control"] = "public, max-age=300";
    return service.findById(params.id);
  },
  { params: model.params }
);
