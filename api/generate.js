// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / эффекты кожи / мимика / поздравления
// Жёсткий упор на сохранение личности (тот же человек)

// 1) УБЕДИСЬ, ЧТО В Vercel есть переменная REPLICATE_API_TOKEN

import Replicate from "replicate";

// Базовое правило для ЛЮБОГО стиля — всегда тот же человек
const IDENTITY_BASE =
  "portrait of the SAME person as in the reference photo, keep the same face structure, same gender and ethnicity, same eye shape and nose, do not change identity, only enhance. " +
  "person looks a bit younger (about 5–10 years), slightly slimmer and more photogenic, but clearly recognizable as the same person";

// Стили, каждый добавляется К БАЗОВОМУ описанию
const STYLE_PREFIX = {
  // Светлый, бьюти-портрет
  beauty:
    "high-end beauty photography, soft studio lighting, smooth flawless skin, subtle glow, modern editorial portrait, shallow depth of field, pastel background",

  // Картина маслом, но ЛИЧНОСТЬ сохраняем
  oil:
    "dramatic oil painting portrait, impasto style, visible thick brush strokes, rich oil paint texture, canvas background, painterly but still clearly the same person, realistic proportions",

  anime:
    "anime style portrait, clean lines, expressive eyes, soft pastel shading, stylized but still clearly recognizable as the same person",

  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, subtle film grain, modern cinema look, hero shot of the same person",

  classic:
    "classical old master portrait, realistic painting, warm tones, detailed skin, Rembrandt style light, but keeping the same facial features and age range",

  default:
    "realistic portrait, soft studio lighting, detailed skin, modern lens, natural colors"
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles": "reduced wrinkles, smoother skin texture, gentle beauty retouch",
  younger:
    "appears about 10 years younger, fresher and healthier skin, but still clearly the same adult person",
  "smooth-skin": "smooth even skin tone, subtle beauty lighting",

  // мимика
  "smile-soft": "subtle soft smile, calm relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide hollywood smile, visible white teeth, confident expression",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed expression, no strong emotion",
  serious: "serious focused face, no smile",
  "eyes-bigger": "slightly bigger eyes, more open and attentive look",
  "eyes-brighter": "brighter clearer eyes, vivid expressive gaze"
};

// Поздравления — фон/атмосфера + факт наличия русской надписи (без жёсткого текста)
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting portrait, glowing warm lights, snow, cozy winter atmosphere, elegant russian handwritten New Year greeting text on the image",
  birthday:
    "birthday greeting portrait, balloons, confetti, festive atmosphere, elegant russian handwritten birthday greeting text on the image",
  funny:
    "playful humorous greeting portrait, bright colors, fun composition, creative russian handwritten funny greeting text on the image",
  scary:
    "dark horror themed greeting portrait, spooky cinematic lighting, eerie atmosphere, creepy russian handwritten horror greeting text on the image"
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

    // 2. Пользовательский текст (в тесте часто null, но оставляем)
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

    // 5. Итоговый prompt (остаётся только на сервере, пользователю не отдаём)
    const promptParts = [IDENTITY_BASE, stylePrefix];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    // 6. Вход для Replicate
    const input = {
      prompt,
      output_format: "jpg"
    };

    // Фото добавляем только если есть
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

    // prompt наружу не отдаём
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