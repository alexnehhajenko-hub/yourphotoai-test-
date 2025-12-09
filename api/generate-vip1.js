// api/generate-vip1.js — VIP style #1 (broken gravity room)
// FLUX-Kontext-Pro (Replicate)
// Цель: МАКСИМАЛЬНО ТОЧНОЕ СХОДСТВО С ОРИГИНАЛОМ + эффектная сцена.
// Лицо почти не меняем, только мягкая ретушь. Никаких чужих лиц.

import Replicate from "replicate";

// Базовый VIP-prompt: жёсткое совпадение лица + сцена с гравитацией
const VIP_BASE_PROMPT = [
  // ЛИЧНОСТЬ: максимум сходства
  "ultra realistic portrait of the EXACT SAME person as in the reference photo",
  "match the reference face AS CLOSELY AS POSSIBLE",
  "same face shape, same head size, same nose, same eyes, same lips, same jawline and bone structure",
  "same gender, same ethnicity, same approximate age as in the reference",
  "do NOT beautify by changing the face structure, do NOT swap the face, do NOT replace with another person",
  "no face morphing into a model, no new identity, no new race, no new gender",

  // ПОЗА / РАКУРС
  "keep a similar head angle and pose to the reference photo if possible",
  "framing similar to a portrait photo: head and shoulders or half body",
  "do NOT zoom too far out, keep the face large and clear in the frame",

  // КОЖА: очень мягкая ретушь
  "very subtle retouch only: slightly reduce strong eye bags, slightly soften deep wrinkles",
  "keep natural skin texture and pores, keep freckles and characteristic marks",
  "no plastic skin, no overly smoothed beauty filter, keep them looking real and grounded",
  "overall skin tone a bit more even and healthy but still realistic",

  // ОДЕЖДА
  "clothing can be gently upgraded to fit the scene, like a clean simple shirt or t-shirt or casual jacket",
  "outfit must remain realistic and believable for this person, no costume, no armor, no fantasy outfit",

  // СЦЕНА VIP #1 — ЛОМАЮЩАЯСЯ ГРАВИТАЦИЯ
  "they are sitting or standing in a large endless room where gravity is subtly broken",
  "background is a deep, soft, infinite space fading into darkness or soft color, no visible frame or border around the head",
  "a glowing circular pool or disk of light in front of them on the table or floor, emitting soft light upwards",
  "small glowing particles, dust, and light papers floating slowly in the air around them",
  "hair reacts slightly to strange gravity: just a bit lifted or subtly moving, not extreme",
  "soft cinematic lighting from the glowing pool, with gentle contrast on the face",
  "mood: calm, thoughtful, slightly mysterious, but still realistic and human",

  // КОМПОЗИЦИЯ
  "clean full-frame portrait composition, no separate Polaroid frames, no collage layout",
  "background should be one continuous environment, not a corkboard, not screenshots, not UI",

  // ЗАПРЕТЫ: текст/рамки/скрины
  "no text, no dates, no watermarks, no captions, no phone UI elements",
  "no borders, no photo frames, no pinned Polaroids, no evidence board layout",
  "no extra faces other than the main person",

  // КАЧЕСТВО
  "high resolution, premium portrait photography, shallow depth of field, background softly blurred",
  "cinematic color grading, but still natural skin tones"
].join(", ");

// Доп. эффекты (используем те же id, что на фронте)
const EFFECT_PROMPTS = {
  "no-wrinkles":
    "slightly softer wrinkles but still visible and realistic, keep natural skin texture",
  younger:
    "face looks just a little more rested and fresh but clearly the same age range, not drastically younger",
  "smooth-skin":
    "slightly smoother and more even skin tone, keep pores and micro texture, no plastic look",
  "smile-soft": "very subtle soft smile, relaxed and calm expression",
  "smile-big": "natural bigger smile while keeping the same facial identity",
  "smile-hollywood":
    "wide smile with visible teeth, but still clearly the same person, no new face",
  laugh: "laughing with a bright smile, joyful and natural expression, same face identity",
  neutral: "neutral relaxed face, no strong emotion, same look as reference",
  serious: "serious focused expression, no smile, but same features",
  "eyes-bigger": "eyes just a tiny bit more open, but still realistic and same shape",
  "eyes-brighter": "slightly brighter and clearer eyes, more vivid gaze"
};

// Поздравления (если совмещаешь VIP + открытку)
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