# Controle de Jornada Operacional (Horas × Valor/Hora) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ao fechar um caixa, calcular e persistir (como snapshot imutável) as horas trabalhadas pelo operador e o valor devido (horas × valor/hora vigente), exibindo o resultado no comprovante de fechamento, numa nova tela de Histórico de Turnos e no Scorecard.

**Architecture:** Reaproveita `dataAbertura`/`dataFechamento` já existentes em `Caixa` como entrada/saída da jornada. Duas colunas novas (`valor_hora_aplicado`, `valor_total_calculado`) guardam o snapshot calculado em `CaixaService.fechar()` no momento do fechamento — nunca recalculado depois. O front-end apenas exibe o que o back-end já manda em `CaixaResponse`; nenhum cálculo de dinheiro acontece no cliente.

**Tech Stack:** Java 21 / Spring Boot 3 / Spring Data JPA (backend), React 18 + TypeScript + Vite (frontend), PostgreSQL (Supabase).

## Global Constraints

- Dinheiro é sempre `BigDecimal` (scale 2, `RoundingMode.HALF_EVEN`) — nunca `double`/`float` (regra inegociável nº 1).
- Textos de UI e mensagens de erro em pt-BR (regra inegociável nº 3).
- UI consistente com o tema Rodeio Premium — sem spinners genéricos, sem glassmorphism, sem cor crua do Tailwind (regra inegociável nº 4).
- RBAC: endpoints administrativos usam `@PreAuthorize("hasRole('MASTER_ADMIN')")`, nunca só `authenticated()` (regra inegociável nº 6).
- Abertura/fechamento de caixa são exclusivos do MASTER_ADMIN — o Operador nunca abre/fecha o próprio caixa (regra inegociável nº 7).
- O sistema nunca bloqueia uma operação por falta de configuração — fechamento de caixa sem valor/hora configurado grava snapshot `null`, nunca lança erro (decisão nº 5 da spec).
- Toda decisão de arquitetura desta feature está detalhada em [docs/superpowers/specs/2026-07-04-jornada-operacional-design.md](../specs/2026-07-04-jornada-operacional-design.md) — consulte se algo aqui parecer ambíguo.

---

### Task 1: Migration + campos de jornada na entidade `Caixa`

**Files:**
- Create: `backend/db/010_jornada_operador.sql`
- Modify: `backend/src/main/java/com/arena/rodeio/model/Caixa.java`
- Test: `backend/src/test/java/com/arena/rodeio/model/CaixaTest.java` (novo arquivo)

**Interfaces:**
- Consumes: nada de outras tasks.
- Produces: `Caixa.fechar(BigDecimal valorFinalConfirmado, String motivoFechamento, BigDecimal valorHoraAplicado, BigDecimal valorTotalCalculado)` (assinatura NOVA, substitui a de 2 parâmetros), `Caixa.getValorHoraAplicado(): BigDecimal`, `Caixa.getValorTotalCalculado(): BigDecimal`. Colunas `valor_hora_aplicado`/`valor_total_calculado` em `caixas`. Task 3 depende destas assinaturas.

- [ ] **Step 1: Escrever o teste que falha (comportamento novo de `fechar`)**

```java
package com.arena.rodeio.model;

import static org.assertj.core.api.Assertions.assertThat;

import java.math.BigDecimal;
import java.util.UUID;

import org.junit.jupiter.api.Test;

class CaixaTest {

    @Test
    void fechar_gravaSnapshotDeJornadaQuandoValorHoraInformado() {
        var caixa = new Caixa(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("100.00"));

        caixa.fechar(new BigDecimal("150.00"), "Fim de turno",
            new BigDecimal("20.00"), new BigDecimal("190.00"));

        assertThat(caixa.getStatus()).isEqualTo(StatusCaixa.FECHADO);
        assertThat(caixa.getDataFechamento()).isNotNull();
        assertThat(caixa.getValorFinalConfirmado()).isEqualByComparingTo("150.00");
        assertThat(caixa.getValorHoraAplicado()).isEqualByComparingTo("20.00");
        assertThat(caixa.getValorTotalCalculado()).isEqualByComparingTo("190.00");
    }

    @Test
    void fechar_aceitaSnapshotNuloQuandoValorHoraNaoConfigurado() {
        var caixa = new Caixa(UUID.randomUUID(), UUID.randomUUID(), new BigDecimal("100.00"));

        caixa.fechar(new BigDecimal("150.00"), "Fim de turno", null, null);

        assertThat(caixa.getStatus()).isEqualTo(StatusCaixa.FECHADO);
        assertThat(caixa.getValorHoraAplicado()).isNull();
        assertThat(caixa.getValorTotalCalculado()).isNull();
    }
}
```

- [ ] **Step 2: Rodar o teste e confirmar que falha (método `fechar` ainda tem só 2 parâmetros)**

Run: `mvn -f backend/pom.xml test -Dtest=CaixaTest`
Expected: FAIL — erro de compilação, `fechar(BigDecimal, String, BigDecimal, BigDecimal)` não existe.

- [ ] **Step 3: Criar a migration**

```sql
-- backend/db/010_jornada_operador.sql
-- Módulo 2.3: controle de jornada operacional (horas x valor/hora). O turno
-- já registra entrada/saída em data_abertura/data_fechamento; aqui fica o
-- snapshot imutável do valor/hora aplicado e do total calculado no momento
-- do fechamento — nunca recalculado retroativamente. Executar DEPOIS de 009.

alter table public.caixas
  add column if not exists valor_hora_aplicado numeric(12,2),
  add column if not exists valor_total_calculado numeric(12,2);

alter table public.caixas
  drop constraint if exists chk_jornada_so_no_fechamento;

alter table public.caixas
  add constraint chk_jornada_so_no_fechamento
  check (
    status = 'FECHADO' or (valor_hora_aplicado is null and valor_total_calculado is null)
  );

comment on column public.caixas.valor_hora_aplicado is
    'Snapshot imutável do valor/hora vigente (área do operador, senão global) no momento do fechamento — nunca recalculado retroativamente';
comment on column public.caixas.valor_total_calculado is
    'minutosTrabalhados/60 * valor_hora_aplicado, calculado com HALF_EVEN — null se não havia valor/hora configurado no fechamento';
```

- [ ] **Step 4: Adicionar os campos, getters e nova assinatura de `fechar` em `Caixa.java`**

