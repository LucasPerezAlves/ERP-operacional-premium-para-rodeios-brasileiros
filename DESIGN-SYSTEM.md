# DESIGN-SYSTEM.md — Controle da Arena

Sistema de linguagem visual do **Controle da Arena** (Plataforma Premium de
Operações Financeiras de Rodeio). Este documento é a **spec executável** da
seção "Linguagem Visual" do CLAUDE.md: todo token, receita e regra aqui tem
correspondência direta em `frontend/tailwind.config.js` e
`frontend/src/index.css`.

**Princípio-guia (a Porteira):** cada componente deve parecer um objeto físico
dos bastidores de um grande rodeio — couro, madeira, latão, aço — operado à
noite, com pressa e com dinheiro de verdade na mão. Se uma tela ficaria em
casa num SaaS/fintech trocando só o logo, ela está errada.

**Proibições permanentes:** fintech design, estética startup, glassmorphism,
neumorphism, cyberpunk, Tailwind cru (`stone/slate/zinc/gray/amber/red/green`
sem token), shadcn default, gradientes neon.

---

# CORES

Fundação em 6 paletas de material + 4 papéis semânticos. **Regra de ouro:
nenhum componente usa cor crua do Tailwind** — só tokens abaixo.

## Paletas de material

### `wood` — madeira escura (superfícies estruturais: cards, painéis, inputs)
| Token | Hex | Papel |
|---|---|---|
| `wood-950` | `#120a05` | Superfície mais profunda dentro de cards |
| `wood-900` | `#1c1008` | Fundo padrão de card/input |
| `wood-800` | `#2b1a0e` | Card elevado, modal |
| `wood-700` | `#3d2515` | Hover de superfície |
| `wood-600` | `#54331f` | Superfície ativa/pressionada |
| `wood-500` | `#6b4227` | Detalhe de veio, divisor forte |

### `leather` — couro envelhecido (bordas, texto secundário, controles neutros)
| Token | Hex | Papel |
|---|---|---|
| `leather-700` | `#573a24` | Borda escura de contenção |
| `leather-600` | `#6f4a2f` | **Borda padrão de card** (usar `/40`–`/60`) |
| `leather-500` | `#8b5e3c` | Borda de controle interativo |
| `leather-400` | `#a9764f` | Texto terciário, placeholder |
| `leather-300` | `#c69a6d` | Texto secundário padrão |
| `leather-200` | `#e0c3a0` | Texto secundário de alto contraste, labels |

### `gold` — dourado fosco (marca, CTA, foco, destaque financeiro)
| Token | Hex | Papel |
|---|---|---|
| `gold-700` | `#86691a` | Latão sombreado (base de gradiente pressed) |
| `gold-600` | `#a8861f` | Base do gradiente de latão |
| `gold-500` | `#c9a227` | Borda de destaque, seleção |
| `gold-400` | `#d4af37` | **Acento principal** — títulos, ícones ativos, topo do latão |
| `gold-300` | `#e6c65c` | Texto dourado sobre wood, hover |
| `gold-200` | `#f2dd94` | Brilho, poeira, valor em evidência |

### `rust` — ferrugem controlada (ERRO — "metal oxidado" da tabela de feedback)
| Token | Hex | Papel |
|---|---|---|
| `rust-950` | `#2b0e04` | Fundo de banner de erro |
| `rust-600` | `#8f3208` | Borda escura de erro |
| `rust-500` | `#b7410e` | Borda padrão de erro (usar `/60`) |
| `rust-400` | `#d05a1f` | Ícone de erro, borda de input inválido |
| `rust-300` | `#e8824a` | Texto de erro padrão |
| `rust-200` | `#f3ab80` | Texto de erro sobre fundo rust-950 |

