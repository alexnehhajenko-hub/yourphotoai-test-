// api/restore.js — RESTORE (реставрация старых фото, включая групповые)
// FLUX-Kontext-Pro (Replicate)
// Цель: восстановить фото + УБРАТЬ РАМКИ/ОБРЫВКИ/ПОЛЯ старой бумаги
// Важно: сохранить ВСЕХ людей, лица и композицию

import Replicate from "replicate";

const RESTORE_BASE_PROMPT = [
  // --- PRIMARY GOAL ---
  "photo restoration of the input image",
  "restore and enhance the original photo, keep it realistic and historically plausible",

  // --- PEOPLE / IDENTITY / GROUP SAFETY ---
  "preserve ALL people in the photo, do NOT remove anyone",
  "preserve the original number of people, their positions, poses and relative sizes",
  "do NOT merge people, do NOT replace faces, do NOT generate a different person",
  "keep facial identity for each person as close as possible to the source photo",
  "do NOT beautify heavily, keep authentic facial features",
  "do NOT change body proportions, do NOT change head sizes",
  "keep clothing style consistent with the original era unless colorization requires subtle adaptation",

  // --- DAMAGE REMOVAL ---
  "remove scratches, dust, stains, cracks, fold marks, blotches",
  "reduce blur and restore sharpness carefully, avoid over-sharpening",
  "restore missing details naturally where possible",
  "improve contrast and dynamic range, keep natural look",
  "restore skin tones (if colorized) with realism, no plastic skin",
  "keep film grain subtle and realistic",

  // --- FRAME / BORDER REMOVAL (THIS IS THE KEY PART) ---
  "REMOVE any photo border, frame, paper edges, torn edges, white margins, black margins, scanner borders",
  "do NOT keep the old paper boundary or remaining corners",
  "extend and reconstruct the image to a clean full-rectangle photo (full frame)",
  "fill missing outer areas naturally based on the scene, seamless background continuation",
  "final image must look like a normal complete photo without any leftover frame",

  // --- HARD NEGATIVES ---
  "NO text, NO watermarks, NO logos, NO UI elements",
  "NO polaroid style, NO evidence board, NO collage, NO split frame",
  "NO adding extra people, NO removing people, NO changing identities"
].join(", ");

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

    const { photo, text } = body || {};
    const userPrompt = (text || "").trim();

    if (!photo) {
      return res.status(400).json({ error: "No photo provided" });
    }

    // Итоговый prompt
    // (userPrompt можно использовать, если хочешь усилить цветизацию/контраст/и т.п.)
    const prompt = userPrompt
      ? `${RESTORE_BASE_PROMPT}. ${userPrompt}`
      : RESTORE_BASE_PROMPT;

    const input = {
      prompt,
      output_format: "jpg",
      input_image: photo
    };

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
    console.error("RESTORE ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}
