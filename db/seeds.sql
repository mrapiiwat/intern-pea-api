INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('staff', 'เจ้าหน้าที่ดูแลระบบ (General Staff)', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('intern', 'นักศึกษาฝึกงาน (Internship Student)', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO institutions (name, created_at, updated_at)
VALUES ('university', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO institutions (name, created_at, updated_at)
VALUES ('school', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO faculties (name, created_at, updated_at)
VALUES ('มหาวิทยาลัยธุรกิจบัณฑิตย์', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO faculties (name, created_at, updated_at)
VALUES ('มหาวิทยาลัยเกษตรศาสตร์', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO faculties (name, created_at, updated_at)
VALUES ('มหาวิทยาลัยศรีปทุม', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO faculties (name, created_at, updated_at)
VALUES ('โรงเรียนท่าอิฐศึกษา', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO faculties (name, created_at, updated_at)
VALUES ('โรงเรียนธรรมมิสลาม', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

