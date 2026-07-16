# Cadastro de Estoque Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin cadastra, edita e desativa produtos do estoque (nome, categoria, quantidade, valor de venda, valor de custo) — peça 1 de 6 do Módulo 3 do roadmap, sem nenhuma integração com Combo-Click, Carga de Pista/Bar ou Centro de Operações ainda.

**Architecture:** CRUD clássico de uma entidade nova (`Produto`), seguindo exatamente o padrão já usado por `PerfilFuncionario` (entidade simples, service sem versionamento, soft-delete via `ativo`, sem endpoint de agregação). Frontend: página nova + hook + modal de formulário, mesmo padrão de `GerenciamentoEquipe`/`ValoresHoraModal`.

**Tech Stack:** Java 21 / Spring Boot 3 (backend), React 18 + TypeScript + Vite (frontend).

## Global Constraints

- Dinheiro é sempre `BigDecimal` no backend (scale 2, `HALF_EVEN`); no frontend, sempre centavos inteiros (`reaisParaCentavos`/`formatarCentavos`) — regra inegociável nº 1.
- Todos os endpoints usam `@PreAuthorize("hasRole('MASTER_ADMIN')")`, nunca só `authenticated()` — regra inegociável nº 6. O Operador não participa deste sub-projeto.
- Desativação é sempre lógica (`ativo=false`), nunca `DELETE` físico — mesmo padrão de `PerfilFuncionario`.
- **Nenhum ícone novo além de `CaixoteIcon`** — todos os outros elementos reaproveitam ícones/componentes já existentes (`BackspaceIcon`, `PlacaIcon`, `Botao`, `Modal`, `Alerta`, `Carregando`).
- UI Rodeio Premium: `num-tabular` em quantidade/valores, sem spinner genérico, touch-first no teclado numérico.
- Fora de escopo nesta entrega (não implementar): integração com Combo-Click do PDV, Carga de Pista/Bar, Conciliação, Centro de Operações, leitura por foto/IA.
- Toda decisão de arquitetura está detalhada em [docs/superpowers/specs/2026-07-15-cadastro-estoque-design.md](../specs/2026-07-15-cadastro-estoque-design.md) — consulte se algo aqui parecer ambíguo.

---

### Task 1: Backend — entidade `Produto`, migration e CRUD completo

**Files:**
- Create: `backend/db/011_produtos_estoque.sql`
- Create: `backend/src/main/java/com/arena/rodeio/model/CategoriaProduto.java`
- Create: `backend/src/main/java/com/arena/rodeio/model/Produto.java`
- Create: `backend/src/main/java/com/arena/rodeio/repository/ProdutoRepository.java`
- Create: `backend/src/main/java/com/arena/rodeio/dto/ProdutoRequest.java`
- Create: `backend/src/main/java/com/arena/rodeio/dto/ProdutoResponse.java`
- Create: `backend/src/main/java/com/arena/rodeio/service/ProdutoService.java`
- Create: `backend/src/main/java/com/arena/rodeio/controller/ProdutoController.java`

**Interfaces:**
- Consumes: nada de outras tasks.
- Produces: endpoints `POST /api/produtos`, `GET /api/produtos`, `PUT /api/produtos/{id}`, `PUT /api/produtos/{id}/desativar`, todos retornando `ProdutoResponse(id, nome, categoria, quantidadeEstoque, valorVenda, valorCusto, ativo, criadoEm, atualizadoEm)`. Task 2 (frontend) consome exatamente esse shape.

**Nota sobre testes:** esta task não segue TDD — `ProdutoService` é CRUD puro sem lógica computada (nenhum cálculo, nenhuma regra condicional além de "substituir os campos"), o mesmo perfil de `PerfilFuncionarioService`, que também não tem arquivo de teste no projeto. Seguir esse precedente evita um teste que só re-afirmaria getters/setters. A verificação desta task é `mvn compile` + suíte completa continuar verde.

- [ ] **Step 1: Criar a migration**

```sql
-- backend/db/011_produtos_estoque.sql
-- Módulo 3, peça 1/6: cadastro de estoque (catálogo de produtos). Sem
-- ledger de movimentação nesta entrega — quantidade é só um campo editável.
-- Carga de Pista/Bar, itemização de venda e conciliação vêm em specs
-- futuras. Executar DEPOIS de 010.

create table if not exists public.produtos (
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

comment on column public.produtos.quantidade_estoque is
    'Estoque central, ainda não alocado a nenhum posto/turno — "Carga de Pista/Bar" (spec futura) debita daqui';
comment on column public.produtos.valor_venda is
    'Preço de venda ao cliente — usado na futura conciliação dinheiro vs. estoque (regra de negócio nº 3)';
comment on column public.produtos.valor_custo is
    'Custo de aquisição — guardado desde já para uma futura análise de margem, ainda não implementada';
```

- [ ] **Step 2: Criar o enum `CategoriaProduto`**

