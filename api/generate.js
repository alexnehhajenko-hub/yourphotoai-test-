// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Без возврата prompt на фронт

import Replicate from "replicate";

// Стили, усиленный beauty, oil и НОВЫЙ demon
const STYLE_PREFIX = {
  // Новый стиль: светлый, гладкая кожа, без морщин, бьюти-портрет
  beauty:
    "realistic portrait of the same person as in the reference photo, same facial structure and proportions, same age and gender, soft beauty portrait, studio lighting, bright airy tones, smooth flawless skin, no wrinkles, gentle high-end retouch, subtle glow, k-beauty style, pastel background, flattering look",

  // Художественная картина маслом
  oil:
    "realistic oil painting portrait of the same person as in the reference photo, same facial structure and proportions, dramatic oil painting style, visible thick brush strokes, rich oil paint texture, canvas texture, painterly background, slightly stylized but clearly the same person, warm tones",

  anime:
    "anime style portrait of the same person as in the reference photo, same face shape and proportions, recognizable facial features, clean lines, soft pastel shading",

  poster:
    "cinematic movie poster portrait of the same person as in the reference photo, same face and proportions, dramatic lighting, high contrast, filmic look",

  classic:
    "classical old master portrait of the same person as in the reference photo, same facial structure, realism, warm tones, detailed skin, painting by an old master",

  // НОВЫЙ СТИЛЬ: Demon — зал с синим огнём и светящимися глазами
  demon:
    "dark fantasy demonic portrait of the same person as in the reference photo, strictly keep the same facial structure, proportions and identity, do not change gender or age, set in a gothic hall lit by glowing blue fire, blue flames on torches and in the background, soft volumetric light from the blue fire, the person's eyes have a subtle blue magical glow, not too strong, cinematic composition, ultra detailed skin and hair, high-end dark fantasy artwork",

  default:
    "realistic portrait of the same person as in the reference photo, strictly keep original facial structure, proportions and identity, soft studio lighting"
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "no wrinkles, reduced skin texture, gentle beauty retouch, keep the same face structure",
  younger:
    "looks about 10–20 years younger but still clearly the same person, fresh and healthy skin, lively eyes",
  "smooth-skin":
    "smooth flawless skin, even skin tone, subtle beauty lighting, keep natural facial features",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide hollywood smile, visible white teeth, confident look",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral face expression, relaxed, no strong visible emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger":
    "slightly bigger eyes but still realistic, more open and attentive look",
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

    // 5. Итоговый prompt (остаётся только на сервере, пользователю не отдаём)
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