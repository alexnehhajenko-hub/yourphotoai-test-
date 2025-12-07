// api/restore.js — восстановление и “оживление” старых фото
// Вход: { photo: base64 } — так же, как сейчас отправляем в /api/generate
// Выход: { ok: true, image: "https://..." }

import Replicate from "replicate";

// Базовый prompt для реставрации/раскраски
const RESTORE_PROMPT = [
  "highly realistic restoration and colorization of the SAME person as in the input photo",
  "remove scratches, cracks, dust, stains and paper texture",
  "repair damaged or missing areas while keeping the SAME facial identity and proportions",
  "keep the same age, gender and ethnicity, do not turn them into a different model",
  "softly smooth small wrinkles and noise, but preserve real skin texture (no plastic skin)",
  "natural skin tones, realistic colors for hair, clothes and background",
  "overall look: as if the original old photo was re-shot today with a modern camera, but with the same person and pose"
].join(", ");

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method Not Allowed" });
  }

  try {
    // Парсим тело запроса
    let body = req.body;
    if (typeof body === "string") {
      try {
        body = JSON.parse(body);
      } catch {
        body = {};
      }
    }

    const { photo } = body || {};

    if (!photo) {
      return res.status(400).json({ error: "Missing 'photo' in request body" });
    }

    // Итоговый prompt только для реставрации
    const prompt = RESTORE_PROMPT;

    // Вход для Replicate — тот же формат, что и в generate.js
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

    // Достаём URL из ответа
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
        error: "No image URL returned"
      });
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
