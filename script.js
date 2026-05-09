const STORAGE_KEYS = {
  users: "rpg-users",
  sheets: "rpg-sheets",
  session: "rpg-session",
};

const SAVE_IDLE = 1200;
const FIELD_SAVED = 800;
const AUTOSAVE_DELAY = 1800;
const REFRESH_INTERVAL = 12000;
const UPGRADE_BASE_COUNT = 0;
const SKILL_BASE_COUNT = 0;

const attributeDefinitions = [
  { key: "con", label: "CON" },
  { key: "fr", label: "FR" },
  { key: "dex", label: "DEX" },
  { key: "agi", label: "AGI" },
  { key: "int", label: "INT" },
  { key: "will", label: "WILL" },
  { key: "per", label: "PER" },
  { key: "car", label: "CAR" },
];

const identificationFields = [
  ["nome", "Personagem"],
  ["classeSocialProfissao", "Classe Social / Profissão"],
  ["nascimento", "Nascimento"],
  ["local", "Local"],
  ["sexo", "Sexo"],
  ["altura", "Altura"],
  ["peso", "Peso"],
  ["idadeAparente", "Idade Aparente"],
  ["idadeReal", "Idade Real"],
  ["idiomas", "Idiomas"],
  ["religiao", "Religião"],
];

const statusFields = [
  ["nivel", "Nível"],
  ["xp", "XP"],
  ["ip", "IP"],
  ["pv", "PV"],
  ["dano", "Dano"],
  ["pvAtual", "PV Atual"],
];

const state = {
  session: null,
  selectedSheetUserId: null,
  saveTimer: null,
  saveResetTimer: null,
  pendingChanges: new Set(),
  dirtyFields: new Set(),
  dirtyMap: new Map(),
  refreshing: false,
  lastSnapshotVersion: null,
  registerMode: "public",
};

const elements = {};

document.addEventListener("DOMContentLoaded", initializeApp);

function initializeApp() {
  cacheElements();
  seedStorage();
  buildStaticForm();
  registerEvents();

  setTimeout(() => {
    showLogin();
  }, 500);
}

function cacheElements() {
  elements.loadingCard = document.getElementById("loadingCard");
  elements.loginCard = document.getElementById("loginCard");
  elements.appCard = document.getElementById("appCard");
  elements.sessionSummary = document.getElementById("sessionSummary");
  elements.loginForm = document.getElementById("loginForm");
  elements.registerDialog = document.getElementById("registerDialog");
  elements.registerForm = document.getElementById("registerForm");
  elements.cancelRegister = document.getElementById("cancelRegister");
  elements.openRegisterFromLogin = document.getElementById("openRegisterFromLogin");
  elements.openRegisterFromGm = document.getElementById("openRegisterFromGm");
  elements.logoutButton = document.getElementById("logoutButton");
  elements.saveStatus = document.getElementById("saveStatus");
  elements.gmTools = document.getElementById("gmTools");
  elements.sheetSelector = document.getElementById("sheetSelector");
  elements.imageInput = document.getElementById("imageInput");
  elements.portraitFrame = document.getElementById("portraitFrame");
  elements.portraitImage = document.getElementById("portraitImage");
  elements.portraitPlaceholder = document.getElementById("portraitPlaceholder");
  elements.upgradesGrid = document.getElementById("upgradesGrid");
  elements.skillsTable = document.getElementById("skillsTable");
  elements.addUpgradeRow = document.getElementById("addUpgradeRow");
  elements.addSkillRow = document.getElementById("addSkillRow");
  elements.inventoryFab = document.getElementById("inventoryFab");
  elements.inventoryDrawer = document.getElementById("inventoryDrawer");
  elements.closeInventoryDrawer = document.getElementById("closeInventoryDrawer");
  elements.inventoryRows = document.getElementById("inventoryRows");
  elements.addInventoryItem = document.getElementById("addInventoryItem");
  elements.notesFab = document.getElementById("notesFab");
  elements.notesDrawer = document.getElementById("notesDrawer");
  elements.closeNotesDrawer = document.getElementById("closeNotesDrawer");
  elements.notesTextarea = document.getElementById("notesTextarea");
  elements.historyFab = document.getElementById("historyFab");
  elements.historyDrawer = document.getElementById("historyDrawer");
  elements.closeHistoryDrawer = document.getElementById("closeHistoryDrawer");
  elements.historyTextarea = document.getElementById("historyTextarea");
}

function buildStaticForm() {
  buildAttributes();
  buildGridFields(document.getElementById("identificationGrid"), identificationFields);
  buildGridFields(document.getElementById("statusGrid"), statusFields, true);
  buildUpgrades();
  buildSkillsTable();
}

function buildAttributes() {
  const table = document.getElementById("attributeTable");
  table.innerHTML = "";

  const header = document.createElement("div");
  header.className = "attribute-row attribute-header";
  header.innerHTML = `
    <span>Atributo</span>
    <span>Valor</span>
    <span>Modif.</span>
    <span>Teste (%)</span>
  `;
  table.appendChild(header);

  attributeDefinitions.forEach(({ key, label }) => {
    const row = document.createElement("div");
    row.className = "attribute-row";
    row.innerHTML = `
      <div class="attribute-name">${label}</div>
      <input type="text" inputmode="numeric" data-field="${key}Valor">
      <input type="text" inputmode="numeric" data-field="${key}Mod">
      <input type="text" data-field="${key}Teste" readonly>
    `;
    table.appendChild(row);
  });

  const totalRow = document.createElement("div");
  totalRow.className = "attribute-row";
  totalRow.innerHTML = `
    <div class="attribute-name">TOTAL</div>
    <input type="text" data-field="atributosTotal" readonly>
    <div></div>
    <div></div>
  `;
  table.appendChild(totalRow);
}

