"use strict";

const CATEGORY_ORDER = ["EXT", "Drum", "AR-15", "Draco", "MAC", "ARP Drum", "AK47"];
const MODEL_DEFAULTS = {
  EXT: "Glock 18 Extended",
  Drum: "Glock 18 Drum",
  "AR-15": "AR-15 Custom",
  Draco: "Draco Custom",
  MAC: "MAC Custom",
  "ARP Drum": "ARP Drum",
  AK47: "AK-47 Custom"
};
const PLACEHOLDER_VALUE = "N/A";
const DEFAULT_DEMAND = "TBD";
const INDEX_UPDATED = "2026-06-27";
const DATABASE_NAME = "chicblocko-custom-editor";
const DATABASE_VERSION = 1;
const STORE_NAME = "site-data";
const STATE_KEY = "current-listings";
const SAFE_IMAGE_PATTERN = /^(assets\/(?:guns|team)\/[-a-z0-9_/.]+|assets\/chicblocko-logo\.webp)$/i;
const SAFE_UPLOAD_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);
const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const REMOVED_LISTING_IDS = new Set(["glock18drum-065", "glock18ext-008", "arp-drum-003"]);

const $ = (selector) => document.querySelector(selector);
const cardGrid = $("#cardGrid");
const detailDialog = $("#detailDialog");
const editorDialog = $("#editorDialog");
const searchInput = $("#searchInput");
const sortSelect = $("#sortSelect");
const backToTop = $("#backToTop");

let listings = [];
let activeCategory = "All";
let editorCategory = "All";
let selectedListingId = null;
let searchTimer = 0;
let saveTimer = 0;
let editorRenderTimer = 0;
let publicRenderTimer = 0;
let detailCloseTimer = 0;
let databasePromise;

function normalizeCategory(item) {
  const id = String(item.id || "");
  if (id.startsWith("glock18ext-")) return "EXT";
  if (id.startsWith("glock18drum-")) return "Drum";
  if (id.startsWith("arp-drum-")) return "ARP Drum";
  if (id.startsWith("ak-47-")) return "AK47";
  return CATEGORY_ORDER.includes(item.category) ? item.category : "EXT";
}

function cleanText(value, fallback, maxLength = 90) {
  const text = String(value ?? fallback)
    .replace(/[\u0000-\u001f\u007f]/g, "")
    .trim()
    .slice(0, maxLength);
  return text || fallback;
}

function sanitizeImageSource(value) {
  const image = String(value || "").trim();
  if (!image) return "";
  if (/^data:image\/(?:png|jpe?g|webp);base64,[a-z0-9+/=]+$/i.test(image)) return image;
  if (image.includes("..")) return "";
  return SAFE_IMAGE_PATTERN.test(image) ? image : "";
}

function normalizeDemand(value) {
  const demand = String(value || DEFAULT_DEMAND).toUpperCase();
  return ["TBD", "LOW", "MEDIUM", "HIGH"].includes(demand) ? demand : DEFAULT_DEMAND;
}

function normalizeListing(item, index) {
  return {
    id: cleanText(item.id, `custom-${Date.now()}-${index}`, 90),
    name: cleanText(item.name, "New Custom", 80),
    model: cleanText(item.model, "Unknown Model", 60),
    category: normalizeCategory(item),
    image: sanitizeImageSource(item.image),
    value: cleanText(item.value, PLACEHOLDER_VALUE, 30),
    demand: normalizeDemand(item.demand),
    imageX: Number.isFinite(Number(item.imageX)) ? Number(item.imageX) : 50,
    imageY: Number.isFinite(Number(item.imageY)) ? Number(item.imageY) : 50,
    imageZoom: Number.isFinite(Number(item.imageZoom)) ? Number(item.imageZoom) : 1,
    imageFit: item.imageFit === "cover" ? "cover" : "contain",
    localOnly: item.localOnly === true,
    order: Number.isFinite(Number(item.order)) ? Number(item.order) : index
  };
}

