// Checks whether a given phone number has already submitted the Tally form.
// The Tally API key is read from the TALLY_API_KEY environment variable
// (set in Netlify → Site settings → Environment variables) so it is never
// exposed to the browser.

const FORM_ID = "dWvkQV";

const norm = (s) => (s == null ? "" : String(s)).replace(/[\s\-()]/g, "");

exports.handler = async (event) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Content-Type": "application/json",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: cors, body: "" };
  }

  const API_KEY = process.env.TALLY_API_KEY;
  if (!API_KEY) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: "Missing TALLY_API_KEY" }) };
  }

  const phone = norm(event.queryStringParameters && event.queryStringParameters.phone);
  if (!phone) {
    return { statusCode: 400, headers: cors, body: JSON.stringify({ error: "phone required" }) };
  }

  try {
    let page = 1;
    let submitted = false;

    while (page <= 50) { // safety cap
      const res = await fetch(
        `https://api.tally.so/forms/${FORM_ID}/submissions?page=${page}&limit=100`,
        { headers: { Authorization: `Bearer ${API_KEY}` } }
      );

      if (!res.ok) {
        const detail = await res.text();
        return { statusCode: 502, headers: cors, body: JSON.stringify({ error: "Tally API error", status: res.status, detail }) };
      }

      const data = await res.json();
      const submissions = data.submissions || [];

      for (const sub of submissions) {
        if (sub.isCompleted === false) continue; // only count completed submissions
        for (const r of sub.responses || []) {
          const ans = typeof r.answer === "string" ? r.answer : JSON.stringify(r.answer || "");
          if (norm(ans).includes(phone)) { submitted = true; break; }
        }
        if (submitted) break;
      }

      if (submitted || !data.hasMore) break;
      page++;
    }

    return { statusCode: 200, headers: cors, body: JSON.stringify({ submitted }) };
  } catch (e) {
    return { statusCode: 500, headers: cors, body: JSON.stringify({ error: String(e) }) };
  }
};
