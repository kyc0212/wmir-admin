const MENU_DATA_URL = "https://kyc0212.github.io/sharedmenu/menu-data.json";

const STORE_LABELS = {
  breakfast: "早餐店",
  tofu: "豆花店",
  drink: "手搖店",
  noodles: "麵店"
};

const elements = {
  navButtons: Array.from(document.querySelectorAll(".nav-btn")),
  importFileInput: document.getElementById("importFileInput"),
  exportJsonBtn: document.getElementById("exportJsonBtn"),
  resetSampleBtn: document.getElementById("resetSampleBtn"),
  storeTitle: document.getElementById("storeTitle"),
  storeSubtitle: document.getElementById("storeSubtitle"),
  menuList: document.getElementById("menuList"),
  menuForm: document.getElementById("menuForm"),
  editorTitle: document.getElementById("editorTitle"),
  itemName: document.getElementById("itemName"),
  itemImage: document.getElementById("itemImage"),
  itemPrice: document.getElementById("itemPrice"),
  itemCategory: document.getElementById("itemCategory"),
  itemDescription: document.getElementById("itemDescription"),
  itemOptions: document.getElementById("itemOptions"),
  itemSweetness: document.getElementById("itemSweetness"),
  itemIce: document.getElementById("itemIce"),
  itemToppings: document.getElementById("itemToppings"),
  cancelEditBtn: document.getElementById("cancelEditBtn"),
  jsonPreview: document.getElementById("jsonPreview"),
  toast: document.getElementById("toast")
};

const state = {
  data: null,
  originalData: null,
  activeStoreId: "breakfast",
  editingItemId: null
};

async function init() {
  bindEvents();
  await loadRemoteMenu();
}

function bindEvents() {
  elements.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.activeStoreId = button.dataset.store;
      state.editingItemId = null;
      updateNavButtons();
      updateStoreHeader();
      renderMenuList();
      updatePreview();
      resetForm();
    });
  });

  elements.menuForm.addEventListener("submit", handleSaveItem);
  elements.cancelEditBtn.addEventListener("click", resetForm);
  elements.importFileInput.addEventListener("change", importJsonFile);
  elements.exportJsonBtn.addEventListener("click", exportJsonFile);
  elements.resetSampleBtn.addEventListener("click", resetToLoadedData);
}

async function loadRemoteMenu() {
  try {
    const response = await fetch(MENU_DATA_URL, { cache: "no-store" });
    if (!response.ok) throw new Error("menu-data.json 載入失敗");
    const data = await response.json();
    state.data = structuredClone(data);
    state.originalData = structuredClone(data);
    updateNavButtons();
    updateStoreHeader();
    renderMenuList();
    updatePreview();
    resetForm();
    showToast("已載入目前 sharedmenu 菜單資料");
  } catch (error) {
    console.error(error);
    elements.menuList.innerHTML = `<div class="menu-card"><p class="menu-meta">載入遠端 menu-data.json 失敗。你仍然可以匯入本機 JSON 後編輯。</p></div>`;
    elements.jsonPreview.textContent = "尚未載入資料";
    showToast("遠端菜單載入失敗，可改用匯入 JSON");
  }
}

function getActiveStore() {
  if (!state.data?.stores) return null;
  return state.data.stores.find((store) => store.storeId === state.activeStoreId) || null;
}

function updateNavButtons() {
  elements.navButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.store === state.activeStoreId);
  });
}

function updateStoreHeader() {
  const store = getActiveStore();
  elements.storeTitle.textContent = store?.storeName || STORE_LABELS[state.activeStoreId] || "店家";
  elements.storeSubtitle.textContent = "管理該店的商品、分類與選項。";
}

function renderMenuList() {
  const store = getActiveStore();
  if (!store) {
    elements.menuList.innerHTML = `<div class="menu-card"><p class="menu-meta">目前沒有可顯示的店家資料。</p></div>`;
    return;
  }

  const items = store.menuItems || [];
  if (!items.length) {
    elements.menuList.innerHTML = `<div class="menu-card"><p class="menu-meta">這家店目前沒有商品，直接從右側新增第一個品項。</p></div>`;
    return;
  }

  elements.menuList.innerHTML = items.map((item) => {
    const optionSummary = [
      item.options?.length ? `一般選項：${item.options.join("、")}` : "",
      item.sweetnessOptions?.length ? `甜度：${item.sweetnessOptions.join("、")}` : "",
      item.iceOptions?.length ? `冰量：${item.iceOptions.join("、")}` : "",
      item.toppings?.length ? `加料：${item.toppings.join("、")}` : ""
    ].filter(Boolean).join("｜");

    return `
      <article class="menu-card">
        <div class="menu-card-top">
          <div>
            <h4>${item.name}</h4>
            <p class="menu-meta">${item.category}｜NT$ ${item.price}</p>
            <p class="menu-meta">${item.description || "沒有描述"}</p>
            <p class="menu-meta">${optionSummary || "沒有額外選項"}</p>
          </div>
        </div>
        <div class="menu-actions">
          <button class="small-btn edit-btn" data-action="edit" data-item-id="${item.id}">編輯</button>
          <button class="small-btn delete-btn" data-action="delete" data-item-id="${item.id}">刪除</button>
        </div>
      </article>
    `;
  }).join("");

  elements.menuList.querySelectorAll("[data-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const itemId = button.dataset.itemId;
      if (button.dataset.action === "edit") startEditItem(itemId);
      if (button.dataset.action === "delete") deleteItem(itemId);
    });
  });
}

