# Controle de Jornada Operacional (Horas × Valor/Hora) — Design

**Data:** 2026-07-04
**Status:** Aprovado para planejamento
**Telas afetadas:** `Gerenciamento de Equipe` (fechamento de caixa),
novo `Histórico de Turnos`, `Scorecard` do Admin

## Contexto e objetivo

O sistema já registra `dataAbertura`/`dataFechamento` em cada `Caixa` (setados
apenas pelo servidor) e já tem valor/hora configurável e versionado
(`configuracoes_valor_hora`, ver
[2026-07-03-configuracao-valor-hora-design.md](2026-07-03-configuracao-valor-hora-design.md)).
Falta ligar as duas coisas: ao fechar um caixa, calcular quantas horas o
operador trabalhou naquele turno e quanto é devido, exibir um comprovante,
e deixar isso visível no histórico e no scorecard.

**Não é** um sistema de folha de pagamento, banco de horas, adicional
noturno/CLT ou desconto — é um cálculo operacional simples:
`horas trabalhadas × valor/hora vigente = valor devido`, feito 100% dentro
do ciclo já existente de abrir/fechar caixa (regra inegociável nº 7 — só o
MASTER_ADMIN abre/fecha).

## Decisões de arquitetura (confirmadas com o usuário)

1. **Sem entidade nova — colunas em `caixas`:** `valor_hora_aplicado` e
   `valor_total_calculado` são adicionadas diretamente à tabela `caixas`
   (migration `010`), mesmo padrão usado para `valor_final_confirmado`/
   `motivo_fechamento` (migration `006`). Um caixa = um turno = uma jornada;
   não há necessidade de tabela 1:1 separada para o escopo atual.
2. **`minutosTrabalhados` é derivado, nunca persistido** — calculado a
   partir de `dataAbertura`/`dataFechamento`, que já existem. Segue o mesmo
   princípio de "saldo em espécie nunca é armazenado" já usado em `Caixa`.
3. **`valorHoraAplicado`/`valorTotalCalculado` são snapshots imutáveis**,
   gravados apenas no momento do fechamento — porque a configuração de
   valor/hora é versionada e pode mudar depois; o turno já fechado não deve
   ser recalculado retroativamente.
4. **Valor/hora resolvido no instante do fechamento** (não no da abertura):
   se o admin alterar o valor/hora no meio de um turno aberto, o fechamento
   usa o valor vigente em `dataFechamento`, sem rateio proporcional por
   faixa de horário. Simplificação deliberada — consistente com "não criar
   sistema de folha".