```java
package com.arena.rodeio.model;

/**
 * Categoria fixa do produto do estoque — prepara o catálogo para o
 * Combo-Click do PDV filtrar/agrupar quando migrar para consumir esta
 * tabela (fora do escopo desta entrega).
 */
public enum CategoriaProduto {
    BEBIDA,
    COMIDA,
    INGRESSO,
    OUTRO
}
```

- [ ] **Step 3: Criar a entidade `Produto`**

```java
package com.arena.rodeio.model;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;

/**
 * Produto do catálogo de estoque (Módulo 3, peça 1/6). Quantidade é o
 * estoque central, ainda não alocado a nenhum posto — sem ledger de
 * movimentação nesta entrega.
 *
 * REGRA INEGOCIÁVEL: valores monetários são sempre BigDecimal / NUMERIC(12,2).
 */
@Entity
@Table(name = "produtos")
public class Produto {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false)
    private String nome;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CategoriaProduto categoria;

    @Column(name = "quantidade_estoque", nullable = false)
    private int quantidadeEstoque;

    @Column(name = "valor_venda", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorVenda;

    @Column(name = "valor_custo", nullable = false, precision = 12, scale = 2)
    private BigDecimal valorCusto;

    @Column(nullable = false)
    private boolean ativo = true;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    @Column(name = "atualizado_em", nullable = false)
    private Instant atualizadoEm;

    protected Produto() {
        // exigido pelo JPA
    }

    public Produto(String nome, CategoriaProduto categoria, int quantidadeEstoque,
                    BigDecimal valorVenda, BigDecimal valorCusto) {
        this.nome = nome;
        this.categoria = categoria;
        this.quantidadeEstoque = quantidadeEstoque;
        this.valorVenda = valorVenda;
        this.valorCusto = valorCusto;
    }

    @PrePersist
    void aoCriar() {
        var agora = Instant.now();
        this.criadoEm = agora;
        this.atualizadoEm = agora;
    }

    @PreUpdate
    void aoAtualizar() {
        this.atualizadoEm = Instant.now();
    }

    public void desativar() {
        this.ativo = false;
    }

    // --- getters / setters ---

    public UUID getId() {
        return id;
    }

    public String getNome() {
        return nome;
    }

    public void setNome(String nome) {
        this.nome = nome;
    }

    public CategoriaProduto getCategoria() {
        return categoria;
    }

    public void setCategoria(CategoriaProduto categoria) {
        this.categoria = categoria;
    }

    public int getQuantidadeEstoque() {
        return quantidadeEstoque;
    }

    public void setQuantidadeEstoque(int quantidadeEstoque) {
        this.quantidadeEstoque = quantidadeEstoque;
    }

    public BigDecimal getValorVenda() {
        return valorVenda;
    }

    public void setValorVenda(BigDecimal valorVenda) {
        this.valorVenda = valorVenda;
    }

    public BigDecimal getValorCusto() {
        return valorCusto;
    }

    public void setValorCusto(BigDecimal valorCusto) {
        this.valorCusto = valorCusto;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }

    public Instant getAtualizadoEm() {
        return atualizadoEm;
    }
}
```

- [ ] **Step 4: Criar `ProdutoRepository`**

```java
package com.arena.rodeio.repository;

import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.Produto;

public interface ProdutoRepository extends JpaRepository<Produto, UUID> {

    List<Produto> findByAtivoTrueOrderByNomeAsc();
}
```

- [ ] **Step 5: Criar os DTOs `ProdutoRequest` e `ProdutoResponse`**

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;

