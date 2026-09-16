const RESEND_ENDPOINT = "https://api.resend.com/emails";

const requiredFields = [
  "first_name",
  "last_name",
  "email",
  "phone",
  "role",
  "arena",
  "frustration",
  "why_now",
  "readiness"
];

const limits = {
  first_name: 80,
  last_name: 80,
  email: 160,
  phone: 40,
  role: 100,
  company: 160,
  arena: 120,
  frustration: 1200,
  why_now: 1200,
  readiness: 80
};

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store"
    }
  });
}

function clean(value, maxLength = 500) {
  return String(value ?? "").trim().slice(0, maxLength);
}

function escapeHtml(value) {
  return clean(value, 5000)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function normalizePayload(input) {
  const payload = {};
  for (const [field, maxLength] of Object.entries(limits)) {
    payload[field] = clean(input[field], maxLength);
  }
  payload.consent = input.consent === true;
  payload.website = clean(input.website, 200);
  return payload;
}

function validate(payload) {
  const missing = requiredFields.filter((field) => !payload[field]);
  if (missing.length) return `Missing required fields: ${missing.join(", ")}`;
  if (!payload.consent) return "Consent is required.";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(payload.email)) return "Enter a valid email address.";
  return null;
}

function applicationEmail(payload) {
  const rows = [
    ["Name", `${payload.first_name} ${payload.last_name}`],
    ["Email", payload.email],
    ["Phone", payload.phone],
    ["Role", payload.role],
    ["Business / organization", payload.company || "Not provided"],
    ["Primary arena", payload.arena],
    ["Biggest frustration", payload.frustration],
    ["Why now", payload.why_now],
    ["Readiness", payload.readiness],
    ["Contact consent", payload.consent ? "Yes" : "No"]
  ];

  return `
    <div style="background:#f2eee4;padding:32px;font-family:Arial,sans-serif;color:#172125">
      <div style="max-width:680px;margin:0 auto;background:#fffdf7;border:1px solid #d8d1c3;padding:32px">
        <p style="margin:0 0 8px;color:#813d2a;font-size:12px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase">Take the Mic</p>
        <h1 style="margin:0 0 24px;font-family:Georgia,serif;font-size:32px;font-weight:400">New application</h1>
        ${rows.map(([label, value]) => `
          <div style="padding:14px 0;border-top:1px solid #e4ded2">
            <div style="margin-bottom:5px;color:#813d2a;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase">${escapeHtml(label)}</div>
            <div style="font-size:15px;line-height:1.5;white-space:pre-wrap">${escapeHtml(value)}</div>
          </div>`).join("")}
      </div>
    </div>`;
}

export async function handleApplicationRequest(request, env) {
  if (request.method !== "POST") return json({ error: "Method not allowed." }, 405);
  if (!env.RESEND_API_KEY || !env.APPLICATION_TO_EMAIL || !env.APPLICATION_FROM_EMAIL) {
    return json({ error: "Application email delivery is not configured." }, 503);
  }

  let input;
  try {
    input = await request.json();
  } catch {
    return json({ error: "Invalid request body." }, 400);
  }

  const payload = normalizePayload(input);

  // Honeypot: return a generic success without sending anything.
  if (payload.website) return json({ ok: true });

  const validationError = validate(payload);
  if (validationError) return json({ error: validationError }, 400);

  const resendResponse = await fetch(RESEND_ENDPOINT, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.RESEND_API_KEY}`,
      "content-type": "application/json"
    },
    body: JSON.stringify({
      from: env.APPLICATION_FROM_EMAIL,
      to: [env.APPLICATION_TO_EMAIL],
      reply_to: payload.email,
      subject: `Take the Mic application — ${payload.first_name} ${payload.last_name}`,
      html: applicationEmail(payload)
    })
  });

  if (!resendResponse.ok) {
    console.error("Resend rejected application email", resendResponse.status, await resendResponse.text());
    return json({ error: "Email delivery failed. Please try again." }, 502);
  }

  const result = await resendResponse.json();
  return json({ ok: true, id: result.id });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (url.pathname === "/api/apply") return handleApplicationRequest(request, env);
    return new Response("Not found", { status: 404 });
  }
};