function buildGridFields(container, fields, centered = false) {
  container.innerHTML = "";

  fields.forEach(([key, label]) => {
    const wrapper = document.createElement("label");
    wrapper.className = "grid-field";
    wrapper.innerHTML = `
      <span>${label}</span>
      <input type="text" data-field="${key}">
    `;

    if (centered) {
      wrapper.querySelector("input").classList.add("status-input");
    }

    container.appendChild(wrapper);
  });
}

function buildUpgrades() {
  ensureDynamicPlaceholders();
  elements.upgradesGrid.innerHTML = "";

  for (let index = 1; index <= UPGRADE_BASE_COUNT; index += 1) {
    elements.upgradesGrid.appendChild(createUpgradeRowElement({
      nameField: `aprimoramento${index}Nome`,
      valueField: `aprimoramento${index}Valor`,
      ariaIndex: index,
    }));
  }

  const dynamicUpgrades = getActiveSheet()?.dynamicUpgrades || [];
  dynamicUpgrades.forEach((row) => {
    elements.upgradesGrid.appendChild(createUpgradeRowElement({
      id: row.id,
      nameField: `dynamicUpgrade:${row.id}:nome`,
      valueField: `dynamicUpgrade:${row.id}:valor`,
      ariaIndex: row.id,
      dynamicType: "upgrade",
    }));
  });
}

function buildSkillsTable() {
  ensureDynamicPlaceholders();
  elements.skillsTable.innerHTML = "";

  const header = document.createElement("div");
  header.className = "skills-row skills-header";
  header.innerHTML = `
    <span>Perícia</span>
    <span>Atributo</span>
    <span>Valor</span>
    <span>Teste %</span>
  `;
  elements.skillsTable.appendChild(header);

  for (let index = 1; index <= SKILL_BASE_COUNT; index += 1) {
    elements.skillsTable.appendChild(createSkillRowElement({
      nameField: `pericia${index}Nome`,
      attributeField: `pericia${index}Atributo`,
      valueField: `pericia${index}Valor`,
      testField: `pericia${index}Teste`,
      ariaIndex: index,
    }));
  }

  const dynamicSkills = getActiveSheet()?.dynamicSkills || [];
  dynamicSkills.forEach((row) => {
    elements.skillsTable.appendChild(createSkillRowElement({
      id: row.id,
      nameField: `dynamicSkill:${row.id}:nome`,
      attributeField: `dynamicSkill:${row.id}:atributo`,
      valueField: `dynamicSkill:${row.id}:valor`,
      testField: `dynamicSkill:${row.id}:teste`,
      ariaIndex: row.id,
      dynamicType: "skill",
    }));
  });
}

function createUpgradeRowElement({ id = "", nameField, valueField, ariaIndex, dynamicType = "" }) {
  const row = document.createElement("div");
  row.className = `upgrade-row${dynamicType ? " dynamic-row" : ""}`;

  if (dynamicType) {
    row.dataset.dynamicType = dynamicType;
    row.dataset.rowId = id;
    row.dataset.placeholder = getDynamicRowMeta("upgrade", id)?.isPlaceholder ? "true" : "false";
  }

  row.innerHTML = `
    <input type="text" data-field="${nameField}" aria-label="Nome do aprimoramento ${ariaIndex}">
    <input type="text" inputmode="numeric" data-field="${valueField}" aria-label="Valor do aprimoramento ${ariaIndex}">
  `;

  return row;
}

function createSkillRowElement({ id = "", nameField, attributeField, valueField, testField, ariaIndex, dynamicType = "" }) {
  const row = document.createElement("div");
  row.className = `skills-row${dynamicType ? " dynamic-row" : ""}`;

  if (dynamicType) {
    row.dataset.dynamicType = dynamicType;
    row.dataset.rowId = id;
    row.dataset.placeholder = getDynamicRowMeta("skill", id)?.isPlaceholder ? "true" : "false";
  }

  row.innerHTML = `
    <label class="skill-cell skill-name">
      <input type="text" data-field="${nameField}" aria-label="Nome da perícia ${ariaIndex}">
    </label>
    <label class="skill-cell skill-number">
      <span>Atributo</span>
      <input type="text" inputmode="numeric" data-field="${attributeField}">
    </label>
    <label class="skill-cell skill-number">
      <span>Valor</span>
      <input type="text" inputmode="numeric" data-field="${valueField}">
    </label>
    <label class="skill-cell skill-number">
      <span>Teste %</span>
      <input type="text" data-field="${testField}" readonly>
    </label>
  `;

  return row;
}

function registerEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.openRegisterFromLogin.addEventListener("click", () => openRegisterDialog("public"));
  elements.openRegisterFromGm.addEventListener("click", () => openRegisterDialog("gm"));
  elements.cancelRegister.addEventListener("click", () => elements.registerDialog.close());
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.sheetSelector.addEventListener("change", handleSheetSelection);
  elements.imageInput.addEventListener("change", handleImageUpload);
  elements.addUpgradeRow.addEventListener("click", () => addDynamicRow("upgrade"));
  elements.addSkillRow.addEventListener("click", () => addDynamicRow("skill"));
  elements.inventoryFab.addEventListener("click", openInventoryDrawer);
  elements.closeInventoryDrawer.addEventListener("click", closeInventoryDrawer);
  elements.addInventoryItem.addEventListener("click", addInventoryItemRow);
  elements.notesFab.addEventListener("click", openNotesDrawer);
  elements.closeNotesDrawer.addEventListener("click", closeNotesDrawer);
  elements.notesTextarea.addEventListener("input", handleNotesInput);
  elements.historyFab.addEventListener("click", openHistoryDrawer);
  elements.closeHistoryDrawer.addEventListener("click", closeHistoryDrawer);
  elements.historyTextarea.addEventListener("input", handleHistoryInput);

  bindFieldEvents(document);
  bindDynamicRowEvents(document);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      flushPendingChanges();
    }
  });

  window.addEventListener("storage", () => {
    if (state.session && !state.dirtyFields.size) {
      refreshIfNeeded();
    }
  });

  setInterval(() => {
    refreshIfNeeded();
  }, REFRESH_INTERVAL);
}

function bindFieldEvents(scope) {
  scope.querySelectorAll("[data-field]").forEach((field) => {
    if (field.dataset.bound === "true") {
      return;
    }

    field.dataset.bound = "true";
    const isNumeric = field.hasAttribute("inputmode");
    field.addEventListener("input", () => handleFieldInput(field, isNumeric));
    field.addEventListener("blur", flushPendingChanges);
  });
}

function bindDynamicRowEvents(scope) {
  scope.querySelectorAll(".dynamic-row").forEach((row) => {
    if (row.dataset.rowBound === "true") {
      return;
    }

    row.dataset.rowBound = "true";
    row.addEventListener("focusout", handleDynamicRowFocusOut);
  });
}

function seedStorage() {
  if (readStorage(STORAGE_KEYS.users)) {
    return;
  }

  const users = [
    {
      id: crypto.randomUUID(),
      displayName: "Mestre da Mesa",
      login: "gm",
      password: "gm123456",
      role: "gm",
    },
    {
      id: crypto.randomUUID(),
      displayName: "Helena Voss",
      login: "helena",
      password: "jogador123",
      role: "player",
    },
  ];

  writeStorage(STORAGE_KEYS.users, users);

  const sheets = {};
  users.forEach((user, index) => {
    if (user.role === "player") {
      sheets[user.id] = createDefaultSheet(user, index);
    }
  });
  writeStorage(STORAGE_KEYS.sheets, sheets);
}

function showLogin() {
  elements.loadingCard.classList.add("hidden");
  elements.loginCard.classList.remove("hidden");
  elements.appCard.classList.add("hidden");
  elements.sessionSummary.classList.add("hidden");

  const existingSession = readStorage(STORAGE_KEYS.session);
  if (!existingSession?.userId) {
    return;
  }

  const user = getUsers().find((item) => item.id === existingSession.userId);
  if (user) {
    loginUser(user, existingSession.selectedSheetUserId || inferDefaultSheetUserId(user));
  }
}

function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(elements.loginForm);
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");

  const user = getUsers().find((item) => item.login === login && item.password === password);
  if (!user) {
    alert("Login ou senha inválidos.");
    return;
  }

  loginUser(user, inferDefaultSheetUserId(user));
  elements.loginForm.reset();
}

function handleLogout() {
  writeStorage(STORAGE_KEYS.session, null);
  location.reload();
}

function openRegisterDialog(mode) {
  state.registerMode = mode;
  elements.registerForm.reset();
  elements.registerDialog.showModal();
}

function handleRegister(event) {
  event.preventDefault();

  const formData = new FormData(elements.registerForm);
  const displayName = String(formData.get("displayName") || "").trim();
  const login = String(formData.get("login") || "").trim();
  const password = String(formData.get("password") || "");

  if (displayName.length < 3) {
    alert("O nome do jogador deve ter ao menos 3 caracteres.");
    return;
  }

  if (!/^[A-Za-z0-9._-]{3,30}$/.test(login)) {
    alert("O login deve ter entre 3 e 30 caracteres e usar apenas letras, números, ponto, underscore ou hífen.");
    return;
  }

  if (password.length < 6) {
    alert("A senha deve ter ao menos 6 caracteres.");
    return;
  }

  const users = getUsers();
  if (users.some((user) => user.login.toLowerCase() === login.toLowerCase())) {
    alert("Já existe um usuário com esse login.");
    return;
  }

  const newUser = {
    id: crypto.randomUUID(),
    displayName,
    login,
    password,
    role: "player",
  };

  users.push(newUser);
  writeStorage(STORAGE_KEYS.users, users);

  const sheets = getSheets();
  sheets[newUser.id] = createDefaultSheet(newUser, users.length);
  writeStorage(STORAGE_KEYS.sheets, sheets);

  elements.registerDialog.close();

  if (state.registerMode === "gm" && state.session?.role === "gm") {
    state.selectedSheetUserId = newUser.id;
    populateSheetSelector();
    rebuildDynamicSections();
    hydrateForm();
    renderPortrait();
    recalculateDerivedFields();
    renderSessionSummary();
    queueStatus("Salvo", "saved");
    return;
  }

  loginUser(newUser, newUser.id);
}

