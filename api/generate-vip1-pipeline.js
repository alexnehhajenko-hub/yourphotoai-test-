// api/generate-vip.js
// ONE endpoint for 10 VIP styles (to avoid Vercel serverless limit)
// FLUX-Kontext-Pro (Replicate)

import Replicate from "replicate";

const IDENTITY_LOCK = [
  "highly realistic portrait of the SAME person as in the input reference photo",
  "identity lock: keep the exact same facial identity (same face shape, bone structure, nose, eyes, lips, jawline, head proportions)",
  "do NOT replace the face with another person, do NOT generate a different model",
  "the person must be clearly recognisable as the same person",
  "keep gender and ethnicity consistent with the input photo",
  "no extreme age change (max 5–10 years younger). do NOT turn into a teenager",
  "natural skin texture, keep pores, no plastic doll skin",
  "remove mild under-eye bags, reduce dark circles, reduce small wrinkles, even skin tone slightly (natural)",
  "IMPORTANT: generate new clothing appropriate for the VIP theme (do not keep the same t-shirt)",
  "no text, no watermarks, no logos, no UI overlays"
].join(", ");

const VIP_STYLES = {
  "vip-knight": [
    "ultra cinematic epic portrait",
    "the person as a noble knight commander",
    "realistic medieval armor, detailed metal, cape, subtle heraldic symbol",
    "dramatic rim light, volumetric light beams, moody background: vast castle hall",
    "35mm lens look, shallow depth of field, high-end movie still"
  ].join(", "),

  "vip-gravity": [
    "set in a room where gravity is subtly broken (subtle and believable)",
    "hair gently lifts only slightly, not crazy",
    "a few small objects and dust floating slowly",
    "light source: soft glowing pool of light on the floor, cinematic under-light",
    "keep composition clean: no random candles or props unless they fit naturally",
    "soft cinematic colors, realistic photo"
  ].join(", "),

  "vip-order-silence": [
    "epic fantasy portrait concept art for AAA RPG",
    'the person as the grandmaster of a secret order called "Order of Silence"',
    "elegant dark robes with subtle silver embroidery",
    "order symbol integrated into jewelry and fabric, faint glowing sigils",
    "background: vast dim hall with tall columns, banners, floating symbols of silence",
    "cinematic soft directional light, hyper detailed face and fabrics"
  ].join(", "),

  "vip-movie": [
    "ultra cinematic portrait captured as a still frame from a high-budget movie",
    "dramatic soft lighting, subtle film grain, anamorphic bokeh",
    "background with symbolic elements of their life: abstract shapes, blurred story hints",
    "35mm lens, shallow depth of field, award-winning movie still"
  ].join(", "),

  "vip-time": [
    "surreal realistic portrait with a continuous time gradient",
    "the face smoothly transitions from slightly younger on the left to slightly older on the right",
    "NO hard split, continuous blend, delicate aging details",
    "keep identity consistent across both sides (same person!)",
    "background: soft blurred clocks and city lights, high-end editorial photography"
  ].join(", "),

  "vip-evidence": [
    "crime scene evidence board style composition",
    "central Polaroid-style photo of the person pinned to a corkboard",
    "surrounded by smaller photos: misty corridor, symbolic objects, dream fragments",
    "red strings connecting the central portrait to fragments",
    "moody overhead light, cinematic shadows, hyperrealistic textures"
  ].join(", "),

  "vip-notifs": [
    "surreal interior portrait in a room",
    "walls/ceiling/floor made of frozen phone notifications and chat bubbles (3D mosaic)",
    "emails, app icons, message previews forming a futuristic surface",
    "one real physical window with natural light and NO notifications",
    "high realism, modern cinematic look, subtle glow from screens",
    "IMPORTANT: no readable private text, use abstract/blurred UI blocks only"
  ].join(", "),

  "vip-altlives": [
    "group portrait in a single frame",
    "the same person appears as 4 alternate life versions standing together",
    "one: artist with paint on hands, one: scientist in lab coat, one: cyberpunk with neon accents, one: calm older self",
    "all faces clearly related and recognisable as the same person (identity consistent)",
    "cinematic studio lighting, story-rich composition, ultra detailed"
  ].join(", "),

  "vip-2525": [
    "hyper realistic portrait taken by a smartphone camera from the year 2525",
    "semi-transparent holographic overlays around the head showing emotions/thoughts as abstract icons",
    "minimal futuristic AR UI, clean design, volumetric light",
    "cutting-edge sci-fi photography style",
    "IMPORTANT: no readable text, use abstract UI shapes"
  ].join(", "),

  "vip-angel-demon": [
    "epic triptych-style composition in one image",
    "center: the person as their normal self (realistic)",
    "left: angelic version of the SAME person (same face) with subtle wings and holy light",
    "right: demonic version of the SAME person (same face) with subtle horns/embers, dark aura",
    "all three faces must be the same identity, only styling changes",
    "cinematic, high contrast, epic atmosphere, no gore, no horror text"
  ].join(", ")
};

const EFFECT_PROMPTS = {
  "no-wrinkles": "fewer visible wrinkles, gentle retouch, keep natural skin texture",
  younger: "looks around 5–10 years younger but clearly the same person, fresher and more rested face",
  "smooth-skin": "smoother and more even skin tone, reduce blemishes and redness, keep pores and realism",
  "smile-soft": "subtle soft smile, calm and relaxed expression",
  "smile-big": "big warm smile, expressive and friendly face",
  "smile-hollywood": "wide smile with visible teeth, natural",
  laugh: "laughing with a bright smile, joyful and natural expression",
  neutral: "neutral relaxed face expression",
  serious: "serious face, no smile, focused expression",
  "eyes-bigger": "slightly bigger and more open eyes, still realistic",
  "eyes-brighter": "brighter eyes, clearer irises, vivid gaze"
};

const GREETING_PROMPTS = {
  "new-year": "festive New Year greeting vibe, elegant holiday lights, snow bokeh (NO text on image)",
  birthday: "birthday celebration vibe, balloons/confetti (NO text on image)",
  funny: "playful humorous vibe, colorful creative scene (NO text on image)",
  scary: "dark spooky atmosphere, cinematic shadows (NO text on image)"
};

function pickImageUrl(output) {
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

  return imageUrl;
}

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "Method Not Allowed" });

  try {
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { text, photo, effects, greeting, vipId } = body || {};

    if (!photo) return res.status(400).json({ error: "Missing photo" });
    if (!vipId || !VIP_STYLES[vipId]) {
      return res.status(400).json({ error: "Unknown vipId" });
    }

    const userPrompt = (text || "").trim();

    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects.map((k) => EFFECT_PROMPTS[k]).filter(Boolean).join(", ");
    }

    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    const vipScene = VIP_STYLES[vipId];

    // Final prompt: Identity lock + VIP scene + optional additions
    const promptParts = [IDENTITY_LOCK, vipScene];
    if (effectsPrompt) promptParts.push(effectsPrompt);
    if (greetingPrompt) promptParts.push(greetingPrompt);
    if (userPrompt) promptParts.push(userPrompt);

    const prompt = promptParts.join(". ").trim();

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

    const input = {
      prompt,
      input_image: photo,
      output_format: "jpg"
    };

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", { input });

    const imageUrl = pickImageUrl(output);
    if (!imageUrl) return res.status(500).json({ error: "No image URL returned" });

    return res.status(200).json({ ok: true, image: imageUrl });
  } catch (err) {
    console.error("VIP GENERATION ERROR:", err);
    return res.status(500).json({
      error: "VIP generation failed",
      details: err?.message || String(err)
    });
  }
}