import com.arena.rodeio.model.CategoriaProduto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Payload de cadastro/atualização (PUT substitui o registro inteiro, mesmo padrão de PerfilFuncionarioRequest). */
public record ProdutoRequest(

    @NotBlank(message = "Informe o nome do produto.")
    String nome,

    @NotNull(message = "Informe a categoria.")
    CategoriaProduto categoria,

    @NotNull(message = "Informe a quantidade em estoque.")
    @Min(value = 0, message = "A quantidade não pode ser negativa.")
    Integer quantidadeEstoque,

    @NotNull(message = "Informe o valor de venda.")
    @DecimalMin(value = "0.00", message = "O valor de venda não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorVenda,

    @NotNull(message = "Informe o valor de custo.")
    @DecimalMin(value = "0.00", message = "O valor de custo não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorCusto
) {}
```

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.CategoriaProduto;
import com.arena.rodeio.model.Produto;

public record ProdutoResponse(
    UUID id,
    String nome,
    CategoriaProduto categoria,
    int quantidadeEstoque,
    BigDecimal valorVenda,
    BigDecimal valorCusto,
    boolean ativo,
    Instant criadoEm,
    Instant atualizadoEm
) {

    public static ProdutoResponse from(Produto produto) {
        return new ProdutoResponse(
            produto.getId(),
            produto.getNome(),
            produto.getCategoria(),
            produto.getQuantidadeEstoque(),
            produto.getValorVenda(),
            produto.getValorCusto(),
            produto.isAtivo(),
            produto.getCriadoEm(),
            produto.getAtualizadoEm());
    }
}
```

- [ ] **Step 6: Criar `ProdutoService`**

```java
package com.arena.rodeio.service;

import java.math.RoundingMode;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import com.arena.rodeio.dto.ProdutoRequest;
import com.arena.rodeio.dto.ProdutoResponse;
import com.arena.rodeio.model.Produto;
import com.arena.rodeio.repository.ProdutoRepository;

@Service
public class ProdutoService {

    private final ProdutoRepository repository;

    public ProdutoService(ProdutoRepository repository) {
        this.repository = repository;
    }

    @Transactional
    public ProdutoResponse cadastrar(ProdutoRequest request) {
        var produto = new Produto(
            request.nome().trim(),
            request.categoria(),
            request.quantidadeEstoque(),
            request.valorVenda().setScale(2, RoundingMode.HALF_EVEN),
            request.valorCusto().setScale(2, RoundingMode.HALF_EVEN));

        return ProdutoResponse.from(repository.save(produto));
    }

    @Transactional(readOnly = true)
    public List<ProdutoResponse> listarAtivos() {
        return repository.findByAtivoTrueOrderByNomeAsc().stream()
            .map(ProdutoResponse::from)
            .toList();
    }

    @Transactional
    public ProdutoResponse atualizar(UUID id, ProdutoRequest request) {
        var produto = buscarEntidade(id);

        produto.setNome(request.nome().trim());
        produto.setCategoria(request.categoria());
        produto.setQuantidadeEstoque(request.quantidadeEstoque());
        produto.setValorVenda(request.valorVenda().setScale(2, RoundingMode.HALF_EVEN));
        produto.setValorCusto(request.valorCusto().setScale(2, RoundingMode.HALF_EVEN));

        return ProdutoResponse.from(produto);
    }

    @Transactional
    public ProdutoResponse desativar(UUID id) {
        var produto = buscarEntidade(id);
        produto.desativar();
        return ProdutoResponse.from(produto);
    }

    private Produto buscarEntidade(UUID id) {
        return repository.findById(id)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Produto não encontrado."));
    }
}
```

- [ ] **Step 7: Criar `ProdutoController`**

```java
package com.arena.rodeio.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.ProdutoRequest;
import com.arena.rodeio.dto.ProdutoResponse;
import com.arena.rodeio.service.ProdutoService;

import jakarta.validation.Valid;

/**
 * Módulo 3, peça 1/6: cadastro de estoque. Exclusivo do MASTER_ADMIN
 * (regra inegociável nº 6) — o Operador não participa deste sub-projeto.
 */
@RestController
@RequestMapping("/api/produtos")
public class ProdutoController {

    private final ProdutoService produtoService;

    public ProdutoController(ProdutoService produtoService) {
        this.produtoService = produtoService;
    }

    @PostMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ResponseEntity<ProdutoResponse> cadastrar(@Valid @RequestBody ProdutoRequest request) {
        var produto = produtoService.cadastrar(request);
        return ResponseEntity
            .created(URI.create("/api/produtos/" + produto.id()))
            .body(produto);
    }

    @GetMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<ProdutoResponse> listar() {
        return produtoService.listarAtivos();
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ProdutoResponse atualizar(@PathVariable UUID id, @Valid @RequestBody ProdutoRequest request) {
        return produtoService.atualizar(id, request);
    }

    /** Desativação lógica — nunca apagamos o produto (referências futuras de vendas/cargas). */
    @PutMapping("/{id}/desativar")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ProdutoResponse desativar(@PathVariable UUID id) {
        return produtoService.desativar(id);
    }
}
```

- [ ] **Step 8: Verificar que compila e a suíte inteira continua verde**

Run: `mvn -f backend/pom.xml compile`
Expected: BUILD SUCCESS.

Run: `mvn -f backend/pom.xml test`
Expected: BUILD SUCCESS (mesmos testes de antes, nenhum novo — nada quebrou).

- [ ] **Step 9: Commit**

```bash
git add backend/db/011_produtos_estoque.sql backend/src/main/java/com/arena/rodeio/model/CategoriaProduto.java backend/src/main/java/com/arena/rodeio/model/Produto.java backend/src/main/java/com/arena/rodeio/repository/ProdutoRepository.java backend/src/main/java/com/arena/rodeio/dto/ProdutoRequest.java backend/src/main/java/com/arena/rodeio/dto/ProdutoResponse.java backend/src/main/java/com/arena/rodeio/service/ProdutoService.java backend/src/main/java/com/arena/rodeio/controller/ProdutoController.java
git commit -m "feat(back): CRUD de cadastro de estoque (modulo 3, peca 1 de 6)"
```

---

### Task 2: Frontend — `ProdutoApi` e funções de API

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: `POST/GET/PUT /api/produtos` (Task 1).
- Produces: `CategoriaProduto` (type), `ProdutoApi { id, nome, categoria, quantidadeEstoque, valorVenda, valorCusto, ativo, criadoEm, atualizadoEm }`, `listarProdutos(): Promise<ProdutoApi[]>`, `criarProduto(dados): Promise<ProdutoApi>`, `atualizarProduto(id, dados): Promise<ProdutoApi>`, `desativarProduto(id): Promise<ProdutoApi>`. Task 3 consome tudo isso.

- [ ] **Step 1: Adicionar o type `CategoriaProduto` e a interface `ProdutoApi`**

Adicionar logo depois de `export type FormaPagamento = "DINHEIRO" | "DEBITO" | "CREDITO" | "PIX";` (linha 13):

```ts
export type CategoriaProduto = "BEBIDA" | "COMIDA" | "INGRESSO" | "OUTRO";
```

Adicionar ao final do arquivo (depois da última função, `salvarValoresHora`):

```ts

export interface ProdutoApi {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVenda: number;
  valorCusto: number;
  ativo: boolean;
  criadoEm: string;
  atualizadoEm: string;
}
```

- [ ] **Step 2: Adicionar as 4 funções de API**

Adicionar ao final do arquivo, depois da interface `ProdutoApi`:

```ts

/** Exclusivo do Admin — Cadastro de Estoque (lista só produtos ativos). */
export function listarProdutos(): Promise<ProdutoApi[]> {
  return request<ProdutoApi[]>("/api/produtos", "GET") as Promise<ProdutoApi[]>;
}

/** Exclusivo do Admin. */
export function criarProduto(dados: {
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVendaCentavos: number;
  valorCustoCentavos: number;
}): Promise<ProdutoApi> {
  return request<ProdutoApi>("/api/produtos", "POST", {
    nome: dados.nome,
    categoria: dados.categoria,
    quantidadeEstoque: dados.quantidadeEstoque,
    valorVenda: centavosParaReais(dados.valorVendaCentavos),
    valorCusto: centavosParaReais(dados.valorCustoCentavos),
  }) as Promise<ProdutoApi>;
}

/** Exclusivo do Admin — PUT substitui o registro inteiro. */
export function atualizarProduto(
  id: string,
  dados: {
    nome: string;
    categoria: CategoriaProduto;
    quantidadeEstoque: number;
    valorVendaCentavos: number;
    valorCustoCentavos: number;
  },
): Promise<ProdutoApi> {
  return request<ProdutoApi>(`/api/produtos/${id}`, "PUT", {
    nome: dados.nome,
    categoria: dados.categoria,
    quantidadeEstoque: dados.quantidadeEstoque,
    valorVenda: centavosParaReais(dados.valorVendaCentavos),
    valorCusto: centavosParaReais(dados.valorCustoCentavos),
  }) as Promise<ProdutoApi>;
}

/** Exclusivo do Admin — desativação lógica, nunca apaga o registro. */
export function desativarProduto(id: string): Promise<ProdutoApi> {
  return request<ProdutoApi>(`/api/produtos/${id}/desativar`, "PUT") as Promise<ProdutoApi>;
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros — mudanças puramente aditivas, nada consome ainda.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(front): tipos e funcoes de api para cadastro de estoque"
```

---

### Task 3: Frontend — hook `useEstoque`

**Files:**
- Create: `frontend/src/hooks/useEstoque.ts`

**Interfaces:**
- Consumes: `listarProdutos`, `criarProduto`, `atualizarProduto`, `desativarProduto`, `ApiError`, `CategoriaProduto`, `ProdutoApi` (Task 2), `reaisParaCentavos` (já existente em `lib/moeda`), `tocarErro`/`tocarSucesso` (já existentes em `lib/sons`).
- Produces:
  ```ts
  export interface Produto {
    id: string;
    nome: string;
    categoria: CategoriaProduto;
    quantidadeEstoque: number;
    valorVendaCentavos: number;
    valorCustoCentavos: number;
    ativo: boolean;
  }

  export interface DadosProduto {
    nome: string;
    categoria: CategoriaProduto;
    quantidadeEstoque: number;
    valorVendaCentavos: number;
    valorCustoCentavos: number;
  }

  export function useEstoque(): {
    produtos: Produto[];
    carregando: boolean;
    erro: string | null;
    limparErro: () => void;
    salvandoId: string | null;
    handleCadastrar: (dados: DadosProduto) => Promise<boolean>;
    handleAtualizar: (id: string, dados: DadosProduto) => Promise<boolean>;
    handleDesativar: (id: string) => Promise<boolean>;
  }
  ```
  Tasks 4 e 5 consomem esses tipos.

- [ ] **Step 1: Criar o arquivo**

```ts
import { useCallback, useEffect, useState } from "react";
import {
  atualizarProduto,
  criarProduto,
  desativarProduto,
  listarProdutos,
  ApiError,
  type CategoriaProduto,
  type ProdutoApi,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { tocarErro, tocarSucesso } from "../lib/sons";

export interface Produto {
  id: string;
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVendaCentavos: number;
  valorCustoCentavos: number;
  ativo: boolean;
}

export interface DadosProduto {
  nome: string;
  categoria: CategoriaProduto;
  quantidadeEstoque: number;
  valorVendaCentavos: number;
  valorCustoCentavos: number;
}

function paraProduto(api: ProdutoApi): Produto {
  return {
    id: api.id,
    nome: api.nome,
    categoria: api.categoria,
    quantidadeEstoque: api.quantidadeEstoque,
    valorVendaCentavos: reaisParaCentavos(api.valorVenda),
    valorCustoCentavos: reaisParaCentavos(api.valorCusto),
    ativo: api.ativo,
  };
}

/**
 * Cadastro de Estoque (Admin): CRUD do catálogo de produtos — peça 1 de 6
 * do Módulo 3. Sem integração com Combo-Click, Carga de Pista/Bar ou
 * Centro de Operações nesta entrega.
 */
export function useEstoque() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [salvandoId, setSalvandoId] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const lista = await listarProdutos();
      setProdutos(lista.map(paraProduto));
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o estoque.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const handleCadastrar = useCallback(
    async (dados: DadosProduto): Promise<boolean> => {
      setSalvandoId("novo");
      setErro(null);
      try {
        await criarProduto(dados);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao cadastrar o produto.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  const handleAtualizar = useCallback(
    async (id: string, dados: DadosProduto): Promise<boolean> => {
      setSalvandoId(id);
      setErro(null);
      try {
        await atualizarProduto(id, dados);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao atualizar o produto.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  const handleDesativar = useCallback(
    async (id: string): Promise<boolean> => {
      setSalvandoId(id);
      setErro(null);
      try {
        await desativarProduto(id);
        tocarSucesso();
        await carregar();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao desativar o produto.");
        return false;
      } finally {
        setSalvandoId(null);
      }
    },
    [carregar],
  );

  return {
    produtos,
    carregando,
    erro,
    limparErro: () => setErro(null),
    salvandoId,
    handleCadastrar,
    handleAtualizar,
    handleDesativar,
  };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useEstoque.ts
git commit -m "feat(front): hook useEstoque (cadastro de estoque)"
```

---

### Task 4: Frontend — `ProdutoModal`

**Files:**
- Create: `frontend/src/components/estoque/ProdutoModal.tsx`

**Interfaces:**
- Consumes: `Modal`, `Botao`, `BackspaceIcon` (já existentes), `formatarCentavos` (já existente em `lib/moeda`), `useCentavosMultiCampo`, `useTecladoNumerico` (já existentes), `CategoriaProduto` (Task 2), `Produto`/`DadosProduto` (Task 3).
- Produces: `ProdutoModal({ produto: Produto | null, salvando: boolean, onConfirmar: (dados: DadosProduto) => void, onCancelar: () => void })`. Task 5 consome este componente.

**Cuidado de implementação (evitar bug de estado obsoleto):** este modal tem 3 campos que compartilham um teclado (quantidade, valor venda, valor custo), mas `useCentavosMultiCampo` só conhece 2 deles (venda/custo) — quantidade é um inteiro simples controlado localmente. A seleção de campo (`campoAtivo` local) e a seleção interna do hook (`campos.campoAtivo`) **precisam ser sincronizadas no clique do seletor de campo**, nunca dentro de `digitar`/`apagar` — sincronizar ali criaria uma condição de corrida (o `setCampoAtivo` do hook é assíncrono; chamá-lo e imediatamente usar `campos.digitar` na mesma função leria o valor antigo). Siga exatamente a função `selecionarCampo` do Step 1.

- [ ] **Step 1: Criar o arquivo**

```tsx
import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Botao from "../ui/Botao";
import { BackspaceIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";
import { useCentavosMultiCampo } from "../../hooks/useCentavosMultiCampo";
import { useTecladoNumerico } from "../../hooks/useTecladoNumerico";
import type { CategoriaProduto } from "../../lib/api";
import type { DadosProduto, Produto } from "../../hooks/useEstoque";

const CAMPO_VENDA = "venda";
const CAMPO_CUSTO = "custo";
const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

const CATEGORIAS: Array<{ valor: CategoriaProduto; rotulo: string }> = [
  { valor: "BEBIDA", rotulo: "Bebida" },
  { valor: "COMIDA", rotulo: "Comida" },
  { valor: "INGRESSO", rotulo: "Ingresso" },
  { valor: "OUTRO", rotulo: "Outro" },
];

type CampoAtivo = "quantidade" | typeof CAMPO_VENDA | typeof CAMPO_CUSTO;

/**
 * Cadastro/edição de produto do estoque — nome, categoria, quantidade
 * (inteiro, controlado localmente) e valor de venda/custo (teclado de
 * centavos compartilhado, mesmo padrão de ValoresHoraModal).
 */
export default function ProdutoModal({
  produto,
  salvando,
  onConfirmar,
  onCancelar,
}: {
  produto: Produto | null;
  salvando: boolean;
  onConfirmar: (dados: DadosProduto) => void;
  onCancelar: () => void;
}) {
  const [nome, setNome] = useState(produto?.nome ?? "");
  const [categoria, setCategoria] = useState<CategoriaProduto>(produto?.categoria ?? "BEBIDA");
  const [quantidade, setQuantidade] = useState(produto?.quantidadeEstoque ?? 0);
  const [campoAtivo, setCampoAtivo] = useState<CampoAtivo>("quantidade");
  const campos = useCentavosMultiCampo([CAMPO_VENDA, CAMPO_CUSTO]);

  useEffect(() => {
    if (!produto) return;
    campos.definirValor(CAMPO_VENDA, produto.valorVendaCentavos);
    campos.definirValor(CAMPO_CUSTO, produto.valorCustoCentavos);
    // Só reidrata quando o produto (edição) muda — não a cada re-render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produto]);

  /** Sincroniza os dois estados de campo ativo NO CLIQUE — nunca dentro de digitar/apagar (ver nota da task). */
  function selecionarCampo(campo: CampoAtivo) {
    setCampoAtivo(campo);
    if (campo !== "quantidade") campos.setCampoAtivo(campo);
  }

  function digitar(tecla: string) {
    if (campoAtivo === "quantidade") {
      setQuantidade((atual) => {
        const proximo = atual * 10 + Number(tecla);
        return proximo > 999_999 ? atual : proximo;
      });
    } else {
      campos.digitar(tecla);
    }
  }

  function apagar() {
    if (campoAtivo === "quantidade") {
      setQuantidade((atual) => Math.floor(atual / 10));
    } else {
      campos.apagar();
    }
  }

  useTecladoNumerico(digitar, apagar);

  const nomeValido = nome.trim().length > 0;
  const podeConfirmar = nomeValido && !salvando;

  function confirmar() {
    if (!podeConfirmar) return;
    onConfirmar({
      nome: nome.trim(),
      categoria,
      quantidadeEstoque: quantidade,
      valorVendaCentavos: campos.valores[CAMPO_VENDA],
      valorCustoCentavos: campos.valores[CAMPO_CUSTO],
    });
  }

  return (
    <Modal titulo={produto ? "Editar produto" : "Novo produto"} onFechar={onCancelar}>
      <div className="mt-4">
        <label htmlFor="produto-nome" className="mb-1.5 block text-[13px] font-medium text-leather-200">
          Nome
        </label>
        <input
          id="produto-nome"
          type="text"
          value={nome}
          onChange={(evento) => setNome(evento.target.value)}
          placeholder="Ex.: Cerveja lata, Espetinho, Ingresso Rodeio..."
          className="w-full rounded-lg border border-leather-500/50 bg-wood-900 p-3 text-[15px] text-leather-200 outline-none transition-colors duration-200 placeholder:text-leather-400/60 focus:border-gold-400 focus:ring-4 focus:ring-gold-400/20"
        />
      </div>

      <div className="mt-4">
        <p className="mb-1.5 text-[13px] font-medium text-leather-200">Categoria</p>
        <div className="grid grid-cols-2 gap-2">
          {CATEGORIAS.map((item) => (
            <button
              key={item.valor}
              type="button"
              onClick={() => setCategoria(item.valor)}
              className={`min-h-11 touch-manipulation rounded-lg border-2 text-sm font-semibold transition-colors duration-150 ease-couro ${
                categoria === item.valor
                  ? "border-gold-500 bg-arena-800 text-gold-300"
                  : "border-leather-600/40 text-leather-300 hover:border-gold-500/60"
              }`}
            >
              {item.rotulo}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3">
        <button
          type="button"
          onClick={() => selecionarCampo("quantidade")}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === "quantidade" ? "border-gold-500 bg-arena-800" : "border-leather-600/40 bg-arena-900"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">Quantidade</p>
          <p className="num-tabular mt-1 text-xl font-bold text-leather-200">{quantidade}</p>
        </button>
        <button
          type="button"
          onClick={() => selecionarCampo(CAMPO_VENDA)}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === CAMPO_VENDA ? "border-gold-500 bg-arena-800" : "border-leather-600/40 bg-arena-900"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">Valor venda</p>
          <p className="num-tabular mt-1 text-lg font-bold text-leather-200">
            {formatarCentavos(campos.valores[CAMPO_VENDA])}
          </p>
        </button>
        <button
          type="button"
          onClick={() => selecionarCampo(CAMPO_CUSTO)}
          className={`rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
            campoAtivo === CAMPO_CUSTO ? "border-gold-500 bg-arena-800" : "border-leather-600/40 bg-arena-900"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">Valor custo</p>
          <p className="num-tabular mt-1 text-lg font-bold text-leather-200">
            {formatarCentavos(campos.valores[CAMPO_CUSTO])}
          </p>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {DIGITOS.map((digito) => (
          <button
            key={digito}
            type="button"
            onClick={() => digitar(digito)}
            className="num-tabular min-h-12 touch-manipulation rounded-lg border border-leather-600/50 bg-wood-900 text-xl font-bold text-leather-200 transition-colors duration-150 ease-couro hover:border-gold-500 active:scale-95"
          >
            {digito}
          </button>
        ))}
        <button
          type="button"
          onClick={apagar}
          aria-label="Apagar último dígito"
          className="flex min-h-12 touch-manipulation items-center justify-center rounded-lg border border-leather-600/50 bg-wood-900 text-leather-400 transition-colors duration-150 ease-couro hover:border-gold-500 hover:text-leather-200 active:scale-95"
        >
          <BackspaceIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={() => (campoAtivo === "quantidade" ? setQuantidade(0) : campos.zerar())}
          className="min-h-12 touch-manipulation rounded-lg border border-rust-500/40 bg-wood-900 text-sm font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
        >
          Zerar
        </button>
      </div>
      <p className="mt-2 text-xs text-leather-400/70">
        Toque em Quantidade, Valor venda ou Valor custo para digitar nele. Também aceita o teclado do computador.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <Botao variante="couro" tamanho="lg" onClick={onCancelar}>
          Cancelar
        </Botao>
        <Botao
          variante="latao"
          tamanho="lg"
          disabled={!podeConfirmar}
          carregando={salvando}
          rotuloCarregando="Salvando..."
          onClick={confirmar}
        >
          Salvar
        </Botao>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/components/estoque/ProdutoModal.tsx
git commit -m "feat(front): componente ProdutoModal (cadastro/edicao de estoque)"
```

---

### Task 5: Frontend — página `EstoqueAdmin`

**Files:**
- Create: `frontend/src/pages/EstoqueAdmin.tsx`

**Interfaces:**
- Consumes: `useEstoque`, `Produto`, `DadosProduto` (Task 3), `ProdutoModal` (Task 4), `Alerta`, `Carregando`, `Botao` (já existentes), `formatarCentavos` (já existente), `CaixoteIcon`/`PlacaIcon` (Task 6 cria `CaixoteIcon` — ver nota abaixo).
- Produces: `EstoqueAdmin` (componente default export). Task 6 importa esta página em `App.tsx`.

**Nota de ordem:** esta task usa `CaixoteIcon`, que só é criado na Task 6. Como o ícone é só um SVG sem dependência de nada desta página, **inclua a criação do `CaixoteIcon` como Step 1 desta task também** (o mesmo código exato que a Task 6 usa) — isso evita quebrar o build entre as tasks 5 e 6. A Task 6 vai encontrar o ícone já criado e pular esse passo.

- [ ] **Step 1: Adicionar o ícone `CaixoteIcon` a `frontend/src/components/icons.tsx`**

Adicionar ao final do arquivo:

```tsx

/** Caixote de madeira — Estoque (cadastro de produtos, Módulo 3). */
export function CaixoteIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <path
        d="M3.5 8.5 12 4l8.5 4.5-8.5 4.5-8.5-4.5Z"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path
        d="M3.5 8.5V16l8.5 4.5V13M20.5 8.5V16L12 20.5"
        stroke="currentColor"
        strokeWidth={1.8}
        strokeLinejoin="round"
      />
      <path d="M3.5 8.5 12 13l8.5-4.5" stroke="currentColor" strokeWidth={1.8} strokeLinejoin="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Criar `EstoqueAdmin.tsx`**

```tsx
import { useState } from "react";
import Alerta from "../components/ui/Alerta";
import { Carregando } from "../components/ui/interacoes";
import Botao from "../components/ui/Botao";
import ProdutoModal from "../components/estoque/ProdutoModal";
import { useEstoque, type Produto, type DadosProduto } from "../hooks/useEstoque";
import { formatarCentavos } from "../lib/moeda";
import { CaixoteIcon, PlacaIcon } from "../components/icons";

const ROTULO_CATEGORIA: Record<Produto["categoria"], string> = {
  BEBIDA: "Bebida",
  COMIDA: "Comida",
  INGRESSO: "Ingresso",
  OUTRO: "Outro",
};

/**
 * Cadastro de Estoque (Admin): catálogo de produtos — peça 1 de 6 do
 * Módulo 3. Sem integração com Combo-Click, Carga de Pista/Bar ou Centro
 * de Operações nesta entrega.
 */
export default function EstoqueAdmin() {
  const { produtos, carregando, erro, limparErro, salvandoId, handleCadastrar, handleAtualizar, handleDesativar } =
    useEstoque();
  const [modalAberto, setModalAberto] = useState(false);
  const [produtoEditando, setProdutoEditando] = useState<Produto | null>(null);

  function abrirNovo() {
    setProdutoEditando(null);
    setModalAberto(true);
  }

  function abrirEdicao(produto: Produto) {
    setProdutoEditando(produto);
    setModalAberto(true);
  }

  async function confirmar(dados: DadosProduto) {
    const sucesso = produtoEditando
      ? await handleAtualizar(produtoEditando.id, dados)
      : await handleCadastrar(dados);
    if (sucesso) setModalAberto(false);
  }

  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <h1 className="flex items-center gap-3 font-display text-2xl text-gold-300 md:text-3xl">
          <CaixoteIcon className="h-6 w-6 text-gold-400" />
          Estoque
        </h1>
        <Botao variante="couro" tamanho="sm" onClick={abrirNovo}>
          Novo Produto
        </Botao>
      </div>
      <p className="mt-1 text-[15px] text-leather-300">
        Cadastro do catálogo de produtos — nome, categoria, quantidade e valores.
      </p>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {carregando ? (
        <Carregando rotulo="Carregando estoque..." />
      ) : produtos.length === 0 ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
          <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
          Nenhum produto cadastrado ainda.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-leather-600/40 bg-wood-900 shadow-arena">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-leather-600/40 text-xs uppercase tracking-wide text-steel-400">
                <th className="px-4 py-3 font-semibold">Produto</th>
                <th className="px-4 py-3 font-semibold">Categoria</th>
                <th className="px-4 py-3 font-semibold">Quantidade</th>
                <th className="px-4 py-3 font-semibold">Valor venda</th>
                <th className="px-4 py-3 font-semibold">Valor custo</th>
                <th className="px-4 py-3 text-right font-semibold">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-leather-600/20">
              {produtos.map((produto) => (
                <tr key={produto.id}>
                  <td className="px-4 py-3 font-semibold text-leather-200">{produto.nome}</td>
                  <td className="px-4 py-3 text-leather-300">{ROTULO_CATEGORIA[produto.categoria]}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{produto.quantidadeEstoque}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {formatarCentavos(produto.valorVendaCentavos)}
                  </td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {formatarCentavos(produto.valorCustoCentavos)}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Botao variante="couro" tamanho="sm" onClick={() => abrirEdicao(produto)}>
                        Editar
                      </Botao>
                      <Botao
                        variante="lampiao"
                        tamanho="sm"
                        carregando={salvandoId === produto.id}
                        rotuloCarregando="..."
                        onClick={() => handleDesativar(produto.id)}
                      >
                        Desativar
                      </Botao>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalAberto && (
        <ProdutoModal
          produto={produtoEditando}
          salvando={salvandoId === (produtoEditando?.id ?? "novo")}
          onConfirmar={confirmar}
          onCancelar={() => setModalAberto(false)}
        />
      )}
    </>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/icons.tsx frontend/src/pages/EstoqueAdmin.tsx
git commit -m "feat(front): pagina EstoqueAdmin (cadastro de estoque)"
```

---

### Task 6: Frontend — ligar `EstoqueAdmin` na rota e na Sidebar

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/navigation/Sidebar.tsx`

**Interfaces:**
- Consumes: `EstoqueAdmin` (Task 5), `CaixoteIcon` (já criado na Task 5 — não recriar).
- Produces: nada consumido por outras tasks (task final).

- [ ] **Step 1: Adicionar a rota em `App.tsx`**

Adicionar o import (junto aos outros `import Admin...`/`import Historico...`):

```ts
import EstoqueAdmin from "./pages/EstoqueAdmin";
```

Adicionar a rota dentro do bloco `<Route element={<ProtectedRoute perfisPermitidos={["MASTER_ADMIN"]}>...` (depois da linha `<Route path="/admin-dashboard/historico-turnos" element={<HistoricoTurnos />} />`):

```tsx
            <Route path="/admin-dashboard/estoque" element={<EstoqueAdmin />} />
```

Atualizar o comentário de rotas no topo do arquivo, adicionando a linha:
```
 * - "/admin-dashboard/estoque"       → Cadastro de Estoque (catálogo de produtos)
```

- [ ] **Step 2: Adicionar o item na Sidebar**

Em `frontend/src/components/navigation/Sidebar.tsx`, importar `CaixoteIcon`:

```ts
import {
  BrasaoIcon,
  CaixoteIcon,
  DistintivoIcon,
  HorseshoeIcon,
  LivroCaixaIcon,
  PlacaIcon,
  RelogioIcon,
  SetaEsquerdaIcon,
} from "../icons";
```

Adicionar o item em `ITENS_OPERACAO` (depois de "Histórico de Turnos"):

```ts
  { rotulo: "Estoque", icone: CaixoteIcon, rota: "/admin-dashboard/estoque" },
```

Remover a entrada `{ rotulo: "Estoque", icone: PlacaIcon }` de `ITENS_NO_CURRAL` (o módulo deixou de ser "no curral").

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Verificação manual no navegador**

Run: `cd frontend && npm run dev`

Logado como MASTER_ADMIN, navegar até `/admin-dashboard/estoque` pela Sidebar, cadastrar um produto (nome, categoria, quantidade, valor venda, valor custo), confirmar que aparece na tabela, editar o mesmo produto, confirmar que os valores foram atualizados, desativar e confirmar que some da lista.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/App.tsx frontend/src/components/navigation/Sidebar.tsx
git commit -m "feat(front): liga Estoque na rota e na Sidebar do Admin"
```
