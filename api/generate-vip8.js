// api/generate-vip8.js — VIP стиль #8: Art Timeline Wall
// FLUX-Kontext-Pro (Replicate)

import Replicate from "replicate";

// VIP #8 — человек перед стеной из истории искусства
const VIP_BASE_PROMPT = [
  "composite portrait of the SAME person as in the input photo, standing or slightly turned in front of a wall",
  "keep clear and stable facial identity: same face shape, nose, eyes, lips, jawline and head proportions",
  "same gender, same ethnicity, same approximate age",
  "do NOT replace their face with any other random model or actor",
  "do NOT drastically change bone structure or make them unrecognisable",
  "subtle natural beauty improvement only: smoother and more even skin tone, soften harsh eye bags and deep blemishes, keep real pores and skin texture",

  "behind them is a large wall made of vertical panels from different eras of human art",
  "some panels look like ancient stone carvings or reliefs",
  "some panels resemble renaissance oil painting fragments",
  "some panels show old film frames or vintage photography",
  "some panels are digital glitch screens and modern abstract visuals",
  "from left to right the background gradually changes style like a timeline of human art history",

  "the person remains realistic and consistent in front of this wall, lit by soft museum-like gallery light",
  "lighting is calm and elegant, with gentle shadows and a premium art photography feel",
  "clothing is newly generated, tasteful and neutral outfit that fits an art gallery setting, not the original t-shirt",
  "overall mood: poetic, slightly surreal, very refined, high-end art portrait ready to be printed"
].join(", ");

// Общие эффекты кожи / мимики
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

// Общие поздравления (если совмещаем с открытками)
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
    console.error("VIP#8 GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}
