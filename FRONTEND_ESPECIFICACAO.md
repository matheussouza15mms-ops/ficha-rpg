# Especificacao do Frontend - Ficha de Personagem

## Objetivo

Este documento descreve com fidelidade o frontend atual do app `Ficha de Personagem` para que ele possa ser recriado em outro projeto mantendo a mesma estrutura visual, a mesma hierarquia de informacao e o mesmo comportamento de interface.

Escopo deste documento:

- Somente frontend.
- Layout, design visual, organizacao dos blocos e fluxo de uso.
- Estados da interface, interacoes e calculos visiveis ao usuario.
- Particularidades importantes da implementacao atual que devem ser preservadas se a meta for copia fiel.

Fontes de verdade analisadas:

- `Index.html`
- `Styles.html`
- `Scripts.html`

---

## Visao Geral do Produto

O app e uma ficha digital de personagem com tema visual sombrio, retro e "RPG de mesa". A interface mistura:

- aparencia de painel escuro;
- tipografia com cara de maquina de escrever;
- destaques em dourado e vermelho;
- cartoes arredondados com brilho interno discreto;
- estrutura de ficha organizada em secoes bem definidas.

O produto tem quatro grandes estados de tela:

1. carregamento inicial;
2. login;
3. dashboard principal da ficha;
4. modal de cadastro de jogador.

Existe diferenciacao de interface por perfil:

- `Jogador`: acessa a propria ficha.
- `Mestre` (`gm`): pode cadastrar jogador, selecionar qual ficha editar e abrir o banco no Google Sheets.

---

## Direcao Visual

### Personalidade visual

- Tema escuro, dramatico, com sensacao de documento antigo de RPG.
- Mistura de "painel administrativo" com "ficha de personagem fisica".
- Forte contraste entre fundo quase preto e detalhes dourados/vermelhos.
- Interface elegante, mas com pegada rustica e teatral.

### Tipografia

- Fonte principal: `Special Elite`.
- Fallbacks: `"Courier Prime"`, `"Courier New"`, `monospace`.
- Titulos em caixa alta.
- Uso de `letter-spacing` para reforcar o clima de ficha/documento.

### Paleta de cores

As cores base precisam ser preservadas porque definem quase toda a identidade do frontend.

| Token | Valor | Uso |
|---|---|---|
| `--bg-outer` | `#050505` | bordas do fundo geral |
| `--bg-mid` | `#1f1f1f` | faixa intermediaria do fundo |
| `--bg-inner` | `#454545` | centro do fundo radial |
| `--paper` | `rgba(18, 18, 18, 0.9)` | conceito de base escura |
| `--panel` | `rgba(28, 28, 28, 0.94)` | paineis internos |
| `--ink` | `#f3e7cc` | texto principal |
| `--muted` | `#bda988` | texto secundario |
| `--line` | `#63523d` | bordas e divisorias |
| `--strong` | `#7e0f14` | vermelho profundo |
| `--accent` | `#d8a72d` | dourado principal |
| `--accent-soft` | `#8d6a1d` | dourado escuro |
| `--hero-fill` | `rgba(61, 16, 16, 0.65)` | fundo da tabela de atributos |
| `--input-bg` | `rgba(8, 8, 8, 0.78)` | campos de formulario |
| `--ok` | `#5abf78` | confirmacao/salvo |
| `--danger` | `#df5a5a` | erro |

### Fundo da pagina

O `body` usa um `radial-gradient` central:

- centro mais claro em cinza escuro;
- meio em cinza grafite;
- bordas quase pretas.

Isso cria profundidade e evita fundo chapado.

### Cartoes e paineis

Toda a interface importante aparece dentro de cartoes.

Caracteristicas dos cartoes:

- fundo em gradiente vertical escuro;
- borda fina em marrom/dourado envelhecido;
- cantos bem arredondados (`18px`);
- sombra externa pesada;
- leve brilho interno.

Os paineis internos usam outra camada de gradiente, puxando para vermelho escuro na parte superior e preto no restante.

### Titulos

`h1`:

