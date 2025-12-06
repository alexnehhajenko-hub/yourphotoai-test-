// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Без возврата prompt на фронт, с усиленным сохранением лица

import Replicate from "replicate";

// Стили, усиленный beauty и oil
const STYLE_PREFIX = {
  // Новый стиль: светлый, гладкая кожа, без морщин, бьюти-портрет
  beauty:
    "soft beauty portrait, studio lighting, bright airy tones, smooth flawless skin, no wrinkles, gentle high-end retouch, pastel background, flattering look",

  // Художественная картина маслом
  oil:
    "dramatic oil painting portrait, impasto style, very visible thick brush strokes, rich oil paint texture, canvas texture, painterly background, slightly stylized face but still clearly the same person",

  anime:
    "anime style portrait, clean lines, soft pastel shading, stylized but clearly based on the same person as the reference",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, strong depth, premium film look",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, subtle painterly feel",
  default: "realistic portrait, detailed face, soft studio lighting"
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles": "no wrinkles, reduced skin texture, gentle beauty retouch",
  younger: "looks 20 years younger, fresh and healthy skin, lively eyes",
  "smooth-skin": "smooth flawless skin, even skin tone, subtle beauty lighting",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide hollywood smile, visible white teeth, confident look",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral face expression, relaxed, no strong visible emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "slightly bigger eyes, more open and attentive look",
  "eyes-brighter": "brighter eyes, more vivid and expressive gaze"
};

// Поздравления — стиль + факт русской надписи (без жёстких фраз)
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

    // 5. Усиленный блок про сохранение лица
    // Если есть фото — жёстко просим сохранить идентичность
    const identityPrefix = photo
      ? "portrait of the same person as in the reference photo, keep exact facial structure and identity, do not change the person, same age and gender, single person, no additional people"
      : "single person portrait, centered composition";

    // 6. Итоговый prompt (остаётся только на сервере, пользователю не отдаём)
    const promptParts = [identityPrefix, stylePrefix];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    // 7. Вход для Replicate
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

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

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

    // prompt не отдаём наружу
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