let pool;
let schemaReady = false;

const getConnectionString = () => process.env.DATABASE_URL || process.env.POSTGRES_URL;

const getPool = () => {
  const connectionString = getConnectionString();
  if (!connectionString) return null;
  if (!pool) {
    const { Pool } = require("pg");
    pool = new Pool({
      connectionString,
      ssl: connectionString.includes("localhost") ? false : { rejectUnauthorized: false }
    });
  }
  return pool;
};

const run = async (query, params = []) => {
  const database = getPool();
  if (!database) return null;
  return database.query(query, params);
};

const ensureSchema = async () => {
  if (schemaReady || !getConnectionString()) return Boolean(getConnectionString());

  await run("CREATE SCHEMA IF NOT EXISTS genesis");
  await run("CREATE EXTENSION IF NOT EXISTS pgcrypto");
  await run(`
    CREATE TABLE IF NOT EXISTS genesis.users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      mobile TEXT NOT NULL,
      city TEXT,
      state TEXT,
      role TEXT NOT NULL DEFAULT 'parent',
      source TEXT NOT NULL DEFAULT 'gims_scholarship',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS genesis.scholarship_registrations (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id TEXT NOT NULL UNIQUE,
      user_id UUID REFERENCES genesis.users(id) ON DELETE SET NULL,
      student_name TEXT NOT NULL,
      parent_name TEXT NOT NULL,
      grade TEXT NOT NULL,
      school_name TEXT NOT NULL,
      city TEXT NOT NULL,
      state TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      test_mode TEXT NOT NULL,
      present_board TEXT,
      test_center TEXT,
      qualified_stage_1 BOOLEAN NOT NULL DEFAULT FALSE,
      genesis_student BOOLEAN NOT NULL DEFAULT FALSE,
      fee_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      razorpay_order_id TEXT UNIQUE,
      payment_status TEXT NOT NULL DEFAULT 'payment_pending',
      registration_status TEXT NOT NULL DEFAULT 'payment_pending',
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      verified_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await run("ALTER TABLE genesis.scholarship_registrations ADD COLUMN IF NOT EXISTS present_board TEXT");
  await run("ALTER TABLE genesis.scholarship_registrations ADD COLUMN IF NOT EXISTS test_center TEXT");
  await run("ALTER TABLE genesis.scholarship_registrations ADD COLUMN IF NOT EXISTS qualified_stage_1 BOOLEAN NOT NULL DEFAULT FALSE");
  await run("ALTER TABLE genesis.scholarship_registrations ADD COLUMN IF NOT EXISTS genesis_student BOOLEAN NOT NULL DEFAULT FALSE");
  await run(`
    CREATE TABLE IF NOT EXISTS genesis.payment_transactions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id TEXT NOT NULL REFERENCES genesis.scholarship_registrations(registration_id) ON DELETE CASCADE,
      razorpay_order_id TEXT NOT NULL,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      status TEXT NOT NULL DEFAULT 'created',
      raw_payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS genesis.payment_attempts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      attempt_id TEXT NOT NULL UNIQUE,
      student_name TEXT NOT NULL,
      mobile TEXT NOT NULL,
      email TEXT NOT NULL,
      registration_payload JSONB NOT NULL,
      fee_amount INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'INR',
      razorpay_order_id TEXT UNIQUE,
      razorpay_payment_id TEXT,
      razorpay_signature TEXT,
      payment_status TEXT NOT NULL DEFAULT 'checkout_pending',
      registration_id TEXT UNIQUE,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await run(`
    CREATE TABLE IF NOT EXISTS genesis.payment_event_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      registration_id TEXT,
      event_type TEXT NOT NULL,
      payload JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_users_mobile ON genesis.users(mobile)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_registrations_email ON genesis.scholarship_registrations(email)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_registrations_mobile ON genesis.scholarship_registrations(mobile)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_registrations_parent_student ON genesis.scholarship_registrations(mobile, lower(student_name))");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_registrations_payment_status ON genesis.scholarship_registrations(payment_status)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_transactions_order ON genesis.payment_transactions(razorpay_order_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_transactions_payment ON genesis.payment_transactions(razorpay_payment_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_payment_attempts_parent_student ON genesis.payment_attempts(mobile, lower(student_name))");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_payment_attempts_status ON genesis.payment_attempts(payment_status)");
  schemaReady = true;
  return true;
};

const savePendingRegistration = async ({ registrationId, order = null, registration, amount, currency }) => {
  if (!(await ensureSchema())) return { saved: false, reason: "DATABASE_URL not configured" };

  const userResult = await run(
    `
      INSERT INTO genesis.users (full_name, email, mobile, city, state)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        mobile = EXCLUDED.mobile,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        updated_at = NOW()
      RETURNING id
    `,
    [registration.parentName, registration.email, registration.mobile, registration.city, registration.state]
  );
  const userId = userResult.rows[0]?.id;

  await run(
    `
      INSERT INTO genesis.scholarship_registrations (
        registration_id, user_id, student_name, parent_name, grade, school_name,
        city, state, mobile, email, test_mode, present_board, test_center, qualified_stage_1, genesis_student, fee_amount, currency,
        razorpay_order_id, payment_status, registration_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, 'payment_pending', 'payment_pending')
      ON CONFLICT (registration_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        student_name = EXCLUDED.student_name,
        parent_name = EXCLUDED.parent_name,
        grade = EXCLUDED.grade,
        school_name = EXCLUDED.school_name,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        mobile = EXCLUDED.mobile,
        email = EXCLUDED.email,
        test_mode = EXCLUDED.test_mode,
        present_board = EXCLUDED.present_board,
        test_center = EXCLUDED.test_center,
        qualified_stage_1 = FALSE,
        genesis_student = EXCLUDED.genesis_student,
        fee_amount = EXCLUDED.fee_amount,
        currency = EXCLUDED.currency,
        razorpay_order_id = COALESCE(EXCLUDED.razorpay_order_id, genesis.scholarship_registrations.razorpay_order_id),
        payment_status = 'payment_pending',
        registration_status = 'payment_pending',
        verified_at = NULL,
        updated_at = NOW()
    `,
    [
      registrationId,
      userId,
      registration.studentName,
      registration.parentName,
      registration.grade,
      registration.schoolName,
      registration.city,
      registration.state,
      registration.mobile,
      registration.email,
      registration.testMode,
      registration.presentBoard,
      registration.testCenter,
      false,
      registration.genesisStudent,
      amount / 100,
      currency,
      order?.id || null
    ]
  );

  if (order) {
    await run(
      `
        INSERT INTO genesis.payment_transactions (
          registration_id, razorpay_order_id, amount, currency, status, raw_payload
        )
        VALUES ($1, $2, $3, $4, 'order_created', $5::jsonb)
        ON CONFLICT (razorpay_order_id) DO NOTHING
      `,
      [registrationId, order.id, amount, currency, JSON.stringify(order)]
    );
    await recordPaymentEvent({ registrationId, eventType: 'payment_order_created', payload: { orderId: order.id, amount, currency } });
  } else {
    await recordPaymentEvent({ registrationId, eventType: 'registration_intended', payload: { amount, currency } });
  }

  return { saved: true };
};

const saveQualifiedRegistration = async ({ registrationId, registration, currency }) => {
  if (!(await ensureSchema())) return { saved: false, reason: "DATABASE_URL not configured" };

  const userResult = await run(
    `
      INSERT INTO genesis.users (full_name, email, mobile, city, state)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email)
      DO UPDATE SET
        full_name = EXCLUDED.full_name,
        mobile = EXCLUDED.mobile,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        updated_at = NOW()
      RETURNING id
    `,
    [registration.parentName, registration.email, registration.mobile, registration.city, registration.state]
  );
  const userId = userResult.rows[0]?.id;

  await run(
    `
      INSERT INTO genesis.scholarship_registrations (
        registration_id, user_id, student_name, parent_name, grade, school_name,
        city, state, mobile, email, test_mode, present_board, test_center,
        qualified_stage_1, genesis_student, fee_amount, currency, payment_status, registration_status, verified_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, TRUE, $14, 0, $15, 'not_required', 'confirmed', NOW())
      ON CONFLICT (registration_id)
      DO UPDATE SET
        user_id = EXCLUDED.user_id,
        student_name = EXCLUDED.student_name,
        parent_name = EXCLUDED.parent_name,
        grade = EXCLUDED.grade,
        school_name = EXCLUDED.school_name,
        city = EXCLUDED.city,
        state = EXCLUDED.state,
        mobile = EXCLUDED.mobile,
        email = EXCLUDED.email,
        test_mode = EXCLUDED.test_mode,
        present_board = EXCLUDED.present_board,
        test_center = EXCLUDED.test_center,
        qualified_stage_1 = TRUE,
        genesis_student = EXCLUDED.genesis_student,
        fee_amount = 0,
        payment_status = 'not_required',
        registration_status = 'confirmed',
        verified_at = NOW(),
        updated_at = NOW()
    `,
    [
      registrationId,
      userId,
      registration.studentName,
      registration.parentName,
      registration.grade,
      registration.schoolName,
      registration.city,
      registration.state,
      registration.mobile,
      registration.email,
      registration.testMode,
      registration.presentBoard,
      registration.testCenter,
      registration.genesisStudent,
      currency
    ]
  );

  await recordPaymentEvent({ registrationId, eventType: 'stage_1_registration_confirmed', payload: { amount: 0, currency } });

  return { saved: true };
};

const savePaymentAttempt = async ({ attemptId, order = null, registration, amount, currency }) => {
  if (!(await ensureSchema())) return { saved: false, reason: "DATABASE_URL not configured" };
  await run(
    `
      INSERT INTO genesis.payment_attempts (
        attempt_id, student_name, mobile, email, registration_payload, fee_amount, currency, razorpay_order_id, payment_status
      )
      VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8, 'checkout_pending')
      ON CONFLICT (attempt_id)
      DO UPDATE SET
        student_name = EXCLUDED.student_name,
        mobile = EXCLUDED.mobile,
        email = EXCLUDED.email,
        registration_payload = EXCLUDED.registration_payload,
        fee_amount = EXCLUDED.fee_amount,
        currency = EXCLUDED.currency,
        razorpay_order_id = COALESCE(EXCLUDED.razorpay_order_id, genesis.payment_attempts.razorpay_order_id),
        payment_status = 'checkout_pending',
        updated_at = NOW()
    `,
    [attemptId, registration.studentName, registration.mobile, registration.email, JSON.stringify(registration), amount / 100, currency, order?.id || null]
  );
  await recordPaymentEvent({
    registrationId: attemptId,
    eventType: order ? "payment_order_created" : "payment_intended",
    payload: order ? { orderId: order.id, amount, currency } : { amount, currency }
  });
  return { saved: true };
};

const findOpenPaymentAttempt = async ({ studentName, mobile, year = new Date().getFullYear() }) => {
  if (!(await ensureSchema())) return null;
  const result = await run(
    `
      SELECT attempt_id, fee_amount, currency, payment_status
      FROM genesis.payment_attempts
      WHERE mobile = $1
        AND lower(trim(student_name)) = lower(trim($2))
        AND payment_status <> 'payment_verified'
        AND created_at >= make_date($3, 1, 1)
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [mobile, studentName, year]
  );
  return result?.rows?.[0] || null;
};

