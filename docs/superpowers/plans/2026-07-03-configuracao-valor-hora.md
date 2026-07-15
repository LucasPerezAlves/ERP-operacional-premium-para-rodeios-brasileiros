# Configuração de Valor/Hora Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que o MASTER_ADMIN configure, na tela Gerenciamento de Equipe, um valor/hora padrão (global) e valores/hora específicos por área de trabalho (opcional, override seletivo), com vigência versionada e histórico auditável.

**Architecture:** Nova tabela `configuracoes_valor_hora` (versionada por vigência, nunca sobrescrita) por trás de um único endpoint de leitura de estado atual, um de histórico e um PUT que recebe o payload inteiro e versiona só o que mudou. Front-end: um modal auto-contido (`ValoresHoraModal`) que busca seus próprios dados, com teclado numérico compartilhado entre o campo global e até 7 campos de área.

**Tech Stack:** Java 21 / Spring Boot 3 / Spring Data JPA / PostgreSQL (Supabase) no back-end; React 18 + TypeScript + Vite + Tailwind no front-end.

## Global Constraints

- Dinheiro é sempre `java.math.BigDecimal` (scale 2, `RoundingMode.HALF_EVEN`); no banco, `NUMERIC(12,2)`. Nunca `double`/`float`. (CLAUDE.md, regra inegociável nº 1)
- Textos de UI e mensagens de erro em pt-BR. (regra inegociável nº 3)
- Endpoints sensíveis (config financeira) exigem `@PreAuthorize("hasRole('MASTER_ADMIN')")` — nunca só `authenticated()`. (regra inegociável nº 6)
- UI segue o tema Rodeio Premium: sem glassmorphism, sem `rounded-2xl`, sem spinner genérico — reusar `Botao` (com `LassoSpinner` embutido) e `Carregando`. (CLAUDE.md, DESIGN-SYSTEM.md)
- Migrations em `backend/db/*.sql` são aplicadas manualmente no SQL Editor do Supabase — não há Flyway/Liquibase no projeto. Não executar migrations automaticamente contra o projeto Supabase real sem confirmação do usuário.
- Front-end não tem test runner configurado (`package.json` só tem `dev`/`build`/`preview`) — a verificação de cada tarefa de front-end é `npm run build` (checagem de tipos via `tsc -b`) mais revisão manual; não introduzir Vitest/Jest nesta entrega (fora de escopo).
- Back-end tem `spring-boot-starter-test` (JUnit 5 + Mockito + AssertJ) mas **zero arquivos de teste existentes hoje** — este plano introduz o primeiro, escopado à lógica de negócio nova (`ValorHoraService`), sem adicionar infraestrutura de teste (H2, Testcontainers, MockMvc) que o projeto ainda não usa.

---

## Task 1: Migration da tabela `configuracoes_valor_hora`

**Files:**
- Create: `backend/db/009_configuracoes_valor_hora.sql`

**Interfaces:**
- Produces: tabela `public.configuracoes_valor_hora` com colunas `id, escopo, area_trabalho, valor_hora, vigencia_inicio, vigencia_fim, ativo, criado_por_admin_id, criado_em`, usada por `ConfiguracaoValorHora` (Task 2).

- [ ] **Step 1: Criar o arquivo de migration**

```sql
-- Configuração de valor/hora dos funcionários: um valor GLOBAL (padrão) e
-- overrides opcionais por ÁREA de trabalho. Cada alteração cria uma nova
-- versão (vigencia_inicio/vigencia_fim) em vez de sobrescrever — histórico
-- auditável (quem/quando) e pronto para folha de pagamento por período.
-- Executar DEPOIS de 008_niveis_alerta_numerario.sql.

create table if not exists public.configuracoes_valor_hora (
    id                    uuid primary key default gen_random_uuid(),
    escopo                varchar(10) not null check (escopo in ('GLOBAL', 'AREA')),
    area_trabalho         varchar(60),
    valor_hora            numeric(12,2) not null check (valor_hora >= 0),
    vigencia_inicio       timestamptz not null default now(),
    vigencia_fim          timestamptz,
    ativo                 boolean not null default true,
    criado_por_admin_id   uuid not null references public.perfis_funcionarios (id),
    criado_em             timestamptz not null default now(),
    constraint ck_valor_hora_area_conforme_escopo check (
        (escopo = 'GLOBAL' and area_trabalho is null) or
        (escopo = 'AREA' and area_trabalho is not null)
    )
);

-- No máximo 1 valor GLOBAL ativo, e no máximo 1 valor ativo por ÁREA — o
-- histórico completo fica preservado nos registros com ativo=false.
create unique index if not exists ux_valor_hora_global_ativo
    on public.configuracoes_valor_hora (escopo)
    where escopo = 'GLOBAL' and ativo;

create unique index if not exists ux_valor_hora_area_ativo
    on public.configuracoes_valor_hora (area_trabalho)
    where escopo = 'AREA' and ativo;

create index if not exists ix_valor_hora_vigencia
    on public.configuracoes_valor_hora (vigencia_inicio desc);

comment on table public.configuracoes_valor_hora is
    'Valor/hora pago aos funcionários: um valor GLOBAL (padrão) e overrides opcionais por AREA. Cada alteração versiona um novo registro em vez de sobrescrever — auditoria e efetivação por período.';

-- RLS: acesso exclusivo do back-end Java (role postgres), mesmo padrão de
-- 004_caixas_vendas_sangrias.sql — bloqueia acesso direto via anon key do front.
alter table public.configuracoes_valor_hora enable row level security;
```

- [ ] **Step 2: Avisar o usuário**

Este arquivo só é criado no repositório — a aplicação real no Supabase (SQL Editor) é manual e deve ser feita pelo usuário antes de testar os endpoints (Task 4) contra o banco real. Sinalizar isso claramente ao final da tarefa, sem executar a migration automaticamente.

- [ ] **Step 3: Commit**

```bash
git add backend/db/009_configuracoes_valor_hora.sql
git commit -m "feat(back): migration da tabela configuracoes_valor_hora"
```

---

## Task 2: Domínio back-end — enum, entidade e repositório

**Files:**
- Create: `backend/src/main/java/com/arena/rodeio/model/EscopoValorHora.java`
- Create: `backend/src/main/java/com/arena/rodeio/model/ConfiguracaoValorHora.java`
- Create: `backend/src/main/java/com/arena/rodeio/repository/ConfiguracaoValorHoraRepository.java`

**Interfaces:**
- Consumes: nada (camada de domínio nova, isolada)
- Produces: `EscopoValorHora` (enum `GLOBAL`/`AREA`), `ConfiguracaoValorHora` (entity com construtor `(EscopoValorHora escopo, String areaTrabalho, BigDecimal valorHora, UUID criadoPorAdminId)`, método `encerrar()`, getters `getId()/getEscopo()/getAreaTrabalho()/getValorHora()/getVigenciaInicio()/getVigenciaFim()/isAtivo()/getCriadoPorAdminId()/getCriadoEm()`), `ConfiguracaoValorHoraRepository` com `findByEscopoAndAtivoTrue(EscopoValorHora)`, `findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora, String)`, `findAllByOrderByVigenciaInicioDesc()` — usados pelo `ValorHoraService` (Task 4).

