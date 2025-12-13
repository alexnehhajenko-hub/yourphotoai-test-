// api/generate-vip2.js — VIP стиль #2 (TIME — SAFE)
// FLUX-Kontext-Pro (Replicate)
// Цель: 100% сохранить лицо (один человек, один кадр), добавить "атмосферу времени" БЕЗ split/двух людей.

import Replicate from "replicate";

// VIP #2: TIME SAFE (без split-face, без 2 людей)
const VIP_BASE_PROMPT = [
  // --- IDENTITY LOCKS ---
  "highly realistic portrait of the SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different person",
  "keep exact facial identity: same face shape, eyes, nose, lips, jawline, head proportions",
  "same gender, same ethnicity, same overall personality",
  "age stays similar (max 5–10 years difference), do NOT turn into a teenager",
  "subtle BEAUTY IMPROVEMENT ONLY: remove eye bags/puffiness, reduce dark circles, smooth small wrinkles",
  "even out skin tone slightly, reduce redness/blemishes, keep pores and realistic texture",
  "do NOT change bone structure, do NOT change head size, do NOT change facial proportions",
  "person must be clearly recognisable as the same person",

  // --- CLOTHING (по теме) ---
  "generate new outfit that fits the scene, cinematic wardrobe, realistic fabric",
  "do not keep the original t-shirt unless it fits the cinematic editorial look",

  // --- TIME ATMOSPHERE (SAFE) ---
  "cinematic editorial portrait, calm confident expression",
  "background hints of time: subtle blurred clocks, gentle city lights bokeh, soft abstract timeline shapes",
  "soft directional cinematic lighting, shallow depth of field, 35mm photo feel, subtle film grain",
  "clean infinite background, no UI, no text, no logos, no watermarks",

  // --- HARD NEGATIVES ---
  "NO split face, NO half-young half-old, NO two persons, NO duplicated faces",
  "NO collage, NO diptych, NO side-by-side faces, NO evidence board layout",
  "NO changing identity, NO face swap, NO different person",
  "NO extra heads, NO deformed hands, NO strange artifacts"
].join(", ");

// Доп. эффекты (те же id, что на фронте)
const EFFECT_PROMPTS = {
  "no-wrinkles":
    "fewer visible wrinkles, gentle beauty retouch, keep natural skin texture",
  younger:
    "looks around 5–10 years younger but clearly the same person, fresher and more rested face",
  "smooth-skin":
    "smoother and more even skin tone, reduce blemishes and redness, keep pores and realism",
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide smile with visible teeth, hollywood style, still natural",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed face expression, no strong emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "slightly bigger and more open eyes, but still realistic",
  "eyes-brighter": "brighter eyes, clearer irises, more vivid gaze"
};

// Поздравления (если совмещаете)
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting portrait, warm lights, subtle snow, elegant handwritten greeting text (ENGLISH only)",
  birthday:
    "birthday greeting portrait, balloons, confetti, festive composition, elegant handwritten greeting text (ENGLISH only)",
  funny:
    "playful humorous greeting portrait, bright colors, fun composition, creative handwritten greeting text (ENGLISH only)",
  scary:
    "dark horror themed greeting portrait, spooky lighting, eerie atmosphere, creepy handwritten greeting text (ENGLISH only)"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { text, photo, effects, greeting } = body || {};
    const userPrompt = (text || "").trim();

    // эффекты
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // итоговый prompt
    const promptParts = [VIP_BASE_PROMPT];
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);
    if (userPrompt) promptParts.push(userPrompt);

    const prompt = promptParts.join(". ").trim();

    const input = {
      prompt,
      output_format: "jpg"
    };

    if (photo) {
      input.input_image = photo;
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

    let imageUrl = null;

    if (Array.isArray(output)) {
      imageUrl = output[0];
    } else if (output?.output) {
      if (Array.isArray(output.output)) imageUrl = output.output[0];
      else if (typeof output.output === "string") imageUrl = output.output;
    } else if (typeof output === "string") {
      imageUrl = output;
    } else if (output?.url) {
      try {
        imageUrl = output.url();
      } catch {
        // ignore
      }
    }

    if (!imageUrl) {
      return res.status(500).json({ error: "No image URL returned" });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("VIP2 TIME ERROR:", err);
    return res.status(500).json({
      error: "VIP time generation failed",
      details: err?.message || String(err)
    });
  }
}
