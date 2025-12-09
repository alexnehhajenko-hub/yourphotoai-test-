// api/generate-vip1.js — VIP style #1 (broken gravity room, HARD identity lock)
// FLUX-Kontext-Pro (Replicate)
// Цель: лицо = тот же человек, минимальные правки кожи, меняем только сцену/свет/одежду.

import Replicate from "replicate";

// Базовый VIP-prompt: максимально точное сходство
const VIP_BASE_PROMPT = [
  // ЛИЦО: жёсткий запрет на подмену
  "ultra realistic portrait of the EXACT SAME person as in the reference photo",
  "the face identity MUST MATCH the reference as closely as possible",
  "same face shape, same head size, same nose shape, same lips, same eyes, same jawline and bone structure",
  "same gender and same ethnicity as in the reference",
  "same approximate age as the reference, do NOT make them much younger or older",
  "do NOT replace the person with a different model, do NOT change gender, do NOT change ethnicity",
  "no beauty transformation that changes facial structure, no new identity, no face swap",

  // ПОЗА / КАДРИРОВАНИЕ
  "keep a similar head angle and pose to the reference photo if possible",
  "framing similar to a portrait: head and shoulders or half body, face large in the frame",
  "do NOT zoom out too far, the face must be the main focus",

  // КОЖА: почти без ретуши
  "keep all main facial features, moles, freckles and characteristic marks",
  "very small softening of extremely deep eye bags or harsh shadows is allowed, but keep natural wrinkles",
  "keep realistic skin texture and pores, absolutely no plastic skin, no airbrushed beauty filter",

  // ВОЛОСЫ
  "keep the same hairline, same hairstyle type and same hair length as the reference, adapted slightly to lighting if needed",
  "do not give them completely new hair or a different style that changes identity",

  // ОДЕЖДА
  "clothing can be upgraded slightly to a clean simple outfit that fits the scene, like a plain shirt, t-shirt or jacket",
  "outfit must remain realistic for this person, no fantasy armor, no costume, no cosplay",

  // СЦЕНА VIP #1 — ЛОМАЮЩАЯСЯ ГРАВИТАЦИЯ
  "they are in a large endless room where gravity is subtly broken",
  "background is a deep soft infinite space fading into darkness or a very soft color gradient",
  "no visible hard frame, no photo border, no corkboard, no Polaroid frames",
  "a glowing circular pool or disk of light in front of them on the table or floor, casting light upwards",
  "small glowing particles, dust and a few light papers floating slowly in mid-air",
  "hair reacts just a bit to the strange gravity, very subtle upward motion, not extreme",
  "soft cinematic lighting from the glowing pool, gentle contrast on the face, realistic color grading",

  // КОМПОЗИЦИЯ
  "single clean full-frame portrait, only one person in the image",
  "no extra faces, no collage, no multiple photos inside the frame",
  "background must be one continuous environment, not UI, not screenshots, not evidence board",

  // ЖЁСТКИЕ ЗАПРЕТЫ: текст/рамки/интерфейсы
  "no text, no numbers, no dates, no signatures, no UI elements, no camera interface",
  "no borders around the image, no Polaroid-style frames, no pins or nails",

  // КАЧЕСТВО
  "high resolution, premium portrait photography look",
  "shallow depth of field with softly blurred background",
  "natural skin tones, cinematic but realistic colors"
].join(", ");

// Доп. эффекты: только ОЧЕНЬ мягкие изменения, без смены лица
const EFFECT_PROMPTS = {
  "no-wrinkles":
    "very slightly softer deepest wrinkles while keeping them visible and realistic, keep all skin texture",
  younger:
    "face looks just a little more rested and fresh but clearly the same age range and same identity",
  "smooth-skin":
    "slightly more even skin tone, keep pores and micro texture, avoid beauty-filter look",
  "smile-soft": "very subtle soft smile, relaxed and calm expression, same face",
  "smile-big": "natural bigger smile while keeping exactly the same face identity",
  "smile-hollywood":
    "wide smile with visible teeth, still clearly the same person, no model face",
  laugh: "laughing with a bright smile, joyful but still the same identity",
  neutral: "neutral relaxed expression similar to the reference",
  serious: "serious focused expression without smile, same features",
  "eyes-bigger":
    "eyes just a tiny bit more open, same shape and size range, still realistic",
  "eyes-brighter":
    "slightly brighter eyes with clearer irises, same color and shape"
};

// Поздравления — если совмещаешь VIP + открытку
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
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { text, photo, effects, greeting } = body || {};

    const userPrompt = (text || "").trim();

    // эффекты
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // итоговый prompt
    const promptParts = [VIP_BASE_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

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
      return res.status(500).json({ error: "No image URL returned" });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("VIP GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}