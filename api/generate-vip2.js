// api/generate-vip2.js — VIP стиль #2: кино-кадр

import Replicate from "replicate";

const VIP_BASE_PROMPT = [
  "ultra cinematic portrait of the SAME person as in the input photo",
  "they are captured as a still frame from a high-budget movie",
  "keep exact facial identity and proportions: same face shape, nose, eyes, lips, jawline, same head size",
  "same gender, same ethnicity, same overall personality",
  "age stays similar, subtle beauty improvement only",
  "remove heavy eye bags and puffiness, soften small wrinkles, even skin tone but keep pores and realism",
  "do NOT replace their face with another person's face, do NOT change bone structure",
  "dramatic soft lighting with volumetric light and subtle film grain",
  "background with symbolic elements of their life: abstract hints of city, work, hobbies, blurred and cinematic",
  "35mm lens look, shallow depth of field, anamorphic bokeh",
  "new outfit that fits a movie character, not the original casual t-shirt",
  "extremely detailed, award-winning movie still"
].join(", ");

const EFFECT_PROMPTS = { ...EFFECT_PROMPTS_BASE() };
const GREETING_PROMPTS = { ...GREETING_PROMPTS_BASE() };

function EFFECT_PROMPTS_BASE() {
  return {
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
}

function GREETING_PROMPTS_BASE() {
  return {
    "new-year":
      "festive New Year greeting portrait, glowing warm lights, snow, elegant russian handwritten greeting text on the image",
    birthday:
      "birthday greeting portrait, balloons, confetti, festive composition, elegant russian handwritten birthday greeting text on the image",
    funny:
      "playful humorous greeting portrait, bright colors, fun composition, creative russian handwritten funny greeting text on the image",
    scary:
      "dark horror themed greeting portrait, spooky lighting, eerie atmosphere, creepy russian handwritten horror greeting text on the image"
  };
}

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

    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const promptParts = [VIP_BASE_PROMPT];
    if (userPrompt) promptParts.push(userPrompt);
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);

    const prompt = promptParts.join(". ").trim();

    const input = { prompt, output_format: "jpg" };
    if (photo) input.input_image = photo;

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      { input }
    );

    let imageUrl = null;
    if (Array.isArray(output)) imageUrl = output[0];
    else if (output?.output) {
      if (Array.isArray(output.output)) imageUrl = output.output[0];
      else if (typeof output.output === "string") imageUrl = output.output;
    } else if (typeof output === "string") imageUrl = output;

    if (!imageUrl) {
      return res.status(500).json({ error: "No image URL returned" });
    }

    return res.status(200).json({ ok: true, image: imageUrl });
  } catch (err) {
    console.error("VIP#2 GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}
