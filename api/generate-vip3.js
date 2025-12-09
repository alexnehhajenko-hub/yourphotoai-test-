// api/generate-vip3.js — VIP стиль #3: Время (моложе ↔ старше)
// FLUX-Kontext-Pro (Replicate)

import Replicate from "replicate";

// VIP #3 — одно лицо, слева моложе, справа старше
const VIP_BASE_PROMPT = [
  "surreal realistic split portrait of the SAME person as in the input photo, facing the camera",
  "the LEFT side of the face shows a clearly younger version of this SAME person",
  "the RIGHT side of the face shows an older version of this SAME person",
  "no hard border in the middle, smooth continuous time gradient from young to old",
  "delicate aging details only: softer skin and fuller cheeks on the young side, more wrinkles and skin texture on the old side",
  "keep exact facial identity and bone structure across both sides",
  "same gender, same ethnicity, same overall personality",
  "do NOT replace their face with another person's face",
  "do NOT change the main head proportions or turn them into a model from stock photos",
  "subtle natural beauty improvement on both sides: reduce harsh blemishes, keep real skin pores and natural texture",
  "background with soft blurred clocks and city lights hinting at passing time",
  "cinematic lighting, ultra detailed skin, high-end editorial photography"
].join(", ");

// Общие эффекты (кожа/мимика)
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

// Общие поздравления (если комбинируем с открытками)
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting portrait, glowing warm lights, snow, elegant russian handwritten greeting text on the image",
  birthday:
    "birthday greeting portrait, balloons, confetti, festive composition, elegant russian handwritten birthday greeting text on the image",
  funny:
    "playful humorous greeting portrait, bright colors, fun composition, creative russian handwritten funny greeting text on the image",
  scary:
    "dark horror themed greeting portrait, spooky lighting, eerie atmosphere, creepy russian handwritten horror greeting text on the image"
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

    // Эффекты
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // Поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // Итоговый prompt
    const promptParts = [VIP_BASE_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

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

    return res.status(200).json({ ok: true, image: imageUrl });
  } catch (err) {
    console.error("VIP#3 GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}