Em `backend/src/main/java/com/arena/rodeio/model/Caixa.java`, adicionar os dois campos logo depois de `motivoFechamento` (linha 60):

```java
    @Column(name = "valor_hora_aplicado", precision = 12, scale = 2)
    private BigDecimal valorHoraAplicado;

    @Column(name = "valor_total_calculado", precision = 12, scale = 2)
    private BigDecimal valorTotalCalculado;
```

Substituir o método `fechar` (linhas 77-82) por:

```java
    public void fechar(BigDecimal valorFinalConfirmado, String motivoFechamento,
                        BigDecimal valorHoraAplicado, BigDecimal valorTotalCalculado) {
        this.status = StatusCaixa.FECHADO;
        this.dataFechamento = Instant.now();
        this.valorFinalConfirmado = valorFinalConfirmado;
        this.motivoFechamento = motivoFechamento;
        this.valorHoraAplicado = valorHoraAplicado;
        this.valorTotalCalculado = valorTotalCalculado;
    }
```

Adicionar os getters, depois de `getMotivoFechamento()` (linha 124):

```java
    public BigDecimal getValorHoraAplicado() {
        return valorHoraAplicado;
    }

    public BigDecimal getValorTotalCalculado() {
        return valorTotalCalculado;
    }
```

- [ ] **Step 5: Rodar o teste e confirmar que passa**

Run: `mvn -f backend/pom.xml test -Dtest=CaixaTest`
Expected: PASS (2 testes verdes).

- [ ] **Step 6: Commit**

```bash
git add backend/db/010_jornada_operador.sql backend/src/main/java/com/arena/rodeio/model/Caixa.java backend/src/test/java/com/arena/rodeio/model/CaixaTest.java
git commit -m "feat(back): snapshot de jornada (valor/hora e total) na entidade Caixa"
```

---

### Task 2: `ValorHoraService.resolverValorHoraEfetivoAgora`

**Files:**
- Modify: `backend/src/main/java/com/arena/rodeio/service/ValorHoraService.java`
- Test: `backend/src/test/java/com/arena/rodeio/service/ValorHoraServiceTest.java`

**Interfaces:**
- Consumes: nada de outras tasks (usa `ConfiguracaoValorHoraRepository` já existente, métodos `findByEscopoAndAreaTrabalhoAndAtivoTrue` e `findByEscopoAndAtivoTrue` já existem).
- Produces: `ValorHoraService.resolverValorHoraEfetivoAgora(String areaTrabalho): Optional<BigDecimal>`. Task 3 consome este método.

- [ ] **Step 1: Escrever os testes que falham**

Adicionar ao final da classe `ValorHoraServiceTest` (antes do `}` final, depois do teste `buscarAtual_retornaGlobalEOverridesComNomeDoAdmin`):

```java
    @Test
    void resolverValorHoraEfetivoAgora_usaOverrideDaAreaQuandoExiste() {
        var overridePortaria = new ConfiguracaoValorHora(EscopoValorHora.AREA, "Portaria", new BigDecimal("25.00"), adminId);
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Portaria"))
            .thenReturn(Optional.of(overridePortaria));

        var resultado = service.resolverValorHoraEfetivoAgora("Portaria");

        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualByComparingTo("25.00");
    }

    @Test
    void resolverValorHoraEfetivoAgora_caiParaGlobalQuandoAreaNaoTemOverride() {
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Bar de Fora"))
            .thenReturn(Optional.empty());
        var global = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("18.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(global));

        var resultado = service.resolverValorHoraEfetivoAgora("Bar de Fora");

        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualByComparingTo("18.00");
    }

    @Test
    void resolverValorHoraEfetivoAgora_retornaVazioQuandoNadaConfigurado() {
        when(repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, "Estacionamento"))
            .thenReturn(Optional.empty());
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of());

        var resultado = service.resolverValorHoraEfetivoAgora("Estacionamento");

        assertThat(resultado).isEmpty();
    }

    @Test
    void resolverValorHoraEfetivoAgora_usaGlobalDiretoQuandoAreaTrabalhoNula() {
        var global = new ConfiguracaoValorHora(EscopoValorHora.GLOBAL, null, new BigDecimal("18.00"), adminId);
        when(repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL)).thenReturn(List.of(global));

        var resultado = service.resolverValorHoraEfetivoAgora(null);

        assertThat(resultado).isPresent();
        assertThat(resultado.get()).isEqualByComparingTo("18.00");
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `mvn -f backend/pom.xml test -Dtest=ValorHoraServiceTest`
Expected: FAIL — erro de compilação, método `resolverValorHoraEfetivoAgora` não existe.

- [ ] **Step 3: Implementar o método**

Adicionar em `ValorHoraService.java`, depois de `buscarHistorico()`:

```java
    /**
     * Resolve o valor/hora vigente AGORA para uma área: override da área,
     * senão o valor global; Optional.empty() se nada estiver configurado
     * ainda. Nunca lança exceção — o fechamento de caixa não pode ser
     * bloqueado por falta de configuração (regra de negócio nº 2, adaptada).
     */
    @Transactional(readOnly = true)
    public Optional<BigDecimal> resolverValorHoraEfetivoAgora(String areaTrabalho) {
        if (areaTrabalho != null) {
            var override = repository.findByEscopoAndAreaTrabalhoAndAtivoTrue(EscopoValorHora.AREA, areaTrabalho);
            if (override.isPresent()) {
                return override.map(ConfiguracaoValorHora::getValorHora);
            }
        }

        return repository.findByEscopoAndAtivoTrue(EscopoValorHora.GLOBAL).stream()
            .findFirst()
            .map(ConfiguracaoValorHora::getValorHora);
    }