- dourado forte;
- sombra dura escura;
- brilho avermelhado difuso;
- caixa alta.

`h2`:

- vermelho vivo;
- sombra preta;
- geralmente aparece dentro de uma capsula decorativa em alguns cards.

---

## Estrutura Geral da Pagina

### Container principal

Existe um wrapper `.shell` centralizado:

- largura maxima de `1200px`;
- padding externo de `24px`;
- centralizado horizontalmente.

### Topbar

A parte superior da pagina tem um `header.topbar` com dois blocos:

1. bloco da esquerda:
   - `h1` com o nome `Ficha de Personagem`;
   - paragrafo curto explicativo;
2. bloco da direita:
   - resumo da sessao (`sessionSummary`);
   - inicialmente oculto;
   - aparece somente depois do login.

Topbar em desktop:

- layout horizontal;
- `justify-content: space-between`.

Topbar em telas menores:

- vira coluna.

### Main

Dentro de `main` existem tres grandes areas renderizadas por estado:

- `loadingCard`
- `loginCard`
- `appCard`

Somente uma ou duas ficam visiveis conforme a fase da interface.

---

## Tela 1 - Carregamento

### Objetivo

Exibir uma mensagem simples enquanto o app inicializa.

### Estrutura

- card centralizado;
- texto: `Carregando aplicacao...`

### Aparencia

- usa o mesmo visual base dos cartoes;
- sem elementos adicionais;
- largura maxima igual a login.

---

## Tela 2 - Login

### Objetivo

Permitir autenticacao e acesso ao cadastro inicial de jogador.

### Estrutura do card

- titulo `Entrar`
- formulario vertical (`stack-form`)
- campo `Login`
- campo `Senha`
- botao primario `Entrar`
- botao secundario `Cadastrar novo jogador`

### Layout

- card centralizado;
- largura maxima de `540px`;
- espacamento vertical simples;
- campos empilhados.

### Estilo dos campos

Todos os inputs do sistema seguem o mesmo padrao:

- fundo muito escuro;
- borda fina `--line`;
- cantos arredondados (`10px`);
- texto claro;
- sombra interna.

No foco:

- borda dourada;
- halo dourado suave;
- manutencao da sombra interna.

### Botoes

Botao primario:

- formato capsula;
- gradiente vermelho escuro;
- texto dourado claro;
- sombra externa.

Botao secundario:

- gradiente cinza escuro;
- mesmo formato capsula;
- texto bege claro.

Hover:

- sobe `1px`;
- pequena reducao de opacidade.

### Comportamento

- submit chama login.
- botao de cadastro abre o modal `Novo Jogador`.

---

## Tela 3 - Dashboard Principal

### Estrutura superior

Ao logar, a tela de login some e aparece `appCard`.

O dashboard comeca por uma toolbar em duas zonas:

1. grupo de ferramentas do mestre (`gmTools`)
2. grupo universal de status e logout

### Toolbar - Mestre

Visivel apenas para `gm`.

Itens:

- botao `Cadastrar jogador`
- seletor `Selecionar ficha`
- link `Abrir banco no Sheets`

Esse grupo permite mudar a ficha ativa que aparece no formulario.

### Toolbar - Todos

Itens:

- indicador de status de salvamento (`saveStatus`)
- botao `Sair`

### Card introdutorio

Antes da ficha propriamente dita, existe um painel horizontal ocupando toda a largura:

- titulo `Ficha do Personagem`
- texto explicativo sobre salvamento automatico no Google Sheets

Esse bloco funciona como cabecalho interno da ficha.

---

## Layout Central da Ficha

### Distribuicao em colunas

A area principal da ficha usa duas colunas assimetricas:

- coluna esquerda: `0.62fr`
- coluna direita: `1.38fr`

Leitura pratica:

- esquerda: coluna compacta de apoio;
- direita: coluna principal com a maior parte dos campos.

### Composicao da coluna esquerda

Ordem exata:

1. `Retrato`
2. `Atributos`
3. `Aprimoramentos`

### Composicao da coluna direita

Ordem exata:

1. `Identificacao`
2. `Status`
3. `Pericias`