const completePaymentAttempt = async ({ attemptId, payment, registrationId }) => {
  if (!(await ensureSchema())) return { saved: false, reason: "DATABASE_URL not configured" };
  const attemptResult = await run(
    `
      UPDATE genesis.payment_attempts
      SET payment_status = 'payment_verified', razorpay_payment_id = $1, razorpay_signature = $2, registration_id = $3, updated_at = NOW()
      WHERE attempt_id = $4
        AND razorpay_order_id = $5
        AND registration_id IS NULL
      RETURNING registration_payload, fee_amount, currency, razorpay_order_id
    `,
    [payment.razorpay_payment_id, payment.razorpay_signature, registrationId, attemptId, payment.razorpay_order_id]
  );
  const attempt = attemptResult?.rows?.[0];
  if (!attempt) return { saved: false, reason: "This payment has already been processed or does not match the payment attempt." };

  const registration = attempt.registration_payload;
  const userResult = await run(
    `
      INSERT INTO genesis.users (full_name, email, mobile, city, state)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (email)
      DO UPDATE SET full_name = EXCLUDED.full_name, mobile = EXCLUDED.mobile, city = EXCLUDED.city, state = EXCLUDED.state, updated_at = NOW()
      RETURNING id
    `,
    [registration.parentName, registration.email, registration.mobile, registration.city, registration.state]
  );
  const userId = userResult.rows[0]?.id;

  await run(
    `
      INSERT INTO genesis.scholarship_registrations (
        registration_id, user_id, student_name, parent_name, grade, school_name, city, state, mobile, email,
        test_mode, present_board, test_center, qualified_stage_1, genesis_student, fee_amount, currency,
        razorpay_order_id, payment_status, registration_status, verified_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, FALSE, $14, $15, $16, $17, 'payment_verified', 'confirmed', NOW())
    `,
    [registrationId, userId, registration.studentName, registration.parentName, registration.grade, registration.schoolName, registration.city, registration.state, registration.mobile, registration.email, registration.testMode, registration.presentBoard, registration.testCenter, registration.genesisStudent, attempt.fee_amount, attempt.currency, attempt.razorpay_order_id]
  );
  await run(
    `INSERT INTO genesis.payment_transactions (registration_id, razorpay_order_id, razorpay_payment_id, razorpay_signature, amount, currency, status, raw_payload)
     VALUES ($1, $2, $3, $4, $5, $6, 'payment_verified', $7::jsonb)`,
    [registrationId, attempt.razorpay_order_id, payment.razorpay_payment_id, payment.razorpay_signature, attempt.fee_amount * 100, attempt.currency, JSON.stringify(payment)]
  );
  await recordPaymentEvent({ registrationId: registrationId, eventType: "payment_verified", payload: { attemptId, paymentId: payment.razorpay_payment_id } });
  return { saved: true, registrationId };
};

