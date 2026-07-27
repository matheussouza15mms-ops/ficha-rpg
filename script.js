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
  runTransaction,
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

// Retrato por numeração fixa da ficha.
//
// Cada personagem recebe, na criação, um `portraitNumber` que nunca muda e
// nunca é reaproveitado (vem de um contador transacional em
// counters/characterPortrait). O retrato exibido é o arquivo
// imagens/personagens/img_<numero>.png. Como o número é do documento, e não da
// posição na lista, excluir uma ficha não faz as outras trocarem de imagem.
const PORTRAIT_IMAGE_DIR = "./imagens/personagens";
const PORTRAIT_IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "webp"];
const PORTRAIT_COUNTER_PATH = ["counters", "characterPortrait"];

// Foto de contato segue a mesma ideia do retrato: cada contato criado recebe um
// `photoNumber` de um contador transacional (counters/contactPhoto) e a imagem
// exibida é imagens/contatos/img_ctt_<numero>.png. Como o número é global e
// nunca reaproveitado, excluir um contato não faz outro herdar a foto.
const CONTACT_IMAGE_DIR = "./imagens/contatos";
const CONTACT_COUNTER_PATH = ["counters", "contactPhoto"];
const CONTACT_TYPES = ["contato", "aliado", "patrono"];
const CONTACT_TYPE_LABELS = {
  contato: "Contato",
  aliado: "Aliado",
  patrono: "Patrono",
};

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

/* ==========================================================================
   Equipamento: slots de arma e mochila
   ========================================================================== */

const EQUIPMENT_SLOT_DEFS = [
  { key: "primary", label: "Arma Principal", hint: "Fuzis, escopetas, espadas" },
  { key: "secondary", label: "Arma Secundária", hint: "Apoio ou reserva" },
  { key: "holsterRight", label: "Coldre Direito", hint: "Saque rápido" },
  { key: "holsterLeft", label: "Coldre Esquerdo", hint: "Saque rápido" },
];

const BACKPACK_SIZES = {
  pequena: { label: "Pequena", slots: 8 },
  media: { label: "Média", slots: 16 },
  grande: { label: "Grande", slots: 24 },
};

const DEFAULT_BACKPACK_SIZE = "media";

// Ícones genéricos desenhados em SVG (viewBox 0 0 64 64, preenchidos com
// currentColor). São silhuetas: servem para identificar o tipo da arma no slot,
// não para representar um modelo específico.
const WEAPON_ICONS = [
  {
    id: "pistola", label: "Pistola", kind: "firearm",
    shape: `<rect x="6" y="16" width="46" height="10" rx="2"/><rect x="48" y="12" width="3" height="4"/><rect x="6" y="26" width="30" height="4"/><polygon points="24,30 34,30 32,36 26,36"/><polygon points="8,30 24,30 18,53 2,53"/>`,
  },
  {
    id: "revolver", label: "Revólver", kind: "firearm",
    shape: `<rect x="34" y="20" width="26" height="6" rx="1"/><rect x="34" y="26" width="22" height="3"/><rect x="10" y="18" width="26" height="10" rx="2"/><circle cx="26" cy="27" r="9"/><polygon points="8,14 15,14 15,20 8,20"/><polygon points="8,28 20,28 16,53 2,51"/>`,
  },
  {
    id: "smg", label: "Submetralhadora", kind: "firearm",
    shape: `<rect x="8" y="18" width="36" height="11" rx="2"/><rect x="44" y="21" width="16" height="5" rx="1"/><polygon points="2,20 8,20 8,29 2,31"/><rect x="12" y="13" width="4" height="5"/><rect x="18" y="29" width="8" height="21" rx="2"/><polygon points="32,29 40,29 37,43 30,43"/>`,
  },
  {
    id: "carabina", label: "Carabina", kind: "firearm",
    shape: `<polygon points="2,24 20,19 20,33 10,39 2,37"/><rect x="20" y="22" width="22" height="8" rx="1"/><rect x="34" y="16" width="4" height="6" rx="1"/><rect x="42" y="24" width="12" height="6" rx="2"/><rect x="54" y="25" width="8" height="4" rx="1"/><polygon points="24,30 30,30 28,38 23,38"/>`,
  },
  {
    id: "fuzil", label: "Fuzil de Assalto", kind: "firearm",
    shape: `<polygon points="2,20 14,20 14,30 6,35 2,33"/><rect x="14" y="19" width="32" height="11" rx="2"/><rect x="18" y="13" width="9" height="6" rx="1"/><rect x="46" y="22" width="16" height="5" rx="1"/><path d="M24 30h9l4 16-10 3-3-19Z"/><polygon points="34,30 42,30 39,44 32,44"/>`,
  },
  {
    id: "sniper", label: "Fuzil de Precisão", kind: "firearm",
    shape: `<polygon points="2,26 18,22 18,34 8,40 2,38"/><rect x="18" y="24" width="26" height="9" rx="2"/><rect x="44" y="26" width="18" height="4" rx="1"/><rect x="22" y="11" width="22" height="8" rx="4"/><rect x="26" y="19" width="3" height="5"/><rect x="37" y="19" width="3" height="5"/><polygon points="24,33 30,33 28,40 23,40"/><polygon points="47,30 50,30 55,46 52,46"/><polygon points="47,30 50,30 45,46 42,46"/>`,
  },
  {
    id: "shotgun", label: "Escopeta", kind: "firearm",
    shape: `<polygon points="2,20 20,15 20,35 8,41 2,39"/><rect x="20" y="19" width="42" height="5" rx="1"/><rect x="20" y="26" width="42" height="5" rx="1"/><rect x="32" y="31" width="15" height="5" rx="2"/><polygon points="23,31 29,31 27,39 22,39"/>`,
  },
  {
    id: "metralhadora", label: "Metralhadora", kind: "firearm",
    shape: `<polygon points="2,20 14,20 14,30 6,35 2,33"/><rect x="14" y="18" width="32" height="12" rx="2"/><rect x="20" y="11" width="18" height="5" rx="2"/><rect x="46" y="21" width="16" height="5" rx="1"/><rect x="15" y="30" width="17" height="13" rx="2"/><polygon points="36,30 44,30 41,44 34,44"/><polygon points="52,26 55,26 59,44 56,44"/><polygon points="52,26 55,26 51,44 48,44"/>`,
  },
  {
    id: "arco", label: "Arco", kind: "firearm",
    shape: `<path d="M22 4c15 11 15 45 0 56l-6-3c13-11 13-39 0-50l6-3Z"/><rect x="20" y="6" width="2.5" height="52" rx="1"/><rect x="24" y="30" width="30" height="3.5" rx="1"/><polygon points="53,25 63,31.5 53,38"/><polygon points="24,26 31,31.5 24,37"/>`,
  },
  {
    id: "besta", label: "Besta", kind: "firearm",
    shape: `<path d="M3 15C18 7 46 7 61 15l-2 6C46 14 18 14 5 21l-2-6Z"/><polygon points="6,17 32,31 58,17 58,21 32,35 6,21"/><rect x="28" y="18" width="8" height="40" rx="3"/><polygon points="32,3 37,15 27,15"/>`,
  },
  {
    id: "faca", label: "Faca", kind: "melee",
    shape: `<g transform="rotate(-40 32 32)"><path d="M27 14c0-3 2-5 5-5s5 2 5 5v22H27V14Z"/><rect x="22" y="36" width="20" height="3.5" rx="1"/><rect x="27" y="39" width="10" height="17" rx="4"/></g>`,
  },
  {
    id: "punhal", label: "Punhal", kind: "melee",
    shape: `<g transform="rotate(-40 32 32)"><path d="M32 4l5 12v20H27V16l5-12Z"/><rect x="19" y="36" width="26" height="4.5" rx="2"/><rect x="29" y="40" width="6" height="13" rx="3"/><rect x="25" y="52" width="14" height="5" rx="2"/></g>`,
  },
  {
    id: "katana", label: "Katana", kind: "melee",
    shape: `<g transform="rotate(-40 32 32)"><path d="M26 38C24 24 26 12 33 3c2 11 3 23 3 35H26Z"/><rect x="21" y="38" width="19" height="4" rx="2"/><rect x="26" y="42" width="9" height="19" rx="4"/></g>`,
  },
  {
    id: "espada", label: "Espada", kind: "melee",
    shape: `<g transform="rotate(-40 32 32)"><path d="M32 2l6 14v22H26V16l6-14Z"/><rect x="15" y="38" width="34" height="5" rx="2"/><rect x="29" y="43" width="6" height="13" rx="2"/><circle cx="32" cy="58" r="4.5"/></g>`,
  },
  {
    id: "sabre", label: "Sabre", kind: "melee",
    shape: `<g transform="rotate(-35 32 32)"><path d="M24 40C20 26 24 12 37 2c-3 13-2 27 2 38H24Z"/><rect x="19" y="40" width="21" height="4" rx="2"/><path d="M37 43c5 6 5 13-2 17h-5c6-4 6-11 1-17h6Z"/><rect x="25" y="44" width="8" height="14" rx="3"/></g>`,
  },
  {
    id: "machete", label: "Facão", kind: "melee",
    shape: `<g transform="rotate(-40 32 32)"><path d="M25 5h7c6 12 9 23 9 33H25V5Z"/><rect x="24" y="38" width="13" height="19" rx="5"/></g>`,
  },
  {
    id: "machado", label: "Machado", kind: "melee",
    shape: `<g transform="rotate(-22 32 32)"><rect x="27" y="6" width="8" height="52" rx="4"/><path d="M34 7c11 1 19 7 21 16-2 10-10 16-21 17V7Z"/></g>`,
  },
  {
    id: "lanca", label: "Lança", kind: "melee",
    shape: `<g transform="rotate(-35 32 32)"><rect x="29" y="17" width="6" height="45" rx="3"/><path d="M32 1l9 17H23l9-17Z"/><rect x="26" y="18" width="12" height="4.5" rx="2"/></g>`,
  },
  {
    id: "porrete", label: "Porrete", kind: "melee",
    shape: `<g transform="rotate(-35 32 32)"><path d="M32 3c9 0 16 7 16 16s-7 15-16 15-16-6-16-15S23 3 32 3Z"/><rect x="27" y="32" width="9" height="26" rx="4"/><rect x="24" y="54" width="15" height="5" rx="2"/></g>`,
  },
  {
    id: "soco", label: "Soco-inglês", kind: "melee",
    shape: `<path fill-rule="evenodd" d="M9 21h46a9 9 0 0 1 0 22H9a9 9 0 0 1 0-22Zm5 5a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm13 0a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm13 0a6 6 0 1 0 0 12 6 6 0 0 0 0-12Zm13 0a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z"/>`,
  },
];

const WEAPON_ICON_MAP = new Map(WEAPON_ICONS.map((icon) => [icon.id, icon]));

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
  portraitAttempt: 0,
  portraitNumberRequests: new Set(),
  portraitBackfillInFlight: false,
  contactPhotoAttempt: 0,
  selectedContactId: null,
  skillCatalogSelection: null,
  combatSkillCatalogSelection: null,
  upgradeCatalogSelection: null,
  upgradeCatalogTab: "positive",
  kitCatalogSelection: null,
  weaponPicker: { slotKey: null, iconId: "", filter: "all" },
  kits: [],
  viewportFrame: 0,
  wizard: {
    active: false,
    index: 0,
    characterId: null,
    spotlight: null,
    // Cada troca de passo ganha um número: renderizações antigas que ainda
    // estavam esperando a rolagem terminar se cancelam sozinhas.
    renderToken: 0,
    scrollLocked: false,
    // Fichas para as quais o passo a passo já foi oferecido nesta sessão.
    offered: new Set(),
  },
};

