// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / эффекты кожи / мимика / поздравления
// Главное: максимально сохраняем ЛИЧНОСТЬ с референса

import Replicate from "replicate";

// Общий промпт, который всегда добавляется — про сохранение лица
const IDENTITY_PROMPT = `
keep exactly the same person as on the reference photo,
same facial structure, same nose, lips, eyes, jaw and face shape,
same ethnicity and overall age group,
do NOT replace the face, no face swap, no new character,
only gentle beauty retouch and light improvements
`.trim();

// Негативный промпт — чего нельзя делать
const NEGATIVE_PROMPT = `
different person, face swap, changed identity, celebrity face,
over-slimmed unrealistic face, plastic doll, barbie face,
extra limbs, deformed eyes, distorted face, glitch, artifact
`.trim();

// Стили
const STYLE_PREFIX = {
  // Мягкий бьюти-стиль: та же женщина / тот же мужчина, только лучше отретуширован
  beauty: `
soft beauty portrait photo of the same person from the reference,
natural realistic look, no heavy makeup,
slightly softened skin, reduced eyebags,
subtle slimming of cheeks but same bone structure,
studio lighting, warm tones, shallow depth of field
`.trim(),

  // Художественная картина маслом
  oil: `
realistic oil painting portrait of the same person,
visible brush strokes, classic painting texture, warm tones
`.trim(),

  anime: `
anime style portrait of the same person, same face and hair silhouette,
clean lines, soft pastel shading
`.trim(),

  poster: `
cinematic movie poster portrait of the same person,
dramatic lighting, high contrast, film still look
`.trim(),

  classic: `
classical old master portrait of the same person,
subtle painterly style, realism, warm tones, detailed skin
`.trim(),

  default: `
realistic portrait photo of the same person, soft studio lighting
`.trim()
};

// Эффекты кожи + мимика — делаем мягкими, без радикальных изменений
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "slightly reduced wrinkles, smoother skin, gentle retouch, still natural skin texture",
  younger:
    "looks about 5-10 years younger but clearly the same person, fresher skin, more rested look",
  "smooth-skin":
    "more even skin tone, slightly smoother skin, small imperfections reduced",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "bigger warm smile, expressive and friendly, still natural",
  "smile-hollywood":
    "wide smile with visible teeth, natural realistic teeth, confident look",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral face expression, relaxed, no strong visible emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "slightly more open eyes, more attentive look, same eye shape",
  "eyes-brighter": "brighter, clearer eyes, more vivid and expressive gaze"
};

// Поздравления
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year greeting portrait, soft lights, a few subtle winter decorations, elegant russian handwritten New Year greeting text on the image",
  birthday:
    "birthday greeting portrait, soft party decorations, balloons blurred in the background, elegant russian handwritten birthday greeting text on the image",
  funny:
    "playful humorous greeting portrait, bright but not childish colors, creative russian handwritten funny greeting text on the image",
  scary:
    "dark horror themed greeting portrait, spooky but still recognizable face, russian handwritten horror greeting text on the image"
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

    const { style, text, photo, effects, greeting } = body || {};

    // 1. Стиль
    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    // 2. Пользовательский текст (пока у нас на фронте его нет, но на будущее)
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

    // 5. Финальный prompt — ВСЕГДА включает IDENTITY_PROMPT
    const promptParts = [stylePrefix, IDENTITY_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    // 6. Подготовка входа в Replicate
    const input = {
      prompt,
      negative_prompt: NEGATIVE_PROMPT,
      output_format: "jpg"
      // сюда можно добавить доп-параметры модели (guidance_scale и т.п.), если захотим
    };

    if (photo) {
      input.input_image = photo;
    }

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

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