const findExistingRegistration = async ({ studentName, mobile, year = new Date().getFullYear() }) => {
  if (!(await ensureSchema())) return null;
  const result = await run(
    `
      SELECT registration_id, fee_amount, currency, payment_status, registration_status
      FROM genesis.scholarship_registrations
      WHERE mobile = $1
        AND lower(trim(student_name)) = lower(trim($2))
        AND registration_id LIKE $3
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [mobile, studentName, `GIMS-${year}-%`]
  );
  return result?.rows?.[0] || null;
};

const recordPaymentEvent = async ({ registrationId, eventType, payload = {} }) => {
  if (!(await ensureSchema())) return { saved: false, reason: "DATABASE_URL not configured" };
  await run(
    `INSERT INTO genesis.payment_event_logs (registration_id, event_type, payload) VALUES ($1, $2, $3::jsonb)`,
    [registrationId, eventType, JSON.stringify(payload)]
  );
  return { saved: true };
};

const markPaymentVerified = async ({ registrationId, payment }) => {
  if (!(await ensureSchema())) return { saved: false, reason: "DATABASE_URL not configured" };

  await run(
    `
      UPDATE genesis.scholarship_registrations
      SET
        payment_status = 'payment_verified',
        registration_status = 'confirmed',
        verified_at = NOW(),
        updated_at = NOW()
      WHERE registration_id = $1
    `,
    [registrationId]
  );

  await run(
    `
      UPDATE genesis.payment_transactions
      SET
        razorpay_payment_id = $1,
        razorpay_signature = $2,
        status = 'payment_verified',
        raw_payload = $3::jsonb,
        updated_at = NOW()
      WHERE registration_id = $4
        AND razorpay_order_id = $5
    `,
    [
      payment.razorpay_payment_id,
      payment.razorpay_signature,
      JSON.stringify(payment),
      registrationId,
      payment.razorpay_order_id
    ]
  );

  await run(
    `
      INSERT INTO genesis.payment_event_logs (registration_id, event_type, payload)
      VALUES ($1, 'payment_verified', $2::jsonb)
    `,
    [registrationId, JSON.stringify(payment)]
  );

  return { saved: true };
};

const getGimsDashboard = async () => {
  if (!(await ensureSchema())) return null;

  const [registrationsResult, transactionsResult, eventsResult, attemptsResult] = await Promise.all([
    run(`
      SELECT
        r.registration_id,
        r.student_name,
        r.parent_name,
        r.grade,
        r.school_name,
        r.city,
        r.state,
        r.mobile,
        r.email,
        r.test_mode,
        r.present_board,
        r.test_center,
        r.qualified_stage_1,
        r.genesis_student,
        r.fee_amount,
        r.currency,
        r.razorpay_order_id,
        r.payment_status,
        r.registration_status,
        r.created_at,
        r.verified_at,
        r.updated_at,
        u.id AS user_id,
        u.full_name AS user_full_name,
        u.email AS user_email,
        u.mobile AS user_mobile,
        u.city AS user_city,
        u.state AS user_state,
        u.role AS user_role,
        u.source AS user_source,
        u.created_at AS user_created_at
      FROM genesis.scholarship_registrations r
      LEFT JOIN genesis.users u ON u.id = r.user_id
      WHERE r.registration_status = 'confirmed'
      ORDER BY r.created_at DESC
      LIMIT 2000
    `),
    run(`
      SELECT
        id,
        registration_id,
        razorpay_order_id,
        razorpay_payment_id,
        amount,
        currency,
        status,
        created_at,
        updated_at
      FROM genesis.payment_transactions
      ORDER BY created_at DESC
      LIMIT 5000
    `),
    run(`
      SELECT
        id,
        registration_id,
        event_type,
        COALESCE(payload, '{}'::jsonb) - 'razorpay_signature' - 'signature' AS payload,
        created_at
      FROM genesis.payment_event_logs
      ORDER BY created_at DESC
      LIMIT 5000
    `),
    run(`
      SELECT *
      FROM (
        SELECT
          student_name,
          mobile,
          email,
          fee_amount,
          currency,
          payment_status,
          created_at,
          updated_at,
          'payment_attempt'::text AS source
        FROM genesis.payment_attempts
        WHERE payment_status <> 'payment_verified'

        UNION ALL

        SELECT
          student_name,
          mobile,
          email,
          fee_amount,
          currency,
          payment_status,
          created_at,
          updated_at,
          'earlier_pending_registration'::text AS source
        FROM genesis.scholarship_registrations
        WHERE registration_status <> 'confirmed'
          AND payment_status <> 'payment_verified'
      ) AS unfinished_payments
      ORDER BY created_at DESC
      LIMIT 2000
    `)
  ]);

  return {
    registrations: registrationsResult.rows,
    transactions: transactionsResult.rows,
    events: eventsResult.rows,
    paymentAttempts: attemptsResult.rows
  };
};

module.exports = {
  ensureSchema,
  saveQualifiedRegistration,
  savePaymentAttempt,
  findOpenPaymentAttempt,
  completePaymentAttempt,
  findExistingRegistration,
  recordPaymentEvent,
  getGimsDashboard
};