5. **Fechamento nunca é bloqueado por falta de configuração de valor/hora**
   — mesmo espírito da regra de negócio nº 2 ("o sistema nunca bloqueia
   venda"). Se não houver valor global nem override de área configurado,
   `valorHoraAplicado`/`valorTotalCalculado` ficam `NULL` e o comprovante
   mostra "Valor/hora não configurado" em vez de impedir o fechamento.
6. **Histórico de Turnos é uma tela nova**, não um anexo ao Scorecard —
   hoje não existe nenhuma lista linha-a-linha de caixas fechados (o
   Scorecard só agrega por operador). Uma tabela dedicada evita misturar o
   conceito de "divergência de caixa" com "horas trabalhadas".
7. **Comprovante é uma segunda tela**, aberta depois que o fechamento é
   confirmado com sucesso — separa a ação de fechar (teclado + motivo, já
   existente em `FecharCaixaModal`) do resultado (resumo/comprovante).

## Modelo de dados

Migration `010_jornada_operador.sql`:

```sql
ALTER TABLE caixas
  ADD COLUMN valor_hora_aplicado   NUMERIC(12,2),
  ADD COLUMN valor_total_calculado NUMERIC(12,2);

ALTER TABLE caixas
  ADD CONSTRAINT chk_jornada_so_no_fechamento
  CHECK (
    status = 'FECHADO' OR (valor_hora_aplicado IS NULL AND valor_total_calculado IS NULL)
  );
```

Ambas as colunas ficam `NULL`:
- em qualquer caixa com `status = ABERTO`;
- em caixas fechados **antes** desta migration (não recalculados
  retroativamente);
- em caixas fechados **depois** desta migration cujo operador não tinha
  nenhum valor/hora (global ou de área) configurado no momento do
  fechamento.

`minutosTrabalhados` não é coluna — é sempre `Duration.between(dataAbertura,
dataFechamento).toMinutes()`, calculado sob demanda no service/DTO.

## Backend

**`ValorHoraService` — novo método:**

```java
Optional<BigDecimal> resolverValorHoraEfetivoAgora(String areaTrabalho)
```

Busca o override `AREA` ativo para `areaTrabalho`; se não existir, busca o
`GLOBAL` ativo; se nenhum existir, retorna `Optional.empty()`. Nunca lança
exceção — chamada é sempre tolerante a "não configurado ainda".

**`Caixa` (entidade):** `fechar(...)` ganha dois parâmetros novos:

```java
public void fechar(BigDecimal valorFinalConfirmado, String motivoFechamento,
                    BigDecimal valorHoraAplicado, BigDecimal valorTotalCalculado)
```

Os dois últimos podem ser `null`. A entidade só grava o que recebe — todo o
cálculo (buscar área do operador, resolver valor/hora, multiplicar) fica no
`CaixaService`, não na entidade.

**`CaixaService.fechar(UUID caixaId, FecharCaixaRequest request)`:**

1. Fluxo atual (busca caixa, valida `estaAberto()`, calcula `saldoEmEspecie`)
   permanece igual.
2. Busca `PerfilFuncionario` do `operadorId` do caixa → `areaTrabalho`.
3. `Optional<BigDecimal> valorHora = valorHoraService.resolverValorHoraEfetivoAgora(areaTrabalho)`.
4. `long minutos = Duration.between(caixa.getDataAbertura(), Instant.now()).toMinutes()`.
5. Se `valorHora` presente:
   `valorTotal = valorHora.multiply(BigDecimal.valueOf(minutos))
                          .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_EVEN)`
   — multiplicar antes de dividir evita erro de arredondamento intermediário
   (regra inegociável nº 1: `BigDecimal`, `HALF_EVEN`).
   Senão, `valorHora` e `valorTotal` ficam `null`.
6. `caixa.fechar(valorFinalConfirmado, motivo, valorHora.orElse(null), valorTotal)`.
7. Retorna `CaixaResponse` já incluindo os campos novos.

**`CaixaResponse` (record) — 3 campos novos:**

```java
Long minutosTrabalhados,        // null se ABERTO
BigDecimal valorHoraAplicado,   // null se ABERTO ou sem configuração
BigDecimal valorTotalCalculado  // null se ABERTO ou sem configuração
```

`minutosTrabalhados` é populado em `CaixaResponse.from(...)` sempre que
`status == FECHADO` (derivado de `dataAbertura`/`dataFechamento`, que já
estão na entidade — sem query extra).

Nenhum endpoint novo: `POST /api/caixas/abrir`, `PUT /api/caixas/{id}/fechar`,
`GET /api/caixas/fechados` continuam os mesmos, só com payload mais rico.

## Frontend

**Comprovante (`ResumoOperacionalModal.tsx`):**

- Aberto por `GerenciamentoEquipe.tsx` imediatamente após o `onConfirmar` do
  `FecharCaixaModal` resolver com sucesso, usando o `CaixaResponse`
  retornado pela própria chamada de fechamento (sem fetch extra).
- Conteúdo: avatar + nome do operador, Entrada (hora local formatada),
  Saída, Horas (`9h30`, não `9.5h` — formato falado), Valor/hora, Total —
  valores monetários em fonte tabular (regra de tipografia do
  DESIGN-SYSTEM.md).
- Se `valorHoraAplicado` for `null`, mostra "Valor/hora não configurado
  para esta área" no lugar do total, sem erro.
- Visual "comprovante operacional": textura de couro/papel, selo de
  ferradura dourada (elemento de sucesso da tabela de feedback visual do
  CLAUDE.md), título "RESUMO OPERACIONAL" em Alfa Slab One. Único botão de
  ação: "Fechar" (dismiss).

**Histórico de Turnos (`HistoricoTurnos.tsx`):**

- Rota nova `/admin-dashboard/historico-turnos`, card próprio na
  `AdminLandingPage` (ícone livro-caixa antigo, já mapeado no CLAUDE.md para
  "Relatórios").
- Hook `useHistoricoTurnos.ts`: `Promise.all([listarFuncionarios(),
  listarCaixasFechados()])`, mesmo padrão de `useScorecard.ts` — junta por
  `operadorId` para nome/foto/área.
- Tabela: Operador, Área, Entrada, Saída, Horas, Valor/hora, Total —
  ordenada por `dataFechamento` desc. Linhas sem snapshot (histórico
  pré-migration ou sem valor/hora configurado) mostram "—" nas colunas de
  valor, nunca `R$ 0,00` (evita parecer que o turno não gerou valor).
- Filtro por área e por operador (reaproveita `extrairAreasDisponiveis` de
  `useGerenciamentoEquipe.ts`).

**Scorecard (`useScorecard.ts` / `AdminScorecard.tsx`):**

- `OperadorScorecard` ganha `totalMinutosTrabalhados` e
  `totalValorDevidoCentavos`, somados a partir dos mesmos
  `listarCaixasFechados()` já buscados — **somente turnos com
  `valorTotalCalculado != null` entram na soma** (turnos sem snapshot são
  ignorados, não tratados como zero, para não subestimar silenciosamente o
  valor devido de um operador).
- `ScorecardCard` exibe a nova estatística (horas totais + valor devido no
  período) ao lado da divergência já existente.

## Fora de escopo / riscos aceitos

- **Sem edição manual de horas.** Se o admin errar a hora de entrada/saída,
  não há tela de correção nesta entrega — `dataAbertura`/`dataFechamento`
  continuam imutáveis, como já são hoje.
- **Sem rateio de valor/hora dentro de um turno** quando a configuração
  muda no meio do turno (decisão nº 4) — pode gerar pequenas distorções em
  turnos raros onde o admin altera o valor/hora com um caixa aberto.
  Aceito conscientemente por ser um cálculo operacional, não uma folha.
- **Sem recálculo retroativo.** Turnos fechados antes desta migration nunca
  terão `valorHoraAplicado`/`valorTotalCalculado` preenchidos.
- **Agregações devem ignorar `null`, não tratar como zero** — risco
  principal identificado; tanto o Histórico quanto o Scorecard precisam
  respeitar isso explicitamente (ver critérios de aceite).

## Preparação para o futuro (payroll/comissão/bônus)

Cada linha de `caixas` fechada com snapshot vira, na prática, um lançamento
imutável de "X horas a R$ Y/hora = R$ Z" — exatamente o ledger que uma
futura folha de pagamento, comissão, bônus ou rateio (roadmap módulo 4+)
precisa para agregar por período sem recalcular nada. Módulos futuros podem
somar `valor_total_calculado` por operador/dia/semana, ou aplicar regras de
comissão/rateio numa tabela separada que referencia `caixas`, sem exigir
nenhuma migração estrutural nesta feature.

## Critérios de aceite

- Abrir caixa continua gravando `dataAbertura` automaticamente (sem
  mudança de comportamento).
- Fechar caixa grava `valorHoraAplicado`/`valorTotalCalculado` (ou `null`
  se não configurado), sem nunca bloquear o fechamento.
- `minutosTrabalhados` aparece corretamente calculado em qualquer
  `CaixaResponse` de caixa fechado.
- Cálculo usa `BigDecimal` com `HALF_EVEN`, multiplicando antes de dividir.
- Comprovante "RESUMO OPERACIONAL" aparece após o fechamento, com dados
  corretos e sem erro quando não há valor/hora configurado.
- Nova tela "Histórico de Turnos" lista cada caixa fechado individualmente
  com as colunas de jornada.
- Scorecard mostra horas/valor devido agregados por operador, ignorando
  (não zerando) turnos sem snapshot.
- Nenhuma tabela nova; apenas 2 colunas + 1 constraint em `caixas`.
- UI segue tema Rodeio Premium, touch-first, alto contraste.
