-- ==========================================
-- SMART CAMPUS PRINTING MANAGEMENT SYSTEM
-- Oracle 21c DDL Script
-- ==========================================

-- I. Core Identity Tables [cite: 235]
CREATE TABLE APP_USER (
    User_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    first_name VARCHAR2(50) NOT NULL,
    last_name VARCHAR2(50) NOT NULL,
    EMail VARCHAR2(100) UNIQUE NOT NULL,
    Password_Hash VARCHAR2(255) NOT NULL,
    Active_session NUMBER(1) DEFAULT 0, -- Oracle Boolean Workaround [cite: 243]
    last_login_timestamp TIMESTAMP
);

CREATE TABLE ADMIN (
    User_ID NUMBER PRIMARY KEY,
    CONSTRAINT fk_admin_user FOREIGN KEY (User_ID) REFERENCES APP_USER(User_ID) ON DELETE CASCADE
);

CREATE TABLE NORMAL_USER (
    User_ID NUMBER PRIMARY KEY,
    Account_balance NUMBER(10, 2) DEFAULT 0.00,
    CONSTRAINT fk_normal_user FOREIGN KEY (User_ID) REFERENCES APP_USER(User_ID) ON DELETE CASCADE
);

CREATE TABLE STUDENT (
    User_ID NUMBER PRIMARY KEY,
    Major VARCHAR2(100),
    Student_Batch VARCHAR2(10),
    CONSTRAINT fk_student_user FOREIGN KEY (User_ID) REFERENCES NORMAL_USER(User_ID) ON DELETE CASCADE
);

CREATE TABLE FACULTY (
    User_ID NUMBER PRIMARY KEY,
    Department VARCHAR2(100),
    Faculty_Rank VARCHAR2(50),
    CONSTRAINT fk_faculty_user FOREIGN KEY (User_ID) REFERENCES NORMAL_USER(User_ID) ON DELETE CASCADE
);

-- II. Hardware & Logistics Tables [cite: 295]
-- Created before operational tables to allow FK references
CREATE TABLE KIOSK (
    Kiosk_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    location_name VARCHAR2(100) NOT NULL,
    status VARCHAR2(20),
    current_load NUMBER DEFAULT 0
);

CREATE TABLE COLLECTION_BINS (
    Kiosk_ID NUMBER,
    Bin_ID VARCHAR2(10),
    max_page_capacity NUMBER NOT NULL,
    bin_status VARCHAR2(20),
    PRIMARY KEY (Kiosk_ID, Bin_ID),
    CONSTRAINT fk_bin_kiosk FOREIGN KEY (Kiosk_ID) REFERENCES KIOSK(Kiosk_ID) ON DELETE CASCADE
);

-- III. Operational & Transactional Tables [cite: 267]
CREATE TABLE PRINT_JOB (
    Job_Id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Document VARCHAR2(255) NOT NULL,
    Submission_Time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Completion_Time TIMESTAMP,
    Page_count NUMBER NOT NULL,
    QR_Secure_Token VARCHAR2(100) UNIQUE,
    Priority_level NUMBER DEFAULT 1,
    job_type VARCHAR2(20),
    scheduled_time TIMESTAMP
);

CREATE TABLE JOB_STATUS (
    Status_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Status_Name VARCHAR2(50) NOT NULL,
    Description VARCHAR2(4000)
);

CREATE TABLE FINANCIAL_TRANSACTION (
    Transaction_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Amount NUMBER(10, 2) NOT NULL,
    Transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE PRICE_RATE (
    Policy_ID NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Job_type VARCHAR2(20),
    Rate_per_page NUMBER(5, 2)
);

-- IV. Security & Accountability Logs [cite: 311]
CREATE TABLE AUDIT_LOG (
    Log_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Action_type VARCHAR2(50),
    Entity_Name VARCHAR2(50),
    Entity_ID NUMBER,
    old_value VARCHAR2(4000),
    new_value VARCHAR2(4000),
    action_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    User_ID NUMBER,
    CONSTRAINT fk_audit_user FOREIGN KEY (User_ID) REFERENCES APP_USER(User_ID)
);

CREATE TABLE ACCESS_LOG (
    Access_id NUMBER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    Login_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    Logout_timestamp TIMESTAMP,
    Login_source VARCHAR2(50),
    IP_address VARCHAR2(45),
    User_ID NUMBER,
    CONSTRAINT fk_access_user FOREIGN KEY (User_ID) REFERENCES APP_USER(User_ID)
);

-- V. Relationship Relations (Associative Tables) [cite: 333]
CREATE TABLE SUBMITS (
    User_ID NUMBER,
    Job_Id NUMBER,
    PRIMARY KEY (User_ID, Job_Id),
    CONSTRAINT fk_submits_user FOREIGN KEY (User_ID) REFERENCES APP_USER(User_ID),
    CONSTRAINT fk_submits_job FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id)
);

