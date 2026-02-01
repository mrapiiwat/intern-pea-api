INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('STAFF', 'เจ้าหน้าที่ดูแลระบบ (General Staff)', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('INTERN', 'นักศึกษาฝึกงาน (Internship Student)', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;