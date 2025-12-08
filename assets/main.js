// assets/main.js
// Логика интерфейса для WindowToSoul тестового сайта

// --- СТЕЙТ ---

let currentStyle = "beauty";            // обычный стиль портрета
const activeEffects = new Set();        // эффекты кожи + мимика
let currentGreeting = null;             // поздравление
let originalImageFile = null;           // исходный файл фото
let resizedImageDataUrl = null;         // уменьшенное фото base64

// VIP-режим: null = выключен, иначе id одного из режимов
let currentVipMode = null;

// --- DOM-ЭЛЕМЕНТЫ ---

const previewImage = document.getElementById("previewImage");
const previewPlaceholder = document.getElementById("previewPlaceholder");
const greetingOverlay = document.getElementById("greetingOverlay");
const generateStatus = document.getElementById("generateStatus");
const controls = document.getElementById("controls");
const selectionRow = document.getElementById("selectionRow");

const btnStyle = document.getElementById("btnStyle");
const btnSkin = document.getElementById("btnSkin");
const btnMimic = document.getElementById("btnMimic");
const btnGreetings = document.getElementById("btnGreetings");
const btnVip = document.getElementById("btnVip");
const btnGenerate = document.getElementById("btnGenerate");
const btnAddPhoto = document.getElementById("btnAddPhoto");
const btnPay = document.getElementById("btnPay");
const btnClearEffects = document.getElementById("btnClearEffects");

const downloadLink = document.getElementById("downloadLink");
const fileInput = document.getElementById("fileInput");

// sheet (панель снизу)
const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheetTitle = document.getElementById("sheetTitle");
const sheetDescription = document.getElementById("sheetDescription");
const sheetCategoryTitle = document.getElementById("sheetCategoryTitle");
const sheetCategoryRow = document.getElementById("sheetCategoryRow");
const sheetOptionsTitle = document.getElementById("sheetOptionsTitle");
const sheetOptionsRow = document.getElementById("sheetOptionsRow");
const sheetCloseBtn = document.getElementById("sheetCloseBtn");

// --- КОНФИГ ВАРИАНТОВ ---

const STYLE_OPTIONS = [
  { id: "beauty",  label: "Красивый портрет",  description: "Светлый, гладкая кожа, без морщин" },
  { id: "oil",     label: "Картина маслом",    description: "Художественный стиль с мазками" },
  { id: "anime",   label: "Аниме",             description: "Стиль аниме-персонажа" },
  { id: "poster",  label: "Кино-постер",       description: "Контрастный, как в фильме" },
  { id: "classic", label: "Классический",      description: "Старые мастера" }
];

const SKIN_EFFECTS = [
  { id: "no-wrinkles", label: "Убрать морщины",      description: "Мягкая ретушь" },
  { id: "younger",     label: "Омолодить на 20 лет", description: "Минус ~20 лет" },
  { id: "smooth-skin", label: "Сгладить кожу",       description: "Ровный тон" }
];

const MIMIC_EFFECTS = [
  { id: "smile-soft",      label: "Лёгкая улыбка",        description: "Спокойное настроение" },
  { id: "smile-big",       label: "Улыбка шире",          description: "Больше эмоций" },
  { id: "smile-hollywood", label: "Голливудская улыбка",  description: "Видны зубы" },
  { id: "laugh",           label: "Смех",                 description: "Яркий смех" },
  { id: "neutral",         label: "Нейтральное лицо",     description: "Спокойное" },
  { id: "serious",         label: "Серьёзное лицо",       description: "Без улыбки" },
  { id: "eyes-bigger",     label: "Глаза больше",         description: "Чуть крупнее" },
  { id: "eyes-brighter",   label: "Глаза ярче",           description: "Выразительный взгляд" }
];

const GREETING_OPTIONS = [
  { id: "new-year", label: "Новый год",      description: "Новогодняя открытка" },
  { id: "birthday", label: "День рождения",  description: "Праздничный портрет" },
  { id: "funny",    label: "Смешное",        description: "Игривый стиль" },
  { id: "scary",    label: "Страшное",       description: "Жуткий стиль" }
];

// VIP-режимы (id должны совпадать с VIP_SCENES в api/generate-vip1.js)
const VIP_OPTIONS = [
  { id: "gravity",      label: "VIP: Гравитация",        description: "Комната с нарушенной гравитацией" },
  { id: "knight",       label: "VIP: Орден тишины",      description: "Фэнтези-рыцарь, орден тишины" },
  { id: "cinema",       label: "VIP: Кино-кадр",         description: "Кадр из дорогого фильма" },
  { id: "time_gradient",label: "VIP: Время",             description: "От молодого к взрослому в одном лице" },
  { id: "crime_board",  label: "VIP: Доска улик",        description: "Детективная доска с фотографиями" },
  { id: "notifications",label: "VIP: Уведомления",       description: "Комната из уведомлений и чатов" },
  { id: "multiverse",   label: "VIP: Мультивселенная",   description: "3–4 версии жизни рядом" },
  { id: "future_phone", label: "VIP: Телефон 2525",      description: "Портрет из будущего со светящимися иконками" },
  { id: "art_timeline", label: "VIP: Стена искусств",    description: "Стена из разных эпох искусства" },
  { id: "starry_hair",  label: "VIP: Звёздные волосы",   description: "Волосы переходят в звёздное небо" },
  { id: "angel_devil",  label: "VIP: Ангел и демон",     description: "По центру человек, слева ангел, справа демон" }
];

