import { swagger } from "@elysiajs/swagger";

const swaggerConfig = swagger({
  path: "/docs",
  documentation: {
    info: {
      title: "PEA Internship Management API",
      version: "1.0.0",
      description: "ระบบบริหารจัดการนักศึกษาฝึกงาน การไฟฟ้าส่วนภูมิภาค (PEA)",
    },
    tags: [
      {
        name: "Departments",
        description: "ข้อมูลแผนก, สำนักงานเขต, และพิกัดสถานที่ (Lat/Long)",
      },
      {
        name: "Role",
        description:
          "จัดการข้อมูลบทบาทและสิทธิ์การเข้าใช้งานระบบ (Roles & Permissions)",
      },
    ],
  },
});

export default swaggerConfig;
