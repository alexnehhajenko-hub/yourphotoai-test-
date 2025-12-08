// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Максимальный упор на ТОГО ЖЕ человека, только аккуратная ретушь

import Replicate from "replicate";

// Стили — подчёркиваем, что это ЛУЧШАЯ ВЕРСИЯ ЭТОГО ЖЕ ЧЕЛОВЕКА
const STYLE_PREFIX = {
  // Главный стиль: улучшенная версия того же человека
  beauty: [
    "hyper realistic studio portrait of the SAME person as in the input photo",
    "this must be a professional retouched photo of the SAME person, NOT a different model",
    "keep exact facial identity: same face shape, same nose, same eyes, same lips, same jawline, same head proportions",
    "same gender, same ethnicity, same haircut length and overall appearance",
    "age is almost the same, at most about 5 years younger, do NOT make them much younger or older",
    "NO drastic changes: do not change bone structure, do not change eye shape or nose shape, do not change face type",
    "only subtle BEAUTY RETOUCH: reduce eye bags and puffiness, soften dark circles, smooth small wrinkles, even out skin tone",
    "keep realistic skin texture and pores, no plastic doll skin",
    "natural healthy look, soft flattering light, simple neutral background",
    "family and friends must clearly recognise this as the same person on their best real-life day"
  ].join(", "),

  // Художественная картина маслом
  oil: [
    "oil painting portrait of the SAME person as in the input photo",
    "recognisably the same face and identity, same head proportions",
    "same gender, same ethnicity, similar age",
    "painterly brush strokes, canvas texture, rich warm colors",
    "gentle improvement only without changing who they are"
  ].join(", "),

  anime: [
    "anime style portrait of the SAME person as in the input photo",
    "translate their recognisable facial features into anime style",
    "same gender and ethnicity, similar age",
    "clean lines, soft shading, gentle colors",
    "must still clearly look like the same person"
  ].join(", "),

  poster: [
    "cinematic movie poster portrait of the SAME person as in the input photo",
    "keep the same identity: face shape, eyes, nose, mouth and jaw must match",
    "same gender, same ethnicity, similar age",
    "dramatic lighting, slightly stylized but still clearly the same person"
  ].join(", "),

  classic: [
    "classical old master realistic portrait of the SAME person as in the input photo",
    "keep the same face and identity, same gender and ethnicity, similar age",
    "warm tones, detailed skin, painterly background",
    "gentle beautification without changing their facial structure"
  ].join(", "),

  default: [
    "realistic portrait of the SAME person as in the input photo",
    "keep exact facial identity and proportions, no new person",
    "only subtle natural beauty retouch, soft studio lighting"
  ].join(", ")
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "slightly fewer visible wrinkles, very gentle beauty retouch, keep natural skin texture and pores",
  younger:
    "looks at most about 5 years younger but obviously the same person, fresher and more rested face",
  "smooth-skin":
    "smoother and more even skin tone, reduce blemishes and redness, keep pores and realism",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide smile with visible teeth, hollywood style, still natural and realistic",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed face expression, no strong emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "slightly more open eyes, but still realistic and not anime-like",
  "eyes-brighter": "brighter eyes, clearer irises, more vivid but realistic gaze"
};

// Поздравления — стиль + факт русской надписи
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

    // 2. Пользовательский текст
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