CREATE TYPE public.internship_status_enum AS ENUM ('PENDING','INTERVIEW','REVIEW', 'ACCEPT', 'ACTIVE', 'COMPLETE', 'CANCEL');
CREATE TYPE public.leave_request_enum AS ENUM ('ABSENCE', 'SICK');
CREATE TYPE public.leave_status_enum AS ENUM ('PENDING', 'APPROVED', 'REJECTED');
CREATE TYPE public.recruitment_status_enum AS ENUM ('OPEN', 'CLOSE');
CREATE TYPE public.app_status_enum AS ENUM ('PENDING_DOCUMENT', 'PENDING_INTERVIEW', 'PENDING_CONFIRMATION', 'PENDING_REQUEST', 'PENDING_REVIEW' , 'COMPLETE');
CREATE TYPE public.validation_status_enum AS ENUM ('PENDING', 'INVALID', 'VERIFIED');
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

CREATE TABLE public.offices ( 
  id SERIAL PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  short_name VARCHAR(50) NOT NULL UNIQUE,
  manager_name VARCHAR(150) NOT NULL,
  manager_contact VARCHAR(255) NOT NULL,
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.offices IS 'สำนักงาน';

CREATE TABLE public.departments (
  id SERIAL PRIMARY KEY,

  dept_sap INT4 NOT NULL,
  dept_change_code BPCHAR(20) NULL,
  dept_upper INT4 NULL,

  dept_short1 TEXT NULL,
  dept_short2 TEXT NULL,
  dept_short3 TEXT NULL,
  dept_short4 TEXT NULL,
  dept_short5 TEXT NULL,
  dept_short6 TEXT NULL,
  dept_short7 TEXT NULL,
  dept_short TEXT NULL,

  dept_full1 TEXT NULL,
  dept_full2 TEXT NULL,
  dept_full3 TEXT NULL,
  dept_full4 TEXT NULL,
  dept_full5 TEXT NULL,
  dept_full6 TEXT NULL,
  dept_full7 TEXT NULL,
  dept_full TEXT NULL,

  cost_center_code BPCHAR(20) NULL,
  cost_center_name TEXT NULL,

  pea_code VARCHAR(6) NULL,
  business_place VARCHAR(4) NULL,
  business_area VARCHAR(4) NULL,

  resource_code BPCHAR(5) NULL,
  resource_name TEXT NULL,

  tax_branch VARCHAR(30) NULL,

  is_active BIT(1) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by BPCHAR(20) NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by BPCHAR(20) NOT NULL,
  is_deleted BIT(1) NULL DEFAULT B'0',

  dept_stable_code TEXT NULL,
  dept_sap_short TEXT NULL,
  dept_sap_full TEXT NULL,

  dept_full_eng1 TEXT NULL,
  dept_full_eng2 TEXT NULL,
  dept_full_eng3 TEXT NULL,
  dept_full_eng4 TEXT NULL,
  dept_full_eng5 TEXT NULL,
  dept_full_eng6 TEXT NULL,
  dept_full_eng7 TEXT NULL,

  dept_order BPCHAR(10) NULL,
  flg_delimit BPCHAR(5) NULL,
  delimit_effectivedt TIMESTAMP(3) NULL,
  gsber_cctr TEXT NULL,

  dept_lev2 INT4 NULL,
  dept_lev3 INT4 NULL,
  seq INT4 NULL,

  location TEXT NULL,

  office_id INT NOT NULL,

  CONSTRAINT departments_dept_sap_key UNIQUE (dept_sap),
  CONSTRAINT departments_office_id_fkey
    FOREIGN KEY (office_id) REFERENCES public.offices(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);

-- Indexes 
CREATE INDEX idx_departments_dept_sap ON public.departments USING btree (dept_sap);
CREATE INDEX idx_departments_dept_upper ON public.departments USING btree (dept_upper);
CREATE INDEX idx_departments_pea_null ON public.departments USING btree (pea_code) WHERE (pea_code IS NULL);
CREATE INDEX idx_departments_resource_code ON public.departments USING btree (resource_code);
CREATE INDEX idx_departments_office_id ON public.departments USING btree (office_id);

COMMENT ON TABLE public.departments IS 'กองงาน';

CREATE TABLE public.institutions (
  id SERIAL PRIMARY KEY,
  institutions_type public.institutions_types,
  name VARCHAR(200) NOT NULL UNIQUE,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);
COMMENT ON TABLE public.institutions IS 'เก็บรายชื่อสถาบัน';

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
  faculty VARCHAR,
  major VARCHAR,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  is_active BOOLEAN,
  student_note TEXT,
  internship_status public.internship_status_enum NOT NULL,
  status_note TEXT,
  
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,
  FOREIGN KEY (institution_id) REFERENCES public.institutions(id)
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

CREATE TABLE verifications (
  id SERIAL PRIMARY KEY,
  identifier TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  type TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
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
  office_id INT NOT NULL,
  department_id INT NOT NULL,
  location VARCHAR(255),
  position_count INT,
  major VARCHAR(255),

  recruit_start TIMESTAMP, 
  recruit_end TIMESTAMP,
  -- ระยะเวลาเปิดรับสมัคร

  apply_start TIMESTAMP,
  apply_end TIMESTAMP,
  -- ระยะเวลาการฝึกงาน

  resume_rq BOOLEAN NOT NULL DEFAULT FALSE,
  portfolio_rq BOOLEAN NOT NULL DEFAULT FALSE,
  job_details TEXT,
  requirement TEXT,
  benefits TEXT,
  recruitment_status public.recruitment_status_enum NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT internship_positions_office_id_fkey
    FOREIGN KEY (office_id) REFERENCES public.offices(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT,

  CONSTRAINT internship_positions_department_id_fkey
    FOREIGN KEY (department_id) REFERENCES public.departments(id)
    ON UPDATE CASCADE
    ON DELETE RESTRICT
);
-- indexes
CREATE INDEX idx_internship_positions_office_id
  ON public.internship_positions (office_id);
CREATE INDEX idx_internship_positions_department_id
  ON public.internship_positions (department_id);
CREATE INDEX idx_internship_positions_recruitment_status
  ON public.internship_positions (recruitment_status);

CREATE TABLE public.internship_position_mentors (
  id SERIAL PRIMARY KEY,
  position_id INT NOT NULL,
  mentor_staff_id INT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE (position_id, mentor_staff_id),

  CONSTRAINT internship_position_mentors_position_id_fkey
    FOREIGN KEY (position_id) REFERENCES public.internship_positions(id) ON DELETE CASCADE,

  CONSTRAINT internship_position_mentors_mentor_staff_id_fkey
    FOREIGN KEY (mentor_staff_id) REFERENCES public.staff_profiles(id) ON DELETE CASCADE
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

CREATE TABLE public.projects (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  is_finish BOOLEAN NOT NULL DEFAULT FALSE,
  project_owner VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT projects_project_owner_fkey
    FOREIGN KEY (project_owner) REFERENCES public.users(id)
);

CREATE TABLE public.intern_projects (
  id SERIAL PRIMARY KEY,
  project_id INT NOT NULL,
  user_id VARCHAR(50) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT intern_projects_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,

  CONSTRAINT intern_projects_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,

  CONSTRAINT intern_projects_unique
    UNIQUE (project_id, user_id)
);

CREATE TABLE public.daily_work_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL,
  project_id INT NOT NULL,
  work_date TIMESTAMP NOT NULL,
  content TEXT, 
  mentor_comment TEXT,
  is_approve BOOLEAN NOT NULL DEFAULT FALSE,
  approve_by INT,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT daily_work_logs_user_id_fkey
    FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE,

  CONSTRAINT daily_work_logs_project_id_fkey
    FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE,

  CONSTRAINT daily_work_logs_approve_by_fkey
    FOREIGN KEY (approve_by) REFERENCES public.staff_profiles(id)
);