function loginUser(user, selectedSheetUserId) {
  state.session = user;
  state.selectedSheetUserId = selectedSheetUserId;

  writeStorage(STORAGE_KEYS.session, {
    userId: user.id,
    selectedSheetUserId,
  });

  elements.loginCard.classList.add("hidden");
  elements.appCard.classList.remove("hidden");
  renderApp();
}

function renderApp() {
  renderSessionSummary();
  toggleGmTools();
  populateSheetSelector();
  rebuildDynamicSections();
  hydrateForm();
  renderPortrait();
  renderInventory();
  renderNotes();
  renderHistory();
  recalculateDerivedFields();
  updateSaveStatus("Salvo", "saved");
}

function renderSessionSummary() {
  const activeSheet = getActiveSheet();
  const roleLabel = state.session.role === "gm" ? "Mestre" : "Jogador";
  const currentDate = new Date().toLocaleDateString("pt-BR");

  elements.sessionSummary.innerHTML = `
    <strong>${escapeHtml(state.session.displayName)}</strong>
    <div>${roleLabel}</div>
    <div>${escapeHtml(activeSheet?.nome || "Sem nome")}</div>
    <div>${currentDate}</div>
  `;
  elements.sessionSummary.classList.remove("hidden");
}

function toggleGmTools() {
  elements.gmTools.classList.toggle("hidden", state.session.role !== "gm");
}

function populateSheetSelector() {
  if (state.session.role !== "gm") {
    return;
  }

  const sheets = getSheets();
  const players = getUsers().filter((user) => user.role === "player");

  elements.sheetSelector.innerHTML = "";
  players.forEach((player) => {
    const option = document.createElement("option");
    option.value = player.id;
    option.textContent = sheets[player.id]?.nome || player.displayName;
    elements.sheetSelector.appendChild(option);
  });

  if (!state.selectedSheetUserId && players[0]) {
    state.selectedSheetUserId = players[0].id;
  }

  elements.sheetSelector.value = state.selectedSheetUserId || "";
}

function handleSheetSelection(event) {
  state.selectedSheetUserId = event.target.value || null;
  persistSessionSelection();
  rebuildDynamicSections();
  hydrateForm();
  renderPortrait();
  renderInventory();
  renderNotes();
  renderHistory();
  recalculateDerivedFields();
  renderSessionSummary();
  updateSaveStatus("Salvo", "saved");
}

function rebuildDynamicSections() {
  ensureDynamicPlaceholders();
  buildUpgrades();
  buildSkillsTable();
  bindFieldEvents(elements.upgradesGrid);
  bindFieldEvents(elements.skillsTable);
  bindDynamicRowEvents(elements.upgradesGrid);
  bindDynamicRowEvents(elements.skillsTable);
}

function hydrateForm() {
  const sheet = getActiveSheet();
  const fields = document.querySelectorAll("[data-field]");

  if (!sheet) {
    fields.forEach((field) => {
      field.value = "";
    });
    state.lastSnapshotVersion = null;
    return;
  }

  fields.forEach((field) => {
    field.value = resolveFieldValue(sheet, field.dataset.field);
    field.classList.remove("saving", "saved");
  });

  state.lastSnapshotVersion = sheet.version;
}

function handleFieldInput(field, isNumeric) {
  if (!hasActiveSheet()) {
    updateSaveStatus("Salvo", "saved");
    return;
  }

  if (isNumeric) {
    field.value = sanitizeIntegerInput(field.value);
  }

  const key = field.dataset.field;
  syncDynamicFieldToSheet(key, field.value);
  recalculateDerivedFields();

  state.pendingChanges.add(key);
  state.dirtyFields.add(key);
  state.dirtyMap.set(key, field.value);

  field.classList.add("saving");
  field.classList.remove("saved");

  updateSaveStatus("Salvando", "saving");
  scheduleAutosave();
}

function scheduleAutosave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    flushPendingChanges();
  }, AUTOSAVE_DELAY);
}

function flushPendingChanges() {
  if (!state.pendingChanges.size || !hasActiveSheet()) {
    return;
  }

  const fieldsToSave = Array.from(state.pendingChanges);
  const sheets = getSheets();
  const sheet = getActiveSheet();

  updateSaveStatus("Salvando", "saving");

  fieldsToSave.forEach((key) => {
    if (isDynamicField(key)) {
      return;
    }
    sheet[key] = state.dirtyMap.get(key) ?? "";
  });

  persistDerivedValues(sheet);
  persistDynamicCollections(sheet);
  sheet.updatedAt = new Date().toISOString();
  sheet.version = (sheet.version || 0) + 1;

  sheets[state.selectedSheetUserId] = sheet;
  writeStorage(STORAGE_KEYS.sheets, sheets);

  state.lastSnapshotVersion = sheet.version;
  state.pendingChanges.clear();
  state.dirtyFields.clear();
  state.dirtyMap.clear();

  fieldsToSave.forEach((key) => {
    const field = document.querySelector(`[data-field="${key}"]`);
    if (!field) {
      return;
    }

    field.classList.remove("saving");
    field.classList.add("saved");
    setTimeout(() => field.classList.remove("saved"), FIELD_SAVED);
  });

  persistSessionSelection();
  renderSessionSummary();
  queueStatus("Salvo", "saved");
}

