// api/generate-vip10.js — VIP стиль #10: Angel & Demon (оба лица — твои)
// FLUX-Kontext-Pro (Replicate)

import Replicate from "replicate";

// VIP #10 — один человек, в центре, слева ангел, справа демон, ВСЕ лица = ОДИН и тот же человек
const VIP_BASE_PROMPT = [
  "epic fantasy triptych-style portrait of the SAME person as in the input photo",
  "three figures in one wide frame: center, left and right, but ALL three share the SAME facial identity",
  "the CENTER figure is the neutral real-world version of this person, calm and grounded",
  "the LEFT figure is an angelic version of the SAME person",
  "the RIGHT figure is a demonic version of the SAME person",

  // идентичность лица
  "across all three figures keep clear facial identity: same face shape, same bone structure, same nose, eyes, lips and jawline",
  "same gender, same ethnicity, same approximate age in all three versions",
  "do NOT replace their face with any other actor, model or random attractive person",
  "do NOT change their face into someone from a magazine, it must look like the same real person in three roles",
  "subtle natural beauty enhancement only: smoother and more even skin tone, reduce harsh eye bags, keep realistic skin pores and texture",

  // центр
  "center version wears simple modern clothes, neutral expression, representing their everyday self",

  // ангел
  "left angel version has soft glowing light, subtle angelic wings behind the shoulders, delicate halo-like light above or behind the head",
  "outfit is light-colored or white, elegant but not cheesy, gentle and protective feeling",
  "eyes may look slightly brighter, but still the same facial identity",

  // демон
  "right demon version has darker dramatic lighting with a cold blue or deep red glow from behind",
  "subtle demonic horns or crown-like dark shapes suggested in the silhouette, not too grotesque",
  "eyes may glow slightly or have inner light, but still recognisably the same person",
  "outfit is darker, with hints of armor or sharp shapes, powerful but controlled",

  // общая сцена
  "background is a dark epic hall or abstract space with light dividing left and right sides, suggesting inner conflict between good and evil",
  "cinematic lighting, high contrast, ultra detailed skin, hair and fabrics",
  "composition feels like a premium fantasy book cover or AAA RPG key art, but faces stay realistic and personal"
].join(", ");

// Общие эффекты кожи / мимики
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

// Общие поздравления (если захочешь совместить с открытками)
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

    // Поздравление
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // Итоговый prompt (на фронт НЕ отдаём)
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

    return res.status(200).json({ ok: true, image: imageUrl });
  } catch (err) {
    console.error("VIP#10 GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}
