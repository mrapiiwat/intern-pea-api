import { Elysia } from "elysia";
import * as model from "./model";
import { DepartmentService } from "./service";

const departmentService = new DepartmentService();

export const department = new Elysia({ prefix: "/dept" })
  .get(
    "/",
    async ({ query, set }) => {
      const response = departmentService.findAll(query);

      set.status = 200;
      return response;
    },
    {
      query: model.GetDepartmentsQuery,
    }
  )
  .post(
    "/",
    async ({ body, set }) => {
      const response = departmentService.create(body);

      set.status = 201;
      return response;
    },
    {
      body: model.CreateDepartmentBody,
    }
  );