### `steel` — aço envelhecido (NOVO — neutros frios: desabilitado, meta-informação, divisores discretos)
| Token | Hex | Papel |
|---|---|---|
| `steel-950` | `#131413` | — reserva |
| `steel-900` | `#1d1f1e` | Superfície desabilitada |
| `steel-800` | `#2a2d2b` | Fundo de badge inativo |
| `steel-700` | `#3b3f3d` | Borda desabilitada |
| `steel-600` | `#4f5451` | Texto desabilitado (grande) |
| `steel-500` | `#676c68` | Ícone inativo |
| `steel-400` | `#838883` | Meta-texto (timestamps, contadores) |
| `steel-300` | `#a3a7a2` | Meta-texto de alto contraste |
| `steel-200` | `#c6c9c4` | Ferradura "apagada" (caixa fechado) |

> `steel` substitui TODO uso de `stone-*` no código. Uso restrito a estados
> neutros/inativos — nunca para conteúdo principal (que é sempre âmbar/couro).

### `arena` — tons escuros de arena (NOVO — o `arena-dark` do CLAUDE.md; fundos de página e overlays)
| Token | Hex | Papel |
|---|---|---|
| `arena-950` | `#0c0906` | **Fundo de página único** (substitui `bg-black` e `bg-wood-950` como base) |
| `arena-900` | `#141009` | Faixa de seção, rail |
| `arena-800` | `#1c1610` | Fundo de área rebaixada (displays de valor) |

**Overlay de modal:** `bg-arena-950/85` **sem blur** (glassmorphism proibido).

## Papéis semânticos

| Papel | Paleta | Elemento temático (CLAUDE.md) | Receita |
|---|---|---|---|
| **Sucesso — confirmação de ação** | `gold` | Ferradura dourada | Ícone `HorseshoeIcon` + `text-gold-300`, fundo `gold-500/10`, borda `gold-500/40`. **Nunca verde para "ação concluída".** |
| **Sucesso — valor financeiro positivo (sobra, troco)** | `campo` (NOVO) | — | Verde-pasto dessaturado e quente, exclusivo para semântica de dinheiro: `campo-300` texto, `campo-950` fundo, `campo-500/40` borda |
| **Aviso** | `gold` + animação | Placa de arena iluminada | `border-gold-400`, `bg-gold-500/10`, `text-gold-200`, `animate-lampiao` lento opcional. Sempre ícone + texto |
| **Erro** | `rust` | Metal oxidado | Banner `bg-rust-950` `border-rust-500/60` `text-rust-200`; campo inválido `border-rust-400` |
| **Destrutivo / SOS** | `bordo` (NOVO) | Lampião vermelho pulsante | Botões de encerrar/SOS: gradiente `from-bordo-700 to-bordo-900`, texto `bordo-200`; SOS ativo usa `animate-lampiao` |

### `campo` — verde-pasto (só para valores financeiros positivos)
`campo-950 #131a0d` · `campo-900 #1d2913` · `campo-700 #354a20` · `campo-500 #57773b` · `campo-400 #719551` · `campo-300 #94b278`

### `bordo` — vinho de lampião (só destrutivo/SOS)
`bordo-950 #250b0a` · `bordo-900 #3c1210` · `bordo-800 #531a17` · `bordo-700 #6c231f` · `bordo-500 #943630` · `bordo-400 #b24a40` · `bordo-300 #d1786c`

## Mapa de migração (código existente → sistema)

| Hoje no código | Migrar para |
|---|---|
| `stone-*` (texto/borda/fundo) | `steel-*` (estados neutros) ou `leather-*` (conteúdo) |
| `amber-400/500/600` | `gold-300/400/500` |
| `amber-50` (texto claro) | `leather-100`? → usar `#f5ecdd` = `leather-200` clareado; padrão: `text-amber-50` → `text-[#f5ecdd]` é proibido; usar `gold-200` p/ destaque ou `leather-200` p/ corpo |
| `red-900/950` (SOS, fechar) | `bordo-700/900` |
| `green-400/500/950` (badges, troco) | `gold` (confirmação) ou `campo` (valor positivo) |
| `bg-black` (página) | `bg-arena-950` |
| `bg-black/40-60` (áreas rebaixadas) | `bg-arena-800` ou `bg-arena-950/60` |

**Contraste mínimo:** texto corrente ≥ 4.5:1 sobre a superfície real (testar
sobre `wood-900`, não sobre preto); texto ≥ 24px pode 3:1. `steel-600` e
`leather-400/70` reprovam para texto pequeno — usar só em ≥ 18px ou meta-info
não essencial.

