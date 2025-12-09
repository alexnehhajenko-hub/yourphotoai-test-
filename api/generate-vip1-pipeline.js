// api/generate-vip1.js — VIP стиль #1 (gravity)
// FLUX-Kontext-Pro (Replicate)
// Максимально сохраняем ЛИЧНОСТЬ: это тот же человек, только чуть лучше и в спец-сцене

import Replicate from "replicate";

// Базовый VIP-prompt: тот же человек + сцена со свечой и глубокой тьмой
const VIP_BASE_PROMPT = [
  // ЖЁСТКО ФИКСИРУЕМ ЛИЧНОСТЬ
  "hyper realistic studio portrait of the EXACT SAME person as in the input photo",
  "face identity must match one to one, like a passport photo vs a selfie of the same human",
  "use the input face as a hard reference, do NOT change face structure, bone structure or proportions",
  "keep the same head shape, forehead, hairline, nose width and shape, lips shape, jawline and chin, and the distance between all features",
  "same gender, same ethnicity, same overall personality",
  "age stays similar (no more than about 3-5 years younger), do NOT turn them into a teen or a completely different age",
  "NO face slimming, NO new cheekbones, NO plastic surgery look, absolutely no changing of identity",

  // Ретушь — только мягкое улучшение
  "only very soft cosmetic retouch: slightly reduce eye bags and puffiness, soften small wrinkles, even the skin tone",
  "keep realistic skin texture and visible pores, no plastic skin, no over-smoothing",
  "subtle natural healthy look, not a beauty filter",

  // Волосы и одежда — можно улучшить, но без смены человека
  "hair can be slightly improved, cleaned up or a bit longer, but must clearly feel like their own hair style and color, not a totally new person",
  "clothing can change into a simple dark elegant outfit that fits the scene",

  // Сцена gravity-ритуала
  "they are sitting at a wooden table with a single small candle in front of them",
  "background is an infinite dark space with a very soft gradient, no text, no symbols, no windows, no screens",
  "tiny warm golden sparks softly floating above the candle and around the hands, subtle and not distracting",
  "main light comes from the candle and a very soft invisible studio light, cinematic but realistic",
  "calm, thoughtful expression, minimalistic composition, premium cinematic portrait, 8k details"
].join(", ");

// Доп. эффекты (можем переиспользовать те же id, что и на фронте)
const EFFECT_PROMPTS = {
  "no-wrinkles":
    "fewer visible wrinkles, gentle beauty retouch, keep natural skin texture",
  younger:
    "looks around 5–10 years younger but clearly the same person, fresher and more rested face",
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

// Поздравления — если захочешь совмещать VIP + открытки
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

    // Эффекты
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // Поздравление (если нужно)
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // Итоговый prompt
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