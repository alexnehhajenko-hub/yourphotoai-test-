// assets/main.js
// Логика интерфейса для WindowToSoul тестового сайта
// Обычные стили + эффекты + поздравления + 10 VIP-сцен (через text-prompt)

// --- СТЕЙТ ---

let currentStyle = "beauty";              // стиль портрета
const activeEffects = new Set();          // эффекты кожи + мимики
let currentGreeting = null;               // поздравление
let originalImageFile = null;             // исходный файл фото
let resizedImageDataUrl = null;           // уменьшенное фото base64
let currentVipPreset = null;              // id выбранного VIP-режима (или null)

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
const btnGenerate = document.getElementById("btnGenerate");
const btnAddPhoto = document.getElementById("btnAddPhoto");
const btnPay = document.getElementById("btnPay");
const btnClearEffects = document.getElementById("btnClearEffects");
const btnVip = document.getElementById("btnVip"); // кнопка VIP-режимов

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
  { id: "beauty",  label: "Красивый портрет",   description: "Светлый, гладкая кожа, без морщин" },
  { id: "oil",     label: "Картина маслом",     description: "Художественный стиль с мазками" },
  { id: "anime",   label: "Аниме",              description: "Стиль аниме-персонажа" },
  { id: "poster",  label: "Кино-постер",        description: "Контрастный, как в фильме" },
  { id: "classic", label: "Классический стиль", description: "Старые мастера" }
];

