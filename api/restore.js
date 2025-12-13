// api/restore.js
// Photo restoration (single + group photos)
// Goal: restore damage/blur/fading while preserving ALL people and their identities.
// Replicate: FLUX-Kontext-Pro

import Replicate from "replicate";

/**
 * STRICT archival restoration prompt
 * - MUST keep all people
 * - MUST preserve identity, pose, composition
 * - MUST NOT add/remove people
 * - No beautification / no cinematic re-imagining
 */
const RESTORE_BASE_PROMPT = [
  "archival photo restoration of the ORIGINAL photograph",
  "restore damage, scratches, dust, stains, creases, and fading",
  "improve clarity and contrast gently, remove haze, reduce blur slightly",
  "preserve the exact composition, framing, camera angle, and background structure",
  "DO NOT add or remove people",
  "DO NOT crop out people",
  "preserve EVERY person in the photo, keep all faces and bodies present",
  "DO NOT change facial identity of any person",
  "DO NOT change age, gender, ethnicity, expression, pose, or body proportions",
  "DO NOT replace faces, do not merge faces, do not invent new faces",
  "preserve original clothing and hairstyle style (do not redesign outfits)",
  "keep realistic skin texture, no plastic skin, no beauty retouching",
  "no stylization, no cinematic look, no fantasy, no painting",
  "no text, no captions, no watermark, no logo, no signature"
].join(", ");

/**
 * Optional: gentle colorization for old black-and-white photos
 * (kept conservative; can be turned on by passing colorize=true)
 */
const COLORIZE_PROMPT = [
  "optional gentle natural colorization if the original is black and white",
  "colors must be realistic and subtle, consistent across the whole image",
  "do not change any person or object, only add plausible natural color"
].join(", ");

/**
 * Optional: extra care for group photos: emphasize multi-face preservation.
 * (If client sends isGroup=true we add this. Default prompt already enforces it.)
 */
const GROUP_GUARD_PROMPT = [
  "this is a family/group photo",
  "there are multiple people; preserve ALL of them",
  "do not pick one main subject; restore the entire scene equally"
].join(", ");

function json(res, status, data) {
  res.status(status).setHeader("Content-Type", "application/json");
  res.end(JSON.stringify(data));
}

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
    return json(res, 405, { error: "Method Not Allowed" });
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

    const {
      photo,
      // Optional hints from client (safe defaults if omitted)
      isGroup = false,
      colorize = false,
      // Optional additional notes (kept very short; avoid user injecting stylization)
      note = ""
    } = body || {};

    if (!photo) {
      return json(res, 400, { error: "Missing photo" });
    }

    const noteClean = String(note || "").trim().slice(0, 200);

    const promptParts = [RESTORE_BASE_PROMPT];

    if (isGroup) promptParts.push(GROUP_GUARD_PROMPT);
    if (colorize) promptParts.push(COLORIZE_PROMPT);
    if (noteClean) {
      // Only allow safe, restoration-oriented notes (very conservative)
      promptParts.push(
        `extra restoration note (do not stylize, do not change people): ${noteClean}`
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
      return json(res, 500, { error: "No image URL returned" });
    }

    return json(res, 200, {
      ok: true,
      image: imageUrl
    });
  } catch (err) {
    console.error("RESTORE ERROR:", err);
    return json(res, 500, {
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}