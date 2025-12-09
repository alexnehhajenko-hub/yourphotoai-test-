// api/generate-vip1-pipeline.js
// VIP #1: автоматический pipeline
// Шаг 1 — реставрация лица (restore-image)
// Шаг 2 — VIP-гравитация (FLUX-Kontext-Pro)

import Replicate from "replicate";

// --- VIP PROMPT (тот же человек + ломанная гравитация) ---

const VIP_GRAVITY_PROMPT = [
  "highly realistic portrait of the SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different model",
  "keep exact facial identity: same face shape, nose, eyes, lips, jawline and head proportions",
  "same gender, same ethnicity, same overall personality",
  "age stays similar (no more than about 5–10 years younger), do NOT turn them into a teenager or a completely different age",
  "subtle BEAUTY IMPROVEMENT ONLY: remove eye bags and puffiness, reduce dark circles, smooth small wrinkles, slightly slimmer cheeks if needed",
  "keep realistic skin texture and pores, no plastic skin, no doll face",
  "do NOT change bone structure or completely change the face",
  "do NOT replace their face with another person's face",
  "they must be clearly recognisable as the same person in real life",

  "set in a room where gravity is subtly broken",
  "hair gently flows slightly upward, following strange gravity",
  "small objects and dust around them softly floating in mid-air",
  "coffee or tea splashes sideways, frozen in motion",

  "new outfit matching the surreal scene, not the original casual t-shirt, stylish but realistic clothes",

  "main light source is a glowing pool of light on the floor or table, casting soft cinematic light from below",
  "soft cinematic colors, slightly surreal but still realistic photo"
].join(", ");

// Эффекты кожи + мимика (как и в обычных VIP)
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

// --- ВСПОМОГАТЕЛЬНО: вытаскиваем URL из ответа Replicate ---

function extractImageUrl(output) {
  if (Array.isArray(output)) {
    return output[0];
  }
  if (output?.output) {
    if (Array.isArray(output.output)) return output.output[0];
    if (typeof output.output === "string") return output.output;
  }
  if (typeof output === "string") {
    return output;
  }
  if (output?.url) {
    try {
      return output.url();
    } catch {
      return null;
    }
  }
  return null;
}

// --- ОСНОВНОЙ ХЕНДЛЕР ---

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  const replicate = new Replicate({
    auth: process.env.REPLICATE_API_TOKEN
  });

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
    if (!photo) {
      return res.status(400).json({ error: "photo is required" });
    }

    const userPrompt = (text || "").trim();

    // 1) Сначала РЕСТАВРАЦИЯ (чистим лицо, но не меняем черты)
    // Здесь используем flux-kontext-apps/restore-image (можешь заменить на свою модель реставрации)
    const restoreInput = {
      image: photo
      // при необходимости можно добавить режимы: mode: "restore_and_colorize" и т.п.
    };

    const restoreOutput = await replicate.run(
      "flux-kontext-apps/restore-image",
      { input: restoreInput }
    );

    const restoredImageUrl = extractImageUrl(restoreOutput);
    if (!restoredImageUrl) {
      return res.status(500).json({
        error: "Failed to restore image"
      });
    }

    // 2) Потом VIP-гравитация по ОЧИЩЕННОМУ фото
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const promptParts = [VIP_GRAVITY_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const finalPrompt = promptParts.join(". ").trim();

    const genInput = {
      prompt: finalPrompt,
      output_format: "jpg",
      input_image: restoredImageUrl
    };

    const genOutput = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input: genInput }
    );

    const finalImageUrl = extractImageUrl(genOutput);
    if (!finalImageUrl) {
      return res.status(500).json({
        error: "No image URL returned from VIP generation"
      });
    }

    return res.status(200).json({
      ok: true,
      image: finalImageUrl,
      // опционально можно вернуть и промежуточную реставрацию, если захочешь показывать:
      restored: restoredImageUrl
    });
  } catch (err) {
    console.error("VIP#1 PIPELINE ERROR:", err);
    return res.status(500).json({
      error: "VIP pipeline generation failed",
      details: err?.message || String(err)
    });
  }
}
