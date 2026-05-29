import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  inMemoryPersistence,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-auth.js";
import {
  initializeFirestore,
  getFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  collection,
  query,
  where,
  doc,
  getDoc,
  getDocs,
  setDoc,
  onSnapshot,
  deleteDoc,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-firestore.js";

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyDbdReMu6OxG3HMoLabFeWyaTIiWAoSehA",
  authDomain: "ficha-rpg-d528a.firebaseapp.com",
  projectId: "ficha-rpg-d528a",
  storageBucket: "ficha-rpg-d528a.firebasestorage.app",
  messagingSenderId: "769818718720",
  appId: "1:769818718720:web:835bc87b372ceecf545ee5",
};

const MASTER_EMAILS = [
  "matheus.souza15.mms@gmail.com",
];

const MASTER_DEFAULT_PROFILES = {
  "matheus.souza15.mms@gmail.com": {
    displayName: "Matheus",
  },
};

const firebaseApp = initializeFirebaseApp(FIREBASE_CONFIG);

let db;
try {
  db = initializeFirestore(firebaseApp, {
    localCache: persistentLocalCache({
      tabManager: persistentMultipleTabManager(),
    }),
  });
} catch (error) {
  db = getFirestore(firebaseApp);
}

const auth = getAuth(firebaseApp);


const STORAGE_KEYS = {
  selectedCharacterByUser: "rpg-selected-character-by-user",
  rememberedLogin: "rpg-remembered-login",
};

const SAVE_IDLE = 1200;
const AUTOSAVE_DELAY = 1800;

const LEVEL_THRESHOLDS = [null, 0, 5, 15, 30, 50, 80, 120, 180, 250, 400];

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

const ATTR_LABEL_TO_KEY = {
  AGI: "agi", DEX: "dex", PER: "per", CAR: "car",
  INT: "int", WILL: "will", CON: "con", FR: "fr",
};

let UPGRADES_CATALOG = [];

const UPGRADE_BASE_POOL = 5;
const UPGRADE_NEGATIVE_BONUS_CAP = 3;

let SKILLS_CATALOG = [];

let COMBAT_SKILLS_CATALOG = [];

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
  authUser: null,
  profile: null,
  charactersMap: {},
  charactersOrder: [],
  selectedCharacterId: null,
  saveTimer: null,
  saveResetTimer: null,
  pendingChanges: new Set(),
  dirtyMap: new Map(),
  hasUnsavedChanges: false,
  saveInFlight: false,
  uploadInFlight: false,
  unsubscribeCharacters: null,
  lastRenderedSignature: null,
  skillCatalogSelection: null,
  combatSkillCatalogSelection: null,
  upgradeCatalogSelection: null,
  upgradeCatalogTab: "positive",
  kitCatalogSelection: null,
  kits: [],
};

const elements = {};

document.addEventListener("DOMContentLoaded", bootApplication);

async function bootApplication() {
  cacheElements();
  buildStaticForm();
  registerEvents();
  loadKits();
  loadUpgrades();
  loadSkills();
  showLoading("Carregando aplicação...");

  try {
    await setPersistence(auth, inMemoryPersistence);
  } catch (error) {
    console.warn("Não foi possível ajustar a persistência do Auth.", error);
  }

  onAuthStateChanged(auth, async (user) => {
    await handleAuthStateChange(user);
  });
}

function cacheElements() {
  elements.loadingCard = document.getElementById("loadingCard");
  elements.loadingText = elements.loadingCard.querySelector(".loading-text");
  elements.loginCard = document.getElementById("loginCard");
  elements.appCard = document.getElementById("appCard");
  elements.sessionSummary = document.getElementById("sessionSummary");
  elements.loginForm = document.getElementById("loginForm");
  elements.loginInput = document.getElementById("loginInput");
  elements.passwordInput = document.getElementById("passwordInput");
  elements.rememberLogin = document.getElementById("rememberLogin");
  elements.toggleLoginPassword = document.getElementById("toggleLoginPassword");
  elements.registerDialog = document.getElementById("registerDialog");
  elements.registerForm = document.getElementById("registerForm");
  elements.registerPassword = document.getElementById("registerPassword");
  elements.toggleRegisterPassword = document.getElementById("toggleRegisterPassword");
  elements.cancelRegister = document.getElementById("cancelRegister");
  elements.openRegisterFromLogin = document.getElementById("openRegisterFromLogin");
  elements.openRegisterFromGm = document.getElementById("openRegisterFromGm");
  elements.deleteCurrentSheet = document.getElementById("deleteCurrentSheet");
  elements.logoutButton = document.getElementById("logoutButton");
  elements.saveStatus = document.getElementById("saveStatus");
  elements.gmTools = document.getElementById("gmTools");
  elements.sheetSelector = document.getElementById("sheetSelector");
  elements.portraitFrame = document.getElementById("portraitFrame");
  elements.portraitImage = document.getElementById("portraitImage");
  elements.portraitPlaceholder = document.getElementById("portraitPlaceholder");
  elements.removePortraitButton = document.getElementById("removePortraitButton");
  elements.upgradesGrid = document.getElementById("upgradesGrid");
  elements.skillsTable = document.getElementById("skillsTable");
  elements.addUpgradeRow = document.getElementById("addUpgradeRow");
  elements.addSkillRow = document.getElementById("addSkillRow");
  elements.combatSkillsTable = document.getElementById("combatSkillsTable");
  elements.addCombatSkillRow = document.getElementById("addCombatSkillRow");
  elements.combatSkillCatalogDialog = document.getElementById("combatSkillCatalogDialog");
  elements.combatSkillCatalogSearch = document.getElementById("combatSkillCatalogSearch");
  elements.combatSkillCatalogList = document.getElementById("combatSkillCatalogList");
  elements.combatSkillCatalogDetail = document.getElementById("combatSkillCatalogDetail");
  elements.cancelCombatSkillCatalog = document.getElementById("cancelCombatSkillCatalog");
  elements.confirmCombatSkillCatalog = document.getElementById("confirmCombatSkillCatalog");
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
  elements.evolveButton = document.getElementById("evolveButton");
  elements.upgradePointBadge = document.getElementById("upgradePointBadge");
  elements.saveSheetButton = document.getElementById("saveSheetButton");
  elements.attributePointsBadge = document.getElementById("attributePointsBadge");
  elements.attributePointsValue = document.getElementById("attributePointsValue");
  elements.upgradePointsPool = document.getElementById("upgradePointsPool");
  elements.upgradePointsPoolValue = document.getElementById("upgradePointsPoolValue");
  elements.evolutionUpgradePointsBadge = document.getElementById("evolutionUpgradePointsBadge");
  elements.evolutionUpgradePointsValue = document.getElementById("evolutionUpgradePointsValue");
  elements.upgradeCatalogDialog = document.getElementById("upgradeCatalogDialog");
  elements.upgradeCatalogSearch = document.getElementById("upgradeCatalogSearch");
  elements.upgradeCatalogTabBar = document.getElementById("upgradeCatalogTabBar");
  elements.upgradeCatalogList = document.getElementById("upgradeCatalogList");
  elements.upgradeCatalogDetail = document.getElementById("upgradeCatalogDetail");
  elements.cancelUpgradeCatalog = document.getElementById("cancelUpgradeCatalog");
  elements.confirmUpgradeCatalog = document.getElementById("confirmUpgradeCatalog");
  elements.openKitCatalog = document.getElementById("openKitCatalog");
  elements.kitCatalogDialog = document.getElementById("kitCatalogDialog");
  elements.kitCatalogList = document.getElementById("kitCatalogList");
  elements.kitCatalogDetail = document.getElementById("kitCatalogDetail");
  elements.cancelKitCatalog = document.getElementById("cancelKitCatalog");
  elements.confirmKitCatalog = document.getElementById("confirmKitCatalog");
  elements.skillPointsField = document.querySelector(".skill-points-field");
  elements.saveSheetDialog = document.getElementById("saveSheetDialog");
  elements.saveSheetTitle = document.getElementById("saveSheetTitle");
  elements.saveSheetMessage = document.getElementById("saveSheetMessage");
  elements.cancelSaveSheet = document.getElementById("cancelSaveSheet");
  elements.confirmSaveSheet = document.getElementById("confirmSaveSheet");
  elements.skillCatalogDialog = document.getElementById("skillCatalogDialog");
  elements.skillCatalogSearch = document.getElementById("skillCatalogSearch");
  elements.skillCatalogList = document.getElementById("skillCatalogList");
  elements.skillCatalogDetail = document.getElementById("skillCatalogDetail");
  elements.cancelSkillCatalog = document.getElementById("cancelSkillCatalog");
  elements.confirmSkillCatalog = document.getElementById("confirmSkillCatalog");
  elements.deleteCharacterDialog = document.getElementById("deleteCharacterDialog");
  elements.deleteCharacterMessage = document.getElementById("deleteCharacterMessage");
  elements.cancelDeleteCharacter = document.getElementById("cancelDeleteCharacter");
  elements.confirmDeleteCharacter = document.getElementById("confirmDeleteCharacter");
}

function buildStaticForm() {
  buildAttributes();
  bindAttrPointEvents();
  buildGridFields(document.getElementById("identificationGrid"), identificationFields);
  buildGridFields(document.getElementById("statusGrid"), statusFields, true);
  buildUpgrades();
  buildSkillsTable();
  buildCombatSkillsTable();
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
    <span></span>
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
      <button type="button" class="attr-point-btn hidden" data-attr-key="${key}" aria-label="Adicionar +1 em ${label}">+1</button>
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
    const isDerivedStatusField = key === "pv" || key === "pvAtual";
    wrapper.className = "grid-field";
    wrapper.innerHTML = `
      <span>${label}</span>
      <input type="text" data-field="${key}"${isDerivedStatusField ? " readonly" : ""}>
    `;

    if (centered) {
      wrapper.querySelector("input").classList.add("status-input");
    }

    if (key === "dano") {
      wrapper.querySelector("input").classList.add("damage-input");
    }

    container.appendChild(wrapper);
  });
}

function buildUpgrades() {
  const character = getActiveCharacter();
  const rows = character?.dynamicUpgrades || [createUpgradePlaceholder()];
  elements.upgradesGrid.innerHTML = "";

  rows.forEach((row) => {
    elements.upgradesGrid.appendChild(createUpgradeRowElement({
      id: row.id,
      nameField: `dynamicUpgrade:${row.id}:nome`,
      valueField: `dynamicUpgrade:${row.id}:valor`,
      ariaIndex: row.id,
      dynamicType: "upgrade",
      isPlaceholder: Boolean(row.isPlaceholder),
    }));
  });
}

function buildSkillsTable() {
  const character = getActiveCharacter();
  const rows = character?.dynamicSkills || [createSkillPlaceholder()];

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

  rows.forEach((row) => {
    elements.skillsTable.appendChild(createSkillRowElement({
      id: row.id,
      nameField: `dynamicSkill:${row.id}:nome`,
      attributeField: `dynamicSkill:${row.id}:atributo`,
      valueField: `dynamicSkill:${row.id}:valor`,
      testField: `dynamicSkill:${row.id}:teste`,
      ariaIndex: row.id,
      dynamicType: "skill",
      isPlaceholder: Boolean(row.isPlaceholder),
    }));
  });
}

function createUpgradeRowElement({ id, nameField, valueField, ariaIndex, dynamicType, isPlaceholder }) {
  const row = document.createElement("div");
  row.className = "upgrade-row dynamic-row";
  row.dataset.dynamicType = dynamicType;
  row.dataset.rowId = id;
  row.dataset.placeholder = isPlaceholder ? "true" : "false";
  row.innerHTML = `
    <input type="text" data-field="${nameField}" aria-label="Nome do aprimoramento ${ariaIndex}">
    <input type="text" inputmode="numeric" data-field="${valueField}" aria-label="Valor do aprimoramento ${ariaIndex}">
  `;

  return row;
}