---

## Painel - Retrato

### Estrutura

- titulo `Retrato`
- moldura da imagem
- placeholder textual quando nao ha imagem
- acao de importar imagem

### Moldura

Caracteristicas:

- altura minima de `300px`;
- cantos arredondados (`16px`);
- `overflow: hidden`;
- fundo em gradiente escuro;
- borda sutil dourada.

### Imagem

- ocupa `100%` de largura e altura;
- `object-fit: cover`;
- so aparece quando a moldura recebe a classe `has-image`.

### Placeholder

Quando nao existe imagem:

- texto `Sem imagem`;
- caixa alta;
- espacamento entre letras;
- cor secundaria apagada.

### Acao de importacao

- nao usa botao tradicional;
- usa um `label` estilizado como link discreto;
- texto: `Importar imagem`;
- fica centralizado abaixo da moldura;
- aparece com linha pontilhada/tracejada inferior.

### Regras funcionais

- formatos aceitos: `PNG`, `JPG/JPEG`, `WEBP`;
- tamanho maximo: `2 MB`;
- ao enviar, o status muda para `Enviando imagem...`;
- ao concluir, muda para `Imagem salva`;
- ao falhar, muda para `Erro ao salvar`.

---

## Painel - Atributos

### Objetivo

Mostrar atributos base do personagem com calculo automatico de teste e total.

### Estrutura visual

Tabela em grid com quatro colunas:

1. `Atributo`
2. `Valor`
3. `Modif.`
4. `Teste (%)`

### Fundo da tabela

- bloco interno com fundo vinho translucido;
- borda dourada suave;
- cantos arredondados;
- espacamento interno de `12px`.

### Linhas de atributos

A ordem exata e:

1. `CON`
2. `FR`
3. `DEX`
4. `AGI`
5. `INT`
6. `WILL`
7. `PER`
8. `CAR`
9. `TOTAL`

### Comportamento

Para cada atributo existem tres campos visiveis:

- `Valor`
- `Modif.`
- `Teste (%)` somente leitura

O campo `TOTAL` tambem e somente leitura.

### Formula obrigatoria

Para cada atributo:

`Teste (%) = (Valor * 4) - Modif.`

Total:

`TOTAL = soma de todos os campos Valor dos 8 atributos`

### Comportamento de digitacao

- `Valor` e `Modif.` aceitam apenas inteiros;
- caracteres invalidos sao removidos durante a digitacao;
- `Teste (%)` e `TOTAL` recalculam localmente imediatamente.

### Fidelidade importante

O calculo acontece no frontend em tempo real, antes do salvamento remoto.

---

## Painel - Aprimoramentos

### Estrutura

Titulo: `Aprimoramentos`

Campos empilhados:

1. `Aprimoramentos / Ciberneticos / Poderes`
2. `Anotacoes`

Ambos sao `textarea`.

### Alturas

- primeiro textarea: `rows="5"`
- segundo textarea: `rows="7"`

### Comportamento

- redimensionamento vertical permitido;
- minimo visual de altura padrao do sistema;
- salvamento automatico igual aos demais campos.

### Observacao de fidelidade

O frontend atual concentra essa secao apenas nesses dois blocos de texto. Nao existem, na interface atual, secoes visiveis separadas para armas, equipamentos ou lista textual adicional de pericias, apesar de o backend ter rastros desses campos.

---

## Painel - Identificacao

### Estrutura

Titulo: `Identificacao`

Grid de 3 colunas em desktop.

### Ordem dos campos

1. `Personagem`
2. `Classe Social / Profissao`
3. `Nascimento`
4. `Local`
5. `Sexo`
6. `Altura`
7. `Peso`
8. `Idade Aparente`
9. `Idade Real`
10. `Idiomas`
11. `Religiao`

### Observacoes de layout

- os campos sao simples, de uma linha;
- o grid tem gaps consistentes de `12px`;
- como ha 11 campos, a ultima linha fica incompleta em desktop.

---

## Painel - Status

### Estrutura

Titulo: `Status`

Grid de 3 colunas em desktop.