- [ ] **Step 1: Criar o enum `EscopoValorHora`**

```java
package com.arena.rodeio.model;

/** Escopo de uma configuração de valor/hora: todo o evento (GLOBAL) ou uma área específica (AREA). */
public enum EscopoValorHora {
    GLOBAL,
    AREA
}
```

- [ ] **Step 2: Criar a entidade `ConfiguracaoValorHora`**

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
import jakarta.persistence.Table;

/**
 * Valor/hora pago aos funcionários: um valor GLOBAL (padrão) e overrides
 * opcionais por AREA. Cada alteração cria uma nova versão (vigência) em vez
 * de sobrescrever a anterior — histórico auditável (quem/quando alterou).
 */
@Entity
@Table(name = "configuracoes_valor_hora")
public class ConfiguracaoValorHora {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 10, updatable = false)
    private EscopoValorHora escopo;

    /** Só preenchido quando escopo == AREA. */
    @Column(name = "area_trabalho", length = 60, updatable = false)
    private String areaTrabalho;

    @Column(name = "valor_hora", nullable = false, precision = 12, scale = 2, updatable = false)
    private BigDecimal valorHora;

    @Column(name = "vigencia_inicio", nullable = false, updatable = false)
    private Instant vigenciaInicio;

    @Column(name = "vigencia_fim")
    private Instant vigenciaFim;

    @Column(nullable = false)
    private boolean ativo = true;

    /** MASTER_ADMIN que fez esta alteração ("sub" do JWT). */
    @Column(name = "criado_por_admin_id", nullable = false, updatable = false)
    private UUID criadoPorAdminId;

    @Column(name = "criado_em", nullable = false, updatable = false)
    private Instant criadoEm;

    protected ConfiguracaoValorHora() {
        // exigido pelo JPA
    }

    public ConfiguracaoValorHora(EscopoValorHora escopo, String areaTrabalho, BigDecimal valorHora, UUID criadoPorAdminId) {
        this.escopo = escopo;
        this.areaTrabalho = areaTrabalho;
        this.valorHora = valorHora;
        this.criadoPorAdminId = criadoPorAdminId;
    }

    @PrePersist
    void aoCriar() {
        var agora = Instant.now();
        this.criadoEm = agora;
        this.vigenciaInicio = agora;
    }

    /** Fecha a vigência deste registro — substituído por uma nova versão ou simplesmente removido. */
    public void encerrar() {
        this.ativo = false;
        this.vigenciaFim = Instant.now();
    }

    // --- getters ---

    public UUID getId() {
        return id;
    }

    public EscopoValorHora getEscopo() {
        return escopo;
    }

    public String getAreaTrabalho() {
        return areaTrabalho;
    }

    public BigDecimal getValorHora() {
        return valorHora;
    }

    public Instant getVigenciaInicio() {
        return vigenciaInicio;
    }

    public Instant getVigenciaFim() {
        return vigenciaFim;
    }

    public boolean isAtivo() {
        return ativo;
    }

    public UUID getCriadoPorAdminId() {
        return criadoPorAdminId;
    }

    public Instant getCriadoEm() {
        return criadoEm;
    }
}
```

- [ ] **Step 3: Criar o repositório**

```java
package com.arena.rodeio.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;

public interface ConfiguracaoValorHoraRepository extends JpaRepository<ConfiguracaoValorHora, UUID> {

    /** GLOBAL: 0 ou 1 elemento. AREA: 0 a N (um por área com override ativo). */
    List<ConfiguracaoValorHora> findByEscopoAndAtivoTrue(EscopoValorHora escopo);

    Optional<ConfiguracaoValorHora> findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora escopo, String areaTrabalho);

    /** Histórico completo (ativos e encerrados), mais recente primeiro. */
    List<ConfiguracaoValorHora> findAllByOrderByVigenciaInicioDesc();
}
```

- [ ] **Step 4: Compilar para validar**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`, sem erros de compilação.

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/arena/rodeio/model/EscopoValorHora.java backend/src/main/java/com/arena/rodeio/model/ConfiguracaoValorHora.java backend/src/main/java/com/arena/rodeio/repository/ConfiguracaoValorHoraRepository.java
git commit -m "feat(back): entidade e repositorio de configuracoes_valor_hora"
```

---

## Task 3: DTOs de request/response

**Files:**
- Create: `backend/src/main/java/com/arena/rodeio/dto/OverrideAreaValorHora.java`
- Create: `backend/src/main/java/com/arena/rodeio/dto/SalvarValorHoraRequest.java`
- Create: `backend/src/main/java/com/arena/rodeio/dto/ValorVigenteResponse.java`
- Create: `backend/src/main/java/com/arena/rodeio/dto/ValorHoraAtualResponse.java`
- Create: `backend/src/main/java/com/arena/rodeio/dto/HistoricoValorHoraResponse.java`

**Interfaces:**
- Consumes: `ConfiguracaoValorHora`, `EscopoValorHora` (Task 2)
- Produces: `SalvarValorHoraRequest(BigDecimal valorHoraGlobal, List<OverrideAreaValorHora> overrides)`, `OverrideAreaValorHora(String area, BigDecimal valorHora)`, `ValorVigenteResponse.from(ConfiguracaoValorHora, String nomeAdmin)`, `ValorHoraAtualResponse(ValorVigenteResponse global, List<ValorVigenteResponse> overridesPorArea)`, `HistoricoValorHoraResponse.from(ConfiguracaoValorHora, String nomeAdmin)` — usados por `ValorHoraService`/`ValorHoraController` (Tasks 4-5).

- [ ] **Step 1: `OverrideAreaValorHora`**

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/** Um item da lista de overrides por área do payload de salvar valores/hora. */
public record OverrideAreaValorHora(

    @NotBlank(message = "Informe a área de trabalho.")
    String area,

    @NotNull(message = "Informe o valor/hora da área.")
    @DecimalMin(value = "0.00", message = "O valor/hora não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorHora
) {}
```

- [ ] **Step 2: `SalvarValorHoraRequest`**

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Digits;
import jakarta.validation.constraints.NotNull;

/**
 * Payload único de salvamento: substitui o estado inteiro (valor global +
 * lista de overrides por área). O service faz o diff contra o estado ativo
 * atual e só versiona o que realmente mudou; uma área ausente da lista é
 * removida (volta a herdar o valor global).
 */
