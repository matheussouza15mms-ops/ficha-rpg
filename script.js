import { initializeApp as initializeFirebaseApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
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
import {
  getStorage,
  ref as storageRef,
  uploadBytesResumable,
  getDownloadURL,
} from "https://www.gstatic.com/firebasejs/12.13.0/firebase-storage.js";

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
const storage = getStorage(firebaseApp);

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

const UPGRADES_CATALOG = [
  // COMBATE
  {
    name: "Ambidestria",
    type: "positive",
    cost: 2,
    description: "Use armas/instrumentos com ambas as mãos, direita e esquerda, com igual eficiência. Pode usar duas armas brancas ou armas de fogo ao mesmo tempo (uma em cada mão). Escolha para entrar em um braceio.",
  },
  {
    name: "Armas de Fogo (Pistolas/Revólveres)",
    type: "positive",
    cost: 1,
    description: "O personagem possui treinamento com revólveres ou pistolas. 1 ponto: revólveres ou pistolas; 2 pontos: submetralhadoras, carabinas calibre 12, armas pesadas; 3 pontos: metralhadoras pesadas, outras armas pesadas.",
  },
  {
    name: "Armas de Fogo (Submetralhadoras/Carabinas)",
    type: "positive",
    cost: 2,
    description: "O personagem possui treinamento com submetralhadoras, carabinas calibre 12 e armas pesadas. 1 ponto: revólveres ou pistolas; 2 pontos: submetralhadoras, carabinas calibre 12, armas pesadas; 3 pontos: metralhadoras pesadas, outras armas pesadas.",
  },
  {
    name: "Armas de Fogo (Metralhadoras Pesadas)",
    type: "positive",
    cost: 3,
    description: "O personagem possui treinamento com metralhadoras pesadas e outras armas pesadas. 1 ponto: revólveres ou pistolas; 2 pontos: submetralhadoras, carabinas calibre 12, armas pesadas; 3 pontos: metralhadoras pesadas, outras armas pesadas.",
  },
  // CONHECIMENTO
  {
    name: "Biblioteca (2 subgrupos)",
    type: "positive",
    cost: 1,
    description: "Possui uma vasta biblioteca em seu refúgio. Se estiver em condições de consultá-la, conhecimento ensinado em livros é duplicado. 1 ponto: 2 subgrupos de Perícias; 2 pontos: 5 subgrupos; 3 pontos: 10 subgrupos; 4 pontos: 14 subgrupos.",
  },
  {
    name: "Biblioteca (5 subgrupos)",
    type: "positive",
    cost: 2,
    description: "Possui uma vasta biblioteca em seu refúgio. Se estiver em condições de consultá-la, conhecimento ensinado em livros é duplicado. 1 ponto: 2 subgrupos de Perícias; 2 pontos: 5 subgrupos; 3 pontos: 10 subgrupos; 4 pontos: 14 subgrupos.",
  },
  {
    name: "Biblioteca (10 subgrupos)",
    type: "positive",
    cost: 3,
    description: "Possui uma vasta biblioteca em seu refúgio. Se estiver em condições de consultá-la, conhecimento ensinado em livros é duplicado. 1 ponto: 2 subgrupos de Perícias; 2 pontos: 5 subgrupos; 3 pontos: 10 subgrupos; 4 pontos: 14 subgrupos.",
  },
  {
    name: "Biblioteca (14 subgrupos)",
    type: "positive",
    cost: 4,
    description: "Possui uma vasta biblioteca em seu refúgio. Se estiver em condições de consultá-la, conhecimento ensinado em livros é duplicado. 1 ponto: 2 subgrupos de Perícias; 2 pontos: 5 subgrupos; 3 pontos: 10 subgrupos; 4 pontos: 14 subgrupos.",
  },
  {
    name: "Memória Fotográfica",
    type: "positive",
    cost: 2,
    description: "Você se lembra, com todos os detalhes, de coisas que viu ou ouviu. Textos, figuras, rostos, conversas, etc., podem ser guardados na memória com um mínimo de esforço. Sob condições de tensão que envolvam numerosas distrações, o Personagem precisa ser bem sucedido num Teste de PER para conseguir concentrar-se o suficiente para absorver o que seus sentidos detectam.",
  },
  {
    name: "Sábio",
    type: "positive",
    cost: 1,
    description: "Existe uma Perícia (exceto Perícias de combate) na qual seu Personagem conhece absolutamente tudo o que existe a respeito. Considere que ele tenha 90% nessa Perícia, além de experiência, contatos e conhecimentos relacionados a essa área. Cada Personagem pode escolher este Aprimoramento relacionado a uma Perícia UMA vez; no máximo dois Personagens de cada grupo podem escolhê-lo.",
  },
  // SOCIAL
  {
    name: "Contatos e Aliados (1 aliado)",
    type: "positive",
    cost: 1,
    description: "Um aliado importante. Os aliados têm seus próprios problemas, não estando sempre à disposição, e ocasionalmente cobrarão favores. 1 ponto: um aliado importante; 2 pontos: dois aliados; 3 pontos: quatro aliados; 4 pontos: oito aliados. Cada subgrupo deve ser comprado separadamente.",
  },
  {
    name: "Contatos e Aliados (2 aliados)",
    type: "positive",
    cost: 2,
    description: "Dois aliados importantes. Os aliados têm seus próprios problemas, não estando sempre à disposição, e ocasionalmente cobrarão favores. 1 ponto: um aliado importante; 2 pontos: dois aliados; 3 pontos: quatro aliados; 4 pontos: oito aliados. Cada subgrupo deve ser comprado separadamente.",
  },
  {
    name: "Contatos e Aliados (4 aliados)",
    type: "positive",
    cost: 3,
    description: "Quatro aliados importantes. Os aliados têm seus próprios problemas, não estando sempre à disposição, e ocasionalmente cobrarão favores. 1 ponto: um aliado importante; 2 pontos: dois aliados; 3 pontos: quatro aliados; 4 pontos: oito aliados. Cada subgrupo deve ser comprado separadamente.",
  },
  {
    name: "Contatos e Aliados (8 aliados)",
    type: "positive",
    cost: 4,
    description: "Oito aliados importantes. Os aliados têm seus próprios problemas, não estando sempre à disposição, e ocasionalmente cobrarão favores. 1 ponto: um aliado importante; 2 pontos: dois aliados; 3 pontos: quatro aliados; 4 pontos: oito aliados. Cada subgrupo deve ser comprado separadamente.",
  },
  {
    name: "Controle de Multidões",
    type: "positive",
    cost: 2,
    description: "Você tem o Dom da Palavra, uma aura que desperta a confiança das multidões. O personagem sabe atrair a atenção dos ouvintes e pode manipulá-los a seguirem ordens (com um Teste de Liderança). Permite incitar revoltas, espalhar desconfianças, vender produtos ou discursar em público com uma margem de sucesso muito maior do que qualquer oratória.",
  },
  {
    name: "Eloquente",
    type: "positive",
    cost: 1,
    description: "Você fala bem, com força ou doçura, conforme a ocasião exige, trazendo outras pessoas para o seu lado com discursos audaciosos. Você recebe um bônus igual a +25% em qualquer Teste envolvendo Etiqueta, Impressionar, Lábia e Liderança.",
  },
  {
    name: "Fama (bairro)",
    type: "positive",
    cost: 1,
    description: "Líder reconhecido de um bairro. Você é famoso por seus feitos, sendo figura de destaque na mídia, política ou submundo. Reflete melhor tratamento por NPCs, convites para eventos e assédio de fãs. 1 ponto: bairro; 2 pontos: cidade pequena; 3 pontos: metrópole; 4 pontos: estado/região.",
  },
  {
    name: "Fama (cidade pequena)",
    type: "positive",
    cost: 2,
    description: "Famoso em alguns bairros ou numa cidade pequena. Você é famoso por seus feitos, sendo figura de destaque na mídia, política ou submundo. Reflete melhor tratamento por NPCs, convites para eventos e assédio de fãs. 1 ponto: bairro; 2 pontos: cidade pequena; 3 pontos: metrópole; 4 pontos: estado/região.",
  },
  {
    name: "Fama (metrópole)",
    type: "positive",
    cost: 3,
    description: "Famoso em algumas cidades pequenas ou numa metrópole. Você é famoso por seus feitos, sendo figura de destaque na mídia, política ou submundo. Reflete melhor tratamento por NPCs, convites para eventos e assédio de fãs. 1 ponto: bairro; 2 pontos: cidade pequena; 3 pontos: metrópole; 4 pontos: estado/região.",
  },
  {
    name: "Fama (estado/região)",
    type: "positive",
    cost: 4,
    description: "Famoso em algumas metrópoles, num estado ou região. Você é famoso por seus feitos, sendo figura de destaque na mídia, política ou submundo. Reflete melhor tratamento por NPCs, convites para eventos e assédio de fãs. 1 ponto: bairro; 2 pontos: cidade pequena; 3 pontos: metrópole; 4 pontos: estado/região.",
  },
  {
    name: "Patrono",
    type: "positive",
    cost: 2,
    description: "Um patrono é alguém ou uma organização para qual o Personagem trabalha (governador, vampiro, ordem militar religiosa, clube de caça, etc.). O patrono fornece, dentro de certos limites, equipamento, armamento e financiamento que o personagem precisar, mas em troca ele deve realizar todas as missões, cumprir ordens e obter todos os resultados solicitados.",
  },
  // ATRIBUTOS
  {
    name: "Bom Senso",
    type: "positive",
    cost: 1,
    description: "Todas as vezes que fizer alguma coisa obviamente estúpida, o Mestre pode dar a dica de que 'aquilo não é uma boa ideia'. Muito útil para iniciantes. O Mestre também pode obrigar um jogador a pegar 'táticas ruins'.",
  },
  {
    name: "Concentração",
    type: "positive",
    cost: 2,
    description: "O Personagem é capaz de concentrar-se em seus afazeres com extrema facilidade. Faça um Teste de WILL e, se for bem sucedido, tornará a dificuldade do ato que esteja realizando mais fácil (um Teste Difícil torna-se um Teste Normal).",
  },
  {
    name: "Coragem",
    type: "positive",
    cost: 2,
    description: "Você é totalmente desprovido do medo convencional. Em situações críticas, onde a maioria das pessoas fugiriam apavoradas, você continua firme. No caso de uma aventura de horror, ou em Testes de Resistência contra magias que gerem esse efeito, dobre a porcentagem dos Testes de WILL.",
  },
  {
    name: "Prontidão",
    type: "positive",
    cost: 2,
    description: "O personagem está sempre atento ao menor sinal de perigo. Ele ganha +5 em iniciativas e nunca recebe nenhuma penalidade quando for atacado pelas costas e/ou sofrer ataques surpresa.",
  },
  {
    name: "Temperamento Calmo",
    type: "positive",
    cost: 2,
    description: "O Personagem tem grande conhecimento e controle sobre suas emoções. Isso impede que ele fique agitado ou bravo facilmente, bem como manter tranquilidade frente a um inimigo e não demonstrar medo (embora esteja realmente apavorado). Dobre o valor de um Teste quando a situação estiver relacionada à dissimulação ou autocontrole (Força de Vontade, Carisma, Lábia, Intimidação e outros).",
  },
  // RIQUEZA
  {
    name: "Dívida de Gratidão",
    type: "positive",
    cost: 1,
    description: "Você fez algo a alguém e acabou caindo nas suas graças. O Personagem pode se valer desta dívida para obter certos favores ou benefícios. 1 ponto: alguém lhe deve favores menores (desconto em armas, autorização jurídica, testemunho falso) e os atenderá somente se não vier a prejudicá-lo sob circunstância nenhuma.",
  },
  {
    name: "Recursos e Dinheiro (US$2.000/mês)",
    type: "positive",
    cost: 1,
    description: "Renda de até US$ 2.000 mensais. 1 ponto: US$2.000/mês; 2 pontos: US$4.000/mês; 3 pontos: US$8.000/mês; 4 pontos: US$16.000/mês; 5 pontos: US$32.000+/mês. Valores devem ser convertidos de acordo com a época e local da Campanha.",
  },
  {
    name: "Recursos e Dinheiro (US$4.000/mês)",
    type: "positive",
    cost: 2,
    description: "Renda de até US$ 4.000 mensais. 1 ponto: US$2.000/mês; 2 pontos: US$4.000/mês; 3 pontos: US$8.000/mês; 4 pontos: US$16.000/mês; 5 pontos: US$32.000+/mês. Valores devem ser convertidos de acordo com a época e local da Campanha.",
  },
  {
    name: "Recursos e Dinheiro (US$8.000/mês)",
    type: "positive",
    cost: 3,
    description: "Renda de até US$ 8.000 mensais. 1 ponto: US$2.000/mês; 2 pontos: US$4.000/mês; 3 pontos: US$8.000/mês; 4 pontos: US$16.000/mês; 5 pontos: US$32.000+/mês. Valores devem ser convertidos de acordo com a época e local da Campanha.",
  },
  {
    name: "Recursos e Dinheiro (US$16.000/mês)",
    type: "positive",
    cost: 4,
    description: "Renda de até US$ 16.000 mensais. 1 ponto: US$2.000/mês; 2 pontos: US$4.000/mês; 3 pontos: US$8.000/mês; 4 pontos: US$16.000/mês; 5 pontos: US$32.000+/mês. Valores devem ser convertidos de acordo com a época e local da Campanha.",
  },
  {
    name: "Recursos e Dinheiro (US$32.000+/mês)",
    type: "positive",
    cost: 5,
    description: "Renda de até US$ 32.000+ mensais. 1 ponto: US$2.000/mês; 2 pontos: US$4.000/mês; 3 pontos: US$8.000/mês; 4 pontos: US$16.000/mês; 5 pontos: US$32.000+/mês. Valores devem ser convertidos de acordo com a época e local da Campanha.",
  },
  // HABILIDADES ESPECIAIS
  {
    name: "Improvisador (nível 1)",
    type: "positive",
    cost: 1,
    description: "É capaz de arquitetar pequenas experiências ciente dos resultados que elas podem causar. 1 ponto: pequenas improvisações básicas; 2 pontos: pode resolver problemas que exijam material específico que não possui, utilizando algo que adaptou (requer aprovação do Mestre e Teste de INT).",
  },
  {
    name: "Improvisador (nível 2)",
    type: "positive",
    cost: 2,
    description: "O Personagem pode resolver problemas que exijam material específico que não possui, utilizando algo que ele adaptou. Deve descrever ao Mestre como deseja fazer a improvisação e, se aprovado, fazer um Teste de INT para ver se o improviso deu certo.",
  },
  {
    name: "Inocência (nível 1)",
    type: "positive",
    cost: 1,
    description: "Tem uma habilidade quase sobrenatural de passar a impressão de inocente. Qualquer acusação sem testemunhas ou provas sólidas não cola. 2 pontos: até mesmo uma testemunha pode se convencer de que estava enganada (Teste Normal de Lábia).",
  },
  {
    name: "Inocência (nível 2)",
    type: "positive",
    cost: 2,
    description: "Mesmo uma testemunha pode se convencer de que estava enganada, mediante um Teste Normal de Manipulação (Lábia).",
  },
  {
    name: "Noção Exata do Tempo",
    type: "positive",
    cost: 1,
    description: "Seu relógio biológico é extremamente regular. O personagem é capaz de adivinhar o horário sem precisar consultar relógio, ver a posição do sol ou qualquer outro método. Permite calcular o tempo desde que ficou inconsciente, há quanto tempo está viajando e memorizar o timer de uma bomba.",
  },
  {
    name: "Presença Invisível",
    type: "positive",
    cost: 2,
    description: "Você tem a habilidade de não ser notado; as pessoas só percebem sua presença quando você se anuncia. O personagem não está realmente invisível, mas parece tão insignificante que as pessoas não prestam atenção nele, a menos que venha a se expor abertamente.",
  },
  {
    name: "Saúde de Ferro",
    type: "positive",
    cost: 1,
    description: "Seu personagem recupera 3 Pontos de Vida a cada dois dias, ao invés dos dois normais. Pontos Heroicos são restaurados à taxa de um por dia, ao invés de dois dias. Quando doente ou incapacitado, tem uma resistência natural a doenças.",
  },
  {
    name: "Sedutor",
    type: "positive",
    cost: 1,
    description: "Seu personagem recebe +25% em qualquer Teste de sedução, com sedução natural em qualquer membro do sexo oposto (e até mesmo pessoas do mesmo sexo).",
  },
  {
    name: "Senso de Direção (nível 1)",
    type: "positive",
    cost: 1,
    description: "Seu Personagem sabe se orientar mesmo sem bases visuais. Não precisa de bússola, Sol, estrelas ou outros pontos de referência para saber onde ficam os pontos cardeais. Sempre será capaz de lembrar-se de um caminho que tenha percorrido.",
  },
  {
    name: "Senso de Direção (nível 2)",
    type: "positive",
    cost: 2,
    description: "Igual ao nível 1, mas funciona em qualquer plano de existência em que o Personagem esteja, mesmo em Arcádia ou Spiritum.",
  },
  {
    name: "Senso Numérico",
    type: "positive",
    cost: 1,
    description: "O personagem é capaz de contar imediatamente grande quantidade de objetos, com mínima precisão. Pode contar cabeças de gado, cartas de baralho e coisas semelhantes apenas olhando.",
  },
  {
    name: "Sentidos Aguçados",
    type: "positive",
    cost: 1,
    description: "1 ponto por sentido (visão, audição, tato, olfato ou paladar). Em Testes de Percepção com esses sentidos, o Teste é efetuado com dificuldade reduzida (Difícil → Normal; Normal → Fácil; Fácil → sem rolar dados). Compre uma vez para cada sentido desejado.",
  },
  {
    name: "Sono Leve",
    type: "positive",
    cost: 1,
    description: "Seu personagem possui sono leve e pode acordar com qualquer barulho, movimento brusco ou agitação (e até dormindo). Muito bom para os que não querem ser pegos de surpresa durante o sono.",
  },
  {
    name: "Sortudo",
    type: "positive",
    cost: 2,
    description: "Este personagem é portador de uma sorte incrível. Uma vez por sessão de jogo, o jogador pode rolar novamente um dado que tenha falhado em um Teste (qualquer tipo de rolagem de dados).",
  },
  {
    name: "Talento",
    type: "positive",
    cost: 1,
    description: "1 ponto por Arte: todos os Testes Normais ligados a uma determinada Arte (Perícia) são feitos como Testes Fáceis; Testes Difíceis são feitos como Testes Normais. Atividades que sejam Perícias de Combate não se aplicam. Compre uma vez para cada Arte desejada.",
  },
  {
    name: "Talento Matemático",
    type: "positive",
    cost: 1,
    description: "O personagem tem extrema facilidade em lidar com números, conseguindo fazer cálculos complexos instantaneamente. Pode medir distâncias, contar pessoas em uma multidão, dizer o valor exato de uma maleta cheia de notas e fazer outros cálculos complexos com raciocínio rápido e preciso.",
  },
  {
    name: "Voz de Comando",
    type: "positive",
    cost: 4,
    description: "O personagem é dotado de uma inigualável capacidade de comando. Basta exclamar em voz alta a ordem para conduzir um grupo a desempenhar qualquer tarefa. Faz um Teste de Liderança (sem disputar contra a WILL dos demais); o Mestre define se será Fácil, Normal ou Difícil. Sucesso: TODOS seguem o mandato. Falha: revoltas e desacato das ordens.",
  },
  // NEGATIVOS
  {
    name: "Sono Pesado",
    type: "negative",
    cost: 1,
    description: "Sono pesado.",
  },
];

const UPGRADE_BASE_POOL = 5;
const UPGRADE_NEGATIVE_BONUS_CAP = 3;

const SKILLS_CATALOG = [
  { name: "Animais", attribute: null, subgroups: [
    { name: "Treinamento de Animais", attribute: null },
    { name: "Montaria", attribute: "AGI" },
    { name: "Doma", attribute: null },
    { name: "Veterinária", attribute: null },
  ]},
  { name: "Armadilhas", attribute: "PER", subgroups: [] },
  { name: "Armas Brancas", attribute: "DEX", subgroups: [
    "Facas", "Adagas", "Punhais", "Espadas", "Machados", "Chicotes",
    "Manguais", "Maças", "Martelos", "Arcos", "Bestas", "Lanças",
  ].map((n) => ({ name: n })) },
  { name: "Armas de Fogo", attribute: "DEX", subgroups: [
    "Revólveres", "Pistolas", "Armas Antigas", "Submetralhadoras", "Espingardas",
    "Rifles de Caça", "Rifles Militares", "Metralhadoras", "Armas Pesadas",
    "Granadas", "Armas Experimentais",
  ].map((n) => ({ name: n })) },
  { name: "Artes", attribute: null, subgroups: [
    { name: "Arquitetura", attribute: "CAR" },
    { name: "Atuação", attribute: "CAR" },
    { name: "Canto", attribute: "CAR" },
    { name: "Crítica de Arte", attribute: "PER" },
    { name: "Culinária", attribute: "PER" },
    { name: "Dança", attribute: "AGI" },
    { name: "Desenho e Pintura", attribute: "DEX" },
    { name: "Escapismo", attribute: "AGI" },
    { name: "Escultura", attribute: "DEX" },
    { name: "Fotografia", attribute: "PER" },
    { name: "Ilusionismo", attribute: "DEX" },
    { name: "Instrumentos Musicais", attribute: "DEX" },
    { name: "Joalheria", attribute: "DEX" },
    { name: "Prestidigitação", attribute: "DEX" },
    { name: "Redação", attribute: "INT" },
  ]},
  { name: "Artífice", attribute: "DEX", subgroups: [] },
  { name: "Avaliação de Objetos", attribute: "PER", subgroups: [
    "Antiguidades", "Gemas", "Metais Valiosos (Ourivese)", "Obras de Arte",
  ].map((n) => ({ name: n })) },
  { name: "Camuflagem", attribute: "PER", subgroups: [] },
  { name: "Ciências", attribute: "INT", subgroups: [
    "Agricultura", "Anatomia", "Antropologia", "Arqueologia", "Astronomia", "Botânica",
    "Direito", "Ecologia", "Filosofia", "Física", "Genética", "Geografia", "Geologia",
    "Heráldica", "Herbalismo", "História", "Literatura", "Matemática", "Meteorologia",
    "Pedagogia", "Psicologia", "Química", "Sociologia", "Teologia", "Ufologia", "Zoologia",
  ].map((n) => ({ name: n })) },
  { name: "Ciências Proibidas ou Alternativas", attribute: null, subgroups: [
    "Alquimia", "Anjos", "Astrologia", "Búzios", "Demônios", "Oculto", "Psionicismo",
    "Rituais", "Tarot", "Teoria da Magia", "Vampiros", "Viagem Astral",
  ].map((n) => ({ name: n })) },
  { name: "Condução", attribute: "AGI", subgroups: [
    "Automóvel", "Ônibus", "Caminhão", "Empilhadeira", "Guindaste", "Carruagem",
    "Motocicleta", "Carro de Corrida", "Helicóptero", "Avião Comercial", "Avião Militar",
    "Ônibus Espacial", "Lancha", "Iate", "Veleiro", "Navio Cargueiro", "Ultraleve", "Asa Delta",
  ].map((n) => ({ name: n })) },
  { name: "Disfarce", attribute: "INT", subgroups: [] },
  { name: "Eletrônica", attribute: null, subgroups: [] },
  { name: "Engenharia", attribute: null, subgroups: [
    "Aeronáutica", "Alimentos", "Civil", "Computação", "Demolições", "Elétrica",
    "Eletrônica", "Materiais", "Mecânica", "Mecatrônica", "Naval", "Química",
  ].map((n) => ({ name: n })) },
  { name: "Escutar", attribute: "PER", subgroups: [] },
  { name: "Esquiva", attribute: "AGI", subgroups: [] },
  { name: "Esportes", attribute: null, subgroups: [
    { name: "Acrobacia", attribute: "AGI" },
    { name: "Alpinismo", attribute: "AGI" },
    { name: "Arremesso", attribute: "DEX" },
    { name: "Artes Marciais", attribute: "AGI" },
    { name: "Basquete", attribute: "DEX" },
    { name: "Boxe", attribute: "AGI" },
    { name: "Caça", attribute: "PER" },
    { name: "Canoagem", attribute: "CON" },
    { name: "Corrida", attribute: "CON" },
    { name: "Esqui", attribute: "AGI" },
    { name: "Futebol", attribute: "AGI" },
    { name: "Mergulho", attribute: "CON" },
    { name: "Paraquedismo", attribute: "AGI" },
    { name: "Pesca", attribute: "PER" },
    { name: "Natação", attribute: "AGI" },
    { name: "Salto", attribute: "AGI" },
    { name: "Salto Ornamental", attribute: "AGI" },
    { name: "Tênis", attribute: "DEX" },
    { name: "Voleibol", attribute: "DEX" },
  ]},
  { name: "Etiqueta", attribute: "CAR", subgroups: [
    "Clero", "Comercial", "Diplomacia", "Mercado Negro", "Nobreza", "Submundo",
  ].map((n) => ({ name: n })) },
  { name: "Explosivos", attribute: null, subgroups: [] },
  { name: "Falsificação", attribute: "INT", subgroups: [
    "Documentos", "Escultura", "Fotografia", "Joalheria", "Pinturas",
  ].map((n) => ({ name: n })) },
  { name: "Furtar", attribute: "DEX", subgroups: [] },
  { name: "Furtividade", attribute: "AGI", subgroups: [] },
  { name: "Idiomas / Línguas", attribute: null, subgroups: [
    "Chinês", "Inglês", "Espanhol", "Hindu", "Russo", "Árabe", "Japonês", "Alemão", "Francês",
    "Braille", "Código Morse", "Criptografia", "Linguagem de Sinais", "Leitura Labial",
  ].map((n) => ({ name: n })) },
  { name: "Informática", attribute: null, subgroups: [
    "Computação", "Internet", "Hacker", "Manutenção", "Programação",
  ].map((n) => ({ name: n })) },
  { name: "Jogos", attribute: null, subgroups: [
    { name: "Cartas", attribute: "PER" },
    { name: "Tabuleiro", attribute: "INT" },
    { name: "Videogames", attribute: "DEX" },
    { name: "RPG", attribute: "INT" },
  ]},
  { name: "Manipulação", attribute: null, subgroups: [
    { name: "Empatia", attribute: "CAR" },
    { name: "Hipnose", attribute: null },
    { name: "Impressionar", attribute: "CAR" },
    { name: "Interrogatório", attribute: "INT" },
    { name: "Intimidação", attribute: "WILL" },
    { name: "Lábia", attribute: "CAR" },
    { name: "Liderança", attribute: "CAR" },
    { name: "Manha", attribute: "CAR" },
    { name: "Sedução", attribute: "CAR" },
    { name: "Tortura", attribute: "INT" },
  ]},
  { name: "Manuseio de Fechaduras", attribute: null, subgroups: [] },
  { name: "Mecânica", attribute: "DEX", subgroups: [] },
  { name: "Medicina", attribute: null, subgroups: [
    { name: "Cirurgia", attribute: "DEX" },
    { name: "Primeiros Socorros", attribute: "INT" },
    { name: "Oftalmologia" }, { name: "Dermatologia" }, { name: "Psiquiatria" },
    { name: "Cardiologia" }, { name: "Neurologia" }, { name: "Urologia" },
    { name: "Ortopedia" }, { name: "Oncologia" }, { name: "Gastrologia" },
    { name: "Otorrinolaringologia" }, { name: "Veterinária" },
  ]},
  { name: "Mineração", attribute: null, subgroups: [
    "Cristais", "Gemas", "Metais",
  ].map((n) => ({ name: n })) },
  { name: "Negociação", attribute: null, subgroups: [
    { name: "Barganha", attribute: "CAR" },
    { name: "Burocracia", attribute: "INT" },
    { name: "Contabilidade", attribute: "INT" },
    { name: "Marketing", attribute: "INT" },
  ]},
  { name: "Pesquisa ou Investigação", attribute: "PER", subgroups: [] },
  { name: "Procura", attribute: "PER", subgroups: [] },
  { name: "Rastreio", attribute: "PER", subgroups: [
    "Deserto", "Floresta", "Gelo", "Montanha", "Planície", "Selva",
  ].map((n) => ({ name: n })) },
  { name: "Sobrevivência", attribute: "PER", subgroups: [
    "Deserto", "Floresta", "Gelo", "Montanha", "Planície", "Selva",
  ].map((n) => ({ name: n })) },
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
  upgradeCatalogSelection: null,
};

const elements = {};

document.addEventListener("DOMContentLoaded", bootApplication);

async function bootApplication() {
  cacheElements();
  buildStaticForm();
  registerEvents();
  showLoading("Carregando aplicação...");

  try {
    await setPersistence(auth, browserLocalPersistence);
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
  elements.upgradeCatalogList = document.getElementById("upgradeCatalogList");
  elements.upgradeCatalogDetail = document.getElementById("upgradeCatalogDetail");
  elements.cancelUpgradeCatalog = document.getElementById("cancelUpgradeCatalog");
  elements.confirmUpgradeCatalog = document.getElementById("confirmUpgradeCatalog");
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
  elements.imageInput.addEventListener("change", handleImageUpload);
  elements.addUpgradeRow.addEventListener("click", openUpgradeCatalogDialog);
  elements.cancelUpgradeCatalog.addEventListener("click", () => elements.upgradeCatalogDialog.close());
  elements.confirmUpgradeCatalog.addEventListener("click", confirmUpgradeCatalogSelection);
  elements.upgradeCatalogSearch.addEventListener("input", (event) => {
    renderUpgradeCatalogList(event.target.value);
  });
  elements.addSkillRow.addEventListener("click", openSkillCatalogDialog);
  elements.cancelSkillCatalog.addEventListener("click", () => elements.skillCatalogDialog.close());
  elements.confirmSkillCatalog.addEventListener("click", confirmSkillCatalogSelection);
  elements.skillCatalogSearch.addEventListener("input", (event) => {
    renderSkillCatalogList(event.target.value);
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

  const hasContent = Array.from(row.querySelectorAll("[data-field]:not([readonly])"))
    .some((field) => String(field.value || "").trim() !== "");

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

async function handleImageUpload(event) {
  const file = event.target.files?.[0];
  if (!file) {
    return;
  }

  if (!hasActiveCharacter()) {
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

  const activeCharacter = getActiveCharacter();
  if (!activeCharacter) {
    elements.imageInput.value = "";
    return;
  }

  state.uploadInFlight = true;
  updateSaveStatus("Salvando", "saving");

  try {
    const cleanName = file.name.replace(/[^a-zA-Z0-9._-]/g, "-");
    const path = `portraits/${activeCharacter.ownerId}/${activeCharacter.id}/${Date.now()}-${cleanName}`;
    const portraitRef = storageRef(storage, path);
    const uploadTask = uploadBytesResumable(portraitRef, file, { contentType: file.type });

    await new Promise((resolve, reject) => {
      uploadTask.on("state_changed", null, reject, resolve);
    });

    const portraitUrl = await getDownloadURL(uploadTask.snapshot.ref);

    mutateActiveCharacter((character) => {
      character.portraitDataUrl = portraitUrl;
      character.portraitStoragePath = path;
    });

    renderPortrait();
    renderSessionSummary();
    state.hasUnsavedChanges = true;
    await flushPendingChanges();
  } catch (error) {
    console.error(error);
    alert(formatFirebaseError(error, "Não foi possível enviar a imagem."));
    updateSaveStatus("Salvo", "saved");
  } finally {
    state.uploadInFlight = false;
    elements.imageInput.value = "";
  }
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
  bindFieldEvents(elements.upgradesGrid);
  bindFieldEvents(elements.skillsTable);
  bindDynamicRowEvents(elements.upgradesGrid);
  bindDynamicRowEvents(elements.skillsTable);
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
  elements.addUpgradeRow.classList.toggle("hidden", isPlay);

  attributeDefinitions.forEach(({ key }) => {
    setFieldReadonly(`${key}Valor`, isPlay || isEvolution);
  });

  document.querySelectorAll('#skillsTable input[data-field]').forEach((input) => {
    const f = input.dataset.field || "";
    if (f.endsWith(":teste")) return;
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

  setFieldValue("periciasPontos", String(base - spent));
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
  const selector = type === "upgrade"
    ? `[data-field="dynamicUpgrade:${rowId}:nome"]`
    : `[data-field="dynamicSkill:${rowId}:nome"]`;
  const field = document.querySelector(selector);
  if (field) {
    field.focus();
  }
}

function openUpgradeCatalogDialog() {
  if (!hasActiveCharacter()) return;

  state.upgradeCatalogSelection = { upgrade: null };
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
  const matches = UPGRADES_CATALOG.filter((entry) => {
    if (isEvolution && entry.type !== "positive") return false;
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
  const typeLabel = isPositive ? "Positivo (custa pontos)" : "Negativo (devolve pontos)";
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
  return UPGRADE_BASE_POOL + negativeBonus - positiveSpent;
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

function convertPlaceholderRow(row) {
  mutateActiveCharacter((character) => {
    const collection = row.dataset.dynamicType === "upgrade"
      ? (character.dynamicUpgrades || [])
      : (character.dynamicSkills || []);
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
}

function normalizeCharacterCollections(character) {
  character.dynamicUpgrades = sanitizeUpgradeRows(character.dynamicUpgrades || []);
  character.dynamicSkills = sanitizeSkillRows(character.dynamicSkills || []);
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