function openInventoryDrawer() {
  if (!hasActiveSheet()) {
    return;
  }

  closeNotesDrawer();
  closeHistoryDrawer();
  renderInventory();
  elements.inventoryDrawer.classList.add("is-open");
  elements.inventoryDrawer.setAttribute("aria-hidden", "false");
}

function closeInventoryDrawer() {
  elements.inventoryDrawer.classList.remove("is-open");
  elements.inventoryDrawer.setAttribute("aria-hidden", "true");
}

function openNotesDrawer() {
  if (!hasActiveSheet()) {
    return;
  }

  closeInventoryDrawer();
  closeHistoryDrawer();
  renderNotes();
  elements.notesDrawer.classList.add("is-open");
  elements.notesDrawer.setAttribute("aria-hidden", "false");
}

function closeNotesDrawer() {
  elements.notesDrawer.classList.remove("is-open");
  elements.notesDrawer.setAttribute("aria-hidden", "true");
}

function openHistoryDrawer() {
  if (!hasActiveSheet()) {
    return;
  }

  closeInventoryDrawer();
  closeNotesDrawer();
  renderHistory();
  elements.historyDrawer.classList.add("is-open");
  elements.historyDrawer.setAttribute("aria-hidden", "false");
}

function closeHistoryDrawer() {
  elements.historyDrawer.classList.remove("is-open");
  elements.historyDrawer.setAttribute("aria-hidden", "true");
}

function renderInventory() {
  const items = getActiveSheet()?.inventoryItems || [];
  elements.inventoryRows.innerHTML = "";

  items.forEach((item) => {
    const row = document.createElement("div");
    row.className = "inventory-row";
    row.dataset.inventoryRowId = item.id;
    row.innerHTML = `
      <input type="text" value="${escapeAttribute(item.item || "")}" data-inventory-id="${item.id}" data-inventory-field="item" aria-label="Item">
      <input type="text" inputmode="numeric" value="${escapeAttribute(item.quantidade || "")}" data-inventory-id="${item.id}" data-inventory-field="quantidade" aria-label="Quantidade">
      <input type="text" inputmode="numeric" value="${escapeAttribute(item.peso || "")}" data-inventory-id="${item.id}" data-inventory-field="peso" aria-label="Peso">
      <input type="text" inputmode="numeric" value="${escapeAttribute(item.valor || "")}" data-inventory-id="${item.id}" data-inventory-field="valor" aria-label="Valor">
    `;
    elements.inventoryRows.appendChild(row);
  });

  bindInventoryEvents();
}

function renderNotes() {
  elements.notesTextarea.value = getActiveSheet()?.notesText || "";
}

function renderHistory() {
  elements.historyTextarea.value = getActiveSheet()?.historyText || "";
}

function bindInventoryEvents() {
  elements.inventoryRows.querySelectorAll(".inventory-row").forEach((row) => {
    if (row.dataset.rowBound === "true") {
      return;
    }

    row.dataset.rowBound = "true";
    row.addEventListener("focusout", handleInventoryRowFocusOut);
  });

  elements.inventoryRows.querySelectorAll("[data-inventory-id]").forEach((field) => {
    if (field.dataset.bound === "true") {
      return;
    }

    field.dataset.bound = "true";
    const isNumeric = field.hasAttribute("inputmode");
    field.addEventListener("input", () => handleInventoryInput(field, isNumeric));
  });
}

function handleInventoryRowFocusOut(event) {
  const row = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (nextTarget && row.contains(nextTarget)) {
    return;
  }

  const hasContent = Array.from(row.querySelectorAll("[data-inventory-id]"))
    .some((field) => String(field.value || "").trim() !== "");

  if (hasContent) {
    return;
  }

  removeInventoryItemRow(row.dataset.inventoryRowId);
}

function handleInventoryInput(field, isNumeric) {
  if (isNumeric) {
    field.value = sanitizeIntegerInput(field.value);
  }

  updateSaveStatus("Salvando", "saving");

  mutateActiveSheet((sheet) => {
    sheet.inventoryItems = sheet.inventoryItems || [];
    const item = sheet.inventoryItems.find((entry) => entry.id === field.dataset.inventoryId);
    if (!item) {
      return;
    }

    item[field.dataset.inventoryField] = field.value;
    sheet.updatedAt = new Date().toISOString();
    sheet.version = (sheet.version || 0) + 1;
  });

  queueStatus("Salvo", "saved");
}

function addInventoryItemRow() {
  if (!hasActiveSheet()) {
    return;
  }

  const itemId = crypto.randomUUID();
  mutateActiveSheet((sheet) => {
    sheet.inventoryItems = sheet.inventoryItems || [];
    sheet.inventoryItems.push({
      id: itemId,
      item: "",
      quantidade: "",
      peso: "",
      valor: "",
    });
    sheet.updatedAt = new Date().toISOString();
    sheet.version = (sheet.version || 0) + 1;
  });

  renderInventory();
  openInventoryDrawer();

  const newField = elements.inventoryRows.querySelector(`[data-inventory-id="${itemId}"][data-inventory-field="item"]`);
  if (newField) {
    newField.focus();
  }
}

function removeInventoryItemRow(itemId) {
  mutateActiveSheet((sheet) => {
    sheet.inventoryItems = (sheet.inventoryItems || []).filter((entry) => entry.id !== itemId);
    sheet.updatedAt = new Date().toISOString();
    sheet.version = (sheet.version || 0) + 1;
  });

  renderInventory();
  queueStatus("Salvo", "saved");
}

