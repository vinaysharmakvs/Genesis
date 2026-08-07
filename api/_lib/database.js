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
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_registrations_payment_status ON genesis.scholarship_registrations(payment_status)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_transactions_order ON genesis.payment_transactions(razorpay_order_id)");
  await run("CREATE INDEX IF NOT EXISTS idx_genesis_transactions_payment ON genesis.payment_transactions(razorpay_payment_id)");
  schemaReady = true;
  return true;
};

const savePendingRegistration = async ({ registrationId, order, registration, amount, currency }) => {
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
        city, state, mobile, email, test_mode, fee_amount, currency,
        razorpay_order_id, payment_status, registration_status
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'payment_pending', 'payment_pending')
      ON CONFLICT (registration_id)
      DO UPDATE SET
        razorpay_order_id = EXCLUDED.razorpay_order_id,
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
      amount,
      currency,
      order.id
    ]
  );

  await run(
    `
      INSERT INTO genesis.payment_transactions (
        registration_id, razorpay_order_id, amount, currency, status, raw_payload
      )
      VALUES ($1, $2, $3, $4, 'order_created', $5::jsonb)
    `,
    [registrationId, order.id, amount, currency, JSON.stringify(order)]
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

module.exports = {
  ensureSchema,
  savePendingRegistration,
  markPaymentVerified
};