// Passo a passo de criação de personagem. A ordem segue a sequência pedida:
// Identificação -> Atributos -> Kits/Perícias -> Aprimoramentos -> Pertences -> História.
const WIZARD_STEPS = [
  {
    id: "welcome",
    layout: "center",
    label: "O começo",
    title: "🧟‍♂️ Um novo sobrevivente desperta 🩸",
    text: "O mundo já não é o mesmo. Entre os escombros e os gemidos ao longe, alguém ainda respira — e essa pessoa é sua.\n\nVou te guiar passo a passo na criação da ficha. A qualquer momento você pode voltar e refazer o que não gostou.",
    nextLabel: "Iniciar criação ☠️",
  },
  {
    id: "identificacao",
    label: "Identificação",
    title: "🪪 Quem é esse sobrevivente?",
    text: "Preencha nome, origem, idade e demais dados pessoais. A profissão fica em branco de propósito: ela é definida mais à frente, pelo kit ou pelo nome que você criar.\n\nA idade real e a inteligência definem quantos pontos de perícia você terá mais adiante — escolha com cuidado.",
    target: () => document.getElementById("identificationGrid")?.closest(".panel"),
    focus: () => document.querySelector('[data-field="nome"]'),
  },
  {
    id: "atributos",
    label: "Atributos",
    title: "💪 A carne e o nervo",
    text: "Distribua os 101 pontos entre os oito atributos. O contador no topo do painel mostra quanto ainda resta.\n\nCON e FR definem seus pontos de vida; INT amplia suas perícias; AGI e DEX mandam no combate.",
    target: () => document.getElementById("attributeTable")?.closest(".panel"),
    focus: () => document.querySelector('[data-field="conValor"]'),
  },
  {
    id: "profissao",
    label: "Profissão",
    title: "🧰 De onde vem o seu sustento?",
    text: "Quer comprar um kit de profissão pronto? Ele já traz as perícias, as perícias de combate e os aprimoramentos daquele ofício, cobrando pontos por isso.\n\nSe preferir, diga não e crie o nome da sua própria profissão — aí você monta as perícias do seu jeito.",
    // Este passo não usa o botão "Avançar": quem manda são os dois botões de
    // escolha, e cada caminho grava a profissão antes de seguir.
    choices: true,
    // Sem alvo de propósito: a pergunta se resolve inteira dentro do popup, sem
    // arrastar o jogador de volta para o painel de identificação.
  },
  {
    id: "pericias",
    label: "Kits & Perícias",
    title: "🎯 O que você sabe fazer",
    text: "Aqui você ajusta as perícias na mão com \"+ Adicionar perícia\" — inclusive as que vieram do kit, se você comprou um.\n\nAs perícias de combate ficam logo abaixo e consomem os mesmos pontos.",
    target: () => document.getElementById("skillsTable")?.closest(".panel"),
  },
  {
    id: "aprimoramentos",
    label: "Aprimoramentos",
    title: "🧬 Dons e maldições",
    text: "Você tem 5 pontos para aprimoramentos positivos. Aprimoramentos negativos devolvem até 3 pontos extras — todo poder cobra seu preço.\n\nPasse o mouse no ícone ⓘ de cada linha para reler a descrição quando quiser.",
    target: () => document.getElementById("upgradesGrid")?.closest(".panel"),
  },
  {
    id: "pertences",
    label: "Pertences",
    title: "🎒 O que cabe na mochila",
    text: "No topo ficam os quatro slots de arma: principal, secundária e os dois coldres. Toque em um slot vazio para escolher o ícone e depois preencha nome, dano, cadência e munição.\n\nLogo abaixo está a mochila. Escolha a capacidade (pequena, média ou grande) e vá preenchendo os slots com o que o personagem carrega.",
    target: () => elements.inventoryDrawer,
    onEnter: () => openInventoryDrawer(),
    onLeave: () => closeInventoryDrawer(),
    // A gaveta entra deslizando pela direita: medir antes do fim da animação
    // colocaria o popup perseguindo uma posição que ainda estava mudando.
    settleMs: 380,
  },
  {
    id: "historia",
    label: "História",
    title: "📖 Antes de tudo desabar",
    text: "Conte o passado do personagem: quem era, o que perdeu e o que ainda o mantém de pé.\n\nEsse texto é seu — escreva à vontade.",
    target: () => elements.historyDrawer,
    onEnter: () => openHistoryDrawer(),
    onLeave: () => closeHistoryDrawer(),
    settleMs: 380,
  },
  {
    id: "finish",
    layout: "center",
    label: "Fim",
    title: "☠️ A ficha está de pé",
    text: "Pronto! Agora a ficha volta ao normal e você pode revisar tudo com calma, ajustar o que quiser e, quando estiver satisfeito, clicar em Salvar para entrar no modo de Jogo.\n\nBoa sorte lá fora. 🧟",
    nextLabel: "Revisar ficha 🔎",
  },
];

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
  elements.printSheetButton = document.getElementById("printSheetButton");
  elements.gmTools = document.getElementById("gmTools");
  elements.sheetSelector = document.getElementById("sheetSelector");
  elements.portraitFrame = document.getElementById("portraitFrame");
  elements.portraitImage = document.getElementById("portraitImage");
  elements.portraitPlaceholder = document.getElementById("portraitPlaceholder");
  elements.removePortraitButton = document.getElementById("removePortraitButton");
  elements.portraitCodeBadge = document.getElementById("portraitCodeBadge");
  elements.portraitFileHint = document.getElementById("portraitFileHint");
  elements.portraitFileName = document.getElementById("portraitFileName");
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
  elements.equipmentSlots = document.getElementById("equipmentSlots");
  elements.backpackSize = document.getElementById("backpackSize");
  elements.backpackFooter = document.getElementById("backpackFooter");
  elements.weaponPickerDialog = document.getElementById("weaponPickerDialog");
  elements.weaponPickerSlotLabel = document.getElementById("weaponPickerSlotLabel");
  elements.weaponPickerFilters = document.getElementById("weaponPickerFilters");
  elements.weaponPickerGrid = document.getElementById("weaponPickerGrid");
  elements.cancelWeaponPicker = document.getElementById("cancelWeaponPicker");
  elements.confirmWeaponPicker = document.getElementById("confirmWeaponPicker");
  elements.clearWeaponPicker = document.getElementById("clearWeaponPicker");
  elements.notesFab = document.getElementById("notesFab");
  elements.notesDrawer = document.getElementById("notesDrawer");
  elements.closeNotesDrawer = document.getElementById("closeNotesDrawer");
  elements.notesTextarea = document.getElementById("notesTextarea");
  elements.historyFab = document.getElementById("historyFab");
  elements.historyDrawer = document.getElementById("historyDrawer");
  elements.closeHistoryDrawer = document.getElementById("closeHistoryDrawer");
  elements.historyTextarea = document.getElementById("historyTextarea");
  elements.contactsFab = document.getElementById("contactsFab");
  elements.contactsDrawer = document.getElementById("contactsDrawer");
  elements.closeContactsDrawer = document.getElementById("closeContactsDrawer");
  elements.contactsDrawerTitle = document.getElementById("contactsDrawerTitle");
  elements.contactsBackButton = document.getElementById("contactsBackButton");
  elements.contactsListView = document.getElementById("contactsListView");
  elements.contactsDetailView = document.getElementById("contactsDetailView");
  elements.contactsList = document.getElementById("contactsList");
  elements.contactsEmpty = document.getElementById("contactsEmpty");
  elements.contactTypeSelect = document.getElementById("contactTypeSelect");
  elements.addContactButton = document.getElementById("addContactButton");
  elements.contactPhotoFrame = document.getElementById("contactPhotoFrame");
  elements.contactPhotoImage = document.getElementById("contactPhotoImage");
  elements.contactPhotoHint = document.getElementById("contactPhotoHint");
  elements.contactPhotoFileName = document.getElementById("contactPhotoFileName");
  elements.contactPhotoBadge = document.getElementById("contactPhotoBadge");
  elements.contactInfosList = document.getElementById("contactInfosList");
  elements.addContactInfoButton = document.getElementById("addContactInfoButton");
  elements.deleteContactButton = document.getElementById("deleteContactButton");
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
  elements.wizardOverlay = document.getElementById("wizardOverlay");
  elements.wizardPopup = document.getElementById("wizardPopup");
  elements.wizardPopupInner = elements.wizardPopup?.querySelector(".wizard-popup-inner") || null;
  elements.wizardStepLabel = document.getElementById("wizardStepLabel");
  elements.wizardTitle = document.getElementById("wizardTitle");
  elements.wizardText = document.getElementById("wizardText");
  elements.wizardDots = document.getElementById("wizardDots");
  elements.wizardActions = document.getElementById("wizardActions");
  elements.wizardBack = document.getElementById("wizardBack");
  elements.wizardNext = document.getElementById("wizardNext");
  elements.wizardSkip = document.getElementById("wizardSkip");
  elements.wizardChoices = document.getElementById("wizardChoices");
  elements.wizardChoiceKits = document.getElementById("wizardChoiceKits");
  elements.wizardChoiceInvent = document.getElementById("wizardChoiceInvent");
  elements.wizardInvent = document.getElementById("wizardInvent");
  elements.wizardInventInput = document.getElementById("wizardInventInput");
  elements.wizardInventConfirm = document.getElementById("wizardInventConfirm");
  elements.toastStack = document.getElementById("toastStack");
  elements.upgradeTooltip = document.getElementById("upgradeTooltip");
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
      <input type="text" inputmode="text" data-field="${key}Mod" data-modifier="true" placeholder="-0" title="Use + para somar e - (ou nenhum sinal) para subtrair.">
      <input type="text" data-field="${key}Teste" readonly>
      <button type="button" class="attr-point-btn hidden" data-attr-key="${key}" aria-label="Adicionar +1 em ${label}">+1</button>
    `;
    table.appendChild(row);
  });

  const totalRow = document.createElement("div");
  totalRow.className = "attribute-row attribute-total-row";
  totalRow.innerHTML = `
    <div class="attribute-name">TOTAL</div>
    <input type="text" data-field="atributosTotal" readonly>
  `;
  table.appendChild(totalRow);
}

function buildGridFields(container, fields, centered = false) {
  container.innerHTML = "";

  fields.forEach(([key, label]) => {
    const wrapper = document.createElement("label");
    // A profissão não se digita: vem do kit comprado ou do nome inventado no
    // passo a passo de criação.
    const isProfession = key === "classeSocialProfissao";
    const isDerivedStatusField = key === "pv" || key === "pvAtual" || isProfession;
    wrapper.className = "grid-field";
    wrapper.innerHTML = `
      <span>${label}</span>
      <input type="text" data-field="${key}"${isDerivedStatusField ? " readonly" : ""}>
    `;

    if (isProfession) {
      const input = wrapper.querySelector("input");
      input.classList.add("profession-input");
      input.placeholder = "Definida na criação";
      input.addEventListener("click", handleProfessionFieldClick);
    }

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

  decorateUpgradeInfoIcons();
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
    <span class="upgrade-name-cell">
      <input type="text" data-field="${nameField}" aria-label="Nome do aprimoramento ${ariaIndex}">
    </span>
    <input type="text" inputmode="numeric" data-field="${valueField}" aria-label="Valor do aprimoramento ${ariaIndex}">
  `;

  return row;
}

/**
 * Mantém o ícone ⓘ de cada linha de aprimoramento em sincronia com o catálogo.
 * O ícone só aparece quando existe uma descrição correspondente, e fica visível
 * tanto na criação quanto no modo de Jogo.
 */
function decorateUpgradeInfoIcons() {
  if (!elements.upgradesGrid) {
    return;
  }

  elements.upgradesGrid.querySelectorAll(".upgrade-row").forEach((row) => {
    const cell = row.querySelector(".upgrade-name-cell");
    if (!cell) {
      return;
    }

    const input = cell.querySelector("input[data-field]");
    const modelRow = findDynamicModelRow("upgrade", row.dataset.rowId);
    const name = String(modelRow?.nome ?? input?.value ?? "").trim();
    const entry = findUpgradeCatalogEntry(name);
    let button = cell.querySelector(".upgrade-info");

    if (!entry) {
      if (button) {
        button.remove();
      }
      cell.classList.remove("has-info");
      return;
    }

    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "upgrade-info";
      button.tabIndex = -1;
      button.textContent = "i";
      cell.appendChild(button);
    }

    button.dataset.upgradeName = entry.name;
    button.setAttribute("aria-label", `Descrição do aprimoramento ${entry.name}`);
    button.title = "";
    cell.classList.add("has-info");
  });
}

/**
 * Localiza o aprimoramento no catálogo. Kits gravam nomes genéricos
 * ("Armas de Fogo"), então caímos para uma busca por prefixo quando não há
 * correspondência exata.
 */
function findUpgradeCatalogEntry(name) {
  const target = String(name || "").trim();
  if (!target || !UPGRADES_CATALOG.length) {
    return null;
  }

  const exact = UPGRADES_CATALOG.find((entry) => entry.name === target);
  if (exact) {
    return exact;
  }

  const lower = target.toLowerCase();
  const caseInsensitive = UPGRADES_CATALOG.find((entry) => entry.name.toLowerCase() === lower);
  if (caseInsensitive) {
    return caseInsensitive;
  }

  const byPrefix = UPGRADES_CATALOG.find((entry) => entry.name.toLowerCase().startsWith(`${lower} (`));
  if (byPrefix) {
    return byPrefix;
  }

  return UPGRADES_CATALOG.find((entry) => lower.startsWith(`${entry.name.toLowerCase()} (`)) || null;
}

function showUpgradeTooltip(button) {
  const tooltip = elements.upgradeTooltip;
  if (!tooltip) {
    return;
  }

  const entry = findUpgradeCatalogEntry(button.dataset.upgradeName);
  if (!entry) {
    return;
  }

  const isPositive = entry.type === "positive";
  tooltip.innerHTML = `
    <span class="upgrade-tooltip-title">${escapeHtml(entry.name)}</span>
    <span class="upgrade-tooltip-cost">${isPositive ? "Positivo" : "Negativo"} · ${isPositive ? "−" : "+"}${entry.cost} pts</span>
    <span class="upgrade-tooltip-text">${escapeHtml(entry.description || "Sem descrição.")}</span>
  `;

  tooltip.classList.add("is-visible");
  tooltip.setAttribute("aria-hidden", "false");
  positionUpgradeTooltip(button);
}

function positionUpgradeTooltip(button) {
  const tooltip = elements.upgradeTooltip;
  if (!tooltip) {
    return;
  }

  const anchor = button.getBoundingClientRect();
  // offsetWidth/Height ignoram o scale da animação de entrada; getBoundingClientRect
  // devolveria o tamanho reduzido e o posicionamento sairia errado.
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const margin = 12;

  let left = anchor.right + margin;
  if (left + width > window.innerWidth - margin) {
    left = anchor.left - width - margin;
  }
  left = Math.max(margin, Math.min(left, Math.max(margin, window.innerWidth - width - margin)));

  let top = anchor.top + (anchor.height / 2) - (height / 2);
  top = Math.max(margin, Math.min(top, Math.max(margin, window.innerHeight - height - margin)));

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

function hideUpgradeTooltip() {
  const tooltip = elements.upgradeTooltip;
  if (!tooltip) {
    return;
  }

  tooltip.classList.remove("is-visible");
  tooltip.setAttribute("aria-hidden", "true");
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
  elements.cancelRegister.addEventListener("click", () => closeDialogAnimated(elements.registerDialog));
  elements.registerForm.addEventListener("submit", handleRegister);
  elements.cancelDeleteCharacter.addEventListener("click", () => closeDialogAnimated(elements.deleteCharacterDialog));
  elements.confirmDeleteCharacter.addEventListener("click", () => {
    void handleDeleteCurrentCharacter();
  });
  elements.toggleLoginPassword.addEventListener("click", () => togglePasswordVisibility(elements.passwordInput, elements.toggleLoginPassword));
  elements.toggleRegisterPassword.addEventListener("click", () => togglePasswordVisibility(elements.registerPassword, elements.toggleRegisterPassword));
  elements.logoutButton.addEventListener("click", handleLogout);
  // Optional chaining de propósito: se o navegador servir um index.html antigo
  // do cache, o botão não existe e o registro não pode derrubar o boot inteiro.
  elements.printSheetButton?.addEventListener("click", handlePrintSheet);
  elements.sheetSelector.addEventListener("change", handleSheetSelection);
  elements.removePortraitButton.addEventListener("click", handleRemovePortrait);
  elements.addUpgradeRow.addEventListener("click", openUpgradeCatalogDialog);
  elements.cancelUpgradeCatalog.addEventListener("click", () => closeDialogAnimated(elements.upgradeCatalogDialog));
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
  elements.cancelKitCatalog.addEventListener("click", () => closeDialogAnimated(elements.kitCatalogDialog));
  elements.confirmKitCatalog.addEventListener("click", confirmKitCatalogSelection);
  elements.addSkillRow.addEventListener("click", openSkillCatalogDialog);
  elements.cancelSkillCatalog.addEventListener("click", () => closeDialogAnimated(elements.skillCatalogDialog));
  elements.confirmSkillCatalog.addEventListener("click", confirmSkillCatalogSelection);
  elements.skillCatalogSearch.addEventListener("input", (event) => {
    renderSkillCatalogList(event.target.value);
  });
  elements.addCombatSkillRow.addEventListener("click", openCombatSkillCatalogDialog);
  elements.cancelCombatSkillCatalog.addEventListener("click", () => closeDialogAnimated(elements.combatSkillCatalogDialog));
  elements.confirmCombatSkillCatalog.addEventListener("click", confirmCombatSkillCatalogSelection);
  elements.combatSkillCatalogSearch.addEventListener("input", (event) => {
    renderCombatSkillCatalogList(event.target.value);
  });
  elements.inventoryFab.addEventListener("click", openInventoryDrawer);
  elements.closeInventoryDrawer.addEventListener("click", closeInventoryDrawer);
  elements.equipmentSlots.addEventListener("click", handleEquipmentClick);
  elements.equipmentSlots.addEventListener("input", handleEquipmentInput);
  elements.inventoryRows.addEventListener("input", handleBackpackInput);
  elements.backpackSize.addEventListener("change", handleBackpackSizeChange);
  elements.weaponPickerFilters.addEventListener("click", handleWeaponFilterClick);
  elements.weaponPickerGrid.addEventListener("click", handleWeaponOptionClick);
  elements.cancelWeaponPicker.addEventListener("click", () => closeDialogAnimated(elements.weaponPickerDialog));
  elements.confirmWeaponPicker.addEventListener("click", confirmWeaponPickerSelection);
  elements.clearWeaponPicker.addEventListener("click", clearWeaponPickerSlot);
  elements.notesFab.addEventListener("click", openNotesDrawer);
  elements.closeNotesDrawer.addEventListener("click", closeNotesDrawer);
  elements.notesTextarea.addEventListener("input", handleNotesInput);
  elements.evolveButton.addEventListener("click", handleEvolve);
  elements.saveSheetButton.addEventListener("click", openSaveSheetDialog);
  elements.cancelSaveSheet.addEventListener("click", () => closeDialogAnimated(elements.saveSheetDialog));
  elements.confirmSaveSheet.addEventListener("click", confirmSaveSheet);
  elements.historyFab.addEventListener("click", openHistoryDrawer);
  elements.closeHistoryDrawer.addEventListener("click", closeHistoryDrawer);
  elements.historyTextarea.addEventListener("input", handleHistoryInput);
  elements.contactsFab.addEventListener("click", openContactsDrawer);
  elements.closeContactsDrawer.addEventListener("click", closeContactsDrawer);
  elements.contactsBackButton.addEventListener("click", showContactsListView);
  elements.addContactButton.addEventListener("click", handleAddContact);
  elements.contactsList.addEventListener("click", handleContactCardClick);
  elements.contactsDetailView.addEventListener("input", handleContactFieldInput);
  elements.contactInfosList.addEventListener("click", handleContactInfoRemove);
  elements.addContactInfoButton.addEventListener("click", handleAddContactInfo);
  elements.deleteContactButton.addEventListener("click", handleDeleteContact);

  elements.wizardNext.addEventListener("click", () => advanceWizard(1));
  elements.wizardBack.addEventListener("click", () => advanceWizard(-1));
  elements.wizardSkip.addEventListener("click", () => finishWizard({ skipped: true }));
  elements.wizardChoiceKits.addEventListener("click", openKitCatalogDialog);
  elements.wizardChoiceInvent.addEventListener("click", showWizardInventedProfession);
  elements.wizardInventConfirm.addEventListener("click", confirmInventedProfession);
  elements.wizardInventInput.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      confirmInventedProfession();
    }
  });

  // Tooltip de descrição dos aprimoramentos (item ⓘ das linhas).
  elements.upgradesGrid.addEventListener("pointerover", (event) => {
    const button = event.target.closest(".upgrade-info");
    if (button) {
      showUpgradeTooltip(button);
    }
  });
  elements.upgradesGrid.addEventListener("pointerout", (event) => {
    const button = event.target.closest(".upgrade-info");
    if (button && !button.contains(event.relatedTarget)) {
      hideUpgradeTooltip();
    }
  });
  elements.upgradesGrid.addEventListener("focusin", (event) => {
    const button = event.target.closest(".upgrade-info");
    if (button) {
      showUpgradeTooltip(button);
    }
  });
  elements.upgradesGrid.addEventListener("focusout", (event) => {
    if (event.target.closest(".upgrade-info")) {
      hideUpgradeTooltip();
    }
  });
  elements.upgradesGrid.addEventListener("click", (event) => {
    const button = event.target.closest(".upgrade-info");
    if (!button) {
      return;
    }
    event.preventDefault();
    if (elements.upgradeTooltip?.classList.contains("is-visible")) {
      hideUpgradeTooltip();
    } else {
      showUpgradeTooltip(button);
    }
  });

  window.addEventListener("resize", scheduleViewportChange);
  window.addEventListener("scroll", scheduleViewportChange, { capture: true, passive: true });

  document.addEventListener("keydown", (event) => {
    if (!state.wizard.active) {
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      finishWizard({ skipped: true });
    }
  });

  bindFieldEvents(document);
  bindDynamicRowEvents(document);

  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      void flushPendingChanges();
    }
  });
}

