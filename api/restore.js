// api/restore.js — Photo Restoration (group-safe, keep identities)
// Uses FLUX-Kontext-Pro (Replicate)

import Replicate from "replicate";

const RESTORE_BASE_PROMPT = [
  // Главная цель
  "restore and enhance the old photo while preserving the original content",

  // Жёстко: никого не убирать и не добавлять
  "DO NOT remove any people",
  "DO NOT add new people",
  "keep the same number of people and their positions",

  // Сходство лиц
  "preserve each person's facial identity and features",
  "do NOT replace faces, do NOT swap faces, do NOT generate different-looking people",
  "keep original age, gender, ethnicity for each person",

  // Форма реставрации
  "fix blur, improve sharpness and fine details carefully",
  "reduce noise and scratches, remove dust and stains",
  "recover missing details subtly without changing the scene",

  // Одежда / позы / руки
  "keep clothing style and era consistent with the original photo",
  "do NOT modernize clothing",
  "keep hands, fingers and limbs consistent with the original",

  // Цвет
  "if colorizing, use natural realistic skin tones and era-appropriate colors",
  "avoid oversaturated colors, keep a classic photographic look",

  // Рамка/обрывки
  "remove paper borders, torn edges and frame artifacts if present",
  "crop to the actual photo content",
  "if edges are missing, extend the background and scene naturally without inventing new subjects",

  // Запреты
  "no text, no captions, no logos, no watermarks",
  "no dramatic stylization, no fantasy look, keep it photorealistic restoration"
].join(", ");

const MODE_PRESETS = {
  // По умолчанию: безопасная реставрация (без «переизобретения» фото)
  safe: [
    "gentle restoration, minimal hallucination",
    "keep original composition and camera perspective",
    "keep faces authentic and consistent"
  ].join(", "),

  // Цветная реставрация (как “оживление”)
  colorize: [
    "colorize the photo realistically",
    "subtle warm natural colors, realistic whites and blacks",
    "keep the lighting and shadows consistent with the original"
  ].join(", "),

  // Ч/Б реставрация (если хочешь оставить монохром)
  bw: [
    "keep it black and white",
    "improve tones and contrast, keep classic film look"
  ].join(", ")
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

    const { photo, mode, text } = body || {};

    if (!photo) {
      return res.status(400).json({ error: "Missing photo" });
    }

    // mode: "safe" | "colorize" | "bw"
    const m = (mode || "colorize").toLowerCase();
    const preset = MODE_PRESETS[m] || MODE_PRESETS.colorize;

    // Доп. пользовательский текст (если вдруг нужно, но по умолчанию пусто)
    const userPrompt = (text || "").trim();

    const promptParts = [RESTORE_BASE_PROMPT, preset];
    if (userPrompt) promptParts.push(userPrompt);

    const prompt = promptParts.join(". ").trim();

    const input = {
      prompt,
      input_image: photo,
      output_format: "jpg"
    };

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
      return res.status(500).json({ error: "No image URL returned" });
    }

    return res.status(200).json({
      ok: true,
      image: imageUrl,
      mode: m,
      prompt_used: undefined // не возвращаем prompt на фронт
    });
  } catch (err) {
    console.error("RESTORE ERROR:", err);
    return res.status(500).json({
      error: "Restore failed",
      details: err?.message || String(err)
    });
  }
}