const sourceListings = Array.isArray(window.ALL_GUN_IMAGES)
  ? window.ALL_GUN_IMAGES.map(normalizeListing)
  : [];

function openDatabase() {
  if (databasePromise) return databasePromise;
  databasePromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  return databasePromise;
}

async function readSavedListings() {
  try {
    const database = await openDatabase();
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readonly");
      const request = transaction.objectStore(STORE_NAME).get(STATE_KEY);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn("Local editor storage is unavailable.", error);
    return null;
  }
}

async function writeSavedListings() {
  const status = $("#autosaveStatus");
  if (status) {
    status.classList.add("saving");
    status.lastChild.textContent = "Saving";
  }

  try {
    const database = await openDatabase();
    await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, "readwrite");
      transaction.objectStore(STORE_NAME).put(listings, STATE_KEY);
      transaction.oncomplete = resolve;
      transaction.onerror = () => reject(transaction.error);
    });
    if (status) status.lastChild.textContent = "Saved";
  } catch (error) {
    console.error("Could not save editor changes.", error);
    if (status) status.lastChild.textContent = "Save failed";
  } finally {
    if (status) status.classList.remove("saving");
  }
}

async function writeListingsToStorage(items) {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).put(items, STATE_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

async function clearSavedListings() {
  const database = await openDatabase();
  await new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE_NAME, "readwrite");
    transaction.objectStore(STORE_NAME).delete(STATE_KEY);
    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

function scheduleSave() {
  window.clearTimeout(saveTimer);
  const status = $("#autosaveStatus");
  if (status) {
    status.classList.add("saving");
    status.lastChild.textContent = "Unsaved";
  }
  saveTimer = window.setTimeout(writeSavedListings, 350);
}

function mergeSavedListings(saved) {
  const merged = new Map();
  sourceListings.forEach((item, index) => {
    const normalized = normalizeListing(item, index);
    merged.set(normalized.id, normalized);
  });

  if (Array.isArray(saved)) {
    saved.map(normalizeListing).forEach((item) => {
      if (REMOVED_LISTING_IDS.has(item.id)) return;
      const source = merged.get(item.id);
      if (!source && item.localOnly !== true) return;
      merged.set(item.id, source
        ? { ...source, ...item, category: source.category, model: source.model, value: source.value, demand: source.demand, image: item.image || source.image }
        : item);
    });
  }

  return [...merged.values()].sort((a, b) => {
    const categoryDifference = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
    return categoryDifference || a.order - b.order;
  });
}

async function cleanRemovedSavedListings(saved) {
  if (!Array.isArray(saved)) return saved;
  const sourceIds = new Set(sourceListings.map((item) => item.id));
  const cleaned = saved.filter((item) => {
    const id = String(item?.id || "");
    if (REMOVED_LISTING_IDS.has(id)) return false;
    return sourceIds.has(id) || item?.localOnly === true;
  });
  if (cleaned.length === saved.length) return saved;
  try {
    await writeListingsToStorage(cleaned);
  } catch (error) {
    console.warn("Could not clean removed customs from local editor storage.", error);
  }
  return cleaned;
}

function availableCategories() {
  const available = new Set(listings.filter((item) => item.image).map((item) => item.category));
  return CATEGORY_ORDER.filter((category) => available.has(category));
}

function publicListings() {
  return listings.filter((item) => item.image);
}

function renderFilters() {
  const fragment = document.createDocumentFragment();
  const categories = ["All", ...availableCategories()];

  if (!categories.includes(activeCategory)) activeCategory = "All";
  $("#categoryFilters").replaceChildren();

  categories.forEach((category) => {
    const button = document.createElement("button");
    const isActive = activeCategory === category;
    button.type = "button";
    button.className = `filter-button${isActive ? " active" : ""}`;
    button.dataset.category = category;
    button.textContent = category;
    button.setAttribute("aria-pressed", String(isActive));
    fragment.append(button);
  });

  $("#categoryFilters").append(fragment);
}

function normalizeSearchText(value) {
  return String(value || "")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/gi, " ")
    .trim()
    .toLowerCase();
}

