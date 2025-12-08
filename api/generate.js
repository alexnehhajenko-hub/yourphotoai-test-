// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / текст / эффекты кожи / мимика / поздравления
// Без возврата prompt на фронт

import Replicate from "replicate";

// СТИЛИ
// beauty   — мягкая ретушь того же человека
// demon    — огненный ритуал со свечой
// order    — эпический фэнтези-портрет "Орден Тишины"
// gravity  — реалистичный портрет в комнате с нарушенной гравитацией
// остальные — художественные стили
const STYLE_PREFIX = {
  // 1. КРАСИВЫЙ ПОРТРЕТ (строгий режим, только ретушь)
  beauty: [
    "ultra realistic studio portrait RETOUCH of the SAME person as in the input photo",
    "this must look like the SAME photo professionally retouched in Photoshop, not a new person",
    "preserve identity: same face shape, same skull and head proportions, same nose, same lips, same jawline, same distance between facial features",
    "same gender, same ethnicity, same haircut and hair length (if bald, stay bald, do NOT add hair)",
    "age stays almost the same, at most about 5 years younger, never a teenager or a different age group",
    "subtle beauty improvement only: reduce eye bags and puffiness, soften dark circles, smooth small wrinkles on face and neck, slightly more even skin tone",
    "keep realistic skin texture and pores, no plastic doll skin",
    "no change of bone structure, no change of fundamental face geometry",
    "neutral soft background, soft flattering light, natural color balance",
    "overall result: they look like themselves on their very best real day, not a different model"
  ].join(", "),

  // 2. ДЕМОН / РИТУАЛ СО СВЕЧОЙ
  demon: [
    "dramatic cinematic portrait of the SAME person as in the input photo",
    "preserve identity strictly: same gender, same ethnicity, same face structure, same head shape and proportions",
    "do NOT change the person, only the scene, lighting and expression",
    "dark ritual room, warm candlelight in front of them, bowl or cup with fire",
    "subtle blue or orange glowing embers and particles in the air",
    "slightly glowing eyes with soft colored light (not fully white, still human and recognizable)",
    "moody low key lighting, strong contrast between face and dark background",
    "gentle beauty retouch only, keep realistic skin and real-world proportions"
  ].join(", "),

  // 3. ЭПИЧЕСКИЙ ФЭНТЕЗИ-ПОРТРЕТ "ОРДЕН ТИШИНЫ"
  order: [
    "epic fantasy portrait of the SAME person as in the input photo",
    "they are the grandmaster of a secret order called 'Order of Silence'",
    "preserve identity: same face structure, same skull and head proportions, same nose, same lips, same jawline, same distance between facial features",
    "same gender and ethnicity as in the input, similar age, clearly the same person in a different outfit",
    "wearing elegant dark robes with subtle silver embroidery",
    "order's symbol integrated into jewelry and fabric, softly glowing sigils",
    "background: vast dim hall with tall columns, banners and floating symbols of silence in the air",
    "soft directional cinematic light on the face, hyper detailed fabrics and face",
    "concept art for AAA RPG, high resolution, dramatic but still realistic",
    "gentle beauty enhancement only, do NOT replace the person with a generic model"
  ].join(", "),

  // 4. НАРУШЕННАЯ ГРАВИТАЦИЯ (комната)
  gravity: [
    "realistic portrait of the SAME person as in the input photo",
    "preserve identity strictly: same face shape, same skull and head proportions, same nose, lips, jawline, eye distance and overall geometry",
    "same gender and ethnicity, similar age, clearly the same person",
    "in a room where gravity is subtly broken",
    "their hair gently flows upward or sideways as if floating",
    "small objects around them float mid-air",
    "coffee splashes sideways from a cup, papers slowly drifting around",
    "light coming from the floor as a softly glowing pool of light",
    "calm confident expression",
    "ultra realistic impossible physics photo, 8k look, soft cinematic colors",
    "gentle beauty enhancement only, do NOT turn them into a different model"
  ].join(", "),

  // 5. Картина маслом
  oil: [
    "oil painting portrait of the SAME person as in the input photo",
    "keep the same identity and proportions, clearly the same person",
    "same gender, same ethnicity, similar age",
    "painterly brush strokes, canvas texture, rich warm colors",
    "gentle improvement only, not a new face"
  ].join(", "),

  // 6. Аниме
  anime: [
    "anime style portrait of the SAME person as in the input photo",
    "translate their recognisable facial features into anime style",
    "same gender and ethnicity, similar age",
    "clean lines, soft shading, gentle colors"
  ].join(", "),

  // 7. Кино-постер
  poster: [
    "cinematic movie poster portrait of the SAME person as in the input photo",
    "keep the same identity: face shape, eyes, nose, mouth and jaw must match",
    "same gender, same ethnicity, similar age",
    "dramatic lighting, slightly stylized but still clearly the same person"
  ].join(", "),

  // 8. Классика
  classic: [
    "classical old master realistic portrait of the SAME person as in the input photo",
    "keep the same face, same gender and ethnicity, similar age",
    "warm tones, detailed skin, painterly background",
    "gentle beautification without changing who the person is"
  ].join(", "),

  // Режим по умолчанию
  default: [
    "realistic portrait of the SAME person as in the input photo",
    "preserve identity and proportions",
    "subtle natural beauty retouch only, soft studio lighting"
  ].join(", ")
};

// ЭФФЕКТЫ
const EFFECT_PROMPTS = {
  // кожа
  "no-wrinkles":
    "fewer visible wrinkles, gentle beauty retouch, keep natural skin texture",
  younger:
    "looks around 5–10 years younger but clearly the same person, fresher and more rested face",
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