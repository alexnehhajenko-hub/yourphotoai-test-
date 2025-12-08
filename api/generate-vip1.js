// api/generate-vip1.js — VIP стили (10 режимов)
// Использует FLUX-Kontext-Pro (Replicate)
// Главная цель: ТОТ ЖЕ человек, только чуть чище + особая сцена

import Replicate from "replicate";

// Общий префикс: сохраняем личность человека
const IDENTITY_PREFIX = [
  "hyper realistic portrait photo of the SAME person as in the input photo",
  "absolutely keep the same facial identity: same face shape, same nose, same eyes, same lips, same jawline, same head proportions",
  "same gender, same ethnicity, same general build and personality",
  "do NOT replace the face with a different person, no generic model face, no face swap",
  "only very subtle beauty cleanup: gently reduce eye bags and puffiness, soften dark circles, slightly smooth small wrinkles",
  "preserve real skin texture and pores, no plastic doll skin, no heavy airbrush",
  "do NOT change bone structure, do NOT change nose size or shape, do NOT change eye shape, do NOT change jaw or cheek structure",
  "age remains almost the same (at most 3–5 years younger), same age group as in the input photo"
].join(", ");

// 10 VIP-сцен
const VIP_SCENES = {
  // 1. Рыцарь / Орден тишины
  knight: [
    "epic fantasy portrait of the same person as the grandmaster of a secret order called 'Order of Silence'",
    "wearing elegant dark robes with subtle silver embroidery and symbols of silence",
    "order's emblem integrated into jewelry and fabric, faint glowing sigils",
    "background: vast dim hall with tall columns, banners and floating symbols of silence",
    "soft directional light from above, cinematic, hyper detailed fabrics and face, concept art for AAA RPG"
  ].join(", "),

  // 2. Гравитация (текущий режим, оставляем по умолчанию)
  gravity: [
    "realistic portrait of the same person in a room where gravity is subtly broken",
    "hair and small details react slightly to strange gravity but still look realistic",
    "small objects and dust softly floating in mid-air around them",
    "papers slowly drifting, frozen in motion",
    "main light source is a glowing pool of light on the table or floor in front of them, casting soft cinematic light from below",
    "soft cinematic colors, slightly surreal but still realistic photo, high resolution, detailed textures"
  ].join(", "),

  // 3. Кино-кадр
  cinema: [
    "ultra cinematic portrait of the person from the reference photo",
    "captured as a still frame from a high-budget movie",
    "dramatic soft lighting, volumetric light, subtle film grain",
    "background with symbolic elements of their life: city hints, abstract shapes, blurred story details",
    "35mm lens look, shallow depth of field, anamorphic bokeh, extremely detailed, award-winning movie still"
  ].join(", "),

  // 4. Градиент времени — моложе ↔ старше
  time_gradient: [
    "surreal realistic portrait of the person from the reference photo",
    "their face smoothly transitioning from a younger version on the left side to an older version on the right side",
    "no hard split, continuous time gradient across the face",
    "delicate aging details, subtle wrinkles and hair changes, very natural",
    "background with soft blurred clocks and city lights, high-end editorial photography, ultra detailed skin"
  ].join(", "),

  // 5. Доска улик / детектив
  crime_board: [
    "crime scene evidence board style composition",
    "central Polaroid-style photo of the person from the reference photo pinned to a corkboard",
    "surrounded by surreal dream fragments as smaller photos: floating staircase, misty corridor, symbolic objects",
    "red strings connecting the central portrait to the fragments",
    "moody overhead light, cinematic shadows, hyperrealistic textures, detective investigation aesthetic"
  ].join(", "),

  // 6. Комната из уведомлений
  notifications: [
    "surreal interior portrait of the person from the reference photo sitting or standing in a room",
    "all walls, ceiling and floor are made of frozen phone notifications and chat bubbles",
    "emails, app icons, message previews forming a 3D mosaic surface",
    "one real physical window with natural light and no notifications",
    "high realism, detailed typography, 8k, subtle glow from screens, modern cinematic look"
  ].join(", "),

  // 7. Мультивселенная: 3–4 версии жизни
  multiverse: [
    "group portrait in a single frame",
    "the person from the reference photo appears as 3-4 alternate life versions standing together",
    "one as an artist with paint on hands",
    "one as a scientist with a lab coat",
    "one as a cyberpunk version with neon implants",
    "one as a calm older self",
    "all faces clearly related, same base features, different outfits and details",
    "soft studio lighting, cinematic composition, ultra detailed, story-rich photo"
  ].join(", "),

  // 8. Смартфон 2525 года
  future_phone: [
    "hyper realistic portrait of the person from the reference photo",
    "as if taken by a smartphone camera from the year 2525",
    "semi-transparent holographic overlays around the head showing emotions and thoughts",
    "floating icons and abstract symbols as AR elements",
    "minimal futuristic UI, clean HUD, volumetric light",
    "high resolution, glossy, cutting-edge sci-fi photography style"
  ].join(", "),

  // 9. Стена эпох искусства
  art_timeline: [
    "composite portrait of the person from the reference photo standing in front of a wall made of vertical panels from different eras",
    "ancient stone carvings, renaissance painting fragments, old film frames, digital glitch screens",
    "their body and face remain realistic and consistent, lit by soft museum-like light",
    "the background subtly changes style from left to right like a timeline of human art",
    "ultra detailed, poetic, slightly surreal, high-end art photography"
  ].join(", "),

  // 10. Волосы → звёздное небо
  starry_hair: [
    "dreamlike portrait of the person from the reference photo",
    "parts of their hair and shoulders dissolve into a starry night sky",
    "tiny constellations gently shaping the outline of their head and thoughts",
    "soft glow around the eyes, subtle cosmic dust, still clearly their face",
    "long exposure photography feel, ultra detailed, magical but elegant, premium art print style"
  ].join(", "),

  // 11. Центр + ангел и демон по бокам (если захочешь — можно включить вместо какого-то режима)
  angel_devil: [
    "epic symbolic triptych-style composition in a single image",
    "the real person from the reference photo stands or sits in the center, realistic and calm",
    "on the left side a guardian angel version of them with the SAME facial features, soft light, gentle halo",
    "on the right side a darker demon version of them with the SAME facial features, subtle horns or shadows, red or cold glow",
    "both sides clearly share the same face structure and identity as the central person",
    "background fades into light on the angel side and into darkness on the demon side",
    "cinematic lighting, highly detailed, dramatic but tasteful, premium art poster"
  ].join(", ")
};

// Эффекты (кожа, мимика)
const EFFECT_PROMPTS = {
  "no-wrinkles":
    "slightly fewer visible wrinkles, gentle beauty retouch, keep natural skin texture and pores",
  younger:
    "looks around 3–5 years more rested but clearly the same person and same age group",
  "smooth-skin":
    "smoother and more even skin tone, reduce blemishes and redness, keep pores and realism",
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood":
    "wide smile with visible teeth, hollywood style, still realistic",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed face expression, no strong emotion",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "slightly more open eyes, but still realistic and same eye shape",
  "eyes-brighter": "brighter eyes, clearer irises, more vivid gaze"
};

// Поздравления
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

    const { text, photo, effects, greeting, vipMode } = body || {};

    const userPrompt = (text || "").trim();

    // Выбираем сцену (по умолчанию — gravity, чтобы твой текущий режим не сломать)
    const modeKey = vipMode && VIP_SCENES[vipMode] ? vipMode : "gravity";
    const vipScene = VIP_SCENES[modeKey];

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

    // Итоговый prompt
    const promptParts = [IDENTITY_PREFIX, vipScene];
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
      image: imageUrl,
      vipMode: modeKey
    });
  } catch (err) {
    console.error("VIP GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}