function startEditItem(itemId) {
  const store = getActiveStore();
  const item = store?.menuItems?.find((entry) => entry.id === itemId);
  if (!item) return;

  state.editingItemId = itemId;
  elements.editorTitle.textContent = "編輯商品";
  elements.itemName.value = item.name || "";
  elements.itemImage.value = item.image || "";
  elements.itemPrice.value = item.price || "";
  elements.itemCategory.value = item.category || "";
  elements.itemDescription.value = item.description || "";
  elements.itemOptions.value = (item.options || []).join(", ");
  elements.itemSweetness.value = (item.sweetnessOptions || []).join(", ");
  elements.itemIce.value = (item.iceOptions || []).join(", ");
  elements.itemToppings.value = (item.toppings || []).join(", ");
  showToast("已載入商品到編輯表單");
}

function deleteItem(itemId) {
  const store = getActiveStore();
  if (!store) return;

  store.menuItems = (store.menuItems || []).filter((item) => item.id !== itemId);
  renderMenuList();
  updatePreview();
  if (state.editingItemId === itemId) resetForm();
  showToast("商品已刪除");
}

function handleSaveItem(event) {
  event.preventDefault();
  const store = getActiveStore();
  if (!store) return;

  const payload = {
    id: state.editingItemId || createItemId(),
    name: elements.itemName.value.trim(),
    image: elements.itemImage.value.trim(),
    price: Number(elements.itemPrice.value),
    category: elements.itemCategory.value.trim(),
    description: elements.itemDescription.value.trim(),
    options: splitCommaValues(elements.itemOptions.value),
    sweetnessOptions: splitCommaValues(elements.itemSweetness.value),
    iceOptions: splitCommaValues(elements.itemIce.value),
    toppings: splitCommaValues(elements.itemToppings.value)
  };

  if (!payload.name || !payload.category || !payload.price) {
    showToast("商品名稱、價格、分類都要填");
    return;
  }

  if (!payload.image) {
    payload.image = "https://images.unsplash.com/photo-1544025162-d76694265947?w=1200&q=80";
  }

  const hasDrinkFields = payload.sweetnessOptions.length || payload.iceOptions.length || payload.toppings.length;
  if (!hasDrinkFields) {
    delete payload.sweetnessOptions;
    delete payload.iceOptions;
    delete payload.toppings;
  }

  if (!payload.options.length) {
    delete payload.options;
  }

  const existingIndex = (store.menuItems || []).findIndex((item) => item.id === payload.id);
  if (existingIndex >= 0) {
    store.menuItems[existingIndex] = payload;
    showToast("商品已更新");
  } else {
    store.menuItems = store.menuItems || [];
    store.menuItems.push(payload);
    showToast("商品已新增");
  }

  if (!store.categories.includes(payload.category)) {
    store.categories.push(payload.category);
  }

  renderMenuList();
  updatePreview();
  resetForm();
}

function resetForm() {
  state.editingItemId = null;
  elements.editorTitle.textContent = "新增商品";
  elements.menuForm.reset();
}

function splitCommaValues(value) {
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function createItemId() {
  return `item-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function updatePreview() {
  elements.jsonPreview.textContent = JSON.stringify(state.data, null, 2);
}

function exportJsonFile() {
  if (!state.data) {
    showToast("目前沒有可匯出的資料");
    return;
  }

  const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "menu-data.json";
  link.click();
  URL.revokeObjectURL(url);
  showToast("已匯出新的 menu-data.json");
}

function importJsonFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result);
      if (!parsed.stores || !Array.isArray(parsed.stores)) {
        throw new Error("格式不正確");
      }
      state.data = parsed;
      state.originalData = structuredClone(parsed);
      state.activeStoreId = parsed.stores[0]?.storeId || "breakfast";
      state.editingItemId = null;
      updateNavButtons();
      updateStoreHeader();
      renderMenuList();
      updatePreview();
      resetForm();
      showToast("JSON 匯入成功");
    } catch (error) {
      console.error(error);
      showToast("匯入失敗，請確認 JSON 格式");
    }
  };
  reader.readAsText(file, "utf-8");
}

function resetToLoadedData() {
  if (!state.originalData) {
    showToast("目前沒有可還原的資料");
    return;
  }
  state.data = structuredClone(state.originalData);
  state.editingItemId = null;
  updateStoreHeader();
  renderMenuList();
  updatePreview();
  resetForm();
  showToast("已恢復目前載入的資料");
}

let toastTimer = null;
function showToast(message) {
  elements.toast.textContent = message;
  elements.toast.classList.remove("hidden");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => elements.toast.classList.add("hidden"), 2200);
}

init();
