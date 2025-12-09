// api/generate-vip1-pipeline.js
// VIP-гравитация в 3 шага (face cleanup -> gravity scene -> cinematic polish)
// FLUX-Kontext-Pro (Replicate)

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN
});

// Общий префикс: одно и то же лицо, никакой подмены
const IDENTITY_PREFIX = [
  "ultra realistic portrait of the SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different model",
  "keep exact facial identity: same head shape, nose, eyes, lips, jawline and proportions",
  "same gender, same ethnicity, same overall personality and similar age (at most 5–10 years younger)",
  "keep the same general hairstyle and hairline as in the input, do NOT turn short hair into long hair or the opposite",
  "do NOT change the bone structure or replace the face with someone else",
  "they must be clearly recognisable as the same person in all images"
].join(", ");

// Шаг 1 — мягкая, но заметная чистка лица
const STEP1_FACE_CLEANUP = [
  "subtle but visible beauty retouch",
  "remove eye bags and puffiness",
  "strongly reduce dark circles",
  "smooth small and medium wrinkles while keeping natural skin texture and pores",
  "even skin tone, remove redness and blemishes, no plastic or doll skin",
  "slightly softer and more relaxed expression, but still natural",
  "neutral soft studio background without texture, no props, no text",
  "soft front lighting that flatters the face"
].join(", ");

// Шаг 2 — сцена со сломанной гравитацией
const STEP2_GRAVITY_SCENE = [
  "set in a large endless dark room where gravity is subtly broken",
  "background feels like an infinite deep space with very soft bokeh lights, no walls, no edges, no visible horizon and no text",
  "a bright glowing liquid pool or bowl of light on the table in front of them",
  "stronger reflections of the glowing light on the face and hands",
  "papers, dust and small particles clearly floating in mid-air in front of and behind the person",
  "new clean clothing that fits the scene, elegant and simple, no logos or text, different from the input photo if needed",
  "do not crop the person too tight, show upper body and hands near the glowing pool",
  "no extra faces or people in the background"
].join(", ");

// Шаг 3 — киношный полиш
const STEP3_CINEMATIC_POLISH = [
  "cinematic color grading with warm light from the glowing pool and cooler background",
  "subtle film grain and light vignetting",
  "soft depth of field and bokeh lights in the far background",
  "preserve exactly the same face, hairstyle and composition from the previous image",
  "do not change age, gender, ethnicity or facial features",
  "final premium look ready for high quality printing"
].join(", ");

// Эффекты (кожа + мимика) — те же id, что на фронте
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

// Поздравления, без текстовых надписей
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting mood, warm lights, snow in the background, but no visible text",
  birthday:
    "birthday celebration mood, balloons and confetti in the background, but no visible text",
  funny:
    "playful humorous atmosphere, bright colors and fun composition, but no visible text",
  scary:
    "dark horror themed atmosphere, spooky lighting and eerie background details, but no visible text"
};

// Вспомогательная функция извлечения URL
function extractImageUrl(output) {
  if (!output) return null;

  if (Array.isArray(output)) {
    return typeof output[0] === "string" ? output[0] : null;
  }

  if (typeof output === "string") return output;

  if (output.output) {
    if (Array.isArray(output.output)) {
      return typeof output.output[0] === "string" ? output.output[0] : null;
    }
    if (typeof output.output === "string") return output.output;
  }

  if (output.url && typeof output.url === "string") {
    return output.url;
  }

  return null;
}

// Один вызов FLUX-Kontext-Pro
async function runFluxKontext(input) {
  const raw = await replicate.run("black-forest-labs/flux-kontext-pro", {
    input
  });
  const url = extractImageUrl(raw);
  if (!url) {
    throw new Error("No image URL returned from Replicate");
  }
  return url;
}

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

    const { photo, text, effects, greeting } = body || {};

    if (!photo) {
      return res.status(400).json({ error: "Missing input photo" });
    }

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

    // --- ШАГ 1: ЧИСТИМ ЛИЦО, НЕ МЕНЯЯ ЧЕЛОВЕКА ---

    const step1Prompt = [
      IDENTITY_PREFIX,
      STEP1_FACE_CLEANUP,
      effectsPrompt // кожа/омоложение
    ]
      .filter(Boolean)
      .join(". ");

    const step1ImageUrl = await runFluxKontext({
      prompt: step1Prompt,
      input_image: photo,
      output_format: "jpg"
    });

    // --- ШАГ 2: ГРАВИТАЦИЯ + НОВАЯ ОДЕЖДА ---

    const step2Prompt = [
      IDENTITY_PREFIX,
      STEP2_GRAVITY_SCENE,
      effectsPrompt, // мимика, взгляд
      greetingPrompt,
      userPrompt
    ]
      .filter(Boolean)
      .join(". ");

    const step2ImageUrl = await runFluxKontext({
      prompt: step2Prompt,
      input_image: step1ImageUrl,
      output_format: "jpg"
    });

    // --- ШАГ 3: КИНОШНЫЙ ФИНАЛ ---

    const step3Prompt = [
      IDENTITY_PREFIX,
      STEP3_CINEMATIC_POLISH,
      userPrompt
    ]
      .filter(Boolean)
      .join(". ");

    const finalImageUrl = await runFluxKontext({
      prompt: step3Prompt,
      input_image: step2ImageUrl,
      output_format: "jpg"
    });

    return res.status(200).json({
      ok: true,
      image: finalImageUrl
    });
  } catch (err) {
    console.error("VIP PIPELINE ERROR:", err);
    return res.status(500).json({
      error: "VIP pipeline generation failed",
      details: err?.message || String(err)
    });
  }
}