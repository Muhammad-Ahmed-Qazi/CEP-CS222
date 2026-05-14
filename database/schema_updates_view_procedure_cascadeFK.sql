CREATE OR REPLACE VIEW V_JOB_DETAILS AS
SELECT 
    pj.Job_Id,
    pj.Document,
    pj.description,
    pj.copies,
    pj.print_mode,
    pj.print_side,
    pj.Submission_Time,
    pj.Completion_Time,
    pj.collection_slot,
    pj.expiry_time,
    pj.Page_count,
    pj.QR_Secure_Token,
    pj.Priority_level,
    pj.job_type,
    pj.price_per_page,
    pj.total_cost,
    js.Status_Name,
    au.User_ID,
    au.first_name,
    au.last_name,
    au.EMail,
    nu.Account_balance
FROM PRINT_JOB pj
JOIN SUBMITS s ON pj.Job_Id = s.Job_Id
JOIN APP_USER au ON s.User_ID = au.User_ID
JOIN HAS_STATUS hs ON pj.Job_Id = hs.Job_Id
JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
LEFT JOIN NORMAL_USER nu ON au.User_ID = nu.User_ID;

CREATE OR REPLACE VIEW V_USER_PROFILE AS
SELECT 
    au.User_ID,
    au.first_name,
    au.last_name,
    au.EMail,
    au.profile_picture,
    au.Active_session,
    au.last_login_timestamp,
    nu.Account_balance,
    CASE 
        WHEN a.User_ID IS NOT NULL THEN 'admin'
        WHEN o.User_ID IS NOT NULL THEN 'operator'
        WHEN f.User_ID IS NOT NULL THEN 'faculty'
        WHEN st.User_ID IS NOT NULL THEN 'student'
        ELSE 'unknown'
    END AS role,
    st.Major,
    st.Student_Batch,
    f.Department,
    f.Faculty_Rank
FROM APP_USER au
LEFT JOIN NORMAL_USER nu ON au.User_ID = nu.User_ID
LEFT JOIN ADMIN a ON au.User_ID = a.User_ID
LEFT JOIN OPERATOR o ON au.User_ID = o.User_ID
LEFT JOIN STUDENT st ON au.User_ID = st.User_ID
LEFT JOIN FACULTY f ON au.User_ID = f.User_ID;

CREATE OR REPLACE VIEW V_TRANSACTION_HISTORY AS
SELECT 
    ft.Transaction_ID,
    ft.User_ID,
    ft.Amount,
    ft.Transaction_date,
    ft.transaction_type,
    ft.balance_after,
    g.Job_Id
FROM FINANCIAL_TRANSACTION ft
LEFT JOIN GENERATES g ON ft.Transaction_ID = g.Transaction_ID;

CREATE OR REPLACE VIEW V_ADMIN_QUEUE AS
SELECT 
    pj.Job_Id,
    pj.description,
    pj.Page_count,
    pj.job_type,
    pj.print_side,
    pj.copies,
    pj.total_cost,
    pj.Submission_Time,
    pj.collection_slot,
    pj.expiry_time,
    pj.Priority_level,
    js.Status_Name,
    au.first_name,
    au.last_name,
    au.EMail
FROM PRINT_JOB pj
JOIN SUBMITS s ON pj.Job_Id = s.Job_Id
JOIN APP_USER au ON s.User_ID = au.User_ID
JOIN HAS_STATUS hs ON pj.Job_Id = hs.Job_Id
JOIN JOB_STATUS js ON hs.Status_ID = js.Status_ID
ORDER BY pj.Priority_level DESC, pj.Submission_Time ASC;

CREATE OR REPLACE VIEW V_DAILY_REPORT AS
SELECT 
    TRUNC(pj.Submission_Time) AS report_date,
    COUNT(pj.Job_Id) AS total_jobs,
    SUM(CASE WHEN pj.job_type = 'normal' THEN 1 ELSE 0 END) AS normal_jobs,
    SUM(CASE WHEN pj.job_type = 'bulk' THEN 1 ELSE 0 END) AS bulk_jobs,
    SUM(pj.total_cost) AS total_revenue,
    SUM(pj.Page_count) AS total_pages
