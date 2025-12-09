// api/generate-vip1.js — VIP style #1 (broken gravity room)
// Uses FLUX-Kontext-Pro (Replicate)
// Цель: ТОТ ЖЕ ЧЕЛОВЕК, лёгкое улучшение + спец-сцена с гравитацией,
// без чужих лиц, без рамок и надписей.

import Replicate from "replicate";

// Base VIP prompt: identity + beauty + gravity scene
const VIP_BASE_PROMPT = [
  // ЛИЧНОСТЬ: максимально прижимаем к исходному фото
  "ultra realistic portrait of the SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different model",
  "keep EXACT facial identity: same head shape, same face shape, same nose, eyes, lips, jawline and head proportions as in the reference",
  "same gender, same ethnicity, same approximate age, do NOT turn them into a teenager or a much older person",
  "do NOT change bone structure, do NOT replace the face, do NOT swap to another person",
  "hair style stays very close to the reference photo, only slightly cleaned up if needed, no totally new haircut",
  "head size relative to the body stays the same as in the reference, do NOT make a bigger or smaller head",

  // КРАСОТА: только мягкая косметика
  "subtle BEAUTY IMPROVEMENT ONLY: gently reduce eye bags and puffiness, reduce dark circles, soften small wrinkles",
  "slightly more even and healthy skin tone, reduce redness and blemishes, keep real skin texture and pores, no plastic or doll-like skin",
  "no extreme smoothing, no over-beauty filters, it must look like a real person",
  "soft, flattering cinematic lighting on the face, not harsh, not flat",
  "calm, confident or slightly thoughtful expression, not angry and not overly sad",

  // ОДЕЖДА
  "outfit can be slightly upgraded but still realistic and believable for this person",
  "clean, well-fitting clothes that match the scene, no flashy costumes unless implied by the scene",

  // СЦЕНА VIP #1 — ЛОМАЮЩАЯСЯ ГРАВИТАЦИЯ
  "they are in a large spacious room where gravity is subtly broken",
  "background is a deep endless space or hall fading softly into darkness, no visible walls touching the head, no frames",
  "small glowing particles, dust and light papers slowly floating in mid-air around them",
  "a glowing pool or circle of light in front of them on the table or floor, casting soft cinematic light from below",
  "hair reacts slightly to the strange gravity, gently moving or lifting a little",
  "overall mood: cinematic, slightly surreal but still realistic and grounded",
  "high resolution, premium portrait photography, shallow depth of field, background softly blurred",

  // ЗАПРЕТЫ НА ТЕКСТ/РАМКИ
  "no text, no captions, no dates, no watermarks, no UI elements, no phone screenshots inside the image",
  "no borders, no frames, no Polaroid layout, just a clean full-screen portrait composition"
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

// Поздравления (если совмещаешь VIP + открытку)
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