function parseValueToken(token, fallbackUnit = "") {
  const match = String(token).trim().match(/^(\d+(?:\.\d+)?)([km])?$/i);
  if (!match) return null;

  const amount = Number(match[1]);
  const unit = (match[2] || fallbackUnit || "").toUpperCase();

  if (unit === "M") return amount * 1000000;
  if (unit === "K") return amount * 1000;
  return amount;
}

function valueRank(item) {
  const text = String(item.value || "").toUpperCase();
  if (!text || text.includes("N/A") || text.includes("NA") || text.includes("?")) return null;

  const fallbackUnit = text.includes("M") ? "M" : text.includes("K") ? "K" : "";
  const values = [...text.matchAll(/\d+(?:\.\d+)?\s*[KM]?/gi)]
    .map((match) => parseValueToken(match[0].replace(/\s+/g, ""), fallbackUnit))
    .filter((value) => Number.isFinite(value));

  if (!values.length) return null;
  return values.reduce((total, value) => total + value, 0) / values.length;
}

function compareByValue(direction) {
  return (a, b) => {
    const aValue = valueRank(a);
    const bValue = valueRank(b);
    const fallback = a.name.localeCompare(b.name, undefined, { sensitivity: "base" });

    if (aValue === null && bValue === null) return fallback;
    if (aValue === null) return 1;
    if (bValue === null) return -1;
    return direction * (aValue - bValue) || fallback;
  };
}

function filteredListings() {
  const query = normalizeSearchText(searchInput.value);
  const compactQuery = query.replace(/\s+/g, "");
  const result = publicListings().filter((item) => {
    const matchesCategory = activeCategory === "All" || item.category === activeCategory;
    const searchableText = normalizeSearchText(`${item.name} ${item.model} ${item.category} ${item.value} ${item.demand}`);
    const compactSearchableText = searchableText.replace(/\s+/g, "");
    const matchesSearch = !query || searchableText.includes(query) || compactSearchableText.includes(compactQuery);
    return matchesCategory && matchesSearch;
  });

  if (sortSelect.value === "name") {
    result.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: "base" }));
  } else if (sortSelect.value === "value-low") {
    result.sort(compareByValue(1));
  } else if (sortSelect.value === "value-high") {
    result.sort(compareByValue(-1));
  } else {
    result.sort((a, b) => {
      const categoryDifference = CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category);
      return categoryDifference || a.order - b.order;
    });
  }

  return result;
}

function updateImageStyles(image, item) {
  image.style.objectPosition = `${item.imageX}% ${item.imageY}%`;
  image.style.transformOrigin = `${item.imageX}% ${item.imageY}%`;
  image.style.setProperty("--image-zoom", item.imageZoom);
  image.style.objectFit = item.imageFit;
}

function renderCards() {
  const items = filteredListings();
  const fragment = document.createDocumentFragment();

  cardGrid.setAttribute("aria-busy", "true");

  items.forEach((item, index) => {
    const cardFragment = $("#cardTemplate").content.cloneNode(true);
    const card = cardFragment.querySelector(".gun-card");
    const image = cardFragment.querySelector("img");

    card.dataset.id = item.id;
    card.setAttribute("aria-label", `View ${item.name}, ${item.model}`);

    image.src = item.image;
    image.alt = `${item.name} for ${item.model}`;
    image.decoding = "async";
    image.loading = index < 8 ? "eager" : "lazy";
    image.fetchPriority = index < 4 ? "high" : "auto";
    image.addEventListener("error", () => card.classList.add("image-error"), { once: true });
    updateImageStyles(image, item);

    cardFragment.querySelector(".category-label").textContent = item.category;
    const name = cardFragment.querySelector("h3");
    name.textContent = item.name;
    name.classList.toggle("long-name", item.name.length > 16);
    name.classList.toggle("very-long-name", item.name.length > 27);
    cardFragment.querySelector(".model-name").textContent = item.model;
    cardFragment.querySelector(".card-value").textContent = item.value;
    cardFragment.querySelector(".card-demand").textContent = item.demand;
    cardFragment.querySelector(".demand-badge").dataset.demand = item.demand.toLowerCase();
    fragment.append(cardFragment);
  });

  cardGrid.replaceChildren(fragment);
  cardGrid.setAttribute("aria-busy", "false");
  $("#emptyState").hidden = items.length !== 0;
  $("#resultsStatus").textContent = `${items.length} custom${items.length === 1 ? "" : "s"} shown`;
  $("#itemCount").textContent = publicListings().length;
  $("#categoryCount").textContent = availableCategories().length;
}

