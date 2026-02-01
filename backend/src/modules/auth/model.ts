import { t } from "elysia";

export const RegisterInternBody = t.Object({
  fname: t.String({ minLength: 1, error: "กรุณาระบุชื่อจริง" }),
  lname: t.String({ minLength: 1, error: "กรุณาระบุนามสกุล" }),
  phoneNumber: t.String({ minLength: 9, error: "เบอร์โทรศัพท์ไม่ถูกต้อง" }),
  email: t.String({ format: "email", error: "รูปแบบอีเมลไม่ถูกต้อง" }),
  password: t.String({ minLength: 6, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
  gender: t.Union(
    [t.Literal("MALE"), t.Literal("FEMALE"), t.Literal("OTHER")],
    { error: "เพศต้องเป็น MALE, FEMALE หรือ OTHER เท่านั้น" }
  ),
  institutionId: t.Numeric({ error: "กรุณาระบุรหัสสถาบัน" }),
  facultyId: t.Optional(t.Numeric()),
  major: t.Optional(t.String()),
  totalHours: t.Numeric({ error: "กรุณาระบุจำนวนชั่วโมงฝึกงาน" }),
  startDate: t.Optional(t.String()),
  endDate: t.Optional(t.String()),
});

export const LoginInternBody = t.Object({
  phoneNumber: t.String({ minLength: 9, error: "เบอร์โทรศัพท์ไม่ถูกต้อง" }),
  password: t.String({ minLength: 6, error: "รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร" }),
});

export type RegisterInternBodyType = typeof RegisterInternBody.static;
export type LoginInternBodyType = typeof LoginInternBody.static;
