# Landing Page Pública Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir a Landing Page pública da Velho Promoções (`/`), com hero, lista de eventos publicados, seção institucional e página de detalhe por evento, consumindo um novo endpoint público de leitura sobre a entidade `Evento` já existente.

**Architecture:** Backend ganha dois endpoints `GET` sem autenticação (`/api/eventos/publicos` e `/api/eventos/publicos/{slug}`), com um DTO público deliberadamente menor (`EventoPublicoResponse`) e um matcher de segurança restrito. Frontend ganha uma camada de fetch pública paralela (`requestPublico`), um hook de leitura (`useEventosPublicos`), componentes em `components/landing/`, duas páginas novas (`LandingPage`, `EventoDetalhe`) e uma reorganização de rotas (`/` vira a Landing, login migra para `/auth`).

**Tech Stack:** Spring Boot 3 / Spring Data JPA / Spring Security (backend), React 18 + TypeScript + Vite + react-router-dom + Tailwind CSS (frontend). Nenhuma dependência nova.

## Global Constraints

- Textos de UI em pt-BR (regra inegociável nº 3 do CLAUDE.md).
- `EventoPublicoResponse` nunca reaproveita `EventoResponse` administrativo — sem `status`, `criadoPorAdminId`, `observacoes` ou timestamps de auditoria.
- `permitAll()` restrito exatamente a `GET /api/eventos/publicos` e `GET /api/eventos/publicos/**` — todo o resto do sistema continua exigindo JWT + role (regra inegociável nº 6).
- Slug já existe e é imutável desde a Sprint 1 — nunca regerado nesta entrega.
- Zero alteração em `Caixa`, `PerfilFuncionario`, RBAC, autenticação ou dashboards existentes (Admin/Operador inalterados).
- Fora de escopo desta entrega: toggle de tema global, upload de imagem via Supabase Storage, paginação/filtro de eventos, testes automatizados de frontend (projeto não tem suíte de frontend hoje — validação é manual no navegador).
- Layouts confirmados: hero = banner oficial usado como está; lista de eventos = grade de cards uniforme; detalhe = split imagem/conteúdo.

---

### Task 1: Backend — DTO público, queries e serviço de leitura pública

**Files:**
- Create: `backend/src/main/java/com/arena/rodeio/dto/EventoPublicoResponse.java`
- Modify: `backend/src/main/java/com/arena/rodeio/repository/EventoRepository.java`
- Modify: `backend/src/main/java/com/arena/rodeio/service/EventoService.java`
- Modify: `backend/src/test/java/com/arena/rodeio/service/EventoServiceTest.java`

**Interfaces:**
- Consumes: `Evento` (model, já existe), `StatusEvento.PUBLICADO` (enum, já existe)
- Produces: `EventoPublicoResponse` (record, usado pelo Controller na Task 2), `EventoService.listarPublicos(): List<EventoPublicoResponse>`, `EventoService.buscarPublicoPorSlug(String slug): EventoPublicoResponse`

- [ ] **Step 1: Criar o DTO público**

Create `backend/src/main/java/com/arena/rodeio/dto/EventoPublicoResponse.java`:

```java
package com.arena.rodeio.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.arena.rodeio.model.Evento;

/**
 * DTO da Landing Page pública — deliberadamente menor que EventoResponse
 * (administrativo). Nunca expõe status, auditoria ou observações internas.
 */
public record EventoPublicoResponse(
    String slug,
    String nome,
    String descricaoCurta,
    String descricaoCompleta,
    String bannerUrl,
    String imagemDestaqueUrl,
    String cidade,
    String estado,
    String endereco,
    String local,
    LocalDate dataInicio,
    LocalDate dataFim,
    LocalTime horarioAbertura,
    Integer capacidade,
    String organizador
) {

    public static EventoPublicoResponse from(Evento evento) {
        return new EventoPublicoResponse(
            evento.getSlug(),
            evento.getNome(),
            evento.getDescricaoCurta(),
            evento.getDescricaoCompleta(),
            evento.getBannerUrl(),
            evento.getImagemDestaqueUrl(),
            evento.getCidade(),
            evento.getEstado(),
            evento.getEndereco(),
            evento.getLocal(),
            evento.getDataInicio(),
            evento.getDataFim(),
            evento.getHorarioAbertura(),
            evento.getCapacidade(),
            evento.getOrganizador());
    }
}
```

- [ ] **Step 2: Adicionar as queries derivadas no repositório**

Modify `backend/src/main/java/com/arena/rodeio/repository/EventoRepository.java` — arquivo inteiro fica assim:

