// Simple front-end logic for YourPhotoAI test

let currentStyle = "beauty";
const activeEffects = new Set();
let currentGreeting = null;
let resizedImageDataUrl = null;

// DOM
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

const downloadLink = document.getElementById("downloadLink");
const fileInput = document.getElementById("fileInput");

const sheetBackdrop = document.getElementById("sheetBackdrop");
const sheetTitle = document.getElementById("sheetTitle");
const sheetDescription = document.getElementById("sheetDescription");
const sheetOptionsRow = document.getElementById("sheetOptionsRow");
const sheetCloseBtn = document.getElementById("sheetCloseBtn");

// Options

const STYLE_OPTIONS = [
  { id: "beauty", label: "Beauty portrait", description: "Soft light, smoother skin" },
  { id: "oil", label: "Oil painting", description: "Painterly brush strokes" },
  { id: "anime", label: "Anime", description: "Stylized anime character" },
  { id: "poster", label: "Movie poster", description: "Cinematic, dramatic" },
  { id: "classic", label: "Classic master", description: "Old masters style" }
];

const SKIN_EFFECTS = [
  { id: "no-wrinkles", label: "Remove wrinkles", description: "Soft retouch" },
  { id: "younger", label: "Look younger", description: "Around -20 years" },
  { id: "smooth-skin", label: "Smooth skin", description: "Even skin tone" }
];

const MIMIC_EFFECTS = [
  { id: "smile-soft", label: "Soft smile", description: "Calm mood" },
  { id: "smile-big", label: "Big smile", description: "More emotions" },
  { id: "smile-hollywood", label: "Hollywood smile", description: "Visible teeth" },
  { id: "laugh", label: "Laugh", description: "Bright laughter" },
  { id: "neutral", label: "Neutral", description: "Relaxed face" },
  { id: "serious", label: "Serious", description: "No smile" },
  { id: "eyes-bigger", label: "Bigger eyes", description: "Slightly larger" },
  { id: "eyes-brighter", label: "Brighter eyes", description: "More expressive" }
];

const GREETING_OPTIONS = [
  { id: "new-year", label: "New Year", description: "Festive card" },
  { id: "birthday", label: "Birthday", description: "Birthday card" },
  { id: "funny", label: "Funny", description: "Playful style" },
  { id: "scary", label: "Scary", description: "Horror style" }
];

// Helpers

function openSheetFor(type) {
  sheetOptionsRow.innerHTML = "";

  if (type === "style") {
    sheetTitle.textContent = "Portrait style";
    sheetDescription.textContent = "Choose main visual style.";
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
    sheetTitle.textContent = "Skin effects";
    sheetDescription.textContent = "You can choose several skin effects.";
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
    sheetTitle.textContent = "Expression";
    sheetDescription.textContent = "Adjust mood and expression.";
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
    sheetTitle.textContent = "Greetings";
    sheetDescription.textContent = "Choose greeting card style.";
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
    chip.textContent = `Style: ${styleInfo.label}`;
    selectionRow.appendChild(chip);
  }

  if (activeEffects.size > 0) {
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = `Effects: ${activeEffects.size}`;
    selectionRow.appendChild(chip);
  }

  if (currentGreeting) {
    const g = GREETING_OPTIONS.find((g) => g.id === currentGreeting);
    const chip = document.createElement("div");
    chip.className = "selection-chip";
    chip.textContent = g ? `Greeting: ${g.label}` : "Greeting selected";
    selectionRow.appendChild(chip);
  }
}

function updateGreetingOverlay() {
  if (!currentGreeting) {
    greetingOverlay.style.display = "none";
    greetingOverlay.textContent = "";
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

// Handlers

btnAddPhoto.addEventListener("click", () => fileInput.click());

fileInput.addEventListener("change", async (e) => {
  const file = e.target.files && e.target.files[0];
  if (!file) return;

  try {
    resizedImageDataUrl = await resizeImage(file);
    previewImage.src = resizedImageDataUrl;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";
  } catch (err) {
    console.error("resize error", err);
    alert("Failed to process photo: " + err.message);
  }
});

btnStyle.addEventListener("click", () => openSheetFor("style"));
btnSkin.addEventListener("click", () => openSheetFor("skin"));
btnMimic.addEventListener("click", () => openSheetFor("mimic"));
btnGreetings.addEventListener("click", () => openSheetFor("greetings"));

sheetCloseBtn.addEventListener("click", closeSheet);
sheetBackdrop.addEventListener("click", (e) => {
  if (e.target === sheetBackdrop) closeSheet();
});

btnPay.addEventListener("click", () => {
  alert("Payment is disabled in test mode.");
});

btnGenerate.addEventListener("click", async () => {
  if (!resizedImageDataUrl && activeEffects.size === 0 && !currentGreeting) {
    alert("Add a photo or choose effects / greeting.");
    return;
  }

  try {
    btnGenerate.disabled = true;
    controls.classList.add("controls-hidden");
    generateStatus.style.display = "flex";
    downloadLink.style.display = "none";

    const body = {
      style: currentStyle,
      text: null,
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
    } catch {
      throw new Error("Server returned invalid JSON.");
    }

    if (!res.ok) {
      throw new Error(data.error || data.message || String(res.status));
    }

    if (!data.image) {
      throw new Error("No image from server.");
    }

    previewImage.src = data.image;
    previewImage.style.display = "block";
    previewPlaceholder.style.display = "none";

    downloadLink.href = data.image;
    downloadLink.style.display = "inline-flex";
  } catch (err) {
    console.error("GEN ERROR", err);
    alert("Generation error: " + (err.message || err));
  } finally {
    btnGenerate.disabled = false;
    controls.classList.remove("controls-hidden");
    generateStatus.style.display = "none";
  }
});

// Init
previewImage.style.display = "none";
generateStatus.style.display = "none";
renderSelections();
updateGreetingOverlay();