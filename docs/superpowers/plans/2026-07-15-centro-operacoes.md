# Centro de Operações do Evento Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir o grid de cards de navegação da landing do Admin (`/admin-dashboard`) por um "Centro de Operações do Evento" — KPIs, painéis e feed de atividade, tudo com dados reais já existentes (+ um endpoint novo mínimo de sangrias), sem gráfico, sem navegação estrutural (que já é 100% da Sidebar).

**Architecture:** Um hook único (`useCentroOperacoes.ts`) agrega em paralelo 5 fontes (4 já existentes + `GET /api/caixas/sangrias`, novo) e computa KPIs/painéis/feed no cliente — mesmo padrão de `useScorecard.ts`/`useHistoricoTurnos.ts`. `AdminLandingPage.tsx` vira a página de composição sobre 7 componentes novos em `frontend/src/components/dashboard/`.

**Tech Stack:** Java 21 / Spring Boot 3 (backend, 1 endpoint de leitura novo), React 18 + TypeScript + Vite (frontend).

## Global Constraints

- Nenhum botão de navegação estrutural na página — toda navegação estrutural é exclusiva da Sidebar. Links contextuais dentro de painéis de dados (ex.: "Ver Scorecard →") são permitidos.
- Zero gráfico. Zero dado fictício — tudo deriva de endpoints reais.
- Dinheiro é sempre `BigDecimal` no backend (scale 2, `HALF_EVEN`); no frontend, sempre centavos inteiros (`reaisParaCentavos`/`formatarCentavos`) — regra inegociável nº 1.
- RBAC: o endpoint novo usa `@PreAuthorize("hasRole('MASTER_ADMIN')")`, nunca só `authenticated()` — regra inegociável nº 6.
- UI Rodeio Premium: `num-tabular` em todo valor monetário/contagem, ícones SVG próprios de `components/icons.tsx` (nenhum ícone novo é necessário nesta feature — todos já existem), stagger de entrada "galope" (`animate-fade-in-up` + 60ms por item) em listas, sem spinner genérico (`<Carregando>`).
- Toda decisão de arquitetura está detalhada em [docs/superpowers/specs/2026-07-15-centro-operacoes-design.md](../specs/2026-07-15-centro-operacoes-design.md) — consulte se algo aqui parecer ambíguo.

---

### Task 1: Backend — `GET /api/caixas/sangrias`

**Files:**
- Modify: `backend/src/main/java/com/arena/rodeio/repository/SangriaRepository.java`
- Create: `backend/src/main/java/com/arena/rodeio/dto/SangriaResumoResponse.java`
- Modify: `backend/src/main/java/com/arena/rodeio/service/CaixaService.java`
- Modify: `backend/src/main/java/com/arena/rodeio/controller/CaixaController.java`
- Test: `backend/src/test/java/com/arena/rodeio/service/CaixaServiceTest.java`

**Interfaces:**
- Consumes: `Sangria.getId()/getCaixa()/getValor()/getRegistradaEm()` (já existem), `Caixa.getId()/getOperadorId()` (já existem).
- Produces: `SangriaResumoResponse(UUID id, UUID caixaId, UUID operadorId, BigDecimal valor, Instant registradaEm)`, `CaixaService.listarTodasSangrias(): List<SangriaResumoResponse>`, endpoint `GET /api/caixas/sangrias`. Task 2 (frontend) consome esse endpoint.

- [ ] **Step 1: Escrever o teste que falha**

Adicionar ao final de `CaixaServiceTest.java` (antes do `}` final), e adicionar `import java.util.List;` e `import com.arena.rodeio.model.Sangria;` ao topo do arquivo junto aos imports já existentes:

```java
    @Test
    void listarTodasSangrias_retornaResumoComOperadorIdDoCaixa() {
        var operadorId = UUID.randomUUID();
        var caixaId = UUID.randomUUID();
        var sangriaId = UUID.randomUUID();
        var agora = Instant.now();

        var caixa = mock(Caixa.class);
        when(caixa.getId()).thenReturn(caixaId);
        when(caixa.getOperadorId()).thenReturn(operadorId);

        var sangria = mock(Sangria.class);
        when(sangria.getId()).thenReturn(sangriaId);
        when(sangria.getCaixa()).thenReturn(caixa);
        when(sangria.getValor()).thenReturn(new BigDecimal("50.00"));
        when(sangria.getRegistradaEm()).thenReturn(agora);

        when(sangriaRepository.findAllByOrderByRegistradaEmDesc()).thenReturn(List.of(sangria));

        var resultado = service.listarTodasSangrias();

        assertThat(resultado).hasSize(1);
        var resumo = resultado.get(0);
        assertThat(resumo.id()).isEqualTo(sangriaId);
        assertThat(resumo.caixaId()).isEqualTo(caixaId);
        assertThat(resumo.operadorId()).isEqualTo(operadorId);
        assertThat(resumo.valor()).isEqualByComparingTo("50.00");
        assertThat(resumo.registradaEm()).isEqualTo(agora);
    }
```

