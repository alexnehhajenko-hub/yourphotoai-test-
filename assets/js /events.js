// assets/js/events.js
// Подписывает кнопки на нужные действия.

import { els, setLanguage, refreshSelectionChips } from "./interface.js";
import {
  openStyleSheet,
  openSkinSheet,
  openMimicSheet,
  openGreetingSheet
} from "./effects.js";
import { handleGenerateClick, handleFileSelected } from "./generation.js";
import {
  openPayModal,
  closePayModal,
  selectPack,
  handlePayNext,
  closeAgreementModal,
  handleAgreeConfirm
} from "./payment.js";
import { appState, STORAGE_KEYS, UI_TEXT } from "./state.js";

function setMode(mode) {
  appState.mode = mode;

  try {
    window.localStorage.setItem(STORAGE_KEYS.MODE, mode);
  } catch (e) {
    // ignore
  }
}

// Если пользователь выбирает любой “портретный” инструмент — выходим из restore режима,
// чтобы снова работали oil/anime/poster и т.д.
function ensurePortraitMode() {
  if (appState.mode === "restore") {
    setMode("portrait"); // любое значение, кроме "restore"
  }
}

export function attachMainHandlers() {
  if (els.btnStyle) {
    els.btnStyle.addEventListener("click", () => {
      ensurePortraitMode();
      openStyleSheet();
    });
  }
  if (els.btnSkin) {
    els.btnSkin.addEventListener("click", () => {
      ensurePortraitMode();
      openSkinSheet();
    });
  }
  if (els.btnMimic) {
    els.btnMimic.addEventListener("click", () => {
      ensurePortraitMode();
      openMimicSheet();
    });
  }
  if (els.btnGreetings) {
    els.btnGreetings.addEventListener("click", () => {
      ensurePortraitMode();
      openGreetingSheet();
    });
  }

  // ✅ RESTORE button
  const btnRestore = document.getElementById("btnRestore");
  if (btnRestore) {
    btnRestore.addEventListener("click", () => {
      const t = UI_TEXT[appState.language] || UI_TEXT.en;

      const ok = window.confirm(
        `${t.restoreGuideTitle || "Old Photo Restoration – Tips"}\n\n${
          t.restoreGuideText ||
          UI_TEXT.en.restoreGuideText ||
          "Use this mode for old/damaged photos. It will try to preserve all people and restore scratches/noise. For portrait styles (oil/anime/poster), use PORTRAIT STYLE instead."
        }`
      );

      if (!ok) return;

      // включаем режим реставрации
      setMode("restore");

      // для реставрации эффекты/поздравления/стиль не нужны
      appState.selectedStyle = null;
      appState.selectedEffects = [];
      appState.selectedGreeting = null;

      // обновим чипы (если показываются)
      try {
        refreshSelectionChips();
      } catch (e) {
        // ignore
      }
    });
  }

  if (els.btnGenerate) {
    els.btnGenerate.addEventListener("click", () => handleGenerateClick());
  }

  if (els.btnAddPhoto) {
    els.btnAddPhoto.addEventListener("click", () => {
      if (els.fileInput) els.fileInput.click();
    });
  }
  if (els.fileInput) {
    els.fileInput.addEventListener("change", handleFileSelected);
  }

  if (els.btnPay) {
    els.btnPay.addEventListener("click", () => openPayModal());
  }
  if (els.payCloseBtn) {
    els.payCloseBtn.addEventListener("click", () => closePayModal());
  }
  if (els.pkg10) {
    els.pkg10.addEventListener("click", () => selectPack("pack10"));
  }
  if (els.pkg20) {
    els.pkg20.addEventListener("click", () => selectPack("pack20"));
  }
  if (els.pkg30) {
    els.pkg30.addEventListener("click", () => selectPack("pack30"));
  }
  if (els.payNextBtn) {
    els.payNextBtn.addEventListener("click", () => handlePayNext());
  }

  if (els.agreementCloseBtn) {
    els.agreementCloseBtn.addEventListener("click", () =>
      closeAgreementModal()
    );
  }
  if (els.agreePayBtn) {
    els.agreePayBtn.addEventListener("click", () => handleAgreeConfirm());
  }

  if (els.sheetCloseBtn) {
    els.sheetCloseBtn.addEventListener("click", () => {
      const event = new Event("popstate");
      window.dispatchEvent(event);
    });
  }

  if (els.downloadLink) {
    els.downloadLink.addEventListener("click", (e) => {
      if (!els.previewImage || !els.previewImage.src) {
        e.preventDefault();
      }
    });
  }

  // Переключение языков, если кнопки есть в верстке
  if (els.btnLangEn) {
    els.btnLangEn.addEventListener("click", () => setLanguage("en"));
  }
  if (els.btnLangDe) {
    els.btnLangDe.addEventListener("click", () => setLanguage("de"));
  }
  if (els.btnLangEs) {
    els.btnLangEs.addEventListener("click", () => setLanguage("es"));
  }
  if (els.btnLangRu) {
    els.btnLangRu.addEventListener("click", () => setLanguage("ru"));
  }
}