```java
package com.arena.rodeio.repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.springframework.data.jpa.repository.JpaRepository;

import com.arena.rodeio.model.Evento;
import com.arena.rodeio.model.StatusEvento;

public interface EventoRepository extends JpaRepository<Evento, UUID> {

    boolean existsBySlug(String slug);

    List<Evento> findAllByOrderByDataInicioDesc();

    List<Evento> findByStatusOrderByDataInicioAsc(StatusEvento status);

    Optional<Evento> findBySlugAndStatus(String slug, StatusEvento status);
}
```

- [ ] **Step 3: Escrever os testes que falham primeiro**

Modify `backend/src/test/java/com/arena/rodeio/service/EventoServiceTest.java` — adicionar o import que falta e os 3 testes novos.

No topo do arquivo, junto aos imports existentes, adicionar:

```java
import com.arena.rodeio.model.StatusEvento;
```

No final da classe (antes do método privado `criarEntidade()`), adicionar:

```java
    @Test
    void listarPublicos_retornaSoEventosPublicados() {
        var publicado = criarEntidade();
        publicado.publicar();
        when(repository.findByStatusOrderByDataInicioAsc(StatusEvento.PUBLICADO))
            .thenReturn(java.util.List.of(publicado));

        var resultado = service.listarPublicos();

        assertThat(resultado).hasSize(1);
        assertThat(resultado.get(0).slug()).isEqualTo("rodeio-de-teste");
        assertThat(resultado.get(0).nome()).isEqualTo("Rodeio de Teste");
    }

    @Test
    void buscarPublicoPorSlug_retornaQuandoPublicado() {
        var publicado = criarEntidade();
        publicado.publicar();
        when(repository.findBySlugAndStatus("rodeio-de-teste", StatusEvento.PUBLICADO))
            .thenReturn(Optional.of(publicado));

        var resultado = service.buscarPublicoPorSlug("rodeio-de-teste");

        assertThat(resultado.nome()).isEqualTo("Rodeio de Teste");
    }

    @Test
    void buscarPublicoPorSlug_lanca404QuandoNaoPublicado() {
        when(repository.findBySlugAndStatus("inexistente", StatusEvento.PUBLICADO))
            .thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.buscarPublicoPorSlug("inexistente"))
            .isInstanceOf(ResponseStatusException.class)
            .hasMessageContaining("não encontrado");
    }
```

- [ ] **Step 4: Rodar os testes e confirmar que falham (métodos ainda não existem)**

Run: `cd backend && mvn test -Dtest=EventoServiceTest`
Expected: FAIL — erro de compilação, `listarPublicos`/`buscarPublicoPorSlug` não existem em `EventoService`.

- [ ] **Step 5: Implementar os métodos no serviço**

Modify `backend/src/main/java/com/arena/rodeio/service/EventoService.java`.

No bloco de imports, adicionar:

```java
import com.arena.rodeio.dto.EventoPublicoResponse;
```

Logo depois do método `buscar(UUID id)` (antes de `atualizar`), adicionar:

```java
    @Transactional(readOnly = true)
    public List<EventoPublicoResponse> listarPublicos() {
        return repository.findByStatusOrderByDataInicioAsc(StatusEvento.PUBLICADO).stream()
            .map(EventoPublicoResponse::from)
            .toList();
    }

    @Transactional(readOnly = true)
    public EventoPublicoResponse buscarPublicoPorSlug(String slug) {
        return repository.findBySlugAndStatus(slug, StatusEvento.PUBLICADO)
            .map(EventoPublicoResponse::from)
            .orElseThrow(() -> new ResponseStatusException(
                HttpStatus.NOT_FOUND, "Evento não encontrado."));
    }
```

- [ ] **Step 6: Rodar os testes e confirmar que passam**

Run: `cd backend && mvn test -Dtest=EventoServiceTest`
Expected: `Tests run: 10, Failures: 0, Errors: 0` (7 testes já existentes + 3 novos).

- [ ] **Step 7: Commit**

```bash
cd backend
git add src/main/java/com/arena/rodeio/dto/EventoPublicoResponse.java \
  src/main/java/com/arena/rodeio/repository/EventoRepository.java \
  src/main/java/com/arena/rodeio/service/EventoService.java \
  src/test/java/com/arena/rodeio/service/EventoServiceTest.java
git commit -m "feat(back): leitura publica de eventos (DTO, queries e servico)"
```

---

### Task 2: Backend — Endpoints públicos e matcher de segurança

**Files:**
- Modify: `backend/src/main/java/com/arena/rodeio/controller/EventoController.java`
- Modify: `backend/src/main/java/com/arena/rodeio/config/SecurityConfig.java`

**Interfaces:**
- Consumes: `EventoService.listarPublicos()`, `EventoService.buscarPublicoPorSlug(String)` (Task 1)
- Produces: `GET /api/eventos/publicos` (200, `List<EventoPublicoResponse>`), `GET /api/eventos/publicos/{slug}` (200 ou 404), ambos sem autenticação — consumidos pelo frontend na Task 3+

- [ ] **Step 1: Adicionar os endpoints públicos no controller**

