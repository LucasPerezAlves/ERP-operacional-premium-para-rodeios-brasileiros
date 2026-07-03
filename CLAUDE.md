# CLAUDE.md — Controle da Arena (Gestão Financeira de Rodeio)

Sistema de controle financeiro para eventos de rodeio: bilheteria, bares, caixas,
sangrias e prestação de contas em tempo real, operando em ambiente de rede instável.

## Stack Tecnológica (OFICIAL)

> Nota histórica: menções anteriores a "Fable" referiam-se ao modelo de IA usado no
> escopo, **não** ao compilador F#. A stack F#/Elmish foi descartada e removida.

### Back-end — `backend/`
- **Linguagem:** Java 21+
- **Framework:** Spring Boot 3 (Maven)
- **Persistência:** Spring Data JPA → PostgreSQL gerenciado pelo Supabase
- **Segurança:** Spring Security como OAuth2 Resource Server, validando os
  tokens JWT emitidos pelo Supabase Auth. Este projeto usa as **JWT Signing
  Keys assimétricas (ES256)** do Supabase — não o "JWT Secret" HS256 legado.
  A validação usa o endpoint JWKS (`{SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
  configurado via `SUPABASE_URL`.
- **Pacote raiz:** `com.arena.rodeio` com camadas `controller`, `service`,
  `repository`, `model`, `dto`, `config`

### Front-end — `frontend/`
- **Framework:** React 18 + TypeScript + Vite
- **Estilo:** Tailwind CSS com temática **"Rodeio Premium"** — tons profundos de
  madeira (`wood`), couro desgastado (`leather`), ferrugem para erros (`rust`) e
  dourado fosco para destaques (`gold`); títulos em Alfa Slab One, corpo em Inter
- **Autenticação:** SDK oficial `@supabase/supabase-js` (signInWithPassword / signUp)
- A raiz `/` carrega diretamente a tela de Login/Cadastro — **não há landing page pública**
- **Landing Pages por perfil (pós-login):** cada nível de acesso tem uma página
  inicial própria, dedicada — não um dashboard genérico com `if`:
  - `AdminLandingPage.tsx` (`/admin-dashboard`) — grid de módulos (cards
    grandes) que levam a sub-fluxos: Abrir Caixa, Gerenciar Equipe, etc.
  - `OperadorLandingPage.tsx` (`/operador-dashboard`) — foco em **status**:
    "Aguardando gerência abrir caixa" ou "Caixa Aberto: R$ X de troco"; a
    interface de venda (PDV) só aparece quando o próprio status mostra caixa
    aberto.

## Linguagem Visual e Experiência do Usuário (Rodeio Premium)

O sistema "Controle da Arena" NÃO deve seguir a estética padrão de dashboards
SaaS, fintechs ou templates genéricos de Tailwind/Shadcn.

O objetivo visual é criar a sensação de estar operando os bastidores financeiros
de um grande rodeio brasileiro premium.

### Princípios Visuais

A identidade visual deve transmitir:

- Confiança financeira
- Robustez operacional
- Tradição do rodeio
- Luxo rústico
- Operação em ambiente real de evento
- Alta legibilidade em ambientes com pouca iluminação

### Referências Visuais

Utilizar como inspiração estética:

- Professional Bull Riders (PBR)
- Wrangler
- Ariat
- Yellowstone
- Jack Daniel's
- Cartazes antigos de rodeio
- Couro artesanal premium
- Fivelas western
- Madeira envelhecida
- Metal oxidado
- Arena de rodeio noturna
- Rótulos premium de whisky

### Paleta Conceitual

- Madeira escura (`wood`)
- Couro envelhecido (`leather`)
- Ferrugem controlada (`rust`)
- Dourado fosco (`gold`)
- Aço envelhecido (`steel`)
- Tons escuros de arena (`arena-dark`)

> **Spec executável:** todas as paletas (incluindo `steel` e `arena` — o
> "arena-dark" desta lista), semânticas (`campo` para valores positivos,
> `bordo` para destrutivo/SOS), tipografia, materiais, componentes e
> animações estão definidos em **`DESIGN-SYSTEM.md`** (fonte da verdade do
> design) e implementados em `frontend/tailwind.config.js` +
> `frontend/src/index.css`. Toda tela nova segue o checklist pre-flight do
> DESIGN-SYSTEM.md; telas antigas migram conforme o mapa de migração dele.

### Tipografia

- Títulos: Alfa Slab One
- Conteúdo: Inter
- Valores monetários: fonte altamente legível e tabular
- A hierarquia tipográfica deve ser forte e clara

### Componentes Visuais

Os componentes devem parecer:

- Sólidos
- Táteis
- Profissionais
- Operacionais
- Inspirados em materiais físicos

Evitar:

- Glassmorphism
- Neumorphism
- Gradientes neon
- Estética cyberpunk
- Dashboards SaaS genéricos
- Cards excessivamente arredondados
- Aparência padrão de Tailwind
- Aparência padrão de Shadcn
- Hero sections genéricas
- Centralização excessiva dos elementos

### Linguagem de Feedback Visual

Substituir elementos genéricos por elementos temáticos:

| Contexto | Elemento Visual |
|----------|----------------|
| Loading | Laço girando |
| Processando | Poeira da arena |
| Sucesso | Ferradura dourada |
| Aviso | Placa de arena iluminada |
| Erro | Metal oxidado |
| SOS | Lampião vermelho pulsante |
| Sangria | Malote de couro |
| Caixa Aberto | Ferradura iluminada |
| Caixa Fechado | Ferradura escurecida |
| Administração | Brasão western |
| Operação | Distintivo de peão |
| Relatórios | Livro-caixa antigo |

### Animações

As animações devem ser:

- Curtas
- Sutis
- Funcionais
- Elegantes

Inspiradas em:

- Movimento de laço
- Poeira de arena
- Reflexo metálico
- Movimento de couro
- Vibração de ferraduras

Nunca utilizar:

- Bounce excessivo
- Efeitos caricatos
- Animações infantis
- Efeitos futuristas
- Transições exageradas

### Filosofia de Design

O usuário deve sentir que está utilizando:

> "Um sistema operacional premium para gerenciamento financeiro de grandes eventos de rodeio brasileiros"

e não:

> "Um dashboard SaaS adaptado para tema cowboy".

## Regras Inegociáveis

1. **Dinheiro é `BigDecimal`.** Toda transação, cálculo ou agregação monetária no
   Java usa `java.math.BigDecimal` (scale 2, `RoundingMode.HALF_EVEN`).
   **Nunca** `double` ou `float`. No banco, colunas `NUMERIC(12,2)`.
2. Imutabilidade e tipagem forte onde possível (records para DTOs, entidades com
   validação Bean Validation).
3. Textos de UI e mensagens de erro em **pt-BR**.
4. UI consistente com o tema Rodeio Premium em todas as telas (sem spinners
   genéricos — usar as animações temáticas: laço girando, poeira da arena,
   ferradura pulsando).
5. **Aprovação de Gerência obrigatória.** Nenhum funcionário acessa o sistema
   sem `status_aprovacao = APROVADO` em `perfis_funcionarios`. Todo cadastro
   nasce `PENDENTE` (trigger em `auth.users`), dispara e-mail para a gerência
   com link assinado (HMAC) "Aprovar Peão", e o front-end força `signOut` no
   login de quem ainda não foi aprovado.
6. **RBAC também no back-end.** `SupabaseJwtAuthenticationConverter` resolve
   a role (`ROLE_MASTER_ADMIN` / `ROLE_OPERADOR`) consultando
   `perfis_funcionarios` pelo `sub` do JWT a cada requisição; perfis
   `PENDENTE`/`REJEITADO` não recebem nenhuma role. Endpoints sensíveis usam
   `@PreAuthorize("hasRole(...)")` ou `hasAnyRole(...)` — nunca só
   `authenticated()`, que não garante aprovação da gerência.
7. **Abertura e fechamento de caixa são exclusivos do MASTER_ADMIN.** O
   Operador **não tem autonomia** para abrir nem fechar o próprio caixa —
   essa responsabilidade é 100% da gerência. Fluxo: o Admin acessa "Abrir
   Caixa", escolhe um operador numa lista (com foto e área de trabalho),
   define o valor do troco inicial e confirma; o back-end grava quem
   executou a ação (`aberto_por_admin_id`) separado de quem é o dono do
   caixa (`operador_id`). O Operador apenas visualiza o status do próprio
   caixa e vende — nunca abre/fecha. `POST /api/caixas/abrir` e
   `PUT /api/caixas/{id}/fechar` exigem `hasRole('MASTER_ADMIN')`.

## Regras de Negócio do Domínio

**1. Operação Offline-First (Resiliência de Rede)**
Rodeios sofrem com rede intermitente. O front-end deve evoluir para PWA com
Service Workers e IndexedDB: vendas e recebimentos registrados localmente entram
numa fila e são sincronizados em background quando a conexão volta.

**2. Alertas Automatizados de Sangria (Segurança Física)**
O sistema **nunca bloqueia venda** — faturamento não pode parar num rodeio
lotado. Em vez de um limite binário, cada operador tem dois limiares
configuráveis de dinheiro em espécie (`limiteAtencao` e `limiteCritico`,
`BigDecimal`, campos de `perfis_funcionarios`) que alimentam o
`NivelAlertaNumerario` (`NORMAL` / `ATENCAO` / `CRITICO`), recalculado a
cada venda e exposto em toda resposta de caixa/venda. O papel do sistema é
monitorar e alertar a gerência — nunca decidir ou impedir; quem decide
recolher o dinheiro e registrar a **Sangria** é sempre a gerência (regra
inegociável nº 7).

**3. Conciliação Automática: Dinheiro vs. Estoque**
Módulo de "Carga de Pista/Bar": o garçom recebe um volume X de bebida. No
fechamento, `dinheiro + débito + crédito` deve coincidir com
`(estoque inicial − estoque devolvido) × valor da bebida`.

**4. Autenticação por QR Code ou PIN Rápido**
Além do login por e-mail/senha (administrativo), funcionários operacionais usam
PIN numérico de 4 dígitos ou QR Code exclusivo do evento para acesso rápido em
terminais compartilhados com pouca luz.

**5. Preparação para Sistema Cashless**
O modelo de dados deve estar pronto para absorver "Fichas Virtuais" / pulseiras
RFID: recarga numa Central de Caixa e débito do saldo na venda.

**6. Rastreabilidade Rigorosa de Cortesias (Passe Livre)**
Emissão de passe livre exige **Motivo** (Staff, Convidado do Patrocinador,
Sorteio, Fornecedor) e **Autorizador** obrigatórios. O painel do Admin destaca
quem mais emitiu cortesias na noite.

## Backlog de Funcionalidades — Painéis (RBAC)

Ideias de produto para os painéis `OPERADOR` e `MASTER_ADMIN`, a implementar dentro
dos módulos 2–4 do roadmap (não são módulos novos, são features desses painéis).

### Painel do Operador

1. **Calculadora de Troco Inteligente** — o operador digita o valor pago pelo
   cliente (em cédulas) e o valor da venda; o sistema calcula o troco. Cálculo
   em `BigDecimal` (regra inegociável nº 1).
2. **Bip de Confirmação por Áudio Dinâmico** — cada ação crítica (venda
   concluída, sangria solicitada, ponto batido) emite um som curto e distinto
   (estalo/metálico); erros emitem som grave e longo. Reforça o tema Rodeio
   Premium sem depender de leitura de tela em ambiente barulhento.
3. **Lançamento Rápido Combinado (Combo-Click)** — botões pré-configurados por
   posto (ex.: portaria: "1 ingresso Rodeio", "1 ingresso Baile", "1
   estacionamento", "Rodeio + estacionamento (desconto)") para venda em um
   clique, sem digitar valores.
4. **Botão de Pânico de Caixa ("SOS")** — botão discreto que abre uma tela de
   categorias (Troco / Problema na máquina / Mais gente / Confusão). Se a
   categoria for Troco, o operador seleciona dinamicamente quais notas precisa
   (ex.: "preciso de notas de R$ 5,00"). Dispara alerta em tempo real no painel
   do Admin — elo direto com o item "Alertas em Tempo Real" abaixo.

### Painel do Master Admin

1. **Alertas em Tempo Real (recebe o SOS do Operador)** — alerta piscando por
   caixa/posto com a categoria e o detalhe (ex.: "Caixa 2 (Estacionamento)
   precisa de notas de R$ 5,00"). Evita que o operador abandone o posto ou
   grite no meio do evento para chamar a gerência.
2. **Gráfico de Velocidade de Sangria (Previsão de Cofre)** — analisa o ritmo
   de vendas em dinheiro por bar/posto e classifica em tempo real: "Bar muito
   movimentado" / "Bar mediano" / "Bar parado".
3. **Histórico de Divergência de Peão (Scorecard de Operadores)** — relatório
   do histórico de sobra/falta de cada funcionário ao longo dos dias do
   evento; padrão recorrente de falta (ex.: sempre R$ 20 ou R$ 50) gera alerta
   para acompanhamento daquele operador/posto.
4. **Gestão de Fornecedores e Comitivas (Rateio de Lucro)** — cadastro de alas
   terceirizadas (ex.: parque de diversões, barracas) com taxa de comissão
   configurável (ex.: 15%); repasse calculado automaticamente no fechamento do
   dia.
5. **Dashboard de Custo de Funcionário em Tempo Real** — custo acumulado da
   equipe ativa durante o evento (ex.: "15 funcionários ativos, custo da hora
   corrente: R$ 450,00"), calculado a partir do registro de ponto.
6. **Cadastro de Estoque por Foto (IA/OCR)** — o Admin fotografa a nota fiscal
   de compra; um serviço de IA de visão computacional lê os itens, quantidades
   e valores da imagem e sugere o cadastro automático no estoque (módulo 3),
   evitando digitação manual item por item. A leitura é uma **sugestão**: o
   Admin sempre revisa antes de confirmar o cadastro.
7. **Leitura de Vendas por Foto (Conciliação de Fechamento)** — mesmo motor de
   IA aplicado no fluxo de fechamento de caixa (Gerenciamento de Equipe): o
   Admin fotografa o registro de vendas do posto (comanda, régua de contagem);
   a IA identifica quais produtos foram vendidos e em que quantidade, exibe a
   leitura para conferência e **só abate do estoque depois do "OK" do Admin**
   — nunca automático sem confirmação humana. Alimenta a conciliação da regra
   de negócio nº 3 (Dinheiro vs. Estoque).

## Como Rodar

```bash
# Back-end (requer JDK 21+ e variáveis de ambiente do Supabase)
cd backend
mvn spring-boot:run

# Front-end
cd frontend
npm install
npm run dev   # http://localhost:5173
```

Variáveis de ambiente: ver `backend/src/main/resources/application.yml` e
`frontend/.env.example`.

## Requisitos de Cadastro (Módulo 1)

Além de nome, e-mail e senha, o cadastro do Peão (`AuthPage`, formulário de
Cadastro) exige:
- **Área de Trabalho** (select — ex.: Bar de Fora, Bar Interno, Portaria,
  Estacionamento, Bilheteria) — coluna `area_trabalho` em
  `perfis_funcionarios`. Necessária para o Admin identificar o posto do
  operador na lista de "Abrir Caixa" e nos alertas de sangria/SOS.
- **Foto** (captura por câmera ou upload) — coluna `foto_url`. Usada pelo
  Admin para identificação visual imediata (a lista de operadores mostra a
  foto ao lado do nome). Upload vai para o bucket `fotos-funcionarios` do
  Supabase Storage; a trigger de criação do perfil copia a URL junto com os
  demais metadados do cadastro.

## Roadmap de Módulos

1. **Autenticação e Gestão de Funcionários** ✅ concluído (inclui Aprovação de
   Gerência, RBAC validado ponta a ponta, Área de Trabalho e Foto no cadastro)
2. **Caixas, Vendas e Sangrias** ← em desenvolvimento
   - Back-end pronto: entidades `Caixa`/`Venda`/`Sangria`, saldo em espécie
     sempre derivado (nunca armazenado), alerta `ALERTA_SANGRIA_ATINGIDO` na
     resposta de venda em DINHEIRO, rotas em `/api/caixas` (scripts SQL 004–006)
   - Abertura/fechamento 100% do Admin (regra inegociável nº 7): fluxo
     "Abrir Caixa" com lista de operadores (foto + área); fechamento exige
     valor contado fisicamente + motivo, calculando `divergencia`
     (sobra/falta) contra o saldo derivado dos lançamentos
   - `GET /api/caixas/meu` (Operador acompanha o próprio status) e
     `GET /api/caixas/abertos` (Admin vê o status de todo mundo)
   - Landing do Operador vira hub de funções ("Vender" leva ao PDV em
     `/operador-dashboard/venda`; só habilitado com caixa aberto)
   - Gerenciamento de Equipe do Admin (`/admin-dashboard/equipe`): busca,
     filtro por área, grid de operadores com badge de status de caixa e
     fluxo de fechamento com teclado numérico + motivo
   - PDV do Operador (venda): Combo-Click, Calculadora de Troco, bips por
     Web Audio, `SeloNumerario` com o `NivelAlertaNumerario` do caixa
     (nunca bloqueia DINHEIRO) e SOS via Supabase Realtime (canal `arena-sos`)
   - ✅ Painel do Admin assina o canal `arena-sos` (alerta piscando em
     qualquer tela, `DashboardLayout` + `useSosAlertas`), sangria é
     registrada pela UI (`Gerenciamento de Equipe` → `SangriaModal`), o SOS
     é persistido no back-end (`sos_alertas`, script 007 — histórico
     sobrevive a um Admin que estava offline) e o Scorecard de Divergência
     (`/admin-dashboard/scorecard`) consolida sobra/falta por operador com
     alerta de padrão recorrente
   - ✅ Regra de negócio nº 2 revisada: `limiteSangria` binário virou dois
     limiares por operador (`limiteAtencao`/`limiteCritico`, script 008) que
     alimentam o `NivelAlertaNumerario`; painel "Recolhimento Recomendado"
     em Gerenciamento de Equipe lista caixas em ATENCAO/CRITICO em tempo
     real (Realtime na tabela `vendas`) com ação direta de Registrar Sangria
3. Carga de pista/bar e conciliação de estoque — inclui os itens 6 e 7 do
   backlog do Master Admin (cadastro de estoque e leitura de vendas por
   foto/IA, sempre com confirmação humana antes de qualquer baixa)
4. Cortesias e relatórios do Admin
5. PWA offline-first e cashless/RFID

## Dívida Técnica de Design

✅ **Quitada na migração total do front-end (2026-07-02).** Todo o front foi
refatorado para o DESIGN-SYSTEM.md: zero glassmorphism (superfícies sólidas
de madeira), zero cor crua do Tailwind (só tokens), zero `rounded-2xl`,
`min-h-dvh` em toda página, dígitos tabulares em todo valor monetário,
ícones 100% SVG próprios e componentes compartilhados em
`frontend/src/components/ui/` (`Botao`, `Alerta`, `Modal`, `Avatar`,
`SeloCaixa`). O checklist pre-flight do DESIGN-SYSTEM.md roda mecanicamente
por grep e deve continuar zerado em toda tela nova.
