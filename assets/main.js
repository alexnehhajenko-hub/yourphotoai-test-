// assets/main.js
// Safe entrypoint with on-screen debug (works on mobile)

import * as ui from "./interface.js";
import { appState, loadStateFromStorage } from "./js/state.js";
import * as events from "./js/events.js";
import * as payment from "./js/payment.js";
import * as gen from "./js/generation.js";

function showDebugBadge(text, isError = false) {
  try {
    let el = document.getElementById("debugBadge");
    if (!el) {
      el = document.createElement("div");
      el.id = "debugBadge";
      el.style.position = "fixed";
      el.style.left = "10px";
      el.style.bottom = "10px";
      el.style.zIndex = "999999";
      el.style.padding = "8px 10px";
      el.style.borderRadius = "12px";
      el.style.fontSize = "12px";
      el.style.fontFamily = "system-ui, -apple-system, sans-serif";
      el.style.maxWidth = "92vw";
      el.style.wordBreak = "break-word";
      el.style.background = "rgba(0,0,0,0.65)";
      el.style.border = "1px solid rgba(255,255,255,0.25)";
      el.style.color = "#fff";
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.style.background = isError ? "rgba(160,0,0,0.75)" : "rgba(0,0,0,0.65)";
  } catch {
    // ignore
  }
}

function installGlobalErrorHandlers() {
  window.addEventListener("error", (e) => {
    const msg = e?.message || "Unknown JS error";
    showDebugBadge("JS ERROR: " + msg, true);
  });

  window.addEventListener("unhandledrejection", (e) => {
    const msg =
      (e?.reason && (e.reason.message || String(e.reason))) ||
      "Unhandled Promise rejection";
    showDebugBadge("JS ERROR: " + msg, true);
  });
}

function safeCall(fn, name) {
  try {
    if (typeof fn === "function") fn();
  } catch (e) {
    showDebugBadge(
      `JS ERROR in ${name}: ${e?.message || String(e)}`,
      true
    );
    throw e;
  }
}

installGlobalErrorHandlers();
console.log("MAIN JS LOADED");
document.addEventListener("DOMContentLoaded", () => {
  showDebugBadge("JS OK: main.js loaded");

  // 1) bind DOM
  safeCall(ui.bindElements, "ui.bindElements");

  // 2) support email
  safeCall(ui.setupSupportEmail, "ui.setupSupportEmail");

  // 3) load localStorage state
  safeCall(loadStateFromStorage, "loadStateFromStorage");

  // 4) set language
  try {
    const lang = appState.language || "en";
    if (typeof ui.setLanguage === "function") ui.setLanguage(lang);
  } catch (e) {
    showDebugBadge("JS ERROR: setLanguage failed: " + (e?.message || e), true);
    throw e;
  }

  // 5) hide overlays
  safeCall(ui.hideOverlaysOnStart, "ui.hideOverlaysOnStart");

  // 6) attach handlers (buttons)
  safeCall(events.attachMainHandlers, "events.attachMainHandlers");

  // 7) stripe status (optional)
  try {
    if (typeof payment.handleStripeStatusFromUrl === "function") {
      payment.handleStripeStatusFromUrl();
    }
  } catch (e) {
    showDebugBadge(
      "JS ERROR: handleStripeStatusFromUrl failed: " + (e?.message || e),
      true
    );
  }
  

  // 8) refresh chips
  try {
    if (typeof ui.refreshSelectionChips === "function") ui.refreshSelectionChips();
  } catch (e) {
    showDebugBadge("JS ERROR: refreshSelectionChips failed: " + (e?.message || e), true);
  }

  // If everything reached here, buttons MUST be clickable
  showDebugBadge("JS OK: handlers attached ✅");
});