/**
 * Scroll e resize disparam dezenas de vezes por segundo. Medir e reposicionar o
 * popup em cada evento forçava recálculo de layout a cada quadro e era o que
 * deixava a página travada — agora acontece no máximo uma vez por quadro.
 */
function scheduleViewportChange() {
  if (state.viewportFrame) {
    return;
  }

  state.viewportFrame = requestAnimationFrame(() => {
    state.viewportFrame = 0;
    handleViewportChange();
  });
}

function handleViewportChange() {
  if (state.wizard.active) {
    positionWizardPopup();
  }

  if (elements.upgradeTooltip?.classList.contains("is-visible")) {
    hideUpgradeTooltip();
  }
}

function openDialogAnimated(dialog) {
  if (!dialog || dialog.open) {
    return;
  }

  dialog.classList.remove("is-closing");
  dialog.showModal();
}

/**
 * Fecha o <dialog> só depois da animação de saída, para que o modal não
 * desapareça de forma seca. Se a animação não disparar, o timeout garante o fechamento.
 */
function closeDialogAnimated(dialog) {
  if (!dialog || !dialog.open || dialog.classList.contains("is-closing")) {
    return;
  }

  const content = dialog.firstElementChild;
  dialog.classList.add("is-closing");

  let settled = false;
  const finish = () => {
    if (settled) {
      return;
    }
    settled = true;
    content?.removeEventListener("animationend", finish);
    dialog.classList.remove("is-closing");
    dialog.close();
  };

  content?.addEventListener("animationend", finish);
  setTimeout(finish, 320);
}

function showToast(message, variant = "", icon = "") {
  if (!elements.toastStack) {
    return;
  }

  const toast = document.createElement("div");
  toast.className = `toast${variant ? ` toast-${variant}` : ""}`;
  toast.innerHTML = `${icon ? `<span class="toast-icon">${escapeHtml(icon)}</span>` : ""}<span>${escapeHtml(message)}</span>`;
  elements.toastStack.appendChild(toast);

  setTimeout(() => {
    toast.classList.add("is-leaving");
    setTimeout(() => toast.remove(), 320);
  }, 2600);
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
  finishWizard({ silent: true });
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
  openDialogAnimated(elements.registerDialog);
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
    closeDialogAnimated(elements.registerDialog);
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

  // Trocar de ficha encerra o passo a passo da ficha anterior.
  finishWizard({ silent: true });
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

  startWizard(characterRef.id);

  try {
    await setDoc(characterRef, serializeCharacterForWrite(optimisticCharacter));
    await ensurePortraitNumber(characterRef.id);
    queueStatus("Salvo", "saved");
  } catch (error) {
    console.error(error);
    finishWizard({ silent: true });
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
  openDialogAnimated(elements.deleteCharacterDialog);
}

async function handleDeleteCurrentCharacter() {
  const activeCharacter = getActiveCharacter();
  if (!activeCharacter) {
    closeDialogAnimated(elements.deleteCharacterDialog);
    return;
  }

  const currentCharacterId = activeCharacter.id;
  const characterName = resolveSessionCharacterName(activeCharacter);
  const sheetLayout = document.querySelector(".sheet-layout");
  closeDialogAnimated(elements.deleteCharacterDialog);
  finishWizard({ silent: true });

  try {
    await flushPendingChanges();
    updateSaveStatus("Salvando", "saving");
    await playVanishAnimation(sheetLayout);
    await deleteDoc(doc(db, "characters", currentCharacterId));

    delete state.charactersMap[currentCharacterId];
    rebuildCharacterOrder();
    syncSelectedCharacterId();
    renderCharacterWorkspace();
    queueStatus("Salvo", "saved");
    showToast(`Ficha ${characterName} foi apagada.`, "danger", "🩸");
  } catch (error) {
    console.error(error);
    updateSaveStatus("Salvo", "saved");
    alert(formatFirebaseError(error, "Não foi possível excluir a ficha."));
  } finally {
    // A ficha volta com um fade suave em vez de reaparecer de repente.
    if (sheetLayout) {
      sheetLayout.classList.remove("is-vanishing");
      sheetLayout.classList.add("is-revealing");
      setTimeout(() => sheetLayout.classList.remove("is-revealing"), 520);
    }
  }
}

/**
 * Toca a animação de desaparecimento da ficha antes de removê-la de fato,
 * dando peso à exclusão. Resolve mesmo que a animação não dispare.
 */
function playVanishAnimation(element) {
  if (!element) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    let settled = false;
    const finish = () => {
      if (settled) {
        return;
      }
      settled = true;
      element.removeEventListener("animationend", finish);
      resolve();
    };

    element.addEventListener("animationend", finish);
    element.classList.add("is-vanishing");
    setTimeout(finish, 700);
  });
}

