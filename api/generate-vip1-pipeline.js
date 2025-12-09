// api/generate-vip1.js — VIP: gravity
// FLUX-Kontext-Pro (Replicate)
// Жёсткий акцент: ТОТ ЖЕ человек, только лучшая версия + сцена с «магической гравитацией»

import Replicate from "replicate";

// 1. Блок личности — максимально жёстко фиксируем того же человека
const IDENTITY_BLOCK = [
  "ultra realistic portrait of THE SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different model or actor",
  "keep EXACT facial identity: same skull and head shape, same face width and height",
  "same nose shape and size, same lips shape and fullness, same eyes shape and distance, same jawline",
  "same gender, same ethnicity, same overall personality and vibe",
  "age stays almost the same (no more than about 3–5 years younger), do NOT make them a teenager or a different age",
  "only subtle BEAUTY IMPROVEMENT: reduce eye bags and puffiness, soften dark circles, smooth small wrinkles, even skin tone",
  "keep realistic skin texture and pores, NO plastic skin, NO doll face, NO heavy makeup",
  "do NOT change bone structure, do NOT change head proportions, do NOT replace the face with another person",
  "if identity cannot be preserved, prefer to keep the original face with only minimal retouch"
].join(", ");

// 2. Сцена «гравитация» — фон, одежда и окружение
const GRAVITY_SCENE_BLOCK = [
  "subject sitting at a wooden table with a small glowing bowl or candle in front of them",
  "large, deep, endless dark background behind them, soft gradient, cinematic studio look",
  "no visible walls or windows, no room edges, just a deep background fading into darkness",
  "small glowing particles and dust slowly floating in the air around the subject",
  "subtle feeling that gravity is slightly broken: a few tiny sparks and dust motes drifting upward",
  "new clean outfit that fits the scene: simple dark blazer or jacket, subtle elegant style, no logos",
  "soft warm key light from the front, gentle rim light from behind, cinematic portrait lighting",
  "no text, no letters, no numbers, no user interface, no screens, no phones, no monitors anywhere in the image",
  "natural camera perspective, normal head–body proportions, no oversized head"
].join(", ");

// 3. Эффекты (кожа, мимика и т.п. — те же id, что на фронте)
const EFFECT_PROMPTS = {
  "no-wrinkles":
    "fewer visible wrinkles, gentle beauty retouch, keep natural skin texture",
  younger:
    "looks around 3–5 years younger but clearly the same person, fresher and more rested face",
  "smooth-skin":
    "smoother and more even skin tone, reduce blemishes and redness, keep pores and realism",
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

// 4. Поздравления (если захочешь совмещать с открытками)
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year atmosphere around them, soft warm fairy lights in the background, but still NO text on the image",
  birthday:
    "birthday atmosphere, soft bokeh of balloons and confetti in the background, but still NO text on the image",
  funny:
    "playful colorful atmosphere, fun bokeh shapes in the background, but still NO text on the image",
  scary:
    "subtle dark horror atmosphere, moody lighting and shadow shapes in the background, but still NO text on the image"
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // --- разбор тела запроса ---
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

    // --- эффекты (кожа, мимика и т.п.) ---
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // --- поздравление / атмосфера ---
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // --- итоговый prompt ---
    const promptParts = [
      IDENTITY_BLOCK,
      GRAVITY_SCENE_BLOCK
    ];

    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    // Доп. защита от чужих лиц и текста
    promptParts.push(
      "do NOT generate any other faces or characters in the frame",
      "the only visible person is the subject from the input photo",
      "no text, no captions, no watermarks, no UI elements, no logos"
    );

    const prompt = promptParts.join(". ").trim();

    // --- вход для Replicate ---
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

    // --- вытаскиваем URL ---
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
    console.error("VIP GRAVITY GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP gravity generation failed",
      details: err?.message || String(err)
    });
  }
}