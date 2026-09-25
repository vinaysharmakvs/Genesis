const crypto = require("crypto");
const { saveQualifiedRegistration, savePaymentAttempt, findOpenPaymentAttempt, findExistingRegistration, recordPaymentEvent } = require("../_lib/database");

const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || "rzp_test_xe08dTmycCK44q";
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
const FEE_AMOUNT_PAISE = 14900;
const GENESIS_STUDENT_FEE_PAISE = 10000;
const CURRENCY = "INR";

const sendJson = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request) => {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

const cleanText = (value = "", max = 120) =>
  String(value).replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);

const validateRegistration = (data) => {
  const required = ["studentName", "parentName", "grade", "schoolName", "city", "state", "mobile", "email", "testMode", "presentBoard", "testCenter", "qualifiedStage1", "genesisStudent"];
  for (const key of required) {
    if (!cleanText(data[key])) return `Missing required field: ${key}`;
  }
  if (!/^[6-9]\d{9}$/.test(cleanText(data.mobile))) return "Invalid Indian mobile number.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanText(data.email))) return "Invalid email address.";
  if (!new Set(["yes", "no"]).has(cleanText(data.qualifiedStage1).toLowerCase())) return "Invalid Stage 1 qualification selection.";
  if (!new Set(["yes", "no"]).has(cleanText(data.genesisStudent).toLowerCase())) return "Invalid Genesis student selection.";
  return "";
};

const normalizeRegistration = (data) => ({
  studentName: cleanText(data.studentName, 80),
  parentName: cleanText(data.parentName, 80),
  grade: cleanText(data.grade, 30),
  schoolName: cleanText(data.schoolName, 100),
  city: cleanText(data.city, 60),
  state: cleanText(data.state, 60),
  mobile: cleanText(data.mobile, 10),
  email: cleanText(data.email, 90).toLowerCase(),
  testMode: cleanText(data.testMode, 60),
  presentBoard: cleanText(data.presentBoard, 20),
  testCenter: cleanText(data.testCenter, 60),
  qualifiedStage1: cleanText(data.qualifiedStage1, 3).toLowerCase() === "yes",
  genesisStudent: cleanText(data.genesisStudent, 3).toLowerCase() === "yes"
});

const createRazorpayOrder = async (payload) => {
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString("base64");
  const razorpayResponse = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  const body = await razorpayResponse.json().catch(() => ({}));
  if (!razorpayResponse.ok) {
    const message = body?.error?.description || "Unable to create Razorpay order.";
    throw new Error(message);
  }
  return body;
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const data = await readJsonBody(request);
    const validationError = validateRegistration(data);
    if (validationError) return sendJson(response, 400, { error: validationError });

    const registration = normalizeRegistration(data);
    const existingRegistration = await findExistingRegistration({ studentName: registration.studentName, mobile: registration.mobile });
    if (existingRegistration?.registration_status === "confirmed") {
      return sendJson(response, 409, { error: "This student is already registered for GIMS 2026 with this parent mobile number." });
    }

    if (registration.qualifiedStage1) {
      const registrationId = `GIMS-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
      const database = await saveQualifiedRegistration({
        registrationId,
        registration,
        currency: CURRENCY
      });
      if (!database.saved) {
        return sendJson(response, 503, { error: "Registration database is unavailable. Please try again." });
      }
      return sendJson(response, 200, {
        paymentRequired: false,
        registrationId,
        database
      });
    }

    const amount = registration.genesisStudent ? GENESIS_STUDENT_FEE_PAISE : FEE_AMOUNT_PAISE;
    const existingAttempt = await findOpenPaymentAttempt({ studentName: registration.studentName, mobile: registration.mobile });
    const resumed = Boolean(existingAttempt);
    const attemptId = existingAttempt?.attempt_id || `PAY-${new Date().getFullYear()}-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;
    const intent = await savePaymentAttempt({
      attemptId,
      registration,
      amount,
      currency: CURRENCY
    });
    if (!intent.saved) {
      return sendJson(response, 503, { error: "Registration database is unavailable. Please try again." });
    }

    if (!RAZORPAY_KEY_SECRET) {
      await recordPaymentEvent({ registrationId: attemptId, eventType: "payment_unavailable", payload: { amount } });
      return sendJson(response, 500, { error: "Razorpay secret is not configured on the server." });
    }

    const order = await createRazorpayOrder({
      amount,
      currency: CURRENCY,
      receipt: attemptId,
      notes: {
        paymentAttemptId: attemptId,
        studentName: registration.studentName,
        parentName: registration.parentName,
        grade: registration.grade,
        mobile: registration.mobile,
        email: registration.email,
        testMode: registration.testMode,
        registrationFee: String(amount)
      }
    });

    const database = await savePaymentAttempt({
      attemptId,
      order,
      registration,
      amount,
      currency: CURRENCY
    });

    return sendJson(response, 200, {
      paymentRequired: true,
      keyId: RAZORPAY_KEY_ID,
      attemptId,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      database,
      resumed
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Order creation failed." });
  }
};