CREATE TABLE PLACED_IN (
    Job_Id NUMBER,
    Kiosk_ID NUMBER,
    Bin_ID VARCHAR2(10),
    PRIMARY KEY (Job_Id),
    CONSTRAINT fk_placed_job FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id),
    CONSTRAINT fk_placed_bin FOREIGN KEY (Kiosk_ID, Bin_ID) REFERENCES COLLECTION_BINS(Kiosk_ID, Bin_ID)
);

CREATE TABLE HAS_STATUS (
    Job_Id NUMBER,
    Status_ID NUMBER,
    PRIMARY KEY (Job_Id, Status_ID),
    CONSTRAINT fk_has_status_job FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id),
    CONSTRAINT fk_has_status_status FOREIGN KEY (Status_ID) REFERENCES JOB_STATUS(Status_ID)
);

CREATE TABLE GOVERNED_BY (
    Job_Id NUMBER,
    Policy_ID NUMBER,
    PRIMARY KEY (Job_Id, Policy_ID),
    CONSTRAINT fk_gov_job FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id),
    CONSTRAINT fk_gov_policy FOREIGN KEY (Policy_ID) REFERENCES PRICE_RATE(Policy_ID)
);

CREATE TABLE GENERATES (
    Job_Id NUMBER,
    Transaction_ID NUMBER,
    PRIMARY KEY (Job_Id, Transaction_ID),
    CONSTRAINT fk_gen_job FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id),
    CONSTRAINT fk_gen_trans FOREIGN KEY (Transaction_ID) REFERENCES FINANCIAL_TRANSACTION(Transaction_ID)
);

-- Note: Claude suggested to remove these since FK is already in the log tables, and creating these would bring circular redundancy.
-- CREATE TABLE LOGS_ACTION (
--     User_ID NUMBER,
--     Log_id NUMBER,
--     PRIMARY KEY (User_ID, Log_id),
--     CONSTRAINT fk_logs_user FOREIGN KEY (User_ID) REFERENCES APP_USER(User_ID),
--     CONSTRAINT fk_logs_audit FOREIGN KEY (Log_id) REFERENCES AUDIT_LOG(Log_id)
-- );

-- CREATE TABLE TRACKS_ACCESS (
--     User_ID NUMBER,
--     Access_id NUMBER,
--     PRIMARY KEY (User_ID, Access_id),
--     CONSTRAINT fk_tracks_user FOREIGN KEY (User_ID) REFERENCES APP_USER(User_ID),
--     CONSTRAINT fk_tracks_access FOREIGN KEY (Access_id) REFERENCES ACCESS_LOG(Access_id)
-- );

-- ==========================================
-- DATABASE INDEXING STRATEGIES [cite: 385]
-- ==========================================

-- I. Core Identity & Specialization Indices [cite: 388]
CREATE INDEX idx_user_name ON APP_USER (first_name, last_name);
CREATE INDEX idx_student_major ON STUDENT (Major);
CREATE INDEX idx_faculty_dept ON FACULTY (Department);

-- II. Operational & Queue Management Indices [cite: 395]
CREATE INDEX idx_job_qr_token ON PRINT_JOB (QR_Secure_Token);
CREATE INDEX idx_job_submission_time ON PRINT_JOB (Submission_Time);

-- III. Financial & Transactional Indices [cite: 407]
CREATE INDEX idx_trans_date ON FINANCIAL_TRANSACTION (Transaction_date);

-- IV. Security, Hardware, & Accountability Logs [cite: 413]
CREATE INDEX idx_audit_timestamp ON AUDIT_LOG (action_timestamp);
CREATE INDEX idx_audit_user_fk ON AUDIT_LOG (User_ID);
CREATE INDEX idx_access_user_fk ON ACCESS_LOG (User_ID);
CREATE INDEX idx_access_login_time ON ACCESS_LOG (Login_timestamp);
CREATE INDEX idx_kiosk_location ON KIOSK (location_name);

-- V. Claude suggested the following indexes to remove lock issues
CREATE INDEX idx_submits_job ON SUBMITS (Job_Id);
CREATE INDEX idx_placed_kiosk_bin ON PLACED_IN (Kiosk_ID, Bin_ID);
CREATE INDEX idx_has_status_status ON HAS_STATUS (Status_ID);
CREATE INDEX idx_generates_trans ON GENERATES (Transaction_ID);
CREATE INDEX idx_governed_policy ON GOVERNED_BY (Policy_ID);

-- Commit Transaction
COMMIT;