// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Без возврата prompt на фронт

import Replicate from "replicate";

// Стили — МАКСИМАЛЬНО сохраняем лицо этого же человека
const STYLE_PREFIX = {
  // Главный стиль: та же внешность, только отдохнувший вид
  beauty: [
    "highly realistic portrait of the SAME person as in the input photo",
    "STRICT IDENTITY PRESERVATION, identity-preserving face enhancement only",
    "keep EXACT facial structure: same head size, same face width, same jawline, same nose shape, same eye shape and distance, same lips shape, same ears and skull proportions",
    "same gender, same ethnicity, same approximate age as in the input photo",
    "NO radical beautification, NO face replacement, NO model face, NO glamorized stranger",
    "only SMALL corrections: slightly reduce eye bags and dark circles, gently soften small wrinkles, slightly smooth skin tone, reduce redness and blemishes",
    "keep real skin texture and pores, no plastic skin, no doll look",
    "do NOT change bone structure, do NOT slim or stretch the face, do NOT change hairline or haircut drastically",
    "neutral soft studio lighting on the same person, simple blurred background",
    "the result must look like the SAME person on a good day in real life"
  ].join(", "),

  // Художественная картина маслом
  oil: [
    "oil painting portrait of the SAME person as in the input photo",
    "keep recognisable facial identity and proportions, same gender and ethnicity, similar age",
    "painterly brush strokes, canvas texture, warm artistic tones",
    "gentle enhancement only, not a different face"
  ].join(", "),

  anime: [
    "anime style portrait of the SAME person as in the input photo",
    "translate their recognisable features into anime style while keeping identity",
    "same gender and ethnicity, similar age",
    "clean lines, soft shading"
  ].join(", "),

  poster: [
    "cinematic movie poster portrait of the SAME person as in the input photo",
    "keep the same identity and proportions: face shape, eyes, nose, mouth and jaw must clearly match",
    "same gender, same ethnicity, similar age",
    "dramatic but realistic lighting"
  ].join(", "),

  classic: [
    "classical old master realistic portrait of the SAME person as in the input photo",
    "keep the same face, gender and ethnicity, similar age",
    "warm tones, detailed skin, painterly background",
    "only gentle beautification, no face change"
  ].join(", "),

  default: [
    "realistic portrait of the SAME person as in the input photo",
    "strong identity preservation, same facial proportions and features",
    "very subtle natural retouch only, soft lighting"
  ].join(", ")
};

// Эффекты обработки кожи + мимика
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "slightly softer small wrinkles, gentle beauty retouch, keep natural skin texture and pores",
  younger:
    "looks a LITTLE more rested and fresh but clearly the same age range and the same person",
  "smooth-skin":
    "slightly smoother and more even skin tone, reduce blemishes and redness, keep realistic texture",

  // мимика
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide smile with visible teeth, still natural and not overdone",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed face expression, no strong emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "eyes VERY SLIGHTLY more open, still realistic proportions",
  "eyes-brighter": "brighter, clearer irises, more vivid gaze"
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