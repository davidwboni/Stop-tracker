const crypto = require("crypto");
const functions = require("firebase-functions/v1");
const admin = require("firebase-admin");
const { onCall, onRequest, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret, defineString } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

admin.initializeApp();

const DEEPSEEK_API_KEY = defineSecret("DEEPSEEK_API_KEY");
const GOOGLE_ROUTES_API_KEY = defineSecret("GOOGLE_ROUTES_API_KEY");
const STRIPE_SECRET_KEY = defineSecret("STRIPE_SECRET_KEY");
const STRIPE_WEBHOOK_SECRET = defineSecret("STRIPE_WEBHOOK_SECRET");
const STRIPE_PRO_PRICE_ID = defineString("STRIPE_PRO_PRICE_ID");
const APP_BASE_URL = defineString("APP_BASE_URL");

const firestore = admin.firestore();

async function getServerEntitlement(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const uid = request.auth.uid;
  const provider = request.auth.token?.firebase?.sign_in_provider;
  const snap = await firestore.doc(`users/${uid}`).get();
  const storedRole = snap.exists ? snap.data()?.role : null;
  // Auth provider is authoritative for anonymous sessions, including legacy
  // guest profiles that may have been accidentally written as "free".
  const role = provider === "anonymous" ? "guest" : (storedRole || "free");

  return {
    uid,
    role,
    isPro: role === "pro",
    isGuest: role === "guest" || provider === "anonymous",
  };
}

async function enforceDailyQuota(request, feature, limits) {
  const entitlement = await getServerEntitlement(request);
  const limit = entitlement.isPro
    ? limits.pro
    : entitlement.isGuest
      ? limits.guest
      : limits.free;

  const day = new Date().toISOString().slice(0, 10);
  const usageRef = firestore.doc(
    `internalUsage/${entitlement.uid}/daily/${day}_${feature}`
  );

  await firestore.runTransaction(async (tx) => {
    const usageSnap = await tx.get(usageRef);
    const count = usageSnap.exists ? Number(usageSnap.data()?.count || 0) : 0;

    if (count >= limit) {
      throw new HttpsError(
        "resource-exhausted",
        "Daily usage limit reached. Please try again tomorrow."
      );
    }

    tx.set(
      usageRef,
      {
        count: count + 1,
        feature,
        day,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
  });

  return entitlement;
}

exports.getEntitlements = onCall({ cors: true, invoker: "public" }, async (request) => {
  const entitlement = await getServerEntitlement(request);
  return {
    plan: entitlement.isPro ? "pro" : "free",
    isGuest: entitlement.isGuest,
    features: {
      manualTracking: true,
      manualCheckPay: true,
      routeOptimization: entitlement.isPro,
      aiStatementScan: entitlement.isPro,
    },
  };
});

exports.optimizeRoutePro = onCall(
  {
    secrets: [GOOGLE_ROUTES_API_KEY],
    cors: true,
    invoker: "public",
    timeoutSeconds: 30,
  },
  async (request) => {
    const entitlement = await getServerEntitlement(request);
    if (!entitlement.isPro) {
      throw new HttpsError(
        "permission-denied",
        "Road-aware route optimisation is a Stop Tracker Pro feature."
      );
    }

    await enforceDailyQuota(request, "route_optimization", {
      guest: 0,
      free: 0,
      pro: 200,
    });

    const addresses = request.data?.addresses;
    if (!Array.isArray(addresses) || addresses.length < 2 || addresses.length > 25) {
      throw new HttpsError(
        "invalid-argument",
        "Provide between 2 and 25 stops with valid coordinates."
      );
    }

    const validCoordinate = (value, min, max) =>
      typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;

    const sanitized = addresses.map((item, index) => {
      const latitude = Number(item?.latitude);
      const longitude = Number(item?.longitude);
      if (!validCoordinate(latitude, -90, 90) || !validCoordinate(longitude, -180, 180)) {
        throw new HttpsError(
          "invalid-argument",
          `Stop ${index + 1} has invalid coordinates.`
        );
      }
      return { latitude, longitude };
    });

    const origin = sanitized[0];
    const destination = sanitized[sanitized.length - 1];
    const intermediates = sanitized.slice(1, -1);

    const response = await fetch(
      "https://routes.googleapis.com/directions/v2:computeRoutes",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": GOOGLE_ROUTES_API_KEY.value(),
          "X-Goog-FieldMask": [
            "routes.optimizedIntermediateWaypointIndex",
            "routes.distanceMeters",
            "routes.duration",
          ].join(","),
        },
        body: JSON.stringify({
          origin: { location: { latLng: origin } },
          destination: { location: { latLng: destination } },
          intermediates: intermediates.map((item) => ({
            location: { latLng: item },
          })),
          travelMode: "DRIVE",
          optimizeWaypointOrder: true,
          routingPreference: "TRAFFIC_AWARE",
        }),
      }
    );

    if (!response.ok) {
      console.error("Google Routes API error:", response.status);
      throw new HttpsError(
        "unavailable",
        "Route optimisation is temporarily unavailable."
      );
    }

    const data = await response.json();
    const route = data.routes?.[0];
    if (!route) {
      throw new HttpsError("not-found", "No drivable route was found.");
    }

    const durationSeconds =
      parseInt(String(route.duration || "0").replace("s", ""), 10) || 0;

    return {
      optimizedIntermediateWaypointIndex:
        route.optimizedIntermediateWaypointIndex ||
        intermediates.map((_, index) => index),
      totalDistanceKm: Number(route.distanceMeters || 0) / 1000,
      totalDurationMin: Math.ceil(durationSeconds / 60),
    };
  }
);


