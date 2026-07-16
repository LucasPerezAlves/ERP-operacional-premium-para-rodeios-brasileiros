# Cadastro de Estoque — Design

**Data:** 2026-07-15
**Status:** Aprovado para planejamento
**Tela nova:** `/admin-dashboard/estoque`

## Contexto e objetivo

Módulo 3 do roadmap ("Carga de pista/bar e conciliação de estoque") é grande
demais para uma entrega só — decompõe em 6 peças com dependências entre si:

1. **Cadastro de Estoque** (esta entrega) — catálogo de produtos.
2. Cadastro de Estoque por Foto/IA (OCR de nota fiscal) — depende de (1).
3. Carga de Pista/Bar (alocar estoque a um operador/posto no início do turno) — depende de (1).
4. Itemização de Venda (`Venda` ganha produto+quantidade) — depende de (1).
5. Conciliação Dinheiro × Estoque no fechamento (regra de negócio nº 3) — depende de (3) e (4).
6. Leitura de Vendas por Foto/IA — depende de (5).

Esta spec cobre só a peça 1: o Admin cadastra, edita e desativa produtos
(nome, categoria, quantidade em estoque central, valor de venda, valor de
custo). Hoje **nada disso existe** — nem entidade, nem migration, nem tela
("Estoque" no menu é só um item decorativo em `ITENS_NO_CURRAL`, sem rota).

O Combo-Click do PDV do Operador (`OperadorVenda.tsx`) já tem um comentário
no próprio código apontando para este momento: "Ficam no front até o módulo
de estoque trazer cadastro de produtos" — mas conectar o catálogo ao PDV é
a peça 4, fora do escopo desta entrega.

## Decisões de arquitetura (confirmadas com o usuário)

1. **Valor de venda + valor de custo**, os dois desde já — mesmo sem
   nenhuma tela de margem/lucro consumindo `valorCusto` ainda, guardar os
   dois evita uma migration extra quando essa análise existir.
2. **Categoria fixa** (`BEBIDA`, `COMIDA`, `INGRESSO`, `OUTRO`), enum no
   banco — prepara o catálogo para filtrar/agrupar quando o Combo-Click do
   PDV migrar para consumir esta tabela (peça 4), e evita uma lista única
   confusa misturando ingresso e cerveja.
3. **Quantidade é um campo simples, sem ledger de movimentação** — editar
   quantidade nesta entrega é só atualizar o número (mesmo padrão simples
   de outros campos de `PerfilFuncionario`). Um histórico auditável de
   movimentações de estoque só faz sentido quando "carga"/"devolução"
   existirem de verdade (peça 3) — construir isso agora seria prematuro.
4. **Desativar em vez de apagar** (`ativo=false`), mesmo padrão de
   `PerfilFuncionario.ativo` — evita quebrar referências futuras (vendas,
   cargas) a um produto removido.
5. **Sem integração com Combo-Click, Centro de Operações ou Carga de
   Pista/Bar nesta entrega** — escopo é só o CRUD do catálogo.
6. **Quantidade como inteiro**, não decimal — os exemplos do domínio são
   todos contáveis (garrafas, unidades, ingressos); litros/kg fracionários
   não aparecem no roadmap documentado. Se necessário no futuro, é uma
   mudança de tipo isolada, não estrutural.

## Modelo de dados

Migration `011_produtos_estoque.sql`:

```sql
create table public.produtos (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria varchar(20) not null check (categoria in ('BEBIDA','COMIDA','INGRESSO','OUTRO')),
  quantidade_estoque integer not null default 0 check (quantidade_estoque >= 0),
  valor_venda numeric(12,2) not null check (valor_venda >= 0),
  valor_custo numeric(12,2) not null check (valor_custo >= 0),
  ativo boolean not null default true,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

alter table public.produtos enable row level security;
-- Sem policies de escrita: acesso só via backend Java (role postgres),
-- mesmo padrão de todas as tabelas financeiras do projeto.
```

Sem unicidade forçada em `nome` — o Admin é o único operando isso, evento
de curta duração (YAGNI).

## Backend

**`CategoriaProduto`** (enum, mesmo padrão de `CargoFuncionario`):
`BEBIDA`, `COMIDA`, `INGRESSO`, `OUTRO`.

**`Produto`** (entidade JPA): `id`, `nome`, `categoria`, `quantidadeEstoque`,
`valorVenda`, `valorCusto`, `ativo`, `criadoEm`, `atualizadoEm`
(`@PreUpdate` atualiza `atualizadoEm`, mesmo padrão de `PerfilFuncionario`).

**`ProdutoRepository`**: `JpaRepository<Produto, UUID>` +
`findByAtivoTrueOrderByNomeAsc()`.

