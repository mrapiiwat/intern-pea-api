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
        name: "Auth",
        description: "ระบบยืนยันตัวตน, Login, Register และ Session",
      },
      {
        name: "Users",
        description: "ข้อมูลบัญชีผู้ใช้ (Admin, Owner, Student)",
      },
      {
        name: "Roles",
        description:
          "จัดการข้อมูลบทบาทและสิทธิ์การเข้าใช้งานระบบ (Roles & Permissions)",
      },
      {
        name: "Institutions",
        description: "ข้อมูลสถาบันการศึกษา (ค้นหา / เพิ่มสถาบันใหม่ในขั้นตอนสมัคร)",
      },
      {
        name: "Departments",
        description: "ข้อมูลกองงาน, สำนักงาน, และโครงสร้างหน่วยงานของ PEA",
      },
      {
        name: "Positions",
        description: "ประกาศตำแหน่งฝึกงาน",
      },
      {
        name: "Applications",
        description:
          "กระบวนการสมัครฝึกงานของนักศึกษา (สมัคร, อัปโหลดเอกสาร, ตรวจเอกสาร)",
      },
      {
        name: "Documents",
        description:
          "เอกสารที่เกี่ยวข้องกับการสมัครฝึกงาน (Transcript, Resume, Portfolio, Request Letter)",
      },
      {
        name: "Projects",
        description: "โครงงานที่นักศึกษาฝึกงานได้รับมอบหมาย",
      },
      {
        name: "Daily Work Logs",
        description: "บันทึกการทำงานประจำวันของนักศึกษาฝึกงาน",
      },
      {
        name: "Notifications",
        description: "ระบบแจ้งเตือนภายในระบบ",
      },
      {
        name: "Admin",
        description: "การจัดการและการตรวจสอบโดยผู้ดูแลระบบ",
      },
    ],
  },
});

export default swaggerConfig;