```

- [ ] **Step 4: Rodar e confirmar que passa**

Run: `mvn -f backend/pom.xml test -Dtest=ValorHoraServiceTest`
Expected: PASS (9 testes verdes: 5 existentes + 4 novos).

- [ ] **Step 5: Commit**

```bash
git add backend/src/main/java/com/arena/rodeio/service/ValorHoraService.java backend/src/test/java/com/arena/rodeio/service/ValorHoraServiceTest.java
git commit -m "feat(back): resolver valor/hora efetivo por area em ValorHoraService"
```

---

### Task 3: Cálculo de jornada em `CaixaService.fechar()` + `CaixaResponse`

**Files:**
- Modify: `backend/src/main/java/com/arena/rodeio/service/CaixaService.java`
- Modify: `backend/src/main/java/com/arena/rodeio/dto/CaixaResponse.java`
- Test: `backend/src/test/java/com/arena/rodeio/service/CaixaServiceTest.java` (novo arquivo)

**Interfaces:**
- Consumes: `Caixa.fechar(BigDecimal, String, BigDecimal, BigDecimal)` (Task 1), `Caixa.getValorHoraAplicado()/getValorTotalCalculado()` (Task 1), `ValorHoraService.resolverValorHoraEfetivoAgora(String): Optional<BigDecimal>` (Task 2), `PerfilFuncionario.getAreaTrabalho(): String` (já existe).
- Produces: `CaixaService(CaixaRepository, VendaRepository, SangriaRepository, PerfilFuncionarioRepository, ValorHoraService)` (constructor com 1 parâmetro novo, `ValorHoraService`, ao final). `CaixaResponse` record com 3 campos novos ao final: `Long minutosTrabalhados, BigDecimal valorHoraAplicado, BigDecimal valorTotalCalculado`. Tasks 4-7 (frontend) consomem esses 3 campos via `CaixaApi`.

- [ ] **Step 1: Escrever os testes que falham**

```java
package com.arena.rodeio.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import com.arena.rodeio.dto.FecharCaixaRequest;
import com.arena.rodeio.model.Caixa;
import com.arena.rodeio.model.PerfilFuncionario;
import com.arena.rodeio.repository.CaixaRepository;
import com.arena.rodeio.repository.PerfilFuncionarioRepository;
import com.arena.rodeio.repository.SangriaRepository;
import com.arena.rodeio.repository.VendaRepository;

@ExtendWith(MockitoExtension.class)
class CaixaServiceTest {

    @Mock private CaixaRepository caixaRepository;
    @Mock private VendaRepository vendaRepository;
    @Mock private SangriaRepository sangriaRepository;
    @Mock private PerfilFuncionarioRepository perfilFuncionarioRepository;
    @Mock private ValorHoraService valorHoraService;

    private CaixaService service;

    @BeforeEach
    void setUp() {
        service = new CaixaService(
            caixaRepository, vendaRepository, sangriaRepository, perfilFuncionarioRepository, valorHoraService);
    }

    @Test
    void fechar_calculaMinutosEValorTotalQuandoValorHoraConfigurado() {
        var operadorId = UUID.randomUUID();
        var caixa = mock(Caixa.class);
        when(caixa.getId()).thenReturn(UUID.randomUUID());
        when(caixa.getOperadorId()).thenReturn(operadorId);
        when(caixa.estaAberto()).thenReturn(true);
        when(caixa.getSaldoInicial()).thenReturn(new BigDecimal("100.00"));
        when(caixa.getDataAbertura()).thenReturn(Instant.now().minus(570, ChronoUnit.MINUTES));
        when(caixaRepository.findById(any())).thenReturn(Optional.of(caixa));
        when(vendaRepository.somarPorCaixaEFormaPagamento(any(), any())).thenReturn(BigDecimal.ZERO);
        when(sangriaRepository.somarPorCaixa(any())).thenReturn(BigDecimal.ZERO);

        var perfil = mock(PerfilFuncionario.class);
        when(perfil.getAreaTrabalho()).thenReturn("Portaria");
        // avaliarNivelAlerta() compara saldoEmEspecie com estes limiares via
        // BigDecimal.compareTo — sem stub, o mock devolve null e explode com
        // NullPointerException. Valores altos aqui só para não disparar
        // ATENCAO/CRITICO (irrelevante para o que este teste verifica).
        when(perfil.getLimiteAtencao()).thenReturn(new BigDecimal("500.00"));
        when(perfil.getLimiteCritico()).thenReturn(new BigDecimal("1000.00"));
        when(perfilFuncionarioRepository.findById(operadorId)).thenReturn(Optional.of(perfil));
        when(valorHoraService.resolverValorHoraEfetivoAgora("Portaria"))
            .thenReturn(Optional.of(new BigDecimal("20.00")));

        service.fechar(caixa.getId(), new FecharCaixaRequest(new BigDecimal("150.00"), "Fim de turno"));

        // Verifica a chamada a fechar(...) com os 4 argumentos: 570 minutos
        // (9h30) × R$20,00/h = R$190,00.
        org.mockito.Mockito.verify(caixa).fechar(
            org.mockito.ArgumentMatchers.eq(new BigDecimal("150.00")),
            org.mockito.ArgumentMatchers.eq("Fim de turno"),
            org.mockito.ArgumentMatchers.argThat(valor -> valor != null && valor.compareTo(new BigDecimal("20.00")) == 0),
            org.mockito.ArgumentMatchers.argThat(valor -> valor != null && valor.compareTo(new BigDecimal("190.00")) == 0));
    }

    @Test
    void fechar_gravaSnapshotNuloQuandoValorHoraNaoConfigurado() {
        var operadorId = UUID.randomUUID();
        var caixa = mock(Caixa.class);
        when(caixa.getId()).thenReturn(UUID.randomUUID());
        when(caixa.getOperadorId()).thenReturn(operadorId);
        when(caixa.estaAberto()).thenReturn(true);
        when(caixa.getSaldoInicial()).thenReturn(new BigDecimal("100.00"));
        when(caixa.getDataAbertura()).thenReturn(Instant.now().minus(60, ChronoUnit.MINUTES));
        when(caixaRepository.findById(any())).thenReturn(Optional.of(caixa));
        when(vendaRepository.somarPorCaixaEFormaPagamento(any(), any())).thenReturn(BigDecimal.ZERO);
        when(sangriaRepository.somarPorCaixa(any())).thenReturn(BigDecimal.ZERO);

        var perfil = mock(PerfilFuncionario.class);
        when(perfil.getAreaTrabalho()).thenReturn("Portaria");
        when(perfil.getLimiteAtencao()).thenReturn(new BigDecimal("500.00"));
        when(perfil.getLimiteCritico()).thenReturn(new BigDecimal("1000.00"));
        when(perfilFuncionarioRepository.findById(operadorId)).thenReturn(Optional.of(perfil));
        when(valorHoraService.resolverValorHoraEfetivoAgora("Portaria")).thenReturn(Optional.empty());

        service.fechar(caixa.getId(), new FecharCaixaRequest(new BigDecimal("150.00"), "Fim de turno"));

        org.mockito.Mockito.verify(caixa).fechar(
            org.mockito.ArgumentMatchers.eq(new BigDecimal("150.00")),
            org.mockito.ArgumentMatchers.eq("Fim de turno"),
            org.mockito.ArgumentMatchers.isNull(),
            org.mockito.ArgumentMatchers.isNull());
    }
}
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `mvn -f backend/pom.xml test -Dtest=CaixaServiceTest`
Expected: FAIL — erro de compilação (`CaixaService` ainda não tem construtor com 5 parâmetros; `fechar(Caixa)` ainda chama `caixa.fechar(valor, motivo)` com 2 argumentos).

