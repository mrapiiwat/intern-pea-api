INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('admin', 'เจ้าหน้าที่ดูแลระบบ', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('owner', 'เจ้าหน้าที่ดูแลกอง, ผู้ประกาศรับสมัครฝึกงาน และ พี่เลี้ยง', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('student', 'นักศึกษาฝึกงาน', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

-- test seeds

INSERT INTO institutions (institutions_type,name,created_at,updated_at)
VALUES
  ('UNIVERSITY', 'มหาวิทยาลัยเกษตรศาสตร์', NOW(), NOW()),
  ('SCHOOL', 'โรงเรียนบ้านหนองโค', NOW(), NOW()),
  ('VOCATIONAL', 'วิทยาลัยเทคนิคกรุงเทพ', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO offices (name, short_name, manager_name, manager_contact, address, created_at, updated_at)
VALUES
  ('สำนักงานใหญ่การไฟฟ้าส่วนภูมิภาค','สนญ.','ดร.มงคล ตรีกิจจานนท์','โทร. 02-590-5100','200 ถนนงามวงศ์วาน แขวงลาดยาว เขตจตุจักร กรุงเทพฯ 10900',NOW(),NOW())
  ('การไฟฟ้าส่วนภูมิภาคสาขาย่อยอำเภอพญาเม็งราย','กฟจ.เชียงราย','นายอดิเรก ไลไธสง','โทร. 0-5379-9069','114 ม.18 (อ้างอิงข้อมูลที่ตั้ง) ต.แม่เปา อ.พญาเม็งราย จ.เชียงราย 57290',NOW(),NOW())
ON CONFLICT (short_name) DO NOTHING;

INSERT INTO departments (dept_sap, dept_short, dept_full, is_active, office_id, created_at, updated_at, updated_by)
VALUES
  (100100, 'กอพ.1', 'กองอำนวยการพัฒนา 1', B'1', 1, NOW(), NOW(), 'SYSTEM'),
  (100101, 'กอพ.2', 'กองอำนวยการพัฒนา 2', B'1', 1, NOW(), NOW(), 'SYSTEM'),
  (100102, 'กอพ.3', 'กองอำนวยการพัฒนา 3', B'1', 1, NOW(), NOW(), 'SYSTEM')
ON CONFLICT (dept_sap) DO NOTHING;