Modify `backend/src/main/java/com/arena/rodeio/controller/EventoController.java`.

No bloco de imports, adicionar:

```java
import com.arena.rodeio.dto.EventoPublicoResponse;
```

Logo no início da classe, antes do método `cadastrar` (com um comentário deixando claro que são as únicas rotas sem `@PreAuthorize`), adicionar:

```java
    /**
     * Únicos endpoints públicos de todo o backend (Área Pública/Landing) —
     * sem @PreAuthorize de propósito. Ver SecurityConfig para o matcher
     * permitAll() restrito a estas duas rotas.
     */
    @GetMapping("/publicos")
    public List<EventoPublicoResponse> listarPublicos() {
        return eventoService.listarPublicos();
    }

    @GetMapping("/publicos/{slug}")
    public EventoPublicoResponse buscarPublico(@PathVariable String slug) {
        return eventoService.buscarPublicoPorSlug(slug);
    }
```

- [ ] **Step 2: Compilar pra confirmar que não quebrou nada**

Run: `cd backend && mvn compile`
Expected: `BUILD SUCCESS`.

- [ ] **Step 3: Adicionar o matcher público no SecurityConfig**

Modify `backend/src/main/java/com/arena/rodeio/config/SecurityConfig.java`.

No bloco de imports, adicionar:

```java
import org.springframework.http.HttpMethod;
```

Dentro de `securityFilterChain`, no bloco `.authorizeHttpRequests(auth -> auth ...)`, adicionar uma linha nova logo depois do matcher de `/api/webhooks/**` e antes de `.anyRequest().authenticated()`:

```java
                .requestMatchers("/api/webhooks/**").permitAll()
                // Área Pública/Landing — único GET do sistema sem JWT (regra
                // inegociável nº 6, exceção deliberada e restrita a estas rotas).
                .requestMatchers(HttpMethod.GET, "/api/eventos/publicos", "/api/eventos/publicos/**").permitAll()
                .anyRequest().authenticated())
```

(a primeira e a última linha do trecho acima já existem no arquivo — é só inserir a linha do comentário + `requestMatchers` entre elas.)

- [ ] **Step 4: Rodar a suíte inteira pra garantir que nada quebrou**

Run: `cd backend && mvn test`
Expected: `Tests run: 24, Failures: 0, Errors: 0` (21 já existentes + 3 da Task 1).

- [ ] **Step 5: Verificação manual — endpoint responde sem token**

Run:
```bash
cd backend && ./run-local.sh
```

Em outro terminal, com o backend no ar:
```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/eventos/publicos
```
Expected: `200` (corpo `[]` se nenhum evento estiver publicado ainda — normal neste ponto).

```bash
curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/eventos/publicos/qualquer-slug
```
Expected: `404`.

- [ ] **Step 6: Commit**

```bash
cd backend
git add src/main/java/com/arena/rodeio/controller/EventoController.java \
  src/main/java/com/arena/rodeio/config/SecurityConfig.java
git commit -m "feat(back): endpoints publicos de eventos e matcher de seguranca"
```

---

### Task 3: Frontend — Assets oficiais e camada de API pública

**Files:**
- Create: `frontend/public/images/logo-1.png` (copiado)
- Create: `frontend/public/images/banner-velho.jpeg` (copiado)
- Create: `frontend/public/images/imagem-pequena.jpg` (copiado)
- Modify: `frontend/src/lib/api.ts`

**Interfaces:**
- Consumes: `GET /api/eventos/publicos`, `GET /api/eventos/publicos/{slug}` (Task 2)
- Produces: `EventoPublicoApi` (interface), `listarEventosPublicos(): Promise<EventoPublicoApi[]>`, `buscarEventoPublicoPorSlug(slug: string): Promise<EventoPublicoApi>` — usados pelo hook na Task 4

- [ ] **Step 1: Copiar os assets oficiais**

```bash
mkdir -p frontend/public/images
cp images/logo-1.png frontend/public/images/
cp images/banner-velho.jpeg frontend/public/images/
cp images/imagem-pequena.jpg frontend/public/images/
```

- [ ] **Step 2: Adicionar a função de fetch público e os tipos/funções de Evento público**

Modify `frontend/src/lib/api.ts` — adicionar no final do arquivo:

```ts
/**
 * Fetch sem autenticação — paralelo ao request() acima, que sempre exige
 * sessão Supabase (lançaria 401 sem token). Usado só pelos endpoints
 * públicos da Landing Page.
 */
async function requestPublico<T>(caminho: string): Promise<T> {
  let resposta: Response;
  try {
    resposta = await fetch(`${API_URL}${caminho}`, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });
  } catch {
    throw new ApiError(0, "Sem conexão com a arena. Verifique a rede e tente de novo.");
  }

  if (!resposta.ok) {
    let mensagem =
      MENSAGENS_POR_STATUS[resposta.status] ?? `Erro inesperado (${resposta.status}).`;
    try {
      const body = (await resposta.json()) as { mensagem?: string; message?: string };
      mensagem = body.mensagem || body.message || mensagem;
    } catch {
      // corpo vazio ou não-JSON: mantém a mensagem mapeada
    }
    throw new ApiError(resposta.status, mensagem);
  }

  return (await resposta.json()) as T;
}

export interface EventoPublicoApi {
  slug: string;
  nome: string;
  descricaoCurta: string | null;
  descricaoCompleta: string | null;
  bannerUrl: string | null;
  imagemDestaqueUrl: string | null;
  cidade: string | null;
  estado: string | null;
  endereco: string | null;
  local: string | null;
  dataInicio: string;
  dataFim: string;
  horarioAbertura: string | null;
  capacidade: number | null;
  organizador: string | null;
}

/** Público — sem autenticação, consumido pela Landing Page. */
export function listarEventosPublicos(): Promise<EventoPublicoApi[]> {
  return requestPublico<EventoPublicoApi[]>("/api/eventos/publicos");
}

/** Público — 404 se o slug não existir ou o evento não estiver PUBLICADO. */
export function buscarEventoPublicoPorSlug(slug: string): Promise<EventoPublicoApi> {
  return requestPublico<EventoPublicoApi>(`/api/eventos/publicos/${encodeURIComponent(slug)}`);
}
```

- [ ] **Step 3: Checar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add public/images/logo-1.png public/images/banner-velho.jpeg public/images/imagem-pequena.jpg src/lib/api.ts
git commit -m "feat(front): assets oficiais e api publica de eventos"
```

---

### Task 4: Frontend — Hooks de leitura pública

**Files:**
- Create: `frontend/src/hooks/useEventosPublicos.ts`

**Interfaces:**
- Consumes: `listarEventosPublicos()`, `buscarEventoPublicoPorSlug(slug)`, `EventoPublicoApi`, `ApiError` (Task 3)
- Produces: `EventoPublico` (type alias), `useEventosPublicos(): { eventos, carregando, erro }`, `useEventoPublico(slug): { evento, carregando, naoEncontrado, erro }` — usados pelas páginas nas Tasks 8 e 9

- [ ] **Step 1: Criar o hook**

Create `frontend/src/hooks/useEventosPublicos.ts`:

```ts
import { useEffect, useState } from "react";
import { listarEventosPublicos, buscarEventoPublicoPorSlug, ApiError, type EventoPublicoApi } from "../lib/api";

export type EventoPublico = EventoPublicoApi;

