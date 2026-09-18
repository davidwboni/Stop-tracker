const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const Anthropic = require("@anthropic-ai/sdk");

admin.initializeApp();

const ANTHROPIC_API_KEY = defineSecret("ANTHROPIC_API_KEY");

const firestore = admin.firestore();

async function getServerEntitlement(request) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "You must be signed in.");
  }

  const uid = request.auth.uid;
  const provider = request.auth.token?.firebase?.sign_in_provider;
  const snap = await firestore.doc(`users/${uid}`).get();
  const storedRole = snap.exists ? snap.data()?.role : null;
  const role = storedRole || (provider === "anonymous" ? "guest" : "free");

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
        "Daily AI usage limit reached. Please try again tomorrow."
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
  { secrets: [ANTHROPIC_API_KEY], cors: true, invoker: "public", memory: "512MiB", timeoutSeconds: 120 },
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

    // Paid model calls are quota-controlled on the server. Anonymous accounts
    // receive a deliberately small allowance to stop bot-created guest accounts
    // from burning AI credits; signed-in users get more room during beta.
    await enforceDailyQuota(
      request,
      fileBase64 ? "pay_structure_document_ai" : "pay_structure_text_ai",
      fileBase64
        ? { guest: 1, free: 3, pro: 20 }
        : { guest: 3, free: 10, pro: 50 }
    );

    if (fileBase64) {
      const supportedMimeTypes = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "image/gif",
      ];
      if (!supportedMimeTypes.includes(mimeType)) {
        throw new HttpsError("invalid-argument", "Unsupported rate-sheet file type.");
      }

      // Base64 is ~4/3 the source file size. Keep callable payloads comfortably
      // below platform request limits and fail with a useful message.
      if (fileBase64.length > 11 * 1024 * 1024) {
        throw new HttpsError(
          "invalid-argument",
          "That rate sheet is too large. Use a smaller PDF or a clear screenshot."
        );
      }
    }

    const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY.value() });

    const content = [];
    if (fileBase64 && mimeType) {
      if (mimeType === "application/pdf") {
        content.push({
          type: "document",
          source: { type: "base64", media_type: "application/pdf", data: fileBase64 },
        });
      } else {
        content.push({
          type: "image",
          source: { type: "base64", media_type: mimeType, data: fileBase64 },
        });
      }
    }
    content.push({
      type: "text",
      text: text
        ? `Here is how I get paid:\n\n${text}`
        : "Here is my pay-rate sheet. Interpret it into the JSON config.",
    });

    // Tier the model to the input: a dense rate-sheet grid is vision-critical
    // (Sonnet 5), while a plain text description is simple extraction (Haiku).
    const model = fileBase64 ? "claude-sonnet-5" : "claude-haiku-4-5";

    let message;
    try {
      const createParams = {
        model,
        max_tokens: 16000,
        system: PAY_SYSTEM_PROMPT,
        messages: [{ role: "user", content }],
      };
      // Sonnet 5 turns on adaptive thinking by default, which would consume the
      // token budget and truncate a large rate-grid transcription mid-JSON.
      // Disable it — this is deterministic extraction, not reasoning.
      if (fileBase64) createParams.thinking = { type: "disabled" };
      message = await client.messages.create(createParams);
    } catch (err) {
      console.error("Anthropic call failed:", err);
      throw new HttpsError("internal", "Could not interpret the pay structure. Please try again.");
    }

    if (message.stop_reason === "max_tokens") {
      console.error("Output truncated (max_tokens) for model", model);
      throw new HttpsError(
        "internal",
        "That rate sheet is very large to read in one go. Try a clearer single-page image, or type your key rates instead."
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
