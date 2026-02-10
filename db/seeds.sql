INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('admin', 'เจ้าหน้าที่ดูแลระบบ', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('owner', 'เจ้าหน้าที่ดูแลกอง, ผู้ประกาศรับสมัครฝึกงาน และ พี่เลี้ยง', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO roles (name, description, created_at, updated_at)
VALUES ('student', 'นักศึกษาฝึกงาน', NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO departments (name, location, latitude, longitude, created_at, updated_at)
VALUES ('กอพ.1', 'สนญ.', 1.1, 1.2, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;

INSERT INTO departments (name, location, latitude, longitude, created_at, updated_at)
VALUES ('กอพ.2', 'สนญ.', 1.4, 1.5, NOW(), NOW())
ON CONFLICT (name) DO NOTHING;