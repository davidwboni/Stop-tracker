const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const crypto = require("crypto");

admin.initializeApp();

const DEEPSEEK_API_KEY = defineSecret("DEEPSEEK_API_KEY");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const DEEPSEEK_URL = "https://api.deepseek.com/chat/completions";

async function stripePost(path, params = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined && v !== null) body.append(k, String(v)); });
  const response = await fetch(`https://api.stripe.com/v1/${path}`, { method: "POST", headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`, "Content-Type": "application/x-www-form-urlencoded" }, body });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe request failed");
  return data;
}

async function stripeGet(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => qs.append(k, String(v)));
  const response = await fetch(`https://api.stripe.com/v1/${path}?${qs}`, { headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}` } });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "Stripe request failed");
  return data;
}

// System prompt: describe the six pay models + the exact JSON we want back.
// The AI ONLY transcribes/interprets into structured config — it never computes
// daily pay. The client recomputes the worked example with tested code.
const PAY_SYSTEM_PROMPT = `You convert a delivery driver's description of how they are paid into a structured JSON pay configuration. The description may be in ANY language, or may be an uploaded image/PDF of a pay-rate sheet.

Return ONLY a JSON object (no prose, no markdown fences) with this shape:
{
  "config": { ... one of the six models below ... },
  "summary": "one short sentence describing the pay, written in the SAME language the user used in their description (match their language so the reply feels personal); if the input is a document with no clear language, use English",
  "sample": { "quantity": <number>, "miles": <number, only for sliding_scale> }
}

"sample" is a realistic day for a worked-example check (e.g. 150 stops, or 80 miles, or 8 hours, or 1 day). "quantity" is the model's PRIMARY input (stops for stop models, miles for per_mile, hours for hourly, 1 for per_day).

The six models (pick exactly one) and the config keys each uses:

1. tiered_stops — paid per stop with rate tiers.
   { "model": "tiered_stops", "thresholds": [ { "stopCount": <cutoff>, "rate": <£/stop below cutoff> }, { "rate": <£/stop above the last cutoff> } ], "excessParcelRate": <£ per parcel beyond one per stop, or 0> }
   The LAST threshold has no stopCount (it is the overflow rate). Multiple tiers are allowed.

2. flat_stops — one flat rate per stop.
   { "model": "flat_stops", "ratePerStop": <£>, "excessParcelRate": <£ or 0> }

3. per_mile — paid per mile, optional fixed daily base.
   { "model": "per_mile", "ratePerMile": <£>, "baseFee": <£ or 0> }

4. hourly — paid per hour.
   { "model": "hourly", "ratePerHour": <£> }

5. per_day — fixed day rate.
   { "model": "per_day", "ratePerDay": <£> }

6. sliding_scale — a 2D rate grid where £/stop depends on BOTH stop count and mileage (common for DPD, e.g. "e3.5tn Standard Sliding Scale"). Transcribe the table exactly.
   { "model": "sliding_scale", "stopBands": [<row header stop counts, ascending>], "mileBands": [<column header mileages, ascending>], "rateMatrix": [ [<£/stop for row0 across each mile column>], ... ] }
   rateMatrix[i][j] is the £/stop when stops≈stopBands[i] and miles≈mileBands[j]. rateMatrix must have exactly stopBands.length rows and each row exactly mileBands.length numbers.

Rules:
- Amounts are numbers in pounds (e.g. 1.7 not "£1.70"; 90p is 0.9).
- If a rate sheet image/PDF is provided, transcribe every cell precisely — accuracy of the whole grid matters.
- If something is genuinely ambiguous, choose the most standard interpretation; the user will confirm a worked example afterwards.
- Output valid JSON only.`;

exports.interpretPayStructure = onCall(
  // invoker:"public" lets the Firebase callable protocol reach the function;
  // auth is still enforced below via request.auth (no anonymous access).
  { secrets: [DEEPSEEK_API_KEY], cors: true, invoker: "public", memory: "512MiB", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const { text, fileBase64, mimeType } = request.data || {};
    const allowedMime = new Set(["application/pdf","image/jpeg","image/png","image/webp"]);
    if (typeof text === "string" && text.length > 12000) throw new HttpsError("invalid-argument","Description is too long.");
    if (fileBase64 && (!allowedMime.has(mimeType) || typeof fileBase64 !== "string" || fileBase64.length > 12_000_000)) throw new HttpsError("invalid-argument","Upload a PDF, JPEG, PNG or WebP under the supported size limit.");
    if (!text && !fileBase64) {
      throw new HttpsError("invalid-argument", "Provide a description or a file.");
    }

    // DeepSeek is our single AI provider. Keep the key server-side in Firebase
    // Secret Manager; the browser never receives it.
    // DeepSeek's chat endpoint is text-first, so documents/images must be
    // converted to trusted text before this call. We intentionally reject raw
    // files here rather than silently sending sensitive uploads elsewhere.
    if (fileBase64) {
      throw new HttpsError("failed-precondition", "Document extraction is not enabled yet. Enter the pay details as text.");
    }

    let responseData;
    try {
      const response = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY.value()}`,
        },
        body: JSON.stringify({
          model: "deepseek-chat",
          temperature: 0,
          max_tokens: 8000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: PAY_SYSTEM_PROMPT },
            { role: "user", content: `Here is how I get paid:

${text}` },
          ],
        }),
      });
      if (!response.ok) {
        console.error("DeepSeek request failed:", response.status);
        throw new Error("AI provider error");
      }
      responseData = await response.json();
    } catch (err) {
      console.error("DeepSeek call failed:", err?.message || "unknown error");
      throw new HttpsError("internal", "Could not interpret the pay structure. Please try again.");
    }

    const raw = String(responseData?.choices?.[0]?.message?.content || "").trim();

    let parsed;
    try {
      let jsonStr = raw
        .replace(/^```(?:json)?\s*/i, "")
        .replace(/```\s*$/, "")
        .trim();
      if (!jsonStr.startsWith("{")) {
        jsonStr = jsonStr.slice(jsonStr.indexOf("{"), jsonStr.lastIndexOf("}") + 1);
      }
      parsed = JSON.parse(jsonStr);
    } catch (err) {
      console.error("Failed to parse model output; response length:", raw.length);
      throw new HttpsError("internal", "The interpreter returned an unexpected format. Please reword and try again.");
    }

    const VALID = ["tiered_stops", "flat_stops", "per_mile", "hourly", "per_day", "sliding_scale"];
    if (!parsed.config || !VALID.includes(parsed.config.model)) {
      throw new HttpsError("internal", "Could not determine a pay model. Please describe it differently.");
    }

    return {
      config: parsed.config,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      sample: parsed.sample && typeof parsed.sample.quantity === "number" ? parsed.sample : { quantity: 100 },
    };
  }
);

// Creates a Stripe Checkout session for Stop Tracker Pro. Price IDs are
// deliberately configuration, not secrets, so monthly/annual products can be
// changed without shipping private credentials to the client.
exports.createProCheckout = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: true, invoker: "public" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    const plan = request.data?.plan === "annual" ? "annual" : request.data?.plan === "monthly" ? "monthly" : null;
    if (!plan) throw new HttpsError("invalid-argument", "Choose monthly or annual.");
    const lookupKey = plan === "annual" ? "stop_tracker_pro_annual" : "stop_tracker_pro_monthly";
    const prices = await stripeGet("prices", { "lookup_keys[]": lookupKey, active: true, limit: 1 });
    const priceId = prices.data[0]?.id;
    if (!priceId) throw new HttpsError("failed-precondition", "This Pro plan is not configured in Stripe.");
    const userRef = admin.firestore().collection("users").doc(request.auth.uid);
    const snap = await userRef.get();
    const user = snap.data() || {};
    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripePost("customers", { email: request.auth.token.email || undefined, "metadata[firebaseUid]": request.auth.uid });
      customerId = customer.id;
      await userRef.set({ stripeCustomerId: customerId }, { merge: true });
    }
    const origin = String(request.data?.origin || "").replace(/\/$/, "");
    if (!/^https:\/\//.test(origin)) throw new HttpsError("invalid-argument", "Invalid return URL.");
    const session = await stripePost("checkout/sessions", {
      mode: "subscription", customer: customerId,
      "line_items[0][price]": priceId, "line_items[0][quantity]": 1,
      success_url: `${origin}/app/profile?billing=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/app/profile?billing=cancelled`,
      client_reference_id: request.auth.uid,
      "metadata[firebaseUid]": request.auth.uid,
      "subscription_data[metadata][firebaseUid]": request.auth.uid,
    });
    return { url: session.url };
  }
);


// Stripe is the source of truth for paid access. Clients can read their own
// entitlement document but cannot write it (see firestore.rules).
exports.stripeWebhook = onRequest(
  { secrets: [STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET], cors: false },
  async (req, res) => {
    let event;
    try {
      const signature = String(req.headers["stripe-signature"] || "");
      const parts = Object.fromEntries(signature.split(",").map(p => p.split("=")));
      const timestamp = Number(parts.t);
      if (!timestamp || Math.abs(Date.now() / 1000 - timestamp) > 300) throw new Error("stale signature");
      const expected = crypto.createHmac("sha256", STRIPE_WEBHOOK_SECRET.value()).update(`${timestamp}.${req.rawBody.toString("utf8")}`).digest("hex");
      const supplied = String(parts.v1 || "");
      if (expected.length !== supplied.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(supplied))) throw new Error("signature mismatch");
      event = JSON.parse(req.rawBody.toString("utf8"));
    } catch (err) {
      console.error("Invalid Stripe webhook signature");
      res.status(400).send("Invalid signature");
      return;
    }

    const subscriptionEvents = new Set(["customer.subscription.created","customer.subscription.updated","customer.subscription.deleted"]);
    if (subscriptionEvents.has(event.type)) {
      const sub = event.data.object;
      const uid = sub.metadata?.firebaseUid;
      if (uid) {
        const active = ["active","trialing"].includes(sub.status);
        await admin.firestore().collection("entitlements").doc(uid).set({
          plan: active ? "pro" : "free",
          subscriptionStatus: sub.status,
          stripeCustomerId: String(sub.customer || ""),
          stripeSubscriptionId: sub.id,
          priceId: sub.items?.data?.[0]?.price?.id || null,
          currentPeriodEnd: sub.items?.data?.[0]?.current_period_end || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
    }
    res.status(200).json({ received: true });
  }
);

exports.createBillingPortal = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: true, invoker: "public" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
    const ent = await admin.firestore().collection("entitlements").doc(request.auth.uid).get();
    const user = await admin.firestore().collection("users").doc(request.auth.uid).get();
    const customerId = ent.data()?.stripeCustomerId || user.data()?.stripeCustomerId;
    if (!customerId) throw new HttpsError("failed-precondition", "No Stripe customer exists for this account.");
    const origin = String(request.data?.origin || "").replace(/\/$/, "");
    if (!/^https:\/\//.test(origin)) throw new HttpsError("invalid-argument", "Invalid return URL.");
    const session = await stripePost("billing_portal/sessions", { customer: customerId, return_url: `${origin}/app/profile` });
    return { url: session.url };
  }
);

exports.assignRoleOnSignup = functions.auth.user().onCreate(async (user) => {
  try {
    const userRef = admin.firestore().collection("users").doc(user.uid);
    await userRef.set({
      email: user.email || "No email provided",
      name: user.displayName || "Anonymous",
      role: "free", // Default role
    });
    console.log(`User ${user.uid} assigned default role: free`);
  } catch (error) {
    console.error(`Error assigning role for user ${user.uid}:`, error);
  }
});