public record SalvarValorHoraRequest(

    @NotNull(message = "Informe o valor/hora padrão.")
    @DecimalMin(value = "0.00", message = "O valor/hora não pode ser negativo.")
    @Digits(integer = 10, fraction = 2, message = "Use no máximo 2 casas decimais.")
    BigDecimal valorHoraGlobal,

    @NotNull(message = "Informe a lista de overrides por área (pode ser vazia).")
    List<@Valid OverrideAreaValorHora> overrides
) {}
```

- [ ] **Step 3: `ValorVigenteResponse`**

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.ConfiguracaoValorHora;

/** Um valor/hora vigente agora — global (areaTrabalho == null) ou de uma área específica. */
public record ValorVigenteResponse(
    String areaTrabalho,
    BigDecimal valorHora,
    Instant vigenciaInicio,
    UUID alteradoPorAdminId,
    String alteradoPorNome
) {

    public static ValorVigenteResponse from(ConfiguracaoValorHora config, String nomeAdmin) {
        return new ValorVigenteResponse(
            config.getAreaTrabalho(),
            config.getValorHora(),
            config.getVigenciaInicio(),
            config.getCriadoPorAdminId(),
            nomeAdmin);
    }
}
```

- [ ] **Step 4: `ValorHoraAtualResponse`**

```java
package com.arena.rodeio.dto;

import java.util.List;

/** Estado efetivo atual: valor global (null se nunca configurado) + overrides ativos por área. */
public record ValorHoraAtualResponse(
    ValorVigenteResponse global,
    List<ValorVigenteResponse> overridesPorArea
) {}
```

- [ ] **Step 5: `HistoricoValorHoraResponse`**

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;

/** Um registro do histórico completo (ativo ou encerrado) — alimenta a aba Histórico do modal. */
public record HistoricoValorHoraResponse(
    UUID id,
    EscopoValorHora escopo,
    String areaTrabalho,
    BigDecimal valorHora,
    Instant vigenciaInicio,
    Instant vigenciaFim,
    boolean ativo,
    UUID alteradoPorAdminId,
    String alteradoPorNome
) {

    public static HistoricoValorHoraResponse from(ConfiguracaoValorHora config, String nomeAdmin) {
        return new HistoricoValorHoraResponse(
            config.getId(),
            config.getEscopo(),
            config.getAreaTrabalho(),
            config.getValorHora(),
            config.getVigenciaInicio(),
            config.getVigenciaFim(),
            config.isAtivo(),
            config.getCriadoPorAdminId(),
            nomeAdmin);
    }
}
```

- [ ] **Step 6: Compilar para validar**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`.

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/arena/rodeio/dto/OverrideAreaValorHora.java backend/src/main/java/com/arena/rodeio/dto/SalvarValorHoraRequest.java backend/src/main/java/com/arena/rodeio/dto/ValorVigenteResponse.java backend/src/main/java/com/arena/rodeio/dto/ValorHoraAtualResponse.java backend/src/main/java/com/arena/rodeio/dto/HistoricoValorHoraResponse.java
git commit -m "feat(back): DTOs de configuracao de valor/hora"
```

---

## Task 4: `ValorHoraService` com testes (TDD)

**Files:**
- Create: `backend/src/main/java/com/arena/rodeio/service/ValorHoraService.java`
- Test: `backend/src/test/java/com/arena/rodeio/service/ValorHoraServiceTest.java`

**Interfaces:**
- Consumes: `ConfiguracaoValorHoraRepository`, `PerfilFuncionarioRepository` (já existe), DTOs da Task 3, `ConfiguracaoValorHora`/`EscopoValorHora` (Task 2)
- Produces: `ValorHoraService` com `ValorHoraAtualResponse buscarAtual()`, `List<HistoricoValorHoraResponse> buscarHistorico()`, `ValorHoraAtualResponse salvar(UUID adminId, SalvarValorHoraRequest request)` — usados por `ValorHoraController` (Task 5).

- [ ] **Step 1: Escrever o teste (falhando) — cria o primeiro valor global**

```java
package com.arena.rodeio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.arena.rodeio.dto.OverrideAreaValorHora;
import com.arena.rodeio.dto.SalvarValorHoraRequest;
import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.repository.ConfiguracaoValorHoraRepository;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;

@ExtendWith(MockitoExtension.class)
class ValorHoraServiceTest {

    @Mock
    private ConfiguracaoValorHoraRepository repository;

    @Mock
    private PerfilFuncionarioRepository perfilFuncionarioRepository;

    private ValorHoraService service;

    private final UUID adminId = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        service = new ValorHoraService(repository, perfilFuncionarioRepository);
    }

    @Test
    void salvar_criaPrimeiroValorGlobalQuandoNaoHaConfiguracaoAtiva() {
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of());
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var request = new SalvarValorHoraRequest(new BigDecimal("20.00"), List.of());
        service.salvar(adminId, request);

        var captor = ArgumentCaptor.forClass(ConfiguracaoValorHora.class);
        verify(repository).save(captor.capture());
        var salvo = captor.getValue();
        assertThat(salvo.getEscopo()).isEqualTo(EscopoValorHora.GLOBAL);
        assertThat(salvo.getAreaTrabalho()).isNull();
        assertThat(salvo.getValorHora()).isEqualByComparingTo("20.00");
        assertThat(salvo.getCriadoPorAdminId()).isEqualTo(adminId);
    }
}
```

- [ ] **Step 2: Rodar o teste e confirmar que falha**

Run: `cd backend && mvn -q test -Dtest=ValorHoraServiceTest`
Expected: FALHA de compilação — `ValorHoraService` ainda não existe.

- [ ] **Step 3: Implementar `ValorHoraService` (mínimo para passar)**

```java
package com.arena.rodeio.service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.stream.Collectors;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.arena.rodeio.dto.HistoricoValorHoraResponse;
import com.arena.rodeio.dto.SalvarValorHoraRequest;
import com.arena.rodeio.dto.ValorHoraAtualResponse;
import com.arena.rodeio.dto.ValorVigenteResponse;
import com.arena.rodeio.model.ConfiguracaoValorHora;
import com.arena.rodeio.model.EscopoValorHora;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.repository.ConfiguracaoValorHoraRepository;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;

@Service
public class ValorHoraService {

    private final ConfiguracaoValorHoraRepository repository;
    private final PerfilFuncionarioRepository perfilFuncionarioRepository;

    public ValorHoraService(ConfiguracaoValorHoraRepository repository,
                            PerfilFuncionarioRepository perfilFuncionarioRepository) {
        this.repository = repository;
        this.perfilFuncionarioRepository = perfilFuncionarioRepository;
    }

    @Transactional(readOnly = true)
    public ValorHoraAtualResponse buscarAtual() {
        var global = repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL).stream()
            .findFirst()
            .map(this::paraVigente)
            .orElse(null);