// --- УТИЛИТЫ ---

function openSheetFor(type) {
  sheetCategoryTitle.style.display = "none";
  sheetCategoryRow.style.display = "none";
  sheetOptionsRow.innerHTML = "";

  if (type === "style") {
    sheetTitle.textContent = "Стиль портрета";
    sheetDescription.textContent = "Выберите основной визуальный стиль портрета.";
    STYLE_OPTIONS.forEach((opt) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = opt.label;
      chip.title = opt.description;
      if (currentStyle === opt.id) chip.classList.add("chip-active");
      chip.onclick = () => {
        currentStyle = opt.id;
        closeSheet();
        renderSelections();
      };
      sheetOptionsRow.appendChild(chip);
    });
  }

  if (type === "skin") {
    sheetTitle.textContent = "Эффекты кожи";
    sheetDescription.textContent = "Можно выбрать несколько эффектов сразу.";
    SKIN_EFFECTS.forEach((opt) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = opt.label;
      chip.title = opt.description;
      if (activeEffects.has(opt.id)) chip.classList.add("chip-active");
      chip.onclick = () => {
        if (activeEffects.has(opt.id)) {
          activeEffects.delete(opt.id);
          chip.classList.remove("chip-active");
        } else {
          activeEffects.add(opt.id);
          chip.classList.add("chip-active");
        }
        renderSelections();
      };
      sheetOptionsRow.appendChild(chip);
    });
  }

  if (type === "mimic") {
    sheetTitle.textContent = "Мимика и эмоции";
    sheetDescription.textContent = "Настройте настроение выражения лица.";
    MIMIC_EFFECTS.forEach((opt) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = opt.label;
      chip.title = opt.description;
      if (activeEffects.has(opt.id)) chip.classList.add("chip-active");
      chip.onclick = () => {
        if (activeEffects.has(opt.id)) {
          activeEffects.delete(opt.id);
          chip.classList.remove("chip-active");
        } else {
          activeEffects.add(opt.id);
          chip.classList.add("chip-active");
        }
        renderSelections();
      };
      sheetOptionsRow.appendChild(chip);
    });
  }

  if (type === "greetings") {
    sheetTitle.textContent = "Поздравления";
    sheetDescription.textContent = "Выберите тип поздравительной открытки.";
    GREETING_OPTIONS.forEach((opt) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = opt.label;
      chip.title = opt.description;
      if (currentGreeting === opt.id) chip.classList.add("chip-active");
      chip.onclick = () => {
        if (currentGreeting === opt.id) {
          currentGreeting = null;
          chip.classList.remove("chip-active");
        } else {
          currentGreeting = opt.id;
          sheetOptionsRow
            .querySelectorAll(".chip")
            .forEach((c) => c.classList.remove("chip-active"));
          chip.classList.add("chip-active");
        }
        renderSelections();
        updateGreetingOverlay();
      };
      sheetOptionsRow.appendChild(chip);
    });
  }

  if (type === "vip") {
    sheetTitle.textContent = "VIP-портреты";
    sheetDescription.textContent =
      "Специальные сцены (кино, рыцарь, мультивселенная и т.п.). Лицо остаётся тем же человеком.";
    VIP_OPTIONS.forEach((opt) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = opt.label;
      chip.title = opt.description;
      if (currentVipMode === opt.id) chip.classList.add("chip-active");
      chip.onclick = () => {
        // повторное нажатие — выключаем VIP
        if (currentVipMode === opt.id) {
          currentVipMode = null;
          chip.classList.remove("chip-active");
        } else {
          currentVipMode = opt.id;
          sheetOptionsRow
            .querySelectorAll(".chip")
            .forEach((c) => c.classList.remove("chip-active"));
          chip.classList.add("chip-active");
        }
        renderSelections();
      };
      sheetOptionsRow.appendChild(chip);
    });
  }

  sheetBackdrop.classList.add("sheet-open");
}

function closeSheet() {
  sheetBackdrop.classList.remove("sheet-open");
}