---

# TIPOGRAFIA

Famílias fixas por spec: **Alfa Slab One** (`font-display`) e **Inter**
(`font-sans`). Proibido introduzir terceira família.

## Escala

| Nome | Receita | Uso |
|---|---|---|
| `marca` | `font-display text-4xl tracking-wide text-gold-400` | Só o wordmark CONTROLE DA ARENA |
| `titulo-pagina` | `font-display text-2xl md:text-3xl text-gold-300` | **1 por página** |
| `numero-heroi` | `font-display text-6xl md:text-8xl tracking-tight` | **1 por tela** — o valor dominante (troco, total) |
| `subtitulo` | `text-lg font-semibold text-leather-200` | Seções internas — sentence case, sem caps |
| `corpo` | `text-[15px] text-leather-300 leading-relaxed` | Texto corrente |
| `label` | `text-[13px] font-medium text-leather-200` | Labels de formulário |
| `meta` | `text-xs text-steel-400` | Timestamps, contadores |
| `cabecalho-tabela` | `text-[11px] font-semibold uppercase tracking-[0.14em] text-leather-400` | **Único uppercase sancionado por padrão** |

## Regras por contexto

- **Títulos:** Alfa Slab One APENAS em: `marca`, `titulo-pagina`,
  `numero-heroi`, título de **card de navegação** (módulos das landings,
  `text-xl/2xl`) e título de **momento de sucesso** (`SucessoOperacional`).
  Slab em texto corrente, labels ou botões pequenos é proibido (vira
  fantasia, não pôster). CTAs latão podem usar slab só em `lg`/`pdv` de
  tela cheia (ex.: "Abrir Caixa", "Nova Venda").
- **Subtítulos:** Inter 600, sentence case. **Ração de uppercase: no máximo 1
  elemento em caps por bloco visual** (o código hoje tem 51 — reduzir na
  migração de cada tela).
- **Valores financeiros:** SEMPRE `.num-tabular` (`font-variant-numeric:
  tabular-nums`). Valores que atualizam ao vivo (saldo em espécie) usam Inter
  600/700 + `.num-tabular` — nunca Alfa Slab (dígitos de largura irregular
  tremem a cada venda). Alfa Slab é permitido só no `numero-heroi` estático
  de resultado (troco a devolver). Prefixo `R$` sempre 0.6em do valor.
- **Relatórios:** título em `titulo-pagina`, blocos com `subtitulo`, dados em
  tabela (abaixo), rodapé com carimbo `meta`. Moldura `.material-rotulo`.
- **Tabelas:** header `cabecalho-tabela`; linhas `corpo` com altura mínima
  48px (toque); colunas numéricas alinhadas à direita + `.num-tabular`;
  divisores `divide-leather-600/25`; zebra opcional `odd:bg-wood-900/40`.
- **Mobile:** corpo nunca < 15px; labels ≥ 13px; valores em operação ≥ 32px;
  botões de ação ≥ 18px; `line-height` ≥ 1.4 em qualquer texto corrente.

---

# MATERIAIS

Receitas concretas. Cada material tem classe utilitária ou combinação fixa.

### Couro (superfície padrão de card)
```
bg-wood-900  border border-leather-600/40  rounded-xl  shadow-arena
```
Variante "couro costurado" (destaque premium): adicionar `.costura` — pesponto
tracejado interno a 8px da borda, como sela artesanal.

### Madeira envelhecida (headers, rails, faixas estruturais)
```
bg-arena-900 + overlay <div class="textura-grao" />
```
`.textura-grao` = grão orgânico via `feTurbulence` embutido em data-URI (zero
asset, zero filtro por página) — a "poeira assentada" que hoje só existe no
login passa a estar disponível para QUALQUER superfície com um `<div>`.

### Latão (CTA primário, botão de valor)
```
bg-gradient-to-b from-gold-400 to-gold-600  text-wood-950  btn-skeuo
```
`.btn-skeuo` (já existente) é a receita oficial de latão: brilho superior
interno + afundamento físico de 3px no `:active`. Hover ganha varredura
`animate-brilho-metalico` (reflexo metálico, 1× por hover, não loop).