- [ ] **Step 3: Implementar em `CaixaService.java`**

Adicionar o campo e atualizar o construtor (linhas 32-45):

```java
    private final CaixaRepository caixaRepository;
    private final VendaRepository vendaRepository;
    private final SangriaRepository sangriaRepository;
    private final PerfilFuncionarioRepository perfilFuncionarioRepository;
    private final ValorHoraService valorHoraService;

    public CaixaService(CaixaRepository caixaRepository,
                        VendaRepository vendaRepository,
                        SangriaRepository sangriaRepository,
                        PerfilFuncionarioRepository perfilFuncionarioRepository,
                        ValorHoraService valorHoraService) {
        this.caixaRepository = caixaRepository;
        this.vendaRepository = vendaRepository;
        this.sangriaRepository = sangriaRepository;
        this.perfilFuncionarioRepository = perfilFuncionarioRepository;
        this.valorHoraService = valorHoraService;
    }
```

Substituir o método `fechar` (linhas 97-114) por:

```java
    /**
     * Fechamento de caixa: exclusivo do MASTER_ADMIN (regra inegociável nº 7).
     * O valor contado fisicamente (request.valorFinalConfirmado) é gravado
     * junto com o saldo calculado no momento — a divergência entre os dois
     * (sobra/falta) fica registrada para sempre, mesmo que vendas futuras de
     * OUTRO caixa mudem os totais do operador.
     *
     * Também grava o snapshot de jornada (regra de negócio nova, controle de
     * jornada operacional): valor/hora resolvido AGORA (área do operador,
     * senão global) multiplicado pelas horas do turno inteiro. Se não houver
     * valor/hora configurado, o snapshot fica null — o fechamento NUNCA é
     * bloqueado por isso.
     */
    @Transactional
    public CaixaResponse fechar(UUID caixaId, FecharCaixaRequest request) {
        var caixa = caixaRepository.findById(caixaId)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Caixa não encontrado."));

        if (!caixa.estaAberto()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                "Este caixa já foi fechado.");
        }

        var saldoEmEspecie = calcularSaldoEmEspecie(caixa);
        var valorFinal = request.valorFinalConfirmado().setScale(2, RoundingMode.HALF_EVEN);

        var areaTrabalho = perfilFuncionarioRepository.findById(caixa.getOperadorId())
            .map(PerfilFuncionario::getAreaTrabalho)
            .orElse(null);
        var valorHoraAplicado = valorHoraService.resolverValorHoraEfetivoAgora(areaTrabalho).orElse(null);
        var minutosTrabalhados = Duration.between(caixa.getDataAbertura(), Instant.now()).toMinutes();
        var valorTotalCalculado = valorHoraAplicado == null
            ? null
            : valorHoraAplicado.multiply(BigDecimal.valueOf(minutosTrabalhados))
                .divide(BigDecimal.valueOf(60), 2, RoundingMode.HALF_EVEN);

        caixa.fechar(valorFinal, request.motivo().trim(), valorHoraAplicado, valorTotalCalculado);

        return CaixaResponse.from(caixa, saldoEmEspecie, avaliarNivelAlerta(caixa.getOperadorId(), saldoEmEspecie));
    }
```

Adicionar os imports que faltam no topo do arquivo (`PerfilFuncionario` é o
model — a classe já importava só o `PerfilFuncionarioRepository`):

```java
import java.time.Duration;
import java.time.Instant;

import com.arena.rodeio.model.PerfilFuncionario;
```

- [ ] **Step 4: Atualizar `CaixaResponse.java`**

Substituir o arquivo inteiro por:

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.Caixa;
import com.arena.rodeio.model.NivelAlertaNumerario;
import com.arena.rodeio.model.StatusCaixa;

public record CaixaResponse(
    UUID id,
    UUID operadorId,
    UUID abertoPorAdminId,
    BigDecimal saldoInicial,
    StatusCaixa status,
    Instant dataAbertura,
    Instant dataFechamento,
    /** Derivado: saldo_inicial + vendas em DINHEIRO − sangrias. */
    BigDecimal saldoEmEspecie,
    /** Só preenchido após o fechamento: dinheiro contado fisicamente pelo Admin. */
    BigDecimal valorFinalConfirmado,
    String motivoFechamento,
    /**
     * valorFinalConfirmado − saldoEmEspecie: positivo = sobra, negativo =
     * falta. Null enquanto o caixa está aberto (nada foi contado ainda).
     */
    BigDecimal divergencia,
    /** Nível de numerário em espécie (regra de negócio nº 2) — nunca bloqueia venda. */
    NivelAlertaNumerario nivelAlerta,
    /** Controle de jornada operacional: null enquanto o caixa está ABERTO. */
    Long minutosTrabalhados,
    /** Snapshot imutável do valor/hora vigente no fechamento — null se não configurado. */
    BigDecimal valorHoraAplicado,
    /** minutosTrabalhados/60 * valorHoraAplicado — null se valorHoraAplicado for null. */
    BigDecimal valorTotalCalculado
) {

    public static CaixaResponse from(Caixa caixa, BigDecimal saldoEmEspecie, NivelAlertaNumerario nivelAlerta) {
        var valorFinal = caixa.getValorFinalConfirmado();
        var divergencia = valorFinal == null ? null : valorFinal.subtract(saldoEmEspecie);
        var minutosTrabalhados = caixa.getStatus() == StatusCaixa.FECHADO
            ? Duration.between(caixa.getDataAbertura(), caixa.getDataFechamento()).toMinutes()
            : null;

        return new CaixaResponse(
            caixa.getId(),
            caixa.getOperadorId(),
            caixa.getAbertoPorAdminId(),
            caixa.getSaldoInicial(),
            caixa.getStatus(),
            caixa.getDataAbertura(),
            caixa.getDataFechamento(),
            saldoEmEspecie,
            valorFinal,
            caixa.getMotivoFechamento(),
            divergencia,
            nivelAlerta,
            minutosTrabalhados,
            caixa.getValorHoraAplicado(),
            caixa.getValorTotalCalculado());
    }
}
```

- [ ] **Step 5: Rodar e confirmar que passa**

Run: `mvn -f backend/pom.xml test -Dtest=CaixaServiceTest`
Expected: PASS (2 testes verdes).

Run também a suíte inteira para garantir que nada quebrou:
Run: `mvn -f backend/pom.xml test`
Expected: BUILD SUCCESS.

- [ ] **Step 6: Commit**

```bash
git add backend/src/main/java/com/arena/rodeio/service/CaixaService.java backend/src/main/java/com/arena/rodeio/dto/CaixaResponse.java backend/src/test/java/com/arena/rodeio/service/CaixaServiceTest.java
git commit -m "feat(back): calcular e persistir snapshot de jornada no fechamento do caixa"
```

---

### Task 4: `CaixaApi` (frontend) ganha os campos de jornada + util de duração

**Files:**
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/tempo.ts`