function handleNotesInput() {
  if (!hasActiveSheet()) {
    return;
  }

  updateSaveStatus("Salvando", "saving");

  mutateActiveSheet((sheet) => {
    sheet.notesText = elements.notesTextarea.value;
    sheet.updatedAt = new Date().toISOString();
    sheet.version = (sheet.version || 0) + 1;
  });

  queueStatus("Salvo", "saved");
}

function handleHistoryInput() {
  if (!hasActiveSheet()) {
    return;
  }

  updateSaveStatus("Salvando", "saving");

  mutateActiveSheet((sheet) => {
    sheet.historyText = elements.historyTextarea.value;
    sheet.updatedAt = new Date().toISOString();
    sheet.version = (sheet.version || 0) + 1;
  });

  queueStatus("Salvo", "saved");
}

function persistDerivedValues(sheet) {
  attributeDefinitions.forEach(({ key }) => {
    sheet[`${key}Teste`] = getFieldValue(`${key}Teste`);
  });

  sheet.atributosTotal = getFieldValue("atributosTotal");

  for (let index = 1; index <= SKILL_BASE_COUNT; index += 1) {
    sheet[`pericia${index}Teste`] = getFieldValue(`pericia${index}Teste`);
  }

  (sheet.dynamicSkills || []).forEach((row) => {
    row.teste = getFieldValue(`dynamicSkill:${row.id}:teste`);
  });
}

function persistDynamicCollections(sheet) {
  sheet.dynamicUpgrades = [...(sheet.dynamicUpgrades || [])];
  sheet.dynamicSkills = [...(sheet.dynamicSkills || [])];
}

function recalculateDerivedFields() {
  recalculateAttributes();
  recalculateSkills();
}

function recalculateAttributes() {
  let total = 0;

  attributeDefinitions.forEach(({ key }) => {
    const value = parseInt(getFieldValue(`${key}Valor`) || "0", 10) || 0;
    const modifier = parseInt(getFieldValue(`${key}Mod`) || "0", 10) || 0;
    const test = (value * 4) - modifier;

    setFieldValue(`${key}Teste`, String(test));
    total += value;
  });

  setFieldValue("atributosTotal", String(total));
}

function recalculateSkills() {
  for (let index = 1; index <= SKILL_BASE_COUNT; index += 1) {
    recalculateSkillFields(`pericia${index}Atributo`, `pericia${index}Valor`, `pericia${index}Teste`);
  }

  const dynamicSkills = getActiveSheet()?.dynamicSkills || [];
  dynamicSkills.forEach((row) => {
    recalculateSkillFields(
      `dynamicSkill:${row.id}:atributo`,
      `dynamicSkill:${row.id}:valor`,
      `dynamicSkill:${row.id}:teste`,
    );
  });
}

function recalculateSkillFields(attributeField, valueField, testField) {
  const attributeRaw = getFieldValue(attributeField);
  const valueRaw = getFieldValue(valueField);

  if (attributeRaw === "" && valueRaw === "") {
    setFieldValue(testField, "");
    return;
  }

  const attribute = parseInt(attributeRaw || "0", 10) || 0;
  const value = parseInt(valueRaw || "0", 10) || 0;
  setFieldValue(testField, String(attribute + value));
}

function addDynamicRow(type) {
  if (!hasActiveSheet()) {
    updateSaveStatus("Salvo", "saved");
    return;
  }

  const rowId = crypto.randomUUID();
  mutateActiveSheet((sheet) => {
    if (type === "upgrade") {
      sheet.dynamicUpgrades = sheet.dynamicUpgrades || [];
      sheet.dynamicUpgrades.push({ id: rowId, nome: "", valor: "", isPlaceholder: false });
    } else {
      sheet.dynamicSkills = sheet.dynamicSkills || [];
      sheet.dynamicSkills.push({ id: rowId, nome: "", atributo: "", valor: "", teste: "", isPlaceholder: false });
    }
  });

  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
  focusDynamicRow(type, rowId);
}

function focusDynamicRow(type, rowId) {
  const selector = type === "upgrade"
    ? `[data-field="dynamicUpgrade:${rowId}:nome"]`
    : `[data-field="dynamicSkill:${rowId}:nome"]`;
  const field = document.querySelector(selector);
  if (field) {
    field.focus();
  }
}

function handleDynamicRowFocusOut(event) {
  const row = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (nextTarget && row.contains(nextTarget)) {
    return;
  }

  const hasContent = Array.from(row.querySelectorAll("[data-field]:not([readonly])"))
    .some((field) => String(field.value || "").trim() !== "");

  if (hasContent) {
    convertPlaceholderRowIfNeeded(row);
    return;
  }

  if (row.dataset.placeholder === "true") {
    return;
  }

  removeDynamicRow(row);
}

function removeDynamicRow(row) {
  mutateActiveSheet((sheet) => {
    if (row.dataset.dynamicType === "upgrade") {
      sheet.dynamicUpgrades = (sheet.dynamicUpgrades || []).filter((entry) => entry.id !== row.dataset.rowId);
      return;
    }

    sheet.dynamicSkills = (sheet.dynamicSkills || []).filter((entry) => entry.id !== row.dataset.rowId);
  });

  clearDynamicFieldState(row.dataset.dynamicType, row.dataset.rowId);
  ensureDynamicPlaceholders();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
}