function handleFieldInput(field, isNumeric) {
  if (!hasActiveCharacter()) {
    updateSaveStatus("Salvo", "saved");
    return;
  }

  if (field.dataset.field === "dano") {
    field.value = sanitizeDamageInput(field.value);
  } else if (field.dataset.modifier === "true") {
    field.value = sanitizeModifierInput(field.value);
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

  if (key.startsWith("dynamicUpgrade:") && key.endsWith(":nome")) {
    decorateUpgradeInfoIcons();
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

  // A decisão de remover uma linha é feita a partir do MODELO (dados sincronizados
  // do Firebase), nunca dos inputs do DOM. Os inputs podem estar momentaneamente
  // vazios/dessincronizados durante trocas de foco e re-renderizações; confiar neles
  // fazia aprimoramentos/perícias existentes no banco sumirem da ficha.
  const type = row.dataset.dynamicType;
  const modelRow = findDynamicModelRow(type, row.dataset.rowId);

  // Linha que não existe mais no modelo: nada a fazer.
  if (!modelRow) {
    return;
  }

  const hasContent = !isDynamicModelRowEmpty(type, modelRow);

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

function findDynamicModelRow(type, rowId) {
  const character = getActiveCharacter();
  if (!character) {
    return null;
  }

  let collection;
  if (type === "upgrade") {
    collection = character.dynamicUpgrades;
  } else if (type === "combatSkill") {
    collection = character.dynamicCombatSkills;
  } else {
    collection = character.dynamicSkills;
  }

  return (collection || []).find((entry) => entry.id === rowId) || null;
}

function isDynamicModelRowEmpty(type, modelRow) {
  if (!modelRow) {
    return true;
  }

  const isBlank = (value) => String(value ?? "").trim() === "";

  if (type === "upgrade") {
    return isBlank(modelRow.nome) && isBlank(modelRow.valor);
  }

  if (type === "combatSkill") {
    // Uma linha de combate é considerada preenchida pelo nome da perícia.
    return isBlank(modelRow.nome);
  }

  // Perícias comuns: teste é derivado, então não conta para preenchimento.
  return isBlank(modelRow.nome) && isBlank(modelRow.atributo) && isBlank(modelRow.valor);
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
  closeContactsDrawer();
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
  closeContactsDrawer();
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
  closeContactsDrawer();
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
  closeContactsDrawer();
}

/* ==========================================================================
   Contatos, aliados e patronos
   ========================================================================== */

function getContacts(character) {
  const target = character ?? getActiveCharacter();
  return Array.isArray(target?.contacts) ? target.contacts : [];
}

function getSelectedContact() {
  return getContacts().find((contact) => contact.id === state.selectedContactId) || null;
}

function createContact(tipo) {
  return {
    id: crypto.randomUUID(),
    photoNumber: 0,
    tipo: CONTACT_TYPES.includes(tipo) ? tipo : "contato",
    nome: "",
    nascimento: "",
    atuacao: "",
    caracteristicas: "",
    descricao: "",
    infos: [],
  };
}

function openContactsDrawer() {
  if (!hasActiveCharacter()) {
    return;
  }

  closeInventoryDrawer();
  closeNotesDrawer();
  closeHistoryDrawer();
  showContactsListView();
  elements.contactsDrawer.classList.add("is-open");
  elements.contactsDrawer.setAttribute("aria-hidden", "false");
}

function closeContactsDrawer() {
  elements.contactsDrawer.classList.remove("is-open");
  elements.contactsDrawer.setAttribute("aria-hidden", "true");
}

function showContactsListView() {
  state.selectedContactId = null;
  disarmDeleteContact();
  renderContactsList();
  elements.contactsDrawerTitle.textContent = "Contatos e Aliados";
  elements.contactsBackButton.classList.add("hidden");
  elements.contactsListView.classList.add("is-active");
  elements.contactsDetailView.classList.remove("is-active");
  elements.contactsListView.setAttribute("aria-hidden", "false");
  elements.contactsDetailView.setAttribute("aria-hidden", "true");
}

function openContactDetail(contactId) {
  const contact = getContacts().find((item) => item.id === contactId);
  if (!contact) {
    return;
  }

  state.selectedContactId = contactId;
  disarmDeleteContact();
  renderContactDetail();
  elements.contactsDrawerTitle.textContent = CONTACT_TYPE_LABELS[contact.tipo] || "Contato";
  elements.contactsBackButton.classList.remove("hidden");
  elements.contactsDetailView.classList.add("is-active");
  elements.contactsListView.classList.remove("is-active");
  elements.contactsDetailView.setAttribute("aria-hidden", "false");
  elements.contactsListView.setAttribute("aria-hidden", "true");
  elements.contactsDetailView.scrollTop = 0;
}

function renderContacts() {
  if (state.selectedContactId && getSelectedContact()) {
    renderContactDetail();
  } else {
    showContactsListView();
  }
}

function renderContactsList() {
  const contacts = getContacts();
  elements.contactsEmpty.classList.toggle("hidden", contacts.length > 0);

  elements.contactsList.innerHTML = contacts.map((contact) => {
    const nome = String(contact.nome || "").trim() || "Sem nome";
    const tipo = CONTACT_TYPE_LABELS[contact.tipo] || "Contato";
    const meta = [contact.atuacao, contact.nascimento]
      .map((value) => String(value || "").trim())
      .filter(Boolean)
      .join(" · ") || "Sem local definido";
    const code = formatContactCode(contact.photoNumber);

    return `
      <button type="button" class="contact-card" data-contact-id="${escapeAttribute(contact.id)}">
        <span class="contact-card-avatar" data-contact-photo="${escapeAttribute(code)}">
          <span class="contact-card-initial">${escapeHtml(nome.charAt(0).toUpperCase())}</span>
        </span>
        <span class="contact-card-body">
          <span class="contact-card-name">${escapeHtml(nome)}</span>
          <span class="contact-card-meta">${escapeHtml(meta)}</span>
        </span>
        <span class="contact-card-tag is-${escapeAttribute(contact.tipo)}">${escapeHtml(tipo)}</span>
      </button>`;
  }).join("");

  hydrateContactAvatars();
}

// A miniatura só aparece se o arquivo existir na pasta; enquanto não existir,
// a inicial do nome fica no lugar dela.
function hydrateContactAvatars() {
  elements.contactsList.querySelectorAll("[data-contact-photo]").forEach((avatar) => {
    const code = avatar.dataset.contactPhoto;
    if (!code) {
      return;
    }

    const candidates = PORTRAIT_IMAGE_EXTENSIONS.map(
      (extension) => `${CONTACT_IMAGE_DIR}/img_ctt_${code}.${extension}`,
    );

    let index = 0;
    const probe = new Image();
    probe.onload = () => {
      const image = document.createElement("img");
      image.src = probe.src;
      image.alt = "";
      avatar.append(image);
      avatar.classList.add("has-image");
    };
    probe.onerror = () => {
      index += 1;
      if (index < candidates.length) {
        probe.src = candidates[index];
      }
    };
    probe.src = candidates[index];
  });
}

function renderContactDetail() {
  const contact = getSelectedContact();
  if (!contact) {
    return;
  }

  elements.contactsDetailView.querySelectorAll("[data-contact-field]").forEach((field) => {
    field.value = contact[field.dataset.contactField] ?? "";
  });

  renderContactInfos(contact);
  renderContactPhoto(contact);
}

function renderContactInfos(contact) {
  const infos = Array.isArray(contact.infos) ? contact.infos : [];

  elements.contactInfosList.innerHTML = infos.map((info, index) => `
    <div class="contact-info-row">
      <input type="text" value="${escapeAttribute(info || "")}" data-contact-info-index="${index}"
        maxlength="160" placeholder="Ex.: consegue plantas de prédios da zona portuária"
        aria-label="Informação ${index + 1}">
      <button type="button" class="contact-info-remove" data-contact-info-remove="${index}"
        aria-label="Remover informação ${index + 1}">✕</button>
    </div>`).join("");
}

function formatContactCode(photoNumber) {
  const value = Math.floor(Number(photoNumber));
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return String(value).padStart(3, "0");
}

function buildContactPhotoCandidates(photoNumber) {
  const code = formatContactCode(photoNumber);
  if (!code) {
    return [];
  }

  return PORTRAIT_IMAGE_EXTENSIONS.map((extension) => `${CONTACT_IMAGE_DIR}/img_ctt_${code}.${extension}`);
}

function renderContactPhoto(contact) {
  const code = formatContactCode(contact.photoNumber);
  const image = elements.contactPhotoImage;

  state.contactPhotoAttempt += 1;
  const attempt = state.contactPhotoAttempt;
  image.onerror = null;
  image.onload = null;
  image.removeAttribute("src");
  elements.contactPhotoFrame.classList.remove("has-image");

  elements.contactPhotoBadge.textContent = code ? `#${code}` : "";
  elements.contactPhotoBadge.classList.toggle("hidden", !code);
  elements.contactPhotoFileName.textContent = code ? `img_ctt_${code}.png` : "";
  elements.contactPhotoHint.classList.toggle("hidden", !code);

  const candidates = buildContactPhotoCandidates(contact.photoNumber);
  let index = 0;

  const tryNext = () => {
    if (attempt !== state.contactPhotoAttempt) {
      return;
    }

    if (index >= candidates.length) {
      image.onerror = null;
      image.onload = null;
      return;
    }

    image.onerror = tryNext;
    image.onload = () => {
      if (attempt === state.contactPhotoAttempt) {
        elements.contactPhotoFrame.classList.add("has-image");
      }
    };
    image.src = candidates[index];
    index += 1;
  };

  tryNext();
}

async function handleAddContact() {
  if (!hasActiveCharacter()) {
    return;
  }

  const contact = createContact(elements.contactTypeSelect.value);
  contact.photoNumber = await allocateContactPhotoNumber().catch((error) => {
    console.error(error);
    return 0;
  });

  if (!hasActiveCharacter()) {
    return;
  }

  mutateActiveCharacter((character) => {
    if (!Array.isArray(character.contacts)) {
      character.contacts = [];
    }
    character.contacts.push(contact);
  });

  markCharacterDirty();
  openContactDetail(contact.id);
}

function handleContactCardClick(event) {
  const card = event.target.closest("[data-contact-id]");
  if (card) {
    openContactDetail(card.dataset.contactId);
  }
}

function handleContactFieldInput(event) {
  const field = event.target.closest("[data-contact-field], [data-contact-info-index]");
  if (!field || !hasActiveCharacter() || !state.selectedContactId) {
    return;
  }

  const contactId = state.selectedContactId;

  mutateActiveCharacter((character) => {
    const contact = (character.contacts || []).find((item) => item.id === contactId);
    if (!contact) {
      return;
    }

    if (field.dataset.contactField) {
      contact[field.dataset.contactField] = field.value;
      return;
    }

    if (!Array.isArray(contact.infos)) {
      contact.infos = [];
    }
    contact.infos[Number(field.dataset.contactInfoIndex)] = field.value;
  });

  if (field.dataset.contactField === "tipo") {
    elements.contactsDrawerTitle.textContent = CONTACT_TYPE_LABELS[field.value] || "Contato";
  }

  markCharacterDirty();
}

function handleAddContactInfo() {
  const contact = getSelectedContact();
  if (!contact) {
    return;
  }

  const contactId = contact.id;

  mutateActiveCharacter((character) => {
    const target = (character.contacts || []).find((item) => item.id === contactId);
    if (!target) {
      return;
    }
    if (!Array.isArray(target.infos)) {
      target.infos = [];
    }
    target.infos.push("");
  });

  markCharacterDirty();
  renderContactInfos(getSelectedContact());
  elements.contactInfosList.querySelector(".contact-info-row:last-child input")?.focus();
}

function handleContactInfoRemove(event) {
  const button = event.target.closest("[data-contact-info-remove]");
  if (!button || !state.selectedContactId) {
    return;
  }

  const contactId = state.selectedContactId;
  const index = Number(button.dataset.contactInfoRemove);

  mutateActiveCharacter((character) => {
    const contact = (character.contacts || []).find((item) => item.id === contactId);
    contact?.infos?.splice(index, 1);
  });

  markCharacterDirty();
  renderContactInfos(getSelectedContact());
}

// Excluir contato é em duas batidas: o primeiro clique arma o botão. Sem isso um
// toque errado apagaria a mini-ficha inteira sem volta.
function disarmDeleteContact() {
  elements.deleteContactButton.textContent = "Excluir contato";
  delete elements.deleteContactButton.dataset.armed;
}

function handleDeleteContact() {
  const contact = getSelectedContact();
  if (!contact) {
    return;
  }

  if (elements.deleteContactButton.dataset.armed !== "true") {
    elements.deleteContactButton.dataset.armed = "true";
    elements.deleteContactButton.textContent = "Confirmar exclusão";
    return;
  }

  const contactId = contact.id;

  mutateActiveCharacter((character) => {
    character.contacts = (character.contacts || []).filter((item) => item.id !== contactId);
  });

  markCharacterDirty();
  showContactsListView();
  showToast("Contato excluído.");
}

function highestKnownContactPhotoNumber() {
  return Object.values(state.charactersMap).reduce((highest, character) => {
    return getContacts(character).reduce((inner, contact) => {
      const value = Math.floor(Number(contact?.photoNumber));
      return Number.isFinite(value) && value > inner ? value : inner;
    }, highest);
  }, 0);
}

async function allocateContactPhotoNumber() {
  const counterRef = doc(db, ...CONTACT_COUNTER_PATH);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const stored = Math.floor(Number(snapshot.exists() ? snapshot.data().lastContactNumber : 0));
    const lastContactNumber = Number.isFinite(stored) && stored > 0 ? stored : 0;
    const contactNumber = Math.max(lastContactNumber, highestKnownContactPhotoNumber()) + 1;

    transaction.set(counterRef, {
      lastContactNumber: contactNumber,
      updatedAtMs: Date.now(),
    }, { merge: true });

    return contactNumber;
  });
}

function sanitizeContacts(rows) {
  return (Array.isArray(rows) ? rows : []).map((row) => {
    const photoNumber = Math.floor(Number(row?.photoNumber));

    return {
      id: row?.id || crypto.randomUUID(),
      photoNumber: Number.isFinite(photoNumber) && photoNumber > 0 ? photoNumber : 0,
      tipo: CONTACT_TYPES.includes(row?.tipo) ? row.tipo : "contato",
      nome: row?.nome ?? "",
      nascimento: row?.nascimento ?? "",
      atuacao: row?.atuacao ?? "",
      caracteristicas: row?.caracteristicas ?? "",
      descricao: row?.descricao ?? "",
      infos: (Array.isArray(row?.infos) ? row.infos : []).map((info) => String(info ?? "")),
    };
  });
}

function renderInventory() {
  renderEquipmentSlots();
  renderBackpack();
}

function renderNotes() {
  elements.notesTextarea.value = getActiveCharacter()?.notesText || "";
}

function renderHistory() {
  elements.historyTextarea.value = getActiveCharacter()?.historyText || "";
}

/* ==========================================================================
   Slots de equipamento
   ========================================================================== */

function getEquipmentSlots(character) {
  if (!character) {
    return sanitizeEquipmentSlots(null);
  }

  if (!character.equipmentSlots || typeof character.equipmentSlots !== "object") {
    character.equipmentSlots = sanitizeEquipmentSlots(null);
  }

  return character.equipmentSlots;
}

function renderEquipmentSlots() {
  const slots = getEquipmentSlots(getActiveCharacter());
  elements.equipmentSlots.innerHTML = EQUIPMENT_SLOT_DEFS
    .map((def) => buildEquipmentSlotMarkup(def, slots[def.key] || createEquipmentSlot()))
    .join("");
}

function buildWeaponIconSvg(iconId, className = "weapon-icon") {
  const icon = WEAPON_ICON_MAP.get(iconId);
  if (!icon) {
    return "";
  }

  return `<svg class="${className}" viewBox="0 0 64 64" fill="currentColor" role="img" aria-label="${escapeAttribute(icon.label)}">${icon.shape}</svg>`;
}

function buildEquipmentSlotMarkup(def, slot) {
  const icon = WEAPON_ICON_MAP.get(slot.iconId);

  if (!icon) {
    return `
      <article class="gear-slot is-empty" data-slot-key="${def.key}">
        <header class="gear-slot-head">
          <span class="gear-slot-name">${escapeHtml(def.label)}</span>
        </header>
        <button type="button" class="gear-slot-empty" data-slot-pick="${def.key}">
          <span class="gear-slot-plus" aria-hidden="true">+</span>
          <span class="gear-slot-empty-label">Equipar arma</span>
          <span class="gear-slot-empty-hint">${escapeHtml(def.hint)}</span>
        </button>
      </article>`;
  }

  const isFirearm = icon.kind === "firearm";
  const field = (name, label, value, placeholder, numeric) => `
    <label class="gear-field">
      <span>${escapeHtml(label)}</span>
      <input type="text" value="${escapeAttribute(value || "")}" placeholder="${escapeAttribute(placeholder)}"
        data-slot-key="${def.key}" data-slot-field="${name}"${numeric ? ' inputmode="numeric" data-numeric="true"' : ""}
        aria-label="${escapeAttribute(`${label} — ${def.label}`)}">
    </label>`;

  return `
    <article class="gear-slot is-filled" data-slot-key="${def.key}" data-weapon-kind="${icon.kind}">
      <header class="gear-slot-head">
        <span class="gear-slot-name">${escapeHtml(def.label)}</span>
        <span class="gear-slot-kind">${escapeHtml(icon.label)}</span>
        <button type="button" class="gear-slot-clear" data-slot-clear="${def.key}" title="Esvaziar slot" aria-label="${escapeAttribute(`Esvaziar ${def.label}`)}">✕</button>
      </header>

      <div class="gear-slot-body">
        <button type="button" class="gear-icon-btn" data-slot-pick="${def.key}" title="Trocar arma" aria-label="${escapeAttribute(`Trocar arma — ${def.label}`)}">
          ${buildWeaponIconSvg(slot.iconId)}
        </button>

        <div class="gear-fields">
          ${field("nome", "Nome", slot.nome, isFirearm ? "Ex.: AK-47" : "Ex.: Katana", false)}
          <div class="gear-stats">
            ${field("dano", "Dano", slot.dano, "1d10", false)}
            ${isFirearm ? field("rof", "RoF", slot.rof, "1/3", false) : ""}
            ${isFirearm ? field("carregador", "Carreg.", slot.carregador, "30", true) : ""}
          </div>
        </div>
      </div>

      ${isFirearm ? buildAmmoBlockMarkup(def, slot) : ""}
    </article>`;
}

function buildAmmoBlockMarkup(def, slot) {
  return `
    <div class="gear-ammo" data-ammo-slot="${def.key}">
      <div class="ammo-track">${buildAmmoPipsMarkup(slot)}</div>
      <div class="ammo-controls">
        <span class="ammo-count">${buildAmmoCountMarkup(slot)}</span>
        <button type="button" class="ammo-btn" data-ammo-action="fire" data-slot-key="${def.key}" title="Disparar" aria-label="Disparar">−</button>
        <button type="button" class="ammo-btn" data-ammo-action="add" data-slot-key="${def.key}" title="Inserir munição" aria-label="Inserir munição">+</button>
        <button type="button" class="ammo-btn ammo-reload" data-ammo-action="reload" data-slot-key="${def.key}">⟳ Recarregar</button>
        <label class="gear-field ammo-reserve">
          <span>Reserva</span>
          <input type="text" inputmode="numeric" data-numeric="true" value="${escapeAttribute(slot.reserva || "")}"
            placeholder="0" data-slot-key="${def.key}" data-slot-field="reserva" aria-label="${escapeAttribute(`Munição reserva — ${def.label}`)}">
        </label>
      </div>
    </div>`;
}

function buildAmmoPipsMarkup(slot) {
  const capacity = toPositiveInt(slot.carregador);
  const loaded = Math.min(toPositiveInt(slot.municao), capacity || Infinity);

  if (!capacity || capacity > 40) {
    return "";
  }

  let pips = "";
  for (let index = 0; index < capacity; index += 1) {
    pips += `<span class="ammo-pip${index < loaded ? " is-loaded" : ""}"></span>`;
  }

  return pips;
}

function buildAmmoCountMarkup(slot) {
  const capacity = toPositiveInt(slot.carregador);
  const loaded = toPositiveInt(slot.municao);
  return `<strong>${loaded}</strong>/${capacity || "—"}`;
}

function refreshAmmoDisplay(slotKey) {
  const block = elements.equipmentSlots.querySelector(`[data-ammo-slot="${slotKey}"]`);
  if (!block) {
    return;
  }

  const slot = getEquipmentSlots(getActiveCharacter())[slotKey];
  block.querySelector(".ammo-track").innerHTML = buildAmmoPipsMarkup(slot);
  block.querySelector(".ammo-count").innerHTML = buildAmmoCountMarkup(slot);

  const reserveField = block.querySelector('[data-slot-field="reserva"]');
  if (reserveField && document.activeElement !== reserveField) {
    reserveField.value = slot.reserva || "";
  }
}

function handleEquipmentInput(event) {
  const field = event.target.closest("[data-slot-field]");
  if (!field || !hasActiveCharacter()) {
    return;
  }

  if (field.dataset.numeric === "true") {
    field.value = sanitizeIntegerInput(field.value).replace(/-/g, "");
  }

  const slotKey = field.dataset.slotKey;
  const fieldName = field.dataset.slotField;

  mutateActiveCharacter((character) => {
    const slot = getEquipmentSlots(character)[slotKey];
    if (!slot) {
      return;
    }

    slot[fieldName] = field.value;

    if (fieldName === "carregador") {
      const capacity = toPositiveInt(slot.carregador);
      if (capacity && toPositiveInt(slot.municao) > capacity) {
        slot.municao = String(capacity);
      }
    }
  });

  if (fieldName === "carregador" || fieldName === "reserva") {
    refreshAmmoDisplay(slotKey);
  }

  markCharacterDirty();
}

function handleEquipmentClick(event) {
  const pick = event.target.closest("[data-slot-pick]");
  if (pick) {
    openWeaponPicker(pick.dataset.slotPick);
    return;
  }

  const clear = event.target.closest("[data-slot-clear]");
  if (clear) {
    // Esvaziar apaga nome, dano e munição já digitados, então exige dois
    // cliques: o primeiro só arma o botão.
    if (clear.dataset.armed === "true") {
      emptyEquipmentSlot(clear.dataset.slotClear);
    } else {
      armSlotClearButton(clear);
    }
    return;
  }

  const ammo = event.target.closest("[data-ammo-action]");
  if (ammo) {
    handleAmmoAction(ammo.dataset.slotKey, ammo.dataset.ammoAction);
  }
}

function handleAmmoAction(slotKey, action) {
  if (!hasActiveCharacter()) {
    return;
  }

  let feedback = "";

  mutateActiveCharacter((character) => {
    const slot = getEquipmentSlots(character)[slotKey];
    if (!slot) {
      return;
    }

    const capacity = toPositiveInt(slot.carregador);
    const loaded = toPositiveInt(slot.municao);
    const reserve = toPositiveInt(slot.reserva);

    if (action === "fire") {
      if (!loaded) {
        feedback = "Carregador vazio";
        return;
      }
      slot.municao = String(loaded - 1);
      return;
    }

    if (action === "add") {
      if (capacity && loaded >= capacity) {
        feedback = "Carregador cheio";
        return;
      }
      slot.municao = String(loaded + 1);
      return;
    }

    if (action === "reload") {
      if (!capacity) {
        feedback = "Defina a capacidade do carregador";
        return;
      }
      const needed = capacity - loaded;
      if (needed <= 0) {
        feedback = "Carregador cheio";
        return;
      }
      const taken = Math.min(needed, reserve);
      if (!taken) {
        feedback = "Sem munição na reserva";
        return;
      }
      slot.municao = String(loaded + taken);
      slot.reserva = String(reserve - taken);
      feedback = `+${taken} no carregador`;
    }
  });

  refreshAmmoDisplay(slotKey);
  markCharacterDirty();

  if (feedback) {
    showToast(feedback, "", "🔫");
  }
}

let slotClearTimer = null;

function armSlotClearButton(button) {
  elements.equipmentSlots.querySelectorAll('[data-armed="true"]').forEach(resetSlotClearButton);

  button.dataset.armed = "true";
  button.classList.add("is-armed");
  button.textContent = "?";
  button.title = "Clique de novo para esvaziar";

  clearTimeout(slotClearTimer);
  slotClearTimer = setTimeout(() => resetSlotClearButton(button), 3000);
}

function resetSlotClearButton(button) {
  delete button.dataset.armed;
  button.classList.remove("is-armed");
  button.textContent = "✕";
  button.title = "Esvaziar slot";
}

function emptyEquipmentSlot(slotKey) {
  if (!hasActiveCharacter()) {
    return;
  }

  mutateActiveCharacter((character) => {
    getEquipmentSlots(character)[slotKey] = createEquipmentSlot();
  });

  renderEquipmentSlots();
  markCharacterDirty();
  showToast("Slot esvaziado", "", "🎒");
}

/* ==========================================================================
   Seleção de ícone de arma
   ========================================================================== */

function openWeaponPicker(slotKey) {
  if (!hasActiveCharacter()) {
    return;
  }

  const def = EQUIPMENT_SLOT_DEFS.find((entry) => entry.key === slotKey);
  const slot = getEquipmentSlots(getActiveCharacter())[slotKey] || createEquipmentSlot();

  state.weaponPicker = { slotKey, iconId: slot.iconId || "", filter: "all" };
  elements.weaponPickerSlotLabel.textContent = def ? def.label : "";
  elements.clearWeaponPicker.classList.toggle("hidden", !slot.iconId);

  renderWeaponPickerFilters();
  renderWeaponPickerGrid();
  elements.weaponPickerDialog.showModal();
}

function renderWeaponPickerFilters() {
  elements.weaponPickerFilters.querySelectorAll("[data-weapon-filter]").forEach((button) => {
    button.classList.toggle("is-active", button.dataset.weaponFilter === state.weaponPicker.filter);
  });
}

function renderWeaponPickerGrid() {
  const { filter, iconId } = state.weaponPicker;
  const icons = WEAPON_ICONS.filter((icon) => filter === "all" || icon.kind === filter);

  elements.weaponPickerGrid.innerHTML = icons.map((icon) => `
    <button type="button" class="weapon-option${icon.id === iconId ? " is-selected" : ""}"
      data-weapon-id="${icon.id}" role="option" aria-selected="${icon.id === iconId}">
      ${buildWeaponIconSvg(icon.id, "weapon-icon weapon-icon-lg")}
      <span class="weapon-option-label">${escapeHtml(icon.label)}</span>
    </button>`).join("");

  elements.confirmWeaponPicker.disabled = !iconId;
}

function handleWeaponFilterClick(event) {
  const button = event.target.closest("[data-weapon-filter]");
  if (!button) {
    return;
  }

  state.weaponPicker.filter = button.dataset.weaponFilter;
  renderWeaponPickerFilters();
  renderWeaponPickerGrid();
}

function handleWeaponOptionClick(event) {
  const option = event.target.closest("[data-weapon-id]");
  if (!option) {
    return;
  }

  state.weaponPicker.iconId = option.dataset.weaponId;
  renderWeaponPickerGrid();
}

function confirmWeaponPickerSelection() {
  const { slotKey, iconId } = state.weaponPicker;
  const icon = WEAPON_ICON_MAP.get(iconId);

  if (!slotKey || !icon || !hasActiveCharacter()) {
    return;
  }

  // Trocar o ícone nunca apaga o que já foi digitado: nome, dano e munição
  // permanecem, inclusive ao alternar entre arma de fogo e arma branca.
  mutateActiveCharacter((character) => {
    const slot = getEquipmentSlots(character)[slotKey];
    slot.iconId = iconId;
    slot.kind = icon.kind;
  });

  renderEquipmentSlots();
  markCharacterDirty();
  closeDialogAnimated(elements.weaponPickerDialog);
}

function clearWeaponPickerSlot() {
  const { slotKey } = state.weaponPicker;
  if (!slotKey) {
    return;
  }

  emptyEquipmentSlot(slotKey);
  closeDialogAnimated(elements.weaponPickerDialog);
}

/* ==========================================================================
   Mochila
   ========================================================================== */

// Fichas antigas não têm tamanho de mochila gravado. Nesse caso escolhemos a
// menor mochila que comporta o que o jogador já tinha anotado, para ninguém
// abrir a ficha e encontrar os próprios itens marcados como excedentes.
function normalizeBackpackSize(size, itemCount = 0) {
  if (BACKPACK_SIZES[size]) {
    return size;
  }

  if (!itemCount) {
    return DEFAULT_BACKPACK_SIZE;
  }

  const keys = Object.keys(BACKPACK_SIZES);
  return keys.find((key) => BACKPACK_SIZES[key].slots >= itemCount) || keys[keys.length - 1];
}

function getBackpackCapacity(character) {
  return BACKPACK_SIZES[normalizeBackpackSize(character?.backpackSize)].slots;
}

function isEmptyInventoryItem(item) {
  return [item?.item, item?.quantidade, item?.peso, item?.valor]
    .every((value) => String(value ?? "").trim() === "");
}

function createInventoryItem() {
  return { id: crypto.randomUUID(), item: "", quantidade: "", peso: "", valor: "" };
}

function renderBackpack() {
  const character = getActiveCharacter();
  const items = character?.inventoryItems || [];
  const capacity = getBackpackCapacity(character);
  // Slots além da capacidade continuam visíveis: reduzir a mochila nunca joga
  // fora item que o jogador já tinha anotado.
  const total = Math.max(capacity, items.length);

  elements.backpackSize.value = normalizeBackpackSize(character?.backpackSize);

  let html = "";
  for (let index = 0; index < total; index += 1) {
    const item = items[index] || {};
    const overflow = index >= capacity;
    const empty = isEmptyInventoryItem(item);
    const cell = (name, label, value, numeric) => `
      <input type="text" value="${escapeAttribute(value || "")}"
        data-inventory-index="${index}" data-inventory-field="${name}"${numeric ? ' inputmode="numeric" data-numeric="true"' : ""}
        aria-label="${escapeAttribute(`${label} — slot ${index + 1}`)}">`;

    html += `
      <div class="inventory-row inventory-slot${overflow ? " is-overflow" : ""}${empty ? " is-empty" : ""}" data-slot-index="${index}">
        <span class="slot-index">${overflow ? "!" : index + 1}</span>
        ${cell("item", "Item", item.item, false)}
        ${cell("quantidade", "Quantidade", item.quantidade, true)}
        ${cell("peso", "Peso", item.peso, true)}
        ${cell("valor", "Valor", item.valor, true)}
      </div>`;
  }

  elements.inventoryRows.innerHTML = html;
  updateBackpackFooter();
}

function updateBackpackFooter() {
  const character = getActiveCharacter();
  const items = character?.inventoryItems || [];
  const capacity = getBackpackCapacity(character);
  const filled = items.filter((item) => !isEmptyInventoryItem(item));

  const totals = filled.reduce((acc, item) => {
    const quantidade = toPositiveInt(item.quantidade) || 1;
    acc.peso += toPositiveInt(item.peso) * quantidade;
    acc.valor += toPositiveInt(item.valor) * quantidade;
    return acc;
  }, { peso: 0, valor: 0 });

  const overflow = Math.max(0, items.length - capacity);
  const parts = [
    `Slots ${filled.length}/${capacity}`,
    `Peso ${totals.peso}`,
    `Valor ${totals.valor}`,
  ];

  elements.backpackFooter.textContent = overflow
    ? `${parts.join(" · ")} · ⚠ ${overflow} ${overflow === 1 ? "item excedente" : "itens excedentes"}`
    : parts.join(" · ");
  elements.backpackFooter.classList.toggle("is-overloaded", overflow > 0);
}

function handleBackpackInput(event) {
  const field = event.target.closest("[data-inventory-index]");
  if (!field || !hasActiveCharacter()) {
    return;
  }

  if (field.dataset.numeric === "true") {
    field.value = sanitizeIntegerInput(field.value);
  }

  const index = Number(field.dataset.inventoryIndex);
  const fieldName = field.dataset.inventoryField;

  mutateActiveCharacter((character) => {
    if (!Array.isArray(character.inventoryItems)) {
      character.inventoryItems = [];
    }

    while (character.inventoryItems.length <= index) {
      character.inventoryItems.push(createInventoryItem());
    }

    character.inventoryItems[index][fieldName] = field.value;
  });

  const row = field.closest(".inventory-slot");
  if (row) {
    const stillEmpty = Array.from(row.querySelectorAll("[data-inventory-index]"))
      .every((input) => String(input.value || "").trim() === "");
    row.classList.toggle("is-empty", stillEmpty);
  }

  updateBackpackFooter();
  markCharacterDirty();
}

function handleBackpackSizeChange() {
  if (!hasActiveCharacter()) {
    return;
  }

  const size = normalizeBackpackSize(elements.backpackSize.value);

  mutateActiveCharacter((character) => {
    character.backpackSize = size;
  });

  renderBackpack();
  markCharacterDirty();
  showToast(`Mochila ${BACKPACK_SIZES[size].label.toLowerCase()} · ${BACKPACK_SIZES[size].slots} slots`, "", "🎒");
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

function formatPortraitCode(portraitNumber) {
  const value = Math.floor(Number(portraitNumber));
  if (!Number.isFinite(value) || value <= 0) {
    return "";
  }

  return String(value).padStart(3, "0");
}

function buildPortraitFileName(portraitNumber, extension) {
  const code = formatPortraitCode(portraitNumber);
  return code ? `img_${code}.${extension}` : "";
}

function buildPortraitCandidates(portraitNumber) {
  const code = formatPortraitCode(portraitNumber);
  if (!code) {
    return [];
  }

  return PORTRAIT_IMAGE_EXTENSIONS.map((extension) => `${PORTRAIT_IMAGE_DIR}/img_${code}.${extension}`);
}

function clearPortraitImage() {
  elements.portraitImage.removeAttribute("src");
  elements.portraitFrame.classList.remove("has-image");
}

// Tenta as extensões em ordem (png, jpg, jpeg, webp) e só desiste depois da
// última: assim a pasta aceita qualquer um desses formatos sem configuração.
// O token evita que uma imagem lenta de outra ficha apareça depois da troca.
function loadPortraitCandidates(candidates, attempt) {
  const image = elements.portraitImage;
  let index = 0;

  const tryNext = () => {
    if (attempt !== state.portraitAttempt) {
      return;
    }

    if (index >= candidates.length) {
      image.onerror = null;
      image.onload = null;
      clearPortraitImage();
      return;
    }

    image.onerror = tryNext;
    image.onload = () => {
      if (attempt === state.portraitAttempt) {
        elements.portraitFrame.classList.add("has-image");
      }
    };
    image.src = candidates[index];
    index += 1;
  };

  tryNext();
}

function renderPortrait() {
  const character = getActiveCharacter();
  const legacyPortrait = character?.portraitDataUrl || "";
  const portraitNumber = character?.portraitNumber;
  const code = formatPortraitCode(portraitNumber);

  state.portraitAttempt += 1;
  const attempt = state.portraitAttempt;
  elements.portraitImage.onerror = null;
  elements.portraitImage.onload = null;
  clearPortraitImage();

  if (code) {
    elements.portraitCodeBadge.textContent = `#${code}`;
    elements.portraitCodeBadge.classList.remove("hidden");
  } else {
    elements.portraitCodeBadge.textContent = "";
    elements.portraitCodeBadge.classList.add("hidden");
  }

  // O nome do arquivo fica dentro da moldura, junto do "Sem imagem": quem for
  // salvar o retrato já lê ali como o arquivo precisa se chamar.
  elements.portraitFileName.textContent = code ? buildPortraitFileName(portraitNumber, "png") : "";
  elements.portraitFileHint.classList.toggle("hidden", !code);

  // O botão de remover só vale para retratos antigos salvos na própria ficha;
  // imagem da pasta se troca trocando o arquivo.
  elements.removePortraitButton.classList.toggle("hidden", !legacyPortrait);

  if (legacyPortrait) {
    loadPortraitCandidates([legacyPortrait], attempt);
    return;
  }

  loadPortraitCandidates(buildPortraitCandidates(portraitNumber), attempt);
}

function renderCharacterWorkspace() {
  rebuildDynamicSections();
  hydrateForm();
  renderPortrait();
  renderInventory();
  renderNotes();
  renderHistory();
  renderContacts();
  recalculateDerivedFields();
  renderSheetSelector();
  renderSessionSummary();
  renderAttributePendingPoints();
  renderUpgradePendingPoints();
  updateEvolveButtonVisibility();
  applySheetMode();
  showApp();
  updateSaveStatus(state.saveInFlight || state.uploadInFlight || state.hasUnsavedChanges ? "Salvando" : "Salvo", state.saveInFlight || state.uploadInFlight || state.hasUnsavedChanges ? "saving" : "saved");

  // Re-renderizações podem mudar a altura dos painéis: o popup do passo a passo
  // precisa reencontrar o elemento destacado.
  if (state.wizard.active) {
    applyWizardSpotlight(WIZARD_STEPS[state.wizard.index], { scroll: false });
    requestAnimationFrame(positionWizardPopup);
  }
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

  // O mestre pode editar perícias e aprimoramentos de qualquer ficha, inclusive
  // em modo de Jogo. As alterações são salvas automaticamente (autosave), e as
  // regras do Firestore já autorizam o mestre a atualizar qualquer personagem.
  const canEditDynamic = !isPlay || masterUser;

  elements.saveSheetButton.classList.toggle("hidden", !hasCharacter || isPlay);
  elements.printSheetButton?.classList.toggle("hidden", !hasCharacter);
  elements.attributePointsBadge.classList.toggle("hidden", !isCreation);
  elements.upgradePointsPool.classList.toggle("hidden", !isCreation);
  if (elements.evolutionUpgradePointsBadge) {
    elements.evolutionUpgradePointsBadge.classList.toggle("hidden", !isEvolution);
  }
  if (elements.skillPointsField) {
    elements.skillPointsField.classList.toggle("hidden", isPlay && !masterUser);
  }
  elements.addSkillRow.classList.toggle("hidden", !canEditDynamic);
  elements.addCombatSkillRow.classList.toggle("hidden", !canEditDynamic);
  elements.addUpgradeRow.classList.toggle("hidden", !canEditDynamic);
  if (elements.openKitCatalog) {
    elements.openKitCatalog.classList.toggle("hidden", !isCreation);
  }

  // O mestre pode corrigir os valores de atributo em qualquer modo da ficha.
  attributeDefinitions.forEach(({ key }) => {
    setFieldReadonly(`${key}Valor`, (isPlay || isEvolution) && !masterUser);
  });

  document.querySelectorAll('#skillsTable input[data-field]').forEach((input) => {
    const f = input.dataset.field || "";
    if (f.endsWith(":teste")) return;
    input.toggleAttribute("readonly", !canEditDynamic);
  });

  document.querySelectorAll('#combatSkillsTable input[data-field]').forEach((input) => {
    const f = input.dataset.field || "";
    if (f.endsWith(":atkTeste") || f.endsWith(":defTeste") || f.endsWith(":teste")) return;
    input.toggleAttribute("readonly", !canEditDynamic);
  });

  document.querySelectorAll('#upgradesGrid input[data-field]').forEach((input) => {
    input.toggleAttribute("readonly", (isPlay || isEvolution) && !masterUser);
  });

  setFieldReadonly("nivel", !isCreation);
  setFieldReadonly("xp", !isCreation && !masterUser);

  // Fora da criação o campo de profissão não responde ao clique, então também
  // não finge ser clicável.
  document.querySelector('[data-field="classeSocialProfissao"]')
    ?.classList.toggle("is-editable-prompt", isCreation);

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
  const next = String(remaining);

  if (elements.attributePointsValue.textContent !== next) {
    bumpElement(elements.attributePointsValue);
  }

  elements.attributePointsValue.textContent = next;
  elements.attributePointsValue.classList.toggle("depleted", remaining < 0);
}

// Pequeno "pulo" do contador sempre que o número muda.
function bumpElement(element) {
  if (!element) {
    return;
  }

  element.classList.remove("is-bumping");
  void element.offsetWidth;
  element.classList.add("is-bumping");
  setTimeout(() => element.classList.remove("is-bumping"), 460);
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
  openDialogAnimated(elements.saveSheetDialog);
}

async function confirmSaveSheet() {
  if (!hasActiveCharacter()) {
    closeDialogAnimated(elements.saveSheetDialog);
    return;
  }
  const wasCreation = getActiveCharacterMode() === "creation";

  mutateActiveCharacter((character) => {
    character.state = "play";
  });
  markCharacterDirty();
  closeDialogAnimated(elements.saveSheetDialog);
  finishWizard({ silent: true });
  applySheetMode();
  updateEvolveButtonVisibility();
  await flushPendingChanges();
  showToast(wasCreation ? "Ficha criada! Modo de Jogo ativado." : "Evolução salva com sucesso.", "success", wasCreation ? "☠️" : "⭐");
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
    const modifier = parseSignedModifier(getFieldValue(`${key}Mod`));
    const test = (value + modifier) * 4;

    setFieldValue(`${key}Teste`, String(test));
    total += value;
  });

  setFieldValue("atributosTotal", String(total));
}

