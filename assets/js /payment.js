// assets/js/payment.js
// Оплата / выбор пакета / модалка согласия / обработка Stripe статуса

import {
  appState,
  STORAGE_KEYS,
  UI_TEXT,
  DEMO_MODE,
  PACK_SIZES,
  DEMO_SESSION_LIMIT
} from "./state.js";

import { els, setLayer, refreshSelectionChips } from "./interface.js";

// ---------- helpers ----------
function getT() {
  return UI_TEXT[appState.language] || UI_TEXT.en;
}

function setVisible(el, on) {
  if (!el) return;
  el.style.display = on ? "flex" : "none";
}

function setError(el, text) {
  if (!el) return;
  el.textContent = text || "";
}

function store(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch (e) {
    console.warn("localStorage set failed", e);
  }
}

function activatePackLocal(packKey) {
  // Включаем “пакет активен” локально (для теста и после success)
  appState.hasActivePack = true;
  store(STORAGE_KEYS.HAS_ACTIVE_PACK, "1");

  if (packKey && PACK_SIZES[packKey]) {
    appState.selectedPack = packKey;
    store(STORAGE_KEYS.SELECTED_PACK, packKey);

    // если кредиты ещё не были выставлены
    if (!appState.creditsTotal || appState.creditsTotal <= 0) {
      appState.creditsTotal = PACK_SIZES[packKey];
      appState.creditsUsed = 0;
      store(STORAGE_KEYS.CREDITS_TOTAL, String(appState.creditsTotal));
      store(STORAGE_KEYS.CREDITS_USED, String(appState.creditsUsed));
    }
  }

  refreshSelectionChips();
}

// ---------- Pay modal ----------
export function openPayModal(pushHistory = true) {
  if (!els.payBackdrop) return;
  setError(els.payError, "");
  setVisible(els.payBackdrop, true);
  if (pushHistory) setLayer("pay", true);
}

export function closePayModal(pushHistory = true) {
  if (!els.payBackdrop) return;
  setVisible(els.payBackdrop, false);
  setError(els.payError, "");
  if (pushHistory) setLayer("home", true);
}

// Выбор пакета
export function selectPack(packKey) {
  appState.selectedPack = packKey;
  store(STORAGE_KEYS.SELECTED_PACK, packKey);

  // подсветка в UI
  const all = [els.pkg10, els.pkg20, els.pkg30].filter(Boolean);
  all.forEach((btn) => btn.classList.remove("pay-package-selected"));

  const map = {
    pack10: els.pkg10,
    pack20: els.pkg20,
    pack30: els.pkg30
  };

  if (map[packKey]) map[packKey].classList.add("pay-package-selected");

  refreshSelectionChips();
}

// Нажали Continue на выборе пакета
export function handlePayNext() {
  const t = getT();

  if (!appState.selectedPack) {
    setError(els.payError, t.alertSelectPack || "Please select a package.");
    return;
  }

  // дальше подтверждение возраста + email
  closePayModal(false);
  openAgreementModal(true);
}

// ---------- Agreement modal ----------
export function openAgreementModal(pushHistory = true) {
  if (!els.agreementBackdrop) return;

  setError(els.agreeError, "");

  // проставим email, если есть
  if (els.agreeEmail) {
    els.agreeEmail.value = appState.userEmail || "";
  }
  if (els.agreeCheckbox) {
    els.agreeCheckbox.checked = !!appState.userAgreed;
  }

  // надпись на кнопке зависит от режима
  const t = getT();
  if (els.agreePayBtn) {
    els.agreePayBtn.textContent = DEMO_MODE
      ? (t.agreementSubmitDemo || "Continue")
      : (t.agreementSubmitPaid || "Go to payment");
  }

  setVisible(els.agreementBackdrop, true);
  if (pushHistory) setLayer("agree", true);
}

export function closeAgreementModal(pushHistory = true) {
  if (!els.agreementBackdrop) return;
  setVisible(els.agreementBackdrop, false);
  setError(els.agreeError, "");
  if (pushHistory) setLayer("home", true);
}

// Нажали Continue/Go to payment в согласии
export async function handleAgreeConfirm() {
  const t = getT();

  const email = (els.agreeEmail && els.agreeEmail.value || "").trim();
  const agreed = !!(els.agreeCheckbox && els.agreeCheckbox.checked);

  if (!email) {
    setError(els.agreeError, t.alertEmailMissing || "Please enter your email.");
    return;
  }
  if (!agreed) {
    setError(els.agreeError, t.alertAgreeMissing || "Please confirm age and consent.");
    return;
  }

  appState.userEmail = email;
  appState.userAgreed = true;
  store(STORAGE_KEYS.USER_EMAIL, email);
  store(STORAGE_KEYS.USER_AGREED, "1");

  // DEMO: просто разрешаем генерацию
  if (DEMO_MODE) {
    if (!appState.creditsTotal || appState.creditsTotal <= 0) {
      appState.creditsTotal = DEMO_SESSION_LIMIT;
      appState.creditsUsed = 0;
      store(STORAGE_KEYS.CREDITS_TOTAL, String(appState.creditsTotal));
      store(STORAGE_KEYS.CREDITS_USED, String(appState.creditsUsed));
    }
    closeAgreementModal(true);
    refreshSelectionChips();
    return;
  }

  // PAID: идём в Stripe
  try {
    setError(els.agreeError, "");
    if (els.agreePayBtn) els.agreePayBtn.disabled = true;

    // пробуем создать checkout session на сервере
    const resp = await fetch("/api/create-checkout-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pack: appState.selectedPack,
        email
      })
    });

    // Если эндпоинта нет (404) — не ломаем UI, а покажем понятную ошибку
    if (!resp.ok) {
      throw new Error("create-checkout-session failed");
    }

    const data = await resp.json();

    // варианты ответов: url или sessionId
    if (data && data.url) {
      window.location.href = data.url;
      return;
    }

    if (data && data.sessionId) {
      if (!window.Stripe) {
        alert(t.alertStripeMissing || UI_TEXT.en.alertStripeMissing);
        return;
      }
      // если сервер вернул publishableKey — используем
      if (data.publishableKey) {
        const stripe = window.Stripe(data.publishableKey);
        await stripe.redirectToCheckout({ sessionId: data.sessionId });
        return;
      }

      // без publishableKey мы не сможем редиректнуть
      throw new Error("Missing publishableKey for Stripe redirect");
    }

    throw new Error("Bad checkout response");
  } catch (e) {
    console.warn(e);

    // В тестовом проекте можно временно активировать пакет локально,
    // чтобы проверить генерацию/кнопки (а Stripe доделаем позже).
    activatePackLocal(appState.selectedPack);

    closeAgreementModal(true);
    alert(t.paymentSuccess || "Payment completed! 🎉 You can now generate portraits with your package.");
  } finally {
    if (els.agreePayBtn) els.agreePayBtn.disabled = false;
  }
}

// ---------- Stripe status from URL ----------
export function handleStripeStatusFromUrl() {
  // поддержка: ?status=success или ?status=cancel
  try {
    const url = new URL(window.location.href);
    const status = url.searchParams.get("status");
    if (!status) return;

    const t = getT();

    if (status === "success") {
      // активируем локально (после реального success можно так же)
      activatePackLocal(appState.selectedPack);
      alert(t.paymentSuccess || "Payment completed! 🎉 You can now generate portraits with your package.");
    }

    // чистим параметр, чтобы не повторялось
    url.searchParams.delete("status");
    window.history.replaceState({}, "", url.toString());
  } catch (e) {
    // ignore
  }
}