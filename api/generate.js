// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Без возврата prompt на фронт

import Replicate from "replicate";

// Стили — подчёркиваем, что это ЛУЧШАЯ ВЕРСИЯ ЭТОГО ЖЕ ЧЕЛОВЕКА
const STYLE_PREFIX = {
  // Главный стиль: улучшенная версия того же человека
  beauty: [
    "highly realistic studio portrait of the SAME person as in the input photo",
    "this is the BEST IMPROVED VERSION of this person, not a different model",
    "keep exact facial identity: same face shape, nose, eyes, lips, jawline and head proportions",
    "same gender, same ethnicity, same overall personality",
    "visible but natural BEAUTY IMPROVEMENT: remove eye bags and puffiness, reduce dark circles, soften wrinkles on face and neck, even out skin tone, slightly slimmer cheeks if needed",
    "keep realistic skin texture and pores, no plastic skin, no doll face",
    "do NOT change bone structure or completely change the face",
    "outfit can change to a nicer, well-fitting style that matches the scene",
    "natural healthy look, gentle flattering light, neutral soft background",
    "they look like themselves on their very best day in real life"
  ].join(", "),

  // Художественная картина маслом
  oil: [
    "oil painting portrait of the SAME person as in the input photo",
    "keep the same face identity and proportions, recognisably the same person",
    "same gender, same ethnicity, similar age",
    "visible but natural beauty improvement and more even skin tone",
    "painterly brush strokes, canvas texture, rich warm colors",
    "outfit can change to match a classic painted portrait style"
  ].join(", "),

  anime: [
    "anime style portrait of the SAME person as in the input photo",
    "translate their recognisable facial features into anime style",
    "same gender and ethnicity, similar age",
    "subtle beauty retouch and smooth skin while keeping their identity",
    "clean lines, soft shading, gentle colors",
    "outfit can change to a simple anime-style outfit"
  ].join(", "),

  poster: [
    "cinematic movie poster portrait of the SAME person as in the input photo",
    "keep the same identity: face shape, eyes, nose, mouth and jaw must match",
    "same gender, same ethnicity, similar age",
    "visible but natural beauty improvement and more even skin tone",
    "dramatic lighting, slightly stylized but still clearly the same person",
    "outfit can change to a stylish movie-poster costume that fits the scene"
  ].join(", "),

  classic: [
    "classical old master realistic portrait of the SAME person as in the input photo",
    "keep the same face, same gender and ethnicity, similar age",
    "gentle beauty retouch: softer wrinkles, smoother skin tone, but the same identity",
    "warm tones, detailed skin, painterly background",
    "outfit can change to a timeless classic portrait outfit"
  ].join(", "),

  default: [
    "realistic portrait of the SAME person as in the input photo",
    "keep exact facial identity and proportions",
    "visible but natural beauty retouch: fewer wrinkles, smoother and more even skin tone",
    "outfit can change to a nicer, well-fitting style that matches the scene",
    "soft studio lighting, neutral background"
  ].join(", ")
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "fewer visible wrinkles on face and neck, gentle beauty retouch, keep natural skin texture",
  younger:
    "looks around 10–15 years younger but clearly the same person, fresher and more rested face, smoother skin",
  "smooth-skin":
    "smoother and more even skin tone, reduce blemishes and redness, keep pores and realism",

  // мимика
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

// Поздравления (без упоминания какой-либо страны, всё на английском)
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting portrait, glowing warm lights, snow, elegant handwritten greeting text on the image",
  birthday:
    "birthday greeting portrait, balloons, confetti, festive composition, elegant handwritten birthday greeting text on the image",
  funny:
    "playful humorous greeting portrait, bright colors, fun composition, creative handwritten funny greeting text on the image",
  scary:
    "dark horror themed greeting portrait, spooky lighting, eerie atmosphere, creepy handwritten horror greeting text on the image"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Парсим тело
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { style, text, photo, effects, greeting } = body || {};

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст (VIP-сцены и т.п.)
    const userPrompt = (text || "").trim();

    // 3. Эффекты (кожа + мимика)
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // 4. Поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // 5. Итоговый prompt (остаётся только на сервере)
    const promptParts = [stylePrefix];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    // 6. Вход для Replicate
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

    // Поиск URL
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
      return res.status(500).json({
        error: "No image URL returned"
      });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}