### Ordem dos campos

1. `Nivel`
2. `XP`
3. `IP`
4. `PV`
5. `Dano`
6. `PV Atual`

### Observacao visual

Esse painel e compacto e serve como quadro rapido de estado do personagem.

---

## Painel - Pericias

### Cabecalho do painel

O topo do painel tem dois elementos alinhados horizontalmente:

1. titulo `Pericias`
2. campo `Pontos de Pericia`

O campo de pontos:

- largura maxima aproximada de `190px`;
- alinhamento de texto central no input;
- rotulo alinhado visualmente para a direita.

### Estrutura da tabela

Grid com quatro colunas:

1. `Pericia`
2. `Atributo`
3. `Valor`
4. `Teste %`

### Larguras relativas

- coluna de nome e bem mais larga;
- as tres colunas numericas sao compactas e equivalentes.

### Quantidade de linhas

Existem exatamente `18` linhas de pericia.

Cada linha possui:

- nome da pericia;
- atributo numerico;
- valor numerico;
- teste calculado somente leitura.

### Formula obrigatoria

Para cada pericia:

`Teste % = Atributo + Valor`

### Regra de vazio

Se `Atributo` e `Valor` estiverem ambos vazios:

- `Teste %` deve ficar vazio.

Se qualquer um dos dois possuir valor:

- o calculo usa inteiro, tratando vazio como `0`.

### Comportamento de digitacao

- campos `Atributo`, `Valor` e `Pontos de Pericia` aceitam apenas inteiros;
- `Teste %` recalcula imediatamente em tempo real;
- os valores calculados tambem entram no lote de salvamento.

---

## Resumo de Sessao

### Posicionamento

Fica no canto direito da `topbar`, acima do dashboard.

### Aparencia

- bloco arredondado;
- fundo em gradiente vermelho escuro/preto translucido;
- borda fina;
- texto alinhado a direita.

### Conteudo

Exibe tres linhas:

1. nome exibido do usuario logado em destaque;
2. login e papel (`Mestre` ou `Jogador`);
3. `Ficha atual: ...`

### Comportamento

- fica oculto antes do login;
- aparece depois do dashboard ser renderizado.

---

## Indicador de Salvamento

### Objetivo

Mostrar o estado da persistencia automatica.

### Aparencia base

- formato capsula;
- borda fina;
- fundo translucido;
- largura minima de `120px`;
- texto centralizado.

### Estados textuais usados na interface

- `Pronto`
- `Alteracoes locais`
- `Salvando...`
- `Salvo no Sheets`
- `Imagem salva`
- `Erro ao salvar`
- `Crie ou selecione uma ficha`
- `Entre novamente`

### Estados visuais

`is-saving`:

- texto dourado;
- borda mais destacada no dourado.

`is-saved`:

- texto verde;
- borda com destaque verde.

### Temporizacao importante

Quando entra em `is-saved`:

- apos `1200ms`, o texto volta para `Pronto`.

---

## Modal - Novo Jogador

### Abertura

Pode ser aberto por dois pontos:

- botao `Cadastrar novo jogador` na tela de login;
- botao `Cadastrar jogador` nas ferramentas do mestre.

### Estrutura

- elemento `dialog`;
- formulario vertical;
- titulo `Novo Jogador`;
- campo `Nome do jogador`;
- campo `Login`;
- campo `Senha`;
- rodape com acoes.

### Botoes

- `Cancelar`
- `Cadastrar`

### Estilo do modal

- largura maxima de `420px`;
- fundo escuro em gradiente;
- borda sutil;
- cantos arredondados;
- backdrop escuro translucido.

### Regras dos campos

`Nome do jogador`

- obrigatorio;
- minimo de 3 caracteres.

`Login`

- obrigatorio;
- regex: letras, numeros, ponto, underscore e hifen;
- entre 3 e 30 caracteres.

`Senha`

- obrigatoria;
- minimo de 6 caracteres.

### Comportamento por perfil

Se aberto por jogador nao autenticado:

- o cadastro cria a conta;
- o usuario entra direto no dashboard depois.

