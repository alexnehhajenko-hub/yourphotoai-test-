// api/generate.js
import fetch from "node-fetch";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ok: false,
      error: "Method not allowed"
    });
  }

  try {
    const {
      photo,
      style,
      effects,
      greeting,
      language
    } = req.body || {};

    if (!photo) {
      return res.status(400).json({
        ok: false,
        error: "Photo is required"
      });
    }

    // ⚠️ ЗАГЛУШКА (как на рабочем сайте)
    // Здесь у тебя дальше идёт реальный вызов AI (Stability / Replicate / etc)
    // Пока вернём тестовую картинку, чтобы фронт ожил

    return res.status(200).json({
      ok: true,
      image: "https://picsum.photos/1024/1024"
    });

  } catch (err) {
    console.error("GENERATE ERROR:", err);
    return res.status(500).json({
      ok: false,
      error: "Server error"
    });
  }
}