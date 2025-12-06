// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// ВАЖНО: максимально сохраняем того же человека, только улучшаем

import Replicate from "replicate";

// Базовый префикс: всегда тот же человек
const BASE_IDENTITY_PROMPT = `
ultra realistic portrait of the SAME person from the input photo,
keep the same facial structure, same weight, same age (±5 years),
same nose, eyes, lips, jawline, face shape and proportions,
do not replace the face, do not invent a different person,
only improve lighting, colors and small cosmetic details
`;

// Стиль — добавка к базовому описанию
const STYLE_SUFFIX = {
  beauty: `
natural beauty portrait photography in soft studio light,
subtle skin smoothing and gentle retouch,
no extreme makeover, no heavy makeup, realistic natural look
`,
  oil: `
dramatic oil painting portrait, visible brush strokes,
rich paint texture and canvas texture,
slightly stylized but still clearly the same person
`,
  anime: `
anime style portrait while clearly keeping the same identity,
same facial proportions translated into anime style,
clean lines, soft pastel shading
`,
  poster: `
cinematic movie poster portrait, dramatic lighting, high contrast,
slightly stylized but still clearly recognisable as the same person
`,
  classic: `
classical old master portrait painting, warm tones, detailed skin,
subtle painterly texture, historically styled but same likeness
`,
  default: `
realistic portrait photography, detailed face, soft studio lighting
`
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "slightly reduced wrinkles, gentle beauty retouch, keep realistic skin texture",
  younger:
    "looks a bit younger but clearly the same person, fresher skin, softer eye bags",
  "smooth-skin":
    "smooth and even skin tone, light retouch only, pores and details still visible",

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

// Поздравления — стиль + факт надписи
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting portrait, glowing warm lights, snow, elegant greeting handwritten text on the image",
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

    // 1. Стиль — берём суффикс + общий базовый префикс
    const styleSuffix = STYLE_SUFFIX[style] || STYLE_SUFFIX.default;

    // 2. Пользовательский текст (на будущее, пока редко используем)
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
    const promptParts = [BASE_IDENTITY_PROMPT, styleSuffix];
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