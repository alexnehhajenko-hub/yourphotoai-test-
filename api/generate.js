// api/generate.js — FLUX-Kontext-Pro (Replicate)
// Фото / эффекты кожи / мимика / поздравления (БЕЗ надписей на изображении)

import Replicate from "replicate";

// ───────────── СТИЛИ ─────────────
const STYLE_PREFIX = {
  oil: "oil painting portrait, detailed, soft warm light, artistic, rich colors, preserve the same person",
  anime:
    "anime style portrait, clean line art, soft pastel shading, expressive eyes, preserve the same person",
  poster:
    "cinematic movie poster portrait, dramatic lighting, high contrast, shallow depth of field, preserve the same person",
  classic:
    "classical old master portrait, realism, warm tones, detailed skin, subtle textured background, preserve the same person",

  "old-photo":
    "vintage old photo portrait, slightly faded colors, soft warm tone, subtle film grain, gentle vignette, preserve the same person, do not erase the background",

  "dark-demon":
    "dark fantasy horror portrait of the same person, dramatic moody lighting, strong contrast, subtle demonic elements like small horns or dark aura, highly detailed realistic face, cinematic horror atmosphere, no blood, no gore",

  default:
    "realistic portrait, detailed face, soft studio lighting, natural colors, preserve the same person"
};

// ───────── ЭФФЕКТЫ КОЖИ + МИМИКА ─────────
const EFFECT_PROMPTS = {
  // кожа — усиленные
  "no-wrinkles":
    "reduce wrinkles strongly but naturally: smooth forehead lines, crow's feet, under-eye wrinkles, nasolabial folds; keep pores and realistic skin texture; keep identity",
  younger:
    "make the same person look clearly younger (about 10-20 years), healthier and more rested; reduce signs of aging (wrinkles, under-eye bags, sagging) but keep the same identity and facial structure",
  "smooth-skin":
    "smooth and even out skin tone, reduce blemishes and small imperfections, keep pores and realistic texture",

  "beauty-one-touch":
    "one-touch beauty: remove acne and small blemishes, reduce fine and medium wrinkles, improve skin tone, soften harsh shadows on the face, keep pores and realism, keep identity",

  "glow-golden":
    "warm golden glow on the face, healthy skin, soft highlights, keep identity",
  "cinematic-light":
    "cinematic soft key light and gentle shadows on the face, better contrast, keep identity",

  // мимика
  "smile-soft":
    "same person with a subtle soft smile, calm relaxed expression, no change to face structure",
  "smile-big":
    "same person with a big warm smile, friendly face",
  "smile-hollywood":
    "same person with a wide natural smile, visible teeth, confident look",
  laugh:
    "same person laughing naturally, joyful expression",
  neutral:
    "same person with neutral relaxed face expression",
  serious:
    "same person with a serious focused expression",
  "eyes-bigger":
    "same person with slightly more open attentive eyes, keep eye shape and identity",
  "eyes-brighter":
    "same person with brighter more vivid gaze, keep facial structure",
  "surprised-wow":
    "same person with a surprised wow expression, eyes a bit wider, eyebrows raised"
};

// ───────── ПОЗДРАВЛЕНИЯ (БЕЗ ТЕКСТА НА КАРТИНКЕ) ─────────
const GREETING_PROMPTS = {
  "new-year":
    "festive New Year portrait, cozy winter atmosphere, colorful lights and bokeh, subtle fireworks in the distance, vivid contrast, NO text on the image",
  birthday:
    "colorful birthday celebration atmosphere, balloons and confetti, party lights, bright happy mood, NO text on the image",
  funny:
    "playful fun portrait, bright colors, comic-style shapes, cheerful vibe, NO text on the image",
  scary:
    "dark spooky portrait, cold dramatic lighting, subtle fog, creepy but non-gory, NO text on the image"
};

// ───────── ИДЕНТИЧНОСТЬ ─────────
function buildIdentityPrompt({ allowAgeChange }) {
  const base =
    "STRICTLY edit this exact portrait photo of the SAME person from the input image only. " +
    "The final result MUST be clearly recognizable as the same person (very high similarity). " +
    "Keep the same gender, face shape and main facial features. " +
    "Do NOT replace the face with a different person. " +
    "Do NOT change ethnicity. " +
    "Do NOT add extra people.";

  if (allowAgeChange) {
    return (
      base +
      " Age adjustment is allowed ONLY to make the same person look younger naturally, while keeping identity and facial structure."
    );
  }

  return (
    base +
    " Do NOT change the age noticeably unless a 'younger' or anti-wrinkle effect is explicitly requested."
  );
}

// ───────── УБРАТЬ UI/ТЕКСТ/ЛОГОТИПЫ ВСЕГДА ─────────
const NO_TEXT_TAIL =
  "ABSOLUTELY NO TEXT, NO LETTERS, NO WATERMARKS, NO LOGOS, NO CAPTIONS, NO SIGNS anywhere in the output image.";

const UI_CLEANUP_TAIL =
  "If the input looks like a screenshot of a website or app (with panels, buttons, menus, or long text around the face), completely remove and repaint all interface elements and borders. Output only a clean portrait with a simple background.";

// ───────── БЕЗОПАСНОСТЬ ─────────
const SAFETY_TAIL =
  "portrait from the shoulders up, person is fully clothed, no nudity, no explicit cleavage, no sexual content, no distorted anatomy";

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

    const { style, text, photo, effects, greeting } = body || {};

    const stylePrefix = STYLE_PREFIX[style] || STYLE_PREFIX.default;

    const userPrompt = (text || "").trim();

    const effectsArr = Array.isArray(effects) ? effects : [];
    const allowAgeChange =
      effectsArr.includes("younger") ||
      effectsArr.includes("no-wrinkles") ||
      effectsArr.includes("beauty-one-touch");

    let effectsPrompt = "";
    if (effectsArr.length > 0) {
      effectsPrompt = effectsArr
        .map((key) => EFFECT_PROMPTS[key])
        .filter(Boolean)
        .join(". ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const identityPrompt = buildIdentityPrompt({ allowAgeChange });

    const promptParts = [
      stylePrefix,
      effectsPrompt,
      greetingPrompt,
      userPrompt,
      identityPrompt,
      NO_TEXT_TAIL,
      UI_CLEANUP_TAIL,
      SAFETY_TAIL
    ].filter(Boolean);

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

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

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
        error: "No image URL returned",
        raw: output
      });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      prompt
    });
  } catch (err) {
    console.error("GENERATION ERROR:", err);
    return res.status(500).json({
      error: "Generation failed",
      details: err?.message || String(err)
    });
  }
}