// api/generate.js
// Vercel Serverless Function: POST /api/generate
// Expects JSON: { imageBase64, prompt, negativePrompt?, aspectRatio?, outputFormat? }
// Returns JSON: { ok: true, imageBase64 } or { ok:false, error }

function setCors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
}

function json(res, status, payload) {
  setCors(res);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

export default async function handler(req, res) {
  try {
    setCors(res);

    if (req.method === "OPTIONS") {
      res.statusCode = 204;
      return res.end();
    }

    if (req.method !== "POST") {
      return json(res, 405, { ok: false, error: "Method not allowed" });
    }

    const apiKey = process.env.STABILITY_API_KEY;
    if (!apiKey) {
      return json(res, 500, { ok: false, error: "STABILITY_API_KEY is not set" });
    }

    const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;

    const imageBase64 = body?.imageBase64;
    const prompt = body?.prompt;
    const negativePrompt = body?.negativePrompt || "";
    const aspectRatio = body?.aspectRatio || "1:1";
    const outputFormat = body?.outputFormat || "png";

    if (!imageBase64 || !prompt) {
      return json(res, 400, {
        ok: false,
        error: "Missing required fields: imageBase64, prompt",
      });
    }

    // imageBase64 may contain data URL prefix: data:image/jpeg;base64,...
    const cleanedBase64 = String(imageBase64).includes("base64,")
      ? String(imageBase64).split("base64,")[1]
      : String(imageBase64);

    const imageBuffer = Buffer.from(cleanedBase64, "base64");

    // Stability (image-to-image) via multipart/form-data
    // NOTE: Endpoint may differ depending on your Stability plan/model.
    const endpoint = "https://api.stability.ai/v2beta/stable-image/generate/sd3";

    const form = new FormData();
    form.append("image", new Blob([imageBuffer]), "photo.png");
    form.append("prompt", prompt);
    if (negativePrompt) form.append("negative_prompt", negativePrompt);
    form.append("output_format", outputFormat);
    form.append("aspect_ratio", aspectRatio);

    const r = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: "application/json",
      },
      body: form,
    });

    const text = await r.text();

    if (!r.ok) {
      return json(res, 500, {
        ok: false,
        error: "Stability API error",
        status: r.status,
        details: text?.slice(0, 1200),
      });
    }

    // Many Stability endpoints return JSON with base64 image in "image" or "artifacts"
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      return json(res, 500, {
        ok: false,
        error: "Failed to parse Stability response as JSON",
        details: text?.slice(0, 1200),
      });
    }

    // Try to extract base64 from common shapes
    const outBase64 =
      data?.image ||
      data?.result?.image ||
      data?.artifacts?.[0]?.base64 ||
      data?.images?.[0]?.base64 ||
      null;

    if (!outBase64) {
      return json(res, 500, {
        ok: false,
        error: "No image in Stability response",
        details: data,
      });
    }

    return json(res, 200, { ok: true, imageBase64: outBase64 });
  } catch (e) {
    return json(res, 500, {
      ok: false,
      error: e?.message || String(e),
    });
  }
}