- [ ] **Step 2: Rodar e confirmar que falha**

Run: `mvn -f backend/pom.xml test -Dtest=CaixaServiceTest`
Expected: FAIL — erro de compilação (`sangriaRepository.findAllByOrderByRegistradaEmDesc()` e `service.listarTodasSangrias()` não existem ainda).

- [ ] **Step 3: Adicionar o método ao `SangriaRepository`**

Substituir `backend/src/main/java/com/arena/rodeio/repository/SangriaRepository.java` inteiro por:

```java
package com.arena.rodeio.repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.arena.rodeio.model.Sangria;

public interface SangriaRepository extends JpaRepository<Sangria, UUID> {

    @Query("""
        select coalesce(sum(s.valor), 0)
        from Sangria s
        where s.caixa.id = :caixaId
        """)
    BigDecimal somarPorCaixa(@Param("caixaId") UUID caixaId);

    /** Mais recente primeiro — alimenta o Activity Feed do Centro de Operações. */
    List<Sangria> findAllByOrderByRegistradaEmDesc();
}
```

- [ ] **Step 4: Criar `SangriaResumoResponse.java`**

```java
package com.arena.rodeio.dto;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.UUID;

import com.arena.rodeio.model.Sangria;

/**
 * Versão enxuta de SangriaResponse para listagens (Activity Feed do Centro
 * de Operações): sem saldoEmEspecie, que exigiria recalcular o saldo
 * retroativo de cada caixa a cada sangria — caro e desnecessário aqui.
 */
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

- [ ] **Step 5: Adicionar o método ao `CaixaService`**

Em `backend/src/main/java/com/arena/rodeio/service/CaixaService.java`, adicionar o import `import com.arena.rodeio.dto.SangriaResumoResponse;` junto aos outros imports de `dto`, e adicionar o método logo depois de `registrarSangria` (depois da linha 94, antes do comentário `/** Fechamento de caixa...`):

```java
    /**
     * Lista todas as sangrias já registradas, mais recentes primeiro —
     * alimenta o Activity Feed do Centro de Operações do Evento. Resumo
     * enxuto (sem saldoEmEspecie) porque o feed só precisa mostrar
     * "quanto, quando, de qual operador".
     */
    @Transactional(readOnly = true)
    public List<SangriaResumoResponse> listarTodasSangrias() {
        return sangriaRepository.findAllByOrderByRegistradaEmDesc().stream()
            .map(SangriaResumoResponse::from)
            .toList();
    }
```

- [ ] **Step 6: Adicionar o endpoint ao `CaixaController`**

Em `backend/src/main/java/com/arena/rodeio/controller/CaixaController.java`, adicionar o import `import com.arena.rodeio.dto.SangriaResumoResponse;`, e adicionar o endpoint logo depois de `listarFechados()` (depois da linha 130, antes do método privado `usuarioId`):

```java
    /** Lista todas as sangrias já registradas — Activity Feed do Centro de Operações. */
    @GetMapping("/sangrias")
    @PreAuthorize("hasRole('MASTER_ADMIN')")
    public List<SangriaResumoResponse> listarSangrias() {
        return caixaService.listarTodasSangrias();
    }
```

- [ ] **Step 7: Rodar e confirmar que passa**

Run: `mvn -f backend/pom.xml test -Dtest=CaixaServiceTest`
Expected: PASS (3 testes verdes).

Run também a suíte inteira:
Run: `mvn -f backend/pom.xml test`
Expected: BUILD SUCCESS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/main/java/com/arena/rodeio/repository/SangriaRepository.java backend/src/main/java/com/arena/rodeio/dto/SangriaResumoResponse.java backend/src/main/java/com/arena/rodeio/service/CaixaService.java backend/src/main/java/com/arena/rodeio/controller/CaixaController.java backend/src/test/java/com/arena/rodeio/service/CaixaServiceTest.java
git commit -m "feat(back): endpoint de listagem de sangrias para o Centro de Operacoes"
```

---

### Task 2: Frontend — `ehHoje` + `listarSangrias`

**Files:**
- Modify: `frontend/src/lib/tempo.ts`
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: `GET /api/caixas/sangrias` (Task 1).
- Produces: `ehHoje(iso: string): boolean`, `SangriaResumoApi { id, caixaId, operadorId, valor, registradaEm }`, `listarSangrias(): Promise<SangriaResumoApi[]>`. Task 3 consome ambos.