Se aberto por mestre autenticado:

- o cadastro cria um novo jogador;
- a lista de fichas e atualizada;
- a ficha recem-criada passa a ser a selecionada.

---

## Comportamento Funcional do Frontend

### 1. Inicializacao

Ao carregar a pagina:

- registra todos os eventos;
- chama `getPublicAppState`;
- esconde o card de loading;
- mostra o card de login.

Observacao de fidelidade:

- o estado publico retornado nao altera visualmente nada alem da transicao loading -> login.

### 2. Login

No envio do formulario:

- coleta `login` e `password`;
- chama a autenticacao;
- em sucesso renderiza o dashboard completo;
- em erro mostra `alert`.

### 3. Logout

- chama a rotina de logout;
- recarrega a pagina inteira com `location.reload()`.

### 4. Edicao de campos

Cada campo com `data-field`:

- reage a `input`;
- chama salvamento ao perder foco (`blur`);
- tambem dispara flush quando a aba fica oculta (`visibilitychange`).

### 5. Autosave

### Debounce

Alteracoes locais aguardam `1800ms` antes do envio automatico.

### Funcionamento

- cada campo alterado entra em `pendingChanges`;
- o campo recebe classe `saving`;
- o status vira `Alteracoes locais`;
- ao flush, envia tudo em lote.

### Marcacao visual de sucesso no campo

Quando um campo salva com sucesso:

- remove classe `saving`;
- adiciona classe `saved`;
- depois de `800ms`, a classe `saved` e removida.

### Classes visuais de campo

`saving`:

- outline dourado.

`saved`:

- outline verde.

### 6. Atualizacao automatica silenciosa

Existe refresh automatico a cada `12 segundos`.

Mas ele so acontece se:

- houver sessao;
- houver ficha selecionada;
- nao existir refresh em andamento;
- nao houver salvamentos pendentes;
- nao houver campos sujos localmente.

### Objetivo do refresh

Sincronizar a ficha caso ela tenha mudado externamente.

### O que atualiza

Se a versao do snapshot mudou ou se a ficha selecionada mudou:

- campos do formulario;
- imagem do personagem;
- seletor de jogador;
- resumo de sessao.

### 7. Calculos derivados locais

Existem dois grupos derivados:

- atributos;
- pericias.

Eles recalculam imediatamente no navegador, sem esperar resposta remota.

### 8. Upload de imagem

Fluxo:

1. usuario escolhe arquivo;
2. frontend valida tipo;
3. frontend valida tamanho maximo;
4. le arquivo com `FileReader`;
5. envia como `data URL`;
6. atualiza retrato e status.

### 9. Tratamento de erro

O frontend usa `alert(message)` para exibir erros.

Observacao de fidelidade:

- existe CSS para `.error-banner`, mas esse componente nao e usado no HTML/JS atual.

---

## Regras de Responsividade

### Breakpoint em `960px`

Mudancas:

- layout de colunas da ficha vira uma unica coluna;
- grids `.grid.two` e `.grid.three` viram coluna unica;
- `topbar` vira coluna.

Impacto visual:

- a pagina passa de "ficha em duas colunas" para leitura linear vertical.

### Breakpoint em `800px`

Mudancas extras:

- tabela de atributos vira uma unica coluna;
- cabecalho de pericias vira coluna;
- largura do campo `Pontos de Pericia` passa a ocupar 100%;
- tabela de pericias vira coluna unica;
- cabecalhos da tabela de pericias passam a alinhar a esquerda.

### Observacao de fidelidade

Em mobile, as tabelas deixam de parecer tabelas classicas e passam a funcionar como sequencias verticais de campos.

---

## Inventario Completo de Campos Visiveis

### Identificacao

- `nome`
- `classeSocialProfissao`
- `nascimento`
- `local`
- `sexo`
- `altura`
- `peso`
- `idadeAparente`
- `idadeReal`
- `idiomas`
- `religiao`

### Status

- `nivel`
- `xp`
- `ip`
- `pv`
- `dano`
- `pvAtual`

### Atributos