function clearDynamicFieldState(type, rowId) {
  const fieldNames = type === "upgrade"
    ? [
        `dynamicUpgrade:${rowId}:nome`,
        `dynamicUpgrade:${rowId}:valor`,
      ]
    : [
        `dynamicSkill:${rowId}:nome`,
        `dynamicSkill:${rowId}:atributo`,
        `dynamicSkill:${rowId}:valor`,
        `dynamicSkill:${rowId}:teste`,
      ];

  fieldNames.forEach((key) => {
    state.pendingChanges.delete(key);
    state.dirtyFields.delete(key);
    state.dirtyMap.delete(key);
  });
}

function renderPortrait() {
  const sheet = getActiveSheet();
  const portrait = sheet?.portraitDataUrl || "";

  elements.portraitImage.src = portrait;
  elements.portraitFrame.classList.toggle("has-image", Boolean(portrait));
}

function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!hasActiveSheet()) {
    alert("Crie ou selecione uma ficha antes de enviar imagem.");
    elements.imageInput.value = "";
    return;
  }

  const allowedTypes = ["image/png", "image/jpeg", "image/webp"];
  if (!allowedTypes.includes(file.type)) {
    alert("Formato inválido. Use PNG, JPG/JPEG ou WEBP.");
    elements.imageInput.value = "";
    return;
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("A imagem deve ter no máximo 2 MB.");
    elements.imageInput.value = "";
    return;
  }

  updateSaveStatus("Enviando imagem...", "saving");

  const reader = new FileReader();
  reader.onload = () => {
    const sheets = getSheets();
    const sheet = getActiveSheet();
    sheet.portraitDataUrl = String(reader.result || "");
    sheet.updatedAt = new Date().toISOString();
    sheet.version = (sheet.version || 0) + 1;
    sheets[state.selectedSheetUserId] = sheet;
    writeStorage(STORAGE_KEYS.sheets, sheets);

    state.lastSnapshotVersion = sheet.version;
    renderPortrait();
    queueStatus("Salvo", "saved");
    renderSessionSummary();
    elements.imageInput.value = "";
  };

  reader.onerror = () => {
    updateSaveStatus("Salvo", "saved");
    alert("Erro ao salvar imagem.");
    elements.imageInput.value = "";
  };

  reader.readAsDataURL(file);
}

function refreshIfNeeded() {
  if (!state.session || !state.selectedSheetUserId || state.refreshing || state.pendingChanges.size || state.dirtyFields.size) {
    return;
  }

  const latestSheet = getSheets()[state.selectedSheetUserId];
  if (!latestSheet) {
    updateSaveStatus("Salvo", "saved");
    return;
  }

  if (latestSheet.version === state.lastSnapshotVersion) {
    return;
  }

  state.refreshing = true;
  rebuildDynamicSections();
  hydrateForm();
  renderPortrait();
  recalculateDerivedFields();
  renderSessionSummary();
  state.refreshing = false;
}

function updateSaveStatus(text, variant = "") {
  elements.saveStatus.textContent = text;
  elements.saveStatus.classList.remove("is-saving", "is-saved");

  if (variant === "saving") {
    elements.saveStatus.classList.add("is-saving");
  }

  if (variant === "saved") {
    elements.saveStatus.classList.add("is-saved");
  }
}

function queueStatus(text, variant) {
  clearTimeout(state.saveResetTimer);
  updateSaveStatus(text, variant);

  if (variant === "saved") {
    state.saveResetTimer = setTimeout(() => {
      updateSaveStatus("Salvo", "saved");
    }, SAVE_IDLE);
  }
}

function persistSessionSelection() {
  if (!state.session) {
    return;
  }

  writeStorage(STORAGE_KEYS.session, {
    userId: state.session.id,
    selectedSheetUserId: state.selectedSheetUserId,
  });
}

