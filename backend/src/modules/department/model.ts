import { t } from "elysia";

export const GetDepartmentsQuery = t.Object({
  page: t.Optional(t.Numeric({ default: 1 })),
  limit: t.Optional(t.Numeric({ default: 20 })),
  search: t.Optional(t.String()),
  office: t.Optional(t.Numeric()),
});

export const CreateDepartmentBody = t.Object({
  // --- key fields ---
  deptSap: t.Numeric(),
  officeId: t.Numeric(),

  // --- SAP fields ---
  deptChangeCode: t.Optional(t.String()),
  deptUpper: t.Optional(t.Numeric()),

  deptShort1: t.Optional(t.String()),
  deptShort2: t.Optional(t.String()),
  deptShort3: t.Optional(t.String()),
  deptShort4: t.Optional(t.String()),
  deptShort5: t.Optional(t.String()),
  deptShort6: t.Optional(t.String()),
  deptShort7: t.Optional(t.String()),
  deptShort: t.Optional(t.String()),

  deptFull1: t.Optional(t.String()),
  deptFull2: t.Optional(t.String()),
  deptFull3: t.Optional(t.String()),
  deptFull4: t.Optional(t.String()),
  deptFull5: t.Optional(t.String()),
  deptFull6: t.Optional(t.String()),
  deptFull7: t.Optional(t.String()),
  deptFull: t.Optional(t.String()),

  costCenterCode: t.Optional(t.String()),
  costCenterName: t.Optional(t.String()),

  peaCode: t.Optional(t.String()),
  businessPlace: t.Optional(t.String()),
  businessArea: t.Optional(t.String()),

  resourceCode: t.Optional(t.String()),
  resourceName: t.Optional(t.String()),

  taxBranch: t.Optional(t.String()),

  isActive: t.Optional(t.Boolean({ default: true })),
  isDeleted: t.Optional(t.Boolean({ default: false })),

  createdBy: t.Optional(t.String()),
  updatedBy: t.String(),

  deptStableCode: t.Optional(t.String()),
  deptSapShort: t.Optional(t.String()),
  deptSapFull: t.Optional(t.String()),

  deptFullEng1: t.Optional(t.String()),
  deptFullEng2: t.Optional(t.String()),
  deptFullEng3: t.Optional(t.String()),
  deptFullEng4: t.Optional(t.String()),
  deptFullEng5: t.Optional(t.String()),
  deptFullEng6: t.Optional(t.String()),
  deptFullEng7: t.Optional(t.String()),

  deptOrder: t.Optional(t.String()),
  flgDelimit: t.Optional(t.String()),
  delimitEffectivedt: t.Optional(t.String()),
  gsberCctr: t.Optional(t.String()),

  deptLev2: t.Optional(t.Numeric()),
  deptLev3: t.Optional(t.Numeric()),
  seq: t.Optional(t.Numeric()),

  location: t.Optional(t.String()),
});

export const params = t.Object({
  id: t.Numeric(),
});

export const UpdateDepartmentBody = t.Partial(CreateDepartmentBody);

export type UpdateDepartmentBodyType = typeof UpdateDepartmentBody.static;
export type GetDepartmentsQueryType = typeof GetDepartmentsQuery.static;
export type CreateDepartmentBodyType = typeof CreateDepartmentBody.static;
