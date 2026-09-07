const crypto = require("crypto");
const { getGimsDashboard } = require("../_lib/database");

const ADMIN_CODE = process.env.GIMS_ADMIN_CODE;

const sendJson = (response, status, payload) => {
  response.statusCode = status;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Cache-Control", "no-store, max-age=0");
  response.setHeader("Pragma", "no-cache");
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

const isValidCode = (providedCode) => {
  if (!ADMIN_CODE || !providedCode) return false;
  const expected = Buffer.from(ADMIN_CODE, "utf8");
  const received = Buffer.from(String(providedCode), "utf8");
  return expected.length === received.length && crypto.timingSafeEqual(expected, received);
};

module.exports = async (request, response) => {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return sendJson(response, 405, { error: "Method not allowed" });
  }

  if (!ADMIN_CODE) {
    return sendJson(response, 503, { error: "Admin dashboard is not configured." });
  }

  try {
    const data = await readJsonBody(request);
    if (!isValidCode(data.code)) {
      return sendJson(response, 401, { error: "Invalid security code." });
    }

    const dashboard = await getGimsDashboard();
    if (!dashboard) {
      return sendJson(response, 503, { error: "Registration database is unavailable." });
    }

    return sendJson(response, 200, {
      generatedAt: new Date().toISOString(),
      ...dashboard
    });
  } catch (error) {
    return sendJson(response, 500, { error: error.message || "Unable to load dashboard." });
  }
};