async function stripePost(path, params = {}) {
  const body = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      body.append(key, String(value));
    }
  });

  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body,
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Stripe API error:", response.status, payload?.error?.type || "unknown");
    throw new HttpsError("unavailable", "Billing is temporarily unavailable.");
  }
  return payload;
}

async function stripeGet(path) {
  const response = await fetch(`https://api.stripe.com/v1/${path}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${STRIPE_SECRET_KEY.value()}`,
    },
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    console.error("Stripe API read error:", response.status, payload?.error?.type || "unknown");
    throw new HttpsError("unavailable", "Billing is temporarily unavailable.");
  }
  return payload;
}

exports.createProCheckoutSession = onCall(
  {
    secrets: [STRIPE_SECRET_KEY],
    cors: true,
    invoker: "public",
    timeoutSeconds: 30,
  },
  async (request) => {
    const entitlement = await getServerEntitlement(request);
    if (entitlement.isGuest) {
      throw new HttpsError(
        "failed-precondition",
        "Create a free account before upgrading to Pro."
      );
    }
    if (entitlement.isPro) {
      return { alreadyPro: true };
    }

    await enforceDailyQuota(request, "billing_checkout", {
      guest: 0,
      free: 5,
      pro: 5,
    });

    const priceId = STRIPE_PRO_PRICE_ID.value();
    const appBaseUrl = APP_BASE_URL.value().replace(/\/$/, "");
    if (!priceId || !/^price_/.test(priceId) || !/^https:\/\//.test(appBaseUrl)) {
      throw new HttpsError(
        "failed-precondition",
        "Billing is not configured yet."
      );
    }

    const userRef = firestore.doc(`users/${entitlement.uid}`);
    const userSnap = await userRef.get();
    const userData = userSnap.exists ? userSnap.data() : {};
    let customerId = userData?.stripeCustomerId;

    // Do not trust a legacy Firestore billing ID blindly. Verify Stripe metadata
    // ties the customer to this Firebase user before using it.
    if (customerId) {
      const storedCustomer = await stripeGet(`customers/${encodeURIComponent(customerId)}`);
      if (
        storedCustomer?.deleted ||
        storedCustomer?.metadata?.firebaseUid !== entitlement.uid
      ) {
        customerId = null;
      }
    }

    if (!customerId) {
      const customer = await stripePost("customers", {
        email: request.auth.token?.email || userData?.email || undefined,
        "metadata[firebaseUid]": entitlement.uid,
      });
      customerId = customer.id;
      await userRef.set(
        {
          stripeCustomerId: customerId,
          billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );
    }

    const session = await stripePost("checkout/sessions", {
      mode: "subscription",
      customer: customerId,
      "line_items[0][price]": priceId,
      "line_items[0][quantity]": 1,
      client_reference_id: entitlement.uid,
      "metadata[firebaseUid]": entitlement.uid,
      "subscription_data[metadata][firebaseUid]": entitlement.uid,
      success_url: `${appBaseUrl}/app/profile?upgrade=success`,
      cancel_url: `${appBaseUrl}/app/upgrade?upgrade=cancelled`,
      allow_promotion_codes: "true",
    });

    if (!session?.url) {
      throw new HttpsError("internal", "Could not start checkout.");
    }
    return { url: session.url };
  }
);

exports.createBillingPortalSession = onCall(
  {
    secrets: [STRIPE_SECRET_KEY],
    cors: true,
    invoker: "public",
    timeoutSeconds: 30,
  },
  async (request) => {
    const entitlement = await getServerEntitlement(request);
    if (entitlement.isGuest) {
      throw new HttpsError("failed-precondition", "Sign in to manage billing.");
    }

    await enforceDailyQuota(request, "billing_portal", {
      guest: 0,
      free: 10,
      pro: 20,
    });

    const appBaseUrl = APP_BASE_URL.value().replace(/\/$/, "");
    const userSnap = await firestore.doc(`users/${entitlement.uid}`).get();
    const customerId = userSnap.exists ? userSnap.data()?.stripeCustomerId : null;
    if (!customerId || !/^https:\/\//.test(appBaseUrl)) {
      throw new HttpsError("failed-precondition", "Billing is not configured for this account.");
    }

    const customer = await stripeGet(`customers/${encodeURIComponent(customerId)}`);
    if (customer?.deleted || customer?.metadata?.firebaseUid !== entitlement.uid) {
      throw new HttpsError("permission-denied", "Billing account ownership could not be verified.");
    }

    const session = await stripePost("billing_portal/sessions", {
      customer: customerId,
      return_url: `${appBaseUrl}/app/profile`,
    });

    if (!session?.url) {
      throw new HttpsError("internal", "Could not open billing management.");
    }
    return { url: session.url };
  }
);

function verifyStripeWebhook(rawBody, signatureHeader) {
  if (!rawBody || !signatureHeader) return false;

  const parts = String(signatureHeader).split(",");
  const timestampPart = parts.find((part) => part.startsWith("t="));
  const signatures = parts
    .filter((part) => part.startsWith("v1="))
    .map((part) => part.slice(3));
  const timestamp = Number(timestampPart?.slice(2));
  if (!timestamp || signatures.length === 0) return false;

  // Stripe recommends a five-minute tolerance for replay protection.
  if (Math.abs(Date.now() / 1000 - timestamp) > 300) return false;

  const body = Buffer.isBuffer(rawBody) ? rawBody.toString("utf8") : String(rawBody);
  const expected = crypto
    .createHmac("sha256", STRIPE_WEBHOOK_SECRET.value())
    .update(`${timestamp}.${body}`, "utf8")
    .digest("hex");

  return signatures.some((signature) => {
    const a = Buffer.from(expected, "utf8");
    const b = Buffer.from(signature, "utf8");
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  });
}

exports.stripeWebhook = onRequest(
  {
    secrets: [STRIPE_WEBHOOK_SECRET],
    cors: false,
    timeoutSeconds: 30,
  },
  async (request, response) => {
    if (request.method !== "POST") {
      response.status(405).send("Method not allowed");
      return;
    }

    if (!verifyStripeWebhook(request.rawBody, request.headers["stripe-signature"])) {
      response.status(400).send("Invalid signature");
      return;
    }

    const event = request.body || {};
    const object = event?.data?.object || {};

    try {
      if (event.type === "checkout.session.completed") {
        const uid = object?.metadata?.firebaseUid || object?.client_reference_id;
        if (uid) {
          await firestore.doc(`users/${uid}`).set(
            {
              role: "pro",
              stripeCustomerId: object.customer || null,
              stripeSubscriptionId: object.subscription || null,
              billingStatus: "active",
              billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }

      if (
        event.type === "customer.subscription.created" ||
        event.type === "customer.subscription.updated" ||
        event.type === "customer.subscription.deleted"
      ) {
        const uid = object?.metadata?.firebaseUid;
        if (uid) {
          const active =
            event.type !== "customer.subscription.deleted" &&
            ["active", "trialing"].includes(object.status);
          await firestore.doc(`users/${uid}`).set(
            {
              role: active ? "pro" : "free",
              stripeSubscriptionId: object.id || null,
              billingStatus: object.status || (active ? "active" : "inactive"),
              billingUpdatedAt: admin.firestore.FieldValue.serverTimestamp(),
            },
            { merge: true }
          );
        }
      }

      response.status(200).json({ received: true });
    } catch (error) {
      console.error("Stripe webhook handler failed:", error);
      response.status(500).send("Webhook handler failed");
    }
  }
);

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
  // auth, entitlement and quota checks still happen below.
  { secrets: [DEEPSEEK_API_KEY], cors: true, invoker: "public", memory: "512MiB", timeoutSeconds: 120 },
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "You must be signed in.");
    }

    const { text, fileBase64, mimeType } = request.data || {};
    if (!text && !fileBase64) {
      throw new HttpsError("invalid-argument", "Provide a description or a file.");
    }

    if (typeof text === "string" && text.length > 12000) {
      throw new HttpsError(
        "invalid-argument",
        "That description is too long. Please shorten it and try again."
      );
    }

    // Anonymous Firebase accounts are trivial for bots to create, so AI is
    // reserved for signed-in accounts. Free users still get a bounded allowance.
    const initialEntitlement = await getServerEntitlement(request);
    if (initialEntitlement.isGuest) {
      throw new HttpsError(
        "permission-denied",
        "Sign in with a free account to use AI setup."
      );
    }

    const entitlement = await enforceDailyQuota(
      request,
      fileBase64 ? "pay_structure_image_ai" : "pay_structure_text_ai",
      fileBase64
        ? { guest: 0, free: 3, pro: 20 }
        : { guest: 0, free: 10, pro: 50 }
    );

    if (fileBase64) {
      const supportedMimeTypes = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!supportedMimeTypes.includes(mimeType)) {
        throw new HttpsError(
          "invalid-argument",
          "DeepSeek currently accepts rate-sheet images only. Use a JPG, PNG, WEBP or GIF screenshot/photo."
        );
      }

      // Base64 is ~4/3 the source file size. Keep callable payloads comfortably
      // below platform request limits and fail with a useful message.
      if (fileBase64.length > 11 * 1024 * 1024) {
        throw new HttpsError(
          "invalid-argument",
          "That rate sheet is too large. Use a smaller or clearer screenshot/photo."
        );
      }
    }

    // DeepSeek exposes an Anthropic-compatible endpoint, so we keep the mature
    // SDK transport while the credential and model are both DeepSeek.
    const client = new Anthropic({
      apiKey: DEEPSEEK_API_KEY.value(),
      baseURL: "https://api.deepseek.com/anthropic",
    });

    const content = [];
    if (fileBase64 && mimeType) {
      content.push({
        type: "image",
        source: { type: "base64", media_type: mimeType, data: fileBase64 },
      });
    }
    content.push({
      type: "text",
      text: text
        ? `Here is how I get paid:\n\n${text}`
        : "Here is a screenshot/photo of my pay-rate sheet. Interpret it into the JSON config.",
    });

    // V4.1 Flash is DeepSeek's current low-cost multimodal model. This task is
    // structured extraction, so thinking mode is deliberately disabled below.
    const model = "deepseek-flash";

    let message;
    try {
      const createParams = {
        model,
        max_tokens: 16000,
        system: PAY_SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
        // Pseudonymous isolation only: never send an email, name or raw Firebase UID.
        metadata: {
          user_id: crypto.createHash("sha256").update(entitlement.uid).digest("hex"),
        },
      };
      // DeepSeek thinking is enabled by default. Disable it for deterministic,
      // lower-cost transcription where our own calculator verifies the result.
      createParams.thinking = { type: "disabled" };
      message = await client.messages.create(createParams);
    } catch (err) {
      console.error("DeepSeek call failed:", err);
      throw new HttpsError("internal", "Could not interpret the pay structure. Please try again.");
    }

    if (message.stop_reason === "max_tokens") {
      console.error("Output truncated (max_tokens) for model", model);
      throw new HttpsError(
        "internal",
        "That rate sheet is very large to read in one go. Try a clearer single screenshot, or type your key rates instead."
      );
    }

    const raw = (message.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();

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
      console.error("Failed to parse model output:", raw);
      throw new HttpsError("internal", "The interpreter returned an unexpected format. Please reword and try again.");
    }

    const VALID = ["tiered_stops", "flat_stops", "per_mile", "hourly", "per_day", "sliding_scale"];
    if (!parsed.config || !VALID.includes(parsed.config.model)) {
      throw new HttpsError("internal", "Could not determine a pay model. Please describe it differently.");
    }

    const cfg = parsed.config;
    const finite = (v) => typeof v === "number" && Number.isFinite(v) && v >= 0;

    if (cfg.model === "sliding_scale") {
      const validBands =
        Array.isArray(cfg.stopBands) &&
        cfg.stopBands.length > 0 &&
        cfg.stopBands.every(finite) &&
        Array.isArray(cfg.mileBands) &&
        cfg.mileBands.length > 0 &&
        cfg.mileBands.every(finite);
      const validMatrix =
        Array.isArray(cfg.rateMatrix) &&
        cfg.rateMatrix.length === cfg.stopBands?.length &&
        cfg.rateMatrix.every(
          (row) =>
            Array.isArray(row) &&
            row.length === cfg.mileBands?.length &&
            row.every(finite)
        );
      if (!validBands || !validMatrix) {
        throw new HttpsError(
          "internal",
          "The rate-sheet table could not be read reliably. Try a clearer screenshot or PDF."
        );
      }
    }

    if (cfg.model === "tiered_stops") {
      const validThresholds =
        Array.isArray(cfg.thresholds) &&
        cfg.thresholds.length >= 1 &&
        cfg.thresholds.every(
          (tier) =>
            tier &&
            finite(tier.rate) &&
            (tier.stopCount === undefined || finite(tier.stopCount))
        );
      if (!validThresholds) {
        throw new HttpsError(
          "internal",
          "The stop-rate tiers could not be read reliably. Please reword them and try again."
        );
      }
    }

    return {
      config: parsed.config,
      summary: typeof parsed.summary === "string" ? parsed.summary : "",
      sample: parsed.sample && typeof parsed.sample.quantity === "number" ? parsed.sample : { quantity: 100 },
    };
  }
);

exports.assignRoleOnSignup = functions.auth.user().onCreate(async (user) => {
  try {
    const isAnonymous = !user.email && (!user.providerData || user.providerData.length === 0);
    const role = isAnonymous ? "guest" : "free";
    const userRef = admin.firestore().collection("users").doc(user.uid);

    // Merge so the auth trigger never wipes profile fields written by the app.
    await userRef.set({
      email: user.email || (isAnonymous ? "guest@stoptracker.com" : "No email provided"),
      name: user.displayName || (isAnonymous ? "Guest User" : "Anonymous"),
      role,
      isGuest: isAnonymous,
    }, { merge: true });

    console.log(`User ${user.uid} assigned default role: ${role}`);
  } catch (error) {
    console.error(`Error assigning role for user ${user.uid}:`, error);
  }
});