function createSkillRowElement({
  id,
  nameField,
  attributeField,
  valueField,
  testField,
  ariaIndex,
  dynamicType,
  isPlaceholder,
}) {
  const row = document.createElement("div");
  row.className = "skills-row dynamic-row";
  row.dataset.dynamicType = dynamicType;
  row.dataset.rowId = id;
  row.dataset.placeholder = isPlaceholder ? "true" : "false";
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

function buildCombatSkillsTable() {
  const character = getActiveCharacter();
  let rows = character?.dynamicCombatSkills || [createCombatSkillPlaceholder()];

  elements.combatSkillsTable.innerHTML = "";

  const header = document.createElement("div");
  header.className = "skills-row skills-header";
  header.innerHTML = `
    <span>Perícia</span>
    <span>Atributo</span>
    <span>Valor</span>
    <div class="combat-split-header">
      <span>Atk%</span>
      <div class="split-sep">/</div>
      <span>Def%</span>
    </div>
  `;
  elements.combatSkillsTable.appendChild(header);

  const groupOrder = { martial: 0, weapons: 1, firearm: 2 };
  const sorted = [...rows].sort((a, b) => {
    const ga = groupOrder[a.combatGroup] ?? 99;
    const gb = groupOrder[b.combatGroup] ?? 99;
    return ga - gb;
  });

  let lastGroup = null;
  sorted.forEach((row) => {
    if (row.isPlaceholder) {
      return;
    }
    if (row.combatGroup !== lastGroup) {
      const groupLabels = { martial: "Lutas & Artes Marciais", weapons: "Armas Brancas", firearm: "Armas de Fogo" };
      const label = groupLabels[row.combatGroup];
      if (label) {
        const divider = document.createElement("div");
        divider.className = "combat-skills-group-header";
        divider.textContent = label;
        elements.combatSkillsTable.appendChild(divider);
      }
      lastGroup = row.combatGroup;
    }
    elements.combatSkillsTable.appendChild(createCombatSkillRowElement(row));
  });
}

function createCombatSkillRowElement(row) {
  if (row.combatType === "firearm") {
    return createCombatSkillFirearmRowElement(row);
  }
  return createCombatSkillMeleeRowElement(row);
}

function createCombatSkillMeleeRowElement({ id, combatGroup, isPlaceholder }) {
  const el = document.createElement("div");
  el.className = "skills-row combat-melee-row dynamic-row";
  el.dataset.dynamicType = "combatSkill";
  el.dataset.rowId = id;
  el.dataset.combatGroup = combatGroup || "martial";
  el.dataset.combatType = "melee";
  el.dataset.placeholder = isPlaceholder ? "true" : "false";
  el.innerHTML = `
    <label class="skill-cell skill-name">
      <input type="text" data-field="dynamicCombatSkill:${id}:nome" aria-label="Nome da perícia de combate">
    </label>
    <div class="skill-cell skill-number combat-split-cell">
      <div class="combat-split-inputs">
        <input type="text" inputmode="numeric" data-field="dynamicCombatSkill:${id}:atributo1" aria-label="Atributo de ataque">
        <div class="split-sep">/</div>
        <input type="text" inputmode="numeric" data-field="dynamicCombatSkill:${id}:atributo2" aria-label="Atributo de defesa">
      </div>
    </div>
    <div class="skill-cell skill-number combat-split-cell">
      <div class="combat-split-inputs">
        <input type="text" inputmode="numeric" data-field="dynamicCombatSkill:${id}:atk" aria-label="Valor de ataque">
        <div class="split-sep">/</div>
        <input type="text" inputmode="numeric" data-field="dynamicCombatSkill:${id}:def" aria-label="Valor de defesa">
      </div>
    </div>
    <div class="skill-cell skill-number combat-split-cell">
      <div class="combat-split-inputs">
        <input type="text" data-field="dynamicCombatSkill:${id}:atkTeste" readonly>
        <div class="split-sep">/</div>
        <input type="text" data-field="dynamicCombatSkill:${id}:defTeste" readonly>
      </div>
    </div>
  `;
  return el;
}

function createCombatSkillFirearmRowElement({ id, isPlaceholder }) {
  const el = document.createElement("div");
  el.className = "skills-row dynamic-row";
  el.dataset.dynamicType = "combatSkill";
  el.dataset.rowId = id;
  el.dataset.combatGroup = "firearm";
  el.dataset.combatType = "firearm";
  el.dataset.placeholder = isPlaceholder ? "true" : "false";
  el.innerHTML = `
    <label class="skill-cell skill-name">
      <input type="text" data-field="dynamicCombatSkill:${id}:nome" aria-label="Nome da arma de fogo">
    </label>
    <label class="skill-cell skill-number">
      <span>Atributo</span>
      <input type="text" inputmode="numeric" data-field="dynamicCombatSkill:${id}:atributo">
    </label>
    <label class="skill-cell skill-number">
      <span>Valor</span>
      <input type="text" inputmode="numeric" data-field="dynamicCombatSkill:${id}:valor">
    </label>
    <label class="skill-cell skill-number">
      <span>Teste %</span>
      <input type="text" data-field="dynamicCombatSkill:${id}:teste" readonly>
    </label>
  `;
  return el;
}

function registerEvents() {
  elements.loginForm.addEventListener("submit", handleLogin);
  elements.openRegisterFromLogin.addEventListener("click", openRegisterDialog);
  elements.openRegisterFromGm.addEventListener("click", handleCreateCharacter);
  elements.deleteCurrentSheet.addEventListener("click", openDeleteCharacterDialog);
  elements.cancelRegister.addEventListener("click", () => elements.registerDialog.close());
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.cancelDeleteCharacter.addEventListener("click", () => elements.deleteCharacterDialog.close());
  elements.confirmDeleteCharacter.addEventListener("click", () => {
    void handleDeleteCurrentCharacter();
  });
  elements.toggleLoginPassword.addEventListener("click", () => togglePasswordVisibility(elements.passwordInput, elements.toggleLoginPassword));
  elements.toggleRegisterPassword.addEventListener("click", () => togglePasswordVisibility(elements.registerPassword, elements.toggleRegisterPassword));
  elements.logoutButton.addEventListener("click", handleLogout);
  elements.sheetSelector.addEventListener("change", handleSheetSelection);
  elements.removePortraitButton.addEventListener("click", handleRemovePortrait);
  elements.addUpgradeRow.addEventListener("click", openUpgradeCatalogDialog);
  elements.cancelUpgradeCatalog.addEventListener("click", () => elements.upgradeCatalogDialog.close());
  elements.confirmUpgradeCatalog.addEventListener("click", confirmUpgradeCatalogSelection);
  elements.upgradeCatalogSearch.addEventListener("input", (event) => {
    renderUpgradeCatalogList(event.target.value);
  });
  elements.upgradeCatalogTabBar.addEventListener("click", (event) => {
    const btn = event.target.closest(".catalog-tab");
    if (!btn) return;
    state.upgradeCatalogTab = btn.dataset.tab;
    elements.upgradeCatalogTabBar.querySelectorAll(".catalog-tab").forEach((t) => {
      t.classList.toggle("is-active", t.dataset.tab === state.upgradeCatalogTab);
    });
    state.upgradeCatalogSelection = { upgrade: null };
    renderUpgradeCatalogList(elements.upgradeCatalogSearch.value);
    renderUpgradeCatalogDetail();
  });
  elements.openKitCatalog.addEventListener("click", openKitCatalogDialog);
  elements.cancelKitCatalog.addEventListener("click", () => elements.kitCatalogDialog.close());
  elements.confirmKitCatalog.addEventListener("click", confirmKitCatalogSelection);
  elements.addSkillRow.addEventListener("click", openSkillCatalogDialog);
  elements.cancelSkillCatalog.addEventListener("click", () => elements.skillCatalogDialog.close());
  elements.confirmSkillCatalog.addEventListener("click", confirmSkillCatalogSelection);
  elements.skillCatalogSearch.addEventListener("input", (event) => {
    renderSkillCatalogList(event.target.value);
  });
  elements.addCombatSkillRow.addEventListener("click", openCombatSkillCatalogDialog);
  elements.cancelCombatSkillCatalog.addEventListener("click", () => elements.combatSkillCatalogDialog.close());
  elements.confirmCombatSkillCatalog.addEventListener("click", confirmCombatSkillCatalogSelection);
  elements.combatSkillCatalogSearch.addEventListener("input", (event) => {
    renderCombatSkillCatalogList(event.target.value);
  });
  elements.inventoryFab.addEventListener("click", openInventoryDrawer);
  elements.closeInventoryDrawer.addEventListener("click", closeInventoryDrawer);
  elements.addInventoryItem.addEventListener("click", addInventoryItemRow);
  elements.notesFab.addEventListener("click", openNotesDrawer);
  elements.closeNotesDrawer.addEventListener("click", closeNotesDrawer);
  elements.notesTextarea.addEventListener("input", handleNotesInput);
  elements.evolveButton.addEventListener("click", handleEvolve);
  elements.saveSheetButton.addEventListener("click", openSaveSheetDialog);
  elements.cancelSaveSheet.addEventListener("click", () => elements.saveSheetDialog.close());
  elements.confirmSaveSheet.addEventListener("click", confirmSaveSheet);
  elements.historyFab.addEventListener("click", openHistoryDrawer);
  elements.closeHistoryDrawer.addEventListener("click", closeHistoryDrawer);
  elements.historyTextarea.addEventListener("input", handleHistoryInput);

  bindFieldEvents(document);
  bindDynamicRowEvents(document);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      void flushPendingChanges();
    }
  });
}