**Interfaces:**
- Consumes: os 3 campos novos de `CaixaResponse` (Task 3), já serializados pelo Spring como `minutosTrabalhados: number | null`, `valorHoraAplicado: number | null`, `valorTotalCalculado: number | null`.
- Produces: `CaixaApi` com os 3 campos novos. `formatarDuracao(minutos: number): string` (ex.: `570` → `"9h30"`). Tasks 5, 6 e 7 consomem ambos.

- [ ] **Step 1: Adicionar os campos em `CaixaApi`**

Em `frontend/src/lib/api.ts`, dentro da interface `CaixaApi` (linhas 15-30), adicionar ao final, antes do `}`:

```ts
  /** Controle de jornada operacional: null enquanto o caixa está ABERTO. */
  minutosTrabalhados: number | null;
  /** Snapshot imutável do valor/hora vigente no fechamento — null se não configurado. */
  valorHoraAplicado: number | null;
  /** minutosTrabalhados/60 * valorHoraAplicado — null se valorHoraAplicado for null. */
  valorTotalCalculado: number | null;
```

- [ ] **Step 2: Criar `frontend/src/lib/tempo.ts`**

```ts
/**
 * Formata minutos trabalhados no formato falado do rodeio ("9h30", "0h45"),
 * usado no comprovante de fechamento, Histórico de Turnos e Scorecard.
 */
export function formatarDuracao(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = minutos % 60;
  return `${horas}h${minutosRestantes.toString().padStart(2, "0")}`;
}
```