### Metal oxidado (superfícies de erro)
```
bg-rust-950  border border-rust-500/60  text-rust-200
```
Nunca vermelho puro; erro é ferrugem sobre aço, não alerta de fintech.

### Poeira de arena (atmosfera ambiente)
Partículas `animate-dust-rise` (existente) para páginas de "palco" (login,
telas de espera); `.textura-grao` para o grão estático nas demais. Regra:
**toda página interna recebe no mínimo o grão estático** — a imersão não pode
morrer depois da porteira.

### Rótulo de whisky (relatórios, comprovantes, fechamento)
`.material-rotulo` — moldura dupla clássica de rótulo: fio externo dourado,
respiro, fio interno de couro. Uso: cabeçalho de relatório, recibo de
fechamento de caixa, certificado de divergência. Título centrado em
`font-display`, meta em `cabecalho-tabela`.

---

# SISTEMA DE COMPONENTES

## Escala de forma (regra única de raio — encerra o caos 30×`2xl`/22×`full`)
| Elemento | Raio |
|---|---|
| Containers (cards, modais, displays) | `rounded-xl` (12px) |
| Controles (botões, inputs, selects) | `rounded-lg` (8px) |
| Selos/badges | `rounded-md` (6px) — **fivela, não pílula** |
| Avatar, partículas, ferradura de status | `rounded-full` (única exceção circular) |

`rounded-2xl`/`3xl` ficam proibidos ("cantos excessivamente arredondados").

## Espaçamento
Grade de 4px. Padding de card: 20–24px. Gap de grid: 16–20px. Seções: 32–40px.
Alvo de toque mínimo 48px (PDV: 96px para ações finais).

## Cards
Base = material couro (acima). Variantes:
- **padrão** — couro simples;
- **destaque** (ação dominante de landing) — couro + borda `gold-500/50` +
  `.costura`, ocupa 2 colunas do grid;
- **dado financeiro** — display interno `bg-arena-800 rounded-lg` com valor
  `.num-tabular`;
- Proibido: card fantasma "Em breve". Módulos futuros viram UMA lista
  discreta "No curral" (texto `meta` + ícone), nunca cards falsos em grid.

## Tabelas
Spec na seção Tipografia. Extra: linha de total com `border-t-2
border-gold-500/40` e valor `.num-tabular font-bold text-gold-200`;
divergência positiva `text-campo-300`, negativa `text-rust-300`, sempre com
sinal explícito (+/−).

## Formulários
- Label ACIMA (visível), receita `label`; nunca placeholder-como-label
  (exceção documentada: floating labels do AuthPage).
- Input: `bg-wood-900 border border-leather-500/50 rounded-lg px-4 py-3
  text-leather-200`, foco `border-gold-400 ring-4 ring-gold-400/20`, erro
  `border-rust-400` + mensagem `text-rust-300` abaixo do campo.
- Teclado numérico (dinheiro): botões 48px+, dígitos `.num-tabular`.

## Botões (4 variantes, ponto final)
| Variante | Receita | Uso |
|---|---|---|
| **Primário (latão)** | material latão + `rounded-lg` | 1 por tela/bloco |
| **Secundário (couro)** | `border-2 border-leather-500/60 text-leather-200 bg-transparent hover:border-gold-400 hover:text-gold-300` | Ações de apoio |
| **Destrutivo (lampião)** | `bg-gradient-to-b from-bordo-700 to-bordo-900 border border-bordo-500/50 text-bordo-200` | Fechar caixa, SOS |
| **Fantasma** | `text-gold-300 hover:text-gold-200` sem borda | Links de navegação ("← Voltar") |

Alturas únicas: `sm` 40px · `md` 48px · `lg` 56px · `pdv` 96px. Todos:
`touch-manipulation active:scale-[0.98]` (ou `btn-skeuo` no latão),
`disabled:opacity-40 disabled:cursor-not-allowed`, foco visível
`focus-visible:ring-4 ring-gold-400/30`.