function bindFieldEvents(scope) {
  scope.querySelectorAll("[data-field]").forEach((field) => {
    if (field.dataset.bound === "true") {
      return;
    }

    field.dataset.bound = "true";
    const isNumeric = field.hasAttribute("inputmode");
    field.addEventListener("input", () => handleFieldInput(field, isNumeric));
    field.addEventListener("blur", () => {
      void flushPendingChanges();
    });
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

async function handleAuthStateChange(user) {
  closeAllDrawers();
  clearCharacterListener();

  if (!user) {
    resetAppState();
    showLogin();
    return;
  }

  showLoading("Carregando sua ficha...");
  state.authUser = user;

  try {
    const profile = await ensureUserProfile(user);
    state.profile = profile;
    await ensureOwnerHasAtLeastOneCharacter(profile);
    subscribeToCharacters();
  } catch (error) {
    console.error(error);
    alert(formatFirebaseError(error, "Não foi possível carregar a conta."));
    await firebaseSignOut(auth);
  }
}

async function handleLogin(event) {
  event.preventDefault();

  const formData = new FormData(elements.loginForm);
  const email = String(formData.get("email") || "").trim();
  const password = String(formData.get("password") || "");
  const shouldRemember = elements.rememberLogin.checked;

  if (!email || !password) {
    alert("Informe e-mail e senha.");
    return;
  }

  showLoading("Entrando...");

  try {
    persistRememberedLogin({ email, password, shouldRemember });
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    const autoCreated = await tryBootstrapMasterAccount(email, password, error);
    if (autoCreated) {
      return;
    }

    console.error(error);
    restoreRememberedLogin();
    showLogin();
    alert(formatFirebaseError(error, "Não foi possível entrar."));
  }
}

async function handleLogout() {
  try {
    await flushPendingChanges();
  } catch (error) {
    console.warn("Não foi possível concluir o último salvamento antes de sair.", error);
  }

  await firebaseSignOut(auth);
}

function openRegisterDialog() {
  elements.registerForm.reset();
  elements.registerDialog.showModal();
}

async function handleRegister(event) {
  event.preventDefault();

  const formData = new FormData(elements.registerForm);
  const displayName = String(formData.get("displayName") || "").trim();
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (displayName.length < 3) {
    alert("O nome do jogador deve ter ao menos 3 caracteres.");
    return;
  }

  if (!isValidEmail(email)) {
    alert("Informe um e-mail válido.");
    return;
  }

  if (password.length < 6) {
    alert("A senha deve ter ao menos 6 caracteres.");
    return;
  }

  showLoading("Criando conta...");

  try {
    const role = await determineRoleForNewUser(email);
    const credential = await createUserWithEmailAndPassword(auth, email, password);

    await updateProfile(credential.user, { displayName });

    const profile = createUserProfileRecord(credential.user, {
      displayName,
      email,
      role,
    });

    await setDoc(doc(db, "users", credential.user.uid), serializeProfileForWrite(profile), { merge: true });
    elements.registerDialog.close();
  } catch (error) {
    console.error(error);
    showLogin();
    alert(formatFirebaseError(error, "Não foi possível cadastrar o usuário."));
  }
}

async function handleSheetSelection(event) {
  const nextCharacterId = event.target.value || null;
  if (!nextCharacterId || nextCharacterId === state.selectedCharacterId) {
    return;
  }

  await flushPendingChanges();
  state.selectedCharacterId = nextCharacterId;
  persistSelectedCharacter();
  renderCharacterWorkspace();
}

async function handleCreateCharacter() {
  if (!state.profile) {
    return;
  }

  await flushPendingChanges();
  updateSaveStatus("Salvando", "saving");

  const ownerProfile = resolveCharacterOwnerProfile();
  const ownerCount = Object.values(state.charactersMap)
    .filter((character) => character.ownerId === ownerProfile.id && !character.deletedAtMs)
    .length;

  const character = createDefaultCharacter(ownerProfile, ownerCount + 1);
  const characterRef = doc(collection(db, "characters"));
  const optimisticCharacter = normalizeCharacter({ ...character, id: characterRef.id }, characterRef.id);

  state.charactersMap[characterRef.id] = optimisticCharacter;
  state.selectedCharacterId = characterRef.id;
  rebuildCharacterOrder();
  persistSelectedCharacter();
  renderSheetSelector();
  renderCharacterWorkspace();

  try {
    await setDoc(characterRef, serializeCharacterForWrite(optimisticCharacter));
    queueStatus("Salvo", "saved");
  } catch (error) {
    console.error(error);
    delete state.charactersMap[characterRef.id];
    rebuildCharacterOrder();
    syncSelectedCharacterId();
    renderCharacterWorkspace();
    updateSaveStatus("Salvo", "saved");
    alert(formatFirebaseError(error, "Não foi possível criar a nova ficha."));
  }
}

function openDeleteCharacterDialog() {
  const activeCharacter = getActiveCharacter();
  if (!activeCharacter) {
    return;
  }

  const characterName = resolveSessionCharacterName(activeCharacter);
  elements.deleteCharacterMessage.textContent = `Você irá excluir a ficha ${characterName}. Deseja continuar?`;
  elements.deleteCharacterDialog.showModal();
}

async function handleDeleteCurrentCharacter() {
  const activeCharacter = getActiveCharacter();
  if (!activeCharacter) {
    elements.deleteCharacterDialog.close();
    return;
  }

  const currentCharacterId = activeCharacter.id;
  elements.deleteCharacterDialog.close();

  try {
    await flushPendingChanges();
    updateSaveStatus("Salvando", "saving");
    await deleteDoc(doc(db, "characters", currentCharacterId));

    delete state.charactersMap[currentCharacterId];
    rebuildCharacterOrder();
    syncSelectedCharacterId();
    renderCharacterWorkspace();
    queueStatus("Salvo", "saved");
  } catch (error) {
    console.error(error);
    updateSaveStatus("Salvo", "saved");
    alert(formatFirebaseError(error, "Não foi possível excluir a ficha."));
  }
}

function handleFieldInput(field, isNumeric) {
  if (!hasActiveCharacter()) {
    updateSaveStatus("Salvo", "saved");
    return;
  }

  if (field.dataset.field === "dano") {
    field.value = sanitizeDamageInput(field.value);
  } else if (isNumeric) {
    field.value = sanitizeIntegerInput(field.value);
  }

  const key = field.dataset.field;

  if (getActiveCharacterMode() === "creation" && /^[a-z]+Valor$/.test(key)) {
    field.value = clampAttributeValueAgainstPool(key, field.value);
  }

  if (key.startsWith("dynamicUpgrade:") && key.endsWith(":valor") && field.value === "1") {
    consumeUpgradePendingPoint();
  }

  applyFieldValueToCharacter(key, field.value);
  recalculateDerivedFields();

  state.pendingChanges.add(key);
  state.dirtyMap.set(key, field.value);
  state.hasUnsavedChanges = true;

  field.classList.add("saving");
  field.classList.remove("saved");

  if (key === "nome") {
    renderSheetSelector();
    renderSessionSummary();
  }

  if (key === "nivel" || key === "xp") {
    updateEvolveButtonVisibility();
  }

  updateSaveStatus("Salvando", "saving");
  scheduleAutosave();
}

function handleDynamicRowFocusOut(event) {
  const row = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (nextTarget && row.contains(nextTarget)) {
    return;
  }

  let hasContent;
  if (row.dataset.dynamicType === "combatSkill") {
    const nomeInput = row.querySelector('[data-field$=":nome"]');
    hasContent = Boolean(nomeInput && String(nomeInput.value || "").trim());
  } else {
    hasContent = Array.from(row.querySelectorAll("[data-field]:not([readonly])"))
      .some((field) => String(field.value || "").trim() !== "");
  }

  if (hasContent) {
    if (row.dataset.placeholder === "true") {
      convertPlaceholderRow(row);
    }
    return;
  }

  if (row.dataset.placeholder === "true") {
    return;
  }

  removeDynamicRow(row);
}

function handleInventoryRowFocusOut(event) {
  const row = event.currentTarget;
  const nextTarget = event.relatedTarget;

  if (nextTarget && row.contains(nextTarget)) {
    return;
  }

  const hasContent = Array.from(row.querySelectorAll("[data-inventory-id]"))
    .some((field) => String(field.value || "").trim() !== "");

  if (!hasContent) {
    removeInventoryItemRow(row.dataset.inventoryRowId);
  }
}

function handleInventoryInput(field, isNumeric) {
  if (!hasActiveCharacter()) {
    return;
  }

  if (isNumeric) {
    field.value = sanitizeIntegerInput(field.value);
  }

  mutateActiveCharacter((character) => {
    const item = (character.inventoryItems || []).find((entry) => entry.id === field.dataset.inventoryId);
    if (!item) {
      return;
    }

    item[field.dataset.inventoryField] = field.value;
  });

  markCharacterDirty();
}

function handleNotesInput() {
  if (!hasActiveCharacter()) {
    return;
  }

  mutateActiveCharacter((character) => {
    character.notesText = elements.notesTextarea.value;
  });

  markCharacterDirty();
}

function handleHistoryInput() {
  if (!hasActiveCharacter()) {
    return;
  }

  mutateActiveCharacter((character) => {
    character.historyText = elements.historyTextarea.value;
  });

  markCharacterDirty();
}


async function handleRemovePortrait() {
  if (!hasActiveCharacter()) return;

  mutateActiveCharacter((character) => {
    character.portraitDataUrl = "";
    character.portraitStoragePath = "";
  });

  renderPortrait();
  renderSessionSummary();
  state.hasUnsavedChanges = true;
  await flushPendingChanges();
}

function openInventoryDrawer() {
  if (!hasActiveCharacter()) {
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
  if (!hasActiveCharacter()) {
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
  if (!hasActiveCharacter()) {
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

function closeAllDrawers() {
  closeInventoryDrawer();
  closeNotesDrawer();
  closeHistoryDrawer();
}

function renderInventory() {
  const items = getActiveCharacter()?.inventoryItems || [];
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
  elements.notesTextarea.value = getActiveCharacter()?.notesText || "";
}

function renderHistory() {
  elements.historyTextarea.value = getActiveCharacter()?.historyText || "";
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

function renderSheetSelector() {
  const characters = getOrderedCharacters();
  elements.gmTools.classList.toggle("hidden", !state.profile);
  elements.deleteCurrentSheet.disabled = !characters.length;
  elements.sheetSelector.innerHTML = "";

  if (!characters.length) {
    const option = document.createElement("option");
    option.value = "";
    option.textContent = "Sem fichas";
    elements.sheetSelector.appendChild(option);
    elements.sheetSelector.disabled = true;
    return;
  }

  elements.sheetSelector.disabled = false;

  characters.forEach((character) => {
    const option = document.createElement("option");
    option.value = character.id;
    option.textContent = character.nome || "Sem nome";
    elements.sheetSelector.appendChild(option);
  });

  elements.sheetSelector.value = state.selectedCharacterId || characters[0].id;
}

function renderSessionSummary() {
  if (!state.profile) {
    elements.sessionSummary.classList.add("hidden");
    return;
  }

  const activeCharacter = getActiveCharacter();
  const roleLabel = state.profile.role === "gm" ? "Mestre" : "Jogador";
  const currentDate = new Date().toLocaleDateString("pt-BR");
  const characterName = resolveSessionCharacterName(activeCharacter);

  elements.sessionSummary.innerHTML = `
    <strong>${escapeHtml(state.profile.displayName)}</strong>
    <div>${roleLabel}</div>
    <div>${escapeHtml(characterName)}</div>
    <div>${currentDate}</div>
  `;
  elements.sessionSummary.classList.remove("hidden");
}

function renderPortrait() {
  const character = getActiveCharacter();
  const portrait = character?.portraitDataUrl || "";

  if (portrait) {
    elements.portraitImage.src = portrait;
  } else {
    elements.portraitImage.removeAttribute("src");
  }

  elements.portraitFrame.classList.toggle("has-image", Boolean(portrait));
  elements.removePortraitButton.classList.toggle("hidden", !portrait);
}

function renderCharacterWorkspace() {
  rebuildDynamicSections();
  hydrateForm();
  renderPortrait();
  renderInventory();
  renderNotes();
  renderHistory();
  recalculateDerivedFields();
  renderSheetSelector();
  renderSessionSummary();
  renderAttributePendingPoints();
  renderUpgradePendingPoints();
  updateEvolveButtonVisibility();
  applySheetMode();
  showApp();
  updateSaveStatus(state.saveInFlight || state.uploadInFlight || state.hasUnsavedChanges ? "Salvando" : "Salvo", state.saveInFlight || state.uploadInFlight || state.hasUnsavedChanges ? "saving" : "saved");
}

function rebuildDynamicSections() {
  ensureDynamicRowsForActiveCharacter();
  buildUpgrades();
  buildSkillsTable();
  buildCombatSkillsTable();
  bindFieldEvents(elements.upgradesGrid);
  bindFieldEvents(elements.skillsTable);
  bindFieldEvents(elements.combatSkillsTable);
  bindDynamicRowEvents(elements.upgradesGrid);
  bindDynamicRowEvents(elements.skillsTable);
  bindDynamicRowEvents(elements.combatSkillsTable);
}

function hydrateForm() {
  const character = getActiveCharacter();
  const fields = document.querySelectorAll("[data-field]");

  if (!character) {
    fields.forEach((field) => {
      field.value = "";
      field.classList.remove("saving", "saved");
    });
    state.lastRenderedSignature = null;
    return;
  }

  fields.forEach((field) => {
    field.value = resolveFieldValue(character, field.dataset.field);
    field.classList.remove("saving", "saved");
  });

  state.lastRenderedSignature = buildCharacterSignature(character);
}

function recalculateDerivedFields() {
  recalculateAttributes();
  recalculateStatusFields();
  recalculateSkillPoints();
  recalculateSkills();
  recalculateCombatSkills();
  updateAttributePointsDisplay();
  updateUpgradePoolDisplay();
}

function getActiveCharacterMode() {
  return getActiveCharacter()?.state || "play";
}

function isMasterUser() {
  return MASTER_EMAILS.includes((state.profile?.email || "").toLowerCase());
}

function applySheetMode() {
  const mode = getActiveCharacterMode();
  const masterUser = isMasterUser();
  const isPlay = mode === "play";
  const isCreation = mode === "creation";
  const isEvolution = mode === "evolution";
  const hasCharacter = hasActiveCharacter();

  elements.saveSheetButton.classList.toggle("hidden", !hasCharacter || isPlay);
  elements.attributePointsBadge.classList.toggle("hidden", !isCreation);
  elements.upgradePointsPool.classList.toggle("hidden", !isCreation);
  if (elements.evolutionUpgradePointsBadge) {
    elements.evolutionUpgradePointsBadge.classList.toggle("hidden", !isEvolution);
  }
  if (elements.skillPointsField) {
    elements.skillPointsField.classList.toggle("hidden", isPlay);
  }
  elements.addSkillRow.classList.toggle("hidden", isPlay);
  elements.addCombatSkillRow.classList.toggle("hidden", isPlay);
  elements.addUpgradeRow.classList.toggle("hidden", isPlay);
  if (elements.openKitCatalog) {
    elements.openKitCatalog.classList.toggle("hidden", !isCreation);
  }

  attributeDefinitions.forEach(({ key }) => {
    setFieldReadonly(`${key}Valor`, isPlay || isEvolution);
  });

  document.querySelectorAll('#skillsTable input[data-field]').forEach((input) => {
    const f = input.dataset.field || "";
    if (f.endsWith(":teste")) return;
    input.toggleAttribute("readonly", isPlay);
  });

  document.querySelectorAll('#combatSkillsTable input[data-field]').forEach((input) => {
    const f = input.dataset.field || "";
    if (f.endsWith(":atkTeste") || f.endsWith(":defTeste") || f.endsWith(":teste")) return;
    input.toggleAttribute("readonly", isPlay);
  });

  document.querySelectorAll('#upgradesGrid input[data-field]').forEach((input) => {
    input.toggleAttribute("readonly", isPlay || isEvolution);
  });

  setFieldReadonly("nivel", !isCreation);
  setFieldReadonly("xp", !isCreation && !masterUser);

  updateAttributePointsDisplay();
  updateEvolutionUpgradePointsDisplay();
}

function updateEvolutionUpgradePointsDisplay() {
  if (!elements.evolutionUpgradePointsValue) return;
  const character = getActiveCharacter();
  const pts = character?.evolutionUpgradePoints || 0;
  elements.evolutionUpgradePointsValue.textContent = `+${pts}`;
}

function setFieldReadonly(key, readonly) {
  const field = document.querySelector(`[data-field="${key}"]`);
  if (!field) return;
  field.toggleAttribute("readonly", Boolean(readonly));
}

function clampAttributeValueAgainstPool(key, rawValue) {
  const newValue = parseInt(rawValue || "0", 10) || 0;
  if (newValue <= 0) return rawValue;
  const sumOthers = attributeDefinitions.reduce((acc, { key: k }) => {
    if (k + "Valor" === key) return acc;
    return acc + (parseInt(getFieldValue(`${k}Valor`) || "0", 10) || 0);
  }, 0);
  const maxAllowed = 101 - sumOthers;
  if (newValue > maxAllowed) {
    return String(Math.max(0, maxAllowed));
  }
  return rawValue;
}

function updateAttributePointsDisplay() {
  if (!elements.attributePointsValue) return;
  const sum = attributeDefinitions.reduce((acc, { key }) => {
    return acc + (parseInt(getFieldValue(`${key}Valor`) || "0", 10) || 0);
  }, 0);
  const remaining = 101 - sum;
  elements.attributePointsValue.textContent = String(remaining);
  elements.attributePointsValue.classList.toggle("depleted", remaining < 0);
}

function openSaveSheetDialog() {
  if (!hasActiveCharacter()) return;
  const mode = getActiveCharacterMode();
  if (mode === "creation") {
    elements.saveSheetTitle.textContent = "Confirmar criação da ficha";
    elements.saveSheetMessage.textContent = "Deseja confirmar a criação da ficha? Após salvar, a ficha entrará em modo de Jogo.";
  } else if (mode === "evolution") {
    elements.saveSheetTitle.textContent = "Confirmar evolução";
    elements.saveSheetMessage.textContent = "Deseja salvar as alterações da evolução? Após confirmar, a ficha voltará ao modo de Jogo.";
  } else {
    return;
  }
  elements.saveSheetDialog.showModal();
}

async function confirmSaveSheet() {
  if (!hasActiveCharacter()) {
    elements.saveSheetDialog.close();
    return;
  }
  mutateActiveCharacter((character) => {
    character.state = "play";
  });
  markCharacterDirty();
  elements.saveSheetDialog.close();
  applySheetMode();
  updateEvolveButtonVisibility();
  await flushPendingChanges();
}

function recalculateSkillPoints() {
  const idadeRaw = getFieldValue("idadeReal");
  const intRaw = getFieldValue("intValor");
  if ((idadeRaw === "" || idadeRaw === null || idadeRaw === undefined)
    && (intRaw === "" || intRaw === null || intRaw === undefined)) {
    setFieldValue("periciasPontos", "");
    return;
  }
  const idade = parseInt(idadeRaw || "0", 10) || 0;
  const intelligence = parseInt(intRaw || "0", 10) || 0;
  const nivel = parseInt(getFieldValue("nivel") || "1", 10) || 1;
  const levelBonus = Math.max(0, nivel - 1) * 25;
  const base = (idade * 10) + (intelligence * 5) + levelBonus;

  const character = getActiveCharacter();
  const spent = (character?.dynamicSkills || [])
    .reduce((sum, row) => sum + (parseInt(row.valor || "0", 10) || 0), 0);
  const combatSpent = (character?.dynamicCombatSkills || [])
    .filter((row) => !row.isPlaceholder)
    .reduce((sum, row) => {
      if (row.combatType === "firearm") {
        return sum + (parseInt(row.valor || "0", 10) || 0);
      }
      return sum + (parseInt(row.atk || "0", 10) || 0) + (parseInt(row.def || "0", 10) || 0);
    }, 0);
  const kitCredit = character?.kitSkillCredit || 0;

  setFieldValue("periciasPontos", String(base - spent - combatSpent + kitCredit));
}

function recalculateAttributes() {
  let total = 0;

  attributeDefinitions.forEach(({ key }) => {
    const value = parseInt(getFieldValue(`${key}Valor`) || "0", 10) || 0;
    const modifier = parseInt(getFieldValue(`${key}Mod`) || "0", 10) || 0;
    const test = (value - modifier) * 4;

    setFieldValue(`${key}Teste`, String(test));
    total += value;
  });

  setFieldValue("atributosTotal", String(total));
}

function recalculateStatusFields() {
  const frRaw = getFieldValue("frValor");
  const conRaw = getFieldValue("conValor");
  const nivelRaw = getFieldValue("nivel");
  const danoRaw = getFieldValue("dano");

  if (frRaw === "" && conRaw === "" && nivelRaw === "") {
    setFieldValue("pv", "");
    setFieldValue("pvAtual", "");
    return;
  }

  const fr = parseInt(frRaw || "0", 10) || 0;
  const con = parseInt(conRaw || "0", 10) || 0;
  const nivel = parseInt(nivelRaw || "0", 10) || 0;
  const pv = Math.ceil((fr + con) / 2) + nivel;
  const damageMagnitude = Math.abs(parseInt(danoRaw || "0", 10) || 0);
  const pvAtual = pv - damageMagnitude;

  setFieldValue("pv", formatDerivedNumber(pv));
  setFieldValue("pvAtual", formatDerivedNumber(pvAtual));
}

function recalculateSkills() {
  const character = getActiveCharacter();
  const rows = character?.dynamicSkills || [];

  rows.forEach((row) => {
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

function recalculateCombatSkills() {
  const character = getActiveCharacter();
  const rows = character?.dynamicCombatSkills || [];

  rows.forEach((row) => {
    if (row.combatType === "firearm") {
      recalculateCombatFirearmFields(
        `dynamicCombatSkill:${row.id}:atributo`,
        `dynamicCombatSkill:${row.id}:valor`,
        `dynamicCombatSkill:${row.id}:teste`,
      );
    } else {
      recalculateCombatMeleeFields(
        `dynamicCombatSkill:${row.id}:atributo1`,
        `dynamicCombatSkill:${row.id}:atributo2`,
        `dynamicCombatSkill:${row.id}:atk`,
        `dynamicCombatSkill:${row.id}:def`,
        `dynamicCombatSkill:${row.id}:atkTeste`,
        `dynamicCombatSkill:${row.id}:defTeste`,
      );
    }
  });
}

function recalculateCombatMeleeFields(attr1Field, attr2Field, atkField, defField, atkTesteField, defTesteField) {
  const attr1 = parseInt(getFieldValue(attr1Field) || "0", 10) || 0;
  const attr2 = parseInt(getFieldValue(attr2Field) || "0", 10) || 0;
  const atk = parseInt(getFieldValue(atkField) || "0", 10) || 0;
  const def = parseInt(getFieldValue(defField) || "0", 10) || 0;
  setFieldValue(atkTesteField, String(attr1 + atk));
  setFieldValue(defTesteField, String(attr2 + def));
}

function recalculateCombatFirearmFields(attrField, valorField, testeField) {
  const attrRaw = getFieldValue(attrField);
  const valorRaw = getFieldValue(valorField);

  if (attrRaw === "" && valorRaw === "") {
    setFieldValue(testeField, "");
    return;
  }

  const attr = parseInt(attrRaw || "0", 10) || 0;
  const valor = parseInt(valorRaw || "0", 10) || 0;
  setFieldValue(testeField, String(Math.floor((attr + valor) / 2)));
}

function addDynamicRow(type) {
  if (!hasActiveCharacter()) {
    return;
  }

  const rowId = crypto.randomUUID();

  mutateActiveCharacter((character) => {
    if (type === "upgrade") {
      character.dynamicUpgrades = character.dynamicUpgrades || [];
      character.dynamicUpgrades.push({
        id: rowId,
        nome: "",
        valor: "",
        isPlaceholder: false,
      });
      return;
    }

    character.dynamicSkills = character.dynamicSkills || [];
    character.dynamicSkills.push({
      id: rowId,
      nome: "",
      atributo: "",
      valor: "",
      teste: "",
      isPlaceholder: false,
    });
  });

  markCharacterDirty();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
  focusDynamicRow(type, rowId);
}

function focusDynamicRow(type, rowId) {
  let selector;
  if (type === "upgrade") {
    selector = `[data-field="dynamicUpgrade:${rowId}:nome"]`;
  } else if (type === "combatSkill") {
    selector = `[data-field="dynamicCombatSkill:${rowId}:nome"]`;
  } else {
    selector = `[data-field="dynamicSkill:${rowId}:nome"]`;
  }
  const field = document.querySelector(selector);
  if (field) {
    field.focus();
  }
}

async function loadKits() {
  try {
    const response = await fetch("kits.json");
    state.kits = await response.json();
  } catch {
    state.kits = [];
  }
}

async function loadUpgrades() {
  try {
    const response = await fetch("upgrades.json");
    UPGRADES_CATALOG = await response.json();
  } catch {
    UPGRADES_CATALOG = [];
  }
}

async function loadSkills() {
  try {
    const response = await fetch("skills.json");
    const data = await response.json();
    SKILLS_CATALOG = data.skills;
    COMBAT_SKILLS_CATALOG = data.combatSkills;
  } catch {
    SKILLS_CATALOG = [];
    COMBAT_SKILLS_CATALOG = [];
  }
}

function openKitCatalogDialog() {
  if (!hasActiveCharacter()) return;
  state.kitCatalogSelection = null;
  renderKitCatalogList();
  renderKitCatalogDetail();
  elements.confirmKitCatalog.disabled = true;
  elements.kitCatalogDialog.showModal();
}

function renderKitCatalogList() {
  elements.kitCatalogList.innerHTML = "";
  if (!state.kits.length) {
    const empty = document.createElement("div");
    empty.className = "skill-catalog-empty";
    empty.textContent = "Nenhum kit disponível.";
    elements.kitCatalogList.appendChild(empty);
    return;
  }
  state.kits.forEach((kit) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "skill-catalog-item";
    item.dataset.kitId = kit.id;
    if (state.kitCatalogSelection?.id === kit.id) item.classList.add("selected");
    item.innerHTML = `<span class="skill-catalog-item-name">${kit.name}</span>`;
    item.addEventListener("click", () => selectKit(kit));
    elements.kitCatalogList.appendChild(item);
  });
}

function selectKit(kit) {
  state.kitCatalogSelection = kit;
  elements.kitCatalogList.querySelectorAll(".skill-catalog-item").forEach((el) => {
    el.classList.toggle("selected", el.dataset.kitId === kit.id);
  });
  renderKitCatalogDetail();
}

function renderKitCatalogDetail() {
  const kit = state.kitCatalogSelection;
  const detail = elements.kitCatalogDetail;

  if (!kit) {
    detail.innerHTML = `<p class="skill-catalog-empty">Selecione um kit à esquerda</p>`;
    elements.confirmKitCatalog.disabled = true;
    return;
  }

  const skillAvailable = parseInt(getFieldValue("periciasPontos") || "0", 10) || 0;
  const upgradeAvailable = computeUpgradePoolRemaining();
  const canAfford = skillAvailable >= kit.skillCost && upgradeAvailable >= kit.upgradeCost;

  const skillsHtml = (kit.skills || []).map((sk) => `
    <div class="kit-row">
      <span>${sk.nome}</span>
      <span class="kit-valor">${sk.valor}%</span>
    </div>
  `).join("");

  const combatSkillsHtml = (kit.combatSkills || []).map((sk) => {
    if (sk.combatType === "firearm") {
      return `<div class="kit-row">
        <span>${sk.nome}</span>
        <span class="kit-valor">${sk.valor}%</span>
      </div>`;
    }
    return `<div class="kit-row">
      <span>${sk.nome}</span>
      <span class="kit-valor">ATK ${sk.atk}% / DEF ${sk.def}%</span>
    </div>`;
  }).join("");

  const upgradesHtml = (kit.upgrades || []).map((up) => `
    <div class="kit-row">
      <span>${up.nome}</span>
      <span class="kit-valor cost-positive">−${up.cost}</span>
    </div>
  `).join("");

  detail.innerHTML = `
    <h3 class="skill-catalog-title">${escapeHtml(kit.name)}</h3>
    <p class="kit-description">${escapeHtml(kit.description)}</p>
    <div class="kit-cost-grid">
      <div class="kit-cost-item">
        <span class="kit-cost-label">Custo em Perícias</span>
        <span class="kit-cost-value${skillAvailable < kit.skillCost ? " depleted" : ""}">${kit.skillCost} pts</span>
      </div>
      <div class="kit-cost-item">
        <span class="kit-cost-label">Custo em Aprimoramentos</span>
        <span class="kit-cost-value${upgradeAvailable < kit.upgradeCost ? " depleted" : ""}">${kit.upgradeCost} pts</span>
      </div>
    </div>
    ${skillsHtml ? `
    <div class="kit-section">
      <h4 class="kit-section-title">Perícias incluídas</h4>
      ${skillsHtml}
    </div>` : ""}
    ${combatSkillsHtml ? `
    <div class="kit-section">
      <h4 class="kit-section-title">Perícias de Combate incluídas</h4>
      ${combatSkillsHtml}
    </div>` : ""}
    ${upgradesHtml ? `
    <div class="kit-section">
      <h4 class="kit-section-title">Aprimoramentos incluídos</h4>
      ${upgradesHtml}
    </div>` : ""}
    ${!canAfford ? `<p class="kit-warning">Pontos insuficientes para aplicar este kit.</p>` : ""}
  `;

  elements.confirmKitCatalog.disabled = !canAfford;
}

function confirmKitCatalogSelection() {
  const kit = state.kitCatalogSelection;
  if (!kit || !hasActiveCharacter()) return;

  const skillAvailable = parseInt(getFieldValue("periciasPontos") || "0", 10) || 0;
  const upgradeAvailable = computeUpgradePoolRemaining();
  if (skillAvailable < kit.skillCost || upgradeAvailable < kit.upgradeCost) return;

  const skillsSum = (kit.skills || []).reduce((s, sk) => s + sk.valor, 0);
  const combatSkillsSum = (kit.combatSkills || []).reduce((s, sk) => {
    if (sk.combatType === "firearm") return s + (sk.valor || 0);
    return s + (sk.atk || 0) + (sk.def || 0);
  }, 0);
  const upgradesPositiveSum = (kit.upgrades || [])
    .filter((up) => up.type === "positive")
    .reduce((s, up) => s + up.cost, 0);

  mutateActiveCharacter((character) => {
    character.kitSkillCredit = (character.kitSkillCredit || 0) + (skillsSum + combatSkillsSum - kit.skillCost);
    character.kitUpgradeCredit = (character.kitUpgradeCredit || 0) + (upgradesPositiveSum - kit.upgradeCost);

    character.dynamicSkills = (character.dynamicSkills || []).filter((e) => !e.isPlaceholder);
    (kit.skills || []).forEach((skill) => {
      const attrValue = skill.attributeKey ? getAttributeTesteValue(skill.attributeKey) : 0;
      character.dynamicSkills.push({
        id: crypto.randomUUID(),
        nome: skill.nome,
        atributo: String(attrValue),
        valor: String(skill.valor),
        teste: String(attrValue + skill.valor),
        isPlaceholder: false,
      });
    });

    character.dynamicCombatSkills = (character.dynamicCombatSkills || []).filter((e) => !e.isPlaceholder);
    (kit.combatSkills || []).forEach((skill) => {
      if (skill.combatType === "firearm") {
        const attrValue = skill.attributeKey ? getAttributeTesteValue(skill.attributeKey) : 0;
        const valorNum = skill.valor || 0;
        character.dynamicCombatSkills.push({
          id: crypto.randomUUID(),
          nome: skill.nome,
          combatType: "firearm",
          combatGroup: skill.combatGroup || "firearm",
          atributo: String(attrValue),
          valor: String(valorNum),
          teste: String(attrValue + valorNum),
          isPlaceholder: false,
        });
      } else {
        const attr1Value = skill.attribute1Key ? getAttributeTesteValue(skill.attribute1Key) : 0;
        const attr2Value = skill.attribute2Key ? getAttributeTesteValue(skill.attribute2Key) : 0;
        const atkNum = skill.atk || 0;
        const defNum = skill.def || 0;
        character.dynamicCombatSkills.push({
          id: crypto.randomUUID(),
          nome: skill.nome,
          combatType: "melee",
          combatGroup: skill.combatGroup || "weapons",
          atributo1: String(attr1Value),
          atributo2: String(attr2Value),
          atk: String(atkNum),
          def: String(defNum),
          atkTeste: String(attr1Value + atkNum),
          defTeste: String(attr2Value + defNum),
          isPlaceholder: false,
        });
      }
    });
    if (!character.dynamicCombatSkills.length) {
      character.dynamicCombatSkills.push(createCombatSkillPlaceholder());
    }

    character.dynamicUpgrades = (character.dynamicUpgrades || []).filter((e) => !e.isPlaceholder);
    (kit.upgrades || []).forEach((upgrade) => {
      const signedCost = upgrade.type === "positive" ? -upgrade.cost : upgrade.cost;
      character.dynamicUpgrades.push({
        id: crypto.randomUUID(),
        nome: upgrade.nome,
        valor: String(signedCost),
        isPlaceholder: false,
      });
    });

    character.classeSocialProfissao = kit.name;
  });

  markCharacterDirty();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
  applySheetMode();
  elements.kitCatalogDialog.close();
}

function openUpgradeCatalogDialog() {
  if (!hasActiveCharacter()) return;

  state.upgradeCatalogSelection = { upgrade: null };
  state.upgradeCatalogTab = "positive";
  elements.upgradeCatalogTabBar.querySelectorAll(".catalog-tab").forEach((t) => {
    t.classList.toggle("is-active", t.dataset.tab === "positive");
  });
  elements.upgradeCatalogSearch.value = "";
  renderUpgradeCatalogList("");
  renderUpgradeCatalogDetail();
  elements.confirmUpgradeCatalog.disabled = true;
  elements.upgradeCatalogDialog.showModal();
  setTimeout(() => elements.upgradeCatalogSearch.focus(), 50);
}

function renderUpgradeCatalogList(filter) {
  const lower = (filter || "").trim().toLowerCase();
  const isEvolution = getActiveCharacterMode() === "evolution";
  const activeTab = isEvolution ? "positive" : state.upgradeCatalogTab;
  const matches = UPGRADES_CATALOG.filter((entry) => {
    if (entry.type !== activeTab) return false;
    if (!lower) return true;
    if (entry.name.toLowerCase().includes(lower)) return true;
    return (entry.description || "").toLowerCase().includes(lower);
  });

  elements.upgradeCatalogList.innerHTML = "";
  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "skill-catalog-empty";
    empty.textContent = "Nenhum aprimoramento encontrado.";
    elements.upgradeCatalogList.appendChild(empty);
    return;
  }

  matches.forEach((entry) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "skill-catalog-item";
    item.dataset.upgradeName = entry.name;
    if (state.upgradeCatalogSelection?.upgrade?.name === entry.name) {
      item.classList.add("selected");
    }
    const isPositive = entry.type === "positive";
    const costLabel = `${isPositive ? "−" : "+"}${entry.cost}`;
    const costClass = isPositive ? "cost-positive" : "cost-negative";
    item.innerHTML = `
      <span class="skill-catalog-item-name">${entry.name}</span>
      <span class="skill-catalog-item-attr ${costClass}">${costLabel}</span>
    `;
    item.addEventListener("click", () => selectUpgradeFromCatalog(entry));
    elements.upgradeCatalogList.appendChild(item);
  });
}

function selectUpgradeFromCatalog(upgrade) {
  state.upgradeCatalogSelection = { upgrade };
  elements.upgradeCatalogList.querySelectorAll(".skill-catalog-item").forEach((el) => {
    el.classList.toggle("selected", el.dataset.upgradeName === upgrade.name);
  });
  renderUpgradeCatalogDetail();
}

function renderUpgradeCatalogDetail() {
  const sel = state.upgradeCatalogSelection;
  const detail = elements.upgradeCatalogDetail;

  if (!sel?.upgrade) {
    detail.innerHTML = `<p class="skill-catalog-empty">Selecione um aprimoramento à esquerda</p>`;
    elements.confirmUpgradeCatalog.disabled = true;
    return;
  }

  const entry = sel.upgrade;
  const isPositive = entry.type === "positive";
  const signedCostLabel = `${isPositive ? "−" : "+"}${entry.cost}`;
  const typeLabel = isPositive ? "Positivo" : "Negativo";
  const isEvolutionMode = getActiveCharacterMode() === "evolution";
  const character = getActiveCharacter();
  const evolutionPts = character?.evolutionUpgradePoints || 0;
  const remaining = isEvolutionMode ? evolutionPts : computeUpgradePoolRemaining();
  const canAfford = isEvolutionMode
    ? (isPositive && evolutionPts >= entry.cost)
    : (isPositive ? remaining >= entry.cost : true);

  detail.innerHTML = `
    <h3 class="skill-catalog-title">${entry.name}</h3>
    <div class="skill-catalog-row">
      <label class="field"><span>Tipo</span><input type="text" value="${typeLabel}" readonly></label>
      <label class="field"><span>Custo</span><input type="text" value="${signedCostLabel}" readonly></label>
    </div>
    <label class="field">
      <span>Descrição</span>
      <div class="skill-catalog-description">${entry.description || ""}</div>
    </label>
  `;

  elements.confirmUpgradeCatalog.disabled = !canAfford;
  if (!canAfford) {
    elements.confirmUpgradeCatalog.title = `Pontos insuficientes (necessário ${entry.cost}, disponível ${remaining}).`;
  } else {
    elements.confirmUpgradeCatalog.title = "";
  }
}

function computeUpgradePoolRemaining() {
  const character = getActiveCharacter();
  const rows = (character?.dynamicUpgrades || []).filter((r) => !r.isPlaceholder);
  let positiveSpent = 0;
  let negativeBonusUncapped = 0;
  rows.forEach((row) => {
    const v = parseInt(row.valor || "0", 10) || 0;
    if (v < 0) positiveSpent += -v;
    else if (v > 0) negativeBonusUncapped += v;
  });
  const negativeBonus = Math.min(UPGRADE_NEGATIVE_BONUS_CAP, negativeBonusUncapped);
  const kitCredit = character?.kitUpgradeCredit || 0;
  return UPGRADE_BASE_POOL + negativeBonus - positiveSpent + kitCredit;
}

function updateUpgradePoolDisplay() {
  if (!elements.upgradePointsPoolValue) return;
  const remaining = computeUpgradePoolRemaining();
  elements.upgradePointsPoolValue.textContent = String(remaining);
  elements.upgradePointsPoolValue.classList.toggle("depleted", remaining < 0);
}

function confirmUpgradeCatalogSelection() {
  const sel = state.upgradeCatalogSelection;
  if (!sel?.upgrade || !hasActiveCharacter()) return;

  const entry = sel.upgrade;
  const isPositive = entry.type === "positive";
  const signedCost = isPositive ? -entry.cost : entry.cost;
  const isEvolutionMode = getActiveCharacterMode() === "evolution";

  if (isEvolutionMode) {
    if (!isPositive) return;
    const evPts = getActiveCharacter()?.evolutionUpgradePoints || 0;
    if (evPts < entry.cost) return;
  } else if (isPositive && computeUpgradePoolRemaining() < entry.cost) {
    return;
  }

  const rowId = crypto.randomUUID();

  mutateActiveCharacter((character) => {
    character.dynamicUpgrades = (character.dynamicUpgrades || [])
      .filter((entry) => !entry.isPlaceholder);
    character.dynamicUpgrades.push({
      id: rowId,
      nome: entry.name,
      valor: String(signedCost),
      isPlaceholder: false,
    });
    if (isEvolutionMode) {
      character.evolutionUpgradePoints = Math.max(0, (character.evolutionUpgradePoints || 0) - entry.cost);
    }
  });

  markCharacterDirty();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
  applySheetMode();
  elements.upgradeCatalogDialog.close();
}

function openSkillCatalogDialog() {
  if (!hasActiveCharacter()) return;

  state.skillCatalogSelection = { skill: null, subgroup: null, valor: "" };
  elements.skillCatalogSearch.value = "";
  renderSkillCatalogList("");
  renderSkillCatalogDetail();
  elements.confirmSkillCatalog.disabled = true;
  elements.skillCatalogDialog.showModal();
  setTimeout(() => elements.skillCatalogSearch.focus(), 50);
}

function renderSkillCatalogList(filter) {
  const lower = (filter || "").trim().toLowerCase();
  const matches = SKILLS_CATALOG.filter((skill) => {
    if (!lower) return true;
    if (skill.name.toLowerCase().includes(lower)) return true;
    return skill.subgroups.some((sg) => sg.name.toLowerCase().includes(lower));
  });

  elements.skillCatalogList.innerHTML = "";
  if (matches.length === 0) {
    const empty = document.createElement("div");
    empty.className = "skill-catalog-empty";
    empty.textContent = "Nenhuma perícia encontrada.";
    elements.skillCatalogList.appendChild(empty);
    return;
  }

  matches.forEach((skill) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "skill-catalog-item";
    item.dataset.skillName = skill.name;
    if (state.skillCatalogSelection?.skill?.name === skill.name) {
      item.classList.add("selected");
    }
    const attrLabel = skill.attribute || (skill.subgroups.length ? "varia" : "—");
    item.innerHTML = `
      <span class="skill-catalog-item-name">${skill.name}</span>
      <span class="skill-catalog-item-attr">${attrLabel}</span>
    `;
    item.addEventListener("click", () => selectSkillFromCatalog(skill));
    elements.skillCatalogList.appendChild(item);
  });
}

function selectSkillFromCatalog(skill) {
  state.skillCatalogSelection = {
    skill,
    subgroup: skill.subgroups[0] || null,
    valor: "",
  };
  elements.skillCatalogList.querySelectorAll(".skill-catalog-item").forEach((el) => {
    el.classList.toggle("selected", el.dataset.skillName === skill.name);
  });
  renderSkillCatalogDetail();
  elements.confirmSkillCatalog.disabled = false;
}

function getAttributeTesteValue(attrLabel) {
  if (!attrLabel) return 0;
  const key = ATTR_LABEL_TO_KEY[attrLabel];
  if (!key) return 0;
  const raw = getFieldValue(`${key}Valor`);
  return parseInt(raw || "0", 10) || 0;
}

function getEffectiveSkillAttribute(skill, subgroup) {
  return (subgroup && subgroup.attribute) || skill.attribute || null;
}

function renderSkillCatalogDetail() {
  const sel = state.skillCatalogSelection;
  const detail = elements.skillCatalogDetail;

  if (!sel?.skill) {
    detail.innerHTML = `<p class="skill-catalog-empty">Selecione uma perícia à esquerda</p>`;
    return;
  }

  const skill = sel.skill;
  const hasSubgroups = skill.subgroups.length > 0;
  const subgroup = sel.subgroup;
  const effectiveAttr = getEffectiveSkillAttribute(skill, subgroup);
  const attrValue = getAttributeTesteValue(effectiveAttr);
  const valor = parseInt(sel.valor || "0", 10) || 0;
  const teste = attrValue + valor;

  let subgroupHTML = "";
  if (hasSubgroups) {
    const options = skill.subgroups.map((sg) => {
      const selectedAttr = sg.name === subgroup?.name ? "selected" : "";
      const attrSuffix = sg.attribute ? ` (${sg.attribute})` : "";
      return `<option value="${sg.name}" ${selectedAttr}>${sg.name}${attrSuffix}</option>`;
    }).join("");
    subgroupHTML = `
      <label class="field">
        <span>Subgrupo</span>
        <select id="skillCatalogSubgroup">${options}</select>
      </label>
    `;
  }

  detail.innerHTML = `
    <h3 class="skill-catalog-title">${skill.name}</h3>
    ${subgroupHTML}
    <div class="skill-catalog-row">
      <label class="field"><span>Atributo</span><input type="text" value="${effectiveAttr || "—"}" readonly></label>
      <label class="field"><span>Base do atributo</span><input type="text" value="${attrValue}" readonly></label>
    </div>
    <label class="field">
      <span>Valor (pontos)</span>
      <input type="text" inputmode="numeric" id="skillCatalogValor" value="${sel.valor}" placeholder="0">
    </label>
    <div class="skill-catalog-row">
      <label class="field"><span>Teste %</span><input type="text" id="skillCatalogTeste" value="${teste}" readonly></label>
    </div>
  `;

  if (hasSubgroups) {
    document.getElementById("skillCatalogSubgroup").addEventListener("change", (event) => {
      const newSub = skill.subgroups.find((sg) => sg.name === event.target.value);
      sel.subgroup = newSub || null;
      renderSkillCatalogDetail();
    });
  }

  const valorInput = document.getElementById("skillCatalogValor");
  valorInput.addEventListener("input", (event) => {
    sel.valor = event.target.value;
    const v = parseInt(event.target.value || "0", 10) || 0;
    const testeInput = document.getElementById("skillCatalogTeste");
    if (testeInput) testeInput.value = String(attrValue + v);
  });
  valorInput.focus();
}

function confirmSkillCatalogSelection() {
  const sel = state.skillCatalogSelection;
  if (!sel?.skill || !hasActiveCharacter()) return;

  const skill = sel.skill;
  const subgroup = sel.subgroup;
  const effectiveAttr = getEffectiveSkillAttribute(skill, subgroup);
  const attrValue = getAttributeTesteValue(effectiveAttr);
  const valorNum = parseInt(sel.valor || "0", 10) || 0;
  const valorStr = String(valorNum);
  const testeStr = String(attrValue + valorNum);
  const displayName = subgroup ? `${skill.name} (${subgroup.name})` : skill.name;
  const rowId = crypto.randomUUID();

  mutateActiveCharacter((character) => {
    character.dynamicSkills = (character.dynamicSkills || [])
      .filter((entry) => !entry.isPlaceholder);
    character.dynamicSkills.push({
      id: rowId,
      nome: displayName,
      atributo: String(attrValue),
      valor: valorStr,
      teste: testeStr,
      isPlaceholder: false,
    });
  });

  markCharacterDirty();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
  updateEvolveButtonVisibility();
  elements.skillCatalogDialog.close();
}

function openCombatSkillCatalogDialog() {
  if (!hasActiveCharacter()) return;

  state.combatSkillCatalogSelection = null;
  elements.combatSkillCatalogSearch.value = "";
  renderCombatSkillCatalogList("");
  elements.combatSkillCatalogDetail.innerHTML = `<p class="skill-catalog-empty">Selecione uma perícia à esquerda</p>`;
  elements.confirmCombatSkillCatalog.disabled = true;
  elements.combatSkillCatalogDialog.showModal();
  setTimeout(() => elements.combatSkillCatalogSearch.focus(), 50);
}

function renderCombatSkillCatalogList(filter) {
  const lower = (filter || "").trim().toLowerCase();
  const matches = COMBAT_SKILLS_CATALOG.filter((skill) => {
    if (!lower) return true;
    if (skill.name.toLowerCase().includes(lower)) return true;
    return (skill.subgroups || []).some((sg) => sg.name.toLowerCase().includes(lower));
  });

  elements.combatSkillCatalogList.innerHTML = "";

  if (!matches.length) {
    elements.combatSkillCatalogList.innerHTML = `<p class="skill-catalog-empty">Nenhuma perícia encontrada</p>`;
    return;
  }

  matches.forEach((skill) => {
    const item = document.createElement("button");
    item.type = "button";
    item.className = "skill-catalog-item";
    item.dataset.skillName = skill.name;
    item.textContent = skill.name;
    item.addEventListener("click", () => selectCombatSkillFromCatalog(skill));
    elements.combatSkillCatalogList.appendChild(item);
  });
}

function selectCombatSkillFromCatalog(skill) {
  state.combatSkillCatalogSelection = {
    skill,
    subgroup: (skill.subgroups && skill.subgroups[0]) || null,
    atk: "",
    def: "",
    valor: "",
  };
  elements.combatSkillCatalogList.querySelectorAll(".skill-catalog-item").forEach((el) => {
    el.classList.toggle("selected", el.dataset.skillName === skill.name);
  });
  renderCombatSkillCatalogDetail();
  elements.confirmCombatSkillCatalog.disabled = false;
}

function renderCombatSkillCatalogDetail() {
  const sel = state.combatSkillCatalogSelection;
  const detail = elements.combatSkillCatalogDetail;

  if (!sel?.skill) {
    detail.innerHTML = `<p class="skill-catalog-empty">Selecione uma perícia à esquerda</p>`;
    return;
  }

  const skill = sel.skill;
  const isFirearm = skill.combatType === "firearm";
  const hasSubgroups = (skill.subgroups || []).length > 0;
  const subgroup = sel.subgroup;

  if (isFirearm) {
    const attrLabel = skill.attribute || "";
    const attrValue = getAttributeTesteValue(attrLabel);
    const valor = parseInt(sel.valor || "0", 10) || 0;
    const teste = Math.floor((attrValue + valor) / 2);

    let subgroupHTML = "";
    if (hasSubgroups) {
      const options = (skill.subgroups || []).map((sg) => {
        const selectedAttr = sg.name === subgroup?.name ? "selected" : "";
        return `<option value="${sg.name}" ${selectedAttr}>${sg.name}</option>`;
      }).join("");
      subgroupHTML = `
        <label class="field">
          <span>Subgrupo</span>
          <select id="combatSkillCatalogSubgroup">${options}</select>
        </label>
      `;
    }

    detail.innerHTML = `
      <h3 class="skill-catalog-title">${skill.name}</h3>
      ${subgroupHTML}
      <div class="skill-catalog-row">
        <label class="field"><span>Atributo</span><input type="text" value="${attrLabel || "—"}" readonly></label>
        <label class="field"><span>Base do atributo</span><input type="text" value="${attrValue}" readonly></label>
      </div>
      <label class="field">
        <span>Valor (pontos)</span>
        <input type="text" inputmode="numeric" id="combatCatalogValor" value="${sel.valor}" placeholder="0">
      </label>
      <div class="skill-catalog-row">
        <label class="field"><span>Teste %</span><input type="text" id="combatCatalogTeste" value="${teste}" readonly></label>
      </div>
    `;

    if (hasSubgroups) {
      document.getElementById("combatSkillCatalogSubgroup").addEventListener("change", (event) => {
        const newSub = (skill.subgroups || []).find((sg) => sg.name === event.target.value);
        sel.subgroup = newSub || null;
        renderCombatSkillCatalogDetail();
      });
    }

    const valorInput = document.getElementById("combatCatalogValor");
    valorInput.addEventListener("input", (event) => {
      sel.valor = event.target.value;
      const v = parseInt(event.target.value || "0", 10) || 0;
      const testeInput = document.getElementById("combatCatalogTeste");
      if (testeInput) testeInput.value = String(Math.floor((attrValue + v) / 2));
    });
    valorInput.focus();
    return;
  }

  // Melee
  const attr1Label = (subgroup && subgroup.attribute1) || skill.attribute1 || "";
  const attr2Label = (subgroup && subgroup.attribute2) || skill.attribute2 || "";
  const attr1Value = getAttributeTesteValue(attr1Label);
  const attr2Value = getAttributeTesteValue(attr2Label);
  const atk = parseInt(sel.atk || "0", 10) || 0;
  const def = parseInt(sel.def || "0", 10) || 0;
  const atkTeste = attr1Value + atk;
  const defTeste = attr2Value + def;

  let subgroupHTML = "";
  if (hasSubgroups) {
    const options = (skill.subgroups || []).map((sg) => {
      const selectedAttr = sg.name === subgroup?.name ? "selected" : "";
      const attrSuffix = (sg.attribute1 && sg.attribute2) ? ` (${sg.attribute1}/${sg.attribute2})` : "";
      return `<option value="${sg.name}" ${selectedAttr}>${sg.name}${attrSuffix}</option>`;
    }).join("");
    subgroupHTML = `
      <label class="field">
        <span>Subgrupo</span>
        <select id="combatSkillCatalogSubgroup">${options}</select>
      </label>
    `;
  }

  detail.innerHTML = `
    <h3 class="skill-catalog-title">${skill.name}</h3>
    ${subgroupHTML}
    <div class="skill-catalog-row">
      <label class="field"><span>Atributo Atk</span><input type="text" value="${attr1Label || "—"}" readonly></label>
      <label class="field"><span>Base Atk</span><input type="text" value="${attr1Value}" readonly></label>
    </div>
    <div class="skill-catalog-row">
      <label class="field"><span>Atributo Def</span><input type="text" value="${attr2Label || "—"}" readonly></label>
      <label class="field"><span>Base Def</span><input type="text" value="${attr2Value}" readonly></label>
    </div>
    <div class="skill-catalog-row">
      <label class="field">
        <span>Valor Atk</span>
        <input type="text" inputmode="numeric" id="combatCatalogAtk" value="${sel.atk}" placeholder="0">
      </label>
      <label class="field">
        <span>Valor Def</span>
        <input type="text" inputmode="numeric" id="combatCatalogDef" value="${sel.def}" placeholder="0">
      </label>
    </div>
    <div class="skill-catalog-row">
      <label class="field"><span>Atk%</span><input type="text" id="combatCatalogAtkTeste" value="${atkTeste}" readonly></label>
      <label class="field"><span>Def%</span><input type="text" id="combatCatalogDefTeste" value="${defTeste}" readonly></label>
    </div>
  `;

  if (hasSubgroups) {
    document.getElementById("combatSkillCatalogSubgroup").addEventListener("change", (event) => {
      const newSub = (skill.subgroups || []).find((sg) => sg.name === event.target.value);
      sel.subgroup = newSub || null;
      renderCombatSkillCatalogDetail();
    });
  }

  const atkInput = document.getElementById("combatCatalogAtk");
  const defInput = document.getElementById("combatCatalogDef");

  atkInput.addEventListener("input", (event) => {
    sel.atk = event.target.value;
    const v = parseInt(event.target.value || "0", 10) || 0;
    const testeEl = document.getElementById("combatCatalogAtkTeste");
    if (testeEl) testeEl.value = String(attr1Value + v);
  });

  defInput.addEventListener("input", (event) => {
    sel.def = event.target.value;
    const v = parseInt(event.target.value || "0", 10) || 0;
    const testeEl = document.getElementById("combatCatalogDefTeste");
    if (testeEl) testeEl.value = String(attr2Value + v);
  });

  atkInput.focus();
}

function confirmCombatSkillCatalogSelection() {
  const sel = state.combatSkillCatalogSelection;
  if (!sel?.skill || !hasActiveCharacter()) return;

  const skill = sel.skill;
  const subgroup = sel.subgroup;
  const isFirearm = skill.combatType === "firearm";
  const displayName = subgroup ? `${skill.name} (${subgroup.name})` : skill.name;
  const rowId = crypto.randomUUID();

  mutateActiveCharacter((character) => {
    character.dynamicCombatSkills = (character.dynamicCombatSkills || [])
      .filter((entry) => !entry.isPlaceholder);

    if (isFirearm) {
      const attrLabel = skill.attribute || "";
      const attrValue = getAttributeTesteValue(attrLabel);
      const valorNum = parseInt(sel.valor || "0", 10) || 0;
      character.dynamicCombatSkills.push({
        id: rowId,
        nome: displayName,
        combatType: "firearm",
        combatGroup: skill.combatGroup || "firearm",
        atributo: String(attrValue),
        valor: String(valorNum),
        teste: String(Math.floor((attrValue + valorNum) / 2)),
        isPlaceholder: false,
      });
    } else {
      const attr1Label = (subgroup && subgroup.attribute1) || skill.attribute1 || "";
      const attr2Label = (subgroup && subgroup.attribute2) || skill.attribute2 || "";
      const attr1Value = getAttributeTesteValue(attr1Label);
      const attr2Value = getAttributeTesteValue(attr2Label);
      const atkNum = parseInt(sel.atk || "0", 10) || 0;
      const defNum = parseInt(sel.def || "0", 10) || 0;
      character.dynamicCombatSkills.push({
        id: rowId,
        nome: displayName,
        combatType: "melee",
        combatGroup: skill.combatGroup || "martial",
        atributo1: String(attr1Value),
        atributo2: String(attr2Value),
        atk: String(atkNum),
        def: String(defNum),
        atkTeste: String(attr1Value + atkNum),
        defTeste: String(attr2Value + defNum),
        isPlaceholder: false,
      });
    }

    character.dynamicCombatSkills.push(createCombatSkillPlaceholder());
  });

  markCharacterDirty();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
  updateEvolveButtonVisibility();
  elements.combatSkillCatalogDialog.close();
}

function convertPlaceholderRow(row) {
  mutateActiveCharacter((character) => {
    let collection;
    if (row.dataset.dynamicType === "upgrade") {
      collection = character.dynamicUpgrades || [];
    } else if (row.dataset.dynamicType === "combatSkill") {
      collection = character.dynamicCombatSkills || [];
    } else {
      collection = character.dynamicSkills || [];
    }
    const item = collection.find((entry) => entry.id === row.dataset.rowId);
    if (item) {
      item.isPlaceholder = false;
    }
  });

  row.dataset.placeholder = "false";
  markCharacterDirty();
}

function removeDynamicRow(row) {
  mutateActiveCharacter((character) => {
    if (row.dataset.dynamicType === "upgrade") {
      character.dynamicUpgrades = (character.dynamicUpgrades || [])
        .filter((entry) => entry.id !== row.dataset.rowId);
      if (character.dynamicUpgrades.length === 0) {
        character.dynamicUpgrades.push(createUpgradePlaceholder());
      }
      return;
    }

    if (row.dataset.dynamicType === "combatSkill") {
      character.dynamicCombatSkills = (character.dynamicCombatSkills || [])
        .filter((entry) => entry.id !== row.dataset.rowId);
      if (character.dynamicCombatSkills.length === 0) {
        character.dynamicCombatSkills.push(createCombatSkillPlaceholder());
      }
      return;
    }

    character.dynamicSkills = (character.dynamicSkills || [])
      .filter((entry) => entry.id !== row.dataset.rowId);
    if (character.dynamicSkills.length === 0) {
      character.dynamicSkills.push(createSkillPlaceholder());
    }
  });

  clearDynamicFieldState(row.dataset.dynamicType, row.dataset.rowId);
  markCharacterDirty();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
}

function clearDynamicFieldState(type, rowId) {
  let fieldNames;
  if (type === "upgrade") {
    fieldNames = [
      `dynamicUpgrade:${rowId}:nome`,
      `dynamicUpgrade:${rowId}:valor`,
    ];
  } else if (type === "combatSkill") {
    fieldNames = [
      `dynamicCombatSkill:${rowId}:nome`,
      `dynamicCombatSkill:${rowId}:atributo1`,
      `dynamicCombatSkill:${rowId}:atributo2`,
      `dynamicCombatSkill:${rowId}:atk`,
      `dynamicCombatSkill:${rowId}:def`,
      `dynamicCombatSkill:${rowId}:atkTeste`,
      `dynamicCombatSkill:${rowId}:defTeste`,
      `dynamicCombatSkill:${rowId}:atributo`,
      `dynamicCombatSkill:${rowId}:valor`,
      `dynamicCombatSkill:${rowId}:teste`,
    ];
  } else {
    fieldNames = [
      `dynamicSkill:${rowId}:nome`,
      `dynamicSkill:${rowId}:atributo`,
      `dynamicSkill:${rowId}:valor`,
      `dynamicSkill:${rowId}:teste`,
    ];
  }

  fieldNames.forEach((key) => {
    state.pendingChanges.delete(key);
    state.dirtyMap.delete(key);
  });
}

function addInventoryItemRow() {
  if (!hasActiveCharacter()) {
    return;
  }

  const itemId = crypto.randomUUID();

  mutateActiveCharacter((character) => {
    character.inventoryItems = character.inventoryItems || [];
    character.inventoryItems.push({
      id: itemId,
      item: "",
      quantidade: "",
      peso: "",
      valor: "",
    });
  });

  markCharacterDirty();
  renderInventory();
  openInventoryDrawer();

  const newField = elements.inventoryRows.querySelector(`[data-inventory-id="${itemId}"][data-inventory-field="item"]`);
  if (newField) {
    newField.focus();
  }
}

function removeInventoryItemRow(itemId) {
  if (!hasActiveCharacter()) {
    return;
  }

  mutateActiveCharacter((character) => {
    character.inventoryItems = (character.inventoryItems || []).filter((entry) => entry.id !== itemId);
  });

  markCharacterDirty();
  renderInventory();
}

function mutateActiveCharacter(mutator) {
  const character = getActiveCharacter();
  if (!character) {
    return;
  }

  mutator(character);
  state.charactersMap[character.id] = character;
}

function markCharacterDirty() {
  state.hasUnsavedChanges = true;
  updateSaveStatus("Salvando", "saving");
  scheduleAutosave();
}

function scheduleAutosave() {
  clearTimeout(state.saveTimer);
  state.saveTimer = setTimeout(() => {
    void flushPendingChanges();
  }, AUTOSAVE_DELAY);
}

async function flushPendingChanges() {
  if (!hasActiveCharacter() || !state.hasUnsavedChanges || state.saveInFlight || state.uploadInFlight) {
    return;
  }

  const activeCharacter = getActiveCharacter();
  if (!activeCharacter) {
    return;
  }

  state.saveInFlight = true;
  updateSaveStatus("Salvando", "saving");

  const characterToSave = cloneCharacter(activeCharacter);
  persistDerivedValues(characterToSave);
  normalizeCharacterCollections(characterToSave);
  characterToSave.updatedAtMs = Date.now();
  characterToSave.updatedAtIso = new Date(characterToSave.updatedAtMs).toISOString();
  characterToSave.revision = (characterToSave.revision || 0) + 1;

  state.charactersMap[characterToSave.id] = characterToSave;

  try {
    await setDoc(doc(db, "characters", characterToSave.id), serializeCharacterForWrite(characterToSave), { merge: true });

    state.pendingChanges.forEach((fieldName) => {
      const field = document.querySelector(`[data-field="${fieldName}"]`);
      if (field) {
        field.classList.remove("saving");
        field.classList.add("saved");
      }
    });

    state.pendingChanges.clear();
    state.dirtyMap.clear();
    state.hasUnsavedChanges = false;
    state.lastRenderedSignature = buildCharacterSignature(characterToSave);

    renderSheetSelector();
    renderSessionSummary();
    queueStatus("Salvo", "saved");
  } catch (error) {
    console.error(error);
    updateSaveStatus("Salvo", "saved");
    alert(formatFirebaseError(error, "Não foi possível salvar a ficha."));
  } finally {
    state.saveInFlight = false;
  }
}

function persistDerivedValues(character) {
  attributeDefinitions.forEach(({ key }) => {
    character[`${key}Teste`] = getFieldValue(`${key}Teste`);
  });

  character.atributosTotal = getFieldValue("atributosTotal");
  character.pv = getFieldValue("pv");
  character.pvAtual = getFieldValue("pvAtual");

  (character.dynamicSkills || []).forEach((row) => {
    row.teste = getFieldValue(`dynamicSkill:${row.id}:teste`);
  });

  (character.dynamicCombatSkills || []).forEach((row) => {
    if (row.combatType === "firearm") {
      row.teste = getFieldValue(`dynamicCombatSkill:${row.id}:teste`);
    } else {
      row.atkTeste = getFieldValue(`dynamicCombatSkill:${row.id}:atkTeste`);
      row.defTeste = getFieldValue(`dynamicCombatSkill:${row.id}:defTeste`);
    }
  });
}

function normalizeCharacterCollections(character) {
  character.dynamicUpgrades = sanitizeUpgradeRows(character.dynamicUpgrades || []);
  character.dynamicSkills = sanitizeSkillRows(character.dynamicSkills || []);
  character.dynamicCombatSkills = sanitizeCombatSkillRows(character.dynamicCombatSkills || []);
  character.inventoryItems = sanitizeInventoryItems(character.inventoryItems || []);
}

async function ensureUserProfile(user) {
  const userRef = doc(db, "users", user.uid);
  const snapshot = await getDoc(userRef);

  if (snapshot.exists()) {
    const existingProfile = normalizeProfile({ id: snapshot.id, ...snapshot.data() }, user);
    const patch = {};
    const normalizedEmail = String(user.email || existingProfile.email || "").trim().toLowerCase();
    const shouldBeMaster = MASTER_EMAILS.includes(normalizedEmail);

    if (existingProfile.displayName !== (user.displayName || existingProfile.displayName)) {
      patch.displayName = user.displayName || existingProfile.displayName;
      existingProfile.displayName = patch.displayName;
    }

    if (existingProfile.email !== (user.email || existingProfile.email)) {
      patch.email = user.email || existingProfile.email;
      existingProfile.email = patch.email;
    }

    if (shouldBeMaster && existingProfile.role !== "gm") {
      patch.role = "gm";
      existingProfile.role = "gm";
    }

    if (Object.keys(patch).length) {
      patch.updatedAtMs = Date.now();
      await setDoc(userRef, patch, { merge: true });
    }

    return existingProfile;
  }

  const role = await determineRoleForNewUser(user.email || "");
  const profile = createUserProfileRecord(user, {
    displayName: user.displayName || deriveDisplayNameFromEmail(user.email),
    email: user.email || "",
    role,
  });

  await setDoc(userRef, serializeProfileForWrite(profile), { merge: true });
  return profile;
}

async function determineRoleForNewUser(email) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (MASTER_EMAILS.includes(normalizedEmail)) {
    return "gm";
  }

  const usersSnapshot = await getDocs(collection(db, "users"));
  const hasGm = usersSnapshot.docs.some((item) => item.data().role === "gm");
  return hasGm ? "player" : "gm";
}

async function ensureOwnerHasAtLeastOneCharacter(profile) {
  const existingCharacters = await getDocs(query(collection(db, "characters"), where("ownerId", "==", profile.id)));
  if (!existingCharacters.empty) {
    return;
  }

  const characterRef = doc(collection(db, "characters"));
  const character = createDefaultCharacter(profile, 1);
  await setDoc(characterRef, serializeCharacterForWrite({ ...character, id: characterRef.id }));
}

function subscribeToCharacters() {
  clearCharacterListener();

  const baseCollection = collection(db, "characters");
  const source = state.profile?.role === "gm"
    ? baseCollection
    : query(baseCollection, where("ownerId", "==", state.profile.id));

  state.unsubscribeCharacters = onSnapshot(
    source,
    (snapshot) => {
      const nextMap = {};

      snapshot.forEach((docSnapshot) => {
        const incomingCharacter = normalizeCharacter({ id: docSnapshot.id, ...docSnapshot.data() }, docSnapshot.id);
        const shouldKeepLocal = docSnapshot.id === state.selectedCharacterId
          && (state.hasUnsavedChanges || state.saveInFlight || state.uploadInFlight);

        nextMap[docSnapshot.id] = shouldKeepLocal && state.charactersMap[docSnapshot.id]
          ? state.charactersMap[docSnapshot.id]
          : incomingCharacter;
      });

      state.charactersMap = nextMap;
      rebuildCharacterOrder();

      const previousSelection = state.selectedCharacterId;
      syncSelectedCharacterId();
      const activeCharacter = getActiveCharacter();
      const nextSignature = activeCharacter ? buildCharacterSignature(activeCharacter) : null;

      renderSheetSelector();
      renderSessionSummary();
      showApp();

      if (
        previousSelection !== state.selectedCharacterId
        || (!state.hasUnsavedChanges && !state.saveInFlight && state.lastRenderedSignature !== nextSignature)
      ) {
        renderCharacterWorkspace();
      }
    },
    (error) => {
      console.error(error);
      alert(formatFirebaseError(error, "Não foi possível sincronizar as fichas."));
    },
  );
}

function clearCharacterListener() {
  if (state.unsubscribeCharacters) {
    state.unsubscribeCharacters();
    state.unsubscribeCharacters = null;
  }
}

function rebuildCharacterOrder() {
  state.charactersOrder = Object.values(state.charactersMap)
    .sort((left, right) => {
      if (state.profile?.role === "gm") {
        const ownerCompare = String(left.ownerDisplayName || "").localeCompare(String(right.ownerDisplayName || ""), "pt-BR");
        if (ownerCompare !== 0) {
          return ownerCompare;
        }
      }

      return String(left.nome || "").localeCompare(String(right.nome || ""), "pt-BR");
    })
    .map((character) => character.id);
}

function syncSelectedCharacterId() {
  if (!state.authUser) {
    state.selectedCharacterId = null;
    return;
  }

  const orderedIds = state.charactersOrder;
  if (!orderedIds.length) {
    state.selectedCharacterId = null;
    persistSelectedCharacter();
    return;
  }

  if (state.selectedCharacterId && state.charactersMap[state.selectedCharacterId]) {
    persistSelectedCharacter();
    return;
  }

  const cache = readStorage(STORAGE_KEYS.selectedCharacterByUser) || {};
  const cachedCharacterId = cache[state.authUser.uid];

  if (cachedCharacterId && state.charactersMap[cachedCharacterId]) {
    state.selectedCharacterId = cachedCharacterId;
    persistSelectedCharacter();
    return;
  }

  state.selectedCharacterId = orderedIds[0];
  persistSelectedCharacter();
}

function persistSelectedCharacter() {
  if (!state.authUser) {
    return;
  }

  const cache = readStorage(STORAGE_KEYS.selectedCharacterByUser) || {};
  cache[state.authUser.uid] = state.selectedCharacterId;
  writeStorage(STORAGE_KEYS.selectedCharacterByUser, cache);
}

function resolveCharacterOwnerProfile() {
  const activeCharacter = getActiveCharacter();

  if (state.profile?.role === "gm" && activeCharacter) {
    return {
      id: activeCharacter.ownerId,
      displayName: activeCharacter.ownerDisplayName || state.profile.displayName,
      email: activeCharacter.ownerEmail || "",
      role: "player",
    };
  }

  return state.profile;
}

function createUserProfileRecord(user, { displayName, email, role }) {
  const now = Date.now();
  return {
    id: user.uid,
    displayName,
    email,
    role,
    createdAtMs: now,
    updatedAtMs: now,
  };
}

function normalizeProfile(rawProfile, user) {
  return {
    id: rawProfile.id || user.uid,
    displayName: rawProfile.displayName || user.displayName || deriveDisplayNameFromEmail(user.email),
    email: rawProfile.email || user.email || "",
    role: rawProfile.role || "player",
    createdAtMs: rawProfile.createdAtMs || Date.now(),
    updatedAtMs: rawProfile.updatedAtMs || Date.now(),
  };
}

function serializeProfileForWrite(profile) {
  return {
    displayName: profile.displayName,
    email: profile.email,
    role: profile.role,
    createdAtMs: profile.createdAtMs,
    updatedAtMs: profile.updatedAtMs,
  };
}

function createDefaultCharacter(ownerProfile, ordinal) {
  const now = Date.now();

  const character = {
    ownerId: ownerProfile.id,
    ownerDisplayName: ownerProfile.displayName,
    ownerEmail: ownerProfile.email || "",
    portraitDataUrl: "",
    portraitStoragePath: "",
    nome: "",
    classeSocialProfissao: "",
    nascimento: "",
    local: "",
    sexo: "",
    altura: "",
    peso: "",
    idadeAparente: "",
    idadeReal: "",
    idiomas: "",
    religiao: "",
    nivel: "1",
    xp: "0",
    ip: "0",
    pv: "",
    dano: "",
    pvAtual: "",
    periciasPontos: "",
    notesText: "",
    historyText: "",
    state: "creation",
    pendingAttributePoint: 0,
    pendingUpgradePoint: 0,
    evolutionUpgradePoints: 0,
    inventoryItems: [],
    dynamicUpgrades: [createUpgradePlaceholder()],
    dynamicSkills: [createSkillPlaceholder()],
    dynamicCombatSkills: [createCombatSkillPlaceholder()],
    revision: 1,
    createdAtMs: now,
    updatedAtMs: now,
    updatedAtIso: new Date(now).toISOString(),
  };

  attributeDefinitions.forEach(({ key }) => {
    character[`${key}Valor`] = "";
    character[`${key}Mod`] = "";
    character[`${key}Teste`] = "";
  });

  character.atributosTotal = "";

  return character;
}

function normalizeCharacter(rawCharacter, characterId) {
  const ownerProfile = {
    id: rawCharacter.ownerId || state.profile?.id || "",
    displayName: rawCharacter.ownerDisplayName || state.profile?.displayName || "Jogador",
    email: rawCharacter.ownerEmail || state.profile?.email || "",
  };

  const fallbackCharacter = createDefaultCharacter(ownerProfile, 1);
  const normalized = {
    ...fallbackCharacter,
    ...rawCharacter,
    id: characterId,
  };

  normalized.dynamicUpgrades = sanitizeUpgradeRows(rawCharacter.dynamicUpgrades || normalized.dynamicUpgrades);
  normalized.dynamicSkills = sanitizeSkillRows(rawCharacter.dynamicSkills || normalized.dynamicSkills);
  normalized.dynamicCombatSkills = sanitizeCombatSkillRows(rawCharacter.dynamicCombatSkills || normalized.dynamicCombatSkills);
  normalized.inventoryItems = sanitizeInventoryItems(rawCharacter.inventoryItems || normalized.inventoryItems);
  if (!normalized.state || !["creation", "play", "evolution"].includes(normalized.state)) {
    normalized.state = rawCharacter.state || "play";
  }

  return normalized;
}

function serializeCharacterForWrite(character) {
  const { id, ...payload } = character;
  return {
    ...payload,
    dynamicUpgrades: sanitizeUpgradeRows(payload.dynamicUpgrades || []),
    dynamicSkills: sanitizeSkillRows(payload.dynamicSkills || []),
    dynamicCombatSkills: sanitizeCombatSkillRows(payload.dynamicCombatSkills || []),
    inventoryItems: sanitizeInventoryItems(payload.inventoryItems || []),
  };
}

function sanitizeUpgradeRows(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id || crypto.randomUUID(),
    nome: row.nome ?? "",
    valor: row.valor ?? "",
    isPlaceholder: Boolean(row.isPlaceholder),
  }));

  if (!normalized.length) {
    return [createUpgradePlaceholder()];
  }

  return keepOnlyFirstPlaceholder(normalized);
}

function sanitizeSkillRows(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id || crypto.randomUUID(),
    nome: row.nome ?? "",
    atributo: row.atributo ?? "",
    valor: row.valor ?? "",
    teste: row.teste ?? "",
    isPlaceholder: Boolean(row.isPlaceholder),
  }));

  if (!normalized.length) {
    return [createSkillPlaceholder()];
  }

  return keepOnlyFirstPlaceholder(normalized);
}