- `conValor`, `conMod`, `conTeste`
- `frValor`, `frMod`, `frTeste`
- `dexValor`, `dexMod`, `dexTeste`
- `agiValor`, `agiMod`, `agiTeste`
- `intValor`, `intMod`, `intTeste`
- `willValor`, `willMod`, `willTeste`
- `perValor`, `perMod`, `perTeste`
- `carValor`, `carMod`, `carTeste`
- `atributosTotal`

### Aprimoramentos e anotacoes

- `poderesTexto`
- `anotacoes`

### Pericias

- `periciasPontos`
- `pericia1Nome` ate `pericia18Nome`
- `pericia1Atributo` ate `pericia18Atributo`
- `pericia1Valor` ate `pericia18Valor`
- `pericia1Teste` ate `pericia18Teste`

### Midia

- retrato do personagem via `imageInput`

---

## Ordem de Prioridade para Reproducao Fiel

Se outro agente for recriar o frontend, ele deve preservar nesta ordem:

1. estrutura macro da pagina: topbar, toolbar, card de cabecalho, duas colunas principais;
2. ordem exata dos paineis: `Retrato`, `Atributos`, `Aprimoramentos` na esquerda e `Identificacao`, `Status`, `Pericias` na direita;
3. tema visual: fundo radial escuro, tipografia `Special Elite`, detalhes dourados/vermelhos, cartoes arredondados;
4. formulas locais de atributos e pericias;
5. autosave com debounce, feedback visual de salvamento e refresh automatico;
6. diferencas de interface entre `Jogador` e `Mestre`;
7. comportamento responsivo descrito acima.

---

## Particularidades Importantes da Implementacao Atual

Estas observacoes ajudam a copiar o frontend exatamente como ele e hoje, inclusive com algumas decisoes menos obvias:

- O card de loading e simples e temporario; nao existe splash screen elaborada.
- O frontend mostra erros com `alert`, nao com toast nem banner embutido.
- Existe estilo para `.error-banner`, mas ele nao esta conectado ao fluxo real.
- O bloco `sessionSummary` usa HTML com quebra de linha e alinhamento a direita.
- O painel de atributos usa visual de grade destacada, diferente do restante dos inputs soltos.
- O input de imagem fica escondido; a interacao acontece pelo label estilizado.
- O metodo `setFormEnabled` nao desabilita de fato os campos no estado atual; ele apenas garante que estejam habilitados e ajusta a mensagem de status quando nao ha ficha.
- Os campos calculados (`Teste` e `TOTAL`) sao `readonly`, nao `disabled`.
- A tabela de pericias tem exatamente 18 linhas fixas; nao e dinamica.

---

## Especificacao de Comportamento para Outra Implementacao

Se o frontend for refeito em outro stack, a reproducao ideal deve manter:

- mesma divisao entre areas publicas e privadas;
- mesma ordem de elementos;
- mesmos textos principais dos titulos;
- mesmos nomes de secoes;
- mesmos estados de status de salvamento;
- mesmos calculos derivados;
- mesma ideia de persistencia automatica sem botao de salvar;
- mesma experiencia de upload de retrato;
- mesma diferenca entre a interface do mestre e do jogador.

Se for necessario adaptar a tecnologia, manter a experiencia acima e mais importante do que copiar a API original.

---

## Resumo Executivo

O frontend atual e uma ficha de personagem escura, dramatica e altamente estruturada, composta por:

- uma topbar com identidade do app e resumo da sessao;
- uma toolbar de acoes com variacoes por papel;
- uma ficha em duas colunas assimetricas;
- paineis de retrato, atributos, aprimoramentos, identificacao, status e pericias;
- calculos locais imediatos;
- autosave discreto com feedback de estado;
- sincronizacao periodica silenciosa;
- responsividade que empilha a ficha em telas menores.

Para recriar "igual", o novo frontend nao deve simplificar a ordem dos blocos, trocar o tema visual por algo generico nem transformar a ficha em um CRUD comum. A sensacao correta e a de uma ficha de RPG estilizada, com atmosfera escura e estrutura bem ritualizada.
