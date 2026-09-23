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

function stripeApiError(response, data) {
  const error = new Error(data?.error?.message || "Stripe request failed");
  error.status = response.status;
  error.stripeType = data?.error?.type || "";
  error.stripeCode = data?.error?.code || "";
  return error;
}

async function stripePost(path, params = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") body.append(k, String(v));
  });
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
      "Content-Type": "application/x-www-form-urlencoded"
    },
    body
  });
  const data = await response.json();
  if (!response.ok) throw stripeApiError(response, data);
  return data;
}

async function stripeGet(path, params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== "") qs.append(k, String(v));
  });
  const response = await fetch(`https://api.stripe.com/v1/${path}?${qs}`, {
    headers: { Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}` }
  });
  const data = await response.json();
  if (!response.ok) throw stripeApiError(response, data);
  return data;
}

function trustedAppOrigin(value) {
  const origin = String(value || "").replace(/\/$/, "");
  const allowed = new Set([
    "https://stop-tracker.vercel.app",
    "https://stop-tracker-davidwbonis-projects.vercel.app",
    "https://stop-tracker-git-main-davidwbonis-projects.vercel.app"
  ]);
  if (!allowed.has(origin)) {
    throw new HttpsError("invalid-argument", "Invalid return URL.");
  }
  return origin;
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


const STATEMENT_SYSTEM_PROMPT = `Extract delivery pay statement figures. Return JSON only:
{"statementStops":number|null,"statementAmount":number|null,"daily":[{"date":"YYYY-MM-DD","stops":number|null,"amount":number|null}],"confidence":number,"notes":[]}
Use only figures visible in the statement. Do not invent missing dates or values. statementAmount is the total gross statement amount relevant to the driver's delivery work for the period. confidence is 0..1.`;

async function getEntitlement(uid) {
  const snap = await admin.firestore().collection("entitlements").doc(uid).get();
  const d = snap.data() || {};
  return { isPro: d.plan === "pro" && ["active","trialing"].includes(d.subscriptionStatus), ...d };
}

async function consumeFreeUse(uid, field) {
  const ref = admin.firestore().collection("usage").doc(uid);
  return admin.firestore().runTransaction(async tx => {
    const snap = await tx.get(ref);
    const data = snap.data() || {};
    const used = Number(data[field] || 0);
    if (used >= 3) return { allowed: false, used };
    tx.set(ref, { [field]: used + 1, updatedAt: admin.firestore.FieldValue.serverTimestamp() }, { merge: true });
    return { allowed: true, used: used + 1 };
  });
}


function parseGoogleDurationSeconds(value) {
  if (typeof value !== "string") return 0;
  const seconds = Number.parseFloat(value.replace(/s$/, ""));
  return Number.isFinite(seconds) ? seconds : 0;
}

async function getGoogleCloudAccessToken() {
  const response = await fetch(
    "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token",
    { headers: { "Metadata-Flavor": "Google" } }
  );
  if (!response.ok) throw new Error(`Metadata token request failed (${response.status})`);
  const data = await response.json();
  if (!data?.access_token) throw new Error("No Google Cloud access token returned");
  return data.access_token;
}

// Real route optimisation for delivery-sized stop lists. The browser never
// receives a billable routing credential: Firebase Functions uses its runtime
// service account via Google Cloud OAuth. Grant that service account
// routeoptimization.locations.use (for example roles/routeoptimization.editor).
exports.optimizeDriverRoute = onCall(
  { cors: true, invoker: "public", timeoutSeconds: 60, memory: "512MiB" },
  async request => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");

    const input = request.data?.addresses;
    if (!Array.isArray(input) || input.length < 2 || input.length > 200) {
      throw new HttpsError("invalid-argument", "Provide between 2 and 200 route stops.");
    }

    const addresses = input.map((a, index) => {
      const latitude = Number(a?.latitude);
      const longitude = Number(a?.longitude);
      if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
          !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
        throw new HttpsError("invalid-argument", `Stop ${index + 1} has invalid coordinates.`);
      }
      return {
        id: a?.id ?? index,
        address: typeof a?.address === "string" ? a.address.slice(0, 500) : "",
        postcode: typeof a?.postcode === "string" ? a.postcode.slice(0, 30) : "",
        latitude,
        longitude,
        type: typeof a?.type === "string" ? a.type.slice(0, 50) : undefined,
      };
    });

    const ent = await getEntitlement(request.auth.uid);
    if (!ent.isPro) {
      const usage = (await admin.firestore().collection("usage").doc(request.auth.uid).get()).data() || {};
      if (Number(usage.routeOptimizationUses || 0) >= 3) {
        throw new HttpsError("permission-denied", "Your 3 free route optimisations are used. Upgrade to Pro.");
      }
    }

    const start = addresses[0];
    const shipments = addresses.slice(1).map((a, index) => ({
      label: String(index + 1),
      deliveries: [{
        arrivalLocation: { latitude: a.latitude, longitude: a.longitude },
        duration: "0s",
      }],
      // A large penalty ensures normal delivery stops are not silently dropped
      // just because leaving them unserved would be cheaper.
      penaltyCost: 100000,
    }));

    const projectId =
      process.env.GCLOUD_PROJECT ||
      process.env.GOOGLE_CLOUD_PROJECT ||
      admin.app().options.projectId;

    if (!projectId) {
      throw new HttpsError("failed-precondition", "Google Cloud project ID is unavailable.");
    }

    let payload;
    try {
      const accessToken = await getGoogleCloudAccessToken();
      const response = await fetch(
        `https://routeoptimization.googleapis.com/v1/projects/${encodeURIComponent(projectId)}:optimizeTours`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            timeout: "15s",
            searchMode: "RETURN_FAST",
            considerRoadTraffic: true,
            model: {
              shipments,
              vehicles: [{
                label: "driver",
                travelMode: "DRIVING",
                startLocation: { latitude: start.latitude, longitude: start.longitude },
                costPerKilometer: 1,
                costPerTraveledHour: 1,
              }],
            },
          }),
        }
      );

      payload = await response.json();
      if (!response.ok) {
        console.error("Route Optimization API failed:", response.status, payload?.error?.message || "unknown");
        throw new Error(payload?.error?.message || `Route Optimization status ${response.status}`);
      }
    } catch (err) {
      console.error("Route optimisation failed:", err?.message || "unknown");
      throw new HttpsError("unavailable", "Could not optimise this route right now.");
    }

    const route = payload?.routes?.[0];
    if (!route || !Array.isArray(route.visits)) {
      throw new HttpsError("failed-precondition", "No usable route was returned.");
    }
    if (Array.isArray(payload?.skippedMandatoryShipmentIndices) && payload.skippedMandatoryShipmentIndices.length) {
      throw new HttpsError("failed-precondition", "Some stops could not be included in the route.");
    }

    const ordered = [start];
    for (const visit of route.visits) {
      const shipmentIndex = Number(visit?.shipmentIndex);
      if (Number.isInteger(shipmentIndex) && addresses[shipmentIndex + 1]) {
        ordered.push(addresses[shipmentIndex + 1]);
      }
    }

    if (ordered.length !== addresses.length) {
      throw new HttpsError("failed-precondition", "The optimiser did not return every stop.");
    }

    let usageResult = { isPro: ent.isPro };
    if (!ent.isPro) {
      const consumed = await consumeFreeUse(request.auth.uid, "routeOptimizationUses");
      if (!consumed.allowed) {
        throw new HttpsError("permission-denied", "Your 3 free route optimisations are used. Upgrade to Pro.");
      }
      usageResult = { isPro: false, used: consumed.used, remaining: Math.max(0, 3 - consumed.used) };
    }

    return {
      route: ordered,
      totalDistanceKm: Number(route?.metrics?.travelDistanceMeters || 0) / 1000,
      totalDurationMin: Math.ceil(parseGoogleDurationSeconds(route?.metrics?.travelDuration) / 60),
      source: "google-route-optimization",
      ...usageResult,
    };
  }
);

