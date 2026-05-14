--------------------------------------------------------
--  File created - Tuesday-May-12-2026   
--------------------------------------------------------
--------------------------------------------------------
--  DDL for Table ACCESS_LOG
--------------------------------------------------------

  CREATE TABLE "ACCESS_LOG" 
   (	"ACCESS_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"LOGIN_TIMESTAMP" TIMESTAMP (6) DEFAULT CURRENT_TIMESTAMP, 
	"LOGOUT_TIMESTAMP" TIMESTAMP (6), 
	"LOGIN_SOURCE" VARCHAR2(50 BYTE), 
	"IP_ADDRESS" VARCHAR2(45 BYTE), 
	"USER_ID" NUMBER
   ) ;
--------------------------------------------------------
--  DDL for Table ADMIN
--------------------------------------------------------

  CREATE TABLE "ADMIN" 
   (	"USER_ID" NUMBER
   ) ;
--------------------------------------------------------
--  DDL for Table APP_USER
--------------------------------------------------------

  CREATE TABLE "APP_USER" 
   (	"USER_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"FIRST_NAME" VARCHAR2(50 BYTE), 
	"LAST_NAME" VARCHAR2(50 BYTE), 
	"EMAIL" VARCHAR2(100 BYTE), 
	"PASSWORD_HASH" VARCHAR2(255 BYTE), 
	"ACTIVE_SESSION" NUMBER(1,0) DEFAULT 0, 
	"LAST_LOGIN_TIMESTAMP" TIMESTAMP (6), 
	"PROFILE_PICTURE" VARCHAR2(255 BYTE), 
	"PASSWORD_RESET_TOKEN" VARCHAR2(255 BYTE), 
	"PASSWORD_RESET_EXPIRES" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table AUDIT_LOG
--------------------------------------------------------

  CREATE TABLE "AUDIT_LOG" 
   (	"LOG_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"ACTION_TYPE" VARCHAR2(50 BYTE), 
	"ENTITY_NAME" VARCHAR2(50 BYTE), 
	"ENTITY_ID" NUMBER, 
	"OLD_VALUE" VARCHAR2(4000 BYTE), 
	"NEW_VALUE" VARCHAR2(4000 BYTE), 
	"ACTION_TIMESTAMP" TIMESTAMP (6) DEFAULT CURRENT_TIMESTAMP, 
	"USER_ID" NUMBER
   ) ;
--------------------------------------------------------
--  DDL for Table COLLECTION_BINS
--------------------------------------------------------

  CREATE TABLE "COLLECTION_BINS" 
   (	"KIOSK_ID" NUMBER, 
	"BIN_ID" VARCHAR2(10 BYTE), 
	"MAX_PAGE_CAPACITY" NUMBER, 
	"BIN_STATUS" VARCHAR2(20 BYTE)
   ) ;
--------------------------------------------------------
--  DDL for Table FACULTY
--------------------------------------------------------

  CREATE TABLE "FACULTY" 
   (	"USER_ID" NUMBER, 
	"DEPARTMENT" VARCHAR2(100 BYTE), 
	"FACULTY_RANK" VARCHAR2(50 BYTE)
   ) ;
--------------------------------------------------------
--  DDL for Table FINANCIAL_TRANSACTION
--------------------------------------------------------

  CREATE TABLE "FINANCIAL_TRANSACTION" 
   (	"TRANSACTION_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"AMOUNT" NUMBER(10,2), 
	"TRANSACTION_DATE" TIMESTAMP (6) DEFAULT CURRENT_TIMESTAMP, 
	"USER_ID" NUMBER, 
	"TRANSACTION_TYPE" VARCHAR2(20 BYTE) DEFAULT 'deduction', 
	"BALANCE_AFTER" NUMBER(10,2)
   ) ;
--------------------------------------------------------
--  DDL for Table GENERATES
--------------------------------------------------------

  CREATE TABLE "GENERATES" 
   (	"JOB_ID" NUMBER, 
	"TRANSACTION_ID" NUMBER
   ) ;
--------------------------------------------------------
--  DDL for Table GOVERNED_BY
--------------------------------------------------------

  CREATE TABLE "GOVERNED_BY" 
   (	"JOB_ID" NUMBER, 
	"POLICY_ID" NUMBER
   ) ;
--------------------------------------------------------
--  DDL for Table HAS_STATUS
--------------------------------------------------------

  CREATE TABLE "HAS_STATUS" 
   (	"JOB_ID" NUMBER, 
	"STATUS_ID" NUMBER
   ) ;
--------------------------------------------------------
--  DDL for Table JOB_STATUS
--------------------------------------------------------

  CREATE TABLE "JOB_STATUS" 
   (	"STATUS_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"STATUS_NAME" VARCHAR2(50 BYTE), 
	"DESCRIPTION" VARCHAR2(4000 BYTE)
   ) ;
--------------------------------------------------------
--  DDL for Table KIOSK
--------------------------------------------------------

  CREATE TABLE "KIOSK" 
   (	"KIOSK_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"LOCATION_NAME" VARCHAR2(100 BYTE), 
	"STATUS" VARCHAR2(20 BYTE), 
	"CURRENT_LOAD" NUMBER DEFAULT 0
   ) ;
--------------------------------------------------------
--  DDL for Table NORMAL_USER
--------------------------------------------------------

  CREATE TABLE "NORMAL_USER" 
   (	"USER_ID" NUMBER, 
	"ACCOUNT_BALANCE" NUMBER(10,2) DEFAULT 0.00
   ) ;
--------------------------------------------------------
--  DDL for Table NOTIFICATION
--------------------------------------------------------

  CREATE TABLE "NOTIFICATION" 
   (	"NOTIFICATION_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"USER_ID" NUMBER, 
	"TITLE" VARCHAR2(100 BYTE), 
	"MESSAGE" VARCHAR2(500 BYTE), 
	"IS_READ" NUMBER(1,0) DEFAULT 0, 
	"NOTIFICATION_TYPE" VARCHAR2(50 BYTE), 
	"RELATED_JOB_ID" NUMBER, 
	"CREATED_AT" TIMESTAMP (6) DEFAULT CURRENT_TIMESTAMP
   ) ;
--------------------------------------------------------
--  DDL for Table OPERATOR
--------------------------------------------------------

  CREATE TABLE "OPERATOR" 
   (	"USER_ID" NUMBER, 
	"ASSIGNED_KIOSK" NUMBER
   ) ;
--------------------------------------------------------
--  DDL for Table PLACED_IN
--------------------------------------------------------

  CREATE TABLE "PLACED_IN" 
   (	"JOB_ID" NUMBER, 
	"KIOSK_ID" NUMBER, 
	"BIN_ID" VARCHAR2(10 BYTE)
   ) ;
--------------------------------------------------------
--  DDL for Table PRICE_RATE
--------------------------------------------------------

  CREATE TABLE "PRICE_RATE" 
   (	"POLICY_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"JOB_TYPE" VARCHAR2(20 BYTE), 
	"RATE_PER_PAGE" NUMBER(5,2)
   ) ;
--------------------------------------------------------
--  DDL for Table PRINT_JOB
--------------------------------------------------------

  CREATE TABLE "PRINT_JOB" 
   (	"JOB_ID" NUMBER GENERATED ALWAYS AS IDENTITY MINVALUE 1 MAXVALUE 9999999999999999999999999999 INCREMENT BY 1 START WITH 1 CACHE 20 NOORDER  NOCYCLE  NOKEEP  NOSCALE , 
	"DOCUMENT" VARCHAR2(255 BYTE), 
	"SUBMISSION_TIME" TIMESTAMP (6) DEFAULT CURRENT_TIMESTAMP, 
	"COMPLETION_TIME" TIMESTAMP (6), 
	"PAGE_COUNT" NUMBER, 
	"QR_SECURE_TOKEN" VARCHAR2(100 BYTE), 
	"PRIORITY_LEVEL" NUMBER DEFAULT 1, 
	"JOB_TYPE" VARCHAR2(20 BYTE), 
	"SCHEDULED_TIME" TIMESTAMP (6), 
	"DESCRIPTION" VARCHAR2(255 BYTE), 
	"COPIES" NUMBER DEFAULT 1, 
	"PRINT_MODE" VARCHAR2(20 BYTE) DEFAULT 'bw', 
	"PRINT_SIDE" VARCHAR2(20 BYTE) DEFAULT 'single', 
	"COLLECTION_SLOT" TIMESTAMP (6), 
	"PRICE_PER_PAGE" NUMBER(6,2), 
	"TOTAL_COST" NUMBER(8,2), 
	"EXPIRY_TIME" TIMESTAMP (6)
   ) ;
--------------------------------------------------------
--  DDL for Table STUDENT
--------------------------------------------------------

  CREATE TABLE "STUDENT" 
   (	"USER_ID" NUMBER, 
	"MAJOR" VARCHAR2(100 BYTE), 
	"STUDENT_BATCH" VARCHAR2(10 BYTE)
   ) ;
--------------------------------------------------------
--  DDL for Table SUBMITS
--------------------------------------------------------

  CREATE TABLE "SUBMITS" 
   (	"USER_ID" NUMBER, 
	"JOB_ID" NUMBER
   ) ;
REM INSERTING into ACCESS_LOG
SET DEFINE OFF;
REM INSERTING into ADMIN
SET DEFINE OFF;
Insert into ADMIN (USER_ID) values (42);
REM INSERTING into APP_USER
SET DEFINE OFF;
Insert into APP_USER (USER_ID,FIRST_NAME,LAST_NAME,EMAIL,PASSWORD_HASH,ACTIVE_SESSION,LAST_LOGIN_TIMESTAMP,PROFILE_PICTURE,PASSWORD_RESET_TOKEN,PASSWORD_RESET_EXPIRES) values (21,'Mujtaba','Rao','kratos@test.com','$2b$10$4zJ3Jt4tmUM2Uncwd/vhx.wEiB3yPJMAKkoypQYKEfa4I1KsbPQ5C',1,to_timestamp('11-MAY-26 09.05.33.029652000','DD-MON-RR HH24.MI.SSXFF'),null,null,null);
Insert into APP_USER (USER_ID,FIRST_NAME,LAST_NAME,EMAIL,PASSWORD_HASH,ACTIVE_SESSION,LAST_LOGIN_TIMESTAMP,PROFILE_PICTURE,PASSWORD_RESET_TOKEN,PASSWORD_RESET_EXPIRES) values (2,'Ahmed','Qazi','ahmed@test.com','$2b$10$AgRxHd5lzGQvu7slXvGwF.FRBYlAth24HgyAp6.CkTsaqp5TWrEQC',1,to_timestamp('10-MAY-26 12.01.27.175416000','DD-MON-RR HH24.MI.SSXFF'),null,null,null);
Insert into APP_USER (USER_ID,FIRST_NAME,LAST_NAME,EMAIL,PASSWORD_HASH,ACTIVE_SESSION,LAST_LOGIN_TIMESTAMP,PROFILE_PICTURE,PASSWORD_RESET_TOKEN,PASSWORD_RESET_EXPIRES) values (42,'Admin','User','admin@test.com','$2b$10$AZDZ7YoCR5CXuij1ePdsgumnt8Ku1mXs0I8LfmQwM2UAtKsc3PjVy',1,to_timestamp('10-MAY-26 20.20.28.172485000','DD-MON-RR HH24.MI.SSXFF'),null,null,null);
REM INSERTING into AUDIT_LOG
SET DEFINE OFF;
REM INSERTING into COLLECTION_BINS
SET DEFINE OFF;
REM INSERTING into FACULTY
SET DEFINE OFF;
REM INSERTING into FINANCIAL_TRANSACTION
SET DEFINE OFF;
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (24,50,to_timestamp('10-MAY-26 10.24.01.618675000','DD-MON-RR HH24.MI.SSXFF'),2,'topup',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (25,1.5,to_timestamp('10-MAY-26 10.47.46.286071000','DD-MON-RR HH24.MI.SSXFF'),2,'deduction',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (26,4,to_timestamp('10-MAY-26 12.02.08.998349000','DD-MON-RR HH24.MI.SSXFF'),2,'deduction',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (27,4.5,to_timestamp('10-MAY-26 12.02.23.045288000','DD-MON-RR HH24.MI.SSXFF'),2,'topup',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (21,6,to_timestamp('08-MAY-26 22.05.46.585093000','DD-MON-RR HH24.MI.SSXFF'),null,'deduction',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (43,2,to_timestamp('10-MAY-26 20.13.14.472006000','DD-MON-RR HH24.MI.SSXFF'),21,'deduction',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (1,2,to_timestamp('08-MAY-26 18.52.36.547154000','DD-MON-RR HH24.MI.SSXFF'),null,'deduction',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (44,2,to_timestamp('10-MAY-26 20.19.09.218193000','DD-MON-RR HH24.MI.SSXFF'),21,'topup',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (45,2,to_timestamp('10-MAY-26 20.19.42.226275000','DD-MON-RR HH24.MI.SSXFF'),21,'deduction',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (22,2,to_timestamp('10-MAY-26 09.27.40.094886000','DD-MON-RR HH24.MI.SSXFF'),null,'deduction',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (23,100,to_timestamp('10-MAY-26 10.12.05.632252000','DD-MON-RR HH24.MI.SSXFF'),2,'topup',null);
Insert into FINANCIAL_TRANSACTION (TRANSACTION_ID,AMOUNT,TRANSACTION_DATE,USER_ID,TRANSACTION_TYPE,BALANCE_AFTER) values (42,6,to_timestamp('10-MAY-26 20.12.56.578754000','DD-MON-RR HH24.MI.SSXFF'),21,'topup',null);
REM INSERTING into GENERATES
SET DEFINE OFF;
Insert into GENERATES (JOB_ID,TRANSACTION_ID) values (2,1);
Insert into GENERATES (JOB_ID,TRANSACTION_ID) values (21,21);
Insert into GENERATES (JOB_ID,TRANSACTION_ID) values (22,22);
Insert into GENERATES (JOB_ID,TRANSACTION_ID) values (23,25);
Insert into GENERATES (JOB_ID,TRANSACTION_ID) values (42,26);
Insert into GENERATES (JOB_ID,TRANSACTION_ID) values (62,43);
Insert into GENERATES (JOB_ID,TRANSACTION_ID) values (63,45);
REM INSERTING into GOVERNED_BY
SET DEFINE OFF;
REM INSERTING into HAS_STATUS
SET DEFINE OFF;
Insert into HAS_STATUS (JOB_ID,STATUS_ID) values (2,1);
Insert into HAS_STATUS (JOB_ID,STATUS_ID) values (21,4);
Insert into HAS_STATUS (JOB_ID,STATUS_ID) values (22,1);
Insert into HAS_STATUS (JOB_ID,STATUS_ID) values (23,1);
Insert into HAS_STATUS (JOB_ID,STATUS_ID) values (42,4);
Insert into HAS_STATUS (JOB_ID,STATUS_ID) values (62,1);
Insert into HAS_STATUS (JOB_ID,STATUS_ID) values (63,1);
REM INSERTING into JOB_STATUS
SET DEFINE OFF;
Insert into JOB_STATUS (STATUS_ID,STATUS_NAME,DESCRIPTION) values (1,'Pending','Job is queued');
Insert into JOB_STATUS (STATUS_ID,STATUS_NAME,DESCRIPTION) values (2,'Printing','Job is being printed');
Insert into JOB_STATUS (STATUS_ID,STATUS_NAME,DESCRIPTION) values (3,'Binned','Job is ready for collection');
Insert into JOB_STATUS (STATUS_ID,STATUS_NAME,DESCRIPTION) values (4,'Collected','Job has been collected');
Insert into JOB_STATUS (STATUS_ID,STATUS_NAME,DESCRIPTION) values (5,'Discarded','Job was not collected in time');
REM INSERTING into KIOSK
SET DEFINE OFF;
REM INSERTING into NORMAL_USER
SET DEFINE OFF;
Insert into NORMAL_USER (USER_ID,ACCOUNT_BALANCE) values (21,98);
Insert into NORMAL_USER (USER_ID,ACCOUNT_BALANCE) values (2,545);
REM INSERTING into NOTIFICATION
SET DEFINE OFF;
REM INSERTING into OPERATOR
SET DEFINE OFF;
REM INSERTING into PLACED_IN
SET DEFINE OFF;
Insert into PLACED_IN (JOB_ID,KIOSK_ID,BIN_ID) values (42,null,null);
Insert into PLACED_IN (JOB_ID,KIOSK_ID,BIN_ID) values (21,null,null);
REM INSERTING into PRICE_RATE
SET DEFINE OFF;
Insert into PRICE_RATE (POLICY_ID,JOB_TYPE,RATE_PER_PAGE) values (21,'normal',7);
Insert into PRICE_RATE (POLICY_ID,JOB_TYPE,RATE_PER_PAGE) values (22,'bulk',5);
REM INSERTING into PRINT_JOB
SET DEFINE OFF;
Insert into PRINT_JOB (JOB_ID,DOCUMENT,SUBMISSION_TIME,COMPLETION_TIME,PAGE_COUNT,QR_SECURE_TOKEN,PRIORITY_LEVEL,JOB_TYPE,SCHEDULED_TIME,DESCRIPTION,COPIES,PRINT_MODE,PRINT_SIDE,COLLECTION_SLOT,PRICE_PER_PAGE,TOTAL_COST,EXPIRY_TIME) values (23,'uploads/file-1778392066158-93349827.pdf',to_timestamp('10-MAY-26 10.47.46.270409000','DD-MON-RR HH24.MI.SSXFF'),null,1,'b048bb26-d960-4b33-9a6e-ae7272487586',1,'bulk',null,null,1,'bw','single',null,null,null,null);
Insert into PRINT_JOB (JOB_ID,DOCUMENT,SUBMISSION_TIME,COMPLETION_TIME,PAGE_COUNT,QR_SECURE_TOKEN,PRIORITY_LEVEL,JOB_TYPE,SCHEDULED_TIME,DESCRIPTION,COPIES,PRINT_MODE,PRINT_SIDE,COLLECTION_SLOT,PRICE_PER_PAGE,TOTAL_COST,EXPIRY_TIME) values (42,'uploads/file-1778396528850-605437386.pdf',to_timestamp('10-MAY-26 12.02.08.971556000','DD-MON-RR HH24.MI.SSXFF'),to_timestamp('10-MAY-26 12.29.34.084501000','DD-MON-RR HH24.MI.SSXFF'),2,'b40f7a13-cba6-4dd4-a142-b0d681d9c19d',1,'normal',null,null,1,'bw','single',null,null,null,null);
Insert into PRINT_JOB (JOB_ID,DOCUMENT,SUBMISSION_TIME,COMPLETION_TIME,PAGE_COUNT,QR_SECURE_TOKEN,PRIORITY_LEVEL,JOB_TYPE,SCHEDULED_TIME,DESCRIPTION,COPIES,PRINT_MODE,PRINT_SIDE,COLLECTION_SLOT,PRICE_PER_PAGE,TOTAL_COST,EXPIRY_TIME) values (21,'uploads/file-1778259946290-144380605.pdf',to_timestamp('08-MAY-26 22.05.46.550782000','DD-MON-RR HH24.MI.SSXFF'),to_timestamp('10-MAY-26 20.22.11.324979000','DD-MON-RR HH24.MI.SSXFF'),3,'6d47fef2-3bcb-401b-9f5e-c95ea5f23c7a',1,'normal',null,null,1,'bw','single',null,null,null,null);
Insert into PRINT_JOB (JOB_ID,DOCUMENT,SUBMISSION_TIME,COMPLETION_TIME,PAGE_COUNT,QR_SECURE_TOKEN,PRIORITY_LEVEL,JOB_TYPE,SCHEDULED_TIME,DESCRIPTION,COPIES,PRINT_MODE,PRINT_SIDE,COLLECTION_SLOT,PRICE_PER_PAGE,TOTAL_COST,EXPIRY_TIME) values (62,'uploads/file-1778425994367-926167148.pdf',to_timestamp('10-MAY-26 20.13.14.455523000','DD-MON-RR HH24.MI.SSXFF'),null,1,'c24732b5-274b-482c-932e-36c69567293a',1,'normal',null,null,1,'bw','single',null,null,null,null);
Insert into PRINT_JOB (JOB_ID,DOCUMENT,SUBMISSION_TIME,COMPLETION_TIME,PAGE_COUNT,QR_SECURE_TOKEN,PRIORITY_LEVEL,JOB_TYPE,SCHEDULED_TIME,DESCRIPTION,COPIES,PRINT_MODE,PRINT_SIDE,COLLECTION_SLOT,PRICE_PER_PAGE,TOTAL_COST,EXPIRY_TIME) values (2,'uploads/file-1778248356190-928518665.pdf',to_timestamp('08-MAY-26 18.52.36.522872000','DD-MON-RR HH24.MI.SSXFF'),null,1,'4f1406d1-7a77-4fa9-a0fd-e1bb319a91b8',1,'normal',null,null,1,'bw','single',null,null,null,null);
Insert into PRINT_JOB (JOB_ID,DOCUMENT,SUBMISSION_TIME,COMPLETION_TIME,PAGE_COUNT,QR_SECURE_TOKEN,PRIORITY_LEVEL,JOB_TYPE,SCHEDULED_TIME,DESCRIPTION,COPIES,PRINT_MODE,PRINT_SIDE,COLLECTION_SLOT,PRICE_PER_PAGE,TOTAL_COST,EXPIRY_TIME) values (63,'uploads/file-1778426382165-580281140.pdf',to_timestamp('10-MAY-26 20.19.42.224010000','DD-MON-RR HH24.MI.SSXFF'),null,1,'213260ec-9792-412c-a3d4-e18a54568b25',1,'normal',null,null,1,'bw','single',null,null,null,null);
Insert into PRINT_JOB (JOB_ID,DOCUMENT,SUBMISSION_TIME,COMPLETION_TIME,PAGE_COUNT,QR_SECURE_TOKEN,PRIORITY_LEVEL,JOB_TYPE,SCHEDULED_TIME,DESCRIPTION,COPIES,PRINT_MODE,PRINT_SIDE,COLLECTION_SLOT,PRICE_PER_PAGE,TOTAL_COST,EXPIRY_TIME) values (22,'uploads/file-1778387259886-942870544.pdf',to_timestamp('10-MAY-26 09.27.40.053018000','DD-MON-RR HH24.MI.SSXFF'),null,1,'ac287461-46f6-4972-aa76-eeefdd99b214',1,'normal',null,null,1,'bw','single',null,null,null,null);
REM INSERTING into STUDENT
SET DEFINE OFF;
Insert into STUDENT (USER_ID,MAJOR,STUDENT_BATCH) values (21,'Computer Systems','2024');
Insert into STUDENT (USER_ID,MAJOR,STUDENT_BATCH) values (2,'Computer Systems','2024');
REM INSERTING into SUBMITS
SET DEFINE OFF;
Insert into SUBMITS (USER_ID,JOB_ID) values (2,2);
Insert into SUBMITS (USER_ID,JOB_ID) values (2,22);
Insert into SUBMITS (USER_ID,JOB_ID) values (2,23);
Insert into SUBMITS (USER_ID,JOB_ID) values (2,42);
Insert into SUBMITS (USER_ID,JOB_ID) values (21,21);
Insert into SUBMITS (USER_ID,JOB_ID) values (21,62);
Insert into SUBMITS (USER_ID,JOB_ID) values (21,63);
--------------------------------------------------------
--  DDL for Index IDX_ACCESS_LOGIN_TIME
--------------------------------------------------------

  CREATE INDEX "IDX_ACCESS_LOGIN_TIME" ON "ACCESS_LOG" ("LOGIN_TIMESTAMP") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_ACCESS_USER_FK
--------------------------------------------------------

  CREATE INDEX "IDX_ACCESS_USER_FK" ON "ACCESS_LOG" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_AUDIT_TIMESTAMP
--------------------------------------------------------

  CREATE INDEX "IDX_AUDIT_TIMESTAMP" ON "AUDIT_LOG" ("ACTION_TIMESTAMP") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_AUDIT_USER_FK
--------------------------------------------------------

  CREATE INDEX "IDX_AUDIT_USER_FK" ON "AUDIT_LOG" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_FACULTY_DEPT
--------------------------------------------------------

  CREATE INDEX "IDX_FACULTY_DEPT" ON "FACULTY" ("DEPARTMENT") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_GENERATES_TRANS
--------------------------------------------------------

  CREATE INDEX "IDX_GENERATES_TRANS" ON "GENERATES" ("TRANSACTION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_GOVERNED_POLICY
--------------------------------------------------------

  CREATE INDEX "IDX_GOVERNED_POLICY" ON "GOVERNED_BY" ("POLICY_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_HAS_STATUS_STATUS
--------------------------------------------------------

  CREATE INDEX "IDX_HAS_STATUS_STATUS" ON "HAS_STATUS" ("STATUS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_JOB_SUBMISSION_TIME
--------------------------------------------------------

  CREATE INDEX "IDX_JOB_SUBMISSION_TIME" ON "PRINT_JOB" ("SUBMISSION_TIME") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_KIOSK_LOCATION
--------------------------------------------------------

  CREATE INDEX "IDX_KIOSK_LOCATION" ON "KIOSK" ("LOCATION_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_NOTIF_READ
--------------------------------------------------------

  CREATE INDEX "IDX_NOTIF_READ" ON "NOTIFICATION" ("USER_ID", "IS_READ") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_NOTIF_USER
--------------------------------------------------------

  CREATE INDEX "IDX_NOTIF_USER" ON "NOTIFICATION" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_PLACED_KIOSK_BIN
--------------------------------------------------------

  CREATE INDEX "IDX_PLACED_KIOSK_BIN" ON "PLACED_IN" ("KIOSK_ID", "BIN_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_STUDENT_MAJOR
--------------------------------------------------------

  CREATE INDEX "IDX_STUDENT_MAJOR" ON "STUDENT" ("MAJOR") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_SUBMITS_JOB
--------------------------------------------------------

  CREATE INDEX "IDX_SUBMITS_JOB" ON "SUBMITS" ("JOB_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_TRANS_DATE
--------------------------------------------------------

  CREATE INDEX "IDX_TRANS_DATE" ON "FINANCIAL_TRANSACTION" ("TRANSACTION_DATE") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_TRANS_USER
--------------------------------------------------------

  CREATE INDEX "IDX_TRANS_USER" ON "FINANCIAL_TRANSACTION" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_USER_NAME
--------------------------------------------------------

  CREATE INDEX "IDX_USER_NAME" ON "APP_USER" ("FIRST_NAME", "LAST_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008462
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008462" ON "APP_USER" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008463
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008463" ON "APP_USER" ("EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008464
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008464" ON "ADMIN" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008466
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008466" ON "NORMAL_USER" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008468
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008468" ON "STUDENT" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008470
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008470" ON "FACULTY" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008474
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008474" ON "KIOSK" ("KIOSK_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008476
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008476" ON "COLLECTION_BINS" ("KIOSK_ID", "BIN_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008481
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008481" ON "PRINT_JOB" ("JOB_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008482
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008482" ON "PRINT_JOB" ("QR_SECURE_TOKEN") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008485
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008485" ON "JOB_STATUS" ("STATUS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008488
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008488" ON "FINANCIAL_TRANSACTION" ("TRANSACTION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008490
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008490" ON "PRICE_RATE" ("POLICY_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008492
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008492" ON "AUDIT_LOG" ("LOG_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008495
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008495" ON "ACCESS_LOG" ("ACCESS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008497
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008497" ON "SUBMITS" ("USER_ID", "JOB_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008500
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008500" ON "PLACED_IN" ("JOB_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008503
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008503" ON "HAS_STATUS" ("JOB_ID", "STATUS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008506
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008506" ON "GOVERNED_BY" ("JOB_ID", "POLICY_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008509
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008509" ON "GENERATES" ("JOB_ID", "TRANSACTION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008520
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008520" ON "OPERATOR" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008527
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008527" ON "NOTIFICATION" ("NOTIFICATION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008495
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008495" ON "ACCESS_LOG" ("ACCESS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_ACCESS_USER_FK
--------------------------------------------------------

  CREATE INDEX "IDX_ACCESS_USER_FK" ON "ACCESS_LOG" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_ACCESS_LOGIN_TIME
--------------------------------------------------------

  CREATE INDEX "IDX_ACCESS_LOGIN_TIME" ON "ACCESS_LOG" ("LOGIN_TIMESTAMP") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008464
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008464" ON "ADMIN" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008462
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008462" ON "APP_USER" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008463
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008463" ON "APP_USER" ("EMAIL") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_USER_NAME
--------------------------------------------------------

  CREATE INDEX "IDX_USER_NAME" ON "APP_USER" ("FIRST_NAME", "LAST_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008492
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008492" ON "AUDIT_LOG" ("LOG_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_AUDIT_TIMESTAMP
--------------------------------------------------------

  CREATE INDEX "IDX_AUDIT_TIMESTAMP" ON "AUDIT_LOG" ("ACTION_TIMESTAMP") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_AUDIT_USER_FK
--------------------------------------------------------

  CREATE INDEX "IDX_AUDIT_USER_FK" ON "AUDIT_LOG" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008476
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008476" ON "COLLECTION_BINS" ("KIOSK_ID", "BIN_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008470
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008470" ON "FACULTY" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_FACULTY_DEPT
--------------------------------------------------------

  CREATE INDEX "IDX_FACULTY_DEPT" ON "FACULTY" ("DEPARTMENT") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_TRANS_USER
--------------------------------------------------------

  CREATE INDEX "IDX_TRANS_USER" ON "FINANCIAL_TRANSACTION" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008488
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008488" ON "FINANCIAL_TRANSACTION" ("TRANSACTION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_TRANS_DATE
--------------------------------------------------------

  CREATE INDEX "IDX_TRANS_DATE" ON "FINANCIAL_TRANSACTION" ("TRANSACTION_DATE") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008509
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008509" ON "GENERATES" ("JOB_ID", "TRANSACTION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_GENERATES_TRANS
--------------------------------------------------------

  CREATE INDEX "IDX_GENERATES_TRANS" ON "GENERATES" ("TRANSACTION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008506
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008506" ON "GOVERNED_BY" ("JOB_ID", "POLICY_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_GOVERNED_POLICY
--------------------------------------------------------

  CREATE INDEX "IDX_GOVERNED_POLICY" ON "GOVERNED_BY" ("POLICY_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008503
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008503" ON "HAS_STATUS" ("JOB_ID", "STATUS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_HAS_STATUS_STATUS
--------------------------------------------------------

  CREATE INDEX "IDX_HAS_STATUS_STATUS" ON "HAS_STATUS" ("STATUS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008485
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008485" ON "JOB_STATUS" ("STATUS_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008474
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008474" ON "KIOSK" ("KIOSK_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_KIOSK_LOCATION
--------------------------------------------------------

  CREATE INDEX "IDX_KIOSK_LOCATION" ON "KIOSK" ("LOCATION_NAME") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008466
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008466" ON "NORMAL_USER" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008527
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008527" ON "NOTIFICATION" ("NOTIFICATION_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_NOTIF_USER
--------------------------------------------------------

  CREATE INDEX "IDX_NOTIF_USER" ON "NOTIFICATION" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_NOTIF_READ
--------------------------------------------------------

  CREATE INDEX "IDX_NOTIF_READ" ON "NOTIFICATION" ("USER_ID", "IS_READ") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008520
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008520" ON "OPERATOR" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008500
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008500" ON "PLACED_IN" ("JOB_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_PLACED_KIOSK_BIN
--------------------------------------------------------

  CREATE INDEX "IDX_PLACED_KIOSK_BIN" ON "PLACED_IN" ("KIOSK_ID", "BIN_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008490
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008490" ON "PRICE_RATE" ("POLICY_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008481
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008481" ON "PRINT_JOB" ("JOB_ID") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008482
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008482" ON "PRINT_JOB" ("QR_SECURE_TOKEN") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_JOB_SUBMISSION_TIME
--------------------------------------------------------

  CREATE INDEX "IDX_JOB_SUBMISSION_TIME" ON "PRINT_JOB" ("SUBMISSION_TIME") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008468
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008468" ON "STUDENT" ("USER_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_STUDENT_MAJOR
--------------------------------------------------------

  CREATE INDEX "IDX_STUDENT_MAJOR" ON "STUDENT" ("MAJOR") 
  ;
--------------------------------------------------------
--  DDL for Index SYS_C008497
--------------------------------------------------------

  CREATE UNIQUE INDEX "SYS_C008497" ON "SUBMITS" ("USER_ID", "JOB_ID") 
  ;
--------------------------------------------------------
--  DDL for Index IDX_SUBMITS_JOB
--------------------------------------------------------

  CREATE INDEX "IDX_SUBMITS_JOB" ON "SUBMITS" ("JOB_ID") 
  ;
--------------------------------------------------------
--  Constraints for Table ACCESS_LOG
--------------------------------------------------------

  ALTER TABLE "ACCESS_LOG" MODIFY ("ACCESS_ID" NOT NULL ENABLE);
  ALTER TABLE "ACCESS_LOG" ADD PRIMARY KEY ("ACCESS_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table ADMIN
--------------------------------------------------------

  ALTER TABLE "ADMIN" ADD PRIMARY KEY ("USER_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table APP_USER
--------------------------------------------------------

  ALTER TABLE "APP_USER" MODIFY ("USER_ID" NOT NULL ENABLE);
  ALTER TABLE "APP_USER" MODIFY ("FIRST_NAME" NOT NULL ENABLE);
  ALTER TABLE "APP_USER" MODIFY ("LAST_NAME" NOT NULL ENABLE);
  ALTER TABLE "APP_USER" MODIFY ("EMAIL" NOT NULL ENABLE);
  ALTER TABLE "APP_USER" MODIFY ("PASSWORD_HASH" NOT NULL ENABLE);
  ALTER TABLE "APP_USER" ADD PRIMARY KEY ("USER_ID")
  USING INDEX  ENABLE;
  ALTER TABLE "APP_USER" ADD UNIQUE ("EMAIL")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table AUDIT_LOG
--------------------------------------------------------

  ALTER TABLE "AUDIT_LOG" MODIFY ("LOG_ID" NOT NULL ENABLE);
  ALTER TABLE "AUDIT_LOG" ADD PRIMARY KEY ("LOG_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table COLLECTION_BINS
--------------------------------------------------------

  ALTER TABLE "COLLECTION_BINS" MODIFY ("MAX_PAGE_CAPACITY" NOT NULL ENABLE);
  ALTER TABLE "COLLECTION_BINS" ADD PRIMARY KEY ("KIOSK_ID", "BIN_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table FACULTY
--------------------------------------------------------

  ALTER TABLE "FACULTY" ADD PRIMARY KEY ("USER_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table FINANCIAL_TRANSACTION
--------------------------------------------------------

  ALTER TABLE "FINANCIAL_TRANSACTION" MODIFY ("TRANSACTION_ID" NOT NULL ENABLE);
  ALTER TABLE "FINANCIAL_TRANSACTION" MODIFY ("AMOUNT" NOT NULL ENABLE);
  ALTER TABLE "FINANCIAL_TRANSACTION" ADD PRIMARY KEY ("TRANSACTION_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table GENERATES
--------------------------------------------------------

  ALTER TABLE "GENERATES" ADD PRIMARY KEY ("JOB_ID", "TRANSACTION_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table GOVERNED_BY
--------------------------------------------------------

  ALTER TABLE "GOVERNED_BY" ADD PRIMARY KEY ("JOB_ID", "POLICY_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table HAS_STATUS
--------------------------------------------------------

  ALTER TABLE "HAS_STATUS" ADD PRIMARY KEY ("JOB_ID", "STATUS_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table JOB_STATUS
--------------------------------------------------------

  ALTER TABLE "JOB_STATUS" MODIFY ("STATUS_ID" NOT NULL ENABLE);
  ALTER TABLE "JOB_STATUS" MODIFY ("STATUS_NAME" NOT NULL ENABLE);
  ALTER TABLE "JOB_STATUS" ADD PRIMARY KEY ("STATUS_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table KIOSK
--------------------------------------------------------

  ALTER TABLE "KIOSK" MODIFY ("KIOSK_ID" NOT NULL ENABLE);
  ALTER TABLE "KIOSK" MODIFY ("LOCATION_NAME" NOT NULL ENABLE);
  ALTER TABLE "KIOSK" ADD PRIMARY KEY ("KIOSK_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table NORMAL_USER
--------------------------------------------------------

  ALTER TABLE "NORMAL_USER" ADD PRIMARY KEY ("USER_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table NOTIFICATION
--------------------------------------------------------

  ALTER TABLE "NOTIFICATION" MODIFY ("NOTIFICATION_ID" NOT NULL ENABLE);
  ALTER TABLE "NOTIFICATION" MODIFY ("USER_ID" NOT NULL ENABLE);
  ALTER TABLE "NOTIFICATION" MODIFY ("TITLE" NOT NULL ENABLE);
  ALTER TABLE "NOTIFICATION" MODIFY ("MESSAGE" NOT NULL ENABLE);
  ALTER TABLE "NOTIFICATION" ADD PRIMARY KEY ("NOTIFICATION_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table OPERATOR
--------------------------------------------------------

  ALTER TABLE "OPERATOR" ADD PRIMARY KEY ("USER_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table PLACED_IN
--------------------------------------------------------

  ALTER TABLE "PLACED_IN" ADD PRIMARY KEY ("JOB_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table PRICE_RATE
--------------------------------------------------------

  ALTER TABLE "PRICE_RATE" MODIFY ("POLICY_ID" NOT NULL ENABLE);
  ALTER TABLE "PRICE_RATE" ADD PRIMARY KEY ("POLICY_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table PRINT_JOB
--------------------------------------------------------

  ALTER TABLE "PRINT_JOB" MODIFY ("JOB_ID" NOT NULL ENABLE);
  ALTER TABLE "PRINT_JOB" MODIFY ("DOCUMENT" NOT NULL ENABLE);
  ALTER TABLE "PRINT_JOB" MODIFY ("PAGE_COUNT" NOT NULL ENABLE);
  ALTER TABLE "PRINT_JOB" ADD PRIMARY KEY ("JOB_ID")
  USING INDEX  ENABLE;
  ALTER TABLE "PRINT_JOB" ADD UNIQUE ("QR_SECURE_TOKEN")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table STUDENT
--------------------------------------------------------

  ALTER TABLE "STUDENT" ADD PRIMARY KEY ("USER_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Constraints for Table SUBMITS
--------------------------------------------------------

  ALTER TABLE "SUBMITS" ADD PRIMARY KEY ("USER_ID", "JOB_ID")
  USING INDEX  ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table ACCESS_LOG
--------------------------------------------------------

  ALTER TABLE "ACCESS_LOG" ADD CONSTRAINT "FK_ACCESS_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table ADMIN
--------------------------------------------------------

  ALTER TABLE "ADMIN" ADD CONSTRAINT "FK_ADMIN_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ON DELETE CASCADE ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table AUDIT_LOG
--------------------------------------------------------

  ALTER TABLE "AUDIT_LOG" ADD CONSTRAINT "FK_AUDIT_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table COLLECTION_BINS
--------------------------------------------------------

  ALTER TABLE "COLLECTION_BINS" ADD CONSTRAINT "FK_BIN_KIOSK" FOREIGN KEY ("KIOSK_ID")
	  REFERENCES "KIOSK" ("KIOSK_ID") ON DELETE CASCADE ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table FACULTY
--------------------------------------------------------

  ALTER TABLE "FACULTY" ADD CONSTRAINT "FK_FACULTY_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "NORMAL_USER" ("USER_ID") ON DELETE CASCADE ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table FINANCIAL_TRANSACTION
--------------------------------------------------------

  ALTER TABLE "FINANCIAL_TRANSACTION" ADD CONSTRAINT "FK_TRANS_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table GENERATES
--------------------------------------------------------

  ALTER TABLE "GENERATES" ADD CONSTRAINT "FK_GEN_JOB" FOREIGN KEY ("JOB_ID")
	  REFERENCES "PRINT_JOB" ("JOB_ID") ENABLE;
  ALTER TABLE "GENERATES" ADD CONSTRAINT "FK_GEN_TRANS" FOREIGN KEY ("TRANSACTION_ID")
	  REFERENCES "FINANCIAL_TRANSACTION" ("TRANSACTION_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table GOVERNED_BY
--------------------------------------------------------

  ALTER TABLE "GOVERNED_BY" ADD CONSTRAINT "FK_GOV_JOB" FOREIGN KEY ("JOB_ID")
	  REFERENCES "PRINT_JOB" ("JOB_ID") ENABLE;
  ALTER TABLE "GOVERNED_BY" ADD CONSTRAINT "FK_GOV_POLICY" FOREIGN KEY ("POLICY_ID")
	  REFERENCES "PRICE_RATE" ("POLICY_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table HAS_STATUS
--------------------------------------------------------

  ALTER TABLE "HAS_STATUS" ADD CONSTRAINT "FK_HAS_STATUS_JOB" FOREIGN KEY ("JOB_ID")
	  REFERENCES "PRINT_JOB" ("JOB_ID") ENABLE;
  ALTER TABLE "HAS_STATUS" ADD CONSTRAINT "FK_HAS_STATUS_STATUS" FOREIGN KEY ("STATUS_ID")
	  REFERENCES "JOB_STATUS" ("STATUS_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table NORMAL_USER
--------------------------------------------------------

  ALTER TABLE "NORMAL_USER" ADD CONSTRAINT "FK_NORMAL_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ON DELETE CASCADE ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table NOTIFICATION
--------------------------------------------------------

  ALTER TABLE "NOTIFICATION" ADD CONSTRAINT "FK_NOTIF_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ON DELETE CASCADE ENABLE;
  ALTER TABLE "NOTIFICATION" ADD CONSTRAINT "FK_NOTIF_JOB" FOREIGN KEY ("RELATED_JOB_ID")
	  REFERENCES "PRINT_JOB" ("JOB_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table OPERATOR
--------------------------------------------------------

  ALTER TABLE "OPERATOR" ADD CONSTRAINT "FK_OPERATOR_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ON DELETE CASCADE ENABLE;
  ALTER TABLE "OPERATOR" ADD CONSTRAINT "FK_OPERATOR_KIOSK" FOREIGN KEY ("ASSIGNED_KIOSK")
	  REFERENCES "KIOSK" ("KIOSK_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table PLACED_IN
--------------------------------------------------------

  ALTER TABLE "PLACED_IN" ADD CONSTRAINT "FK_PLACED_JOB" FOREIGN KEY ("JOB_ID")
	  REFERENCES "PRINT_JOB" ("JOB_ID") ENABLE;
  ALTER TABLE "PLACED_IN" ADD CONSTRAINT "FK_PLACED_BIN" FOREIGN KEY ("KIOSK_ID", "BIN_ID")
	  REFERENCES "COLLECTION_BINS" ("KIOSK_ID", "BIN_ID") ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table STUDENT
--------------------------------------------------------

  ALTER TABLE "STUDENT" ADD CONSTRAINT "FK_STUDENT_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "NORMAL_USER" ("USER_ID") ON DELETE CASCADE ENABLE;
--------------------------------------------------------
--  Ref Constraints for Table SUBMITS
--------------------------------------------------------

  ALTER TABLE "SUBMITS" ADD CONSTRAINT "FK_SUBMITS_USER" FOREIGN KEY ("USER_ID")
	  REFERENCES "APP_USER" ("USER_ID") ENABLE;
  ALTER TABLE "SUBMITS" ADD CONSTRAINT "FK_SUBMITS_JOB" FOREIGN KEY ("JOB_ID")
	  REFERENCES "PRINT_JOB" ("JOB_ID") ENABLE;