// O modificador é lido pelo sinal digitado: "+2" soma 2, "-2" subtrai 2 e "2"
// (sem sinal) também subtrai, que é o comportamento padrão da ficha.
function parseSignedModifier(rawValue) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) {
    return 0;
  }

  const match = raw.match(/^([+-]?)(\d+)$/);
  if (!match) {
    return 0;
  }

  const magnitude = parseInt(match[2], 10) || 0;
  return match[1] === "+" ? magnitude : -magnitude;
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

  // O catálogo carrega de forma assíncrona: as linhas já desenhadas precisam
  // ganhar o ícone de descrição assim que ele estiver disponível.
  decorateUpgradeInfoIcons();
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
  openDialogAnimated(elements.kitCatalogDialog);
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
  closeDialogAnimated(elements.kitCatalogDialog);
  showToast(`Kit "${kit.name}" aplicado à ficha.`, "success", "🎒");
  // O kit já batizou a profissão: o passo da pergunta cumpriu seu papel.
  leaveProfessionStep();
}

function openUpgradeCatalogDialog() {
  if (!hasActiveCharacter()) return;

  state.upgradeCatalogSelection = { upgrade: null };
  state.upgradeCatalogTab = "positive";
  elements.upgradeCatalogTabBar.querySelectorAll(".catalog-tab").forEach((t) => {
    t.classList.toggle("is-active", t.dataset.tab === "positive");
  });

  const restrictToPositive = getActiveCharacterMode() === "evolution" && !isMasterUser();
  elements.upgradeCatalogTabBar.classList.toggle("hidden", restrictToPositive);

  elements.upgradeCatalogSearch.value = "";
  renderUpgradeCatalogList("");
  renderUpgradeCatalogDetail();
  elements.confirmUpgradeCatalog.disabled = true;
  openDialogAnimated(elements.upgradeCatalogDialog);
  setTimeout(() => elements.upgradeCatalogSearch.focus(), 50);
}

