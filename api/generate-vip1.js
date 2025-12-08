// api/generate-vip1.js — VIP-генерация (10 сцен)
// Использует FLUX-Kontext-Pro (Replicate)
// Всегда сохраняем ТОГО ЖЕ человека (identity), меняем только сцену / стиль

import Replicate from "replicate";

// Общий блок: та же личность, лучшая версия, без замены лица
const IDENTITY_CORE = [
  "highly realistic portrait of the SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different model",
  "keep exact facial identity: same face shape, nose, eyes, lips, jawline and head proportions",
  "same gender, same ethnicity, same overall personality",
  "age stays similar (no more than about 5–10 years younger), do NOT turn them into a teenager or a completely different age",
  "subtle BEAUTY IMPROVEMENT ONLY: remove eye bags and puffiness, reduce dark circles, smooth small wrinkles, slightly slimmer cheeks if needed",
  "keep realistic skin texture and pores, no plastic skin, no doll face",
  "do NOT change bone structure or completely change the face",
  "they must be clearly recognisable as the same person"
].join(", ");

// 10 VIP-сцен
const VIP_SCENES = {
  // 1) Ломанная гравитация
  gravity: [
    IDENTITY_CORE,
    "set in a room where gravity is subtly broken",
    "hair gently flows slightly upward, following strange gravity",
    "small objects and dust around them softly floating in mid-air",
    "coffee or tea splashes sideways, frozen in motion",
    "main light source is a glowing pool of light on the floor, casting soft cinematic light from below",
    "soft cinematic colors, slightly surreal but still realistic photo"
  ].join(", "),

  // 2) Кино-кадр из дорогого фильма
  movie: [
    IDENTITY_CORE,
    "ultra cinematic portrait of the person from the reference photo",
    "captured as a still frame from a high-budget movie",
    "dramatic soft lighting, volumetric light, subtle film grain",
    "background with symbolic elements of their life: city hints, abstract shapes, blurred story details",
    "35mm lens, shallow depth of field, anamorphic bokeh, extremely detailed, award-winning movie still"
  ].join(", "),

  // 3) Градиент времени (молодой → старший)
  time_gradient: [
    IDENTITY_CORE,
    "surreal realistic portrait of the person from the reference photo",
    "their face smoothly transitioning from a younger version on the left side to an older version on the right side",
    "no hard split, continuous time gradient, delicate aging details, subtle wrinkles and hair changes",
    "background with soft blurred clocks and city lights, high-end editorial photography, ultra detailed skin"
  ].join(", "),

  // 4) Доска улик
  evidence_board: [
    IDENTITY_CORE,
    "crime scene evidence board style composition",
    "central Polaroid-style photo of the person from the reference photo pinned to a corkboard",
    "surrounded by surreal dream fragments as smaller photos: floating staircase, misty corridor, symbolic objects",
    "red strings connecting the central portrait to the fragments",
    "moody overhead light, cinematic shadows, hyperrealistic textures, detective investigation aesthetic"
  ].join(", "),

  // 5) Комната уведомлений
  notification_room: [
    IDENTITY_CORE,
    "surreal interior portrait of the person from the reference photo sitting or standing in a room",
    "all walls, ceiling and floor are made of frozen phone notifications and chat bubbles",
    "emails, app icons, message previews forming a 3D mosaic surface",
    "one real physical window with natural light and no notifications",
    "high realism, detailed typography, 8k, subtle glow from screens, modern cinematic look"
  ].join(", "),

  // 6) Альтернативные жизни
  alternate_lives: [
    IDENTITY_CORE,
    "group portrait in a single frame",
    "the person from the reference photo appears as 3-4 alternate life versions standing together",
    "one as an artist with paint on hands",
    "one as a scientist with lab coat",
    "one as a cyberpunk version with neon implants",
    "one as a calm older self",
    "all faces clearly related, same base features, different outfits and details",
    "soft studio lighting, cinematic composition, ultra detailed, story-rich photo"
  ].join(", "),

  // 7) Телефон 2525
  future_2525: [
    IDENTITY_CORE,
    "hyper realistic portrait of the person from the reference photo taken by a smartphone camera from the year 2525",
    "semi-transparent holographic overlays around the head showing emotions and thoughts as floating icons and abstract symbols",
    "minimal futuristic UI elements, clean AR interface, volumetric light",
    "high resolution, glossy, cutting-edge sci-fi photography style"
  ].join(", "),

  // 8) Хронология искусства
  art_timeline: [
    IDENTITY_CORE,
    "composite portrait of the person from the reference photo standing in front of a wall made of vertical panels from different eras",
    "ancient stone carvings, renaissance painting fragments, old film frames, digital glitch screens",
    "their body and face remain realistic and consistent, lit by soft museum-like light",
    "the background subtly changes style from left to right like a timeline of human art",
    "ultra detailed, poetic, slightly surreal, high-end art photography"
  ].join(", "),

  // 9) Звёздное растворение
  star_dissolve: [
    IDENTITY_CORE,
    "dreamlike portrait of the person from the reference photo",
    "parts of their hair and shoulders dissolve into a starry night sky",
    "tiny constellations gently shaping the outline of their head and thoughts",
    "soft glow around the eyes, subtle cosmic dust, not too abstract, still clearly their face",
    "long exposure photography feel, ultra detailed, magical but elegant, premium art print style"
  ].join(", "),

  // 10) Ангел и бес (триптих)
  angel_demon: [
    IDENTITY_CORE,
    "epic symbolic triptych-style portrait of the person from the reference photo",
    "their real self stands in the center, calm and neutral, clearly recognisable as themselves",
    "on the left side an angelic version of them with the same face, soft warm light, subtle wings and halo",
    "on the right side a demonic version of them with the same face, darker dramatic light, subtle horns or shadowy silhouette, blue or red inner glow",
    "all three clearly share the same facial identity and features",
    "background like a dramatic cathedral or cosmic void where light and shadow clash",
    "ultra detailed, cinematic, high contrast, premium art print style"
  ].join(", ")
};

// Эффекты (как и раньше)
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

// Поздравления (если совмещаем с открытками)
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

    // ожидаем: { scene, text, photo, effects, greeting }
    const { scene, text, photo, effects, greeting } = body || {};

    if (!scene || !VIP_SCENES[scene]) {
      return res.status(400).json({
        error: "Unknown or missing VIP scene",
        availableScenes: Object.keys(VIP_SCENES)
      });
    }

    const basePrompt = VIP_SCENES[scene];
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

    // собираем итоговый prompt
    const promptParts = [basePrompt];
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