const SKIN_EFFECTS = [
  { id: "no-wrinkles", label: "Убрать морщины",      description: "Мягкая ретушь" },
  { id: "younger",     label: "Омолодить",           description: "Чуть свежее лицо" },
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

// 10 VIP-сцен. Все они идут через поле text, backend /api/generate не меняем.
const VIP_PRESETS = [
  {
    id: "vip-gravity",
    chipLabel: "gravity",
    label: "VIP: Broken gravity",
    description: "Комната, где гравитация сломана: волосы и предметы чуть парят.",
    basePrompt: `
highly realistic portrait of the person from the reference photo,
the SAME face and identity, same gender and same ethnicity, same approximate age,
NO face replacement, NO new person, only edit the world and small beauty retouch,
visible but natural beauty improvement: smoother skin tone, fewer wrinkles, less puffiness,
set in a room where gravity is subtly broken,
hair gently flows slightly upward, small objects and dust float in mid-air,
coffee splashes sideways frozen in motion,
main light source is a glowing pool of light on the table or floor,
soft cinematic colors, still realistic photo,
clothing is newly generated and updated to fit the scene, neat and well-fitting
`.trim()
  },
  {
    id: "vip-movie-still",
    chipLabel: "movie frame",
    label: "VIP: Movie frame",
    description: "Кадр из дорогого фильма с твоим лицом.",
    basePrompt: `
ultra cinematic portrait of the person from the reference photo,
the SAME identity and facial features, same gender and ethnicity, same approximate age,
NO face replacement, NO random attractive model, always the same person,
captured as a still frame from a high-budget movie,
dramatic soft lighting, volumetric light, subtle film grain,
background with symbolic elements of their life: soft city hints, abstract shapes, blurred story details,
35mm lens look, shallow depth of field, anamorphic bokeh, extremely detailed, award-winning movie still,
clothing is newly generated as a stylish movie outfit that matches the scene
`.trim()
  },
  {
    id: "vip-time-gradient",
    chipLabel: "time",
    label: "VIP: Time gradient",
    description: "Лицо, плавно переходящее от молодости к зрелости.",
    basePrompt: `
surreal realistic portrait of the person from the reference photo,
same identity and proportions, same gender and ethnicity, clearly the same person,
NO replacement of the face, only show different ages of the same person,
their face smoothly transitioning from a younger version on the left side
to an older version on the right side,
no hard split line, continuous time gradient,
delicate aging details, subtle wrinkles and hair changes,
background with soft blurred clocks and city lights,
high-end editorial photography, ultra detailed skin and eyes,
clothing is neutral and newly generated so it works for all ages in the frame
`.trim()
  },
  {
    id: "vip-evidence-board",
    chipLabel: "evidence board",
    label: "VIP: Evidence board",
    description: "Как в криминальном фильме: твоё фото в центре, вокруг фрагменты снов.",
    basePrompt: `
crime scene evidence board style composition,
central Polaroid-style photo of the person from the reference photo
pinned to a corkboard, clearly recognisable same face and identity,
NO other faces, no replacement of the main person,
surrounded by surreal dream fragments as smaller photos:
floating staircase, misty corridor, symbolic objects,
red strings connecting the central portrait to the fragments,
moody overhead light, cinematic shadows, hyperrealistic textures,
detective investigation aesthetic,
clothing in the central portrait is newly generated but realistic and simple
`.trim()
  },
  {
    id: "vip-notification-room",
    chipLabel: "notifications",
    label: "VIP: Notification room",
    description: "Комната, полностью собранная из уведомлений и сообщений.",
    basePrompt: `
surreal interior portrait of the person from the reference photo sitting or standing in a room,
same facial identity and proportions, same gender and ethnicity, similar age,
NO replacement with another model, always the same person,
all walls, ceiling and floor are made of frozen phone notifications and chat bubbles,
emails, app icons, message previews forming a 3D mosaic surface,
one real physical window with natural daylight and no notifications,
high realism, detailed typography, subtle glow from screens, modern cinematic look,
their clothes are newly generated modern casual outfit, slightly lit by the screen glow
`.trim()
  },
  {
    id: "vip-multi-life",
    chipLabel: "4 lives",
    label: "VIP: Four lives",
    description: "4 версии одного человека: художник, учёный, киберпанк и спокойный возрастной.",
    basePrompt: `
group portrait in a single frame,
the person from the reference photo appears as 3-4 alternate life versions standing together,
all variants MUST share the SAME identity and ethnicity, same main facial features and bone structure,
do NOT swap the face with any other actor or model,
one version as an artist with paint on hands,
one as a scientist in a lab coat,
one as a cyberpunk version with subtle neon implants,
one as a calm older self,
soft studio lighting, cinematic composition, ultra detailed, story-rich photo,
all clothing is newly generated to match each role
`.trim()
  },
  {
    id: "vip-future-phone",
    chipLabel: "phone 2525",
    label: "VIP: Phone 2525",
    description: "Будущее селфи 2525 года с голограммами эмоций.",
    basePrompt: `
hyper realistic portrait of the person from the reference photo
taken by a futuristic smartphone camera from the year 2525,
same identity, same ethnicity and facial structure, clearly the same person,
NO generic influencer face, no replacement,
semi-transparent holographic overlays around the head showing emotions and thoughts
as floating icons and abstract symbols,
minimal futuristic UI elements, clean AR interface, volumetric light,
high resolution, glossy, cutting-edge sci-fi photography style,
clothing is newly generated simple futuristic casual outfit that fits the scene
`.trim()
  },
  {
    id: "vip-art-timeline",
    chipLabel: "art history",
    label: "VIP: Art history wall",
    description: "Ты стоишь перед стеной из фрагментов разных эпох искусства.",
    basePrompt: `
composite portrait of the person from the reference photo standing in front of a wall
made of vertical panels from different eras,
their body and face remain realistic and consistent, same identity, same gender and ethnicity,
NO replacement of the face, no new person,
soft museum-like light on their face,
the background subtly changes style from left to right like a timeline of human art,
ultra detailed, poetic, slightly surreal, high-end art photography,
their clothing is newly generated, neutral and timeless so it works with all eras behind them
`.trim()
  },
  {
    id: "vip-star-hair",
    chipLabel: "star hair",
    label: "VIP: Star hair",
    description: "Часть волос и плеч растворяется в ночном небе.",
    basePrompt: `
dreamlike portrait of the person from the reference photo,
same recognisable face and identity, same gender and ethnicity,
NO different model, keep the same person,
parts of their hair and shoulders dissolve into a starry night sky,
tiny constellations gently shaping the outline of their head and thoughts,
soft glow around the eyes, subtle cosmic dust,
not too abstract, still clearly their face,
long exposure photography feel, ultra detailed, magical but elegant, premium art print style,
clothing is newly generated, dark and simple so it blends into the night sky transition
`.trim()
  },
  {
    id: "vip-angel-demon",
    chipLabel: "angel & demon",
    label: "VIP: Angel and demon",
    description: "По центру обычный человек, слева ангел, справа демон — все с твоим лицом.",
    basePrompt: `
epic triptych-style composition in a single frame,
in the center: realistic portrait of the person from the reference photo, neutral expression,
on the left side: angelic version of the SAME person with soft light, subtle wings and halo,
on the right side: darker demonic version of the SAME person with soft glowing eyes or subtle horns,
ALL THREE faces must clearly share the SAME identity, same ethnicity, same bone structure and main facial features,
ABSOLUTELY NO replacement of the face with another actor or model, only different versions of the same person,
background gently fades from warm light on the angel side to dark tones on the demon side,
cinematic lighting, ultra detailed skin and eyes, dramatic but elegant,
clothing for all three versions is newly generated and matches their role but stays realistic and not cartoonish
`.trim()
  }
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
    sheetTitle.textContent = "VIP-режимы";
    sheetDescription.textContent = "Сцены с историей. Лицо — то же, меняется мир вокруг.";
    VIP_PRESETS.forEach((opt) => {
      const chip = document.createElement("button");
      chip.className = "chip";
      chip.textContent = opt.label;
      chip.title = opt.description;
      if (currentVipPreset === opt.id) chip.classList.add("chip-active");
      chip.onclick = () => {
        if (currentVipPreset === opt.id) {
          currentVipPreset = null; // повторный клик — выключить VIP
          chip.classList.remove("chip-active");
        } else {
          currentVipPreset = opt.id;
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

  const styleInfo = STYLE_OPTIONS.find((s) => s.id === currentStyle);
  if (styleInfo) {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = `Стиль: ${styleInfo.label}`;
    selectionRow.appendChild(chip);
  }

  if (activeEffects.size > 0) {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = `Эффекты: ${activeEffects.size}`;
    selectionRow.appendChild(chip);
  }

  if (currentGreeting) {
    const g = GREETING_OPTIONS.find((g) => g.id === currentGreeting);
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = g ? `Поздравление: ${g.label}` : "Поздравление выбрано";
    selectionRow.appendChild(chip);
  }

  if (currentVipPreset) {
    const v = VIP_PRESETS.find((v) => v.id === currentVipPreset);
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    const name = v ? v.chipLabel || v.label : "VIP-scene";
    chip.textContent = `VIP: ${name}`;
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

if (btnClearEffects) {
  btnClearEffects.addEventListener("click", () => {
    activeEffects.clear();
    currentGreeting = null;
    currentVipPreset = null;
    renderSelections();
    updateGreetingOverlay();
  });
}

btnGenerate.addEventListener("click", async () => {
  if (
    !resizedImageDataUrl &&
    activeEffects.size === 0 &&
    !currentGreeting &&
    !currentVipPreset
  ) {
    alert("Добавьте фото, выберите эффект, поздравление или VIP-сцену.");
    return;
  }

  try {
    btnGenerate.disabled = true;
    controls.classList.add("controls-hidden");
    generateStatus.style.display = "flex";
    downloadLink.style.display = "none";

    let textPrompt = null;
    if (currentVipPreset) {
      const v = VIP_PRESETS.find((v) => v.id === currentVipPreset);
      if (v && v.basePrompt) {
        textPrompt = v.basePrompt;
      }
    }

    const body = {
      style: currentStyle,
      text: textPrompt,
      photo: resizedImageDataUrl,
      effects: Array.from(activeEffects),
      greeting: currentGreeting
    };

    const res = await fetch("/api/generate", {
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

renderSelections();
updateGreetingOverlay();
if (previewImage) previewImage.style.display = "none";
if (generateStatus) generateStatus.style.display = "none";