- [ ] **Step 1: Adicionar `ehHoje` a `frontend/src/lib/tempo.ts`**

Adicionar ao final do arquivo:

```ts

/** Compara só a data (dia local), ignorando hora — usado nos KPIs "hoje" do Centro de Operações. */
export function ehHoje(iso: string): boolean {
  return new Date(iso).toDateString() === new Date().toDateString();
}
```

- [ ] **Step 2: Adicionar `SangriaResumoApi` a `frontend/src/lib/api.ts`**

Adicionar logo depois da interface `SangriaApi` (depois da linha 56):

```ts

export interface SangriaResumoApi {
  id: string;
  caixaId: string;
  operadorId: string;
  valor: number;
  registradaEm: string;
}
```

- [ ] **Step 3: Adicionar `listarSangrias` a `frontend/src/lib/api.ts`**

Adicionar logo depois da função `listarCaixasFechados` (depois da linha 287):

```ts

/** Exclusivo do Admin — Activity Feed do Centro de Operações do Evento. */
export function listarSangrias(): Promise<SangriaResumoApi[]> {
  return request<SangriaResumoApi[]>("/api/caixas/sangrias", "GET") as Promise<SangriaResumoApi[]>;
}
```

- [ ] **Step 4: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros — mudanças puramente aditivas, nada consome ainda.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/tempo.ts frontend/src/lib/api.ts
git commit -m "feat(front): ehHoje e listarSangrias para o Centro de Operacoes"
```

---

### Task 3: Frontend — hook `useCentroOperacoes`

**Files:**
- Create: `frontend/src/hooks/useCentroOperacoes.ts`

**Interfaces:**
- Consumes: `listarCaixasAbertos`, `listarCaixasFechados`, `listarFuncionarios`, `listarSosAbertos` (já existentes), `listarSangrias` (Task 2), `ehHoje` (Task 2), `reaisParaCentavos` (já existente).
- Produces:
  ```ts
  export interface CaixaAbertoResumo {
    caixaId: string;
    operadorNome: string;
    operadorFotoUrl: string | null;
    nivelAlerta: NivelAlertaNumerario;
  }

  export type TipoEventoAtividade = "ABERTURA" | "FECHAMENTO" | "SANGRIA" | "SOS";

  export interface EventoAtividade {
    id: string;
    tipo: TipoEventoAtividade;
    horario: string;
    operadorNome: string;
    valorCentavos: number | null;
    divergenciaCentavos: number | null;
    categoriaSos: CategoriaSos | null;
  }

  export interface CentroOperacoesData {
    caixasAbertosCount: number;
    especieAgoraCentavos: number;
    operadoresEmAlertaCount: number;
    valorDevidoHojeCentavos: number;
    divergenciaHojeCentavos: number;
    totalOperadoresAtivos: number;
    caixasAbertos: CaixaAbertoResumo[];
    eventos: EventoAtividade[];
  }

  export function useCentroOperacoes(): {
    dados: CentroOperacoesData | null;
    carregando: boolean;
    erro: string | null;
    limparErro: () => void;
  }
  ```
  Tasks 5, 6 e 7 consomem esses tipos.

- [ ] **Step 1: Criar o arquivo**

```ts
import { useCallback, useEffect, useState } from "react";
import {
  listarCaixasAbertos,
  listarCaixasFechados,
  listarFuncionarios,
  listarSosAbertos,
  listarSangrias,
  ApiError,
} from "../lib/api";
import { reaisParaCentavos } from "../lib/moeda";
import { ehHoje } from "../lib/tempo";
import type { CategoriaSos } from "../lib/sos";
import type { NivelAlertaNumerario } from "../lib/numerario";

export interface CaixaAbertoResumo {
  caixaId: string;
  operadorNome: string;
  operadorFotoUrl: string | null;
  nivelAlerta: NivelAlertaNumerario;
}

export type TipoEventoAtividade = "ABERTURA" | "FECHAMENTO" | "SANGRIA" | "SOS";

export interface EventoAtividade {
  id: string;
  tipo: TipoEventoAtividade;
  horario: string;
  operadorNome: string;
  /** Só para SANGRIA — centavos, null quando não se aplica. */
  valorCentavos: number | null;
  /** Só para FECHAMENTO — null quando não houve contagem. */
  divergenciaCentavos: number | null;
  /** Só para SOS. */
  categoriaSos: CategoriaSos | null;
}

export interface CentroOperacoesData {
  caixasAbertosCount: number;
  especieAgoraCentavos: number;
  operadoresEmAlertaCount: number;
  valorDevidoHojeCentavos: number;
  divergenciaHojeCentavos: number;
  totalOperadoresAtivos: number;
  caixasAbertos: CaixaAbertoResumo[];
  eventos: EventoAtividade[];
}

