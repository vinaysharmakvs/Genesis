const { recordPaymentEvent } = require("../_lib/database");

const ALLOWED_EVENTS = new Set(["checkout_opened", "checkout_cancelled", "checkout_failed", "payment_verification_failed"]);

const sendJson = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json");
  response.end(JSON.stringify(payload));
};

const readJsonBody = async (request) => {
  const chunks = [];
  let size = 0;
  for await (const chunk of request) {
    size += chunk.length;
    if (size > 4096) throw new Error("Request is too large.");
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  try {
    const data = await readJsonBody(request);
    if (!/^PAY-\d{4}-[A-Z0-9-]+$/.test(String(data.attemptId || ""))) {
      return sendJson(response, 400, { error: "Invalid payment-attempt reference." });
    }
    if (!ALLOWED_EVENTS.has(data.eventType)) {
      return sendJson(response, 400, { error: "Invalid payment event." });
    }
    const saved = await recordPaymentEvent({
      registrationId: data.attemptId,
      eventType: data.eventType,
      payload: { source: "gims2026", reason: String(data.reason || "").slice(0, 240) }
    });
    if (!saved.saved) return sendJson(response, 503, { error: "Registration database is unavailable." });
    return sendJson(response, 200, { saved: true });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Unable to record payment event." });
  }
};
