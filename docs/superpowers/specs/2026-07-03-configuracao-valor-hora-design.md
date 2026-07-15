# Configuração de Valor/Hora dos Funcionários — Design

**Data:** 2026-07-03
**Status:** Aprovado para planejamento
**Tela afetada:** `/admin-dashboard/equipe` (Gerenciamento de Equipe)

## Contexto e objetivo

O MASTER_ADMIN precisa configurar quanto cada funcionário ganha por hora
trabalhada, para alimentar (no futuro) o dashboard de custo de equipe em
tempo real e a folha de pagamento (backlog do Master Admin, itens 5 e
roadmap módulo 4+). Hoje não existe nenhum campo de valor/hora no sistema.

Dois modelos de precificação devem coexistir:

- **Valor Global** — um valor padrão único aplicado a todos os funcionários.
- **Overrides por Área** — qualquer uma das 7 áreas de trabalho
  (`Bar de Fora`, `Bar Interno`, `Portaria`, `Estacionamento`, `Bilheteria`,
  `Cozinha`, `Segurança`) pode opcionalmente ter um valor específico, que
  prevalece sobre o valor global para os funcionários daquela área.

## Decisões de arquitetura (confirmadas com o usuário)

1. **Vigência por período (effective-dating):** toda alteração de valor cria
   um novo registro versionado com `vigencia_inicio`; o registro anterior é
   fechado (`vigencia_fim`, `ativo=false`). Cálculos de custo futuros podem
   consultar "qual era o valor vigente na data X" em vez de só o valor atual.
2. **Mistura seletiva por área (não é uma chave binária de sistema):** existe
   sempre um valor global; cada área pode, independentemente, ter um
   override ativo ou não. Resolução: override da área > valor global.
3. **Histórico visível na UI já nesta entrega:** o modal VALORES tem uma
   aba/seção "Histórico" listando alterações passadas (data, admin, valor
   anterior → novo), não só uma auditoria "silenciosa" no banco.
4. **Lista de áreas fixa:** as 7 áreas de `AREAS_TRABALHO` sempre aparecem no
   modal, independente de haver funcionário ativo naquela área hoje.

## Modelo de dados

Nova tabela `configuracoes_valor_hora` (migration `009`), não uma coluna em
`perfis_funcionarios` — porque, ao contrário de `limiteAtencao`/
`limiteCritico` (um valor por funcionário, sem histórico), aqui é necessário
guardar múltiplos registros versionados por escopo (global ou por área).

```sql
CREATE TABLE configuracoes_valor_hora (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  escopo VARCHAR(10) NOT NULL CHECK (escopo IN ('GLOBAL', 'AREA')),
  area_trabalho VARCHAR(60),              -- NULL quando escopo = GLOBAL
  valor_hora NUMERIC(12,2) NOT NULL CHECK (valor_hora >= 0),
  vigencia_inicio TIMESTAMPTZ NOT NULL DEFAULT now(),
  vigencia_fim TIMESTAMPTZ,               -- preenchido quando substituído/removido
  ativo BOOLEAN NOT NULL DEFAULT true,
  criado_por_admin_id UUID NOT NULL REFERENCES perfis_funcionarios(id),
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX ux_valor_hora_global_ativo
  ON configuracoes_valor_hora (escopo) WHERE escopo = 'GLOBAL' AND ativo;
CREATE UNIQUE INDEX ux_valor_hora_area_ativo
  ON configuracoes_valor_hora (area_trabalho) WHERE escopo = 'AREA' AND ativo;
```

**Regra de versionamento:** ao alterar um valor (global ou de uma área), o
serviço fecha o registro ativo atual daquele escopo (`ativo=false`,
`vigencia_fim=now()`) e insere um novo (`vigencia_inicio=now()`), gravando
`criado_por_admin_id`. Remover um override de área é o mesmo fluxo, sem
inserir substituto — a área volta a herdar o valor global.

**Resolução do valor efetivo** para uma área A no instante T: busca o
registro `AREA` vigente em T para A; se não existir, usa o registro
`GLOBAL` vigente em T.

## Constante compartilhada `AREAS_TRABALHO`