/**
 * Centro de Operações do Evento (Admin): agrega 5 fontes reais em paralelo
 * (caixas abertos, caixas fechados, funcionários, SOS abertos, sangrias) e
 * computa KPIs/painéis/feed no cliente — mesmo padrão de useScorecard.ts e
 * useHistoricoTurnos.ts. Nenhum endpoint de resumo pré-computado.
 */
export function useCentroOperacoes() {
  const [dados, setDados] = useState<CentroOperacoesData | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setCarregando(true);
    setErro(null);
    try {
      const [caixasAbertos, caixasFechados, funcionarios, sosAbertos, sangrias] = await Promise.all([
        listarCaixasAbertos(),
        listarCaixasFechados(),
        listarFuncionarios(),
        listarSosAbertos(),
        listarSangrias(),
      ]);

      const funcionarioPorId = new Map(funcionarios.map((f) => [f.id, f]));
      const nomeOperador = (id: string) => {
        const f = funcionarioPorId.get(id);
        return f?.nomeCompleto || f?.email || "Operador removido";
      };

      const especieAgoraCentavos = caixasAbertos.reduce(
        (soma, caixa) => soma + reaisParaCentavos(caixa.saldoEmEspecie),
        0,
      );
      const operadoresEmAlertaCount = caixasAbertos.filter((c) => c.nivelAlerta !== "NORMAL").length;

      const fechamentosHoje = caixasFechados.filter((c) => c.dataFechamento !== null && ehHoje(c.dataFechamento));
      const divergenciaHojeCentavos = fechamentosHoje.reduce(
        (soma, c) => soma + (c.divergencia === null ? 0 : reaisParaCentavos(c.divergencia)),
        0,
      );
      const valorDevidoHojeCentavos = fechamentosHoje.reduce(
        (soma, c) => soma + (c.valorTotalCalculado === null ? 0 : reaisParaCentavos(c.valorTotalCalculado)),
        0,
      );

      const totalOperadoresAtivos = funcionarios.filter(
        (f) => f.perfilAcesso === "OPERADOR" && f.statusAprovacao === "APROVADO" && f.ativo,
      ).length;

      const caixasAbertosResumo: CaixaAbertoResumo[] = caixasAbertos.map((c) => ({
        caixaId: c.id,
        operadorNome: nomeOperador(c.operadorId),
        operadorFotoUrl: funcionarioPorId.get(c.operadorId)?.fotoUrl ?? null,
        nivelAlerta: c.nivelAlerta,
      }));

      const eventosAbertura: EventoAtividade[] = caixasAbertos.map((c) => ({
        id: `abertura-${c.id}`,
        tipo: "ABERTURA",
        horario: c.dataAbertura,
        operadorNome: nomeOperador(c.operadorId),
        valorCentavos: null,
        divergenciaCentavos: null,
        categoriaSos: null,
      }));

      const eventosFechamento: EventoAtividade[] = caixasFechados
        .filter((c) => c.dataFechamento !== null)
        .map((c) => ({
          id: `fechamento-${c.id}`,
          tipo: "FECHAMENTO",
          horario: c.dataFechamento as string,
          operadorNome: nomeOperador(c.operadorId),
          valorCentavos: null,
          divergenciaCentavos: c.divergencia === null ? null : reaisParaCentavos(c.divergencia),
          categoriaSos: null,
        }));

      const eventosSangria: EventoAtividade[] = sangrias.map((s) => ({
        id: `sangria-${s.id}`,
        tipo: "SANGRIA",
        horario: s.registradaEm,
        operadorNome: nomeOperador(s.operadorId),
        valorCentavos: reaisParaCentavos(s.valor),
        divergenciaCentavos: null,
        categoriaSos: null,
      }));

      const eventosSos: EventoAtividade[] = sosAbertos.map((sos) => ({
        id: `sos-${sos.id}`,
        tipo: "SOS",
        horario: sos.criadoEm,
        operadorNome: sos.operadorNome,
        valorCentavos: null,
        divergenciaCentavos: null,
        categoriaSos: sos.categoria,
      }));

      const eventos = [...eventosAbertura, ...eventosFechamento, ...eventosSangria, ...eventosSos].sort(
        (a, b) => b.horario.localeCompare(a.horario),
      );

      setDados({
        caixasAbertosCount: caixasAbertos.length,
        especieAgoraCentavos,
        operadoresEmAlertaCount,
        valorDevidoHojeCentavos,
        divergenciaHojeCentavos,
        totalOperadoresAtivos,
        caixasAbertos: caixasAbertosResumo,
        eventos,
      });
    } catch (excecao) {
      setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o Centro de Operações.");
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  return { dados, carregando, erro, limparErro: () => setErro(null) };
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros — hook novo, ainda não usado por nenhum componente.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/hooks/useCentroOperacoes.ts
git commit -m "feat(front): hook useCentroOperacoes (agregacao do Centro de Operacoes)"
```

---

### Task 4: Frontend — `DashboardHeader`, `DashboardKPIRow`, `DashboardSection`, `DashboardGrid`

**Files:**
- Create: `frontend/src/components/dashboard/DashboardHeader.tsx`
- Create: `frontend/src/components/dashboard/DashboardKPIRow.tsx`
- Create: `frontend/src/components/dashboard/DashboardSection.tsx`
- Create: `frontend/src/components/dashboard/DashboardGrid.tsx`

**Interfaces:**
- Consumes: nada de outras tasks (componentes puramente de apresentação, só props).
- Produces: `DashboardHeader({ subtitulo: string })`, `DashboardKPIRow({ itens: KpiItem[] })` com `KpiItem { rotulo, valor, icone: ComponentType<{ className?: string }> }`, `DashboardSection({ titulo, icone, acao?, children })`, `DashboardGrid({ feed, paineis })`. Tasks 5, 6 e 7 usam `DashboardSection`; Task 7 usa os 4.

- [ ] **Step 1: Criar `DashboardHeader.tsx`**

```tsx
/** Cabeçalho do Centro de Operações — sem cards, sem navegação, só título e um resumo real. */
export default function DashboardHeader({ subtitulo }: { subtitulo: string }) {
  return (
    <div>
      <h1 className="font-display text-2xl text-gold-300 md:text-3xl">
        Centro de Operações do Evento
      </h1>
      <p className="mt-1 text-[15px] text-leather-300">{subtitulo}</p>
    </div>
  );
}
```

- [ ] **Step 2: Criar `DashboardKPIRow.tsx`**

```tsx
import { type ComponentType } from "react";

export interface KpiItem {
  rotulo: string;
  valor: string;
  icone: ComponentType<{ className?: string }>;
}

/** Linha de 4 indicadores derivados — nunca persistidos, sempre calculados na hora. */
export default function DashboardKPIRow({ itens }: { itens: KpiItem[] }) {
  return (
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((item) => {
        const Icone = item.icone;
        return (
          <div
            key={item.rotulo}
            className="flex items-center gap-4 rounded-xl border border-leather-600/40 bg-wood-900 p-5 shadow-arena"
          >
            <Icone className="h-8 w-8 shrink-0 text-gold-400" />
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-steel-400">
                {item.rotulo}
              </p>
              <p className="num-tabular truncate text-xl font-bold text-leather-200">
                {item.valor}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Criar `DashboardSection.tsx`**

```tsx
import { type ComponentType, type ReactNode } from "react";

/** Chrome genérico de painel (ícone + título + moldura), reaproveitado pelos 4 painéis do Centro de Operações. */
export default function DashboardSection({
  titulo,
  icone: Icone,
  acao,
  children,
}: {
  titulo: string;
  icone: ComponentType<{ className?: string }>;
  acao?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="rounded-xl border border-leather-600/40 bg-wood-900 p-5 shadow-arena">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg text-gold-300">
          <Icone className="h-5 w-5 text-gold-400" />
          {titulo}
        </h2>
        {acao}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}
```

- [ ] **Step 4: Criar `DashboardGrid.tsx`**

```tsx
import { type ReactNode } from "react";

/** Arranjo responsivo do corpo do Centro de Operações: feed mais largo à esquerda, painéis empilhados à direita. */
export default function DashboardGrid({
  feed,
  paineis,
}: {
  feed: ReactNode;
  paineis: ReactNode;
}) {
  return (
    <div className="mt-6 grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2">{feed}</div>
      <div className="flex flex-col gap-5">{paineis}</div>
    </div>
  );
}
```

- [ ] **Step 5: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/dashboard/DashboardHeader.tsx frontend/src/components/dashboard/DashboardKPIRow.tsx frontend/src/components/dashboard/DashboardSection.tsx frontend/src/components/dashboard/DashboardGrid.tsx
git commit -m "feat(front): componentes de chrome do Centro de Operacoes (Header, KPIRow, Section, Grid)"
```

---

### Task 5: Frontend — `RealtimePanel` e `OperationalPanel`

**Files:**
- Create: `frontend/src/components/dashboard/RealtimePanel.tsx`
- Create: `frontend/src/components/dashboard/OperationalPanel.tsx`

**Interfaces:**
- Consumes: `DashboardSection` (Task 4), `CaixaAbertoResumo` (Task 3), `Avatar` e `SeloNumerario` (já existentes em `components/ui/`), `HorseshoeIcon`/`DistintivoIcon` (já existentes em `components/icons.tsx`).
- Produces: `RealtimePanel({ caixas: CaixaAbertoResumo[] })`, `OperationalPanel({ totalOperadoresAtivos: number, operadoresEmAlerta: number })`. Task 7 usa ambos.

- [ ] **Step 1: Criar `RealtimePanel.tsx`**

```tsx
import DashboardSection from "./DashboardSection";
import Avatar from "../ui/Avatar";
import SeloNumerario from "../ui/SeloNumerario";
import { HorseshoeIcon } from "../icons";
import type { CaixaAbertoResumo } from "../../hooks/useCentroOperacoes";

/** Caixas abertos agora, por nível de alerta — não duplica o banner global de SOS do AdminLayout. */
export default function RealtimePanel({ caixas }: { caixas: CaixaAbertoResumo[] }) {
  return (
    <DashboardSection titulo="Caixas Abertos Agora" icone={HorseshoeIcon}>
      {caixas.length === 0 ? (
        <p className="text-sm text-leather-300">Nenhum caixa aberto no momento.</p>
      ) : (
        <ul className="space-y-3">
          {caixas.map((caixa) => (
            <li key={caixa.caixaId} className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar nome={caixa.operadorNome} fotoUrl={caixa.operadorFotoUrl} />
                <p className="truncate text-sm font-semibold text-leather-200">{caixa.operadorNome}</p>
              </div>
              <SeloNumerario nivel={caixa.nivelAlerta} />
            </li>
          ))}
        </ul>
      )}
    </DashboardSection>
  );
}
```

- [ ] **Step 2: Criar `OperationalPanel.tsx`**

```tsx
import DashboardSection from "./DashboardSection";
import { DistintivoIcon } from "../icons";

/** Equipe ativa e contagem em alerta — resumo, não substitui Gerenciar Equipe. */
export default function OperationalPanel({
  totalOperadoresAtivos,
  operadoresEmAlerta,
}: {
  totalOperadoresAtivos: number;
  operadoresEmAlerta: number;
}) {
  return (
    <DashboardSection titulo="Equipe" icone={DistintivoIcon}>
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-arena-800 px-4 py-3">
        <div>
          <dt className="text-xs text-steel-400">Equipe ativa</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">{totalOperadoresAtivos}</dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Em alerta</dt>
          <dd className="num-tabular text-lg font-semibold text-gold-300">{operadoresEmAlerta}</dd>
        </div>
      </dl>
    </DashboardSection>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/RealtimePanel.tsx frontend/src/components/dashboard/OperationalPanel.tsx
git commit -m "feat(front): RealtimePanel e OperationalPanel do Centro de Operacoes"
```

---

### Task 6: Frontend — `FinancialPanel` e `ActivityFeed`

**Files:**
- Create: `frontend/src/components/dashboard/FinancialPanel.tsx`
- Create: `frontend/src/components/dashboard/ActivityFeed.tsx`

**Interfaces:**
- Consumes: `DashboardSection` (Task 4), `EventoAtividade`/`TipoEventoAtividade` (Task 3), `formatarCentavos` (já existente em `lib/moeda`), `rotuloCategoriaSos` (já existente em `lib/sos`), `CifraoIcon`/`HorseshoeIcon`/`LampiaoIcon`/`LivroCaixaIcon`/`MaloteIcon` (já existentes em `components/icons.tsx`).
- Produces: `FinancialPanel({ divergenciaHojeCentavos: number, valorDevidoHojeCentavos: number })`, `ActivityFeed({ eventos: EventoAtividade[] })`. Task 7 usa ambos.

- [ ] **Step 1: Criar `FinancialPanel.tsx`**

```tsx
import { Link } from "react-router-dom";
import DashboardSection from "./DashboardSection";
import { CifraoIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";

/** Divergência e valor devido do dia — link contextual para o Scorecard completo (permitido: não é navegação estrutural). */
export default function FinancialPanel({
  divergenciaHojeCentavos,
  valorDevidoHojeCentavos,
}: {
  divergenciaHojeCentavos: number;
  valorDevidoHojeCentavos: number;
}) {
  const corDivergencia =
    divergenciaHojeCentavos === 0
      ? "text-gold-300"
      : divergenciaHojeCentavos > 0
        ? "text-campo-300"
        : "text-rust-300";

  return (
    <DashboardSection
      titulo="Financeiro do Dia"
      icone={CifraoIcon}
      acao={
        <Link
          to="/admin-dashboard/scorecard"
          className="text-xs font-semibold text-gold-400 hover:text-gold-300"
        >
          Ver Scorecard →
        </Link>
      }
    >
      <dl className="grid grid-cols-2 gap-3 rounded-lg bg-arena-800 px-4 py-3">
        <div>
          <dt className="text-xs text-steel-400">Divergência hoje</dt>
          <dd className={`num-tabular text-lg font-semibold ${corDivergencia}`}>
            {divergenciaHojeCentavos === 0
              ? "Conferido"
              : `${divergenciaHojeCentavos > 0 ? "+" : "−"}${formatarCentavos(Math.abs(divergenciaHojeCentavos))}`}
          </dd>
        </div>
        <div className="text-right">
          <dt className="text-xs text-steel-400">Valor devido hoje</dt>
          <dd className="num-tabular text-lg font-semibold text-leather-200">
            {formatarCentavos(valorDevidoHojeCentavos)}
          </dd>
        </div>
      </dl>
    </DashboardSection>
  );
}
```

- [ ] **Step 2: Criar `ActivityFeed.tsx`**

```tsx
import { Link } from "react-router-dom";
import DashboardSection from "./DashboardSection";
import { HorseshoeIcon, LampiaoIcon, LivroCaixaIcon, MaloteIcon } from "../icons";
import { formatarCentavos } from "../../lib/moeda";
import { rotuloCategoriaSos } from "../../lib/sos";
import type { EventoAtividade } from "../../hooks/useCentroOperacoes";

function formatarHorario(iso: string): string {
  return new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

function IconePorTipo({ tipo }: { tipo: EventoAtividade["tipo"] }) {
  const className = "h-5 w-5 shrink-0 text-gold-400";
  switch (tipo) {
    case "ABERTURA":
    case "FECHAMENTO":
      return <HorseshoeIcon className={className} />;
    case "SANGRIA":
      return <MaloteIcon className={className} />;
    case "SOS":
      return <LampiaoIcon className={`${className} text-bordo-400`} />;
    default:
      return null;
  }
}

function descricaoEvento(evento: EventoAtividade): string {
  switch (evento.tipo) {
    case "ABERTURA":
      return `Caixa aberto — ${evento.operadorNome}`;
    case "FECHAMENTO": {
      if (evento.divergenciaCentavos === null) return `Caixa fechado — ${evento.operadorNome}`;
      if (evento.divergenciaCentavos === 0) return `Caixa fechado (conferido) — ${evento.operadorNome}`;
      const sinal = evento.divergenciaCentavos > 0 ? "sobra" : "falta";
      return `Caixa fechado — ${sinal} de ${formatarCentavos(Math.abs(evento.divergenciaCentavos))} — ${evento.operadorNome}`;
    }
    case "SANGRIA":
      return `Sangria de ${formatarCentavos(evento.valorCentavos ?? 0)} — ${evento.operadorNome}`;
    case "SOS":
      return `SOS ${evento.categoriaSos ? rotuloCategoriaSos(evento.categoriaSos) : ""} — ${evento.operadorNome}`;
    default:
      return evento.operadorNome;
  }
}

/** Timeline mesclada de 4 tipos de evento reais, mais recente primeiro, com stagger "galope" na entrada. */
export default function ActivityFeed({ eventos }: { eventos: EventoAtividade[] }) {
  return (
    <DashboardSection titulo="Atividade Recente" icone={LivroCaixaIcon}>
      {eventos.length === 0 ? (
        <p className="text-sm text-leather-300">Nenhum evento registrado ainda.</p>
      ) : (
        <ul className="space-y-3">
          {eventos.map((evento, indice) => (
            <li
              key={evento.id}
              className="flex items-center gap-3 animate-fade-in-up"
              style={{ animationDelay: `${Math.min(indice, 10) * 60}ms` }}
            >
              <IconePorTipo tipo={evento.tipo} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-leather-200">{descricaoEvento(evento)}</p>
              </div>
              <span className="num-tabular shrink-0 text-xs text-steel-400">
                {formatarHorario(evento.horario)}
              </span>
            </li>
          ))}
        </ul>
      )}
      <Link
        to="/admin-dashboard/historico-turnos"
        className="mt-4 inline-block text-xs font-semibold text-gold-400 hover:text-gold-300"
      >
        Ver Histórico completo →
      </Link>
    </DashboardSection>
  );
}
```

- [ ] **Step 3: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/dashboard/FinancialPanel.tsx frontend/src/components/dashboard/ActivityFeed.tsx
git commit -m "feat(front): FinancialPanel e ActivityFeed do Centro de Operacoes"
```

---

### Task 7: Frontend — `AdminLandingPage.tsx` vira o Centro de Operações

**Files:**
- Modify: `frontend/src/pages/AdminLandingPage.tsx`

**Interfaces:**
- Consumes: `useCentroOperacoes` (Task 3), `DashboardHeader`/`DashboardKPIRow`/`DashboardGrid`/`KpiItem` (Task 4), `RealtimePanel`/`OperationalPanel` (Task 5), `FinancialPanel`/`ActivityFeed` (Task 6), `Alerta` e `Carregando` (já existentes), `formatarCentavos` (já existente), `CifraoIcon`/`HorseshoeIcon`/`LampadaIcon`/`RelogioIcon` (já existentes).
- Produces: nada consumido por outras tasks (página final).

- [ ] **Step 1: Substituir `AdminLandingPage.tsx` inteiro**

```tsx
import DashboardHeader from "../components/dashboard/DashboardHeader";
import DashboardKPIRow, { type KpiItem } from "../components/dashboard/DashboardKPIRow";
import DashboardGrid from "../components/dashboard/DashboardGrid";
import RealtimePanel from "../components/dashboard/RealtimePanel";
import OperationalPanel from "../components/dashboard/OperationalPanel";
import FinancialPanel from "../components/dashboard/FinancialPanel";
import ActivityFeed from "../components/dashboard/ActivityFeed";
import Alerta from "../components/ui/Alerta";
import { Carregando } from "../components/ui/interacoes";
import { useCentroOperacoes } from "../hooks/useCentroOperacoes";
import { formatarCentavos } from "../lib/moeda";
import { CifraoIcon, HorseshoeIcon, LampadaIcon, RelogioIcon } from "../components/icons";

/**
 * Centro de Operações do Evento (Admin): visão operacional consolidada,
 * só com dados reais já existentes — sem gráfico, sem card de navegação
 * (toda navegação estrutural é da Sidebar).
 */
export default function AdminLandingPage() {
  const { dados, carregando, erro, limparErro } = useCentroOperacoes();

  const kpis: KpiItem[] = dados
    ? [
        { rotulo: "Caixas Abertos", valor: String(dados.caixasAbertosCount), icone: HorseshoeIcon },
        { rotulo: "Espécie em Caixa Agora", valor: formatarCentavos(dados.especieAgoraCentavos), icone: CifraoIcon },
        { rotulo: "Operadores em Alerta", valor: String(dados.operadoresEmAlertaCount), icone: LampadaIcon },
        { rotulo: "Valor Devido Hoje", valor: formatarCentavos(dados.valorDevidoHojeCentavos), icone: RelogioIcon },
      ]
    : [];

  return (
    <>
      <DashboardHeader
        subtitulo={
          dados
            ? `${dados.caixasAbertosCount} caixa(s) aberto(s) · ${formatarCentavos(dados.especieAgoraCentavos)} em espécie agora`
            : "Visão operacional consolidada do evento."
        }
      />

      {erro && (
        <Alerta tipo="erro" className="mt-4" onDispensar={limparErro}>
          {erro}
        </Alerta>
      )}

      {carregando ? (
        <Carregando rotulo="Carregando o Centro de Operações..." />
      ) : (
        dados && (
          <>
            <DashboardKPIRow itens={kpis} />
            <DashboardGrid
              feed={<ActivityFeed eventos={dados.eventos} />}
              paineis={
                <>
                  <RealtimePanel caixas={dados.caixasAbertos} />
                  <FinancialPanel
                    divergenciaHojeCentavos={dados.divergenciaHojeCentavos}
                    valorDevidoHojeCentavos={dados.valorDevidoHojeCentavos}
                  />
                  <OperationalPanel
                    totalOperadoresAtivos={dados.totalOperadoresAtivos}
                    operadoresEmAlerta={dados.operadoresEmAlertaCount}
                  />
                </>
              }
            />
          </>
        )
      )}
    </>
  );
}
```

- [ ] **Step 2: Verificar que compila**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 3: Verificação manual no navegador**

Run: `cd frontend && npm run dev`

Abrir `/admin-dashboard` logado como MASTER_ADMIN e confirmar: nenhum card de navegação restante, os 4 KPIs mostram números reais, `RealtimePanel` reflete os caixas abertos de verdade, `FinancialPanel`/`OperationalPanel` batem com Scorecard/Gerenciar Equipe, `ActivityFeed` mescla os 4 tipos de evento por horário, links "Ver Scorecard"/"Ver Histórico completo" navegam corretamente. Testar também o estado vazio (nenhum caixa aberto/nenhum evento) e o estado de erro (ex.: desligando o backend momentaneamente).

- [ ] **Step 4: Commit**

```bash
git add frontend/src/pages/AdminLandingPage.tsx
git commit -m "feat(front): AdminLandingPage vira o Centro de Operacoes do Evento"
```
