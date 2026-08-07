const crypto = require("crypto");
const { markPaymentVerified } = require("../_lib/database");

const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

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

const verifySignature = ({ razorpay_order_id, razorpay_payment_id, razorpay_signature }) => {
  const expectedSignature = crypto
    .createHmac("sha256", RAZORPAY_KEY_SECRET)
    .update(`${razorpay_order_id}|${razorpay_payment_id}`)
    .digest("hex");

  const receivedSignature = Buffer.from(razorpay_signature || "");
  const expectedSignatureBuffer = Buffer.from(expectedSignature);
  if (receivedSignature.length !== expectedSignatureBuffer.length) return false;
  return crypto.timingSafeEqual(expectedSignatureBuffer, receivedSignature);
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  if (!RAZORPAY_KEY_SECRET) {
    return sendJson(response, 500, { error: "Razorpay secret is not configured on the server." });
  }

  try {
    const data = await readJsonBody(request);
    const required = ["razorpay_order_id", "razorpay_payment_id", "razorpay_signature", "registrationId"];
    for (const key of required) {
      if (!data[key]) return sendJson(response, 400, { error: `Missing ${key}` });
    }

    if (!verifySignature(data)) {
      return sendJson(response, 400, { error: "Payment signature verification failed." });
    }

    const database = await markPaymentVerified({
      registrationId: data.registrationId,
      payment: data
    });

    return sendJson(response, 200, {
      verified: true,
      registrationId: data.registrationId,
      paymentId: data.razorpay_payment_id,
      paymentStatus: "payment_verified",
      database
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Payment verification failed." });
  }
};
