// api/generate-vip1.js — VIP style #1 (broken gravity room)
// Uses FLUX-Kontext-Pro (Replicate)
// Goal: SAME PERSON, better-looking version, plus special "gravity" scene.

import Replicate from "replicate";

// Base VIP prompt: same identity + beauty retouch + broken gravity scene
const VIP_BASE_PROMPT = [
  // identity & beauty rules
  "highly realistic portrait of the SAME person as in the input photo",
  "this is the BEST IMPROVED VERSION of this person, not a different model",
  "keep exact facial identity: same face shape, nose, eyes, lips, jawline and head proportions",
  "same gender, same ethnicity, same overall personality",
  "age stays similar, at most 5–10 years younger, do NOT turn them into a teenager or a completely different age",
  "subtle BEAUTY IMPROVEMENT ONLY: remove eye bags and puffiness, reduce dark circles, smooth small wrinkles, slightly slimmer cheeks if needed",
  "even and healthy skin tone, reduce redness and blemishes, keep realistic skin texture and pores, no plastic or doll-like skin",
  "do NOT change bone structure, do NOT replace the face with another person",
  "they must be clearly recognisable as the same person in real life",
  "soft, flattering cinematic lighting on the face, no harsh shadows",
  "calm, confident or slightly hopeful facial expression, not angry and not extremely sad",
  "outfit gently upgraded to match the scene: clean, well-fitting modern clothes that suit their personality",

  // gravity scene
  "set in a room where gravity is subtly broken",
  "their hair gently moves or flows slightly upward, following strange gravity",
  "small objects and dust around them softly floating in mid-air",
  "papers or light particles drifting in different directions",
  "main light source is a glowing pool of light on the table or floor in front of them, casting soft cinematic light from below",
  "soft atmospheric background, slightly surreal but still realistic photo",
  "high resolution, premium portrait photography, shallow depth of field"
].join(", ");

// Extra effects (same IDs as on the frontend)
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

// Greetings — in case you combine VIP + postcards
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

    // effects
    let effectsPrompt = "";
    if (Array.isArray(effects) && effects.length > 0) {
      effectsPrompt = effects
        .map((k) => EFFECT_PROMPTS[k])
        .filter(Boolean)
        .join(", ");
    }

    // greeting
    let greetingPrompt = "";
    if (greeting && GREETING_PROMPTS[greeting]) {
      greetingPrompt = GREETING_PROMPTS[greeting];
    }

    // final prompt
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
