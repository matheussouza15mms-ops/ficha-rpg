const STORAGE_KEYS = {
  users: "rpg-users",
  sheets: "rpg-sheets",
  session: "rpg-session",
};

const SAVE_IDLE = 1200;
const FIELD_SAVED = 800;
const AUTOSAVE_DELAY = 1800;
const REFRESH_INTERVAL = 12000;

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

const defaultSkillNames = [
  "Acrobacia",
  "Armas Brancas",
  "Armas de Fogo",
  "Atletismo",
  "Ciências",
  "Diplomacia",
  "Enganação",
  "Furtividade",
  "História",
  "Intimidação",
  "Intuição",
  "Investigação",
  "Ladinagem",
  "Medicina",
  "Ocultismo",
  "Pilotagem",
  "Sobrevivência",
  "Tecnologia",
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

function buildSkillsTable() {
  const table = document.getElementById("skillsTable");
  table.innerHTML = "";

  const header = document.createElement("div");
  header.className = "skills-row skills-header";
  header.innerHTML = `
    <span>Perícia</span>
    <span>Atributo</span>
    <span>Valor</span>
    <span>Teste %</span>
  `;
  table.appendChild(header);

  for (let index = 1; index <= 18; index += 1) {
    const row = document.createElement("div");
    row.className = "skills-row";
    row.innerHTML = `
      <label class="skill-cell skill-name">
        <input type="text" data-field="pericia${index}Nome" aria-label="Nome da perícia ${index}">
      </label>
      <label class="skill-cell skill-number">
        <span>Atributo</span>
        <input type="text" inputmode="numeric" data-field="pericia${index}Atributo">
      </label>
      <label class="skill-cell skill-number">
        <span>Valor</span>
        <input type="text" inputmode="numeric" data-field="pericia${index}Valor">
      </label>
      <label class="skill-cell skill-number">
        <span>Teste %</span>
        <input type="text" data-field="pericia${index}Teste" readonly>
      </label>
    `;
    table.appendChild(row);
  }
}

function buildUpgrades() {
  const container = document.getElementById("upgradesGrid");
  container.innerHTML = "";

  for (let index = 1; index <= 11; index += 1) {
    const row = document.createElement("div");
    row.className = "upgrade-row";
    row.innerHTML = `
      <input type="text" data-field="aprimoramento${index}Nome" aria-label="Nome do aprimoramento ${index}">
      <input type="text" inputmode="numeric" data-field="aprimoramento${index}Valor" aria-label="Valor do aprimoramento ${index}">
    `;
    container.appendChild(row);
  }
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

  document.querySelectorAll("[data-field]").forEach((field) => {
    const isNumeric = field.hasAttribute("inputmode");
    field.addEventListener("input", () => handleFieldInput(field, isNumeric));
    field.addEventListener("blur", flushPendingChanges);
  });

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

function seedStorage() {
  if (!readStorage(STORAGE_KEYS.users)) {
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
}

function showLogin() {
  elements.loadingCard.classList.add("hidden");
  elements.loginCard.classList.remove("hidden");
  elements.appCard.classList.add("hidden");
  elements.sessionSummary.classList.add("hidden");

  const existingSession = readStorage(STORAGE_KEYS.session);
  if (existingSession?.userId) {
    const user = getUsers().find((item) => item.id === existingSession.userId);
    if (user) {
      loginUser(user, existingSession.selectedSheetUserId || inferDefaultSheetUserId(user));
    }
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
    populateSheetSelector();
    state.selectedSheetUserId = newUser.id;
    elements.sheetSelector.value = newUser.id;
    renderApp();
    queueStatus("Salvo no Sheets", "saved");
  } else {
    loginUser(newUser, newUser.id);
  }
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
  hydrateForm();
  renderPortrait();
  recalculateDerivedFields();
  updateSaveStatus("Pronto");
}

function renderSessionSummary() {
  const activeSheet = getActiveSheet();
  const roleLabel = state.session.role === "gm" ? "Mestre" : "Jogador";

  elements.sessionSummary.innerHTML = `
    <strong>${escapeHtml(state.session.displayName)}</strong>
    <div>${escapeHtml(state.session.login)} - ${roleLabel}</div>
    <div>Ficha atual: ${escapeHtml(activeSheet?.nome || "Sem nome")}</div>
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
  hydrateForm();
  renderPortrait();
  recalculateDerivedFields();
  renderSessionSummary();
  updateSaveStatus(state.selectedSheetUserId ? "Pronto" : "Crie ou selecione uma ficha");
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
    const key = field.dataset.field;
    field.value = sheet[key] ?? "";
    field.classList.remove("saving", "saved");
  });

  state.lastSnapshotVersion = sheet.version;
}

function handleFieldInput(field, isNumeric) {
  if (!hasActiveSheet()) {
    updateSaveStatus("Crie ou selecione uma ficha");
    return;
  }

  if (isNumeric) {
    field.value = sanitizeIntegerInput(field.value);
  }

  recalculateDerivedFields();

  const key = field.dataset.field;
  state.pendingChanges.add(key);
  state.dirtyFields.add(key);
  state.dirtyMap.set(key, field.value);
  field.classList.add("saving");
  field.classList.remove("saved");

  updateSaveStatus("Alteracoes locais");
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

  updateSaveStatus("Salvando...", "saving");

  fieldsToSave.forEach((key) => {
    sheet[key] = state.dirtyMap.get(key) ?? "";
  });

  persistDerivedValues(sheet);
  sheet.updatedAt = new Date().toISOString();
  sheet.version = (sheet.version || 0) + 1;
  sheets[state.selectedSheetUserId] = sheet;
  writeStorage(STORAGE_KEYS.sheets, sheets);

  state.lastSnapshotVersion = sheet.version;
  state.pendingChanges.clear();
  state.dirtyMap.clear();

  fieldsToSave.forEach((key) => {
    state.dirtyFields.delete(key);
    const field = document.querySelector(`[data-field="${key}"]`);
    if (field) {
      field.classList.remove("saving");
      field.classList.add("saved");
      setTimeout(() => field.classList.remove("saved"), FIELD_SAVED);
    }
  });

  persistSessionSelection();
  renderSessionSummary();
  queueStatus("Salvo no Sheets", "saved");
}

function persistDerivedValues(sheet) {
  attributeDefinitions.forEach(({ key }) => {
    sheet[`${key}Teste`] = getFieldValue(`${key}Teste`);
  });

  sheet.atributosTotal = getFieldValue("atributosTotal");

  for (let index = 1; index <= 18; index += 1) {
    sheet[`pericia${index}Teste`] = getFieldValue(`pericia${index}Teste`);
  }
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
  for (let index = 1; index <= 18; index += 1) {
    const attributeRaw = getFieldValue(`pericia${index}Atributo`);
    const valueRaw = getFieldValue(`pericia${index}Valor`);

    if (attributeRaw === "" && valueRaw === "") {
      setFieldValue(`pericia${index}Teste`, "");
      continue;
    }

    const attribute = parseInt(attributeRaw || "0", 10) || 0;
    const value = parseInt(valueRaw || "0", 10) || 0;
    setFieldValue(`pericia${index}Teste`, String(attribute + value));
  }
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
    alert("Formato invalido. Use PNG, JPG/JPEG ou WEBP.");
    elements.imageInput.value = "";
    return;
  }

  const maxSize = 2 * 1024 * 1024;
  if (file.size > maxSize) {
    alert("A imagem deve ter no maximo 2 MB.");
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
    queueStatus("Imagem salva", "saved");
    renderSessionSummary();
    elements.imageInput.value = "";
  };

  reader.onerror = () => {
    updateSaveStatus("Erro ao salvar");
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
    updateSaveStatus("Entre novamente");
    return;
  }

  if (latestSheet.version === state.lastSnapshotVersion) {
    return;
  }

  state.refreshing = true;
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
      updateSaveStatus("Pronto");
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
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  const defaultUpgrades = [
    ["Reflexos aumentados", "2"],
    ["Visão espectral", "1"],
    ["Couro blindado", "3"],
    ["Memória eidética", "1"],
    ["Pulmão filtrante", "2"],
    ["Sangue frio", "1"],
    ["Rede de contatos", "2"],
    ["Passo fantasma", "1"],
    ["Mira precisa", "2"],
    ["Leitura tática", "1"],
    ["Foco de combate", "1"],
  ];

  defaultUpgrades.forEach(([name, value], itemIndex) => {
    const indexLabel = itemIndex + 1;
    sheet[`aprimoramento${indexLabel}Nome`] = name;
    sheet[`aprimoramento${indexLabel}Valor`] = value;
  });

  attributeDefinitions.forEach(({ key }, itemIndex) => {
    sheet[`${key}Valor`] = String(baseAttributes[itemIndex]);
    sheet[`${key}Mod`] = String(baseModifiers[itemIndex]);
    sheet[`${key}Teste`] = String((baseAttributes[itemIndex] * 4) - baseModifiers[itemIndex]);
  });

  sheet.atributosTotal = String(baseAttributes.reduce((sum, value) => sum + value, 0));

  defaultSkillNames.forEach((name, itemIndex) => {
    const indexLabel = itemIndex + 1;
    const attribute = (itemIndex % 5) + 2;
    const value = (itemIndex % 4) + 1;

    sheet[`pericia${indexLabel}Nome`] = name;
    sheet[`pericia${indexLabel}Atributo`] = String(attribute);
    sheet[`pericia${indexLabel}Valor`] = String(value);
    sheet[`pericia${indexLabel}Teste`] = String(attribute + value);
  });

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

  const sheets = getSheets();
  return sheets[state.selectedSheetUserId] || null;
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

function escapeHtml(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
