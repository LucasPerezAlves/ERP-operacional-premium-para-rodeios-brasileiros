# CLAUDE.md — Controle da Arena (Plataforma Velho Promoções)

O **Controle da Arena** é a plataforma completa de gestão de eventos da
**Velho Promoções** — não mais só o back-office interno de um rodeio. A
plataforma é composta por duas grandes áreas, que compartilham o mesmo
domínio e nunca duplicam cadastro entre si:

- **Área Pública** — Landing Page institucional, divulgação de eventos,
  vitrine somente-leitura sobre os eventos publicados pelo Admin.
- **Área Operacional** — tudo que já existia: Administração, Operadores,
  Financeiro, Caixa, Sangrias, Jornada, Catálogo Operacional, Scorecards,
  SOS e Analytics futuros.

O núcleo funcional segue sendo o mesmo: bilheteria, bares, caixas, sangrias
e prestação de contas em tempo real, operando em ambiente de rede instável.

## Visão de Produto e Arquitetura de Rotas

Fluxo de navegação oficial:

```
/                → Landing Page pública (institucional + eventos publicados)
   ↓ "Entrar"
/auth            → Login/Cadastro (tela preservada, só muda de rota)
   ↓ (RBAC resolve o perfil)
/admin-dashboard      → Área Operacional do Admin
/operador-dashboard   → Área Operacional do Operador
```

- A raiz `/` deixou de ser a tela de login — agora é a Landing Page pública.
- `AuthPage` migra para `/auth`, sem nenhuma mudança de comportamento interno.
- Rota desconhecida (`*`) redireciona para `/` (Landing), não mais para o login.
- A Landing **não tem lógica própria de eventos** — consome exclusivamente
  eventos com `status = PUBLICADO`, cadastrados pelo Admin. Ver "Entidade
  Central: Evento" abaixo.
- **Assets oficiais de marca:** a pasta `images/` na raiz do repositório
  contém os materiais oficiais da Velho Promoções (logo, banner de
  divulgação, foto de evento de demonstração). Toda implementação de Landing
  Page ou interface pública deve usar esses assets — nunca placeholder
  genérico quando um asset oficial já existe.

## Entidade Central: Evento

`Evento` é o aggregate root de todo o domínio — Landing, Administração,
Operação, Financeiro, Caixa, Sangrias, Jornada, Relatórios, Catálogo e
Analytics futuros são todos alimentados pelo mesmo cadastro de evento, sem
duplicidade.

**Propagação por escopo transitivo, não por FK duplicado em toda tabela.**
`Caixa` é o único ponto que referencia `evento_id` diretamente; `Venda` e
`Sangria` já referenciam `caixa_id`, então herdam o escopo do evento
transitivamente pela cadeia `Evento → Caixa → Venda/Sangria`. Não adicionar
`evento_id` em `Venda`/`Sangria`/tabelas derivadas — seria redundante.

**Entidades persistentes entre eventos (não duplicam por evento):**
`PerfilFuncionario` (funcionário existe uma vez, trabalha em N eventos),
o Catálogo Operacional (reutilizável entre eventos por design — ver seção
própria) e `ConfiguracaoValorHora` (política de RH, não do evento).

**Contrato Landing ↔ Admin:** `Evento` tem um status de publicação
(`RASCUNHO` / `PUBLICADO` / `ENCERRADO`). Só o endpoint público de leitura
filtra por `PUBLICADO`; o CRUD administrativo enxerga todos os status. O
DTO público (`EventoPublicoResponse` ou equivalente) deve ser distinto do
DTO administrativo — nunca reaproveitar o mesmo response, para não vazar
campo sensível por engano numa serialização futura.

## Catálogo Operacional (antigo "Estoque")

O módulo antes chamado "Estoque" evolui para o domínio **Catálogo
Operacional** — fonte única de produtos para toda a plataforma (PDV,
estoque, combos, itens de consumo, relatórios, inventário, conciliação,
compras futuras). Todo produto é cadastrado uma única vez e reutilizado
entre eventos (por isso não é escopado por `evento_id` — ver seção acima).