exports.getPremiumStatus = onCall({ cors: true, invoker: "public" }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  const [ent, usage] = await Promise.all([
    getEntitlement(request.auth.uid),
    admin.firestore().collection("usage").doc(request.auth.uid).get(),
  ]);
  const u = usage.data() || {};
  return { isPro: ent.isPro, statementAiUses: Number(u.statementAiUses || 0), routeOptimizationUses: Number(u.routeOptimizationUses || 0) };
});

exports.extractStatement = onCall(
  { secrets: [DEEPSEEK_API_KEY], cors: true, invoker: "public", memory: "512MiB", timeoutSeconds: 120 },
  async request => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");

    const imageTypes = new Set(["image/jpeg","image/png","image/webp"]);
    const legacyImage = request.data?.fileBase64
      ? [{ fileBase64: request.data.fileBase64, mimeType: request.data?.mimeType }]
      : [];
    const images = Array.isArray(request.data?.images) ? request.data.images : legacyImage;

    if (!images.length || images.length > 10) {
      throw new HttpsError("invalid-argument", "Upload between 1 and 10 statement pages.");
    }

    let totalEncodedSize = 0;
    for (const image of images) {
      if (!imageTypes.has(image?.mimeType) || typeof image?.fileBase64 !== "string") {
        throw new HttpsError("invalid-argument", "Statement pages must be JPEG, PNG or WebP.");
      }
      if (image.fileBase64.length > 12_000_000) {
        throw new HttpsError("invalid-argument", "One of the statement pages is too large.");
      }
      totalEncodedSize += image.fileBase64.length;
    }
    if (totalEncodedSize > 20_000_000) {
      throw new HttpsError("invalid-argument", "This statement is too large to process in one check.");
    }

    const ent = await getEntitlement(request.auth.uid);
    const usageRef = admin.firestore().collection("usage").doc(request.auth.uid);
    const usage = (await usageRef.get()).data() || {};
    if (!ent.isPro && Number(usage.statementAiUses || 0) >= 3) {
      throw new HttpsError("permission-denied", "Your 3 free AI checks are used. Upgrade to Pro.");
    }

    let data;
    try {
      const content = [
        {
          type: "text",
          text: images.length > 1
            ? `These ${images.length} images are pages of the same delivery pay statement, in page order. Extract the entire statement into the requested JSON and combine the figures across all pages.`
            : "Extract this delivery pay statement into the requested JSON."
        },
        ...images.map((image) => ({
          type: "image_url",
          image_url: {
            url: `data:${image.mimeType};base64,${image.fileBase64}`,
            detail: "original"
          }
        }))
      ];

      const response = await fetch(DEEPSEEK_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${DEEPSEEK_API_KEY.value()}`
        },
        body: JSON.stringify({
          model: "deepseek-flash",
          temperature: 0,
          max_tokens: 6000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: STATEMENT_SYSTEM_PROMPT },
            { role: "user", content }
          ]
        })
      });

      if (!response.ok) {
        const errorText = await response.text().catch(() => "");
        console.error("DeepSeek statement request failed:", response.status, errorText.slice(0, 500));
        throw new Error(`DeepSeek status ${response.status}`);
      }

      const payload = await response.json();
      data = JSON.parse(
        String(payload?.choices?.[0]?.message?.content || "{}")
          .replace(/^\`\`\`(?:json)?\\s*/i, "")
          .replace(/\`\`\`\\s*$/, "")
      );
    } catch (err) {
      console.error("Statement extraction failed:", err?.message || "unknown");
      throw new HttpsError("internal", "Could not read this statement. Try a clearer file or enter it manually.");
    }

    if (!Number.isFinite(Number(data.statementStops)) && !Number.isFinite(Number(data.statementAmount))) {
      throw new HttpsError("failed-precondition", "No usable statement totals were found.");
    }

    if (!ent.isPro) {
      const consumed = await consumeFreeUse(request.auth.uid, "statementAiUses");
      if (!consumed.allowed) {
        throw new HttpsError("permission-denied", "Your 3 free AI checks are used. Upgrade to Pro.");
      }
    }

    return {
      statementStops: data.statementStops,
      statementAmount: data.statementAmount,
      daily: Array.isArray(data.daily) ? data.daily : [],
      confidence: Number(data.confidence || 0),
      notes: Array.isArray(data.notes) ? data.notes : []
    };
  }
);

exports.consumeRouteOptimization = onCall({ cors: true, invoker: "public" }, async request => {
  if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");
  const ent = await getEntitlement(request.auth.uid);
  if (ent.isPro) return { allowed: true, isPro: true };
  const result = await consumeFreeUse(request.auth.uid, "routeOptimizationUses");
  if (!result.allowed) throw new HttpsError("permission-denied", "Your 3 free route optimisations are used. Upgrade to Pro.");
  return { allowed: true, isPro: false, used: result.used, remaining: Math.max(0, 3 - result.used) };
});

// Creates a Stripe Checkout session for Stop Tracker Pro. Price IDs are
// deliberately configuration, not secrets, so monthly/annual products can be
// changed without shipping private credentials to the client.
exports.createProCheckout = onCall(
  { secrets: [STRIPE_SECRET_KEY], cors: true, invoker: "public" },
  async (request) => {
    if (!request.auth) throw new HttpsError("unauthenticated", "You must be signed in.");

    const plan =
      request.data?.plan === "annual" ? "annual" :
      request.data?.plan === "monthly" ? "monthly" :
      null;
    if (!plan) throw new HttpsError("invalid-argument", "Choose monthly or annual.");

    const origin = trustedAppOrigin(request.data?.origin);
    const lookupKey = plan === "annual"
      ? "stop_tracker_pro_annual"
      : "stop_tracker_pro_monthly";

    try {
      const prices = await stripeGet("prices", {
        "lookup_keys[]": lookupKey,
        active: true,
        limit: 1
      });
      const priceId = prices.data?.[0]?.id;
      if (!priceId) {
        throw new HttpsError("failed-precondition", "This Pro plan is not configured in Stripe.");
      }

      const userRef = admin.firestore().collection("users").doc(request.auth.uid);
      const snap = await userRef.get();
      const user = snap.data() || {};
      const customerId = typeof user.stripeCustomerId === "string" ? user.stripeCustomerId : "";
      const email = request.auth.token.email || user.email || "";

      const baseParams = {
        mode: "subscription",
        "line_items[0][price]": priceId,
        "line_items[0][quantity]": 1,
        success_url: `${origin}/app/profile?billing=success&session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${origin}/app/profile?billing=cancelled`,
        client_reference_id: request.auth.uid,
        "metadata[firebaseUid]": request.auth.uid,
        "subscription_data[metadata][firebaseUid]": request.auth.uid,
      };

      let session;
      try {
        session = await stripePost("checkout/sessions", {
          ...baseParams,
          ...(customerId ? { customer: customerId } : { customer_email: email })
        });
      } catch (firstError) {
        // A stale customer ID should never strand a user. Retry once and let
        // Checkout create/attach the customer from the authenticated email.
        if (!customerId) throw firstError;
        console.warn("Retrying Stripe Checkout without saved customer:", firstError.stripeCode || firstError.status || "unknown");
        session = await stripePost("checkout/sessions", {
          ...baseParams,
          customer_email: email
        });
      }

      if (!session?.url) {
        throw new Error("Stripe Checkout did not return a URL.");
      }
      return { url: session.url };
    } catch (err) {
      if (err instanceof HttpsError) throw err;
      console.error("Stripe Checkout failed:", {
        status: err?.status || null,
        type: err?.stripeType || null,
        code: err?.stripeCode || null,
        message: err?.message || "unknown"
      });

      if (err?.status === 401 || err?.stripeType === "invalid_request_error" && /api key/i.test(err?.message || "")) {
        throw new HttpsError("failed-precondition", "Stripe test billing is not configured correctly yet.");
      }
      throw new HttpsError("internal", "Could not open Stripe Checkout. Please try again.");
    }
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
    const origin = trustedAppOrigin(request.data?.origin);
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