function sanitizeCombatSkillRows(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    const base = {
      id: row.id || crypto.randomUUID(),
      nome: row.nome ?? "",
      combatType: row.combatType ?? "melee",
      combatGroup: row.combatGroup ?? "martial",
      isPlaceholder: Boolean(row.isPlaceholder),
    };
    if (base.combatType === "firearm") {
      return {
        ...base,
        atributo: row.atributo ?? "",
        valor: row.valor ?? "",
        teste: row.teste ?? "",
      };
    }
    return {
      ...base,
      atributo1: row.atributo1 ?? "",
      atributo2: row.atributo2 ?? "",
      atk: row.atk ?? "",
      def: row.def ?? "",
      atkTeste: row.atkTeste ?? "",
      defTeste: row.defTeste ?? "",
    };
  });

  const withoutEmpty = normalized.filter(
    (row) => row.isPlaceholder || (row.nome ?? "").trim() !== ""
  );

  if (!withoutEmpty.length) {
    return [createCombatSkillPlaceholder()];
  }

  return keepOnlyFirstPlaceholder(withoutEmpty);
}

function createCombatSkillPlaceholder() {
  return {
    id: crypto.randomUUID(),
    nome: "",
    combatType: "melee",
    combatGroup: "martial",
    atributo1: "",
    atributo2: "",
    atk: "",
    def: "",
    atkTeste: "",
    defTeste: "",
    isPlaceholder: true,
  };
}