FROM PRINT_JOB pj
WHERE pj.Submission_Time >= SYSDATE - 30
GROUP BY TRUNC(pj.Submission_Time)
ORDER BY report_date DESC;

CREATE OR REPLACE PROCEDURE SP_SUBMIT_JOB(
    p_user_id IN NUMBER,
    p_document IN VARCHAR2,
    p_page_count IN NUMBER,
    p_copies IN NUMBER,
    p_job_type IN VARCHAR2,
    p_print_mode IN VARCHAR2,
    p_print_side IN VARCHAR2,
    p_collection_slot IN TIMESTAMP,
    p_description IN VARCHAR2,
    p_qr_token IN VARCHAR2,
    p_priority IN NUMBER,
    p_price_per_page IN NUMBER,
    p_total_cost IN NUMBER,
    p_expiry_time IN TIMESTAMP,
    p_job_id OUT NUMBER,
    p_new_balance OUT NUMBER
) AS
    v_balance NUMBER;
    v_status_id NUMBER;
    v_policy_id NUMBER;
    v_transaction_id NUMBER;
BEGIN
    -- Check balance
    SELECT Account_balance INTO v_balance 
    FROM NORMAL_USER WHERE User_ID = p_user_id FOR UPDATE;
    
    IF v_balance < p_total_cost THEN
        RAISE_APPLICATION_ERROR(-20001, 'Insufficient balance');
    END IF;
    
    -- Get pending status ID
    SELECT Status_ID INTO v_status_id 
    FROM JOB_STATUS WHERE Status_Name = 'Pending';
    
    -- Get policy ID
    SELECT Policy_ID INTO v_policy_id 
    FROM PRICE_RATE WHERE Job_type = p_job_type;
    
    -- Insert print job
    INSERT INTO PRINT_JOB (
        Document, Page_count, copies, job_type, print_mode,
        print_side, collection_slot, description, QR_Secure_Token,
        Priority_level, price_per_page, total_cost, expiry_time
    ) VALUES (
        p_document, p_page_count, p_copies, p_job_type, p_print_mode,
        p_print_side, p_collection_slot, p_description, p_qr_token,
        p_priority, p_price_per_page, p_total_cost, p_expiry_time
    ) RETURNING Job_Id INTO p_job_id;
    
    -- Insert into SUBMITS
    INSERT INTO SUBMITS (User_ID, Job_Id) VALUES (p_user_id, p_job_id);
    
    -- Insert into HAS_STATUS
    INSERT INTO HAS_STATUS (Job_Id, Status_ID) VALUES (p_job_id, v_status_id);
    
    -- Insert into GOVERNED_BY
    INSERT INTO GOVERNED_BY (Job_Id, Policy_ID) VALUES (p_job_id, v_policy_id);
    
    -- Deduct balance
    UPDATE NORMAL_USER 
    SET Account_balance = Account_balance - p_total_cost
    WHERE User_ID = p_user_id
    RETURNING Account_balance INTO p_new_balance;
    
    -- Create transaction record
    INSERT INTO FINANCIAL_TRANSACTION (
        Amount, transaction_type, User_ID, balance_after
    ) VALUES (
        -p_total_cost, 'deduction', p_user_id, p_new_balance
    ) RETURNING Transaction_ID INTO v_transaction_id;
    
    -- Link transaction to job
    INSERT INTO GENERATES (Job_Id, Transaction_ID) 
    VALUES (p_job_id, v_transaction_id);
    
    -- Create notification
    INSERT INTO NOTIFICATION (
        User_ID, title, message, notification_type, related_job_id
    ) VALUES (
        p_user_id,
        'Job Submitted',
        'Your print job #' || p_job_id || ' has been submitted successfully',
        'job_submitted',
        p_job_id
    );
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END SP_SUBMIT_JOB;