function renderUpgradeCatalogList(filter) {
  const lower = (filter || "").trim().toLowerCase();
  // Na evolução o jogador só compra aprimoramentos positivos, mas o mestre
  // continua com acesso às duas abas para corrigir qualquer ficha.
  const restrictToPositive = getActiveCharacterMode() === "evolution" && !isMasterUser();
  const activeTab = restrictToPositive ? "positive" : state.upgradeCatalogTab;
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
  const canAfford = isMasterUser()
    ? true
    : (isEvolutionMode
      ? (isPositive && evolutionPts >= entry.cost)
      : (isPositive ? remaining >= entry.cost : true));

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
  const next = String(remaining);

  if (elements.upgradePointsPoolValue.textContent !== next) {
    bumpElement(elements.upgradePointsPoolValue);
  }

  elements.upgradePointsPoolValue.textContent = next;
  elements.upgradePointsPoolValue.classList.toggle("depleted", remaining < 0);
}

function confirmUpgradeCatalogSelection() {
  const sel = state.upgradeCatalogSelection;
  if (!sel?.upgrade || !hasActiveCharacter()) return;

  const entry = sel.upgrade;
  const isPositive = entry.type === "positive";
  const signedCost = isPositive ? -entry.cost : entry.cost;
  const isEvolutionMode = getActiveCharacterMode() === "evolution";

  // O mestre adiciona aprimoramentos livremente, sem travar pelo saldo de pontos.
  if (!isMasterUser()) {
    if (isEvolutionMode) {
      if (!isPositive) return;
      const evPts = getActiveCharacter()?.evolutionUpgradePoints || 0;
      if (evPts < entry.cost) return;
    } else if (isPositive && computeUpgradePoolRemaining() < entry.cost) {
      return;
    }
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
    // Aprimoramentos negativos não consomem pontos de evolução — eles devolvem pontos.
    if (isEvolutionMode && isPositive) {
      character.evolutionUpgradePoints = Math.max(0, (character.evolutionUpgradePoints || 0) - entry.cost);
    }
  });

  markCharacterDirty();
  rebuildDynamicSections();
  hydrateForm();
  recalculateDerivedFields();
  applySheetMode();
  closeDialogAnimated(elements.upgradeCatalogDialog);
  showToast(`Aprimoramento "${entry.name}" adicionado.`, "success", "🧬");
}

function openSkillCatalogDialog() {
  if (!hasActiveCharacter()) return;

  state.skillCatalogSelection = { skill: null, subgroup: null, valor: "" };
  elements.skillCatalogSearch.value = "";
  renderSkillCatalogList("");
  renderSkillCatalogDetail();
  elements.confirmSkillCatalog.disabled = true;
  openDialogAnimated(elements.skillCatalogDialog);
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
  closeDialogAnimated(elements.skillCatalogDialog);
  showToast(`Perícia "${displayName}" adicionada.`, "success", "🎯");
}

function openCombatSkillCatalogDialog() {
  if (!hasActiveCharacter()) return;

  state.combatSkillCatalogSelection = null;
  elements.combatSkillCatalogSearch.value = "";
  renderCombatSkillCatalogList("");
  elements.combatSkillCatalogDetail.innerHTML = `<p class="skill-catalog-empty">Selecione uma perícia à esquerda</p>`;
  elements.confirmCombatSkillCatalog.disabled = true;
  openDialogAnimated(elements.combatSkillCatalogDialog);
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
  closeDialogAnimated(elements.combatSkillCatalogDialog);
  showToast(`Perícia de combate "${displayName}" adicionada.`, "success", "🔪");
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
  character.backpackSize = normalizeBackpackSize(character.backpackSize, character.inventoryItems.length);
  character.equipmentSlots = sanitizeEquipmentSlots(character.equipmentSlots);
  character.contacts = sanitizeContacts(character.contacts || []);
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
  return MASTER_EMAILS.includes(normalizedEmail) ? "gm" : "player";
}

async function ensureOwnerHasAtLeastOneCharacter(profile) {
  const existingCharacters = await getDocs(query(collection(db, "characters"), where("ownerId", "==", profile.id)));
  if (!existingCharacters.empty) {
    return;
  }

  const characterRef = doc(collection(db, "characters"));
  const character = createDefaultCharacter(profile, 1);
  character.portraitNumber = await allocatePortraitNumber().catch((error) => {
    console.error(error);
    return 0;
  });
  await setDoc(characterRef, serializeCharacterForWrite({ ...character, id: characterRef.id }));
}

function highestKnownPortraitNumber() {
  return Object.values(state.charactersMap).reduce((highest, character) => {
    const value = Math.floor(Number(character?.portraitNumber));
    return Number.isFinite(value) && value > highest ? value : highest;
  }, 0);
}

// O contador só cresce: um número entregue nunca volta para a fila. É isso que
// impede a imagem de um personagem de "escorregar" para outro quando alguma
// ficha é excluída. O maior número conhecido serve de piso caso o documento do
// contador se perca.
async function allocatePortraitNumber() {
  const counterRef = doc(db, ...PORTRAIT_COUNTER_PATH);

  return runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(counterRef);
    const stored = Math.floor(Number(snapshot.exists() ? snapshot.data().lastPortraitNumber : 0));
    const lastPortraitNumber = Number.isFinite(stored) && stored > 0 ? stored : 0;
    const portraitNumber = Math.max(lastPortraitNumber, highestKnownPortraitNumber()) + 1;

    transaction.set(counterRef, {
      lastPortraitNumber: portraitNumber,
      updatedAtMs: Date.now(),
    }, { merge: true });

    return portraitNumber;
  });
}

async function ensurePortraitNumber(characterId) {
  const character = state.charactersMap[characterId];
  if (!character || formatPortraitCode(character.portraitNumber) || state.portraitNumberRequests.has(characterId)) {
    return;
  }

  state.portraitNumberRequests.add(characterId);

  try {
    const portraitNumber = await allocatePortraitNumber();
    await setDoc(
      doc(db, "characters", characterId),
      { portraitNumber, updatedAtMs: Date.now() },
      { merge: true },
    );

    const localCharacter = state.charactersMap[characterId];
    if (localCharacter && !formatPortraitCode(localCharacter.portraitNumber)) {
      localCharacter.portraitNumber = portraitNumber;
      if (characterId === state.selectedCharacterId) {
        renderPortrait();
      }
    }
  } catch (error) {
    console.error(error);
    state.portraitNumberRequests.delete(characterId);
  }
}

// Fichas criadas antes dessa numeração recebem o número aqui, na ordem de
// criação. Roda uma de cada vez para não disputar o contador com si mesma.
async function backfillMissingPortraitNumbers() {
  if (state.portraitBackfillInFlight) {
    return;
  }

  const pending = Object.values(state.charactersMap)
    .filter((character) => character
      && !formatPortraitCode(character.portraitNumber)
      && !state.portraitNumberRequests.has(character.id))
    .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0));

  if (!pending.length) {
    return;
  }

  state.portraitBackfillInFlight = true;

  try {
    for (const character of pending) {
      await ensurePortraitNumber(character.id);
    }
  } finally {
    state.portraitBackfillInFlight = false;
  }
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

      maybeAutoStartWizard();
      backfillMissingPortraitNumbers();
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
    portraitNumber: 0,
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
    contacts: [],
    state: "creation",
    pendingAttributePoint: 0,
    pendingUpgradePoint: 0,
    evolutionUpgradePoints: 0,
    inventoryItems: [],
    backpackSize: DEFAULT_BACKPACK_SIZE,
    equipmentSlots: sanitizeEquipmentSlots(null),
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
  normalized.backpackSize = normalizeBackpackSize(rawCharacter.backpackSize, normalized.inventoryItems.length);
  normalized.equipmentSlots = sanitizeEquipmentSlots(rawCharacter.equipmentSlots);
  normalized.contacts = sanitizeContacts(rawCharacter.contacts || normalized.contacts);
  if (!normalized.state || !["creation", "play", "evolution"].includes(normalized.state)) {
    normalized.state = rawCharacter.state || "play";
  }

  return normalized;
}

function serializeCharacterForWrite(character) {
  const { id, ...payload } = character;

  // Nunca gravar portraitNumber vazio por cima de um número já atribuído: o
  // número pode ter sido gerado em outra aba/sessão enquanto esta ficha estava
  // aberta, e regravá-lo como 0 faria a ficha perder o retrato.
  if (!formatPortraitCode(payload.portraitNumber)) {
    delete payload.portraitNumber;
  }

  return {
    ...payload,
    dynamicUpgrades: sanitizeUpgradeRows(payload.dynamicUpgrades || []),
    dynamicSkills: sanitizeSkillRows(payload.dynamicSkills || []),
    dynamicCombatSkills: sanitizeCombatSkillRows(payload.dynamicCombatSkills || []),
    inventoryItems: sanitizeInventoryItems(payload.inventoryItems || []),
    backpackSize: normalizeBackpackSize(payload.backpackSize, (payload.inventoryItems || []).length),
    equipmentSlots: sanitizeEquipmentSlots(payload.equipmentSlots),
    contacts: sanitizeContacts(payload.contacts || []),
  };
}

function sanitizeUpgradeRows(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    const nome = row.nome ?? "";
    const valor = row.valor ?? "";
    const isEmpty = String(nome).trim() === "" && String(valor).trim() === "";
    return {
      id: row.id || crypto.randomUUID(),
      nome,
      valor,
      isPlaceholder: Boolean(row.isPlaceholder) && isEmpty,
    };
  });

  if (!normalized.length) {
    return [createUpgradePlaceholder()];
  }

  return normalized;
}

function sanitizeSkillRows(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    const nome = row.nome ?? "";
    const atributo = row.atributo ?? "";
    const valor = row.valor ?? "";
    const teste = row.teste ?? "";
    const isEmpty = [nome, atributo, valor, teste].every((value) => String(value).trim() === "");
    return {
      id: row.id || crypto.randomUUID(),
      nome,
      atributo,
      valor,
      teste,
      isPlaceholder: Boolean(row.isPlaceholder) && isEmpty,
    };
  });

  if (!normalized.length) {
    return [createSkillPlaceholder()];
  }

  return normalized;
}