function renderSelections() {
  selectionRow.innerHTML = "";

  // Стиль
  const styleInfo = STYLE_OPTIONS.find((s) => s.id === currentStyle);
  if (styleInfo) {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = `Стиль: ${styleInfo.label}`;
    selectionRow.appendChild(chip);
  }

  // Эффекты
  if (activeEffects.size > 0) {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = `Эффекты: ${activeEffects.size}`;
    selectionRow.appendChild(chip);
  }

  // Поздравление
  if (currentGreeting) {
    const g = GREETING_OPTIONS.find((g) => g.id === currentGreeting);
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = g ? `Поздравление: ${g.label}` : "Поздравление выбрано";
    selectionRow.appendChild(chip);
  }

  // VIP-режим
  if (currentVipMode) {
    const v = VIP_OPTIONS.find((v) => v.id === currentVipMode);
    const chip = document.createElement("div");
    chip.className = "selection-chip selection-chip-vip";
    chip.textContent = v ? v.label : "VIP-режим";
    selectionRow.appendChild(chip);
  }
}

function updateGreetingOverlay() {
  if (!currentGreeting) {
    greetingOverlay.textContent = "";
    greetingOverlay.style.display = "none";
    return;
  }
  const g = GREETING_OPTIONS.find((g) => g.id === currentGreeting);
  greetingOverlay.textContent = g ? g.label : "";
  greetingOverlay.style.display = "block";
}

// Уменьшение изображения до ~1024px по большей стороне
function resizeImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const img = new Image();

    reader.onload = (e) => {
      img.onload = () => {
        const maxSide = 1024;
        let w = img.width;
        let h = img.height;

        if (w > h && w > maxSide) {
          h = Math.round((h * maxSide) / w);
          w = maxSide;
        } else if (h >= w && h > maxSide) {
          w = Math.round((w * maxSide) / h);
          h = maxSide;
        }

        const canvas = document.createElement("canvas");
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, w, h);

        try {
          const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
          resolve(dataUrl);
        } catch (err) {
          reject(err);
        }
      };

      img.onerror = reject;
      img.src = e.target.result;
    };

    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// --- ОБРАБОТЧИКИ ---

btnAddPhoto.addEventListener("click", () => {
  fileInput.click();
});

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  originalImageFile = file;
  try {
    resizedImageDataUrl = await resizeImage(file);
    previewImage.src = resizedImageDataUrl;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";
  } catch (err) {
    console.error("resize error", err);
    alert("Не удалось обработать фото: " + err.message);
  }
});

btnStyle.addEventListener("click", () => openSheetFor("style"));
btnSkin.addEventListener("click", () => openSheetFor("skin"));
btnMimic.addEventListener("click", () => openSheetFor("mimic"));
btnGreetings.addEventListener("click", () => openSheetFor("greetings"));
if (btnVip) {
  btnVip.addEventListener("click", () => openSheetFor("vip"));
}

sheetCloseBtn.addEventListener("click", closeSheet);
sheetBackdrop.addEventListener("click", (e) => {
  if (e.target === sheetBackdrop) closeSheet();
});

btnPay.addEventListener("click", () => {
  alert("Оплата отключена в тестовом режиме.");
});

// Очистка эффектов и поздравлений (VIP остаётся)
if (btnClearEffects) {
  btnClearEffects.addEventListener("click", () => {
    activeEffects.clear();
    currentGreeting = null;
    renderSelections();
    updateGreetingOverlay();
  });
}

// Генерация
btnGenerate.addEventListener("click", async () => {
  if (!resizedImageDataUrl && activeEffects.size === 0 && !currentGreeting) {
    alert("Добавьте фото, выберите эффект или поздравление.");
    return;
  }

  const isVip = !!currentVipMode;

  try {
    btnGenerate.disabled = true;
    controls.classList.add("controls-hidden");
    generateStatus.style.display = "flex";
    downloadLink.style.display = "none";

    let endpoint = "/api/generate";
    let body;

    if (isVip) {
      endpoint = "/api/generate-vip1";
      body = {
        text: null,
        photo: resizedImageDataUrl,
        effects: Array.from(activeEffects),
        greeting: currentGreeting,
        vipMode: currentVipMode
      };
    } else {
      body = {
        style: currentStyle,
        text: null,
        photo: resizedImageDataUrl,
        effects: Array.from(activeEffects),
        greeting: currentGreeting
      };
    }

    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });

    let data;
    try {
      data = await res.json();
    } catch (e) {
      throw new Error("Сервер вернул некорректный ответ.");
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || String(res.status));
    }

    if (!data.image) {
      throw new Error("Нет изображения от сервера.");
    }

    previewImage.src = data.image;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";

    downloadLink.href = data.image;
    downloadLink.style.display = "inline-flex";
  } catch (err) {
    console.error("GEN ERROR", err);
    alert("Ошибка генерации: " + (err.message || err));
  } finally {
    btnGenerate.disabled = false;
    controls.classList.remove("controls-hidden");
    generateStatus.style.display = "none";
  }
});

// Инициализация
renderSelections();
updateGreetingOverlay();
previewImage.style.display = "none";
generateStatus.style.display = "none";