- [ ] **Step 3: Verificar que o projeto ainda compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros (0 exit code) — os dois arquivos são aditivos, nada consome ainda os campos novos.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/lib/api.ts frontend/src/lib/tempo.ts
git commit -m "feat(front): campos de jornada em CaixaApi e util formatarDuracao"
```

---

### Task 5: "Resumo Operacional" no comprovante de fechamento

**Files:**
- Modify: `frontend/src/pages/GerenciamentoEquipe.tsx`

**Interfaces:**
- Consumes: `CaixaApi.minutosTrabalhados/valorHoraAplicado/valorTotalCalculado` (Task 4), `formatarDuracao` (Task 4), `formatarCentavos`/`reaisParaCentavos` (já existentes em `lib/moeda.ts`).
- Produces: nada consumido por outras tasks (ponta de UI).

- [ ] **Step 1: Adicionar o import de `formatarDuracao`**

Em `frontend/src/pages/GerenciamentoEquipe.tsx`, linha 21, trocar:

```ts
import { formatarCentavos, reaisParaCentavos } from "../lib/moeda";
```

por:

```ts
import { formatarCentavos, reaisParaCentavos } from "../lib/moeda";
import { formatarDuracao } from "../lib/tempo";
```

- [ ] **Step 2: Adicionar a seção "Resumo Operacional" em `ComprovanteFechamento`**

Dentro da função `ComprovanteFechamento` (linhas 88-157), inserir uma nova seção depois do `</dl>` (linha 149) e antes do botão "Concluir" (linha 152), formatando a hora local a partir de `caixa.dataAbertura`/`caixa.dataFechamento` (ISO string vindo do back-end):

```tsx
      {caixa.dataFechamento && (
        <div className="material-rotulo mt-4 rounded-xl bg-arena-900 p-6">
          <p className="font-display text-lg text-gold-300">Resumo Operacional</p>
          <dl className="mt-3 space-y-3">
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-leather-300">Entrada</dt>
              <dd className="num-tabular text-sm font-semibold text-leather-200">
                {new Date(caixa.dataAbertura).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </dd>
            </div>
            <div className="flex items-center justify-between gap-4">
              <dt className="text-sm text-leather-300">Saída</dt>
              <dd className="num-tabular text-sm font-semibold text-leather-200">
                {new Date(caixa.dataFechamento).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}
              </dd>
            </div>
            {caixa.minutosTrabalhados !== null && (
              <div className="flex items-center justify-between gap-4">
                <dt className="text-sm text-leather-300">Horas</dt>
                <dd className="num-tabular text-sm font-semibold text-leather-200">
                  {formatarDuracao(caixa.minutosTrabalhados)}
                </dd>
              </div>
            )}

            <div className="flex items-center justify-between gap-4 border-t-2 border-gold-500/40 pt-3">
              <dt className="text-sm font-semibold text-leather-200">Valor devido</dt>
              {caixa.valorTotalCalculado === null ? (
                <dd className="text-sm text-steel-400">Valor/hora não configurado para esta área</dd>
              ) : (
                <dd className="num-tabular text-lg font-bold text-gold-300">
                  {formatarCentavos(reaisParaCentavos(caixa.valorTotalCalculado))}
                  <span className="ml-2 text-xs font-normal text-steel-400">
                    ({formatarCentavos(reaisParaCentavos(caixa.valorHoraAplicado ?? 0))}/h)
                  </span>
                </dd>
              )}
            </div>
          </dl>
        </div>
      )}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Verificação manual no navegador**

Run: `cd frontend && npm run dev`

Abrir `/admin-dashboard/equipe`, fechar um caixa de teste (com valor/hora global já configurado em algum evento anterior de teste, ou configurar via botão VALORES antes) e confirmar visualmente que o comprovante mostra Entrada/Saída/Horas/Valor devido corretamente, e que sem valor/hora configurado aparece a mensagem "Valor/hora não configurado para esta área" sem travar a tela.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/pages/GerenciamentoEquipe.tsx
git commit -m "feat(front): resumo operacional (horas x valor) no comprovante de fechamento"
```

---

### Task 6: Página "Histórico de Turnos"

**Files:**
- Create: `frontend/src/hooks/useHistoricoTurnos.ts`
- Create: `frontend/src/pages/HistoricoTurnos.tsx`
- Modify: `frontend/src/components/icons.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/components/navigation/Sidebar.tsx`
- Modify: `frontend/src/pages/AdminLandingPage.tsx`

**Interfaces:**
- Consumes: `listarCaixasFechados()`/`listarFuncionarios()` (já existentes em `lib/api.ts`), `extrairAreasDisponiveis` (já existente em `hooks/useGerenciamentoEquipe.ts`), `formatarDuracao` (Task 4).
- Produces: nada consumido por outras tasks (ponta de UI/rota).

- [ ] **Step 1: Criar o ícone `RelogioIcon`**

Em `frontend/src/components/icons.tsx`, adicionar ao final do arquivo (mesmo estilo SVG stroke 1.8 `currentColor` dos demais ícones):

```tsx
/** Relógio de bolso — Histórico de Turnos (jornada operacional). */
export function RelogioIcon({ className = "h-5 w-5" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" aria-hidden>
      <circle cx={12} cy={13} r={8} stroke="currentColor" strokeWidth={1.8} />
      <path d="M12 9v4l3 2" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.5 2.5h5M12 2.5V5" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" />
    </svg>
  );
}
```

- [ ] **Step 2: Criar o hook `useHistoricoTurnos.ts`**

```ts
import { useCallback, useEffect, useMemo, useState } from "react";
import { listarCaixasFechados, listarFuncionarios, ApiError } from "../lib/api";
import { extrairAreasDisponiveis } from "./useGerenciamentoEquipe";

export interface TurnoOperador {
  caixaId: string;
  operadorNome: string;
  operadorFotoUrl: string | null;
  areaTrabalho: string | null;
  dataAbertura: string;
  dataFechamento: string;
  minutosTrabalhados: number | null;
  valorHoraAplicado: number | null;
  valorTotalCalculado: number | null;
}

/**
 * Histórico de Turnos: lista linha-a-linha de cada caixa fechado, com o
 * resumo de jornada (horas x valor/hora) calculado no back-end no momento
 * do fechamento. Mesmo padrão de agregação de useScorecard.ts (busca
 * funcionários + caixas fechados em paralelo, junta por operadorId).
 */
export function useHistoricoTurnos() {
  const [turnos, setTurnos] = useState<TurnoOperador[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [areaSelecionada, setAreaSelecionada] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [funcionarios, caixasFechados] = await Promise.all([
        listarFuncionarios(),
        listarCaixasFechados(),
      ]);

      const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));

      setTurnos(
        caixasFechados
          .filter((caixa) => caixa.dataFechamento !== null)
          .map((caixa): TurnoOperador => {
            const operador = funcionarioPorId.get(caixa.operadorId);
            return {
              caixaId: caixa.id,
              operadorNome: operador?.nomeCompleto || operador?.email || "Operador removido",
              operadorFotoUrl: operador?.fotoUrl ?? null,
              areaTrabalho: operador?.areaTrabalho ?? null,
              dataAbertura: caixa.dataAbertura,
              dataFechamento: caixa.dataFechamento as string,
              minutosTrabalhados: caixa.minutosTrabalhados,
              valorHoraAplicado: caixa.valorHoraAplicado,
              valorTotalCalculado: caixa.valorTotalCalculado,
            };
          })
          .sort((a, b) => b.dataFechamento.localeCompare(a.dataFechamento)),
      );
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o histórico de turnos.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const areasDisponiveis = useMemo(() => extrairAreasDisponiveis(turnos.map((t) => ({ areaTrabalho: t.areaTrabalho }))), [turnos]);

  const turnosFiltrados = useMemo(
    () => (areaSelecionada ? turnos.filter((t) => t.areaTrabalho === areaSelecionada) : turnos),
    [turnos, areaSelecionada],
  );

  return {
    turnos: turnosFiltrados,
    totalTurnos: turnos.length,
    areasDisponiveis,
    areaSelecionada,
    setAreaSelecionada,
    carregando,
    erro,
    limparErro: () => setErro(null),
  };
}
```

- [ ] **Step 3: Criar a página `HistoricoTurnos.tsx`**

```tsx
import Alerta from "../components/ui/Alerta";
import Avatar from "../components/ui/Avatar";
import FiltroArea from "../components/ui/FiltroArea";
import { Carregando } from "../components/ui/interacoes";
import { RelogioIcon, PlacaIcon } from "../components/icons";
import { useHistoricoTurnos } from "../hooks/useHistoricoTurnos";
import { formatarCentavos, reaisParaCentavos } from "../lib/moeda";
import { formatarDuracao } from "../lib/tempo";