function presentResults({ scroll = true, animate = true } = {}) {
  cardGrid.classList.remove("cards-enter");
  renderCards();

  if (animate && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    requestAnimationFrame(() => {
      cardGrid.classList.add("cards-enter");
      window.setTimeout(() => cardGrid.classList.remove("cards-enter"), 450);
    });
  }

  if (scroll) $("#catalog").scrollIntoView({ behavior: "smooth", block: "start" });
}

function schedulePublicRefresh() {
  window.clearTimeout(publicRenderTimer);
  publicRenderTimer = window.setTimeout(() => {
    renderFilters();
    renderCards();
  }, 80);
}

function showDetails(item) {
  window.clearTimeout(detailCloseTimer);
  if (detailDialog.open) return;
  const detailImage = $("#detailImage");
  detailImage.src = item.image;
  detailImage.alt = `${item.name} for ${item.model}`;
  updateImageStyles(detailImage, item);

  $("#detailCategory").textContent = item.category;
  $("#detailName").textContent = item.name;
  $("#detailName").classList.toggle("long-name", item.name.length > 22);
  $("#detailName").classList.toggle("very-long-name", item.name.length > 34);
  $("#detailModel").textContent = item.model;
  const detailValue = $("#detailValue");
  detailValue.textContent = item.value;
  detailValue.classList.toggle("compact-value", item.value.length > 7);
  detailValue.classList.toggle("extra-compact-value", item.value.length > 10);
  $("#detailDemand").querySelector("b").textContent = item.demand;
  $("#detailDemand").dataset.demand = item.demand.toLowerCase();
  $("#detailFlip").classList.remove("is-visible");

  detailDialog.showModal();
  requestAnimationFrame(() => requestAnimationFrame(() => $("#detailFlip").classList.add("is-visible")));
}

function closeDetails() {
  if (!detailDialog.open) return;
  window.clearTimeout(detailCloseTimer);
  $("#detailFlip").classList.remove("is-visible");
  detailCloseTimer = window.setTimeout(() => {
    if (detailDialog.open) detailDialog.close();
  }, 220);
}

function openCardFromEvent(event) {
  const card = event.target.closest(".gun-card");
  if (!card || !cardGrid.contains(card)) return;
  const item = listings.find((listing) => listing.id === card.dataset.id);
  if (item) showDetails(item);
}

function selectedListing() {
  return listings.find((item) => item.id === selectedListingId) || null;
}

function populateCategorySelect() {
  const select = $("#customCategory");
  if (!select) return;
  select.replaceChildren();
  CATEGORY_ORDER.forEach((category) => {
    const option = document.createElement("option");
    option.value = category;
    option.textContent = category;
    select.append(option);
  });
}

function renderEditorModels() {
  const row = $("#editorModels");
  const fragment = document.createDocumentFragment();
  row.replaceChildren();

  ["All", ...CATEGORY_ORDER].forEach((category) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `editor-model-button${editorCategory === category ? " active" : ""}`;
    button.dataset.category = category;
    button.textContent = category;
    fragment.append(button);
  });

  const addButton = document.createElement("button");
  addButton.type = "button";
  addButton.className = "new-custom-button";
  const addIcon = document.createElement("i");
  addIcon.textContent = "+";
  const addLabel = document.createElement("span");
  addLabel.textContent = "NEW CUSTOM";
  addButton.append(addIcon, addLabel);
  fragment.append(addButton);
  row.append(fragment);
}