## Diálogos
- Superfície **sólida**: `bg-wood-800 border border-leather-600/50
  rounded-xl shadow-arena` — SEM `backdrop-blur` (dívida documentada:
  migrar FecharCaixaModal).
- Overlay `bg-arena-950/85`.
- Obrigatório: `max-h-[90dvh] overflow-y-auto`, focus trap, Escape fecha,
  foco retorna ao gatilho, `aria-modal` + `aria-label`.
- Modal nasce do gatilho: `animate-fade-in-up` 200ms `ease-couro`.

## Navegação
- Header: faixa de madeira (`bg-arena-900` + `.textura-grao`), marca como
  **link para a landing do perfil**, altura 64–72px.
- Identidade por perfil (tabela de feedback): **brasão western** ao lado do
  nome no Admin, **distintivo de peão** no Operador (ícones SVG próprios).
- Item ativo: sublinha "ferro de marca" — barra 3px `bg-gold-400` com
  extremidades chanfradas.
- Volta sempre presente em sub-fluxos (variante fantasma).

## Dashboards (landings)
- **Hierarquia dominante:** a ação mais frequente (Abrir Caixa / Vender) é um
  card destaque de 2 colunas; secundárias em cards padrão menores; futuros na
  lista "No curral". Fim do grid de cards idênticos.
- Status do caixa é o herói da landing do Operador: **ferradura acesa**
  (`text-gold-400` + `animate-ferradura-acende` na transição) / **ferradura
  apagada** (`text-steel-200`, sem animação) — substitui a bolinha
  verde/cinza.

## Alertas (componente único `Alerta`, 4 tipos)
| Tipo | Material | Ícone temático |
|---|---|---|
| `info` | aço: `bg-steel-900 border-steel-700 text-steel-300` | Placa de arena |
| `aviso` | placa iluminada: receita semântica de aviso | Placa + lampejo |
| `erro` | metal oxidado: receita semântica de erro | Metal oxidado |
| `sos` | lampião: `bg-bordo-950 border-bordo-500/60` + `animate-lampiao` | Lampião |
Sempre `role="alert"`, ícone + texto, botão de dispensa ≥ 40px.

## Relatórios
Moldura `.material-rotulo`, ícone livro-caixa, números `.num-tabular`
alinhados à direita, totais com regra de tabela acima, pronto para impressão
(fundo claro na versão print via `@media print`).

## Badges/Selos
`rounded-md`, `text-[11px] font-semibold uppercase tracking-[0.12em]`,
ícone SVG à esquerda (nunca glifo unicode — `✓ → ⌫ 🟢` são proibidos; todo
símbolo é SVG de `icons.tsx`, stroke 1.8). Status de caixa usa a ferradura.

---

# SISTEMA DE ANIMAÇÃO

## Tokens
| Token | Valor | Uso |
|---|---|---|
| duração `tatil` | 120ms | Press, feedback imediato |
| duração `padrao` | 200ms | Hover, cor, borda |
| duração `entrada` | 400–500ms | Entrada de tela/modal |
| duração `ambiente` | 7–14s | Poeira, holofote (decorativo) |
| easing `ease-couro` | `cubic-bezier(0.32, 0.72, 0, 1)` | **Padrão** — peso de couro |
| easing `ease-heavy` | `cubic-bezier(0.83, 0, 0.17, 1)` | Transições estruturais (flip) |
| easing `ease-label` | `cubic-bezier(0.4, 0, 0.2, 1)` | Micro-elementos (labels) |

## Inventário (inspiração → keyframe → uso)
| Inspiração | Keyframe | Uso sancionado |
|---|---|---|
| Movimento de corda | `lasso-spin` | ÚNICO spinner do sistema |
| Poeira de arena | `dust-rise`, `grain-drift` | Ambiente (login/espera); grão estático nas demais |
| Movimento de cavalo | *galope* = padrão de stagger: entradas de lista com `animate-fade-in-up` + delay incremental de **60ms** por item (ritmo de trote, nunca tudo de uma vez) | Grids e listas |
| Movimento de couro | `ease-couro` + `btn-skeuo` (afundamento 3px) | Todo elemento interativo |
| Reflexo metálico | `brilho-metalico` (varredura de brilho 700ms) | Hover de CTA latão, entrada de valor importante — 1×, nunca loop |
| Ferradura | `ferradura-acende` (500ms) | Transição de status do caixa |
| Lampião | `lampiao` (tremulação irregular de chama, 2.8s) | SOS ativo e SOMENTE ele |
| Holofote | `spotlight-flicker` | Fundo de palco |

