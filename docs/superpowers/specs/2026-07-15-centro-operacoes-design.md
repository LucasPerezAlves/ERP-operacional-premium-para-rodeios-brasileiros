# Centro de Operações do Evento — Design

**Data:** 2026-07-15
**Status:** Aprovado para planejamento
**Tela afetada:** `/admin-dashboard` (landing do MASTER_ADMIN)

## Contexto e objetivo

A Sidebar (`frontend/src/components/navigation/Sidebar.tsx`) já cobre 100%
da navegação administrativa (`ITENS_OPERACAO`: Dashboard, Abrir Caixa,
Gerenciar Equipe, Scorecard, Histórico de Turnos). A landing do Admin
(`AdminLandingPage.tsx`) hoje é um grid de 3 cards de atalho + lista "No
Curral" — navegação redundante com a Sidebar.

Ela deixa de ser uma página de atalhos e passa a ser o **Centro de
Operações do Evento**: uma visão operacional consolidada, só com dados
reais já existentes no sistema (sem gráfico, sem endpoint de agregação
novo além do mínimo listado abaixo, sem dado fictício). Nenhum botão de
navegação permanece na página — toda navegação estrutural continua
exclusiva da Sidebar; links contextuais dentro dos painéis de dados
("Ver Histórico completo") são permitidos, pois são afordance de dado, não
navegação primária.

## Decisões de arquitetura (confirmadas com o usuário)

1. **Agregação 100% no frontend**, num hook único
   (`useCentroOperacoes.ts`), que busca em paralelo os endpoints já
   existentes + o único endpoint novo (sangrias). Mesmo padrão já usado em
   `useScorecard.ts`/`useHistoricoTurnos.ts` — nenhum endpoint de resumo
   pré-computado no backend.
2. **Um endpoint novo, deliberado e mínimo:** `GET /api/caixas/sangrias`
   — não existia forma de listar sangrias de todos os operadores (só por
   caixa individual), e sem isso o Activity Feed não poderia mostrar
   sangria sem inventar dado. Esta é uma exceção explícita à instrução
   original de "não criar endpoints", aceita pelo usuário.
3. **Links contextuais são permitidos dentro dos painéis** (ex.: "Ver
   Histórico completo" no fim do Activity Feed, "Ver Scorecard" no
   FinancialPanel) — a proibição de "botão de navegação" mira o grid de
   cards-atalho removido, não afordances de dado dentro de um painel.
4. **RealtimePanel mostra caixas abertos por nível de alerta** (não
   duplica o banner de SOS, que já existe globalmente em `AdminLayout` —
   evita redundância).
5. **`DashboardContent` do enunciado original é absorvido por
   `DashboardGrid`** — mesma responsabilidade (arranjar os painéis em
   grid responsivo), um componente a menos.
6. **Falha parcial não é tratada:** as 5 chamadas do hook rodam em
   `Promise.all`; se qualquer uma falhar, a página mostra um único
   `<Alerta tipo="erro">` e não renderiza nada parcialmente — mesmo padrão
   já usado em `useScorecard`/`useGerenciamentoEquipe`.

## Modelo de dados (backend)

Nenhuma tabela ou coluna nova — só uma leitura nova sobre `sangrias`
(já existente desde a migration `004`).

**`SangriaRepository`** ganha:
```java
List<Sangria> findAllByOrderByRegistradaEmDesc();
```

**Novo DTO** `SangriaResumoResponse` (deliberadamente mais enxuto que
`SangriaResponse`, que já existe para a resposta de criação):
```java
public record SangriaResumoResponse(
    UUID id,
    UUID caixaId,
    UUID operadorId,
    BigDecimal valor,
    Instant registradaEm
) {
    public static SangriaResumoResponse from(Sangria sangria) {
        return new SangriaResumoResponse(
            sangria.getId(),
            sangria.getCaixa().getId(),
            sangria.getCaixa().getOperadorId(),
            sangria.getValor(),
            sangria.getRegistradaEm());
    }
}
```
Sem `saldoEmEspecie`: esse campo exigiria recalcular o saldo retroativo de
cada caixa a cada sangria listada — caro e desnecessário só para o feed
mostrar "sangria de R$X às HH:mm no caixa de {operador}".

**`CaixaService`** ganha `listarTodasSangrias(): List<SangriaResumoResponse>`.

**`CaixaController`** ganha:
```java
@GetMapping("/sangrias")
@PreAuthorize("hasRole('MASTER_ADMIN')")
public List<SangriaResumoResponse> listarSangrias() {
    return caixaService.listarTodasSangrias();
}
```
Nested sob `/api/caixas`, mesmo padrão de `/abertos` e `/fechados` — não
justifica um `SangriaController` novo para um único endpoint de leitura.

## Frontend — arquivos novos

**`frontend/src/lib/tempo.ts`** (já existe, da feature de jornada) ganha:
```ts
export function ehHoje(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}
```

**`frontend/src/lib/api.ts`** ganha `SangriaResumoApi` (espelha o DTO) e
`listarSangrias(): Promise<SangriaResumoApi[]>`.