        var overrides = repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA).stream()
            .map(this::paraVigente)
            .sorted(Comparator.comparing(ValorVigenteResponse::areaTrabalho))
            .toList();

        return new ValorHoraAtualResponse(global, overrides);
    }

    @Transactional(readOnly = true)
    public List<HistoricoValorHoraResponse> buscarHistorico() {
        return repository.findAllByOrderByVigenciaInicioDesc().stream()
            .map(config -> HistoricoValorHoraResponse.from(config, nomeAdmin(config.getCriadoPorAdminId())))
            .toList();
    }

    /**
     * Substitui o estado inteiro: versiona o valor global se mudou, versiona
     * cada override enviado se mudou/é novo, e encerra os overrides que não
     * vieram mais na lista (a área volta a herdar o valor global).
     */
    @Transactional
    public ValorHoraAtualResponse salvar(UUID adminId, SalvarValorHoraRequest request) {
        var valorGlobalNovo = request.valorHoraGlobal().setScale(2, RoundingMode.HALF_EVEN);
        aplicarValor(EscopoValorHora.GLOBAL, null, valorGlobalNovo, adminId);

        var areasEnviadas = request.overrides().stream()
            .collect(Collectors.toMap(
                item -> item.area().trim(),
                item -> item.valorHora().setScale(2, RoundingMode.HALF_EVEN)));

        areasEnviadas.forEach((area, valor) -> aplicarValor(EscopoValorHora.AREA, area, valor, adminId));

        repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA).stream()
            .filter(config -> !areasEnviadas.containsKey(config.getAreaTrabalho()))
            .forEach(ConfiguracaoValorHora::encerrar);

        return buscarAtual();
    }

    /** Só versiona (encerra o antigo + cria um novo) quando o valor realmente muda. */
    private void aplicarValor(EscopoValorHora escopo, String area, BigDecimal novoValor, UUID adminId) {
        Optional<ConfiguracaoValorHora> ativoAtual = escopo == EscopoValorHora.GLOBAL
            ? repository.findByEscopoAndAtivoTrue(escopo).stream().findFirst()
            : repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(escopo, area);

        if (ativoAtual.isPresent() && ativoAtual.get().getValorHora().compareTo(novoValor) == 0) {
            return;
        }

        ativoAtual.ifPresent(ConfiguracaoValorHora::encerrar);
        repository.save(new ConfiguracaoValorHora(escopo, area, novoValor, adminId));
    }

    private ValorVigenteResponse paraVigente(ConfiguracaoValorHora config) {
        return ValorVigenteResponse.from(config, nomeAdmin(config.getCriadoPorAdminId()));
    }

    private String nomeAdmin(UUID adminId) {
        return perfilFuncionarioRepository.findById(adminId)
            .map(PerfilFuncionario::getNomeCompleto)
            .orElse("Admin removido");
    }
}
```

- [ ] **Step 4: Rodar o teste e confirmar que passa**

Run: `cd backend && mvn -q test -Dtest=ValorHoraServiceTest`
Expected: `Tests run: 1, Failures: 0, Errors: 0`

- [ ] **Step 5: Adicionar os demais casos de teste (versiona, não versiona à toa, cria/remove override, resolve nomes)**

Adicionar ao mesmo arquivo `ValorHoraServiceTest.java`, dentro da classe:

```java
    @Test
    void salvar_versionaQuandoValorGlobalMuda() {
        var antigo = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("15.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(antigo));
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var request = new SalvarValorHoraRequest(new BigDecimal("20.00"), List.of());
        service.salvar(adminId, request);

        assertThat(antigo.isAtivo()).isFalse();
        assertThat(antigo.getVigenciaFim()).isNotNull();
        verify(repository).save(any(ConfiguracaoValorHora.class));
    }

    @Test
    void salvar_naoVersionaQuandoValorGlobalNaoMuda() {
        var atual = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("20.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(atual));
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var request = new SalvarValorHoraRequest(new BigDecimal("20.00"), List.of());
        service.salvar(adminId, request);

        assertThat(atual.isAtivo()).isTrue();
        verify(repository, never()).save(any());
    }

    @Test
    void salvar_criaOverridePorAreaERemoveOsQueSairamDaLista() {
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of());

        var overrideAntigoPortaria =
            new ConfiguracaoValorHora(EscopoValorHora.AREA, "Portaria", new BigDecimal("25.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of(overrideAntigoPortaria));
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Bar de Fora"))
            .thenReturn(Optional.empty());

        var request = new SalvarValorHoraRequest(
            new BigDecimal("20.00"),
            List.of(new OverrideAreaValorHora("Bar de Fora", new BigDecimal("15.00"))));
        service.salvar(adminId, request);

        assertThat(overrideAntigoPortaria.isAtivo()).isFalse();

        var captor = ArgumentCaptor.forClass(ConfiguracaoValorHora.class);
        verify(repository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());
        assertThat(captor.getAllValues())
            .anyMatch(c -> c.getEscopo() == EscopoValorHora.AREA
                && "Bar de Fora".equals(c.getAreaTrabalho())
                && c.getValorHora().compareTo(new BigDecimal("15.00")) == 0);
    }

    @Test
    void buscarAtual_retornaGlobalEOverridesComNomeDoAdmin() {
        var admin = mock(PerfilFuncionario.class);
        when(admin.getNomeCompleto()).thenReturn("Admin Teste");
        when(perfilFuncionarioRepository.findById(adminId)).thenReturn(Optional.of(admin));

        var global = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("20.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(global));
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.AREA)).thenReturn(List.of());

        var resposta = service.buscarAtual();

        assertThat(resposta.global()).isNotNull();
        assertThat(resposta.global().valorHora()).isEqualByComparingTo("20.00");
        assertThat(resposta.global().alteradoPorNome()).isEqualTo("Admin Teste");
        assertThat(resposta.overridesPorArea()).isEmpty();
    }
```

- [ ] **Step 6: Rodar todos os testes do service e confirmar que passam**

Run: `cd backend && mvn -q test -Dtest=ValorHoraServiceTest`
Expected: `Tests run: 5, Failures: 0, Errors: 0`

- [ ] **Step 7: Commit**

```bash
git add backend/src/main/java/com/arena/rodeio/service/ValorHoraService.java backend/src/test/java/com/arena/rodeio/service/ValorHoraServiceTest.java
git commit -m "feat(back): ValorHoraService com versionamento por vigencia"
```

---

## Task 5: `ValorHoraController`

**Files:**
- Create: `backend/src/main/java/com/arena/rodeio/controller/ValorHoraController.java`

**Interfaces:**
- Consumes: `ValorHoraService` (Task 4), DTOs (Task 3)
- Produces: `GET /api/valores-hora`, `GET /api/valores-hora/historico`, `PUT /api/valores-hora` — consumidos pelo front-end (Task 7).

- [ ] **Step 1: Implementar o controller**

```java
package com.arena.rodeio.controller;

import java.util.List;
import java.util.UUID;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.arena.rodeio.dto.HistoricoValorHoraResponse;
import com.arena.rodeio.dto.SalvarValorHoraRequest;
import com.arena.rodeio.dto.ValorHoraAtualResponse;
import com.arena.rodeio.service.ValorHoraService;

import jakarta.validation.Valid;

/**
 * Configuração de valor/hora dos funcionários (valor global + overrides por
 * área). Exclusivo do MASTER_ADMIN — regra inegociável nº 6.
 */
@RestController
@RequestMapping("/api/valores-hora")
public class ValorHoraController {

    private final ValorHoraService service;

    public ValorHoraController(ValorHoraService service) {
        this.service = service;
    }

    @GetMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ValorHoraAtualResponse buscarAtual() {
        return service.buscarAtual();
    }

    @GetMapping("/historico")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<HistoricoValorHoraResponse> buscarHistorico() {
        return service.buscarHistorico();
    }

    @PutMapping
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public ValorHoraAtualResponse salvar(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody SalvarValorHoraRequest request) {
        return service.salvar(UUID.fromString(jwt.getSubject()), request);
    }
}
```

- [ ] **Step 2: Compilar o projeto inteiro**

Run: `cd backend && mvn -q compile`
Expected: `BUILD SUCCESS`.

- [ ] **Step 3: Rodar a suíte de testes inteira (garantir que nada quebrou)**

Run: `cd backend && mvn -q test`
Expected: todos os testes passam (os 5 de `ValorHoraServiceTest`, nenhum outro teste pré-existente no projeto).

- [ ] **Step 4: Commit**

```bash
git add backend/src/main/java/com/arena/rodeio/controller/ValorHoraController.java
git commit -m "feat(back): endpoints de configuracao de valor/hora"
```

---

## Task 6: Extrair `AREAS_TRABALHO` para constante compartilhada

**Files:**
- Create: `frontend/src/constants/areasTrabalho.ts`
- Modify: `frontend/src/pages/AuthPage.tsx:31-39`

**Interfaces:**
- Produces: `export const AREAS_TRABALHO: readonly string[]` — consumida por `AuthPage.tsx` (já usa) e por `ValoresHoraModal.tsx` (Task 10).

- [ ] **Step 1: Criar a constante compartilhada**

```typescript
/** Postos do evento — cadastro (Área de Trabalho) e Configuração de Valores/Hora. */
export const AREAS_TRABALHO = [
  "Bar de Fora",
  "Bar Interno",
  "Portaria",
  "Estacionamento",
  "Bilheteria",
  "Cozinha",
  "Segurança",
] as const;
```

- [ ] **Step 2: Atualizar `AuthPage.tsx` para importar a constante**

Em `frontend/src/pages/AuthPage.tsx`, remover as linhas 30-39 (a definição local de `AREAS_TRABALHO`):

```typescript
/** Postos do evento — usados pelo Admin para localizar o operador (backlog). */
const AREAS_TRABALHO = [
  "Bar de Fora",
  "Bar Interno",
  "Portaria",
  "Estacionamento",
  "Bilheteria",
  "Cozinha",
  "Segurança",
] as const;
```

E adicionar no topo do arquivo, junto aos outros imports:

```typescript
import { AREAS_TRABALHO } from "../constants/areasTrabalho";
```

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npm run build`
Expected: build sem erros (o uso em `options={AREAS_TRABALHO}` na linha 808 continua funcionando sem alteração, já que o tipo `readonly [...]` é idêntico).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/constants/areasTrabalho.ts frontend/src/pages/AuthPage.tsx
git commit -m "refactor(front): extrai AREAS_TRABALHO para constante compartilhada"
```

---

## Task 7: `api.ts` — tipos e funções do endpoint de valores/hora

**Files:**
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: `request()` (já existe, `frontend/src/lib/api.ts:98`), `centavosParaReais()` (`frontend/src/lib/moeda.ts`)
- Produces: `ValorVigenteApi`, `ValorHoraAtualApi`, `HistoricoValorHoraApi`, `buscarValoresHora()`, `buscarHistoricoValoresHora()`, `salvarValoresHora(dados)` — usados por `useValoresHora.ts` (Task 9).

- [ ] **Step 1: Adicionar as interfaces**, logo abaixo de `FuncionarioApi` (linha 77):

```typescript
export interface ValorVigenteApi {
  /** null quando é o valor global (sem área específica). */
  areaTrabalho: string | null;
  valorHora: number;
  vigenciaInicio: string;
  alteradoPorAdminId: string;
  alteradoPorNome: string;
}

export interface ValorHoraAtualApi {
  /** null quando nenhum admin configurou um valor global ainda. */
  global: ValorVigenteApi | null;
  overridesPorArea: ValorVigenteApi[];
}

export interface HistoricoValorHoraApi {
  id: string;
  escopo: "GLOBAL" | "AREA";
  areaTrabalho: string | null;
  valorHora: number;
  vigenciaInicio: string;
  vigenciaFim: string | null;
  ativo: boolean;
  alteradoPorAdminId: string;
  alteradoPorNome: string;
}
```

- [ ] **Step 2: Adicionar as funções**, ao final do arquivo (depois de `listarCaixasFechados`):

```typescript
/** Exclusivo do Admin — estado efetivo atual (valor global + overrides por área). */
export function buscarValoresHora(): Promise<ValorHoraAtualApi> {
  return request<ValorHoraAtualApi>("/api/valores-hora", "GET") as Promise<ValorHoraAtualApi>;
}

/** Exclusivo do Admin — histórico completo (vigências fechadas e ativas). */
export function buscarHistoricoValoresHora(): Promise<HistoricoValorHoraApi[]> {
  return request<HistoricoValorHoraApi[]>("/api/valores-hora/historico", "GET") as Promise<
    HistoricoValorHoraApi[]
  >;
}

/**
 * Exclusivo do Admin — salva o valor global e a lista completa de overrides
 * por área (payload substitui o estado inteiro; o back-end versiona só o
 * que mudou).
 */
export function salvarValoresHora(dados: {
  valorHoraGlobalCentavos: number;
  overrides: Array<{ area: string; valorHoraCentavos: number }>;
}): Promise<ValorHoraAtualApi> {
  return request<ValorHoraAtualApi>("/api/valores-hora", "PUT", {
    valorHoraGlobal: centavosParaReais(dados.valorHoraGlobalCentavos),
    overrides: dados.overrides.map((item) => ({
      area: item.area,
      valorHora: centavosParaReais(item.valorHoraCentavos),
    })),
  }) as Promise<ValorHoraAtualApi>;
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npm run build`
Expected: build sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts
git commit -m "feat(front): funcoes de api para configuracao de valor/hora"
```

---

## Task 8: Hook `useCentavosMultiCampo`

**Files:**
- Create: `frontend/src/hooks/useCentavosMultiCampo.ts`

**Interfaces:**
- Produces: `useCentavosMultiCampo(chaves: string[])` retornando `{ valores: Record<string, number>, campoAtivo: string, setCampoAtivo: (chave: string) => void, digitar: (tecla: string) => void, apagar: () => void, zerar: (chave?: string) => void, definirValor: (chave: string, centavos: number) => void }` — usado por `ValoresHoraModal.tsx` (Task 10).

- [ ] **Step 1: Implementar o hook**

```typescript
import { useState } from "react";

/**
 * Generaliza useValorCentavosDigitado (mesma máscara de centavos) para N
 * campos nomeados compartilhando um único teclado on-screen — usado quando
 * o admin alterna entre vários valores (valor global + valor de cada área)
 * sem duplicar o teclado numérico por campo.
 */
export function useCentavosMultiCampo(chaves: string[]) {
  const [valores, setValores] = useState<Record<string, number>>(() => {
    const estadoInicial: Record<string, number> = {};
    for (const chave of chaves) estadoInicial[chave] = 0;
    return estadoInicial;
  });
  const [campoAtivo, setCampoAtivo] = useState<string>(chaves[0]);

  function digitar(tecla: string) {
    if (!/^\d$/.test(tecla)) return;
    setValores((atual) => {
      const proximo = atual[campoAtivo] * 10 + Number(tecla);
      // Trava em ~R$ 999.999,99 — evita overflow de digitação acidental
      return { ...atual, [campoAtivo]: proximo > 99_999_999 ? atual[campoAtivo] : proximo };
    });
  }

  function apagar() {
    setValores((atual) => ({ ...atual, [campoAtivo]: Math.floor(atual[campoAtivo] / 10) }));
  }

  function zerar(chave: string = campoAtivo) {
    setValores((atual) => ({ ...atual, [chave]: 0 }));
  }

  function definirValor(chave: string, centavos: number) {
    setValores((atual) => ({ ...atual, [chave]: centavos }));
  }

  return { valores, campoAtivo, setCampoAtivo, digitar, apagar, zerar, definirValor };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd frontend && npm run build`
Expected: build sem erros (o hook ainda não é usado por ninguém, então só precisa compilar isoladamente).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useCentavosMultiCampo.ts
git commit -m "feat(front): hook useCentavosMultiCampo para teclado compartilhado"
```

---

## Task 9: Hook `useValoresHora`

**Files:**
- Create: `frontend/src/hooks/useValoresHora.ts`

**Interfaces:**
- Consumes: `buscarValoresHora`, `buscarHistoricoValoresHora`, `salvarValoresHora`, `ApiError`, `ValorHoraAtualApi`, `HistoricoValorHoraApi` (Task 7); `tocarErro`, `tocarSucesso` (`frontend/src/lib/sons.ts`, já existe — mesmo padrão de `useGerenciamentoEquipe.ts:14`)
- Produces: `useValoresHora()` retornando `{ atual: ValorHoraAtualApi | null, historico: HistoricoValorHoraApi[], carregando: boolean, salvando: boolean, erro: string | null, limparErro: () => void, salvar: (dados: DadosSalvarValoresHora) => Promise<boolean> }`, tipo `DadosSalvarValoresHora` — usado por `ValoresHoraModal.tsx` (Task 10).

- [ ] **Step 1: Implementar o hook**

```typescript
import { useCallback, useEffect, useState } from "react";
import {
  buscarHistoricoValoresHora,
  buscarValoresHora,
  salvarValoresHora,
  ApiError,
  type HistoricoValorHoraApi,
  type ValorHoraAtualApi,
} from "../lib/api";
import { tocarErro, tocarSucesso } from "../lib/sons";

export interface DadosSalvarValoresHora {
  valorHoraGlobalCentavos: number;
  overrides: Array<{ area: string; valorHoraCentavos: number }>;
}

/**
 * Dados da Configuração de Valores/Hora (modal auto-contido em
 * ValoresHoraModal): busca o estado atual + histórico ao montar, e expõe
 * salvar() para o payload completo (valor global + overrides por área).
 */
export function useValoresHora() {
  const [atual, setAtual] = useState<ValorHoraAtualApi | null>(null);
  const [historico, setHistorico] = useState<HistoricoValorHoraApi[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [atualCarregado, historicoCarregado] = await Promise.all([
        buscarValoresHora(),
        buscarHistoricoValoresHora(),
      ]);
      setAtual(atualCarregado);
      setHistorico(historicoCarregado);
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar os valores/hora.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const salvar = useCallback(
    async (dados: DadosSalvarValoresHora): Promise<boolean> => {
      setSalvando(true);
      setErro(null);
      try {
        await salvarValoresHora(dados);
        await carregar();
        tocarSucesso();
        return true;
      } catch (excecao) {
        tocarErro();
        setErro(excecao instanceof ApiError ? excecao.message : "Falha ao salvar os valores/hora.");
        return false;
      } finally {
        setSalvando(false);
      }
    },
    [carregar],
  );

  return {
    atual,
    historico,
    carregando,
    salvando,
    erro,
    limparErro: () => setErro(null),
    salvar,
  };
}
```

- [ ] **Step 2: Verificar tipos**

Run: `cd frontend && npm run build`
Expected: build sem erros.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useValoresHora.ts
git commit -m "feat(front): hook useValoresHora"
```

---

## Task 10: Ícone `CifraoIcon` e componente `ValoresHoraModal`

**Files:**
- Modify: `frontend/src/components/icons.tsx`
- Create: `frontend/src/components/equipe/ValoresHoraModal.tsx`

**Interfaces:**
- Consumes: `Modal` (`frontend/src/components/ui/Modal.tsx`), `Botao` (`frontend/src/components/ui/Botao.tsx`), `Alerta` (`frontend/src/components/ui/Alerta.tsx`), `Carregando` (`frontend/src/components/ui/interacoes.tsx`), `BackspaceIcon`/`CifraoIcon` (`frontend/src/components/icons.tsx`), `formatarCentavos`/`reaisParaCentavos` (`frontend/src/lib/moeda.ts`), `useCentavosMultiCampo` (Task 8), `useTecladoNumerico` (`frontend/src/hooks/useTecladoNumerico.ts`, já existe), `useValoresHora`/`DadosSalvarValoresHora` (Task 9), `AREAS_TRABALHO` (Task 6)
- Produces: `export default function ValoresHoraModal({ onFechar: () => void })` — usado por `GerenciamentoEquipe.tsx` (Task 11).

- [ ] **Step 1: Adicionar `CifraoIcon` em `icons.tsx`**, ao final do arquivo:

```typescript
/** Moeda com cifrão — ação de configurar valor/hora (VALORES). */
export function CifraoIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx={12} cy={12} r={8.5} stroke="currentColor" strokeWidth={1.8} />
      <path
        d="M14.5 9.3c0-1-.9-1.8-2.5-1.8s-2.7.8-2.7 1.9c0 2.7 5.4 1.3 5.4 4 0 1.1-1.1 1.9-2.7 1.9s-2.7-.8-2.7-1.9"
        stroke="currentColor"
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M12 6v1.3M12 16.7V18" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Implementar `ValoresHoraModal.tsx`**

```tsx
import { useEffect, useState } from "react";
import Modal from "../ui/Modal";
import Botao from "../ui/Botao";
import Alerta from "../ui/Alerta";
import { Carregando } from "../ui/interacoes";
import { BackspaceIcon, CifraoIcon } from "../icons";
import { formatarCentavos, reaisParaCentavos } from "../../lib/moeda";
import { useCentavosMultiCampo } from "../../hooks/useCentavosMultiCampo";
import { useTecladoNumerico } from "../../hooks/useTecladoNumerico";
import { useValoresHora } from "../../hooks/useValoresHora";
import { AREAS_TRABALHO } from "../../constants/areasTrabalho";

const CAMPO_GLOBAL = "GLOBAL";
const DIGITOS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];

function formatarData(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

function AbaBotao({
  rotulo,
  ativo,
  onClick,
}: {
  rotulo: string;
  ativo: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={onClick}
      className={`rounded-md border px-4 py-2 text-sm font-semibold transition-colors duration-150 ease-couro ${
        ativo
          ? "border-gold-500 bg-gold-500/15 text-gold-300"
          : "border-leather-600/50 text-leather-300 hover:border-gold-500 hover:text-gold-300"
      }`}
    >
      {rotulo}
    </button>
  );
}

/**
 * Configuração de Valores/Hora (Master Admin): valor padrão (global) sempre
 * ativo + overrides opcionais por área, com teclado numérico compartilhado
 * e aba de Histórico com as vigências anteriores. Auto-contido — busca seus
 * próprios dados ao montar.
 */
export default function ValoresHoraModal({ onFechar }: { onFechar: () => void }) {
  const { atual, historico, carregando, salvando, erro, limparErro, salvar } = useValoresHora();
  const [aba, setAba] = useState<"configuracao" | "historico">("configuracao");
  const [areasComOverride, setAreasComOverride] = useState<Set<string>>(new Set());
  const campos = useCentavosMultiCampo([CAMPO_GLOBAL, ...AREAS_TRABALHO]);
  useTecladoNumerico(campos.digitar, campos.apagar, aba === "configuracao" && !carregando);

  useEffect(() => {
    if (!atual) return;
    campos.definirValor(CAMPO_GLOBAL, atual.global ? reaisParaCentavos(atual.global.valorHora) : 0);
    const overrideAreas = new Set(atual.overridesPorArea.map((override) => override.areaTrabalho as string));
    setAreasComOverride(overrideAreas);
    for (const override of atual.overridesPorArea) {
      campos.definirValor(override.areaTrabalho as string, reaisParaCentavos(override.valorHora));
    }
    // Só reidrata quando o snapshot vindo do back-end muda (após carregar/salvar).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [atual]);

  function alternarOverride(area: string) {
    setAreasComOverride((atualSet) => {
      const proximo = new Set(atualSet);
      if (proximo.has(area)) {
        proximo.delete(area);
      } else {
        proximo.add(area);
        campos.setCampoAtivo(area);
      }
      return proximo;
    });
  }

  async function confirmar() {
    const sucesso = await salvar({
      valorHoraGlobalCentavos: campos.valores[CAMPO_GLOBAL],
      overrides: AREAS_TRABALHO.filter((area) => areasComOverride.has(area)).map((area) => ({
        area,
        valorHoraCentavos: campos.valores[area],
      })),
    });
    if (sucesso) onFechar();
  }

  if (carregando) {
    return (
      <Modal titulo="Configuração de valores" onFechar={onFechar}>
        <Carregando rotulo="Carregando valores..." />
      </Modal>
    );
  }

  const podeConfirmar = campos.valores[CAMPO_GLOBAL] > 0 && !salvando;

  return (
    <Modal titulo="Configuração de valores" onFechar={onFechar} larguraMax="max-w-2xl">
      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      <div className="mt-4 flex gap-2">
        <AbaBotao rotulo="Configuração" ativo={aba === "configuracao"} onClick={() => setAba("configuracao")} />
        <AbaBotao rotulo="Histórico" ativo={aba === "historico"} onClick={() => setAba("historico")} />
      </div>

      {aba === "configuracao" ? (
        <>
          <button
            type="button"
            onClick={() => campos.setCampoAtivo(CAMPO_GLOBAL)}
            className={`mt-4 w-full rounded-lg border-2 p-3 text-left transition-colors duration-150 ease-couro ${
              campos.campoAtivo === CAMPO_GLOBAL
                ? "border-gold-500 bg-arena-800"
                : "border-leather-600/40 bg-arena-900 hover:border-gold-500/60"
            }`}
          >
            <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gold-300">
              <CifraoIcon className="h-4 w-4" /> Valor Padrão (Global)
            </p>
            <p className="num-tabular mt-1 text-2xl font-bold text-leather-200">
              {formatarCentavos(campos.valores[CAMPO_GLOBAL])}/h
            </p>
          </button>

          <div className="mt-4 space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">
              Valores por área (opcional)
            </p>
            {AREAS_TRABALHO.map((area) => {
              const ativo = areasComOverride.has(area);
              return (
                <div
                  key={area}
                  className={`flex items-center gap-3 rounded-lg border-2 p-3 transition-colors duration-150 ease-couro ${
                    ativo && campos.campoAtivo === area
                      ? "border-gold-500 bg-arena-800"
                      : "border-leather-600/40 bg-arena-900"
                  }`}
                >
                  <input
                    type="checkbox"
                    id={`override-${area}`}
                    checked={ativo}
                    onChange={() => alternarOverride(area)}
                    className="h-5 w-5 shrink-0 accent-gold-500"
                  />
                  <label htmlFor={`override-${area}`} className="flex-1 text-sm text-leather-200">
                    {area}
                  </label>
                  {ativo ? (
                    <button
                      type="button"
                      onClick={() => campos.setCampoAtivo(area)}
                      className="num-tabular text-lg font-bold text-leather-200"
                    >
                      {formatarCentavos(campos.valores[area])}/h
                    </button>
                  ) : (
                    <span className="text-sm text-steel-500">
                      usa padrão: {formatarCentavos(campos.valores[CAMPO_GLOBAL])}/h
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          <div className="mt-4 grid grid-cols-3 gap-2">
            {DIGITOS.map((digito) => (
              <button
                key={digito}
                type="button"
                onClick={() => campos.digitar(digito)}
                className="num-tabular min-h-12 touch-manipulation rounded-lg border border-leather-600/50 bg-wood-900 text-xl font-bold text-leather-200 transition-colors duration-150 ease-couro hover:border-gold-500 active:scale-95"
              >
                {digito}
              </button>
            ))}
            <button
              type="button"
              onClick={campos.apagar}
              aria-label="Apagar último dígito"
              className="flex min-h-12 touch-manipulation items-center justify-center rounded-lg border border-leather-600/50 bg-wood-900 text-leather-400 transition-colors duration-150 ease-couro hover:border-gold-500 hover:text-leather-200 active:scale-95"
            >
              <BackspaceIcon className="h-5 w-5" />
            </button>
            <button
              type="button"
              onClick={() => campos.zerar()}
              className="min-h-12 touch-manipulation rounded-lg border border-rust-500/40 bg-wood-900 text-sm font-bold text-rust-300 transition-colors duration-150 ease-couro hover:border-rust-400 active:scale-95"
            >
              Zerar
            </button>
          </div>
          <p className="mt-2 text-xs text-leather-400/70">
            Toque num valor acima (ou marque uma área) para digitar nele. Também aceita o teclado do computador.
          </p>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <Botao variante="couro" tamanho="lg" onClick={onFechar}>
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
        </>
      ) : (
        <div className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {historico.length === 0 ? (
            <p className="text-sm text-leather-300">Nenhuma alteração registrada ainda.</p>
          ) : (
            historico.map((item) => (
              <div key={item.id} className="rounded-lg border border-leather-600/40 bg-arena-900 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gold-300">
                    {item.areaTrabalho ?? "Valor Padrão (Global)"}
                  </span>
                  {item.ativo && (
                    <span className="rounded-full bg-campo-500/20 px-2 py-0.5 text-[11px] font-semibold text-campo-300">
                      Vigente
                    </span>
                  )}
                </div>
                <p className="num-tabular mt-1 text-lg font-bold text-leather-200">
                  {formatarCentavos(reaisParaCentavos(item.valorHora))}/h
                </p>
                <p className="mt-1 text-xs text-steel-400">
                  {item.alteradoPorNome} em {formatarData(item.vigenciaInicio)}
                  {item.vigenciaFim && ` — encerrado em ${formatarData(item.vigenciaFim)}`}
                </p>
              </div>
            ))
          )}
        </div>
      )}
    </Modal>
  );
}
```

- [ ] **Step 3: Verificar tipos**

Run: `cd frontend && npm run build`
Expected: build sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/icons.tsx frontend/src/components/equipe/ValoresHoraModal.tsx
git commit -m "feat(front): componente ValoresHoraModal"
```

---

## Task 11: Botão VALORES em `GerenciamentoEquipe.tsx`

**Files:**
- Modify: `frontend/src/pages/GerenciamentoEquipe.tsx`

**Interfaces:**
- Consumes: `ValoresHoraModal` (Task 10), `CifraoIcon` (Task 10)

- [ ] **Step 1: Importar o modal e o ícone**

No topo de `frontend/src/pages/GerenciamentoEquipe.tsx`, junto aos imports existentes:

```typescript
import ValoresHoraModal from "../components/equipe/ValoresHoraModal";
```

E na linha do import de ícones (linha 12), adicionar `CifraoIcon`:

```typescript
import { CifraoIcon, LivroCaixaIcon, SearchIcon } from "../components/icons";
```

- [ ] **Step 2: Adicionar o estado do modal**

Dentro de `export default function GerenciamentoEquipe()`, junto aos outros `useState` (perto da linha 222):

```typescript
  const [mostrarValoresHora, setMostrarValoresHora] = useState(false);
```

- [ ] **Step 3: Adicionar o botão no cabeçalho da página**

Substituir o bloco do cabeçalho (linhas 250-259):

```tsx
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-gold-300 md:text-3xl">Equipe do evento</h1>
        {!carregando && (
          <p className="num-tabular text-sm text-steel-400">
            {operadores.length} de {totalOperadores} operador(es)
          </p>
        )}
      </div>
```

por:

```tsx
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl text-gold-300 md:text-3xl">Equipe do evento</h1>
        <div className="flex items-center gap-3">
          {!carregando && (
            <p className="num-tabular text-sm text-steel-400">
              {operadores.length} de {totalOperadores} operador(es)
            </p>
          )}
          <Botao variante="couro" tamanho="sm" onClick={() => setMostrarValoresHora(true)}>
            <CifraoIcon className="h-4 w-4" />
            Valores
          </Botao>
        </div>
      </div>
```

- [ ] **Step 4: Renderizar o modal**

Ao final do JSX, junto aos outros modais condicionais (depois do bloco `{operadorParaLimites && (...)}`, antes do fechamento de `</>`):

```tsx
      {mostrarValoresHora && (
        <ValoresHoraModal onFechar={() => setMostrarValoresHora(false)} />
      )}
```

- [ ] **Step 5: Verificar tipos**

Run: `cd frontend && npm run build`
Expected: build sem erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/pages/GerenciamentoEquipe.tsx
git commit -m "feat(front): botao VALORES em Gerenciamento de Equipe"
```

---

## Task 12: Verificação manual fim-a-fim

**Files:** nenhum (só verificação)

- [ ] **Step 1: Aplicar a migration 009 no Supabase**

Avisar o usuário para rodar `backend/db/009_configuracoes_valor_hora.sql` no SQL Editor do projeto Supabase (não fazer isso automaticamente).

- [ ] **Step 2: Rodar o back-end**

Run: `cd backend && mvn spring-boot:run`
Expected: sobe sem erro na porta configurada.

- [ ] **Step 3: Rodar o front-end**

Run: `cd frontend && npm run dev`
Expected: sobe em `http://localhost:5173`.

- [ ] **Step 4: Exercitar o fluxo no navegador (login como MASTER_ADMIN)**

- Ir em `/admin-dashboard/equipe`, clicar em "Valores".
- Definir um valor global (ex.: R$ 20,00/h) e salvar — confirmar que o modal fecha e não há erro.
- Reabrir o modal, marcar override em "Portaria" com R$ 25,00/h, salvar.
- Reabrir novamente e conferir que Portaria aparece com override e as demais áreas mostram "usa padrão".
- Ir na aba Histórico e confirmar que aparecem as duas alterações (global e Portaria) com nome do admin e data/hora.
- Desmarcar o override de Portaria e salvar — confirmar que ela volta a mostrar "usa padrão" e que o histórico ganha uma nova linha de encerramento.

- [ ] **Step 5: Confirmar RBAC**

Fazer login como um usuário `OPERADOR` (perfil não-admin) e confirmar que a rota/modal não é acessível (não há link para operador nessa tela, mas os endpoints devem responder 403 se chamados diretamente — isso já é garantido por `@PreAuthorize`, não precisa de teste manual adicional além de checar que a tela do operador não expõe o botão).

- [ ] **Step 6: Reportar ao usuário**

Resumir o que foi testado e qualquer comportamento inesperado encontrado.