function sanitizeInventoryItems(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id || crypto.randomUUID(),
    item: row.item ?? "",
    quantidade: row.quantidade ?? "",
    peso: row.peso ?? "",
    valor: row.valor ?? "",
  }));
}

function keepOnlyFirstPlaceholder(rows) {
  let foundPlaceholder = false;

  return rows.filter((row) => {
    if (!row.isPlaceholder) {
      return true;
    }

    if (foundPlaceholder) {
      return false;
    }

    foundPlaceholder = true;
    return true;
  });
}

function ensureDynamicRowsForActiveCharacter() {
  if (!hasActiveCharacter()) {
    return;
  }

  mutateActiveCharacter((character) => {
    character.dynamicUpgrades = sanitizeUpgradeRows(character.dynamicUpgrades || []);
    character.dynamicSkills = sanitizeSkillRows(character.dynamicSkills || []);
    character.dynamicCombatSkills = sanitizeCombatSkillRows(character.dynamicCombatSkills || []);
  });
}

function createUpgradePlaceholder() {
  return {
    id: crypto.randomUUID(),
    nome: "",
    valor: "",
    isPlaceholder: true,
  };
}

function createSkillPlaceholder() {
  return {
    id: crypto.randomUUID(),
    nome: "",
    atributo: "",
    valor: "",
    teste: "",
    isPlaceholder: true,
  };
}