function createDefaultSheet(user, index) {
  const baseAttributes = [12, 11, 13, 10, 14, 9, 8, 7];
  const baseModifiers = [3, 1, 2, 0, 4, 1, 0, 2];

  const sheet = {
    ownerId: user.id,
    portraitDataUrl: "",
    nome: `${user.displayName} ${index > 1 ? "II" : ""}`.trim(),
    classeSocialProfissao: "Mercenário urbano",
    nascimento: "Outono de 1998",
    local: "Distrito de Ferro",
    sexo: "Não definido",
    altura: "1,78 m",
    peso: "78 kg",
    idadeAparente: "28",
    idadeReal: "32",
    idiomas: "Português, Inglês",
    religiao: "Culto das Cinzas",
    nivel: "3",
    xp: "1200",
    ip: "4",
    pv: "26",
    dano: "3",
    pvAtual: "23",
    periciasPontos: "6",
    notesText: "",
    historyText: "",
    inventoryItems: [],
    dynamicUpgrades: [
      { id: crypto.randomUUID(), nome: "", valor: "", isPlaceholder: true },
    ],
    dynamicSkills: [
      { id: crypto.randomUUID(), nome: "", atributo: "", valor: "", teste: "", isPlaceholder: true },
    ],
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  attributeDefinitions.forEach(({ key }, itemIndex) => {
    sheet[`${key}Valor`] = String(baseAttributes[itemIndex]);
    sheet[`${key}Mod`] = String(baseModifiers[itemIndex]);
    sheet[`${key}Teste`] = String((baseAttributes[itemIndex] * 4) - baseModifiers[itemIndex]);
  });

  sheet.atributosTotal = String(baseAttributes.reduce((sum, value) => sum + value, 0));

  return sheet;
}

function getUsers() {
  return readStorage(STORAGE_KEYS.users) || [];
}

function getSheets() {
  return readStorage(STORAGE_KEYS.sheets) || {};
}

function getActiveSheet() {
  if (!state.selectedSheetUserId) {
    return null;
  }

  return getSheets()[state.selectedSheetUserId] || null;
}

function hasActiveSheet() {
  return Boolean(getActiveSheet());
}

function inferDefaultSheetUserId(user) {
  if (user.role === "gm") {
    const player = getUsers().find((item) => item.role === "player");
    return player?.id || null;
  }

  return user.id;
}

function readStorage(key) {
  const raw = localStorage.getItem(key);
  return raw ? JSON.parse(raw) : null;
}

function writeStorage(key, value) {
  if (value === null) {
    localStorage.removeItem(key);
    return;
  }

  localStorage.setItem(key, JSON.stringify(value));
}

function sanitizeIntegerInput(value) {
  return value.replace(/[^\d-]/g, "").replace(/(?!^)-/g, "");
}

function getFieldValue(fieldName) {
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  return field ? field.value : "";
}

function setFieldValue(fieldName, value) {
  const field = document.querySelector(`[data-field="${fieldName}"]`);
  if (field) {
    field.value = value;
  }
}

function resolveFieldValue(sheet, key) {
  if (key.startsWith("dynamicUpgrade:")) {
    const [, rowId, prop] = key.split(":");
    const row = (sheet.dynamicUpgrades || []).find((entry) => entry.id === rowId);
    return row?.[prop] ?? "";
  }

  if (key.startsWith("dynamicSkill:")) {
    const [, rowId, prop] = key.split(":");
    const row = (sheet.dynamicSkills || []).find((entry) => entry.id === rowId);
    return row?.[prop] ?? "";
  }

  return sheet[key] ?? "";
}

function syncDynamicFieldToSheet(key, value) {
  if (!isDynamicField(key)) {
    return;
  }

  mutateActiveSheet((sheet) => {
    const [, rowId, prop] = key.split(":");
    const collection = key.startsWith("dynamicUpgrade:") ? sheet.dynamicUpgrades : sheet.dynamicSkills;
    const row = (collection || []).find((entry) => entry.id === rowId);
    if (!row) {
      return;
    }

    row[prop] = value;

    if (String(value).trim() !== "" && row.isPlaceholder) {
      row.isPlaceholder = false;
      const rowElement = document.querySelector(`.dynamic-row[data-row-id="${rowId}"]`);
      if (rowElement) {
        rowElement.dataset.placeholder = "false";
      }
    }

  });
}

function isDynamicField(key) {
  return key.startsWith("dynamicUpgrade:") || key.startsWith("dynamicSkill:");
}

function mutateActiveSheet(mutator) {
  if (!state.selectedSheetUserId) {
    return;
  }

  const sheets = getSheets();
  const sheet = sheets[state.selectedSheetUserId];
  if (!sheet) {
    return;
  }

  mutator(sheet);
  sheets[state.selectedSheetUserId] = sheet;
  writeStorage(STORAGE_KEYS.sheets, sheets);
}

function ensureDynamicPlaceholders() {
  if (!state.selectedSheetUserId) {
    return;
  }

  mutateActiveSheet((sheet) => {
    sheet.dynamicUpgrades = normalizeDynamicCollection(
      sheet.dynamicUpgrades || [],
      () => ({ id: crypto.randomUUID(), nome: "", valor: "", isPlaceholder: true }),
    );

    sheet.dynamicSkills = normalizeDynamicCollection(
      sheet.dynamicSkills || [],
      () => ({ id: crypto.randomUUID(), nome: "", atributo: "", valor: "", teste: "", isPlaceholder: true }),
    );
  });
}

function normalizeDynamicCollection(collection, createPlaceholder) {
  const normalized = collection.map((item) => ({ ...item }));
  if (normalized.length === 0) {
    normalized.push(createPlaceholder());
    return normalized;
  }

  const placeholderIndexes = normalized
    .map((item, index) => item.isPlaceholder ? index : -1)
    .filter((index) => index >= 0);

  if (placeholderIndexes.length <= 1) {
    return normalized;
  }

  const firstPlaceholder = placeholderIndexes[0];
  return normalized.filter((item, index) => !item.isPlaceholder || index === firstPlaceholder);
}

function getDynamicRowMeta(type, rowId) {
  const sheet = getActiveSheet();
  if (!sheet) {
    return null;
  }

  const collection = type === "upgrade" ? (sheet.dynamicUpgrades || []) : (sheet.dynamicSkills || []);
  return collection.find((item) => item.id === rowId) || null;
}

function convertPlaceholderRowIfNeeded(row) {
  if (row.dataset.placeholder !== "true") {
    return;
  }

  mutateActiveSheet((sheet) => {
    const collection = row.dataset.dynamicType === "upgrade" ? (sheet.dynamicUpgrades || []) : (sheet.dynamicSkills || []);
    const item = collection.find((entry) => entry.id === row.dataset.rowId);
    if (item) {
      item.isPlaceholder = false;
    }
  });

  row.dataset.placeholder = "false";
  ensureDynamicPlaceholders();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
}

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