function filteredEditorListings() {
  const query = $("#editorSearch").value.trim().toLocaleLowerCase();
  return listings.filter((item) => {
    const categoryMatches = editorCategory === "All" || item.category === editorCategory;
    const queryMatches = `${item.name} ${item.model} ${item.category}`.toLocaleLowerCase().includes(query);
    return categoryMatches && queryMatches;
  });
}

function renderEditorGrid() {
  const grid = $("#editorCustomGrid");
  const fragment = document.createDocumentFragment();

  const addCard = document.createElement("button");
  addCard.type = "button";
  addCard.className = "editor-add-card";
  const addIcon = document.createElement("b");
  addIcon.textContent = "+";
  const addLabel = document.createElement("span");
  addLabel.textContent = "ADD CUSTOM";
  addCard.append(addIcon, addLabel);
  fragment.append(addCard);

  filteredEditorListings().forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `editor-custom-card${item.id === selectedListingId ? " active" : ""}`;
    button.dataset.id = item.id;

    const image = document.createElement("img");
    image.src = item.image || "assets/chicblocko-logo.webp";
    image.alt = "";

    const name = document.createElement("strong");
    name.textContent = item.name;
    const model = document.createElement("small");
    model.textContent = item.model;
    button.append(image, name, model);
    fragment.append(button);
  });

  grid.replaceChildren(fragment);
}

function showEditorForm(item, isNew = false) {
  selectedListingId = item.id;
  $("#formEmpty").hidden = true;
  $("#formContent").hidden = false;
  $("#formMode").textContent = isNew ? "NEW CUSTOM" : "EDIT CUSTOM";
  $("#formTitle").textContent = item.name;
  $("#customCategory").value = item.category;
  $("#customModel").value = item.model;
  $("#customName").value = item.name;
  $("#customValue").value = item.value;
  $("#customDemand").value = item.demand;
  $("#imagePreview").src = item.image;
  $("#imagePreview").alt = item.image ? `${item.name} preview` : "";
  $("#deleteCustom").hidden = isNew && !item.image;
  renderEditorGrid();
}

function createCustom() {
  const category = editorCategory === "All" ? "EXT" : editorCategory;
  const item = normalizeListing({
    id: `custom-${Date.now()}`,
    name: "New Custom",
    model: MODEL_DEFAULTS[category],
    category,
    image: "",
    value: PLACEHOLDER_VALUE,
    demand: DEFAULT_DEMAND,
    localOnly: true,
    order: listings.length
  }, listings.length);

  listings.push(item);
  editorCategory = category;
  renderEditorModels();
  showEditorForm(item, true);
  scheduleSave();
}

function scheduleEditorGridRefresh() {
  window.clearTimeout(editorRenderTimer);
  editorRenderTimer = window.setTimeout(renderEditorGrid, 100);
}

function updateSelectedListing(field, value) {
  const item = selectedListing();
  if (!item) return;
  item[field] = value;
  $("#formTitle").textContent = item.name;
  scheduleSave();
  scheduleEditorGridRefresh();
  schedulePublicRefresh();
}

async function fileToOptimizedDataUrl(file) {
  if (!SAFE_UPLOAD_TYPES.has(file.type)) throw new Error("Use a PNG, JPG, or WebP image.");
  if (file.size > MAX_UPLOAD_BYTES) throw new Error("Image must be smaller than 8 MB.");

  const bitmap = "createImageBitmap" in window
    ? await createImageBitmap(file)
    : await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error("This image could not be opened."));
      image.src = URL.createObjectURL(file);
    });
  const maxDimension = 1200;
  const sourceWidth = bitmap.width || bitmap.naturalWidth;
  const sourceHeight = bitmap.height || bitmap.naturalHeight;
  const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sourceWidth * scale));
  canvas.height = Math.max(1, Math.round(sourceHeight * scale));
  const context = canvas.getContext("2d");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  if (typeof bitmap.close === "function") bitmap.close();
  else URL.revokeObjectURL(bitmap.src);
  return canvas.toDataURL("image/webp", .88);
}

