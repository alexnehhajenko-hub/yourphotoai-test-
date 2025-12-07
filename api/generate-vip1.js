// api/generate-vip1.js — VIP стиль #1 (ломающаяся гравитация)
// Использует FLUX-Kontext-Pro (Replicate)
// Сохраняем ТОГО ЖЕ человека, только лучшая версия + спец-сцена

import Replicate from "replicate";

// Базовый VIP-prompt: та же личность + "сломанная гравитация"
const VIP_BASE_PROMPT = [
  "highly realistic portrait of the SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different model",
  "keep exact facial identity: same face shape, nose, eyes, lips, jawline and head proportions",
  "same gender, same ethnicity, same overall personality",
  "age stays similar (no more than about 5–10 years younger), do NOT turn them into a teenager or a completely different age",
  "subtle BEAUTY IMPROVEMENT ONLY: remove eye bags and puffiness, reduce dark circles, smooth small wrinkles, slightly slimmer cheeks if needed",
  "keep realistic skin texture and pores, no plastic skin, no doll face",
  "do NOT change bone structure or completely change the face",
  "they must be clearly recognisable as the same person",

  // сцена VIP #1
  "set in a room where gravity is subtly broken",
  "hair gently flows slightly upward, following strange gravity",
  "small objects and dust around them softly floating in mid-air",
  "coffee or tea splashes sideways, frozen in motion",
  "main light source is a glowing pool of light on the floor, casting soft cinematic light from below",
  "soft cinematic colors, slightly surreal but still realistic photo"
].join(", ");

// Доп. эффекты (можем переиспользовать те же id, что и на фронте)
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

// Поздравления, если захочешь совмещать VIP + открытки
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

    // собираем итоговый prompt
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

    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("VIP GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}