function formatarHora(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function formatarDataCurta(iso: string): string {
  return new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
}

/**
 * Histórico de Turnos (Admin): cada caixa fechado com entrada, saída, horas
 * trabalhadas e valor devido — comprovante operacional linha-a-linha, base
 * para uma futura folha de pagamento (sem substituí-la agora).
 */
export default function HistoricoTurnos() {
  const { turnos, totalTurnos, areasDisponiveis, areaSelecionada, setAreaSelecionada, carregando, erro, limparErro } =
    useHistoricoTurnos();

  return (
    <>
      <h1 className="flex items-center gap-3 font-display text-2xl text-gold-300 md:text-3xl">
        <RelogioIcon className="h-6 w-6 text-gold-400" />
        Histórico de Turnos
      </h1>
      <p className="mt-1 text-[15px] text-leather-300">
        Entrada, saída, horas trabalhadas e valor devido de cada turno já fechado.
      </p>

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {!carregando && totalTurnos > 0 && (
        <div className="mt-6 flex gap-2 overflow-x-auto pb-1">
          <FiltroArea rotulo="Todos" ativo={areaSelecionada === null} onClick={() => setAreaSelecionada(null)} />
          {areasDisponiveis.map((area) => (
            <FiltroArea
              key={area}
              rotulo={area}
              ativo={areaSelecionada === area}
              onClick={() => setAreaSelecionada(area)}
            />
          ))}
        </div>
      )}

      {carregando ? (
        <Carregando rotulo="Carregando histórico..." />
      ) : turnos.length === 0 ? (
        <div className="mt-8 flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
          <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
          Nenhum turno fechado ainda — o histórico aparece a partir do primeiro fechamento.
        </div>
      ) : (
        <div className="mt-6 overflow-x-auto rounded-xl border border-leather-600/40 bg-wood-900 shadow-arena">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-leather-600/40 text-xs uppercase tracking-wide text-steel-400">
                <th className="px-4 py-3 font-semibold">Operador</th>
                <th className="px-4 py-3 font-semibold">Data</th>
                <th className="px-4 py-3 font-semibold">Entrada</th>
                <th className="px-4 py-3 font-semibold">Saída</th>
                <th className="px-4 py-3 font-semibold">Horas</th>
                <th className="px-4 py-3 font-semibold">Valor/hora</th>
                <th className="px-4 py-3 text-right font-semibold">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-leather-600/20">
              {turnos.map((turno) => (
                <tr key={turno.caixaId}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <Avatar nome={turno.operadorNome} fotoUrl={turno.operadorFotoUrl} tamanho="md" />
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-leather-200">{turno.operadorNome}</p>
                        <p className="truncate text-xs text-steel-400">{turno.areaTrabalho || "Área não informada"}</p>
                      </div>
                    </div>
                  </td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{formatarDataCurta(turno.dataFechamento)}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{formatarHora(turno.dataAbertura)}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">{formatarHora(turno.dataFechamento)}</td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {turno.minutosTrabalhados !== null ? formatarDuracao(turno.minutosTrabalhados) : "—"}
                  </td>
                  <td className="num-tabular px-4 py-3 text-leather-300">
                    {turno.valorHoraAplicado !== null ? `${formatarCentavos(reaisParaCentavos(turno.valorHoraAplicado))}/h` : "—"}
                  </td>
                  <td className="num-tabular px-4 py-3 text-right font-bold text-gold-300">
                    {turno.valorTotalCalculado !== null ? formatarCentavos(reaisParaCentavos(turno.valorTotalCalculado)) : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
```

- [ ] **Step 4: Adicionar a rota em `App.tsx`**

Adicionar o import (junto aos outros `import Admin...` em `App.tsx`):

```ts
import HistoricoTurnos from "./pages/HistoricoTurnos";
```

Adicionar a rota dentro do bloco `<Route element={<ProtectedRoute perfisPermitidos={["MASTER_ADMIN"]}>...` (depois da linha `<Route path="/admin-dashboard/scorecard" element={<AdminScorecard />} />`):

```tsx
            <Route path="/admin-dashboard/historico-turnos" element={<HistoricoTurnos />} />
```

- [ ] **Step 5: Adicionar o item na Sidebar**

Em `frontend/src/components/navigation/Sidebar.tsx`, importar `RelogioIcon`:

```ts
import {
  BrasaoIcon,
  DistintivoIcon,
  HorseshoeIcon,
  LivroCaixaIcon,
  PlacaIcon,
  RelogioIcon,
  SetaEsquerdaIcon,
} from "../icons";
```

Adicionar o item em `ITENS_OPERACAO` (depois de "Scorecard"):

```ts
  { rotulo: "Histórico de Turnos", icone: RelogioIcon, rota: "/admin-dashboard/historico-turnos" },
```

- [ ] **Step 6: Adicionar o card na landing do Admin**

Em `frontend/src/pages/AdminLandingPage.tsx`, importar `RelogioIcon`:

```ts
import {
  DistintivoIcon,
  HorseshoeIcon,
  LivroCaixaIcon,
  PlacaIcon,
  RelogioIcon,
  SetaDireitaIcon,
} from "../components/icons";
```

Adicionar um novo card depois do card "Scorecard de Operadores" (depois da linha `</Link>` que fecha o card do Scorecard, linha 90), dentro do mesmo `<div className="mt-8 grid gap-5 lg:grid-cols-3">`:

```tsx
        {/* Ação secundária: relatório de jornada */}
        <Link
          to="/admin-dashboard/historico-turnos"
          className="group flex flex-col justify-between gap-6 rounded-xl border border-leather-600/40 bg-wood-900 p-7 shadow-arena transition-colors duration-200 ease-couro hover:border-gold-400 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-gold-400/30"
        >
          <div>
            <RelogioIcon className="h-9 w-9 text-leather-300 transition-colors duration-200 group-hover:text-gold-400" />
            <h3 className="mt-4 font-display text-xl text-gold-300">Histórico de Turnos</h3>
            <p className="mt-2 text-[15px] leading-relaxed text-leather-300">
              Entrada, saída, horas trabalhadas e valor devido de cada turno já fechado.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-gold-400">
            Ver turnos
            <SetaDireitaIcon className="h-4 w-4 transition-transform duration-200 ease-couro group-hover:translate-x-1" />
          </span>
        </Link>
```

- [ ] **Step 7: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 8: Verificação manual no navegador**

Run: `cd frontend && npm run dev`

Navegar até `/admin-dashboard/historico-turnos` pela sidebar e pelo card da landing, confirmar que a tabela lista os turnos fechados com as colunas corretas, o filtro por área funciona, e o estado vazio aparece quando não há fechamentos.

- [ ] **Step 9: Commit**

```bash
git add frontend/src/hooks/useHistoricoTurnos.ts frontend/src/pages/HistoricoTurnos.tsx frontend/src/components/icons.tsx frontend/src/App.tsx frontend/src/components/navigation/Sidebar.tsx frontend/src/pages/AdminLandingPage.tsx
git commit -m "feat(front): pagina Historico de Turnos (entrada, saida, horas, valor devido)"
```

---

### Task 7: Scorecard ganha horas e valor devido agregados

**Files:**
- Modify: `frontend/src/hooks/useScorecard.ts`
- Modify: `frontend/src/pages/AdminScorecard.tsx`

**Interfaces:**
- Consumes: `CaixaApi.minutosTrabalhados/valorTotalCalculado` (Task 4), `formatarDuracao` (Task 4).
- Produces: nada consumido por outras tasks (ponta de UI).

- [ ] **Step 1: Estender `FechamentoOperador` e `OperadorScorecard` em `useScorecard.ts`**

Em `frontend/src/hooks/useScorecard.ts`, trocar a interface `FechamentoOperador` (linhas 5-9) por:

```ts
export interface FechamentoOperador {
  caixaId: string;
  dataFechamento: string;
  divergenciaCentavos: number;
  /** null quando não havia valor/hora configurado neste fechamento — não soma, não zera. */
  minutosTrabalhados: number | null;
  /** null quando não havia valor/hora configurado neste fechamento — não soma, não zera. */
  valorTotalCalculadoCentavos: number | null;
}
```

Trocar a interface `OperadorScorecard` (linhas 11-21) por:

```ts
export interface OperadorScorecard {
  id: string;
  nome: string;
  fotoUrl: string | null;
  areaTrabalho: string | null;
  totalFechamentos: number;
  /** Soma de todas as divergências: positivo = sobra acumulada, negativo = falta acumulada. */
  somaDivergenciaCentavos: number;
  /** Valor absoluto que se repetiu 2+ vezes nas faltas/sobras — padrão a investigar (regra de negócio nº 3). */
  padraoRecorrenteCentavos: number | null;
  /** Soma apenas dos turnos com snapshot de jornada — turnos sem valor/hora configurado são ignorados, não zerados. */
  totalMinutosTrabalhados: number;
  /** Idem: soma apenas dos turnos com valorTotalCalculado != null. */
  totalValorDevidoCentavos: number;
}
```

- [ ] **Step 2: Popular os campos novos no `carregar()`**

Dentro de `carregar()`, no loop que monta `fechamentosPorOperador` (linhas 63-72), trocar por:

```ts
      const fechamentosPorOperador = new Map<string, FechamentoOperador[]>();
      for (const caixa of caixasFechados) {
        if (caixa.divergencia === null || !caixa.dataFechamento) continue;
        const fechamentos = fechamentosPorOperador.get(caixa.operadorId) ?? [];
        fechamentos.push({
          caixaId: caixa.id,
          dataFechamento: caixa.dataFechamento,
          divergenciaCentavos: reaisParaCentavos(caixa.divergencia),
          minutosTrabalhados: caixa.minutosTrabalhados,
          valorTotalCalculadoCentavos:
            caixa.valorTotalCalculado === null ? null : reaisParaCentavos(caixa.valorTotalCalculado),
        });
        fechamentosPorOperador.set(caixa.operadorId, fechamentos);
      }
```

E, no `.map((f): OperadorScorecard => {...})` (linhas 77-91), adicionar os dois campos novos ao objeto retornado (a soma ignora `null`, nunca trata como zero):

```ts
          .map((f): OperadorScorecard => {
            const fechamentos = fechamentosPorOperador.get(f.id) ?? [];
            return {
              id: f.id,
              nome: f.nomeCompleto || f.email,
              fotoUrl: f.fotoUrl,
              areaTrabalho: f.areaTrabalho,
              totalFechamentos: fechamentos.length,
              somaDivergenciaCentavos: fechamentos.reduce(
                (soma, fechamento) => soma + fechamento.divergenciaCentavos,
                0,
              ),
              padraoRecorrenteCentavos: detectarPadraoRecorrente(fechamentos),
              totalMinutosTrabalhados: fechamentos.reduce(
                (soma, fechamento) => soma + (fechamento.minutosTrabalhados ?? 0),
                0,
              ),
              totalValorDevidoCentavos: fechamentos.reduce(
                (soma, fechamento) => soma + (fechamento.valorTotalCalculadoCentavos ?? 0),
                0,
              ),
            };
          })
```

- [ ] **Step 2b: Nota sobre o `?? 0` acima**

`fechamento.minutosTrabalhados ?? 0` e `valorTotalCalculadoCentavos ?? 0` são seguros aqui porque o efeito é **aditivo dentro de um reduce**: somar zero a um turno sem snapshot não altera o total acumulado dos demais turnos (ao contrário de exibir um único turno como "R$ 0,00", que seria enganoso). Isso satisfaz a regra "ignorar, não zerar" da spec sem precisar filtrar a lista antes.

- [ ] **Step 3: Exibir os novos totais em `AdminScorecard.tsx`**

Em `frontend/src/pages/AdminScorecard.tsx`, adicionar o import:

```ts
import { formatarDuracao } from "../lib/tempo";
```

Na função `ScorecardCard`, adicionar duas novas células dentro do mesmo `<dl className="grid grid-cols-2 gap-3 ...">` (depois da `dd` de "Divergência acumulada", linha 46) — como o grid já é de 2 colunas, os 2 itens novos simplesmente formam uma segunda linha, sem mudar nenhuma classe:

```tsx
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-arena-800 px-4 py-3">
        <div>
          <dt className="text-xs text-steel-400">Fechamentos</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">
            {operador.totalFechamentos}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Divergência acumulada</dt>
          <dd className={`num-tabular text-lg font-semibold ${corDivergencia}`}>
            {divergencia === 0
              ? "Conferido"
              : `${divergencia > 0 ? "+" : "−"}${formatarCentavos(Math.abs(divergencia))}`}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-steel-400">Horas trabalhadas</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">
            {formatarDuracao(operador.totalMinutosTrabalhados)}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Valor devido</dt>
          <dd className="num-tabular text-lg font-semibold text-gold-300">
            {formatarCentavos(operador.totalValorDevidoCentavos)}
          </dd>
        </div>
      </dl>
```

- [ ] **Step 4: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 5: Verificação manual no navegador**

Run: `cd frontend && npm run dev`

Abrir `/admin-dashboard/scorecard` e confirmar que cada card de operador mostra "Horas trabalhadas" e "Valor devido" além da divergência já existente, e que operadores sem nenhum turno com valor/hora configurado mostram `0h00`/`R$ 0,00` corretamente (não erro).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/hooks/useScorecard.ts frontend/src/pages/AdminScorecard.tsx
git commit -m "feat(front): horas e valor devido agregados no Scorecard de operadores"
```

---

## Nota de implementação (desvio consciente da spec)

A spec original ([2026-07-04-jornada-operacional-design.md](../specs/2026-07-04-jornada-operacional-design.md)) descrevia o comprovante como um modal novo (`ResumoOperacionalModal.tsx`). Ao mapear os arquivos reais (Task 5), descobrimos que `GerenciamentoEquipe.tsx` já tem um `ComprovanteFechamento` que abre automaticamente como a "segunda tela pós-fechamento" (mostrando a divergência). Criar um SEGUNDO modal novo empilharia duas telas de comprovante seguidas — pior UX e duplicação de componente. A Task 5 portanto **estende o `ComprovanteFechamento` existente** com a seção "Resumo Operacional", preservando a intenção da spec (jornada visível logo após o fechamento) sem duplicar telas. Nenhuma outra decisão da spec muda.