function handleEvolve() {
  if (!hasActiveCharacter()) return;

  const character = getActiveCharacter();
  if (character.state === "evolution") return;

  const currentLevel = parseInt(character.nivel || "1", 10) || 1;
  const currentXP = parseInt(character.xp || "0", 10) || 0;

  if (!canLevelUp(currentLevel, currentXP)) return;

  const newLevel = currentLevel + 1;

  mutateActiveCharacter((char) => {
    char.state = "evolution";
    char.nivel = String(newLevel);
    char.pendingAttributePoint = (char.pendingAttributePoint || 0) + 1;
    char.evolutionUpgradePoints = (char.evolutionUpgradePoints || 0) + 1;
  });

  setFieldValue("nivel", String(newLevel));

  recalculateDerivedFields();
  renderAttributePendingPoints();
  renderUpgradePendingPoints();
  updateEvolveButtonVisibility();
  applySheetMode();
  markCharacterDirty();
}

function canLevelUp(level, xp) {
  if (level >= 10 || level < 1) return false;
  const nextThreshold = LEVEL_THRESHOLDS[level + 1];
  return nextThreshold !== undefined && xp >= nextThreshold;
}

function updateEvolveButtonVisibility() {
  if (!elements.evolveButton) return;

  const character = getActiveCharacter();
  if (!character) {
    elements.evolveButton.classList.add("hidden");
    return;
  }

  if (character.state === "creation" || character.state === "evolution") {
    elements.evolveButton.classList.add("hidden");
    return;
  }

  const level = parseInt(character.nivel || "1", 10) || 1;
  const xp = parseInt(character.xp || "0", 10) || 0;
  elements.evolveButton.classList.toggle("hidden", !canLevelUp(level, xp));
}

