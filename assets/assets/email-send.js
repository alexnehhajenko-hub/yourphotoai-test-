// assets/email-send.js
// Отправка ОДНОЙ текущей картинки на email (без зависимости от сессии).
// Использует /api/send-portraits (отправляем массив из 1 картинки).

import { appState, STORAGE_KEYS, UI_TEXT } from "./js/state.js";

function $(id) {
  return document.getElementById(id);
}

function setStatus(text, isError = false) {
  const el = $("emailStatus");
  if (!el) return;
  el.textContent = text || "";
  el.style.color = isError ? "rgba(255,120,120,0.95)" : "rgba(255,255,255,0.8)";
}

function getCurrentPortraitUrl() {
  const img = $("previewImage");
  if (!img) return null;
  const src = (img.getAttribute("src") || "").trim();
  if (!src) return null;
  // если это placeholder или пусто — не отправляем
  return src;
}

function showEmailRowIfReady() {
  const row = document.querySelector(".email-send-row");
  if (!row) return;

  const url = getCurrentPortraitUrl();
  // показываем только когда есть картинка (после генерации или загружено)
  row.style.display = url ? "flex" : "none";
}

async function sendSinglePortrait(email, imageUrl) {
  const resp = await fetch("/api/send-portraits", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      images: [imageUrl],
      total: 1,
      used: 1
    })
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`Email server error (${resp.status}). ${text}`);
  }

  const data = await resp.json().catch(() => null);
  if (!data || !data.ok) {
    throw new Error("Email service did not confirm sending.");
  }

  return data;
}

function bindEmailSend() {
  const input = $("emailInput");
  const btn = $("emailSendButton");

  if (!input || !btn) return;

  // подставим email из состояния/хранилища
  if (!input.value) {
    input.value = appState.userEmail || "";
  }

  btn.addEventListener("click", async () => {
    const t = UI_TEXT[appState.language] || UI_TEXT.en;

    const email = (input.value || "").trim();
    if (!email) {
      setStatus(t.alertEmailMissing || "Please enter your email.", true);
      return;
    }

    const imageUrl = getCurrentPortraitUrl();
    if (!imageUrl) {
      setStatus("No portrait to send yet. Generate a portrait first.", true);
      return;
    }

    // сохраняем email
    appState.userEmail = email;
    try {
      window.localStorage.setItem(STORAGE_KEYS.USER_EMAIL, email);
    } catch {}

    btn.disabled = true;
    btn.style.opacity = "0.7";
    setStatus("Sending…");

    try {
      await sendSinglePortrait(email, imageUrl);
      setStatus(`Sent! Check your inbox: ${email}`);
    } catch (err) {
      console.error("EMAIL SEND ERROR:", err);
      setStatus("Could not send email. Please try again.", true);
    } finally {
      btn.disabled = false;
      btn.style.opacity = "1";
    }
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEmailSend();

  // показываем/прячем блок отправки когда меняется картинка
  showEmailRowIfReady();

  const img = $("previewImage");
  if (img) {
    const obs = new MutationObserver(() => {
      showEmailRowIfReady();
      setStatus(""); // сбрасываем статус при смене картинки
    });
    obs.observe(img, { attributes: true, attributeFilter: ["src"] });
  }

  // на всякий случай — небольшая подстраховка
  setInterval(showEmailRowIfReady, 1500);
});
