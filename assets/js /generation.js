// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / эффекты кожи / мимика / поздравления
// ЖЁСТКИЙ акцент на том, что это ТОТ ЖЕ ЧЕЛОВЕК,
// только немного моложе / стройнее / симпатичнее.

import Replicate from "replicate";

// 1) Базовое правило для ЛЮБОЙ генерации
const IDENTITY_BASE =
  [
    "highly realistic portrait based on the reference photo",
    "MUST be the SAME person as in the reference photo",
    "keep the same facial structure, same nose, same eyes, same jawline and cheekbones",
    "keep the same gender, ethnicity and general age group",
    "do not invent a different person, do not change identity",
    "only subtle beauty retouch is allowed",
    "face can look about 3–5 years younger, a bit fresher and slightly slimmer",
    "cheeks a little softer and a bit less volume, but still clearly the same face",
    "lips can be slightly fuller and eyes a bit brighter, but always realistic and natural",
    "same camera angle and similar head orientation as in the reference photo"
  ].join(". ");

// 2) Стили. Каждый добавляется К БАЗЕ, а не заменяет её.
const STYLE_PREFIX = {
  beauty:
    "high-end beauty portrait, soft studio lighting, smooth but detailed skin, gentle glow, modern editorial photography, shallow depth of field, clean background",

  oil:
    "oil painting portrait, realistic proportions, painterly brush strokes, rich oil texture on canvas, but with clearly recognizable likeness of the same person",

  anime:
    "anime-inspired portrait, soft stylization, expressive eyes, gentle shading, but facial features and proportions still clearly match the same person",

  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, subtle film grain, hero shot of the same person",

  classic:
    "classical old master realistic portrait, warm tones, controlled brush strokes, Rembrandt style lighting, but the likeness of the same person is preserved",

  default:
    "realistic studio portrait, natural colors, modern lens, detailed skin, soft background blur"
};

// 3) Эффекты кожи и мимики.
// Здесь аккуратно добавляем омоложение / щёки / губы / глаза.
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "slightly reduced wrinkles, smoother skin texture, gentle beauty retouch while keeping natural details",
  younger:
    "looks about 3–5 years younger, a bit fresher, slightly slimmer cheeks and softer jawline, lips a bit fuller and eyes slightly more vivid, but still clearly the same adult person",
  "smooth-skin":
    "smooth even skin tone, subtle glow, no heavy plastic look, pores still softly visible",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide hollywood smile, visible white teeth, confident expression",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed expression, no strong emotion",
  serious: "serious focused face, no smile",
  "eyes-bigger":
    "eyes just slightly bigger and more open, still realistic proportions",
  "eyes-brighter":
    "brighter clearer eyes, more vivid and expressive gaze, but not unnatural"
};

// 4) Поздравления — фон / атмосфера, лицо НЕ трогаем.
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting portrait, warm glowing lights, snow, cozy winter atmosphere, elegant russian handwritten New Year greeting text on the image",
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
    // Парсим тело (Vercel иногда присылает строку)
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

    // 2. Пользовательский текст (в тесте обычно null, но пусть будет)
    const userPrompt = (text || "").trim();

    // 3. Эффекты
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

    // 5. Собираем финальный prompt.
    // Порядок: база личности → стиль → текст → эффекты → поздравление.
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

    // 7. Достаём URL картинки
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