function renderAttributePendingPoints() {
  const character = getActiveCharacter();
  const hasPending = (character?.pendingAttributePoint || 0) > 0;

  document.querySelectorAll(".attr-point-btn").forEach((btn) => {
    btn.classList.toggle("hidden", !hasPending);
  });
}

function bindAttrPointEvents() {
  document.querySelectorAll(".attr-point-btn").forEach((btn) => {
    if (btn.dataset.bound === "true") return;
    btn.dataset.bound = "true";
    btn.addEventListener("click", handleAttrPointClick);
  });
}

function handleAttrPointClick(event) {
  const btn = event.currentTarget;
  const attrKey = btn.dataset.attrKey;
  if (!attrKey || !hasActiveCharacter()) return;

  const fieldName = `${attrKey}Valor`;
  const currentValue = parseInt(getFieldValue(fieldName) || "0", 10) || 0;
  const newValue = String(currentValue + 1);

  setFieldValue(fieldName, newValue);
  applyFieldValueToCharacter(fieldName, newValue);

  mutateActiveCharacter((char) => {
    char.pendingAttributePoint = Math.max(0, (char.pendingAttributePoint || 0) - 1);
  });

  recalculateDerivedFields();
  renderAttributePendingPoints();
  markCharacterDirty();
}

function renderUpgradePendingPoints() {
  const character = getActiveCharacter();
  const hasPending = (character?.pendingUpgradePoint || 0) > 0;

  if (elements.upgradePointBadge) {
    elements.upgradePointBadge.classList.toggle("hidden", !hasPending);
  }
}