CREATE OR REPLACE PROCEDURE SP_CONFIRM_HANDOVER(
    p_job_id IN NUMBER,
    p_kiosk_id IN NUMBER,
    p_bin_id IN VARCHAR2
) AS
    v_user_id NUMBER;
    v_collected_status_id NUMBER;
BEGIN
    -- Get collected status
    SELECT Status_ID INTO v_collected_status_id
    FROM JOB_STATUS WHERE Status_Name = 'Collected';
    
    -- Get job owner
    SELECT User_ID INTO v_user_id
    FROM SUBMITS WHERE Job_Id = p_job_id;
    
    -- Update status
    UPDATE HAS_STATUS 
    SET Status_ID = v_collected_status_id
    WHERE Job_Id = p_job_id;
    
    -- Update completion time
    UPDATE PRINT_JOB 
    SET Completion_Time = CURRENT_TIMESTAMP
    WHERE Job_Id = p_job_id;
    
    -- Insert placement record
    INSERT INTO PLACED_IN (Job_Id, Kiosk_ID, Bin_ID)
    VALUES (p_job_id, p_kiosk_id, p_bin_id);
    
    -- Create notification for user
    INSERT INTO NOTIFICATION (
        User_ID, title, message, notification_type, related_job_id
    ) VALUES (
        v_user_id,
        'Ready for Collection',
        'Your print job #' || p_job_id || ' is ready at Bin ' || p_bin_id,
        'job_collected',
        p_job_id
    );
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END SP_CONFIRM_HANDOVER;

CREATE OR REPLACE PROCEDURE SP_TOPUP_BALANCE(
    p_user_id IN NUMBER,
    p_amount IN NUMBER,
    p_new_balance OUT NUMBER,
    p_transaction_id OUT NUMBER
) AS
BEGIN
    UPDATE NORMAL_USER
    SET Account_balance = Account_balance + p_amount
    WHERE User_ID = p_user_id
    RETURNING Account_balance INTO p_new_balance;
    
    INSERT INTO FINANCIAL_TRANSACTION (
        Amount, transaction_type, User_ID, balance_after
    ) VALUES (
        p_amount, 'topup', p_user_id, p_new_balance
    ) RETURNING Transaction_ID INTO p_transaction_id;
    
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END SP_TOPUP_BALANCE;

-- These FKs need CASCADE added
ALTER TABLE HAS_STATUS DROP CONSTRAINT fk_has_status_job;
ALTER TABLE HAS_STATUS ADD CONSTRAINT fk_has_status_job 
    FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id) ON DELETE CASCADE;

ALTER TABLE GOVERNED_BY DROP CONSTRAINT fk_gov_job;
ALTER TABLE GOVERNED_BY ADD CONSTRAINT fk_gov_job 
    FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id) ON DELETE CASCADE;

ALTER TABLE GENERATES DROP CONSTRAINT fk_gen_job;
ALTER TABLE GENERATES ADD CONSTRAINT fk_gen_job 
    FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id) ON DELETE CASCADE;

ALTER TABLE PLACED_IN DROP CONSTRAINT fk_placed_job;
ALTER TABLE PLACED_IN ADD CONSTRAINT fk_placed_job 
    FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id) ON DELETE CASCADE;

ALTER TABLE SUBMITS DROP CONSTRAINT fk_submits_job;
ALTER TABLE SUBMITS ADD CONSTRAINT fk_submits_job 
    FOREIGN KEY (Job_Id) REFERENCES PRINT_JOB(Job_Id) ON DELETE CASCADE;

ALTER TABLE NOTIFICATION DROP CONSTRAINT fk_notif_job;
ALTER TABLE NOTIFICATION ADD CONSTRAINT fk_notif_job 
    FOREIGN KEY (related_job_id) REFERENCES PRINT_JOB(Job_Id) ON DELETE SET NULL;

COMMIT;