function sanitizeCombatSkillRows(rows) {
  const normalized = (Array.isArray(rows) ? rows : []).map((row) => {
    const nome = row.nome ?? "";
    const base = {
      id: row.id || crypto.randomUUID(),
      nome,
      combatType: row.combatType ?? "melee",
      combatGroup: row.combatGroup ?? "martial",
      isPlaceholder: Boolean(row.isPlaceholder) && String(nome).trim() === "",
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

  if (!normalized.length) {
    return [createCombatSkillPlaceholder()];
  }

  return normalized;
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
  const items = (Array.isArray(rows) ? rows : []).map((row) => ({
    id: row.id || crypto.randomUUID(),
    item: row.item ?? "",
    quantidade: row.quantidade ?? "",
    peso: row.peso ?? "",
    valor: row.valor ?? "",
  }));

  // Slots vazios no meio da mochila são posição, e por isso ficam. Só a cauda
  // vazia é descartada, para o documento não crescer a cada digitação.
  let last = items.length - 1;
  while (last >= 0 && isEmptyInventoryItem(items[last])) {
    last -= 1;
  }

  return items.slice(0, last + 1);
}

function createEquipmentSlot() {
  return {
    iconId: "",
    kind: "",
    nome: "",
    dano: "",
    rof: "",
    carregador: "",
    municao: "",
    reserva: "",
  };
}

function sanitizeEquipmentSlots(raw) {
  const source = raw && typeof raw === "object" ? raw : {};
  const slots = {};

  EQUIPMENT_SLOT_DEFS.forEach(({ key }) => {
    const stored = source[key] && typeof source[key] === "object" ? source[key] : {};
    const icon = WEAPON_ICON_MAP.get(stored.iconId);

    slots[key] = {
      iconId: icon ? stored.iconId : "",
      kind: icon ? icon.kind : "",
      nome: stored.nome ?? "",
      dano: stored.dano ?? "",
      rof: stored.rof ?? "",
      carregador: stored.carregador ?? "",
      municao: stored.municao ?? "",
      reserva: stored.reserva ?? "",
    };
  });

  return slots;
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
  state.wizard.offered.clear();

  closeAllDrawers();
  hideUpgradeTooltip();
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

function toPositiveInt(value) {
  const parsed = parseInt(String(value ?? "").replace(/[^\d]/g, ""), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function sanitizeIntegerInput(value) {
  return String(value || "")
    .replace(/[^\d-]/g, "")
    .replace(/(?!^)-/g, "");
}

// Aceita apenas dígitos com, no máximo, um sinal + ou - na primeira posição.
function sanitizeModifierInput(value) {
  const raw = String(value || "");
  const sign = raw.startsWith("+") ? "+" : (raw.startsWith("-") ? "-" : "");
  const digits = raw.replace(/[^\d]/g, "");

  if (!digits) {
    return sign;
  }

  return `${sign}${digits}`;
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
    "permission-denied": "Permissão negada pelo banco de dados. As regras do Firestore precisam ser atualizadas (firebase deploy --only firestore:rules).",
    "unavailable": "Sem conexão com o servidor. Verifique sua internet e tente novamente.",
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

/* ==========================================================================
   Impressão / PDF da ficha
   ========================================================================== */

/**
 * Monta um documento próprio para impressão em uma nova aba e manda imprimir.
 * A tela do jogo é escura e cheia de campos de formulário: imprimir a página
 * como ela é gastaria tinta e cortaria as gavetas (pertences, anotações e
 * história), que ficam fora do fluxo. Aqui o conteúdo é remontado em papel
 * branco, na ordem da ficha, com tudo o que está fora da tela junto.
 */
function handlePrintSheet() {
  if (!hasActiveCharacter()) {
    showToast("Nenhuma ficha aberta para imprimir.", "danger", "🖨️");
    return;
  }

  // Campos derivados (testes, PV, totais) só vão para o objeto do personagem no
  // save; até lá o valor atual está no DOM. Por isso o documento lê o DOM
  // primeiro e usa o personagem como reserva.
  void flushPendingChanges();

  const printWindow = window.open("", "_blank", "width=920,height=1200");
  if (!printWindow) {
    showToast("Libere os pop-ups deste site para gerar o PDF.", "danger", "🖨️");
    return;
  }

  printWindow.document.open();
  printWindow.document.write(buildPrintDocument(getActiveCharacter()));
  printWindow.document.close();
}

function printValue(fieldKey, fallback = "") {
  const fromDom = getFieldValue(fieldKey);
  if (String(fromDom).trim() !== "") {
    return String(fromDom);
  }

  const value = String(fallback ?? "").trim();
  return value;
}

function printCell(value) {
  const text = String(value ?? "").trim();
  return text === "" ? "—" : escapeHtml(text);
}

function printParagraphs(text) {
  const content = String(text ?? "").trim();
  if (!content) {
    return `<p class="print-empty">Sem registros.</p>`;
  }

  return `<div class="print-longtext">${escapeHtml(content)}</div>`;
}

function isPrintableSkillRow(row) {
  if (row.isPlaceholder) return false;
  return [row.nome, row.atributo, row.valor, row.teste]
    .some((value) => String(value ?? "").trim() !== "");
}

function isPrintableUpgradeRow(row) {
  if (row.isPlaceholder) return false;
  return [row.nome, row.valor].some((value) => String(value ?? "").trim() !== "");
}

function isPrintableInventoryRow(row) {
  return [row.item, row.quantidade, row.peso, row.valor]
    .some((value) => String(value ?? "").trim() !== "");
}

function buildPrintDocument(character) {
  const name = printValue("nome", character.nome) || "Personagem sem nome";
  const player = character.ownerDisplayName || "—";
  const profession = printValue("classeSocialProfissao", character.classeSocialProfissao);
  const level = printValue("nivel", character.nivel);
  const portraitSrc = elements.portraitFrame.classList.contains("has-image")
    ? (elements.portraitImage.currentSrc || elements.portraitImage.src || "")
    : "";
  const portraitCode = formatPortraitCode(character.portraitNumber);
  const printedAt = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });

  const metaLine = [
    `Jogador: ${player}`,
    profession ? `Profissão: ${profession}` : "",
    level ? `Nível: ${level}` : "",
    portraitCode ? `Ficha #${portraitCode}` : "",
    `Impresso em ${printedAt}`,
  ].filter(Boolean).map((part) => escapeHtml(part)).join(" · ");

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Ficha - ${escapeHtml(name)}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Courier+Prime:wght@400;700&family=Special+Elite&display=swap" rel="stylesheet">
<style>${buildPrintStyles()}</style>
</head>
<body>
<div class="print-toolbar">
  <button type="button" onclick="window.print()">Imprimir / Salvar em PDF</button>
  <button type="button" onclick="window.close()">Fechar</button>
</div>

<header class="print-header">
  <p class="print-kicker">Ficha de Personagem · Sistema Daemon</p>
  <h1>${escapeHtml(name)}</h1>
  <p class="print-meta">${metaLine}</p>
</header>

${buildPrintIdentificationSection(character, portraitSrc)}
${buildPrintAttributesSection(character)}
${buildPrintSkillsSection(character)}
${buildPrintCombatSkillsSection(character)}
${buildPrintUpgradesSection(character)}
${buildPrintEquipmentSection(character)}
${buildPrintInventorySection(character)}
${buildPrintContactsSection(character)}
${buildPrintTextSection("Anotações", character.notesText)}
${buildPrintTextSection("História", character.historyText)}

<script>
  window.addEventListener("load", () => {
    window.focus();
    // Um quadro de folga deixa a fonte e o retrato entrarem antes da prévia.
    setTimeout(() => window.print(), 350);
  });
<\/script>
</body>
</html>`;
}

function buildPrintStyles() {
  return `
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body {
    margin: 0;
    padding: 18px 20px 40px;
    background: #fff;
    color: #16130f;
    font-family: "Courier Prime", "Courier New", monospace;
    font-size: 11px;
    line-height: 1.4;
  }
  h1, h2 { font-family: "Special Elite", "Courier Prime", "Courier New", monospace; margin: 0; }
  .print-toolbar {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    margin-bottom: 16px;
  }
  .print-toolbar button {
    font: inherit;
    padding: 8px 16px;
    border: 1px solid #7e0f14;
    border-radius: 999px;
    background: #7e0f14;
    color: #fff;
    cursor: pointer;
  }
  .print-toolbar button + button { background: #fff; color: #7e0f14; }
  .print-header {
    border-bottom: 2px solid #7e0f14;
    padding-bottom: 8px;
    margin-bottom: 14px;
  }
  .print-kicker {
    margin: 0 0 2px;
    font-size: 10px;
    letter-spacing: 0.16em;
    text-transform: uppercase;
    color: #6b5b45;
  }
  .print-header h1 { font-size: 22px; line-height: 1.15; }
  .print-meta { margin: 4px 0 0; font-size: 10px; color: #4a4034; }
  /* Seções curtas não se partem; as tabelas longas podem virar a página, mas
     sempre em cima de uma linha inteira e repetindo o cabeçalho. */
  .print-section { margin-bottom: 14px; }
  .print-section.print-compact { break-inside: avoid; }
  .print-section h2 { break-after: avoid; }
  thead { display: table-header-group; }
  tr { break-inside: avoid; }
  .print-section h2 {
    font-size: 13px;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    border-bottom: 1px solid #b9a887;
    padding-bottom: 3px;
    margin-bottom: 7px;
  }
  .print-contact { break-inside: avoid; margin-bottom: 9px; }
  .print-contact h3 {
    font-size: 11.5px;
    margin: 0 0 3px;
    border-bottom: 1px dotted #b9a887;
  }
  .print-contact p { margin: 0 0 2px; }
  .print-contact ul { margin: 2px 0 0; padding-left: 16px; }
  .print-columns { display: flex; gap: 14px; align-items: flex-start; }
  .print-columns > * { flex: 1 1 0; min-width: 0; }
  .print-portrait {
    flex: 0 0 34mm;
    border: 1px solid #8a7a5e;
    padding: 3px;
  }
  .print-portrait img { width: 100%; display: block; }
  .print-fields {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px 12px;
  }
  .print-field { border-bottom: 1px dotted #b9a887; padding-bottom: 2px; }
  .print-field span {
    display: block;
    font-size: 8.5px;
    letter-spacing: 0.1em;
    text-transform: uppercase;
    color: #6b5b45;
  }
  .print-field strong { font-weight: 700; font-size: 11.5px; }
  table { width: 100%; border-collapse: collapse; }
  th, td {
    border: 1px solid #b9a887;
    padding: 3px 6px;
    text-align: left;
    vertical-align: top;
  }
  th {
    font-size: 8.5px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    background: #efe8d8;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  td.num, th.num { text-align: center; width: 12%; }
  tr.print-group td {
    background: #f6f1e5;
    font-weight: 700;
    letter-spacing: 0.06em;
    text-transform: uppercase;
    font-size: 9px;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  tr.print-total td { font-weight: 700; }
  .print-empty { color: #6b5b45; font-style: italic; margin: 0; }
  .print-longtext {
    white-space: pre-wrap;
    border: 1px solid #b9a887;
    padding: 8px 10px;
    min-height: 24mm;
  }
  @media print {
    .print-toolbar { display: none; }
    body { padding: 0; font-size: 10.5px; }
  }
  `;
}

function buildPrintIdentificationSection(character, portraitSrc) {
  const fields = identificationFields
    .map(([key, label]) => `
      <div class="print-field">
        <span>${escapeHtml(label)}</span>
        <strong>${printCell(printValue(key, character[key]))}</strong>
      </div>`)
    .join("");

  const portrait = portraitSrc
    ? `<div class="print-portrait"><img src="${escapeAttribute(portraitSrc)}" alt="Retrato de ${escapeAttribute(character.nome || "personagem")}"></div>`
    : "";

  return `
<section class="print-section print-compact">
  <h2>Identificação</h2>
  <div class="print-columns">
    ${portrait}
    <div class="print-fields">${fields}</div>
  </div>
</section>`;
}

function buildPrintAttributesSection(character) {
  const rows = attributeDefinitions
    .map(({ key, label }) => `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td class="num">${printCell(printValue(`${key}Valor`, character[`${key}Valor`]))}</td>
        <td class="num">${printCell(printValue(`${key}Mod`, character[`${key}Mod`]))}</td>
        <td class="num">${printCell(printValue(`${key}Teste`, character[`${key}Teste`]))}</td>
      </tr>`)
    .join("");

  const status = statusFields
    .map(([key, label]) => `
      <tr>
        <td>${escapeHtml(label)}</td>
        <td class="num">${printCell(printValue(key, character[key]))}</td>
      </tr>`)
    .join("");

  const skillPoints = printValue("periciasPontos", character.periciasPontos);

  return `
<section class="print-section print-compact">
  <div class="print-columns">
    <div>
      <h2>Atributos</h2>
      <table>
        <thead>
          <tr><th>Atributo</th><th class="num">Valor</th><th class="num">Modif.</th><th class="num">Teste %</th></tr>
        </thead>
        <tbody>
          ${rows}
          <tr class="print-total">
            <td>Total</td>
            <td class="num">${printCell(printValue("atributosTotal", character.atributosTotal))}</td>
            <td class="num"></td>
            <td class="num"></td>
          </tr>
        </tbody>
      </table>
    </div>
    <div>
      <h2>Status</h2>
      <table>
        <thead>
          <tr><th>Campo</th><th class="num">Valor</th></tr>
        </thead>
        <tbody>
          ${status}
          <tr class="print-total">
            <td>Pontos de Perícia</td>
            <td class="num">${printCell(skillPoints)}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</section>`;
}

function buildPrintSkillsSection(character) {
  const rows = (character.dynamicSkills || []).filter(isPrintableSkillRow);

  const body = rows.length
    ? rows.map((row) => `
        <tr>
          <td>${printCell(printValue(`dynamicSkill:${row.id}:nome`, row.nome))}</td>
          <td class="num">${printCell(printValue(`dynamicSkill:${row.id}:atributo`, row.atributo))}</td>
          <td class="num">${printCell(printValue(`dynamicSkill:${row.id}:valor`, row.valor))}</td>
          <td class="num">${printCell(printValue(`dynamicSkill:${row.id}:teste`, row.teste))}</td>
        </tr>`).join("")
    : "";

  return `
<section class="print-section">
  <h2>Perícias</h2>
  ${rows.length ? `
  <table>
    <thead>
      <tr><th>Perícia</th><th class="num">Atributo</th><th class="num">Valor</th><th class="num">Teste %</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>` : `<p class="print-empty">Sem perícias registradas.</p>`}
</section>`;
}

function buildPrintCombatSkillsSection(character) {
  const groupLabels = { martial: "Lutas & Artes Marciais", weapons: "Armas Brancas", firearm: "Armas de Fogo" };
  const groupOrder = { martial: 0, weapons: 1, firearm: 2 };
  const rows = (character.dynamicCombatSkills || [])
    .filter((row) => !row.isPlaceholder && String(row.nome ?? "").trim() !== "")
    .sort((a, b) => (groupOrder[a.combatGroup] ?? 99) - (groupOrder[b.combatGroup] ?? 99));

  let lastGroup = null;
  const body = rows.map((row) => {
    let groupRow = "";
    if (row.combatGroup !== lastGroup) {
      lastGroup = row.combatGroup;
      const label = groupLabels[row.combatGroup];
      if (label) {
        groupRow = `<tr class="print-group"><td colspan="4">${escapeHtml(label)}</td></tr>`;
      }
    }

    const id = row.id;
    if (row.combatType === "firearm") {
      return `${groupRow}
        <tr>
          <td>${printCell(printValue(`dynamicCombatSkill:${id}:nome`, row.nome))}</td>
          <td class="num">${printCell(printValue(`dynamicCombatSkill:${id}:atributo`, row.atributo))}</td>
          <td class="num">${printCell(printValue(`dynamicCombatSkill:${id}:valor`, row.valor))}</td>
          <td class="num">${printCell(printValue(`dynamicCombatSkill:${id}:teste`, row.teste))}</td>
        </tr>`;
    }

    // Corpo a corpo tem ataque e defesa: cada célula traz os dois lados
    // separados por barra, na mesma leitura da ficha na tela.
    const attrs = `${printValue(`dynamicCombatSkill:${id}:atributo1`, row.atributo1) || "—"} / ${printValue(`dynamicCombatSkill:${id}:atributo2`, row.atributo2) || "—"}`;
    const values = `${printValue(`dynamicCombatSkill:${id}:atk`, row.atk) || "—"} / ${printValue(`dynamicCombatSkill:${id}:def`, row.def) || "—"}`;
    const tests = `${printValue(`dynamicCombatSkill:${id}:atkTeste`, row.atkTeste) || "—"} / ${printValue(`dynamicCombatSkill:${id}:defTeste`, row.defTeste) || "—"}`;

    return `${groupRow}
      <tr>
        <td>${printCell(printValue(`dynamicCombatSkill:${id}:nome`, row.nome))}</td>
        <td class="num">${escapeHtml(attrs)}</td>
        <td class="num">${escapeHtml(values)}</td>
        <td class="num">${escapeHtml(tests)}</td>
      </tr>`;
  }).join("");

  return `
<section class="print-section">
  <h2>Perícias de Combate</h2>
  ${rows.length ? `
  <table>
    <thead>
      <tr><th>Perícia</th><th class="num">Atributo</th><th class="num">Valor</th><th class="num">Atk % / Def %</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>` : `<p class="print-empty">Sem perícias de combate registradas.</p>`}
</section>`;
}

function buildPrintUpgradesSection(character) {
  const rows = (character.dynamicUpgrades || []).filter(isPrintableUpgradeRow);

  const body = rows.map((row) => `
    <tr>
      <td>${printCell(printValue(`dynamicUpgrade:${row.id}:nome`, row.nome))}</td>
      <td class="num">${printCell(printValue(`dynamicUpgrade:${row.id}:valor`, row.valor))}</td>
    </tr>`).join("");

  return `
<section class="print-section">
  <h2>Aprimoramentos</h2>
  ${rows.length ? `
  <table>
    <thead>
      <tr><th>Aprimoramento</th><th class="num">Valor</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>` : `<p class="print-empty">Sem aprimoramentos registrados.</p>`}
</section>`;
}

function buildPrintEquipmentSection(character) {
  const slots = sanitizeEquipmentSlots(character.equipmentSlots);
  const rows = EQUIPMENT_SLOT_DEFS
    .map((def) => ({ def, slot: slots[def.key], icon: WEAPON_ICON_MAP.get(slots[def.key].iconId) }))
    .filter(({ slot, icon }) => icon || [slot.nome, slot.dano].some((value) => String(value ?? "").trim() !== ""));

  const body = rows.map(({ def, slot, icon }) => {
    const isFirearm = icon?.kind === "firearm";
    const ammo = isFirearm && toPositiveInt(slot.carregador)
      ? `${toPositiveInt(slot.municao)}/${toPositiveInt(slot.carregador)}`
      : "—";

    return `
    <tr>
      <td>${escapeHtml(def.label)}</td>
      <td>${printCell(slot.nome)}</td>
      <td>${escapeHtml(icon ? icon.label : "—")}</td>
      <td class="num">${printCell(slot.dano)}</td>
      <td class="num">${isFirearm ? printCell(slot.rof) : "—"}</td>
      <td class="num">${escapeHtml(ammo)}</td>
      <td class="num">${isFirearm ? printCell(slot.reserva) : "—"}</td>
    </tr>`;
  }).join("");

  return `
<section class="print-section">
  <h2>Equipamento</h2>
  ${rows.length ? `
  <table>
    <thead>
      <tr><th>Slot</th><th>Arma</th><th>Tipo</th><th class="num">Dano</th><th class="num">RoF</th><th class="num">Carreg.</th><th class="num">Reserva</th></tr>
    </thead>
    <tbody>${body}</tbody>
  </table>` : `<p class="print-empty">Nenhuma arma equipada.</p>`}
</section>`;
}

function buildPrintInventorySection(character) {
  const rows = (character.inventoryItems || []).filter(isPrintableInventoryRow);
  const backpack = BACKPACK_SIZES[normalizeBackpackSize(character.backpackSize)];

  const totals = rows.reduce((acc, row) => {
    const quantidade = parseInt(row.quantidade || "0", 10) || 0;
    const peso = parseInt(row.peso || "0", 10) || 0;
    const valor = parseInt(row.valor || "0", 10) || 0;
    acc.peso += peso * (quantidade || 1);
    acc.valor += valor * (quantidade || 1);
    return acc;
  }, { peso: 0, valor: 0 });

  const body = rows.map((row) => `
    <tr>
      <td>${printCell(row.item)}</td>
      <td class="num">${printCell(row.quantidade)}</td>
      <td class="num">${printCell(row.peso)}</td>
      <td class="num">${printCell(row.valor)}</td>
    </tr>`).join("");

  return `
<section class="print-section">
  <h2>Mochila (${escapeHtml(backpack.label)} · ${backpack.slots} slots)</h2>
  ${rows.length ? `
  <table>
    <thead>
      <tr><th>Item</th><th class="num">Quant.</th><th class="num">Peso</th><th class="num">Valor</th></tr>
    </thead>
    <tbody>
      ${body}
      <tr class="print-total">
        <td>Total (quantidade × unidade)</td>
        <td class="num"></td>
        <td class="num">${totals.peso}</td>
        <td class="num">${totals.valor}</td>
      </tr>
    </tbody>
  </table>` : `<p class="print-empty">Nenhum pertence registrado.</p>`}
</section>`;
}

function buildPrintContactsSection(character) {
  const contacts = getContacts(character).filter((contact) => String(contact.nome || "").trim());
  if (!contacts.length) {
    return "";
  }

  const blocks = contacts.map((contact) => {
    const linhas = [
      ["Tipo", CONTACT_TYPE_LABELS[contact.tipo] || "Contato"],
      ["Nascimento", contact.nascimento],
      ["Atuação", contact.atuacao],
      ["Características", contact.caracteristicas],
      ["Descrição", contact.descricao],
    ]
      .filter(([, value]) => String(value || "").trim())
      .map(([label, value]) => `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`)
      .join("");

    const infos = (contact.infos || []).filter((info) => String(info || "").trim());
    const infosHtml = infos.length
      ? `<p><strong>Pode fornecer:</strong></p><ul>${infos.map((info) => `<li>${escapeHtml(info)}</li>`).join("")}</ul>`
      : "";

    return `<div class="print-contact"><h3>${escapeHtml(contact.nome)}</h3>${linhas}${infosHtml}</div>`;
  }).join("");

  return `
<section class="print-section print-text">
  <h2>Contatos e Aliados</h2>
  ${blocks}
</section>`;
}

function buildPrintTextSection(title, text) {
  return `
<section class="print-section print-text">
  <h2>${escapeHtml(title)}</h2>
  ${printParagraphs(text)}
</section>`;
}

/* ==========================================================================
   Passo a passo de criação de personagem
   ========================================================================== */

function startWizard(characterId, { stepId = null } = {}) {
  if (!elements.wizardOverlay || !elements.wizardPopup) {
    return;
  }

  const startIndex = stepId ? WIZARD_STEPS.findIndex((step) => step.id === stepId) : 0;

  state.wizard.active = true;
  state.wizard.index = startIndex > 0 ? startIndex : 0;
  state.wizard.characterId = characterId || state.selectedCharacterId;
  state.wizard.spotlight = null;

  if (state.wizard.characterId) {
    state.wizard.offered.add(state.wizard.characterId);
  }

  document.body.classList.add("wizard-active");
  elements.wizardOverlay.classList.add("is-active");
  elements.wizardOverlay.setAttribute("aria-hidden", "false");
  elements.wizardPopup.setAttribute("aria-hidden", "false");
  lockWizardScroll();

  renderWizardDots();
  renderWizardStep({ animate: true });
}

/* Rolagem travada durante o passo a passo -------------------------------- */

// Áreas que continuam rolando: o próprio popup, as gavetas, os catálogos e
// qualquer campo de texto. O resto da página fica parado.
const WIZARD_SCROLLABLE_AREAS = ".wizard-popup-inner, .inventory-drawer, dialog, textarea, .skill-catalog-list, .skill-catalog-detail, .inventory-rows, .inventory-scroll, .weapon-picker-grid";
const WIZARD_SCROLL_KEYS = new Set(["ArrowUp", "ArrowDown", "PageUp", "PageDown", "Home", "End", " ", "Spacebar"]);

/**
 * Enquanto o assistente conduz a criação, quem decide o que aparece na tela é
 * ele: a roda do mouse não pode mais subir ou descer a ficha por baixo do
 * overlay. A rolagem programada (scrollIntoView) continua funcionando.
 */
function lockWizardScroll() {
  if (state.wizard.scrollLocked) {
    return;
  }

  state.wizard.scrollLocked = true;
  window.addEventListener("wheel", blockWizardScroll, { passive: false, capture: true });
  window.addEventListener("touchmove", blockWizardScroll, { passive: false, capture: true });
  window.addEventListener("keydown", blockWizardScrollKeys, true);
}

function unlockWizardScroll() {
  if (!state.wizard.scrollLocked) {
    return;
  }

  state.wizard.scrollLocked = false;
  window.removeEventListener("wheel", blockWizardScroll, { capture: true });
  window.removeEventListener("touchmove", blockWizardScroll, { capture: true });
  window.removeEventListener("keydown", blockWizardScrollKeys, true);
}

function blockWizardScroll(event) {
  if (event.target?.closest?.(WIZARD_SCROLLABLE_AREAS)) {
    return;
  }

  event.preventDefault();
}

function blockWizardScrollKeys(event) {
  if (!WIZARD_SCROLL_KEYS.has(event.key)) {
    return;
  }

  const target = event.target;
  if (target?.closest?.(WIZARD_SCROLLABLE_AREAS)) {
    return;
  }

  // Digitar num campo da ficha continua livre: as setas andam com o cursor.
  if (target?.matches?.("input, textarea, select, [contenteditable='true']")) {
    return;
  }

  event.preventDefault();
}

/**
 * Abre o passo a passo sozinho quando o jogador cai numa ficha em branco recém
 * criada (por exemplo, logo após o cadastro, onde ele nunca clica em "Nova Ficha").
 * Só dispara uma vez por ficha em cada sessão e nunca para fichas de outros donos.
 */
function maybeAutoStartWizard() {
  if (state.wizard.active) {
    return;
  }

  const character = getActiveCharacter();
  if (!character || character.state !== "creation") {
    return;
  }

  if (state.wizard.offered.has(character.id)) {
    return;
  }

  if (character.ownerId !== state.profile?.id) {
    return;
  }

  const isUntouched = String(character.nome || "").trim() === ""
    && attributeDefinitions.every(({ key }) => String(character[`${key}Valor`] || "").trim() === "");

  if (!isUntouched) {
    state.wizard.offered.add(character.id);
    return;
  }

  startWizard(character.id);
}

function advanceWizard(direction) {
  if (!state.wizard.active) {
    return;
  }

  const currentStep = WIZARD_STEPS[state.wizard.index];
  const nextIndex = state.wizard.index + direction;

  if (nextIndex < 0) {
    return;
  }

  if (nextIndex >= WIZARD_STEPS.length) {
    finishWizard({ completed: true });
    return;
  }

  const nextStep = WIZARD_STEPS[nextIndex];
  if (currentStep?.onLeave && nextStep?.id !== currentStep.id) {
    currentStep.onLeave();
  }

  state.wizard.index = nextIndex;
  renderWizardStep({ animate: true });
}

function finishWizard({ completed = false, skipped = false, silent = false } = {}) {
  if (!state.wizard.active) {
    return;
  }

  const currentStep = WIZARD_STEPS[state.wizard.index];
  currentStep?.onLeave?.();

  clearWizardSpotlight();
  unlockWizardScroll();
  state.wizard.active = false;
  state.wizard.index = 0;
  state.wizard.characterId = null;
  state.wizard.renderToken += 1;

  document.body.classList.remove("wizard-active");
  elements.wizardOverlay?.classList.remove("is-active");
  elements.wizardOverlay?.setAttribute("aria-hidden", "true");
  elements.wizardPopup?.classList.remove("is-active", "is-centered");
  elements.wizardPopup?.setAttribute("aria-hidden", "true");

  if (silent) {
    return;
  }

  if (completed) {
    showToast("Passo a passo concluído. Revise a ficha à vontade.", "success", "🧟");
  } else if (skipped) {
    showToast("Passo a passo encerrado. Você pode preencher a ficha livremente.", "", "🕯️");
  }
}

function renderWizardDots() {
  if (!elements.wizardDots) {
    return;
  }

  elements.wizardDots.innerHTML = "";
  WIZARD_STEPS.forEach(() => {
    const dot = document.createElement("span");
    dot.className = "wizard-dot";
    elements.wizardDots.appendChild(dot);
  });
}

/**
 * Troca de passo sem o popup atravessar a tela: ele sai com zoom out, o destaque
 * e a rolagem se acomodam com ele fora de cena e só então ele reaparece com zoom
 * in já no lugar certo.
 */
function renderWizardStep({ animate = false } = {}) {
  const step = WIZARD_STEPS[state.wizard.index];
  if (!step) {
    return;
  }

  const popup = elements.wizardPopup;
  const token = ++state.wizard.renderToken;
  const wasVisible = popup.classList.contains("is-active");

  step.onEnter?.();
  fillWizardStepContent(step);

  if (animate && wasVisible) {
    popup.classList.remove("is-active");
  }

  const scrolled = applyWizardSpotlight(step);

  // O popup só é medido depois que tudo parou de se mexer: gaveta terminando de
  // abrir ou rolagem suave em curso dariam uma posição que já nasceria errada.
  const waitMs = Math.max(animate && wasVisible ? 190 : 0, step.settleMs || 0);

  setTimeout(() => {
    if (token !== state.wizard.renderToken || !state.wizard.active) {
      return;
    }

    waitForScrollSettle(() => {
      if (token !== state.wizard.renderToken || !state.wizard.active) {
        return;
      }

      positionWizardPopup();
      popup.classList.add("is-active");
      // preventScroll: dar foco ao campo não pode arrastar a página de novo.
      step.focus?.()?.focus?.({ preventScroll: true });
    }, { minWaitMs: scrolled ? 120 : 0 });
  }, waitMs);
}

/**
 * Espera a rolagem suave parar de fato antes de medir posições. Sem isso o
 * popup era posicionado contra um alvo que ainda estava andando pela tela.
 */
function waitForScrollSettle(callback, { minWaitMs = 0, maxWaitMs = 720 } = {}) {
  const startedAt = performance.now();
  let lastY = Math.round(window.scrollY);
  let stableFrames = 0;

  const check = () => {
    const elapsed = performance.now() - startedAt;
    const currentY = Math.round(window.scrollY);
    stableFrames = currentY === lastY ? stableFrames + 1 : 0;
    lastY = currentY;

    if ((elapsed >= minWaitMs && stableFrames >= 3) || elapsed >= maxWaitMs) {
      callback();
      return;
    }

    requestAnimationFrame(check);
  };

  requestAnimationFrame(check);
}

function fillWizardStepContent(step) {
  elements.wizardStepLabel.textContent = step.layout === "center"
    ? step.label
    : `Passo ${state.wizard.index} de ${countWizardFormSteps()} · ${step.label}`;
  elements.wizardTitle.textContent = step.title;
  elements.wizardText.textContent = step.text;
  // Na tela de boas-vindas só existe um caminho: iniciar. O "Voltar" some em vez
  // de aparecer desabilitado.
  const isWelcomeStep = state.wizard.index === 0;
  elements.wizardBack.disabled = isWelcomeStep;
  elements.wizardBack.classList.toggle("hidden", isWelcomeStep);
  elements.wizardNext.textContent = step.nextLabel || "Avançar →";
  elements.wizardSkip.classList.toggle("hidden", state.wizard.index === WIZARD_STEPS.length - 1);

  // Passo de escolha: o "Avançar" sai de cena para o jogador ter que decidir
  // entre comprar um kit ou criar a própria profissão.
  elements.wizardChoices.classList.toggle("hidden", !step.choices);
  elements.wizardNext.classList.toggle("hidden", Boolean(step.choices));
  hideWizardInventedProfession();

  Array.from(elements.wizardDots.children).forEach((dot, index) => {
    dot.classList.toggle("is-done", index < state.wizard.index);
    dot.classList.toggle("is-current", index === state.wizard.index);
  });
}

/**
 * Caminho "não quero kit": troca os dois botões por um campo onde o jogador
 * escreve o nome da profissão que criou — tudo dentro do próprio popup.
 */
function showWizardInventedProfession() {
  elements.wizardChoices.classList.add("hidden");
  elements.wizardInvent.classList.remove("hidden");
  elements.wizardInventInput.value = getFieldValue("classeSocialProfissao") || "";
  // O popup cresce ao abrir o campo: recentraliza antes de dar o foco.
  requestAnimationFrame(() => {
    positionWizardPopup();
    elements.wizardInventInput.focus({ preventScroll: true });
  });
}

function hideWizardInventedProfession() {
  elements.wizardInvent.classList.add("hidden");
}

function confirmInventedProfession() {
  const nome = String(elements.wizardInventInput.value || "").trim();
  if (!nome) {
    elements.wizardInventInput.focus();
    showToast("Escreva o nome da profissão para continuar.", "danger", "✍️");
    return;
  }

  setProfession(nome);
  showToast(`Profissão definida: ${nome}.`, "success", "🧰");
  leaveProfessionStep();
}

/**
 * Único ponto que grava a profissão na ficha — o campo em si é somente leitura,
 * então ou vem daqui ou vem do nome do kit comprado.
 */
function setProfession(nome) {
  mutateActiveCharacter((character) => {
    character.classeSocialProfissao = nome;
  });
  setFieldValue("classeSocialProfissao", nome);
  markCharacterDirty();
}

/**
 * Depois de escolher kit ou inventar a profissão, o assistente segue sozinho
 * para o passo das perícias.
 */
function leaveProfessionStep() {
  if (!state.wizard.active || WIZARD_STEPS[state.wizard.index]?.id !== "profissao") {
    return;
  }
  advanceWizard(1);
}

/**
 * O campo de profissão é somente leitura na ficha. Durante a criação, clicar
 * nele reabre a pergunta de kit/profissão em vez de deixar o jogador travado.
 */
function handleProfessionFieldClick() {
  if (getActiveCharacterMode() !== "creation") {
    return;
  }

  if (state.wizard.active) {
    goToWizardStep("profissao");
    return;
  }

  startWizard(state.selectedCharacterId, { stepId: "profissao" });
}

function goToWizardStep(stepId) {
  const index = WIZARD_STEPS.findIndex((step) => step.id === stepId);
  if (index < 0 || index === state.wizard.index) {
    return;
  }

  WIZARD_STEPS[state.wizard.index]?.onLeave?.();
  state.wizard.index = index;
  renderWizardStep({ animate: true });
}

function countWizardFormSteps() {
  return WIZARD_STEPS.filter((step) => step.layout !== "center").length;
}

/** Retorna true quando pediu uma rolagem suave — quem chama precisa esperá-la. */
function applyWizardSpotlight(step, { scroll = true } = {}) {
  clearWizardSpotlight();

  const target = step?.target?.() || null;
  state.wizard.spotlight = target;

  if (!target) {
    elements.wizardPopup.classList.add("is-centered");
    return false;
  }

  elements.wizardPopup.classList.remove("is-centered");
  target.classList.add("wizard-spotlight");

  // Drawers já ficam no canto da tela; só a ficha precisa rolar até o painel.
  // Re-renderizações do Firestore reaplicam o destaque sem rolar de novo.
  if (scroll && !target.classList.contains("inventory-drawer")) {
    target.scrollIntoView({ behavior: "smooth", block: "center" });
    return true;
  }

  return false;
}

function clearWizardSpotlight() {
  document.querySelectorAll(".wizard-spotlight").forEach((element) => {
    element.classList.remove("wizard-spotlight");
  });
  state.wizard.spotlight = null;
}

/**
 * Coloca o popup ao lado do elemento em destaque. A primeira tentativa é sempre
 * a margem livre do lado de fora da ficha (painel da coluna esquerda -> popup à
 * esquerda; painel da direita ou gaveta -> popup à direita), assim ele não cobre
 * a coluna vizinha nem precisa atravessar a tela de um passo para o outro. Se
 * faltar espaço, tenta o lado oposto, depois abaixo e acima. Sem alvo, fica
 * centralizado.
 */
function positionWizardPopup() {
  const popup = elements.wizardPopup;
  if (!popup || !state.wizard.active) {
    return;
  }

  const target = state.wizard.spotlight;
  // offsetWidth/Height são medidas de layout: não sofrem com o scale da animação
  // de zoom do popup, que distorceria getBoundingClientRect.
  const width = popup.offsetWidth || 340;
  const height = popup.offsetHeight || 260;
  const margin = 16;
  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  if (!target) {
    setWizardPopupPosition(
      (viewportWidth - width) / 2,
      (viewportHeight - height) / 2,
      "center center",
    );
    return;
  }

  const rect = target.getBoundingClientRect();
  const middleTop = rect.top + (rect.height / 2) - (height / 2);
  const middleLeft = rect.left + (rect.width / 2) - (width / 2);

  const atLeft = {
    fits: rect.left >= width + margin,
    left: rect.left - width - margin,
    top: middleTop,
    // A origem aponta para o alvo: o zoom parece nascer do painel destacado.
    origin: "right center",
  };
  const atRight = {
    fits: viewportWidth - rect.right >= width + margin,
    left: rect.right + margin,
    top: middleTop,
    origin: "left center",
  };
  const below = {
    fits: viewportHeight - rect.bottom >= height + margin,
    left: middleLeft,
    top: rect.bottom + margin,
    origin: "center top",
  };
  const above = {
    fits: rect.top >= height + margin,
    left: middleLeft,
    top: rect.top - height - margin,
    origin: "center bottom",
  };

  const outwardIsLeft = rect.left + (rect.width / 2) < viewportWidth / 2;
  const order = outwardIsLeft ? [atLeft, atRight, below, above] : [atRight, atLeft, below, above];
  // Sem folga em lugar nenhum: encosta no rodapé, ainda fora do centro do alvo.
  const placement = order.find((candidate) => candidate.fits)
    || { left: middleLeft, top: viewportHeight - height - margin, origin: "center bottom" };

  setWizardPopupPosition(placement.left, placement.top, placement.origin);
}

function setWizardPopupPosition(left, top, origin) {
  const popup = elements.wizardPopup;
  const width = popup.offsetWidth || 340;
  const height = popup.offsetHeight || 260;
  const margin = 16;

  popup.style.setProperty("--wizard-origin", origin);
  popup.style.left = `${Math.round(clampValue(left, margin, Math.max(margin, window.innerWidth - width - margin)))}px`;
  popup.style.top = `${Math.round(clampValue(top, margin, Math.max(margin, window.innerHeight - height - margin)))}px`;
}

function clampValue(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function clearFieldSavedStates() {
  document.querySelectorAll("[data-field].saved, [data-field].saving").forEach((field) => {
    field.classList.remove("saved", "saving");
  });
}