async function applyImageFile(file) {
  const item = selectedListing();
  if (!item || !file) return;
  const copy = $("#imageDrop .image-drop-copy small");
  copy.textContent = "Processing image...";

  try {
    const dataUrl = await fileToOptimizedDataUrl(file);
    item.image = dataUrl;
    $("#imagePreview").src = dataUrl;
    $("#imagePreview").alt = `${item.name} preview`;
    $("#deleteCustom").hidden = false;
    scheduleSave();
    scheduleEditorGridRefresh();
    schedulePublicRefresh();
    copy.textContent = "or click to replace the image";
  } catch (error) {
    copy.textContent = error.message;
  }
}

function exportEditorData() {
  const blob = new Blob([JSON.stringify({
    version: 1,
    exportedAt: new Date().toISOString(),
    listings
  }, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `chicblocko-customs-${new Date().toISOString().slice(0, 10)}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

async function importEditorData(file) {
  if (!file) return;
  if (file.size > 2 * 1024 * 1024) throw new Error("Backup file must be smaller than 2 MB.");
  const isJson = file.type === "application/json" || file.name.toLowerCase().endsWith(".json");
  if (!isJson) throw new Error("Choose a JSON backup file.");
  const parsed = JSON.parse(await file.text());
  const imported = Array.isArray(parsed) ? parsed : parsed.listings;
  if (!Array.isArray(imported) || imported.length === 0) throw new Error("This backup has no customs.");
  if (imported.length > 500) throw new Error("This backup has too many customs.");
  listings = imported.map(normalizeListing);
  selectedListingId = null;
  editorCategory = "All";
  renderEditorModels();
  renderEditorGrid();
  $("#formContent").hidden = true;
  $("#formEmpty").hidden = false;
  await writeSavedListings();
  renderFilters();
  renderCards();
}

function openEditor() {
  if (!editorDialog) return;
  renderEditorModels();
  renderEditorGrid();
  editorDialog.showModal();
}

function closeEditor() {
  if (!editorDialog) return;
  editorDialog.close();
}

$("#categoryFilters").addEventListener("click", (event) => {
  const button = event.target.closest(".filter-button");
  if (!button) return;
  activeCategory = button.dataset.category;
  renderFilters();
  presentResults();
});

cardGrid.addEventListener("click", openCardFromEvent);
cardGrid.addEventListener("keydown", (event) => {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  openCardFromEvent(event);
});

searchInput.addEventListener("input", () => {
  window.clearTimeout(searchTimer);
  searchTimer = window.setTimeout(() => presentResults({ scroll: false }), 80);
});

searchInput.addEventListener("keydown", (event) => {
  if (event.key !== "Escape" || !searchInput.value) return;
  searchInput.value = "";
  presentResults({ scroll: false });
});

sortSelect.addEventListener("change", () => {
  const sortBox = sortSelect.closest(".sort-box");
  sortBox.classList.add("sort-changed");
  window.setTimeout(() => sortBox.classList.remove("sort-changed"), 350);
  presentResults({ scroll: false });
});

function updateBackToTop() {
  backToTop.classList.toggle("is-visible", window.scrollY > 600);
}

backToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth"
  });
});
window.addEventListener("scroll", updateBackToTop, { passive: true });

$("#closeDetail").addEventListener("click", closeDetails);
$("#detailBack").addEventListener("click", closeDetails);
detailDialog.addEventListener("click", (event) => {
  if (event.target === detailDialog) closeDetails();
});
detailDialog.addEventListener("cancel", (event) => {
  event.preventDefault();
  closeDetails();
});

if (editorDialog) {
  $("#openEditor").addEventListener("click", openEditor);
  $("#closeEditor").addEventListener("click", closeEditor);
  $("#doneEditing").addEventListener("click", closeEditor);
  editorDialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    closeEditor();
  });

  $("#editorModels").addEventListener("click", (event) => {
    if (event.target.closest(".new-custom-button")) {
      createCustom();
      return;
    }
    const button = event.target.closest(".editor-model-button");
    if (!button) return;
    editorCategory = button.dataset.category;
    renderEditorModels();
    renderEditorGrid();
  });

  $("#editorCustomGrid").addEventListener("click", (event) => {
    if (event.target.closest(".editor-add-card")) {
      createCustom();
      return;
    }
    const card = event.target.closest(".editor-custom-card");
    if (!card) return;
    const item = listings.find((listing) => listing.id === card.dataset.id);
    if (item) showEditorForm(item);
  });

  $("#editorSearch").addEventListener("input", renderEditorGrid);
  $("#customForm").addEventListener("submit", (event) => event.preventDefault());
  $("#customCategory").addEventListener("change", (event) => {
    updateSelectedListing("category", event.target.value);
    editorCategory = event.target.value;
    renderEditorModels();
  });
  $("#customModel").addEventListener("input", (event) => updateSelectedListing("model", event.target.value));
  $("#customName").addEventListener("input", (event) => updateSelectedListing("name", event.target.value));
  $("#customValue").addEventListener("input", (event) => updateSelectedListing("value", event.target.value || PLACEHOLDER_VALUE));
  $("#customDemand").addEventListener("change", (event) => updateSelectedListing("demand", event.target.value));
  $("#customImage").addEventListener("change", (event) => applyImageFile(event.target.files[0]));

  ["dragenter", "dragover"].forEach((type) => {
    $("#imageDrop").addEventListener(type, (event) => {
      event.preventDefault();
      $("#imageDrop").classList.add("dragging");
    });
  });
  ["dragleave", "drop"].forEach((type) => {
    $("#imageDrop").addEventListener(type, (event) => {
      event.preventDefault();
      $("#imageDrop").classList.remove("dragging");
    });
  });
  $("#imageDrop").addEventListener("drop", (event) => applyImageFile(event.dataTransfer.files[0]));

  $("#deleteCustom").addEventListener("click", () => {
    const item = selectedListing();
    if (!item || !window.confirm(`Delete "${item.name}"?`)) return;
    listings = listings.filter((listing) => listing.id !== item.id);
    selectedListingId = null;
    $("#formContent").hidden = true;
    $("#formEmpty").hidden = false;
    renderEditorGrid();
    scheduleSave();
    renderFilters();
    renderCards();
  });

  $("#exportData").addEventListener("click", exportEditorData);
  $("#importData").addEventListener("click", () => $("#importFile").click());
  $("#importFile").addEventListener("change", async (event) => {
    try {
      await importEditorData(event.target.files[0]);
    } catch (error) {
      window.alert(error.message);
    } finally {
      event.target.value = "";
    }
  });

  $("#resetData").addEventListener("click", async () => {
    if (!window.confirm("Reset every local edit and restore the original customs?")) return;
    await clearSavedListings();
    listings = sourceListings.map((item, index) => normalizeListing(item, index));
    selectedListingId = null;
    editorCategory = "All";
    renderEditorModels();
    renderEditorGrid();
    $("#formContent").hidden = true;
    $("#formEmpty").hidden = false;
    renderFilters();
    renderCards();
  });
}

async function initialize() {
  populateCategorySelect();
  if (editorDialog) {
    const saved = await readSavedListings();
    const cleanedSaved = await cleanRemovedSavedListings(saved);
    listings = mergeSavedListings(cleanedSaved);
  } else {
    listings = sourceListings.map((item, index) => normalizeListing(item, index));
  }

  const updatedDate = new Date(`${INDEX_UPDATED}T12:00:00`);
  const updatedLabel = updatedDate.toLocaleDateString(undefined, { month: "short", day: "numeric" }).toUpperCase();
  $("#lastUpdated").dateTime = INDEX_UPDATED;
  $("#lastUpdated").querySelector("b").textContent = updatedLabel;
  $("#year").textContent = new Date().getFullYear();

  renderFilters();
  renderCards();
  updateBackToTop();
}

initialize();