A entidade `Produto` já existente (peça 1/6 entregue) ganha os campos
`unidade`, `fornecedor` (texto simples — não vale criar entidade
`Fornecedor` própria enquanto não houver um segundo consumidor do dado) e
`observacoes`.

**Fluxos de cadastro nesta fase:**
1. Cadastro manual (já existente, evoluído com os campos acima).
2. Importação em lote via **arquivo JSON** — carga inicial e reaproveitamento
   entre eventos. Implementar como uma porta/estratégia de parsing
   desacoplada do formato (só JSON agora), para CSV/Excel/API entrarem depois
   sem reabrir o contrato de `ProdutoService`. Validação item a item do
   array (mesmo padrão de Bean Validation de `ProdutoRequest`), com
   relatório de erro por linha — nunca tudo-ou-nada silencioso.

**IA local removida do escopo, permanentemente.** Motivo: o hardware
disponível não suporta modelos locais de forma consistente. Não usar OCR,
visão computacional, reconhecimento de imagem, modelos locais nem
classificação automática de produto em nenhuma frente do roadmap — os itens
6 e 7 do antigo backlog do Master Admin (cadastro de estoque por foto e
leitura de vendas por foto) foram removidos definitivamente, não adiados.

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
  `repository`, `model`, `dto`, `config`. Ver "Recomendações de Arquitetura
  para Escalabilidade" abaixo para a evolução recomendada desse pacote à
  medida que Evento e Área Pública entram.

### Front-end — `frontend/`
- **Framework:** React 18 + TypeScript + Vite
- **Estilo:** Tailwind CSS com temática **"Rodeio Premium"** — tons profundos de
  madeira (`wood`), couro desgastado (`leather`), ferrugem para erros (`rust`) e
  dourado fosco para destaques (`gold`); títulos em Alfa Slab One, corpo em Inter
- **Autenticação:** SDK oficial `@supabase/supabase-js` (signInWithPassword / signUp)
- A raiz `/` é a **Landing Page pública** da Velho Promoções (institucional +
  eventos publicados); o login/cadastro mora em `/auth` — ver "Visão de
  Produto e Arquitetura de Rotas" acima.
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
   `authenticated()`, que não garante aprovação da gerência. **Única exceção
   deliberada:** o endpoint público de leitura de eventos publicados (Área
   Pública/Landing), que deve usar um matcher `permitAll()` explícito e
   restrito (só `GET`, só o path de eventos públicos, só o DTO público) no
   `SecurityConfig` — nunca uma regra genérica que amplie o `permitAll` além
   desse escopo.
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

Ideias de produto para os painéis `OPERADOR` e `MASTER_ADMIN`, a implementar ao
longo do roadmap (não são módulos novos, são features desses painéis).

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

