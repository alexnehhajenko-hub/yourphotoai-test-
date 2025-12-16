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
import { appState, UI_TEXT } from "./state.js";

/* =========================
   MODE MANAGEMENT
   ========================= */

// Явно задаём режим по умолчанию
if (!appState.mode) {
  appState.mode = "portrait";
}

function setMode(mode) {
  appState.mode = mode;
  refreshSelectionChips();
}

// Любое портретное действие → выходим из restore
function ensurePortraitMode() {
  if (appState.mode === "restore") {
    setMode("portrait");
  }
}

/* =========================
   HANDLERS
   ========================= */

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

  // ✅ RESTORE BUTTON
  const btnRestore = document.getElementById("btnRestore");
  if (btnRestore) {
    btnRestore.addEventListener("click", () => {
      const t = UI_TEXT[appState.language] || UI_TEXT.en;

      const ok = window.confirm(
        "Old Photo Restoration\n\n" +
        "• Use for OLD or damaged photos\n" +
        "• Preserves all people and faces\n" +
        "• Removes scratches & noise\n\n" +
        "For oil/anime/poster styles use PORTRAIT STYLE."
      );

      if (!ok) return;

      setMode("restore");

      appState.selectedStyle = null;
      appState.selectedEffects = [];
      appState.selectedGreeting = null;

      refreshSelectionChips();
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

  // Языки
  if (els.btnLangEn) els.btnLangEn.addEventListener("click", () => setLanguage("en"));
  if (els.btnLangDe) els.btnLangDe.addEventListener("click", () => setLanguage("de"));
  if (els.btnLangEs) els.btnLangEs.addEventListener("click", () => setLanguage("es"));
  if (els.btnLangRu) els.btnLangRu.addEventListener("click", () => setLanguage("ru"));
}