**`frontend/src/hooks/useCentroOperacoes.ts`** — busca em paralelo
`listarCaixasAbertos`, `listarCaixasFechados`, `listarFuncionarios`,
`listarSosAbertos`, `listarSangrias`; computa:
- os 4 KPIs (ver abaixo)
- dados do `RealtimePanel` (caixas abertos + nível de alerta)
- dados do `FinancialPanel` (divergência de hoje = soma de `divergencia`
  dos fechamentos com `dataFechamento` em `ehHoje(...)`; valor devido de
  hoje = mesmo filtro, soma de `valorTotalCalculado` — ignorando `null`,
  nunca tratando como zero, mesma regra já usada no Scorecard)
- dados do `OperationalPanel` (equipe ativa, contagem em alerta)
- itens do `ActivityFeed` (abertura, fechamento, sangria, SOS — mesclados
  por timestamp, mais recentes primeiro)

**`frontend/src/components/dashboard/`** (pasta nova):
- `DashboardHeader.tsx` — título "Centro de Operações do Evento" +
  subtítulo dinâmico com dado real (ex.: "3 caixas abertos · R$ 1.240,00
  em espécie agora")
- `DashboardKPIRow.tsx` — recebe `KPI[]` (`{ rotulo, valor, icone }`),
  renderiza os 4 tiles em grid responsivo, `num-tabular` nos valores
- `DashboardGrid.tsx` — grid responsivo 2 colunas (feed à esquerda mais
  largo, painéis empilhados à direita) — absorve a responsabilidade do
  `DashboardContent` do enunciado original
- `DashboardSection.tsx` — chrome genérico reutilizável (ícone + título +
  moldura) usado pelos 4 painéis abaixo — hoje esse padrão está duplicado
  inline em `PainelRecolhimento`/`ComprovanteFechamento`
- `RealtimePanel.tsx` — lista de caixas abertos com `SeloNumerario`
  (componente já existente) por operador
- `FinancialPanel.tsx` — divergência acumulada hoje + valor devido hoje +
  link "Ver Scorecard" (`/admin-dashboard/scorecard`)
- `OperationalPanel.tsx` — equipe ativa (aprovados/ativos) + contagem em
  alerta (ATENÇÃO+CRÍTICO)
- `ActivityFeed.tsx` — timeline mesclada dos 4 tipos de evento, com ícone
  por tipo (`HorseshoeIcon` abertura/fechamento, `MaloteIcon` sangria,
  `LampiaoIcon` SOS), stagger de entrada ("galope":
  `animate-fade-in-up` + 60ms por item), link "Ver Histórico completo"
  (`/admin-dashboard/historico-turnos`)

**`AdminLandingPage.tsx`** vira a página de composição: remove os 3 cards
+ lista "No Curral" por completo, monta
`DashboardHeader` + `DashboardKPIRow` + `DashboardGrid` (com os 4 painéis
dentro). Mesma rota (`/admin-dashboard`), mesmo arquivo.

## KPIs (todos derivados, nenhum persistido)

1. **Caixas Abertos** — contagem de `listarCaixasAbertos()` —
   `HorseshoeIcon`
2. **Espécie em Caixa Agora** — soma de `saldoEmEspecie` dos caixas
   abertos — `CifraoIcon`
3. **Operadores em Alerta** — contagem com `nivelAlerta !== "NORMAL"` —
   `LampadaIcon`
4. **Valor Devido Hoje** — soma de `valorTotalCalculado` dos fechamentos
   cuja `dataFechamento` passa em `ehHoje(...)` — `RelogioIcon` (mesmo
   ícone da tela de jornada)

## Fora de escopo / riscos aceitos

- **Sem paginação/limite explícito no Activity Feed** — eventos de rodeio
  são de curta duração (um evento, não uma operação contínua de meses);
  mesma decisão já aceita em `listarCaixasFechados()`. Se o volume crescer
  no futuro, o feed pode limitar a exibição aos N mais recentes no
  frontend sem mudar o contrato do backend.
- **`GET /api/caixas/sangrias` não filtra por período** — retorna todas as
  sangrias já registradas; aceitável pelo mesmo motivo acima.
- **Falha parcial não tem UI dedicada** — uma única fonte de dado
  indisponível derruba a página inteira com um erro genérico, em vez de
  renderizar os painéis que carregaram com sucesso. Consciente e
  consistente com o resto do projeto.

## Critérios de aceite

- `/admin-dashboard` não tem nenhum card de navegação nem a lista "No
  Curral" — só `DashboardHeader`, `DashboardKPIRow` e os 4 painéis.
- Os 4 KPIs mostram valores reais, calculados a partir dos endpoints
  existentes + `GET /api/caixas/sangrias`.
- `ActivityFeed` mescla corretamente os 4 tipos de evento por horário,
  mais recente primeiro.
- `RealtimePanel` reflete o nível de alerta real de cada caixa aberto.
- `FinancialPanel` e `OperationalPanel` mostram números batendo com
  `Scorecard`/`Gerenciar Equipe` para o mesmo instante.
- Links contextuais ("Ver Histórico completo", "Ver Scorecard") navegam
  corretamente; nenhum outro elemento clicável de navegação existe na
  página.
- Novo endpoint `GET /api/caixas/sangrias` só acessível por
  `MASTER_ADMIN` (regra inegociável nº 6).
- UI segue tema Rodeio Premium: `num-tabular` em todo valor monetário,
  ícones SVG próprios por tipo de evento, stagger "galope" na entrada da
  lista, sem gráfico algum.