/** Lista de eventos publicados — consumida pela Landing Page. */
export function useEventosPublicos() {
  const [eventos, setEventos] = useState<EventoPublico[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      try {
        const lista = await listarEventosPublicos();
        if (!cancelado) setEventos(lista);
      } catch (excecao) {
        if (!cancelado) {
          setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar os eventos.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, []);

  return { eventos, carregando, erro };
}

/** Detalhe de um evento publicado por slug — usado na página /eventos/:slug. */
export function useEventoPublico(slug: string | undefined) {
  const [evento, setEvento] = useState<EventoPublico | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [naoEncontrado, setNaoEncontrado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;
    const slugAtual = slug;
    let cancelado = false;
    async function carregar() {
      setCarregando(true);
      setErro(null);
      setNaoEncontrado(false);
      try {
        const resultado = await buscarEventoPublicoPorSlug(slugAtual);
        if (!cancelado) setEvento(resultado);
      } catch (excecao) {
        if (cancelado) return;
        if (excecao instanceof ApiError && excecao.status === 404) {
          setNaoEncontrado(true);
        } else {
          setErro(excecao instanceof ApiError ? excecao.message : "Falha ao carregar o evento.");
        }
      } finally {
        if (!cancelado) setCarregando(false);
      }
    }
    carregar();
    return () => {
      cancelado = true;
    };
  }, [slug]);

  return { evento, carregando, naoEncontrado, erro };
}
```

- [ ] **Step 2: Checar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/hooks/useEventosPublicos.ts
git commit -m "feat(front): hooks useEventosPublicos e useEventoPublico"
```

---

### Task 5: Frontend — Header e Hero da Landing

**Files:**
- Create: `frontend/src/components/landing/LandingHeader.tsx`
- Create: `frontend/src/components/landing/LandingHero.tsx`

**Interfaces:**
- Consumes: nada (componentes puramente visuais, imagens estáticas de `/images/`)
- Produces: `LandingHeader` e `LandingHero` (componentes default export) — usados por `LandingPage`/`EventoDetalhe` nas Tasks 8 e 9

- [ ] **Step 1: Criar o header**

Create `frontend/src/components/landing/LandingHeader.tsx`:

```tsx
import { Link } from "react-router-dom";

/** Nav da Landing: logo oficial + CTA "Entrar". Fixa no topo, fundo sólido. */
export default function LandingHeader() {
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-arena-950/95 px-4 py-3 backdrop-blur-sm sm:px-8">
      <img src="/images/logo-1.png" alt="Velho Promoções" className="h-9 w-auto object-contain sm:h-10" />
      <Link
        to="/auth"
        className="ml-auto rounded-lg border border-gold-400/60 px-4 py-2 text-sm font-semibold text-gold-300 transition-colors duration-200 hover:border-gold-300 hover:text-gold-200"
      >
        Entrar
      </Link>
    </header>
  );
}
```

- [ ] **Step 2: Criar o hero**

Create `frontend/src/components/landing/LandingHero.tsx`:

```tsx
/** Hero da Landing: banner oficial usado como está, sem overlay de texto. */
export default function LandingHero() {
  return (
    <img
      src="/images/banner-velho.jpeg"
      alt="Os melhores eventos estão aqui — Velho Promoções"
      className="w-full object-cover"
    />
  );
}
```

- [ ] **Step 3: Checar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/components/landing/LandingHeader.tsx src/components/landing/LandingHero.tsx
git commit -m "feat(front): LandingHeader e LandingHero"
```

---

### Task 6: Frontend — Grade de eventos publicados

**Files:**
- Create: `frontend/src/components/landing/EventosPublicosGrid.tsx`

**Interfaces:**
- Consumes: `EventoPublico` (type, Task 4), `PlacaIcon` (`components/icons.tsx`, já existe)
- Produces: `EventosPublicosGrid({ eventos }: { eventos: EventoPublico[] })` — usado por `LandingPage` na Task 8

- [ ] **Step 1: Criar o componente**

Create `frontend/src/components/landing/EventosPublicosGrid.tsx`:

```tsx
import { Link } from "react-router-dom";
import type { EventoPublico } from "../../hooks/useEventosPublicos";
import { PlacaIcon } from "../icons";

function formatarPeriodo(dataInicio: string, dataFim: string): string {
  const inicio = new Date(`${dataInicio}T00:00:00`);
  const fim = new Date(`${dataFim}T00:00:00`);
  const opcoes: Intl.DateTimeFormatOptions = { day: "2-digit", month: "short" };
  const textoInicio = inicio.toLocaleDateString("pt-BR", opcoes);
  const textoFim = fim.toLocaleDateString("pt-BR", opcoes);
  return dataInicio === dataFim ? textoInicio : `${textoInicio} – ${textoFim}`;
}

/** Grade de cards uniformes dos eventos publicados. */
export default function EventosPublicosGrid({ eventos }: { eventos: EventoPublico[] }) {
  if (eventos.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-leather-600/40 bg-wood-900 p-8 text-leather-300">
        <PlacaIcon className="h-5 w-5 shrink-0 text-steel-400" />
        Nenhum evento no momento — volte em breve.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {eventos.map((evento) => (
        <Link
          key={evento.slug}
          to={`/eventos/${evento.slug}`}
          className="group overflow-hidden rounded-xl border border-leather-600/40 bg-wood-900 shadow-arena transition-colors duration-200 hover:border-gold-400"
        >
          <div className="aspect-video w-full overflow-hidden bg-arena-900">
            {(evento.imagemDestaqueUrl || evento.bannerUrl) && (
              <img
                src={evento.imagemDestaqueUrl ?? evento.bannerUrl ?? undefined}
                alt={evento.nome}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            )}
          </div>
          <div className="p-4">
            <h3 className="font-display text-lg text-gold-300">{evento.nome}</h3>
            <p className="mt-1 text-sm text-leather-300">
              {formatarPeriodo(evento.dataInicio, evento.dataFim)}
              {evento.local ? ` · ${evento.local}` : ""}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Checar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/components/landing/EventosPublicosGrid.tsx
git commit -m "feat(front): grade de eventos publicados da Landing"
```

---

### Task 7: Frontend — Seção institucional e rodapé

**Files:**
- Create: `frontend/src/components/landing/SecaoInstitucional.tsx`
- Create: `frontend/src/components/landing/LandingFooter.tsx`

**Interfaces:**
- Consumes: nada
- Produces: `SecaoInstitucional`, `LandingFooter` (componentes default export) — usados por `LandingPage` na Task 8

- [ ] **Step 1: Criar a seção institucional**

Create `frontend/src/components/landing/SecaoInstitucional.tsx`:

```tsx
/** "Sobre a Velho Promoções" — texto placeholder (ver spec da Landing). */
export default function SecaoInstitucional() {
  return (
    <section className="bg-arena-900 px-4 py-12 sm:px-8">
      <div className="mx-auto max-w-3xl">
        <h2 className="font-display text-2xl text-gold-300 sm:text-3xl">Sobre a Velho Promoções</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-leather-300">
          A Velho Promoções nasceu da paixão pela tradição gaúcha e pela emoção
          genuína dos rodeios brasileiros. Organizamos eventos que unem cultura,
          entretenimento e segurança, para que cada família e cada apaixonado
          por rodeio viva a experiência completa — da arena à bilheteria.
        </p>
        <p className="mt-4 text-[15px] leading-relaxed text-leather-300">
          Trabalhamos para que cada evento seja memorável: da estrutura física
          à gestão financeira em tempo real, tudo pensado para que você só
          precise se preocupar em aproveitar o espetáculo.
        </p>
      </div>
    </section>
  );
}
```

- [ ] **Step 2: Criar o rodapé**

Create `frontend/src/components/landing/LandingFooter.tsx`:

```tsx
import { Link } from "react-router-dom";

/** Rodapé da Landing: logo pequeno, copyright, link "Entrar". */
export default function LandingFooter() {
  return (
    <footer className="border-t border-leather-700/40 bg-arena-950 px-4 py-8 sm:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center gap-3 text-center sm:flex-row sm:justify-between sm:text-left">
        <img src="/images/logo-1.png" alt="Velho Promoções" className="h-7 w-auto object-contain" />
        <p className="text-xs text-leather-400">
          © {new Date().getFullYear()} Velho Promoções. Todos os direitos reservados.
        </p>
        <Link to="/auth" className="text-xs font-semibold text-gold-300 hover:text-gold-200">
          Entrar
        </Link>
      </div>
    </footer>
  );
}
```

- [ ] **Step 3: Checar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/components/landing/SecaoInstitucional.tsx src/components/landing/LandingFooter.tsx
git commit -m "feat(front): secao institucional e rodape da Landing"
```

---

### Task 8: Frontend — Página LandingPage

**Files:**
- Create: `frontend/src/pages/LandingPage.tsx`

**Interfaces:**
- Consumes: `useEventosPublicos()` (Task 4), `LandingHeader`/`LandingHero` (Task 5), `EventosPublicosGrid` (Task 6), `SecaoInstitucional`/`LandingFooter` (Task 7), `Carregando`/`Alerta` (`components/ui/`, já existem)
- Produces: `LandingPage` (default export) — roteada em `/` na Task 10

- [ ] **Step 1: Criar a página**

Create `frontend/src/pages/LandingPage.tsx`:

```tsx
import LandingHeader from "../components/landing/LandingHeader";
import LandingHero from "../components/landing/LandingHero";
import EventosPublicosGrid from "../components/landing/EventosPublicosGrid";
import SecaoInstitucional from "../components/landing/SecaoInstitucional";
import LandingFooter from "../components/landing/LandingFooter";
import { useEventosPublicos } from "../hooks/useEventosPublicos";
import { Carregando } from "../components/ui/interacoes";
import Alerta from "../components/ui/Alerta";

/**
 * Landing Page pública (Módulo 4). Sem lógica própria de eventos — consome
 * só os publicados pelo Admin. Identidade visual própria da Velho
 * Promoções, distinta do tema Rodeio Premium operacional.
 */
export default function LandingPage() {
  const { eventos, carregando, erro } = useEventosPublicos();

  return (
    <div className="min-h-dvh bg-arena-950">
      <LandingHeader />
      <LandingHero />
      <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
        <h2 className="font-display text-2xl text-gold-300 sm:text-3xl">Próximos Eventos</h2>
        {erro && (
          <Alerta tipo="erro" className="mt-4">
            {erro}
          </Alerta>
        )}
        {carregando ? (
          <Carregando rotulo="Carregando eventos..." />
        ) : (
          <div className="mt-6">
            <EventosPublicosGrid eventos={eventos} />
          </div>
        )}
      </main>
      <SecaoInstitucional />
      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Checar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/pages/LandingPage.tsx
git commit -m "feat(front): pagina LandingPage"
```

---

### Task 9: Frontend — Página EventoDetalhe

**Files:**
- Create: `frontend/src/pages/EventoDetalhe.tsx`

**Interfaces:**
- Consumes: `useEventoPublico(slug)` (Task 4), `LandingHeader`/`LandingFooter` (Tasks 5 e 7), `useParams` (`react-router-dom`, já é dependência do projeto)
- Produces: `EventoDetalhe` (default export) — roteada em `/eventos/:slug` na Task 10

- [ ] **Step 1: Criar a página**

Create `frontend/src/pages/EventoDetalhe.tsx`:

```tsx
import { Link, useParams } from "react-router-dom";
import { useEventoPublico } from "../hooks/useEventosPublicos";
import { Carregando } from "../components/ui/interacoes";
import LandingHeader from "../components/landing/LandingHeader";
import LandingFooter from "../components/landing/LandingFooter";

function formatarData(data: string): string {
  return new Date(`${data}T00:00:00`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

/**
 * Detalhe público do evento (split imagem/conteúdo). 404/não-publicado
 * nunca vaza detalhe técnico — só uma mensagem amigável.
 */
export default function EventoDetalhe() {
  const { slug } = useParams<{ slug: string }>();
  const { evento, carregando, naoEncontrado, erro } = useEventoPublico(slug);

  return (
    <div className="min-h-dvh bg-arena-950">
      <LandingHeader />

      {carregando && <Carregando rotulo="Carregando evento..." />}

      {!carregando && (naoEncontrado || erro) && (
        <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:px-8">
          <p className="font-display text-2xl text-gold-300">
            Evento não encontrado ou não está mais disponível.
          </p>
          <Link to="/" className="mt-6 inline-block text-sm font-semibold text-gold-300 hover:text-gold-200">
            ← Voltar para a Landing
          </Link>
        </div>
      )}

      {!carregando && evento && (
        <main className="mx-auto max-w-5xl px-4 py-12 sm:px-8">
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-video overflow-hidden rounded-xl bg-arena-900 md:aspect-auto">
              {(evento.imagemDestaqueUrl || evento.bannerUrl) && (
                <img
                  src={evento.imagemDestaqueUrl ?? evento.bannerUrl ?? undefined}
                  alt={evento.nome}
                  className="h-full w-full object-cover"
                />
              )}
            </div>
            <div>
              <h1 className="font-display text-3xl text-gold-300">{evento.nome}</h1>
              <p className="mt-2 text-sm text-leather-300">
                {formatarData(evento.dataInicio)}
                {evento.dataFim !== evento.dataInicio ? ` – ${formatarData(evento.dataFim)}` : ""}
                {evento.horarioAbertura ? ` · ${evento.horarioAbertura.slice(0, 5)}` : ""}
              </p>
              {(evento.local || evento.cidade) && (
                <p className="mt-1 text-sm text-leather-300">
                  {[evento.local, evento.cidade && evento.estado ? `${evento.cidade}/${evento.estado}` : evento.cidade]
                    .filter(Boolean)
                    .join(" — ")}
                </p>
              )}
              {evento.endereco && <p className="mt-1 text-sm text-leather-400">{evento.endereco}</p>}
              {evento.organizador && (
                <p className="mt-4 text-xs uppercase tracking-wide text-steel-400">
                  Organização: {evento.organizador}
                </p>
              )}
              {evento.descricaoCompleta && (
                <p className="mt-6 whitespace-pre-line text-[15px] leading-relaxed text-leather-200">
                  {evento.descricaoCompleta}
                </p>
              )}
            </div>
          </div>
        </main>
      )}

      <LandingFooter />
    </div>
  );
}
```

- [ ] **Step 2: Checar tipos**

Run: `cd frontend && npx tsc -b --noEmit`
Expected: sem erros.

- [ ] **Step 3: Commit**

```bash
cd frontend
git add src/pages/EventoDetalhe.tsx
git commit -m "feat(front): pagina EventoDetalhe"
```

---

### Task 10: Reorganização de rotas e verificação end-to-end

**Files:**
- Modify: `frontend/src/App.tsx`

**Interfaces:**
- Consumes: `LandingPage` (Task 8), `EventoDetalhe` (Task 9), tudo que já existia em `App.tsx`
- Produces: rotas finais da aplicação — nenhuma outra task depende disto (é a última)

- [ ] **Step 1: Reescrever `App.tsx` com as rotas novas**

Modify `frontend/src/App.tsx` — arquivo inteiro fica assim:

```tsx
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./lib/auth";
import ProtectedRoute from "./components/ProtectedRoute";
import AdminLayout from "./components/AdminLayout";
import AuthPage from "./pages/AuthPage";
import LandingPage from "./pages/LandingPage";
import EventoDetalhe from "./pages/EventoDetalhe";
import AdminLandingPage from "./pages/AdminLandingPage";
import AdminAbrirCaixa from "./pages/AdminAbrirCaixa";
import AdminScorecard from "./pages/AdminScorecard";
import HistoricoTurnos from "./pages/HistoricoTurnos";
import EstoqueAdmin from "./pages/EstoqueAdmin";
import EventosAdmin from "./pages/EventosAdmin";
import GerenciamentoEquipe from "./pages/GerenciamentoEquipe";
import OperadorLandingPage from "./pages/OperadorLandingPage";
import OperadorVenda from "./pages/OperadorVenda";

/**
 * Rotas da aplicação (RBAC):
 * - "/"                            → Landing Page pública (institucional + eventos publicados)
 * - "/eventos/:slug"               → Detalhe público de um evento publicado
 * - "/auth"                        → Login/Cadastro
 * - "/admin-dashboard"             → Landing do MASTER_ADMIN (grid de módulos)
 * - "/admin-dashboard/abrir-caixa" → Abertura de caixa (regra inegociável nº 7)
 * - "/admin-dashboard/equipe"      → Gerenciamento de Equipe (status + fechamento)
 * - "/admin-dashboard/scorecard"   → Scorecard de Divergência de Operadores
 * - "/admin-dashboard/historico-turnos" → Histórico de Turnos (jornada operacional)
 * - "/admin-dashboard/estoque"     → Cadastro de Estoque (catálogo de produtos)
 * - "/admin-dashboard/eventos"     → Cadastro de Eventos (entidade central)
 * - "/operador-dashboard"          → Landing do OPERADOR (status + funções)
 * - "/operador-dashboard/venda"    → PDV de venda (só com caixa aberto)
 */
export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/eventos/:slug" element={<EventoDetalhe />} />
          <Route path="/auth" element={<AuthPage />} />
          {/* Módulo administrativo: um único guardião + AdminLayout (sidebar
              permanente); cada módulo novo é só mais um <Route> filho aqui. */}
          <Route
            element={
              <ProtectedRoute perfisPermitidos={["MASTER_ADMIN"]}>
                <AdminLayout />
              </ProtectedRoute>
            }
          >
            <Route path="/admin-dashboard" element={<AdminLandingPage />} />
            <Route path="/admin-dashboard/abrir-caixa" element={<AdminAbrirCaixa />} />
            <Route path="/admin-dashboard/equipe" element={<GerenciamentoEquipe />} />
            <Route path="/admin-dashboard/scorecard" element={<AdminScorecard />} />
            <Route path="/admin-dashboard/historico-turnos" element={<HistoricoTurnos />} />
            <Route path="/admin-dashboard/estoque" element={<EstoqueAdmin />} />
            <Route path="/admin-dashboard/eventos" element={<EventosAdmin />} />
          </Route>
          <Route
            path="/operador-dashboard"
            element={
              <ProtectedRoute perfisPermitidos={["OPERADOR", "MASTER_ADMIN"]}>
                <OperadorLandingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/operador-dashboard/venda"
            element={
              <ProtectedRoute perfisPermitidos={["OPERADOR", "MASTER_ADMIN"]}>
                <OperadorVenda />
              </ProtectedRoute>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
```

- [ ] **Step 2: Checar tipos e build de produção**

Run: `cd frontend && npm run build`
Expected: `✓ built in ...`, sem erros de tipo.

- [ ] **Step 3: Verificação manual end-to-end**

Com backend (`cd backend && ./run-local.sh`) e frontend (`cd frontend && npm run dev`) rodando:

1. Visitar `http://localhost:5173/` → deve mostrar a Landing (hero + "Nenhum evento no momento — volte em breve", já que nenhum evento foi publicado ainda).
2. Clicar em "Entrar" → deve navegar pra `/auth` e mostrar a tela de login/cadastro de sempre.
3. Logar como MASTER_ADMIN → ir em `/admin-dashboard/eventos`, cadastrar um evento de teste com `imagemDestaqueUrl = /images/imagem-pequena.jpg`, datas válidas, e clicar em "Publicar".
4. Voltar pra `http://localhost:5173/` (sem estar logado, aba anônima se preferir) → o card do evento deve aparecer na grade.
5. Clicar no card → deve ir pra `/eventos/<slug>` e mostrar o split imagem/conteúdo com nome, data, local e descrição.
6. Visitar `http://localhost:5173/eventos/nao-existe` → deve mostrar "Evento não encontrado ou não está mais disponível", não travar nem mostrar erro técnico.
7. Visitar `http://localhost:5173/qualquer-rota-invalida` → deve redirecionar pra `/` (Landing), não mais pra login.

Expected: todos os 7 passos se comportam como descrito.

- [ ] **Step 4: Commit**

```bash
cd frontend
git add src/App.tsx
git commit -m "feat(front): reorganiza rotas - Landing na raiz, login em /auth"
```

---

## Self-Review

**Cobertura do spec:** hero (Task 5), lista de eventos (Task 6), seção institucional (Task 7), página de detalhe (Task 9), reorganização de rotas (Task 10), endpoint público + DTO restrito + matcher de segurança (Tasks 1–2), assets oficiais (Task 3), estados vazio/404 (Tasks 6 e 9) — todos os itens do spec têm task correspondente.

**Placeholders:** nenhum "TBD"/"implementar depois" — todo código é completo e literal.

**Consistência de tipos:** `EventoPublicoResponse` (backend) → `EventoPublicoApi` (frontend, Task 3) → `EventoPublico` (alias, Task 4) usam exatamente os mesmos nomes de campo em todas as 10 tasks; `useEventosPublicos()`/`useEventoPublico(slug)` são chamados com a mesma assinatura nas Tasks 8 e 9 que a definida na Task 4.