## Proibições
Bounce/elastic, loops decorativos em conteúdo informacional, animação de
`width/height/top/left` (só `transform`/`opacity`), qualquer coisa > 500ms em
interação, neon/glow futurista. **`prefers-reduced-motion` desliga tudo que é
decorativo** (poeira, grão, holofote, lampejo, lampião vira estático) e
mantém apenas feedback funcional instantâneo.

---

# SISTEMA DE INTERAÇÃO OPERACIONAL

Feedback de estado como componentes prontos (`components/ui/interacoes.tsx`,
`Alerta`, `SeloCaixa`) — nunca recriar inline. Regra de tom: **sutil, rápido,
profissional** — nada caricato, infantil ou futurista; movimento só quando
comunica estado.

| Estado | Elemento | Componente/Receita | Movimento |
|---|---|---|---|
| Loading | Corda de laço + poeira | `<Carregando rotulo telaCheia?>` | `lasso-spin` contínuo; poeira só em tela cheia |
| Sucesso | Ferradura acesa + reflexo metálico | `<SucessoOperacional titulo>` | `ferradura-acende` + `brilho-metalico` **1×** no mount |
| Aviso | Placa iluminada + pulso de latão | `<Alerta tipo="aviso">` | `pulso-latao` (brilho de borda 2.4s, suave) |
| Erro | Metal oxidado + lâmpada vermelha | `<Alerta tipo="erro">` | **ESTÁTICO** — erro não pisca; quem pisca é o SOS |
| SOS | Lampião de emergência | `<Alerta tipo="sos">` / `SosGerencia` | `lampiao` (tremulação irregular de chama) |
| Sangria | Malote de couro | `<MaloteSangria valorCentavos registrada?>` | `malote-guarda` 450ms ao registrar |
| Caixa aberto | Ferradura iluminada | `<SeloCaixa aberto>` | `ferradura-acende` na transição |
| Caixa fechado | Ferradura apagada (aço) | `<SeloCaixa aberto={false}>` | Nenhum |
| Admin | Brasão western | `BrasaoIcon` no DashboardLayout | Nenhum |
| Operador | Distintivo de peão | `DistintivoIcon` no DashboardLayout | Nenhum |
| Relatório | Livro-caixa + rótulo de whisky | `.material-rotulo` + `LivroCaixaIcon` | Nenhum |
| CTA latão (hover) | Reflexo metálico | `.brilho-hover` (embutido no `Botao` latão) | Varredura 700ms, 1× por hover/focus |

**Acessibilidade obrigatória:** `Carregando`/`SucessoOperacional`/`MaloteSangria`
usam `role="status"` + `aria-live="polite"`; alertas usam `role="alert"`;
TODA animação do sistema é desligada sob `prefers-reduced-motion` (o lampião
vira estado estático — a informação nunca depende do movimento).

# CHECKLIST PRE-FLIGHT (toda tela nova/migrada)

1. Zero cor crua do Tailwind (grep `stone-|amber-|slate-|zinc-|gray-|red-|green-` = 0 no arquivo).
2. Todo valor monetário com `.num-tabular`; herói em slab só se estático.
3. Máx. 1 uppercase por bloco; 1 `titulo-pagina` por página.
4. Raios conforme escala (containers `xl`, controles `lg`, selos `md`).
5. Nenhum `backdrop-blur`; overlay sólido.
6. Ícones SVG de `icons.tsx` (zero glifo unicode).
7. Grão/textura presente (página não é flat).
8. Estados: hover, active físico, disabled, foco visível, erro, vazio, loading laço.
9. `min-h-dvh` (não `min-h-screen`); safe-area em elementos fixos.
10. Reduced-motion coberto.
