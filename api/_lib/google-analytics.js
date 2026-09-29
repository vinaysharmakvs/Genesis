const crypto = require("crypto");

const DATA_API_BASE = "https://analyticsdata.googleapis.com/v1beta";
const ANALYTICS_SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

const base64Url = (value) => Buffer.from(value)
  .toString("base64")
  .replace(/=/g, "")
  .replace(/\+/g, "-")
  .replace(/\//g, "_");

const metricValue = (report, index = 0) => Number(report?.rows?.[0]?.metricValues?.[index]?.value || 0);

const getConfiguration = () => {
  let serviceAccount = null;
  const json = process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_JSON;
  if (json) {
    try {
      serviceAccount = JSON.parse(json);
    } catch {
      return { error: "The Analytics service-account secret is not valid JSON." };
    }
  }

  const email = serviceAccount?.client_email || process.env.GOOGLE_ANALYTICS_SERVICE_ACCOUNT_EMAIL;
  const privateKey = serviceAccount?.private_key || process.env.GOOGLE_ANALYTICS_PRIVATE_KEY;
  const propertyId = process.env.GA4_PROPERTY_ID || "556241609";

  if (!email || !privateKey) {
    return { error: "Secure Analytics credentials have not been added to hosting yet." };
  }

  return { email, privateKey: privateKey.replace(/\\n/g, "\n"), propertyId };
};

const getAccessToken = async (configuration) => {
  const now = Math.floor(Date.now() / 1000);
  const unsignedToken = `${base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${base64Url(JSON.stringify({
    iss: configuration.email,
    scope: ANALYTICS_SCOPE,
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600
  }))}`;
  const signature = crypto.createSign("RSA-SHA256").update(unsignedToken).end().sign(configuration.privateKey);
  const assertion = `${unsignedToken}.${base64Url(signature)}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion
    })
  });

  if (!response.ok) throw new Error("Analytics authentication failed.");
  const payload = await response.json();
  if (!payload.access_token) throw new Error("Analytics authentication failed.");
  return payload.access_token;
};

const getReport = async (path, body, accessToken) => {
  const response = await fetch(`${DATA_API_BASE}/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });
  if (!response.ok) throw new Error("Analytics report could not be loaded.");
  return response.json();
};

const getAnalyticsOverview = async () => {
  const configuration = getConfiguration();
  if (configuration.error) return { configured: false, message: configuration.error };

  try {
    const accessToken = await getAccessToken(configuration);
    const property = `properties/${configuration.propertyId}`;
    const [overview, trend, pages, realtime] = await Promise.all([
      getReport(`${property}:runReport`, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "eventCount" }]
      }, accessToken),
      getReport(`${property}:runReport`, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }]
      }, accessToken),
      getReport(`${property}:runReport`, {
        dateRanges: [{ startDate: "7daysAgo", endDate: "today" }],
        dimensions: [{ name: "pagePath" }],
        metrics: [{ name: "screenPageViews" }],
        orderBys: [{ metric: { metricName: "screenPageViews" }, desc: true }],
        limit: 5
      }, accessToken),
      getReport(`${property}:runRealtimeReport`, {
        metrics: [{ name: "activeUsers" }]
      }, accessToken)
    ]);

    return {
      configured: true,
      period: "Last 7 days",
      realtimeActiveUsers: metricValue(realtime),
      totals: {
        users: metricValue(overview, 0),
        sessions: metricValue(overview, 1),
        pageViews: metricValue(overview, 2),
        events: metricValue(overview, 3)
      },
      trend: (trend.rows || []).map((row) => ({
        date: row.dimensionValues?.[0]?.value || "",
        sessions: Number(row.metricValues?.[0]?.value || 0)
      })),
      topPages: (pages.rows || []).map((row) => ({
        path: row.dimensionValues?.[0]?.value || "/",
        views: Number(row.metricValues?.[0]?.value || 0)
      }))
    };
  } catch {
    return { configured: false, message: "Analytics is connected but live data could not be loaded right now." };
  }
};

module.exports = { getAnalyticsOverview };