Extrair de `frontend/src/pages/AuthPage.tsx` (linhas 31-39) para
`frontend/src/constants/areasTrabalho.ts`, importada por `AuthPage.tsx` e
pelo novo modal. Evita duplicar a lista fixa de 7 áreas.

## Backend

**Novos tipos:**
- `EscopoValorHora` (enum: `GLOBAL`, `AREA`)
- `ConfiguracaoValorHora` (entity)

**DTOs:**
- `ValorHoraAtualResponse` — `{ valorHoraGlobal: {valor, vigenciaInicio,
  alteradoPorAdminId, alteradoPorNome}, overridesPorArea: [{area, valor,
  vigenciaInicio, alteradoPorAdminId, alteradoPorNome}] }`
- `HistoricoValorHoraResponse` — lista plana de todos os registros (ativos e
  fechados), para a aba Histórico
- `SalvarValorHoraRequest` — `{ valorHoraGlobal: BigDecimal, overrides:
  [{area: String, valorHora: BigDecimal}] }` (payload único — mesmo padrão
  "save completo" de `atualizarFuncionario`)

**Endpoints** (`ValorHoraController`, todos
`@PreAuthorize("hasRole('MASTER_ADMIN')")` — regra inegociável nº 6, mesmo
padrão de abrir/fechar caixa):
- `GET /api/valores-hora` → `ValorHoraAtualResponse`
- `GET /api/valores-hora/historico` → lista de `HistoricoValorHoraResponse`
- `PUT /api/valores-hora` → recebe `SalvarValorHoraRequest`; o service faz o
  diff contra o estado ativo atual e só versiona (fecha+cria) o que
  realmente mudou. Um override ausente da lista enviada é removido (fecha o
  registro, sem substituto).

**Service (`ValorHoraService`):** valida `valorHora >= 0` e `scale=2`
(`@DecimalMin("0.00")`/`@Digits(integer=10, fraction=2)`, mesmo padrão de
`PerfilFuncionarioRequest`), aplica `RoundingMode.HALF_EVEN`, e centraliza a
lógica de "resolver valor efetivo por área" — método que o futuro módulo de
custo/folha (backlog item 5) vai reaproveitar.

## Frontend

- Botão **VALORES** na página `GerenciamentoEquipe`, mesma linha dos outros
  controles administrativos.
- `ValoresHoraModal.tsx` (segue `Modal.tsx` + linguagem visual de
  `EditarLimitesModal`):
  - **Seção "Valor Padrão"** — sempre visível, campo único (moeda, teclado
    touch-first).
  - **Seção "Valores por Área"** — as 7 áreas fixas; cada linha tem um
    checkbox "Valor específico" + campo (desabilitado, mostrando "usa
    padrão: R$ X" em cinza quando desmarcado).
  - **Aba/Toggle "Histórico"** — lista cronológica: data, admin, valor
    anterior → novo, badge Global/Área.
  - Botões Cancelar/Salvar, spinner temático (poeira da arena) durante o
    save.
- `useValoresHora.ts` (fetch estado atual + histórico + save) e 3 novas
  funções em `frontend/src/lib/api.ts`.

## Fora de escopo / riscos aceitos

- **Consumo dos valores:** esta entrega só guarda e expõe a configuração.
  Nenhum cálculo de custo (ex.: "Dashboard de Custo de Funcionário em Tempo
  Real") é conectado agora — o método de resolução do service já fica pronto
  para reuso futuro.
- **Edição concorrente:** sem lock otimista nesta entrega (baixa
  concorrência esperada — 1 admin por evento).
- **Sem agendamento futuro de vigência:** toda alteração vale "a partir de
  agora"; não há como programar um valor para começar numa data futura.

## Critérios de aceite

- Admin consegue configurar valor global e, opcionalmente, valores por área.
- Alterações são persistidas com vigência e autoria (auditável via
  histórico).
- Admin consegue editar um valor existente e remover um override de área
  (retorno ao valor global).
- Aba Histórico mostra as alterações anteriores.
- Apenas MASTER_ADMIN acessa os endpoints (`@PreAuthorize`).
- UI segue tema Rodeio Premium (sem genérico SaaS), touch-first, alta
  legibilidade em ambiente noturno.