function consumeUpgradePendingPoint() {
  const character = getActiveCharacter();
  if (!character || (character.pendingUpgradePoint || 0) <= 0) return;

  mutateActiveCharacter((char) => {
    char.pendingUpgradePoint = Math.max(0, (char.pendingUpgradePoint || 0) - 1);
  });

  renderUpgradePendingPoints();
}

function deductSkillCostFromXP(skillValorKey, newValueStr) {
  const character = getActiveCharacter();
  if (!character) return;

  const [, rowId] = skillValorKey.split(":");
  const row = (character.dynamicSkills || []).find((r) => r.id === rowId);

  const oldValue = parseInt(row?.valor || "0", 10) || 0;
  const newValue = parseInt(newValueStr || "0", 10) || 0;
  const delta = newValue - oldValue;

  if (delta <= 0) return;

  const currentXP = parseInt(getFieldValue("xp") || "0", 10) || 0;
  const newXP = Math.max(0, currentXP - delta);
  const newXPStr = String(newXP);

  setFieldValue("xp", newXPStr);
  applyFieldValueToCharacter("xp", newXPStr);
  state.pendingChanges.add("xp");
  state.dirtyMap.set("xp", newXPStr);
}

function hasActiveCharacter() {
  return Boolean(getActiveCharacter());
}

function getActiveCharacter() {
  if (!state.selectedCharacterId) {
    return null;
  }

  return state.charactersMap[state.selectedCharacterId] || null;
}

function getOrderedCharacters() {
  return state.charactersOrder
    .map((id) => state.charactersMap[id])
    .filter(Boolean);
}

function resolveFieldValue(character, key) {
  if (key.startsWith("dynamicUpgrade:")) {
    const [, rowId, prop] = key.split(":");
    const row = (character.dynamicUpgrades || []).find((entry) => entry.id === rowId);
    return row?.[prop] ?? "";
  }

  if (key.startsWith("dynamicSkill:")) {
    const [, rowId, prop] = key.split(":");
    const row = (character.dynamicSkills || []).find((entry) => entry.id === rowId);
    return row?.[prop] ?? "";
  }

  if (key.startsWith("dynamicCombatSkill:")) {
    const [, rowId, prop] = key.split(":");
    const row = (character.dynamicCombatSkills || []).find((entry) => entry.id === rowId);
    return row?.[prop] ?? "";
  }

  return character[key] ?? "";
}

function applyFieldValueToCharacter(key, value) {
  mutateActiveCharacter((character) => {
    if (key.startsWith("dynamicUpgrade:")) {
      const [, rowId, prop] = key.split(":");
      const row = (character.dynamicUpgrades || []).find((entry) => entry.id === rowId);
      if (!row) {
        return;
      }

      row[prop] = value;
      return;
    }

    if (key.startsWith("dynamicSkill:")) {
      const [, rowId, prop] = key.split(":");
      const row = (character.dynamicSkills || []).find((entry) => entry.id === rowId);
      if (!row) {
        return;
      }

      row[prop] = value;
      return;
    }

    if (key.startsWith("dynamicCombatSkill:")) {
      const [, rowId, prop] = key.split(":");
      const row = (character.dynamicCombatSkills || []).find((entry) => entry.id === rowId);
      if (!row) {
        return;
      }

      row[prop] = value;
      return;
    }

    character[key] = value;
  });
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

function buildCharacterSignature(character) {
  return `${character.id}:${character.revision || 0}:${character.updatedAtMs || 0}`;
}

function cloneCharacter(character) {
  return JSON.parse(JSON.stringify(character));
}

function showLoading(text) {
  elements.loadingText.textContent = text;
  elements.loadingCard.classList.remove("hidden");
  elements.loginCard.classList.add("hidden");
  elements.appCard.classList.add("hidden");
  elements.sessionSummary.classList.add("hidden");
}

function showLogin() {
  elements.loadingCard.classList.add("hidden");
  elements.loginCard.classList.remove("hidden");
  elements.appCard.classList.add("hidden");
  elements.sessionSummary.classList.add("hidden");
  elements.gmTools.classList.add("hidden");
  restoreRememberedLogin();
  updateSaveStatus("Salvo", "saved");
}

function showApp() {
  elements.loadingCard.classList.add("hidden");
  elements.loginCard.classList.add("hidden");
  elements.appCard.classList.remove("hidden");
}

function resetAppState() {
  clearTimeout(state.saveTimer);
  clearTimeout(state.saveResetTimer);

  state.authUser = null;
  state.profile = null;
  state.charactersMap = {};
  state.charactersOrder = [];
  state.selectedCharacterId = null;
  state.pendingChanges.clear();
  state.dirtyMap.clear();
  state.hasUnsavedChanges = false;
  state.saveInFlight = false;
  state.uploadInFlight = false;
  state.lastRenderedSignature = null;

  closeAllDrawers();
  hydrateForm();
  renderPortrait();
  renderInventory();
  renderNotes();
  renderHistory();
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
      clearFieldSavedStates();
      updateSaveStatus("Salvo", "saved");
    }, SAVE_IDLE);
  }
}

function sanitizeIntegerInput(value) {
  return String(value || "")
    .replace(/[^\d-]/g, "")
    .replace(/(?!^)-/g, "");
}

function sanitizeDamageInput(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  if (!digits) {
    return "";
  }

  const numericValue = parseInt(digits, 10) || 0;
  if (numericValue === 0) {
    return "0";
  }

  return `-${numericValue}`;
}

function formatDerivedNumber(value) {
  return Number.isInteger(value) ? String(value) : String(value).replace(".", ",");
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

function persistRememberedLogin({ email, password, shouldRemember }) {
  if (!shouldRemember) {
    writeStorage(STORAGE_KEYS.rememberedLogin, null);
    return;
  }

  writeStorage(STORAGE_KEYS.rememberedLogin, {
    email,
    password,
    rememberLogin: true,
  });
}

function restoreRememberedLogin() {
  const remembered = readStorage(STORAGE_KEYS.rememberedLogin);

  if (!remembered?.rememberLogin) {
    elements.loginForm.reset();
    elements.loginInput.focus();
    return;
  }

  elements.loginInput.value = remembered.email || "";
  elements.passwordInput.value = remembered.password || "";
  elements.rememberLogin.checked = true;

  if (remembered.email && remembered.password) {
    elements.passwordInput.focus();
    elements.passwordInput.setSelectionRange(elements.passwordInput.value.length, elements.passwordInput.value.length);
    return;
  }

  if (remembered.email) {
    elements.passwordInput.focus();
    return;
  }

  elements.loginInput.focus();
}

function deriveDisplayNameFromEmail(email) {
  const prefix = String(email || "").split("@")[0] || "Jogador";
  return prefix
    .replace(/[._-]+/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function resolveSessionCharacterName(character) {
  if (!character) {
    return "Sem ficha";
  }

  const name = String(character.nome || "").trim();
  if (name) {
    return name;
  }

  return "Sem nome";
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function formatFirebaseError(error, fallbackMessage) {
  const code = String(error?.code || "");
  const map = {
    "auth/email-already-in-use": "Já existe uma conta com esse e-mail.",
    "auth/invalid-email": "O e-mail informado é inválido.",
    "auth/invalid-credential": "E-mail ou senha inválidos.",
    "auth/weak-password": "A senha deve ter ao menos 6 caracteres.",
    "auth/network-request-failed": "Falha de rede. Verifique sua conexão e tente novamente.",
    "auth/too-many-requests": "Muitas tentativas. Aguarde um pouco e tente novamente.",
    "storage/unauthorized": "Você não tem permissão para enviar essa imagem.",
  };

  return map[code] || fallbackMessage;
}

async function tryBootstrapMasterAccount(email, password, loginError) {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (!MASTER_EMAILS.includes(normalizedEmail) || !isCredentialMismatchError(loginError)) {
    return false;
  }

  showLoading("Criando acesso de mestre...");

  try {
    const credential = await createUserWithEmailAndPassword(auth, normalizedEmail, password);
    const masterProfile = MASTER_DEFAULT_PROFILES[normalizedEmail] || {
      displayName: deriveDisplayNameFromEmail(normalizedEmail),
    };

    await updateProfile(credential.user, {
      displayName: masterProfile.displayName,
    });

    return true;
  } catch (creationError) {
    console.error(creationError);
    restoreRememberedLogin();
    showLogin();
    alert(formatFirebaseError(creationError, "Não foi possível preparar o acesso de mestre."));
    return false;
  }
}

function isCredentialMismatchError(error) {
  const code = String(error?.code || "");
  return [
    "auth/invalid-credential",
    "auth/user-not-found",
    "auth/wrong-password",
    "auth/invalid-login-credentials",
  ].includes(code);
}

function togglePasswordVisibility(input, button) {
  const isVisible = input.type === "text";
  input.type = isVisible ? "password" : "text";
  button.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
  button.setAttribute("aria-pressed", String(!isVisible));

  const openIcon = button.querySelector(".eye-open");
  const closedIcon = button.querySelector(".eye-closed");

  if (openIcon && closedIcon) {
    openIcon.classList.toggle("hidden", !isVisible);
    closedIcon.classList.toggle("hidden", isVisible);
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

function escapeAttribute(text) {
  return String(text)
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function clearFieldSavedStates() {
  document.querySelectorAll("[data-field].saved, [data-field].saving").forEach((field) => {
    field.classList.remove("saved", "saving");
  });
}
