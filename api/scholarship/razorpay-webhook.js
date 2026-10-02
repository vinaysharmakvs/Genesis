const crypto = require("crypto");
const { reconcileCapturedPayment } = require("../_lib/database");

const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const MAX_BODY_BYTES = 1024 * 1024;

const sendJson = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.end(JSON.stringify(payload));
};

const readRawBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > MAX_BODY_BYTES) throw new Error("Webhook request is too large.");
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString("utf8");
};

const isValidSignature = (rawBody, signature) => {
  if (!WEBHOOK_SECRET || !signature) return false;
  const expected = crypto.createHmac("sha256", WEBHOOK_SECRET).update(rawBody).digest("hex");
  const received = Buffer.from(String(signature));
  const expectedBuffer = Buffer.from(expected);
  return received.length === expectedBuffer.length && crypto.timingSafeEqual(expectedBuffer, received);
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed" });
  }
  if (!WEBHOOK_SECRET) return sendJson(response, 503, { error: "Razorpay webhook is not configured." });

  try {
    const rawBody = await readRawBody(request);
    const signature = request.headers["x-razorpay-signature"];
    if (!isValidSignature(rawBody, signature)) return sendJson(response, 400, { error: "Invalid webhook signature." });

    const event = JSON.parse(rawBody);
    if (event.event !== "payment.captured") return sendJson(response, 200, { received: true, ignored: true });

    const payment = event.payload?.payment?.entity;
    if (!payment?.id || !payment?.order_id || payment.status !== "captured") {
      return sendJson(response, 200, { received: true, ignored: true });
    }

    const result = await reconcileCapturedPayment({
      orderId: payment.order_id,
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      eventId: request.headers["x-razorpay-event-id"]
    });
    if (!result.saved) {
      if (result.retryable) return sendJson(response, 503, { error: "Payment could not be stored. Razorpay should retry this event." });
      return sendJson(response, 200, { received: true, ignored: true, reason: result.reason });
    }

    return sendJson(response, 200, {
      received: true,
      confirmed: !result.alreadyProcessed,
      registrationId: result.registrationId
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Webhook processing failed." });
  }
};