**DTOs:**
- `ProdutoRequest` (record): `nome` (`@NotBlank`), `categoria` (`@NotNull`),
  `quantidadeEstoque` (`@NotNull @Min(0)`), `valorVenda`/`valorCusto`
  (`@NotNull @DecimalMin("0.00") @Digits(integer=10, fraction=2)`, mesmo
  padrão de `limiteAtencao`/`limiteCritico` em `PerfilFuncionarioRequest`).
- `ProdutoResponse` (record): espelha a entidade inteira, com `from(Produto)`.

**`ProdutoService`**: `cadastrar(ProdutoRequest)`, `listarAtivos()`,
`atualizar(UUID, ProdutoRequest)` (substitui tudo, mesmo padrão "PUT
completo" de `atualizarFuncionario`), `desativar(UUID)`.

**`ProdutoController`** (`/api/produtos`), todos
`@PreAuthorize("hasRole('MASTER_ADMIN')")` (regra inegociável nº 6 — o
Operador não participa deste sub-projeto ainda):
- `POST /api/produtos` → cadastrar
- `GET /api/produtos` → listar ativos
- `PUT /api/produtos/{id}` → atualizar
- `PUT /api/produtos/{id}/desativar` → soft-delete

## Frontend

- **Ícone novo `CaixoteIcon`** (SVG próprio, `viewBox="0 0 24 24"`,
  `stroke="currentColor"`, `strokeWidth={1.8}`, mesmo padrão de todo ícone
  em `components/icons.tsx`) — hoje "Estoque" usa `PlacaIcon` genérico
  (item "no curral"); com rota de verdade, merece identidade própria.
- **`Sidebar.tsx`**: "Estoque" sai de `ITENS_NO_CURRAL` e entra em
  `ITENS_OPERACAO` com `rota: "/admin-dashboard/estoque"` e `CaixoteIcon`.
- **`App.tsx`**: rota nova `/admin-dashboard/estoque` dentro do mesmo bloco
  `ProtectedRoute perfisPermitidos={["MASTER_ADMIN"]}` que já existe.
- **`EstoqueAdmin.tsx`** (nova página): tabela de produtos (nome,
  categoria, quantidade, valor venda, valor custo, status ativo/inativo),
  botão "Novo Produto", ação editar/desativar por linha — mesmo padrão
  visual de `HistoricoTurnos.tsx` (tabela) combinado com o fluxo de modal
  de `GerenciamentoEquipe.tsx`.
- **`ProdutoModal.tsx`**: formulário cadastrar/editar — nome (texto),
  categoria (select), quantidade (teclado numérico inteiro, reaproveitando
  `useTecladoNumerico`), valor venda + valor custo (teclado de centavos,
  reaproveitando `useCentavosMultiCampo` como `ValoresHoraModal` já faz
  para 2 campos monetários simultâneos).
- **`useEstoque.ts`** (hook novo): busca lista, expõe `cadastrar`/
  `atualizar`/`desativar`, mesmo formato de `useGerenciamentoEquipe.ts`.
- **`lib/api.ts`**: `ProdutoApi` (espelha `ProdutoResponse`),
  `listarProdutos`, `criarProduto`, `atualizarProduto`, `desativarProduto`.

## Fora de escopo / riscos aceitos

- **Zero integração com Combo-Click do PDV** — o catálogo existe, mas o
  operador continua vendendo pelos botões hardcoded de `OperadorVenda.tsx`
  até a peça 4 (itemização de venda) ser construída.
- **Zero integração com Centro de Operações** — nenhum KPI/painel novo
  reflete estoque nesta entrega.
- **Zero movimentação/carga/devolução** — quantidade é só um campo
  editável, sem ledger, sem associação a operador/posto/turno.
- **`areaTrabalho` continua string livre** — não foi formalizada em
  enum/tabela nesta entrega; se a "Carga de Pista/Bar" (peça 3) precisar
  associar estoque a área de forma fortemente tipada, essa formalização
  entra no escopo daquela spec, não desta.

## Critérios de aceite

- Admin cadastra um produto novo com nome, categoria, quantidade, valor de
  venda e valor de custo.
- Admin edita um produto existente (qualquer campo, incluindo quantidade).
- Admin desativa um produto (some da listagem padrão, mas não é apagado do
  banco).
- Lista de produtos mostra só os ativos, ordenados por nome.
- Apenas MASTER_ADMIN acessa os endpoints (`@PreAuthorize`) e a rota do
  frontend (dentro do `ProtectedRoute` já existente).
- UI segue tema Rodeio Premium: `num-tabular` em quantidade/valores,
  ícone SVG próprio (`CaixoteIcon`), sem spinner genérico
  (`<Carregando>`), touch-first no teclado numérico.
- Dinheiro sempre `BigDecimal`/centavos inteiros (regra inegociável nº 1).
