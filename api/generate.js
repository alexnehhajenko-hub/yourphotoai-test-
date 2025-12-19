// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / эффекты кожи / мимика / поздравления (НО БЕЗ ЛЮБОГО ТЕКСТА НА ИЗОБРАЖЕНИИ)

import Replicate from "replicate";

// ───────────── СТИЛИ ─────────────
const STYLE_PREFIX = {
  beauty:
    "high-end beauty portrait, flattering soft studio lighting, natural skin, realistic, professional photo look, keep the same person",
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, keep the same person",
  anime:
    "anime style portrait, clean line art, soft pastel shading, expressive eyes, keep the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, keep the same person",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, subtle vignette, keep the same person",

  // 🔹 ВИНТАЖ / СТАРОЕ ФОТО (это не реставрация, это стиль)
  "old-photo":
    "vintage old photo portrait, slightly faded colors, soft warm tone, subtle film grain, gentle vignette, keep the same person",

  // 🔥 ТЁМНЫЙ ДЕМОН (без крови/жести)
  "dark-demon":
    "dark fantasy portrait of the same person, dramatic moody lighting, strong contrast, subtle demonic vibe (very small horns OR subtle aura), cinematic atmosphere, no blood, no gore, keep recognizable face",

  default:
    "realistic portrait, detailed face, soft studio lighting, natural colors, keep the same person"
};

// ───────── ЭФФЕКТЫ КОЖИ + МИМИКА ─────────
const EFFECT_PROMPTS = {
  // кожа — усиленные “вау”
  "no-wrinkles":
    "reduce wrinkles noticeably (forehead, under eyes, nasolabial folds) while keeping the same identity, realistic skin texture, no plastic look",
  younger:
    "make the same person look clearly younger by about 10-15 years, fresher rested face, smoother under-eye area, reduced wrinkles, keep the same identity and gender",
  "smooth-skin":
    "smooth and even skin tone, reduce blemishes, keep pores subtle and realistic, no over-smoothing",

  "beauty-one-touch":
    "one-touch beauty retouch: remove acne and small blemishes, reduce fine wrinkles, even skin tone, keep pores realistic, keep exact identity",
  "glow-golden":
    "warm golden glow on the face, healthy skin highlights, gentle soft light, keep identity",
  "cinematic-light":
    "cinematic soft key light and gentle shadows, better contrast, keep identity",

  // мимика
  "smile-soft":
    "same person with a subtle soft smile, calm relaxed expression, do not change facial structure",
  "smile-big":
    "same person with a warm friendly smile, do not change facial structure",
  "smile-hollywood":
    "same person with a wide confident smile, natural teeth, do not change facial structure",
  laugh:
    "same person laughing naturally, joyful expression, do not change facial structure",
  neutral:
    "same person with neutral relaxed face expression",
  serious:
    "same person with serious confident expression, no smile",
  "eyes-bigger":
    "same person with slightly more open attentive eyes, keep identity",
  "eyes-brighter":
    "same person with brighter more vivid gaze, keep identity",
  "surprised-wow":
    "same person with surprised wow expression, eyebrows slightly raised, keep identity"
};

// ───────── ПОЗДРАВЛЕНИЯ (ТОЛЬКО АТМОСФЕРА, БЕЗ ТЕКСТА) ─────────
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year atmosphere, cozy winter mood, colorful lights and bokeh, subtle snow sparkles, but keep it tasteful",
  birthday:
    "birthday celebration mood, balloons and confetti in background, party lights, bright happy atmosphere",
  funny:
    "playful fun vibe, bright colors, light comic-style background details, but still a portrait",
  scary:
    "spooky halloween vibe, cold dramatic lighting, subtle fog and eerie background, no gore"
};

// ───────── ЖЁСТКО ДЕРЖИМ ЛИЧНОСТЬ, НО НЕ МЕШАЕМ ОМОЛОЖЕНИЮ ─────────
const IDENTITY_PROMPT =
  "Edit the input photo of the SAME person. The result must be clearly recognizable as the same person. " +
  "Keep gender and facial identity. Do not replace the face with a different person.";

// ───────── ЧИСТИМ СКРИНШОТЫ ОТ UI ─────────
const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website or app (panels, buttons, captions), remove and repaint all UI elements and produce only a clean portrait photo.";

// ───────── СТРОГО: НИКАКОГО ТЕКСТА НА КАРТИНКЕ ─────────
const NO_TEXT_TAIL =
  "No text, no captions, no words, no watermarks, no logos, no labels on the image.";

// ───────── БЕЗОПАСНОСТЬ ─────────
const SAFETY_TAIL =
  "portrait from shoulders up, person is fully clothed, no nudity, no sexual content, no extra people, correct anatomy";

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

    const { style, text, photo, effects, greeting } = body || {};

    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;
    const userPrompt = (text || "").trim();

    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(". ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const promptParts = [
      stylePrefix,
      effectsPrompt,
      greetingPrompt,
      userPrompt,
      IDENTITY_PROMPT,
      UI_CLEANUP_TAIL,
      NO_TEXT_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

    const prompt = promptParts.join(". ").trim();

    const input = {
      prompt,
      output_format: "jpg"
    };

    if (photo) input.input_image = photo;

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

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
      return res.status(500).json({ error: "No image URL returned", raw: output });
    }

    return res.status(200).json({ ok: true, image: imageUrl, prompt });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}