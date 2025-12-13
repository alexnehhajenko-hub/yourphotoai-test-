// api/restore.js
// Photo Restoration (Replicate / FLUX-Kontext-Pro)
// Goal: clean & restore OLD / damaged / scanned photos WITHOUT changing faces/identity.
// Works for group photos: preserve every person, no face swaps, no "beautifying" into someone else.

import Replicate from "replicate";

const RESTORE_BASE_PROMPT = [
  "photo restoration and cleanup of the input image",
  "preserve the original composition EXACTLY: same people, same positions, same camera angle",
  "IDENTITY LOCK: do not change any person's face or identity",
  "for group photos: preserve EVERY face, do NOT replace faces, do NOT merge people, do NOT remove people",
  "do not invent new facial features, do not make faces younger or different",
  "restore damaged areas conservatively: remove dust, scratches, creases, stains, blotches",
  "reduce noise and grain carefully, keep a natural photo texture",
  "improve clarity and contrast slightly, keep it realistic",
  "repair faded areas and uneven exposure, keep original lighting feel",
  "no beauty retouch, no makeup, no plastic skin",
  "no text, no logos, no watermarks, no UI overlays"
].join(", ");

const RESTORE_COLOR_PROMPT = [
  "if the photo is black and white, keep it black and white by default",
  "do NOT colorize unless explicitly asked by the user"
].join(", ");

const OPTIONAL_COLORIZE_PROMPT = [
  "careful photo colorization (only if requested)",
  "natural skin tones, realistic clothes colors, keep it subtle and historically plausible",
  "do not alter faces or identities while colorizing"
].join(", ");

const OPTIONAL_ENHANCE_PROMPT = [
  "slightly improve sharpness in a natural way",
  "restore small missing details conservatively (do not hallucinate new objects)",
  "keep edges and textures realistic"
].join(", ");

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

    const { photo, text, options } = body || {};
    if (!photo) return res.status(400).json({ error: "Missing photo" });

    // options: { colorize?: boolean, enhance?: boolean }
    const colorize = Boolean(options?.colorize);
    const enhance = Boolean(options?.enhance);

    const userPrompt = (text || "").trim();

    const promptParts = [RESTORE_BASE_PROMPT, RESTORE_COLOR_PROMPT];

    if (enhance) promptParts.push(OPTIONAL_ENHANCE_PROMPT);
    if (colorize) promptParts.push(OPTIONAL_COLORIZE_PROMPT);

    // userPrompt allowed, but we still protect identity strongly
    if (userPrompt) {
      promptParts.push(
        [
          "User notes (follow ONLY if it does not change identity/faces):",
          userPrompt
        ].join(" ")
      );
    }

    const prompt = promptParts.join(". ").trim();

    const replicate = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN
    });

    const input = {
      prompt,
      input_image: photo,
      output_format: "jpg"
    };

    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input
    });

    const imageUrl = pickImageUrl(output);
    if (!imageUrl) {
      return res.status(500).json({ error: "No image URL returned" });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("RESTORE ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}