> **Removidos permanentemente:** os antigos itens 6 ("Cadastro de Estoque
> por Foto/IA-OCR") e 7 ("Leitura de Vendas por Foto") saíram do backlog —
> ver "IA local removida do escopo" na seção do Catálogo Operacional. A
> conciliação da regra de negócio nº 3 (Dinheiro vs. Estoque) continua no
> roadmap, só que sempre por lançamento manual/itemização de venda, nunca
> por leitura automática de imagem.

## Recomendações de Arquitetura para Escalabilidade

À medida que Evento, Área Pública e Catálogo Operacional entram, o projeto
deve seguir estas diretrizes para não perder a limpeza arquitetural:

1. **Reorganizar por domínio, não só por camada técnica.** O pacote flat
   atual (`controller/service/repository/model/dto` únicos) funcionava com 7
   controllers; não escala bem misturando endpoints públicos e operacionais.
   Evoluir para subpacotes por domínio — `com.arena.rodeio.evento`,
   `.catalogo`, `.caixa`, `.publico` — mantendo a mesma disciplina de
   camadas dentro de cada um.
2. **DTOs públicos e administrativos nunca compartilhados 1:1.** Mesmo
   quando a entidade é a mesma (`Evento`), a Landing e o Admin devem ter
   response shapes distintos desde o primeiro commit — evita vazar campo
   sensível por uma serialização futura descuidada.
3. **Matchers de segurança explícitos por área**, não uma regra geral com
   exceções pontuais — `/api/eventos/publicos/**` com `permitAll()`
   restrito a `GET`, resto do sistema continua exigindo role. Mais fácil de
   auditar (ver regra inegociável nº 6).
4. **Importação de catálogo como porta/estratégia desacoplada do formato**
   (`ImportadorProdutos`, hoje só `Json`) — CSV/Excel/API entram como novas
   implementações, nunca como `if/else` dentro do mesmo método.
5. **Disciplina incremental, sem antecipar abstração.** Mesma prática já
   usada no projeto (ex.: não criar entidade `Fornecedor` enquanto só há um
   campo de texto consumindo o dado) — Evento e Catálogo devem crescer em
   fatias pequenas e testáveis, como o Módulo 2 já foi entregue.

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
3. **Evento (entidade central)** ✅ Sprint 1 concluída — migration
   (`012_eventos.sql`), entidade `Evento`, CRUD administrativo
   (`/api/eventos`) e state machine completa de status (`RASCUNHO` →
   `PUBLICADO` → `EM_ANDAMENTO` → `ENCERRADO`, mais `CANCELADO`/`ARQUIVADO`),
   com slug gerado e imutável. Tela simples `/admin-dashboard/eventos` só
   para validar o domínio — sem UX refinada ainda. Isolado por design:
   nenhum outro módulo (Caixa, Funcionário, Catálogo) referencia Evento
   nesta entrega (ver "Entidade Central: Evento" acima).
4. **Landing Page Pública** ← próximo — rota `/`, endpoint público de leitura de
   eventos publicados, consumo dos assets oficiais em `images/`. Depende de (3).
5. **Reorganização de Rotas** — `AuthPage` migra para `/auth`, ajusta
   `ProtectedRoute` e o redirect de rota desconhecida. Depende de (4) estar
   funcional, para não deixar a raiz sem Landing.
6. **Caixa × Evento** — `evento_id` em `Caixa`, seletor de evento ativo no
   fluxo "Abrir Caixa", filtros de Centro de Operações/Scorecard/Histórico de
   Turnos por evento. Retrofit de schema — decisão pendente sobre backfill de
   caixas históricos sem evento associado.
7. **Catálogo Operacional (evolução)** — campos `unidade`/`fornecedor`/
   `observacoes` em `Produto` + importação em lote via JSON.
8. Itemização de Venda (`Venda` ganha produto+quantidade) — pré-requisito da
   conciliação.
9. Carga de pista/bar (alocação de estoque a operador/posto no início do turno).
10. Conciliação Dinheiro × Estoque no fechamento (regra de negócio nº 3) —
    depende de (8) e (9), sempre manual (sem IA — ver acima).
11. Cortesias e relatórios do Admin
12. PWA offline-first e cashless/RFID

## Dívida Técnica de Design

✅ **Quitada na migração total do front-end (2026-07-02).** Todo o front foi
refatorado para o DESIGN-SYSTEM.md: zero glassmorphism (superfícies sólidas
de madeira), zero cor crua do Tailwind (só tokens), zero `rounded-2xl`,
`min-h-dvh` em toda página, dígitos tabulares em todo valor monetário,
ícones 100% SVG próprios e componentes compartilhados em
`frontend/src/components/ui/` (`Botao`, `Alerta`, `Modal`, `Avatar`,
`SeloCaixa`). O checklist pre-flight do DESIGN-SYSTEM.md roda mecanicamente
por grep e deve continuar zerado em toda tela nova.

## Pendências Técnicas

- **Avatar do rodapé da sidebar do Admin sempre mostra a silhueta.**
  `PerfilUsuario` (`frontend/src/lib/auth.tsx`) ainda não expõe `foto_url` —
  `RodapeUsuario` em `frontend/src/components/navigation/Sidebar.tsx` chama
  `Avatar` com `fotoUrl={null}` hardcoded. Resolver exige estender
  `buscarPerfil` para trazer `foto_url` de `perfis_funcionarios` e propagar
  pelo `AuthContext`. Não é regressão (o header antigo do Admin nem exibia
  foto), mas o Master Admin com foto cadastrada continua vendo o fallback
  genérico até isso ser feito.
