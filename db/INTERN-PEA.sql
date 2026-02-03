CREATE TYPE public.internship_status_enum AS ENUM ('NONE', 'ACTIVE', 'COMPLETE', 'CANCEL');
CREATE TYPE public.leave_request_enum AS ENUM ('ABSENCE', 'SICK');
CREATE TYPE public.leave_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.recruitment_status_enum AS ENUM ('OPEN', 'CLOSE');
CREATE TYPE public.app_status_enum AS ENUM ('PENDING_DOCUMENT', 'PENDING_INTERVIEW', 'PENDING_CONFIRMATION', 'ACCEPTED', 'COMPLETE');
CREATE TYPE public.validation_status_enum AS ENUM ('INVALID', 'VERIFIED', 'REQUESTPENDING');
CREATE TYPE public.gender_enum AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE public.institutions_types AS ENUM ('UNIVERSITY','VOCATIONAL','SCHOOL','OTHERS');

CREATE TABLE public.roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
COMMENT ON TABLE public.roles IS 'แยก Role ของ User ที่มีต่อระบบ';

CREATE TABLE public.doc_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  is_required BOOLEAN,
  description TEXT
);
COMMENT ON TABLE public.doc_types IS 'ประเภทเอกสาร Trans, Port, Resume, Request';

CREATE TABLE public.departments (
  id SERIAL PRIMARY KEY, 
  name VARCHAR(150) NOT NULL UNIQUE, 
  location VARCHAR(255),
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.departments IS 'กองงาน';

CREATE TABLE public.institutions (
  id SERIAL PRIMARY KEY,
  institutions_type public.institutions_types,
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.institutions IS 'เก็บรายชื่อสถาบัน';

CREATE TABLE public.faculties (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.faculties IS 'คณะ';

CREATE TABLE public.users (
  id VARCHAR(50) PRIMARY KEY,
  role_id INT NOT NULL,
  department_id INT,
  fname VARCHAR(100),
  lname VARCHAR(100),
  username VARCHAR(100) UNIQUE,
  display_username TEXT,
  phone_number VARCHAR(20) UNIQUE,
  email VARCHAR(150) UNIQUE,
  gender public.gender_enum,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (role_id) REFERENCES public.roles(id),
  FOREIGN KEY (department_id) REFERENCES public.departments(id)
);
COMMENT ON TABLE public.users IS 'บัญชีผู้ใช้หลักใช้ Login';

CREATE TABLE public.staff_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE,
  employee_id VARCHAR(50) NOT NULL UNIQUE,

  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);
COMMENT ON TABLE public.staff_profiles IS 'โปรไฟล์พี่เลี้ยง';

CREATE TABLE public.student_profiles (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE,
  image VARCHAR(255) UNIQUE,
  hours DECIMAL(10,2),
  institution_id INT NOT NULL,
  faculty_id INT,
  major  VARCHAR,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN,
  student_note TEXT,
  internship_status public.internship_status_enum NOT NULL,
  status_note TEXT,

  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id),
  FOREIGN KEY (faculty_id) REFERENCES public.faculties(id)
);
COMMENT ON TABLE public.student_profiles IS 'ข้อมูลเฉพาะนักศึกษา';

CREATE TABLE public.sessions (
  id VARCHAR(50) PRIMARY KEY,
  expires_at TIMESTAMP NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  ip_address TEXT,
  user_agent TEXT,
  user_id VARCHAR(50) NOT NULL,

  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.accounts (
  id VARCHAR(50) PRIMARY KEY,
  account_id TEXT NOT NULL,
  provider_id TEXT NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMP,
  refresh_token_expires_at TIMESTAMP,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE
);

CREATE TABLE public.admin_logs (
  id SERIAL PRIMARY KEY,
  admin_id VARCHAR(50) NOT NULL,
  action TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (admin_id) REFERENCES public.users(id)
);

CREATE TABLE public.check_times (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  time TIMESTAMP,
  type_check VARCHAR(20) NOT NULL,
  is_late BOOLEAN,
  ip VARCHAR(100),
  note TEXT,
  location VARCHAR(255),
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION, 

  FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.leave_requests (
  id SERIAL PRIMARY KEY,
  leave_request_type public.leave_request_enum NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  leave_datetime TIMESTAMP,
  reason TEXT,
  file VARCHAR(255),
  status public.leave_status_enum NOT NULL,
  approver_id VARCHAR(50),
  approved_at TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES public.users(id),
  FOREIGN KEY (approver_id) REFERENCES public.users(id)
);

CREATE TABLE public.notifications (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES public.users(id)
);

CREATE TABLE public.internship_positions (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  department_id INT NOT NULL,
  location VARCHAR(255),
  position_count INT,
  major VARCHAR(255),
  apply_start TIMESTAMP,
  apply_end TIMESTAMP,
  job_details TEXT,
  requirement TEXT,
  benefits TEXT,
  recruitment_status public.recruitment_status_enum NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (department_id) REFERENCES public.departments(id)
);

CREATE TABLE public.favorites (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  position_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (user_id, position_id),

  FOREIGN KEY (user_id) REFERENCES public.users(id),
  FOREIGN KEY (position_id) REFERENCES public.internship_positions(id)
);

CREATE TABLE public.application_statuses (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  department_id INT NOT NULL,
  position_id INT NOT NULL,
  application_status public.app_status_enum NOT NULL,
  internship_round INT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  active_key VARCHAR(50), 
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (user_id, internship_round),
  UNIQUE (user_id, department_id, active_key),

  FOREIGN KEY (user_id) REFERENCES public.users(id),
  FOREIGN KEY (department_id) REFERENCES public.departments(id),
  FOREIGN KEY (position_id) REFERENCES public.internship_positions(id)
);

CREATE TABLE public.application_informations (
  id SERIAL PRIMARY KEY,
  application_status_id INT NOT NULL UNIQUE,
  skill TEXT,
  expectation TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (application_status_id) REFERENCES public.application_statuses(id)
);

CREATE TABLE public.application_documents (
  id SERIAL PRIMARY KEY,
  application_status_id INT NOT NULL,
  doc_type_id INT NOT NULL,
  doc_file VARCHAR(255) NOT NULL,
  validation_status public.validation_status_enum NOT NULL,
  note TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (application_status_id, doc_type_id),

  FOREIGN KEY (application_status_id) REFERENCES public.application_statuses(id),
  FOREIGN KEY (doc_type_id) REFERENCES public.doc_types(id)
);

CREATE TABLE public.application_mentors (
  id SERIAL PRIMARY KEY,
  application_status_id INT NOT NULL,
  mentor_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (application_status_id, mentor_id),

  FOREIGN KEY (application_status_id) REFERENCES public.application_statuses(id),
  FOREIGN KEY (mentor_id) REFERENCES public.staff_profiles(id)
);

CREATE TABLE public.daily_work_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  work_date TIMESTAMP NOT NULL,
  content TEXT,
  mentor_comment TEXT,
  is_approve BOOLEAN NOT NULL DEFAULT FALSE,
  approve_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  FOREIGN KEY (user_id) REFERENCES public.users(id),
  FOREIGN KEY (approve_by) REFERENCES public.staff_profiles(id)
);